/**
 * MindMap Canvas - SVG-based mindmap renderer
 */

import { useRef, useState, useEffect, useCallback } from 'react';
import { useMutation } from '@tanstack/react-query';
import { useTranslation } from 'react-i18next';
import { useMindMapStore, type Node as NodeType, type Edge as EdgeType } from '../store/mindmap';
import { createMap, updateMap } from '../api/maps';
import Node from './Node';
import Edge from './Edge';
import SummaryEdge from './SummaryEdge';
import BoundaryEdge from './BoundaryEdge';
import EdgeInspector from './EdgeInspector';
import TemporaryEdge from './TemporaryEdge';
import TextEditor from './editors/TextEditor';
import RichEditorModal from './editors/RichEditorModal';
import MarkdownEditorModal from './editors/MarkdownEditorModal';
import RichEditor from './RichEditor';
import NodeEditor from './NodeEditor';
import EdgeEditor from './EdgeEditor';
import ContextMenu, { type MenuItem } from './ContextMenu';
import EmbedDialog from './EmbedDialog';
import JsonPreviewDialog from './JsonPreviewDialog';
import type { ResizeDirection } from './ResizeHandles';
import ShapeSelector from './ShapeSelector';
import ColorPicker from './ColorPicker';
import type { NodeShapeType } from '../store/mindmap';
import { getNodeDisplayDimensions } from '../utils/nodeHelpers';
import { getLabelPosition } from '../utils/edgeHelpers';
import { optimisticVersionManager } from '../utils/optimisticUpdate';
import AppleIcon from './AppleIcon';
import DeleteConfirmDialog from './DeleteConfirmDialog';
import './MindMapCanvas.css';

interface MindMapCanvasProps {
  isReadOnly?: boolean;
  onRefreshToLatest?: () => void;
  isRefreshing?: boolean;
  refreshProgress?: number;
  onSave?: (saveHandler: () => void, forceSaveHandler?: () => void) => void;
  onZoomChange?: (zoom: number) => void;
}

const SUMMARY_DEFAULT_HEIGHT = 64;
const SUMMARY_DEFAULT_PADDING = 28;
const BOUNDARY_DEFAULT_PADDING = 36;

export default function MindMapCanvas({ 
  isReadOnly = false, 
  onRefreshToLatest,
  isRefreshing = false,
  refreshProgress = 0,
  onSave,
  onZoomChange
}: MindMapCanvasProps) {
  const { t } = useTranslation();
  
  // Debug readonly state
  useEffect(() => {
    console.log('🔍 MindMapCanvas Readonly Debug:', {
      isReadOnly,
      onRefreshToLatest: !!onRefreshToLatest,
      isRefreshing,
      refreshProgress
    });
  }, [isReadOnly, onRefreshToLatest, isRefreshing, refreshProgress]);
  const containerRef = useRef<HTMLDivElement | null>(null);
  const svgRef = useRef<SVGSVGElement>(null);
  const [viewBox, setViewBox] = useState({ x: 0, y: 0, width: 1200, height: 800 });
  const [zoom, setZoom] = useState(1.0); // 1.0 = 100%
  const [showJsonPreview, setShowJsonPreview] = useState(false);
  const [isPanning, setIsPanning] = useState(false);
  const [panStart, setPanStart] = useState({ x: 0, y: 0 });
  const [isDragging, setIsDragging] = useState(false);
  const [draggedNodeId, setDraggedNodeId] = useState<string | null>(null);
  const [dragOffset, setDragOffset] = useState({ x: 0, y: 0 });
  const [isConnecting, setIsConnecting] = useState(false);
  const [connectingFrom, setConnectingFrom] = useState<string | null>(null);
  const [tempLineEnd, setTempLineEnd] = useState({ x: 0, y: 0 });
  const [editingNodeId, setEditingNodeId] = useState<string | null>(null);
  const [editorMode, setEditorMode] = useState<'text' | 'richeditor' | 'markdown' | null>(null);
  const [editingEdgeId, setEditingEdgeId] = useState<string | null>(null);
  const [contextMenu, setContextMenu] = useState<{
    x: number;
    y: number;
    items: MenuItem[];
  } | null>(null);
  const [showEmbedDialog, setShowEmbedDialog] = useState(false);
  const [embedTargetNodeId, setEmbedTargetNodeId] = useState<string | null>(null);
  const [showShapeSelector, setShowShapeSelector] = useState(false);
  const [shapeTargetNodeId, setShapeTargetNodeId] = useState<string | null>(null);
  const [showColorPicker, setShowColorPicker] = useState(false);
  const [colorTargetNodeId, setColorTargetNodeId] = useState<string | null>(null);
  const [isUploadingImage, setIsUploadingImage] = useState(false);
  const [uploadingImagePosition, setUploadingImagePosition] = useState<{ x: number; y: number } | null>(null);
  const [lastMousePosition, setLastMousePosition] = useState<{ x: number; y: number } | null>(null);
  const [isResizing, setIsResizing] = useState(false);
  const [resizingNodeId, setResizingNodeId] = useState<string | null>(null);
  const [resizeDirection, setResizeDirection] = useState<ResizeDirection | null>(null);
  const [resizeStart, setResizeStart] = useState({ 
    mouseX: 0, 
    mouseY: 0, 
    nodeX: 0, 
    nodeY: 0, 
    w: 0, 
    h: 0 
  });
  const [deleteConfirm, setDeleteConfirm] = useState<{
    isOpen: boolean;
    type: 'node' | 'edge';
    label?: string;
    onConfirm: () => void;
  } | null>(null);
  const [edgeInspectorState, setEdgeInspectorState] = useState<{
    edgeId: string;
    x: number;
    y: number;
    offset?: { x: number; y: number };
  } | null>(null);
  const [edgeInspectorSize, setEdgeInspectorSize] = useState<{ width: number; height: number } | null>(null);
  const handleEdgeInspectorLayout = useCallback((size: { width: number; height: number }) => {
    setEdgeInspectorSize((prev) =>
      prev && prev.width === size.width && prev.height === size.height ? prev : size
    );
  }, []);

  const map = useMindMapStore((state) => state.map);
  const selectedNodeId = useMindMapStore((state) => state.selectedNodeId);
  const selectedEdgeId = useMindMapStore((state) => state.selectedEdgeId);
  const addNode = useMindMapStore((state) => state.addNode);
  const updateNode = useMindMapStore((state) => state.updateNode);
  const deleteNode = useMindMapStore((state) => state.deleteNode);
  const selectNode = useMindMapStore((state) => state.selectNode);
  const addEdge = useMindMapStore((state) => state.addEdge);
  const updateEdge = useMindMapStore((state) => state.updateEdge);
  const deleteEdge = useMindMapStore((state) => state.deleteEdge);
  const selectEdge = useMindMapStore((state) => state.selectEdge);
  const updateViewState = useMindMapStore((state) => state.updateViewState);
  const setDirty = useMindMapStore((state) => state.setDirty);
  const getChangeLog = useMindMapStore((state) => state.getChangeLog);
  const clearChangeLog = useMindMapStore((state) => state.clearChangeLog);
  const isSaving = useMindMapStore((state) => state.isSaving);
  const setIsSaving = useMindMapStore((state) => state.setIsSaving);

  // Save mutation
  const saveMutation = useMutation({
    mutationFn: () => {
      if (!map) throw new Error('No map to save');
      return map.id.startsWith('temp_') ? createMap(map) : updateMap(map.id, map);
    },
    onSuccess: (data) => {
      console.log('Map saved:', data);
      setShowJsonPreview(false);
      setDirty(false);
      clearChangeLog();
      console.log('✅ isDirty reset to false after save');
      
      // Optimistic update: 즉시 버전을 증가시켜 readonly 모드 해제
      if (map) {
        const newVersion = optimisticVersionManager.optimisticIncrementVersion(map.id, map.version);
        console.log(`🚀 Optimistic version update: v${map.version} → v${newVersion}`);
      }
      
      // Refresh to latest version after successful save
      if (onRefreshToLatest) {
        console.log('🔄 Triggering refresh to latest version after save');
        setTimeout(() => {
          onRefreshToLatest();
        }, 500); // 더 빠른 refresh (optimistic update로 인해)
      }
      setIsSaving(false);
    },
    onError: (error) => {
      console.error('Save error:', error);
      setShowJsonPreview(false);
      
      // Optimistic update 실패 처리
      if (map) {
        optimisticVersionManager.failVersionUpdate(map.id);
        console.log(`❌ Optimistic version update failed for map ${map.id}`);
      }
      setIsSaving(false);
    },
  });

  // Use useCallback to stabilize handleSave function
  const handleSave = useCallback(() => {
    if (isSaving) {
      if (import.meta.env.DEV) {
        console.log('⏳ Save already in progress, ignoring duplicate request');
      }
      return;
    }

    console.log('💾 Saving without preview dialog...');
    setIsSaving(true);
    saveMutation.mutate();
  }, [isSaving, saveMutation, setIsSaving]);

  // Force save without showing preview dialog
  const handleForceSave = useCallback(() => {
    console.log('💾 Force saving (skipping preview dialog)...');
    saveMutation.mutate();
  }, [saveMutation]);

  // Expose save handler to parent component
  // Only call onSave when it changes (not on every render)
  useEffect(() => {
    if (onSave) {
      onSave(handleSave, handleForceSave);
    }
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [onSave]); // Only depend on onSave, not handleSave (which is stable via useCallback)

  const handleConfirmSave = () => {
    saveMutation.mutate();
  };


  // Debug logging
  useEffect(() => {
    console.log('🎨 MindMapCanvas render:', {
      hasMap: !!map,
      nodeCount: map?.nodes.length,
      edgeCount: map?.edges.length,
      mapTitle: map?.title,
    });
  }, [map]);

  // Load saved view state when map changes
  useEffect(() => {
    if (map?.viewState) {
      console.log('🔍 Loading saved view state:', map.viewState);
      setZoom(map.viewState.zoom);
      setViewBox(map.viewState.viewBox);
      // Notify parent of initial zoom level
      if (onZoomChange) {
        onZoomChange(map.viewState.zoom);
      }
    } else {
      // Default zoom level if no viewState
      if (onZoomChange) {
        onZoomChange(1.0);
      }
    }
  }, [map?.id, onZoomChange]); // Only when map ID changes, not on every map update

  useEffect(() => {
    if (!map || !edgeInspectorState) {
      return;
    }
    if (!map.edges.some((edge) => edge.id === edgeInspectorState.edgeId)) {
      setEdgeInspectorState(null);
    }
  }, [map, edgeInspectorState]);

  if (!map) {
    console.warn('⚠️ MindMapCanvas: No map data available');
    return null;
  }

  console.log('🖼️ Rendering canvas with', map.nodes.length, 'nodes and', map.edges.length, 'edges');

  const boundaryEdges = map.edges.filter((edge) => edge.category === 'boundary');
  const summaryEdges = map.edges.filter((edge) => edge.category === 'summary');
  const standardEdges = map.edges.filter(
    (edge) => edge.category !== 'summary' && edge.category !== 'boundary'
  );

  // Convert screen coordinates to SVG coordinates
  const screenToSVG = (screenX: number, screenY: number) => {
    if (!svgRef.current) return { x: screenX, y: screenY };
    
    const svg = svgRef.current;
    const pt = svg.createSVGPoint();
    pt.x = screenX;
    pt.y = screenY;
    
    const svgP = pt.matrixTransform(svg.getScreenCTM()?.inverse());
    return { x: svgP.x, y: svgP.y };
  };

  const svgToScreen = useCallback((svgX: number, svgY: number) => {
    const svg = svgRef.current;
    if (!svg) {
      return { x: svgX, y: svgY };
    }

    const pt = svg.createSVGPoint();
    pt.x = svgX;
    pt.y = svgY;

    const ctm = svg.getScreenCTM();
    if (!ctm) {
      return { x: svgX, y: svgY };
    }

    const screenPoint = pt.matrixTransform(ctm);
    return { x: screenPoint.x, y: screenPoint.y };
  }, []);

  // Zoom functions removed (UI controls removed, mouse wheel zoom still works)

  // Mouse wheel zoom handler using native event for better preventDefault support
  useEffect(() => {
    const svg = svgRef.current;
    if (!svg) return;

    const handleWheelNative = (e: WheelEvent) => {
      // Only zoom with Ctrl key (or Cmd on Mac)
      if (!e.ctrlKey && !e.metaKey) return;
      
      e.preventDefault();
      e.stopPropagation();
      
      console.log('🎡 Wheel event detected, deltaY:', e.deltaY);
      
      const delta = e.deltaY;
      const zoomFactor = delta > 0 ? 1 / 1.1 : 1.1; // Scroll down = zoom out, scroll up = zoom in
      const newZoom = Math.max(0.1, Math.min(5.0, zoom * zoomFactor));
      
      if (newZoom === zoom) {
        console.log('⚠️ Zoom at limit');
        return;
      }
      
      const baseWidth = 1200;
      const baseHeight = 800;
      
      // Get mouse position in SVG coordinates before zoom
      const pt = svg.createSVGPoint();
      pt.x = e.clientX;
      pt.y = e.clientY;
      const svgPoint = pt.matrixTransform(svg.getScreenCTM()?.inverse());
      
      // Calculate new viewBox size
      const newWidth = baseWidth / newZoom;
      const newHeight = baseHeight / newZoom;
      
      // Calculate what percentage of the viewBox the mouse is at
      const currentViewBox = {
        x: parseFloat(svg.getAttribute('viewBox')?.split(' ')[0] || '0'),
        y: parseFloat(svg.getAttribute('viewBox')?.split(' ')[1] || '0'),
        width: parseFloat(svg.getAttribute('viewBox')?.split(' ')[2] || '1200'),
        height: parseFloat(svg.getAttribute('viewBox')?.split(' ')[3] || '800'),
      };
      
      const mouseXPercent = (svgPoint.x - currentViewBox.x) / currentViewBox.width;
      const mouseYPercent = (svgPoint.y - currentViewBox.y) / currentViewBox.height;
      
      // Adjust viewBox to keep mouse position at the same percentage
      const newX = svgPoint.x - newWidth * mouseXPercent;
      const newY = svgPoint.y - newHeight * mouseYPercent;
      
    const newViewBox = {
        x: newX,
        y: newY,
        width: newWidth,
        height: newHeight,
    };
      
      setZoom(newZoom);
      setViewBox(newViewBox);
      
      // Update view state in store
    updateViewState({ zoom: newZoom, viewBox: newViewBox });
      
      // Notify parent component of zoom change
      if (onZoomChange) {
        onZoomChange(newZoom);
      }
      
      console.log('🔍 Wheel zoom:', (newZoom * 100).toFixed(0) + '%');
    };

    // Add event listener with passive: false to allow preventDefault
    svg.addEventListener('wheel', handleWheelNative, { passive: false });

    return () => {
      svg.removeEventListener('wheel', handleWheelNative);
    };
  }, [zoom, viewBox]);

  // Window-level paste event handler (for better browser compatibility)
  // This ensures paste works even if SVG doesn't have focus (some browsers require this)
  useEffect(() => {
    const handleWindowPaste = async (e: ClipboardEvent) => {
      // Skip if readonly or editing
      if (isReadOnly || editingNodeId || editingEdgeId) {
        return;
      }

      // Check if we're in an input/textarea/contentEditable (don't interfere with text editing)
      const activeElement = document.activeElement;
      if (
        activeElement &&
        (activeElement.tagName === 'INPUT' ||
          activeElement.tagName === 'TEXTAREA' ||
          activeElement.getAttribute('contenteditable') === 'true')
      ) {
        console.log('⏸️ Window paste: Active element is text input, ignoring');
        return;
      }

      // Check if clipboard contains image
      const clipboardData = e.clipboardData;
      if (!clipboardData) return;

      const items = Array.from(clipboardData.items);
      const imageItem = items.find(item => item.type.startsWith('image/'));

      if (!imageItem) {
        // No image, let default behavior handle it
        return;
      }

      console.log('🖼️ Window paste: Image detected, handling...');
      
      // Prevent default and handle the paste
      e.preventDefault();
      e.stopPropagation();

      // Call the main paste handler logic (inline to avoid dependency issues)
      try {
        setIsUploadingImage(true);

        const file = imageItem.getAsFile();
        if (!file) {
          throw new Error('Failed to get image file from clipboard');
        }

        // Validate file type
        const allowedTypes = ['image/jpeg', 'image/jpg', 'image/png', 'image/gif', 'image/webp', 'image/svg+xml', 'image/bmp'];
        if (!allowedTypes.includes(file.type)) {
          throw new Error(`Unsupported image type: ${file.type}`);
        }

        // Validate file size (max 10MB)
        const maxSize = 10 * 1024 * 1024;
        if (file.size > maxSize) {
          throw new Error('Image too large. Maximum size is 10MB.');
        }

        // Get paste position (last mouse position or canvas center)
        const mouseX = lastMousePosition?.x || window.innerWidth / 2;
        const mouseY = lastMousePosition?.y || window.innerHeight / 2;
        const svgCoords = screenToSVG(mouseX, mouseY);
        setUploadingImagePosition({ x: svgCoords.x, y: svgCoords.y });

        console.log('🖼️ Pasting image from clipboard:', { type: file.type, size: file.size, position: svgCoords });

        // Upload image (get auth token and upload)
        if (!map) {
          throw new Error('No map available');
        }

        const auth = localStorage.getItem('auth-storage');
        let authToken = null;
        if (auth) {
          try {
            const { token } = JSON.parse(auth).state;
            authToken = token;
          } catch (e) {
            console.error('Failed to parse auth storage:', e);
          }
        }

        const formData = new FormData();
        formData.append('file', file);
        formData.append('mapId', map.id);

        const headers: HeadersInit = {};
        if (authToken) {
          headers.Authorization = `Bearer ${authToken}`;
        }

        const apiUrl = import.meta.env.VITE_API_URL || 'http://localhost:8787';
        const response = await fetch(`${apiUrl}/upload`, {
          method: 'POST',
          headers,
          body: formData,
        });

        if (!response.ok) {
          const errorText = await response.text();
          throw new Error(`Upload failed: ${response.status} ${errorText}`);
        }

        const result = await response.json();
        console.log('📤 Image upload successful:', result);
        const imageUrl = result.url;

        let rawWidth = 320;
        let rawHeight = 240;

        try {
          // Get image dimensions for node size
          // Use fetch instead of Image to handle CORS and authentication properly
          const fetchedDimensions = await new Promise<{ width: number; height: number }>((resolve, reject) => {
            // Get auth token for image download
            const auth = localStorage.getItem('auth-storage');
            let authToken = null;
            if (auth) {
              try {
                const { token } = JSON.parse(auth).state;
                authToken = token;
              } catch (e) {
                console.warn('Failed to parse auth token');
              }
            }

            // Prepare headers
            const headers: HeadersInit = {};
            if (authToken) {
              headers.Authorization = `Bearer ${authToken}`;
            }

            // Fetch image as blob first
            fetch(imageUrl, {
              mode: 'cors',
              credentials: 'omit',
              headers,
            })
              .then((response) => {
                if (!response.ok) {
                  throw new Error(`Failed to fetch image: ${response.status}`);
                }
                return response.blob();
              })
              .then((blob) => {
                // Create object URL and load in Image object to get dimensions
                const objectUrl = URL.createObjectURL(blob);
                const img = new Image();
                img.onload = () => {
                  resolve({ width: img.width, height: img.height });
                  URL.revokeObjectURL(objectUrl); // Clean up
                };
                img.onerror = () => {
                  URL.revokeObjectURL(objectUrl); // Clean up
                  reject(new Error('Failed to load image'));
                };
                img.src = objectUrl;
              })
              .catch((err) => {
                reject(err);
              });
          });

          rawWidth = fetchedDimensions.width;
          rawHeight = fetchedDimensions.height;
        } catch (dimensionError) {
          console.warn('⚠️ Using fallback image dimensions due to error:', dimensionError);
        }

        // Calculate node size (max 600px width or height, maintain aspect ratio)
        const maxDimension = 600;
        let nodeWidth = rawWidth;
        let nodeHeight = rawHeight;

        if (nodeWidth > maxDimension || nodeHeight > maxDimension) {
          const scale = Math.min(maxDimension / nodeWidth, maxDimension / nodeHeight);
          nodeWidth = nodeWidth * scale;
          nodeHeight = nodeHeight * scale;
        }

        // Minimum node size
        nodeWidth = Math.max(nodeWidth, 200);
        nodeHeight = Math.max(nodeHeight, 150);

        // Adjust position to center the node
        const nodeX = svgCoords.x - nodeWidth / 2;
        const nodeY = svgCoords.y - nodeHeight / 2;

        // Create image node
        const newNode: NodeType = {
          id: `n_${Date.now()}`,
          label: file.name || 'Image',
          x: nodeX,
          y: nodeY,
          w: nodeWidth,
          h: nodeHeight,
          embedUrl: imageUrl,
          embedType: 'image',
          contentType: 'richeditor',
        };

        addNode(newNode);
        selectNode(newNode.id);

        console.log('✅ Image node created:', newNode.id);
      } catch (error) {
        console.error('❌ Failed to paste image:', error);
        alert(error instanceof Error ? error.message : '이미지 붙여넣기에 실패했습니다.');
      } finally {
        setIsUploadingImage(false);
        setUploadingImagePosition(null);
      }
    };

    window.addEventListener('paste', handleWindowPaste, true); // Use capture phase

    return () => {
      window.removeEventListener('paste', handleWindowPaste, true);
    };
    // Note: We intentionally omit uploadImageFile, screenToSVG, addNode, selectNode from deps
    // to avoid circular dependencies and ensure the handler uses the latest versions
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [isReadOnly, editingNodeId, editingEdgeId, lastMousePosition]);

  // 모든 선택 및 편집 상태를 초기화하는 함수
  const clearAllSelections = () => {
      selectNode(null);
      selectEdge(null);
    setEditingNodeId(null);
    setEditorMode(null);
    setEditingEdgeId(null);
    setIsConnecting(false);
    setConnectingFrom(null);
    setContextMenu(null);
    setEdgeInspectorState(null);
    console.log('🧹 All selections and edit states cleared');
  };

  const handleCanvasClick = (e: React.MouseEvent<SVGSVGElement>) => {
    if (e.target === svgRef.current) {
      // 캔버스 클릭 시 SVG에 포커스하여 키보드 이벤트를 받을 수 있도록 함
      if (svgRef.current) {
        svgRef.current.focus();
      }
      // 모든 선택 및 편집 상태 초기화
      clearAllSelections();
    }
  };

  const handleCanvasMouseDown = (e: React.MouseEvent<SVGSVGElement>) => {
    const target = e.target as SVGElement;
    
    console.log('👆 Canvas mousedown, target:', target.tagName, target.id, target.className);
    
    // 배경(svg 또는 background rect)을 클릭한 경우에만 패닝 시작
    const isBackground = 
      target === svgRef.current || 
      target.classList?.contains('canvas-background') ||
      target.id === 'grid-background';
    
    console.log('🎯 Is background?', isBackground, 'Button:', e.button);
    
    if (isBackground && e.button === 0) {
      e.preventDefault();
      setIsPanning(true);
      setPanStart({ x: e.clientX, y: e.clientY });
      console.log('🖐️ Panning started at', e.clientX, e.clientY);
    }
  };

  const handleAddNode = () => {
    let x: number, y: number;
    
    if (selectedNodeId) {
      // 선택된 노드가 있으면 그 주변에 생성
      const selectedNode = map.nodes.find((n) => n.id === selectedNodeId);
      if (selectedNode) {
        // 선택된 노드의 오른쪽 아래에 생성
        x = selectedNode.x + 180;
        y = selectedNode.y + 100;
        console.log('📍 Adding node near selected node:', selectedNodeId);
      } else {
        // 선택된 노드를 찾을 수 없으면 중앙에
        x = viewBox.x + viewBox.width / 2 - 75;
        y = viewBox.y + viewBox.height / 2 - 40;
      }
    } else {
      // 선택된 노드가 없으면 중앙에 생성하되, 겹치지 않도록 offset 추가
      const centerX = viewBox.x + viewBox.width / 2 - 75;
      const centerY = viewBox.y + viewBox.height / 2 - 40;
      
      // 중앙 근처에 이미 노드가 있는지 확인
      const nearbyNodes = map.nodes.filter((n) => {
        const distance = Math.sqrt(
          Math.pow(n.x - centerX, 2) + Math.pow(n.y - centerY, 2)
        );
        return distance < 100; // 100px 이내
      });
      
      // 겹치지 않도록 offset 계산 (나선형으로 배치)
      const count = nearbyNodes.length;
      const angle = (count * 137.5) * (Math.PI / 180); // Golden angle
      const radius = Math.sqrt(count + 1) * 40;
      
      x = centerX + Math.cos(angle) * radius;
      y = centerY + Math.sin(angle) * radius;
      
      console.log(`📍 Adding node at center with offset (${count} nearby nodes)`);
    }
    
    const newNode: NodeType = {
      id: `n_${Date.now()}`,
      label: 'New Node',
      x,
      y,
      w: 150,
      h: 80,
      contentType: 'richeditor', // 기본 타입을 richeditor로 설정
    };
    
    addNode(newNode);
    selectNode(newNode.id);
  };

  // Upload image file to server
  const uploadImageFile = async (file: File): Promise<string> => {
    if (!map) {
      throw new Error('No map available');
    }

    // Get auth token from localStorage
    const auth = localStorage.getItem('auth-storage');
    let authToken = null;
    if (auth) {
      try {
        const { token } = JSON.parse(auth).state;
        authToken = token;
      } catch (e) {
        console.error('Failed to parse auth storage:', e);
      }
    }

    // Create FormData for file upload
    const formData = new FormData();
    formData.append('file', file);
    formData.append('mapId', map.id);

    // Prepare headers
    const headers: HeadersInit = {};
    if (authToken) {
      headers.Authorization = `Bearer ${authToken}`;
    }

    // Upload file to backend
    const apiUrl = import.meta.env.VITE_API_URL || 'http://localhost:8787';
    const response = await fetch(`${apiUrl}/upload`, {
      method: 'POST',
      headers,
      body: formData,
    });

    if (!response.ok) {
      const errorText = await response.text();
      throw new Error(`Upload failed: ${response.status} ${errorText}`);
    }

    const result = await response.json();
    console.log('📤 Image upload successful:', result);
    return result.url;
  };

  // Handle paste event for image
  const handlePaste = async (e: React.ClipboardEvent<SVGSVGElement> | ClipboardEvent) => {
    console.log('📋 Paste event detected:', { isReadOnly, editingNodeId, editingEdgeId });
    
    if (isReadOnly) {
      console.log('⏸️ Readonly mode, ignoring paste');
      return;
    }
    
    // Don't handle paste if user is editing text
    if (editingNodeId || editingEdgeId) {
      console.log('⏸️ Editing node/edge, ignoring paste');
      return;
    }

    // Check if SVG is focused (for React events) or if we're handling window event
    if (e instanceof ClipboardEvent) {
      // Window-level paste event - check if canvas is in focus
      const activeElement = document.activeElement;
      if (activeElement && activeElement !== svgRef.current && !svgRef.current?.contains(activeElement)) {
        console.log('⏸️ Canvas not focused, ignoring paste');
        return;
      }
    }

    const clipboardData = e.clipboardData;
    if (!clipboardData) {
      console.log('⚠️ No clipboard data available');
      return;
    }

    // Check if clipboard contains image
    const items = Array.from(clipboardData.items);
    console.log('📋 Clipboard items:', items.map(item => ({ type: item.type, kind: item.kind })));
    
    const imageItem = items.find(item => item.type.startsWith('image/'));

    if (!imageItem) {
      // No image in clipboard, ignore
      console.log('⏸️ No image in clipboard, ignoring paste');
      return;
    }

    console.log('🖼️ Image found in clipboard:', imageItem.type);
    e.preventDefault();
    e.stopPropagation();

    try {
      setIsUploadingImage(true);

      // Get image file from clipboard
      const file = imageItem.getAsFile();
      if (!file) {
        throw new Error('Failed to get image file from clipboard');
      }

      // Validate file type
      const allowedTypes = ['image/jpeg', 'image/jpg', 'image/png', 'image/gif', 'image/webp', 'image/svg+xml', 'image/bmp'];
      if (!allowedTypes.includes(file.type)) {
        throw new Error(`Unsupported image type: ${file.type}`);
      }

      // Validate file size (max 10MB)
      const maxSize = 10 * 1024 * 1024;
      if (file.size > maxSize) {
        throw new Error('Image too large. Maximum size is 10MB.');
      }

      // Get paste position (last mouse position or canvas center)
      const mouseX = lastMousePosition?.x || window.innerWidth / 2;
      const mouseY = lastMousePosition?.y || window.innerHeight / 2;
      const svgCoords = screenToSVG(mouseX, mouseY);
      setUploadingImagePosition({ x: svgCoords.x, y: svgCoords.y });

      console.log('🖼️ Pasting image from clipboard:', { type: file.type, size: file.size, position: svgCoords });

      // Upload image
      const imageUrl = await uploadImageFile(file);

      // Get image dimensions for node size
      const imageDimensions = await new Promise<{ width: number; height: number }>((resolve, reject) => {
        const img = new Image();
        img.onload = () => {
          resolve({ width: img.width, height: img.height });
        };
        img.onerror = reject;
        img.src = imageUrl;
      });

      // Calculate node size (max 600px width or height, maintain aspect ratio)
      const maxDimension = 600;
      let nodeWidth = imageDimensions.width;
      let nodeHeight = imageDimensions.height;

      if (nodeWidth > maxDimension || nodeHeight > maxDimension) {
        const scale = Math.min(maxDimension / nodeWidth, maxDimension / nodeHeight);
        nodeWidth = nodeWidth * scale;
        nodeHeight = nodeHeight * scale;
      }

      // Minimum node size
      nodeWidth = Math.max(nodeWidth, 200);
      nodeHeight = Math.max(nodeHeight, 150);

      // Adjust position to center the node
      const nodeX = svgCoords.x - nodeWidth / 2;
      const nodeY = svgCoords.y - nodeHeight / 2;

      // Create image node
      const newNode: NodeType = {
        id: `n_${Date.now()}`,
        label: file.name || 'Image',
        x: nodeX,
        y: nodeY,
        w: nodeWidth,
        h: nodeHeight,
        embedUrl: imageUrl,
        embedType: 'image',
        contentType: 'richeditor', // 이미지 노드는 richeditor 타입
      };

      addNode(newNode);
      selectNode(newNode.id);

      console.log('✅ Image node created:', newNode.id);
    } catch (error) {
      console.error('❌ Failed to paste image:', error);
      alert(error instanceof Error ? error.message : '이미지 붙여넣기에 실패했습니다.');
    } finally {
      setIsUploadingImage(false);
      setUploadingImagePosition(null);
    }
  };

  const handleMouseMove = (e: React.MouseEvent<SVGSVGElement>) => {
    const svgCoords = screenToSVG(e.clientX, e.clientY);
    
    // Track mouse position for paste positioning
    setLastMousePosition({ x: e.clientX, y: e.clientY });

    // Handle canvas panning
    if (isPanning) {
      console.log('🖐️ Panning move', e.clientX, e.clientY);
      const dx = (e.clientX - panStart.x) * (viewBox.width / (svgRef.current?.clientWidth || 1200));
      const dy = (e.clientY - panStart.y) * (viewBox.height / (svgRef.current?.clientHeight || 800));
      
      console.log('📊 Pan delta:', dx, dy);
      
      setViewBox((prev) => ({
        x: prev.x - dx,
        y: prev.y - dy,
        width: prev.width,
        height: prev.height,
      }));
      
      setPanStart({ x: e.clientX, y: e.clientY });
      return;
    }

    // Handle node dragging
    if (isDragging && draggedNodeId) {
      updateNode(draggedNodeId, {
        x: svgCoords.x - dragOffset.x,
        y: svgCoords.y - dragOffset.y,
      });
    }

    // Handle node resizing
    if (isResizing && resizingNodeId && resizeDirection) {
      const dx = svgCoords.x - resizeStart.mouseX;
      const dy = svgCoords.y - resizeStart.mouseY;

      let newX = resizeStart.nodeX;
      let newY = resizeStart.nodeY;
      let newW = resizeStart.w;
      let newH = resizeStart.h;

      const minW = 100;
      const minH = 80;
      const maxW = 1000;
      const maxH = 1000;

      // Calculate new dimensions based on resize direction
      if (resizeDirection.includes('e')) {
        newW = Math.max(minW, Math.min(maxW, resizeStart.w + dx));
      }
      if (resizeDirection.includes('w')) {
        const deltaW = Math.max(minW, Math.min(maxW, resizeStart.w - dx)) - resizeStart.w;
        newW = resizeStart.w + deltaW;
        newX = resizeStart.nodeX - deltaW;
      }
      if (resizeDirection.includes('s')) {
        newH = Math.max(minH, Math.min(maxH, resizeStart.h + dy));
      }
      if (resizeDirection.includes('n')) {
        const deltaH = Math.max(minH, Math.min(maxH, resizeStart.h - dy)) - resizeStart.h;
        newH = resizeStart.h + deltaH;
        newY = resizeStart.nodeY - deltaH;
      }

      updateNode(resizingNodeId, {
        x: newX,
        y: newY,
        w: newW,
        h: newH,
      });
    }

    // Handle connection line preview
    if (isConnecting) {
      setTempLineEnd(svgCoords);
    }
  };

  const handleMouseUp = (e: React.MouseEvent) => {
    // End panning
    if (isPanning) {
      console.log('🖐️ Panning ended');
      setIsPanning(false);
    }

    // End dragging
    if (isDragging) {
      console.log('🖱️ Drag ended');
      setIsDragging(false);
      setDraggedNodeId(null);
    }

    // End resizing
    if (isResizing) {
      console.log('📐 Resize ended');
      setIsResizing(false);
      setResizingNodeId(null);
      setResizeDirection(null);
    }
    
    // Cancel connection if clicking on canvas (empty space)
    if (isConnecting && e.target === svgRef.current) {
      console.log('❌ Connection cancelled (clicked canvas)');
      setIsConnecting(false);
      setConnectingFrom(null);
    }
  };


  const startConnectionFromNode = useCallback((nodeId: string) => {
    console.log('🔗 Starting connection from node:', nodeId);
    
    setIsConnecting(true);
    setConnectingFrom(nodeId);
    
    const { map: latestMap } = useMindMapStore.getState();
    const sourceMap = latestMap || map;
    const node = sourceMap?.nodes.find((n) => n.id === nodeId);
    if (node) {
      setTempLineEnd({
        x: node.x + node.w / 2,
        y: node.y + node.h / 2,
      });
    }
  }, [map]);

  const handleStartConnection = (e: React.MouseEvent, nodeId: string) => {
    e.stopPropagation();
    e.preventDefault();

    startConnectionFromNode(nodeId);
  };

  const handleCompleteConnection = (e: React.MouseEvent, targetNodeId: string) => {
    e.stopPropagation();
    e.preventDefault();
    
    console.log('🔗 Completing connection to node:', targetNodeId, 'from:', connectingFrom);
    
    if (isConnecting && connectingFrom && connectingFrom !== targetNodeId) {
      // Check if edge already exists
      const edgeExists = map.edges.some(
        (edge) =>
          (edge.source === connectingFrom && edge.target === targetNodeId) ||
          (edge.source === targetNodeId && edge.target === connectingFrom)
      );

      if (!edgeExists) {
        const newEdge: EdgeType = {
          id: `e_${Date.now()}`,
          source: connectingFrom,
          target: targetNodeId,
        };
        console.log('✅ Edge created:', newEdge);
        addEdge(newEdge);
      } else {
        console.log('⚠️ Edge already exists');
      }
    } else if (connectingFrom === targetNodeId) {
      console.log('⚠️ Cannot connect node to itself');
    }
    
    setIsConnecting(false);
    setConnectingFrom(null);
  };

  const handleNodeSelect = (e: React.MouseEvent, nodeId: string) => {
    e.stopPropagation();
    if (!isDragging) {
      selectNode(nodeId);
      setEdgeInspectorState(null);
      // 노드 선택 시 SVG에 포커스를 강제로 설정 (requestAnimationFrame으로 다음 프레임에서 실행)
      requestAnimationFrame(() => {
        if (svgRef.current) {
          svgRef.current.focus();
          if (import.meta.env.DEV) {
            console.log('✅ SVG focused after node select:', document.activeElement === svgRef.current);
          }
        }
      });
    }
  };

  const handleNodeDoubleClick = (e: React.MouseEvent, nodeId: string) => {
    e.stopPropagation();
    e.preventDefault();
    
    // 단일 클릭 타이머 취소 (더블 클릭인 경우)
    const target = e.target as any;
    if (target.__clickTimer) {
      clearTimeout(target.__clickTimer);
      delete target.__clickTimer;
    }
    
    if (import.meta.env.DEV) {
      console.log('🖱️ handleNodeDoubleClick called:', {
        nodeId,
        isReadOnly,
        eventType: e.type,
        detail: e.detail,
        target: e.target,
        timestamp: Date.now()
      });
    }
    
    // Readonly 모드이거나 노드가 접혀있으면 편집 불가
    if (isReadOnly) {
      if (import.meta.env.DEV) {
        console.log('⏸️ Readonly mode, cannot edit node');
      }
      return;
    }
    
    if (import.meta.env.DEV) {
    console.log('✏️ Editing node:', nodeId);
    }
    
    const node = map.nodes.find((n) => n.id === nodeId);
    if (!node) {
      console.error('❌ Node not found:', nodeId);
      return;
    }
    
    // 노드가 접혀있으면 편집 불가
    if (node.collapsed) {
      if (import.meta.env.DEV) {
        console.log('⏸️ Node is collapsed, cannot edit');
      }
      return;
    }
    
    // 더블 클릭 시 현재 contentType에 맞는 인라인 편집 시작 (팝업 없음)
    // editorMode를 명시적으로 설정하지 않으면 현재 contentType 기반으로 인라인 편집됨
    if (import.meta.env.DEV) {
      console.log('📝 Starting inline edit for node:', nodeId, 'contentType:', node.contentType);
      console.log('📝 Setting editorMode to null, editingNodeId to:', nodeId);
    }
    
    setEditorMode(null); // 명시적 모드 없음 = 현재 contentType 기반 인라인 편집
    setEditingNodeId(nodeId);
    
    if (import.meta.env.DEV) {
      console.log('✅ Double click handler completed');
    }
  };

  // editingNodeId 상태 변경 감지 (디버깅용)
  useEffect(() => {
    if (import.meta.env.DEV) {
      if (editingNodeId) {
        console.log('📌 editingNodeId changed to:', editingNodeId);
        console.log('📌 editorMode:', editorMode);
        
        // 에디터가 렌더링되는지 확인
        const editingNode = map.nodes.find((n) => n.id === editingNodeId);
        if (editingNode) {
          console.log('📌 Editing node found:', {
            id: editingNode.id,
            contentType: editingNode.contentType,
            label: editingNode.label.substring(0, 50),
            position: { x: editingNode.x, y: editingNode.y },
            size: { w: editingNode.w, h: editingNode.h }
          });
        } else {
          console.warn('⚠️ Editing node not found in map.nodes');
        }
      } else {
        console.log('📌 editingNodeId cleared');
      }
    }
  }, [editingNodeId, editorMode, map.nodes]);

  const handleSaveNodeLabel = (nodeId: string, newLabel: string) => {
    console.log('💾 Saving node label:', nodeId, newLabel);
    updateNode(nodeId, { label: newLabel });
    setEditingNodeId(null);
    setEditorMode(null);
  };

  const handleCancelEdit = () => {
    console.log('❌ Edit cancelled');
    setEditingNodeId(null);
    setEditorMode(null);
  };

  const handleEdgeSelect = (e: React.MouseEvent, edgeId: string) => {
    e.stopPropagation();
    console.log('🔗 Edge selected:', edgeId);
    selectEdge(edgeId);
    setEdgeInspectorState(null);
  };

  const handleEdgeDoubleClick = (e: React.MouseEvent, edgeId: string) => {
    e.stopPropagation();
    e.preventDefault();
    console.log('✏️ Editing edge:', edgeId);
    setEdgeInspectorState(null);
    setEditingEdgeId(edgeId);
  };

  const handleSaveEdgeLabel = (edgeId: string, newLabel: string) => {
    console.log('💾 Saving edge label:', edgeId, newLabel);
    updateEdge(edgeId, { label: newLabel });
    setEditingEdgeId(null);
  };

  const handleCancelEdgeEdit = () => {
    console.log('❌ Edge edit cancelled');
    setEditingEdgeId(null);
  };

  const handleCreateSummaryForChildren = useCallback(
    (parentId: string) => {
      const { map: currentMap } = useMindMapStore.getState();
      if (!currentMap) return;

      const parentNode = currentMap.nodes.find((n) => n.id === parentId);
      if (!parentNode) return;

      const childEdges = currentMap.edges.filter(
        (edge) =>
          edge.source === parentId &&
          edge.category !== 'summary' &&
          edge.category !== 'boundary'
      );
      const childNodes = childEdges
        .map((edge) => currentMap.nodes.find((node) => node.id === edge.target))
        .filter((node): node is NodeType => Boolean(node));

      if (childNodes.length < 2) {
        console.warn('⚠️ Not enough child nodes to create summary');
        return;
      }

      const summaryTitle = `${parentNode.label} Summary`;
      const newEdge: EdgeType = {
        id: `e_summary_${Date.now()}`,
        source: childNodes[0].id,
        target: childNodes[childNodes.length - 1].id,
        category: 'summary',
        summary: {
          nodeIds: childNodes.map((node) => node.id),
          title: summaryTitle,
          height: SUMMARY_DEFAULT_HEIGHT,
          padding: SUMMARY_DEFAULT_PADDING,
          collapsed: false,
        },
        style: {
          strokeColor: '#60a5fa',
          strokeWidth: 2,
        },
      };

      addEdge(newEdge);
      selectEdge(newEdge.id);
      setEdgeInspectorState({
        edgeId: newEdge.id,
        x: parentNode.x,
        y: parentNode.y,
      });
    },
    [addEdge, selectEdge]
  );

  const handleCreateBoundaryAroundFamily = useCallback(
    (rootId: string) => {
      const { map: currentMap } = useMindMapStore.getState();
      if (!currentMap) return;

      const rootNode = currentMap.nodes.find((n) => n.id === rootId);
      if (!rootNode) return;

      const childEdges = currentMap.edges.filter(
        (edge) =>
          edge.source === rootId &&
          edge.category !== 'summary' &&
          edge.category !== 'boundary'
      );
      const childNodes = childEdges
        .map((edge) => currentMap.nodes.find((node) => node.id === edge.target))
        .filter((node): node is NodeType => Boolean(node));

      const nodeIds = [rootId, ...childNodes.map((node) => node.id)];

      const newEdge: EdgeType = {
        id: `e_boundary_${Date.now()}`,
        source: rootId,
        target: rootId,
        category: 'boundary',
        boundary: {
          nodeIds,
          title: `${rootNode.label} Group`,
          padding: BOUNDARY_DEFAULT_PADDING,
          theme: 'default',
          shape: 'rounded',
        },
        style: {
          strokeColor: '#3b82f6',
          strokeWidth: 1.5,
        },
      };

      addEdge(newEdge);
      selectEdge(newEdge.id);
      setEdgeInspectorState({
        edgeId: newEdge.id,
        x: rootNode.x,
        y: rootNode.y,
      });
    },
    [addEdge, selectEdge]
  );

  const buildNodeContextMenuItems = useCallback((nodeId: string): MenuItem[] => {
    const { map: latestMap } = useMindMapStore.getState();
    const sourceMap = latestMap || map;

    if (!sourceMap) {
      console.warn('⚠️ Node context menu requested without map');
      return [];
    }

    const node = sourceMap.nodes.find((n) => n.id === nodeId);
    const isMacPlatform = navigator.platform?.toLowerCase().includes('mac');

    const menuItems: MenuItem[] = [
      {
        label: 'Edit Label',
        icon: <AppleIcon name="edit" size="medium" />,
        onClick: () => {
          const { map: currentMap } = useMindMapStore.getState();
          const targetNode = currentMap?.nodes.find((n) => n.id === nodeId);
          if (targetNode) {
            if (targetNode.contentType === 'markdown') {
              setEditorMode('markdown');
            } else {
              setEditorMode('richeditor');
            }
            setEditingNodeId(nodeId);
          }
        },
        disabled: isReadOnly,
        shortcut: 'e',
      },
      {
        label: 'Connect to...',
        icon: <AppleIcon name="connect" size="medium" />,
        onClick: () => startConnectionFromNode(nodeId),
        disabled: isReadOnly,
      },
      {
        label: 'Add Summary of Children',
        icon: <AppleIcon name="success" size="medium" />,
        onClick: () => handleCreateSummaryForChildren(nodeId),
        disabled:
          isReadOnly ||
          !node ||
          !map ||
          map.edges.filter(
            (edge) =>
              edge.source === nodeId &&
              edge.category !== 'summary' &&
              edge.category !== 'boundary'
          ).length < 2,
      },
      {
        label: 'Add Boundary Group',
        icon: <AppleIcon name="square" size="medium" />,
        onClick: () => handleCreateBoundaryAroundFamily(nodeId),
        disabled: isReadOnly || !node,
      },
      { divider: true } as MenuItem,
      {
        label: node?.embedUrl ? 'Change Embed' : 'Add Embed',
        icon: <AppleIcon name="embed" size="medium" />,
        onClick: () => {
          setEmbedTargetNodeId(nodeId);
          setShowEmbedDialog(true);
        },
        disabled: isReadOnly,
      },
      {
        label: 'Remove Embed',
        icon: <AppleIcon name="delete" size="medium" />,
        onClick: () => {
          updateNode(nodeId, { 
            embedUrl: undefined, 
            embedType: undefined,
            collapsed: false,
            w: 150,
            h: 80,
          });
        },
        disabled: !node?.embedUrl || isReadOnly,
      },
      ...(node?.embedUrl || node?.collapsed
        ? [
        { divider: true } as MenuItem,
        {
          label: node?.collapsed ? '📂 Expand' : '📁 Collapse',
          icon: node?.collapsed ? '📂' : '📁',
          onClick: () => {
                const { map: currentMap } = useMindMapStore.getState();
                const targetNode = currentMap?.nodes.find((n) => n.id === nodeId);
                if (!targetNode) {
                  return;
                }
                const newCollapsed = !targetNode.collapsed;
            console.log('Menu: Toggling collapse to', newCollapsed, 'for node:', nodeId);
            updateNode(nodeId, { collapsed: newCollapsed });
            
                const connectedEdges = currentMap?.edges.filter(
                  (edge) => edge.source === nodeId || edge.target === nodeId
                ) || [];
            if (connectedEdges.length > 0) {
              console.log(`  → ${connectedEdges.length} connected edges will update`);
            }
          },
            },
          ]
        : []),
      { divider: true } as MenuItem,
      {
        label: 'Add Child Node',
        icon: <AppleIcon name="add" size="medium" />,
        onClick: () => {
          const { map: currentMap } = useMindMapStore.getState();
          const parentNode = currentMap?.nodes.find((n) => n.id === nodeId);
          if (!parentNode) {
            return;
          }

            const newNode: NodeType = {
              id: `n_${Date.now()}`,
              label: 'New Node',
            x: parentNode.x + 180,
            y: parentNode.y + 100,
              w: 150,
              h: 80,
            contentType: 'richeditor',
            };
            addNode(newNode);
            
            const newEdge = {
              id: `e_${Date.now()}`,
              source: nodeId,
              target: newNode.id,
            };
            addEdge(newEdge);
            selectNode(newNode.id);
            console.log('➕ Added child node and edge');
        },
        disabled: isReadOnly,
        shortcut: 'a',
      },
      {
        label: 'Duplicate',
        icon: <AppleIcon name="copy" size="medium" />,
        onClick: () => {
          const { map: currentMap } = useMindMapStore.getState();
          const targetNode = currentMap?.nodes.find((n) => n.id === nodeId);
          if (!targetNode) {
            return;
          }

            const newNode: NodeType = {
            ...targetNode,
              id: `n_${Date.now()}`,
            x: targetNode.x + 30,
            y: targetNode.y + 30,
            contentType: targetNode.contentType || 'richeditor',
            };
            addNode(newNode);
            selectNode(newNode.id);
        },
        shortcut: isMacPlatform ? 'Cmd+D' : 'Ctrl+D',
      },
      { divider: true } as MenuItem,
      {
        label: 'Change Shape',
        icon: '◇',
        onClick: () => {
          setShapeTargetNodeId(nodeId);
          setShowShapeSelector(true);
          setContextMenu(null);
        },
      },
      {
        label: 'Content Type',
        icon: '📝',
        onClick: () => {},
        submenu: [
          {
            label: 'Editor Type',
            icon: '📝',
            onClick: () => {},
            disabled: true,
          },
          {
            label: `  ${node?.contentType === 'markdown' ? '✓' : '  '} Markdown`,
            icon: '📝',
            onClick: () => {
              updateNode(nodeId, { contentType: 'markdown' });
              console.log('📝 Content type: markdown');
            },
          },
          {
            label: `  ${node?.contentType !== 'markdown' ? '✓' : '  '} Rich Editor`,
            icon: '✏️',
            onClick: () => {
              updateNode(nodeId, { contentType: 'richeditor' });
              console.log('📝 Content type: richeditor');
            },
          },
        ],
      },
      {
        label: 'Background Color',
        icon: '🎨',
        onClick: () => {
          setColorTargetNodeId(nodeId);
          setShowColorPicker(true);
          setContextMenu(null);
        },
      },
      { divider: true } as MenuItem,
      {
        label: 'Text Align',
        icon: '≡',
        onClick: () => {},
        submenu: [
          {
            label: '수평 정렬',
            icon: '⟷',
            onClick: () => {},
            disabled: true,
          },
          {
            label: `  ${node?.textAlign === 'left' || !node?.textAlign ? '✓' : '  '} Left`,
            icon: '⊣',
            onClick: () => {
              updateNode(nodeId, { textAlign: 'left' });
              console.log('📝 Text align: left');
            },
          },
          {
            label: `  ${node?.textAlign === 'center' ? '✓' : '  '} Center`,
            icon: '⊢',
            onClick: () => {
              updateNode(nodeId, { textAlign: 'center' });
              console.log('📝 Text align: center');
            },
          },
          {
            label: `  ${node?.textAlign === 'right' ? '✓' : '  '} Right`,
            icon: '⊨',
            onClick: () => {
              updateNode(nodeId, { textAlign: 'right' });
              console.log('📝 Text align: right');
            },
          },
          { divider: true } as MenuItem,
          {
            label: '수직 정렬',
            icon: '⟝',
            onClick: () => {},
            disabled: true,
          },
          {
            label: `  ${node?.textVerticalAlign === 'top' ? '✓' : '  '} Top`,
            icon: '⊤',
            onClick: () => {
              updateNode(nodeId, { textVerticalAlign: 'top' });
              console.log('📝 Text vertical align: top');
            },
          },
          {
            label: `  ${node?.textVerticalAlign === 'middle' || !node?.textVerticalAlign ? '✓' : '  '} Middle`,
            icon: '⊥',
            onClick: () => {
              updateNode(nodeId, { textVerticalAlign: 'middle' });
              console.log('📝 Text vertical align: middle');
            },
          },
          {
            label: `  ${node?.textVerticalAlign === 'bottom' ? '✓' : '  '} Bottom`,
            icon: '⊥',
            onClick: () => {
              updateNode(nodeId, { textVerticalAlign: 'bottom' });
              console.log('📝 Text vertical align: bottom');
            },
          },
        ],
      },
      { divider: true } as MenuItem,
      {
        label: 'Delete',
        icon: <AppleIcon name="delete" size="medium" />,
        onClick: () => {
          const { map: currentMap } = useMindMapStore.getState();
          const targetNode = currentMap?.nodes.find((n) => n.id === nodeId);
          const nodeLabel = targetNode?.label || '노드';
          setDeleteConfirm({
            isOpen: true,
            type: 'node',
            label: nodeLabel,
            onConfirm: () => {
          deleteNode(nodeId);
          selectNode(null);
              setDeleteConfirm(null);
            },
          });
        },
        shortcut: 'd',
      },
    ];

    return menuItems;
  }, [
    map,
    isReadOnly,
    startConnectionFromNode,
    handleCreateSummaryForChildren,
    handleCreateBoundaryAroundFamily,
    setEmbedTargetNodeId,
    setShowEmbedDialog,
    updateNode,
    setColorTargetNodeId,
    setShowColorPicker,
    setShapeTargetNodeId,
    setShowShapeSelector,
    setContextMenu,
    addNode,
    addEdge,
    selectNode,
    setEditorMode,
    setEditingNodeId,
    deleteNode,
    setDeleteConfirm
  ]);

  const showNodeContextMenu = useCallback((nodeId: string, position: { x: number; y: number }) => {
    const menuItems = buildNodeContextMenuItems(nodeId);
    if (menuItems.length === 0) {
      return;
    }

    console.log('📋 Node context menu:', nodeId);
    selectNode(nodeId);

    setEdgeInspectorState(null);
    setContextMenu({
      x: position.x,
      y: position.y,
      items: menuItems,
    });
  }, [buildNodeContextMenuItems, selectNode, setContextMenu]);

  const handleNodeContextMenu = (e: React.MouseEvent, nodeId: string) => {
    e.preventDefault();
    e.stopPropagation();

    showNodeContextMenu(nodeId, { x: e.clientX, y: e.clientY });
  };

  const handleEdgeContextMenu = (e: React.MouseEvent, edgeId: string) => {
    console.log('🐞 [EdgeContextMenu] raw event', {
      edgeId,
      client: { x: e.clientX, y: e.clientY },
      type: e.type,
      target: (e.target as HTMLElement)?.tagName,
    });

    e.preventDefault();
    e.stopPropagation();

    const edge = map.edges.find((item) => item.id === edgeId);
    const source = edge ? map.nodes.find((node) => node.id === edge.source) : null;
    const target = edge ? map.nodes.find((node) => node.id === edge.target) : null;
    console.log('🐞 [EdgeContextMenu] edge lookup', {
      foundEdge: !!edge,
      category: edge?.category,
      hasBoundary: !!edge?.boundary,
      hasSummary: !!edge?.summary,
      hasSource: !!source,
      hasTarget: !!target,
      edge,
      source,
      target,
    });

    selectEdge(edgeId);
    setContextMenu(null);

    const svgCoords = screenToSVG(e.clientX, e.clientY);
    console.log('🐞 [EdgeContextMenu] svg coords', { svgCoords });

    setEdgeInspectorState({
      edgeId,
      x: svgCoords.x,
      y: svgCoords.y,
    });
  };

  const handleCanvasContextMenu = (e: React.MouseEvent) => {
    e.preventDefault();
    
    console.log('📋 Canvas context menu');
    
    const svgCoords = screenToSVG(e.clientX, e.clientY);
    
    setEdgeInspectorState(null);
    const menuItems: MenuItem[] = [
      {
        label: 'Add Node Here',
        icon: <AppleIcon name="add" size="medium" />,
        onClick: () => {
          const newNode: NodeType = {
            id: `n_${Date.now()}`,
            label: 'New Node',
            x: svgCoords.x - 75,
            y: svgCoords.y - 40,
            w: 150,
            h: 80,
            contentType: 'richeditor', // 기본 타입을 richeditor로 설정
          };
          addNode(newNode);
          selectNode(newNode.id);
        },
      },
      { divider: true } as MenuItem,
      {
        label: 'Deselect All',
        icon: '⭕',
        onClick: () => {
          selectNode(null);
          selectEdge(null);
        },
        disabled: !selectedNodeId && !selectedEdgeId,
      },
    ];

    setContextMenu({
      x: e.clientX,
      y: e.clientY,
      items: menuItems,
    });
  };

  const closeContextMenu = () => {
    setContextMenu(null);
  };

  const handleAddEmbed = (url: string, type: 'youtube' | 'webpage' | 'image' | 'pdf') => {
    console.log('🌐 handleAddEmbed called with:', { url, type, embedTargetNodeId });
    
    if (embedTargetNodeId) {
      console.log('🌐 Adding embed to node:', embedTargetNodeId, url, type);
      
      // Resize node to better fit embed content
      const node = map.nodes.find((n) => n.id === embedTargetNodeId);
      if (node) {
        console.log('📏 Current node dimensions:', { w: node.w, h: node.h });
        const newWidth = Math.max(node.w, 400);
        const newHeight = Math.max(node.h, 300);
        
        console.log('📏 New node dimensions:', { w: newWidth, h: newHeight });
        
        updateNode(embedTargetNodeId, {
          embedUrl: url,
          embedType: type,
          w: newWidth,
          h: newHeight,
        });
        
        console.log('✅ Node updated with embed information');
      } else {
        console.error('❌ Target node not found:', embedTargetNodeId);
      }
      
      setShowEmbedDialog(false);
      setEmbedTargetNodeId(null);
    } else {
      console.error('❌ No embed target node ID');
    }
  };

  const handleCancelEmbed = () => {
    setShowEmbedDialog(false);
    setEmbedTargetNodeId(null);
  };


  const handleToggleCollapse = (e: React.MouseEvent, nodeId: string) => {
    e.stopPropagation();
    e.preventDefault();
    const node = map.nodes.find((n) => n.id === nodeId);
    console.log('🔄 handleToggleCollapse called for node:', nodeId, 'Current state:', node?.collapsed);
    if (node) {
      const newCollapsed = !node.collapsed;
      console.log(newCollapsed ? '📁 Collapsing node:' : '📂 Expanding node:', nodeId);
      
      // Update node state
      updateNode(nodeId, { collapsed: newCollapsed });
      console.log('✅ Node collapsed state updated to:', newCollapsed);
      
      // Count connected edges
      const connectedEdges = map.edges.filter(
        (edge) => edge.source === nodeId || edge.target === nodeId
      );
      console.log(`📊 ${connectedEdges.length} edges connected to this node will update`);
    } else {
      console.error('❌ Node not found:', nodeId);
    }
  };

  const handleNodeDrag = (e: React.MouseEvent, nodeId: string) => {
    // Don't drag if we're in connecting mode, editing, or resizing
    if (isConnecting) {
      console.log('⚠️ Cannot drag while connecting');
      return;
    }

    if (editingNodeId || isResizing) {
      console.log('⚠️ Cannot drag while editing or resizing');
      return;
    }

    e.stopPropagation();
    e.preventDefault();
    
    const node = map.nodes.find((n) => n.id === nodeId);
    if (!node) return;

    const svgCoords = screenToSVG(e.clientX, e.clientY);
    
    console.log('🖱️ Starting drag for node:', nodeId);
    
    setIsDragging(true);
    setDraggedNodeId(nodeId);
    setDragOffset({
      x: svgCoords.x - node.x,
      y: svgCoords.y - node.y,
    });
    selectNode(nodeId);
  };

  const handleResizeStart = (e: React.MouseEvent, nodeId: string, direction: ResizeDirection) => {
    e.stopPropagation();
    e.preventDefault();

    const node = map.nodes.find((n) => n.id === nodeId);
    if (!node) return;

    const svgCoords = screenToSVG(e.clientX, e.clientY);

    console.log('📐 Starting resize:', nodeId, direction, 'at', svgCoords);

    // 선택 상태 유지
    selectNode(nodeId);
    
    setIsResizing(true);
    setResizingNodeId(nodeId);
    setResizeDirection(direction);
    setResizeStart({
      mouseX: svgCoords.x,
      mouseY: svgCoords.y,
      nodeX: node.x,
      nodeY: node.y,
      w: node.w,
      h: node.h,
    });
  };

  type DirectionKey = 'ArrowUp' | 'ArrowDown' | 'ArrowLeft' | 'ArrowRight';

  const directionVectors: Record<DirectionKey, { x: number; y: number }> = {
    ArrowUp: { x: 0, y: -1 },
    ArrowDown: { x: 0, y: 1 },
    ArrowLeft: { x: -1, y: 0 },
    ArrowRight: { x: 1, y: 0 },
  };

  const getNodeCenter = useCallback((node: NodeType) => ({
    x: node.x + node.w / 2,
    y: node.y + node.h / 2,
  }), []);

  type GraphSnapshot = {
    nodes: NodeType[];
    edges: EdgeType[];
  };

  const findDirectionalNeighbor = useCallback(
    (snapshot: GraphSnapshot, nodeId: string, direction: DirectionKey) => {
      const node = snapshot.nodes.find((n) => n.id === nodeId);
      if (!node) {
        return null;
      }

      const origin = getNodeCenter(node);
      const dir = directionVectors[direction];

      const candidates = snapshot.edges.reduce<Array<{ nodeId: string; edgeId: string; dot: number; distance: number }>>(
        (acc, edge) => {
          if (edge.source !== nodeId && edge.target !== nodeId) {
            return acc;
          }

          const neighborId = edge.source === nodeId ? edge.target : edge.source;
          const neighbor = snapshot.nodes.find((n) => n.id === neighborId);
          if (!neighbor) {
            return acc;
          }

          const target = getNodeCenter(neighbor);
          const dx = target.x - origin.x;
          const dy = target.y - origin.y;
          const distance = Math.hypot(dx, dy);
          if (distance === 0) {
            return acc;
          }

          const dot = (dx * dir.x + dy * dir.y) / distance;
          acc.push({ nodeId: neighborId, edgeId: edge.id, dot, distance });
          return acc;
        },
        []
      );

      if (candidates.length === 0) {
        return null;
      }

      const threshold = 0.2;
      const filtered = candidates.filter((item) => item.dot > threshold);
      const list = filtered.length > 0 ? filtered : candidates;

      list.sort((a, b) => {
        if (b.dot !== a.dot) {
          return b.dot - a.dot;
        }
        return a.distance - b.distance;
      });

      const best = list[0];
      if (!best || best.dot <= 0) {
        return null;
      }

      return { nodeId: best.nodeId, edgeId: best.edgeId };
    },
    [directionVectors, getNodeCenter]
  );

  const handleNodeDirectionalNavigation = useCallback(
    (direction: DirectionKey) => {
      const { map: currentMap, selectedNodeId } = useMindMapStore.getState();
      if (!currentMap || !currentMap.nodes || !currentMap.edges || !selectedNodeId) {
        return;
      }

      const neighbor = findDirectionalNeighbor(
        { nodes: currentMap.nodes, edges: currentMap.edges },
        selectedNodeId,
        direction
      );

      if (neighbor) {
        if (import.meta.env.DEV) {
          console.log('➡️ Navigating to node via arrow key', direction, neighbor);
        }
        selectNode(neighbor.nodeId);
      } else if (import.meta.env.DEV) {
        console.log('⏸️ No directional neighbor found for', selectedNodeId, direction);
      }
    },
    [findDirectionalNeighbor, selectNode]
  );

  const handleEdgeDirectionalNavigation = useCallback(
    (direction: DirectionKey) => {
      const { map: currentMap, selectedEdgeId } = useMindMapStore.getState();
      if (!currentMap || !currentMap.nodes || !currentMap.edges || !selectedEdgeId) {
        return;
      }

      const edge = currentMap.edges.find((e) => e.id === selectedEdgeId);
      if (!edge) {
        return;
      }

      const sourceNode = currentMap.nodes.find((n) => n.id === edge.source);
      const targetNode = currentMap.nodes.find((n) => n.id === edge.target);
      if (!sourceNode || !targetNode) {
        return;
      }

      const source = getNodeCenter(sourceNode);
      const target = getNodeCenter(targetNode);

      const vector = { x: target.x - source.x, y: target.y - source.y };
      const magnitude = Math.hypot(vector.x, vector.y) || 1;
      const dir = directionVectors[direction];
      const alignment = (vector.x * dir.x + vector.y * dir.y) / magnitude;

      const nextNode = alignment >= 0 ? targetNode : sourceNode;

      if (import.meta.env.DEV) {
        console.log('➡️ Edge navigation', direction, 'selecting node', nextNode.id);
      }

      selectNode(nextNode.id);
    },
    [directionVectors, getNodeCenter, selectNode]
  );

  // Add global event listeners
  useEffect(() => {
    // Zustand store에서 최신 상태를 가져오는 헬퍼
    const getCurrentState = () => useMindMapStore.getState();
    
    const handleGlobalMouseUp = () => {
      // End panning
      if (isPanning) {
        console.log('🖐️ Panning ended (global)');
        setIsPanning(false);
      }
      // End dragging or resizing
      if (isDragging) {
        console.log('🖱️ Drag ended');
        setIsDragging(false);
        setDraggedNodeId(null);
      }
      if (isResizing) {
        console.log('📐 Resize ended');
        setIsResizing(false);
        setResizingNodeId(null);
        setResizeDirection(null);
      }
    };

    const handleKeyDown = (e: KeyboardEvent) => {
      if (contextMenu) {
      if (e.key === 'Escape') {
          e.preventDefault();
          e.stopPropagation();
          setContextMenu(null);
        }
        return;
      }
      
      // 텍스트 입력 중인지 확인
      const activeElement = document.activeElement;
      const isTextInputFocused = activeElement && (
        activeElement.tagName === 'INPUT' ||
        activeElement.tagName === 'TEXTAREA' ||
        activeElement.getAttribute('contenteditable') === 'true'
      );
      
      // IME(Input Method Editor) 입력 중인지 확인 (한글, 중국어, 일본어 등)
      // isComposing이 true이면 IME 조합 중이므로 키보드 단축키 무시
      if (e.isComposing) {
        return;
      }

      // Escape 키는 key 속성 사용 (항상 'Escape')
      if (e.key === 'Escape') {
        // 편집 중이 아닐 때만 전체 선택 상태 초기화
        // (편집 중일 때는 각 에디터가 자체적으로 Escape 처리)
        if (!editingNodeId && !editingEdgeId) {
          e.preventDefault();
          clearAllSelections();
        }
        
        if (isPanning) {
          console.log('❌ Panning cancelled (ESC key)');
          setIsPanning(false);
        }
        if (isConnecting) {
          console.log('❌ Connection cancelled (ESC key)');
          setIsConnecting(false);
          setConnectingFrom(null);
        }
        if (isResizing) {
          console.log('❌ Resize cancelled (ESC key)');
          setIsResizing(false);
          setResizingNodeId(null);
          setResizeDirection(null);
        }
      }
      // 'e' 키: 선택된 노드 편집 모드 진입
      // e.code를 사용하여 물리적 키 위치를 감지 (한글/영어 구분 없음)
      else if ((e.code === 'KeyE' || e.key.toLowerCase() === 'e') && !isTextInputFocused && !isReadOnly) {
        // 최신 상태를 직접 가져옴 (클로저 문제 해결)
        const currentState = getCurrentState();
        const { selectedNodeId: currentSelectedNodeId, map: currentMap } = currentState;
        // editingNodeId와 editingEdgeId는 컴포넌트 로컬 상태이므로 직접 참조
        const currentEditingNodeId = editingNodeId;
        const currentEditingEdgeId = editingEdgeId;
        
        // 디버깅: 조건 확인
        if (import.meta.env.DEV) {
          console.log('⌨️ e key pressed', {
            selectedNodeId: currentSelectedNodeId,
            editingNodeId: currentEditingNodeId,
            editingEdgeId: currentEditingEdgeId,
            hasMap: !!currentMap,
            isTextInputFocused,
            isReadOnly
          });
        }
        
        // 조기 반환으로 중첩 제거
        if (!currentSelectedNodeId) {
          return;
        }
        
        if (currentEditingNodeId || currentEditingEdgeId) {
          return;
        }
        
        if (!currentMap) {
          return;
        }
        
        e.preventDefault();
        e.stopPropagation(); // 이벤트 전파 방지
        
        const node = currentMap.nodes.find((n) => n.id === currentSelectedNodeId);
        if (!node) {
          console.warn('⚠️ Node not found:', currentSelectedNodeId);
          useMindMapStore.getState().selectNode(null);
          return;
        }
        
        // contentType에 따라 모달 편집 모드 설정 (편집 버튼 클릭과 동일)
        if (import.meta.env.DEV) {
          console.log('⌨️ Edit mode via keyboard shortcut (e key):', currentSelectedNodeId);
        }
        
        if (node.contentType === 'markdown') {
          setEditorMode('markdown');
        } else {
          // richeditor 또는 미지정 시 Rich Editor 모달
          setEditorMode('richeditor');
        }
        setEditingNodeId(currentSelectedNodeId);
      }
      // Enter 키: 선택된 노드 inline 편집 모드 진입 (더블 클릭과 동일)
      // e.key를 사용하여 Enter 키 감지
      else if (e.key === 'Enter' && !isTextInputFocused && !isReadOnly) {
        // 최신 상태를 직접 가져옴 (클로저 문제 해결)
        const currentState = getCurrentState();
        const { selectedNodeId: currentSelectedNodeId, map: currentMap } = currentState;
        // editingNodeId와 editingEdgeId는 컴포넌트 로컬 상태이므로 직접 참조
        const currentEditingNodeId = editingNodeId;
        const currentEditingEdgeId = editingEdgeId;
        
        // 디버깅: 조건 확인
        if (import.meta.env.DEV) {
          console.log('⌨️ Enter key pressed for inline edit', {
            selectedNodeId: currentSelectedNodeId,
            editingNodeId: currentEditingNodeId,
            editingEdgeId: currentEditingEdgeId,
            hasMap: !!currentMap,
            isTextInputFocused,
            isReadOnly
          });
        }
        
        // 조기 반환으로 중첩 제거
        if (!currentSelectedNodeId) {
          return;
        }
        
        if (currentEditingNodeId || currentEditingEdgeId) {
          return;
        }
        
        if (!currentMap) {
          return;
        }
        
        e.preventDefault();
        e.stopPropagation(); // 이벤트 전파 방지
        
        const node = currentMap.nodes.find((n) => n.id === currentSelectedNodeId);
        if (!node) {
          console.warn('⚠️ Node not found:', currentSelectedNodeId);
          useMindMapStore.getState().selectNode(null);
          return;
        }
        
        // Readonly 모드이거나 노드가 접혀있으면 편집 불가
        if (isReadOnly) {
          if (import.meta.env.DEV) {
            console.log('⏸️ Readonly mode, cannot edit node');
          }
          return;
        }
        
        if (node.collapsed) {
          if (import.meta.env.DEV) {
            console.log('⏸️ Node is collapsed, cannot edit');
          }
          return;
        }
        
        // Enter 키는 inline 편집 모드로 진입 (더블 클릭과 동일)
        // editorMode를 null로 설정하면 현재 contentType 기반으로 인라인 편집됨
        if (import.meta.env.DEV) {
          console.log('⌨️ Starting inline edit via Enter key:', currentSelectedNodeId, 'contentType:', node.contentType);
        }
        
        setEditorMode(null); // 명시적 모드 없음 = 현재 contentType 기반 인라인 편집
        setEditingNodeId(currentSelectedNodeId);
      }
      // 'a' 키: 노드 추가
      // e.code를 사용하여 물리적 키 위치를 감지 (한글/영어 구분 없음)
      else if ((e.code === 'KeyA' || e.key.toLowerCase() === 'a') && !isTextInputFocused && !isReadOnly) {
        // 편집 중일 때는 노드 추가 동작 안 함
        if (editingNodeId || editingEdgeId) {
          return;
        }
        
        // 최신 상태를 직접 가져옴 (클로저 문제 해결)
        const currentState = getCurrentState();
        const { selectedNodeId: currentSelectedNodeId, map: currentMap } = currentState;
        
        if (!currentMap) {
          return;
        }
        
        e.preventDefault();
        e.stopPropagation(); // 이벤트 전파 방지
        
        if (import.meta.env.DEV) {
          console.log('⌨️ Adding node via keyboard shortcut (a key)');
        }
        
        // 노드가 선택되어 있으면 child node로 생성 (엣지 자동 연결)
        if (currentSelectedNodeId) {
          const selectedNode = currentMap.nodes.find((n) => n.id === currentSelectedNodeId);
          if (selectedNode) {
            const newNode: NodeType = {
              id: `n_${Date.now()}`,
              label: 'New Node',
              x: selectedNode.x + 180,
              y: selectedNode.y + 100,
              w: 150,
              h: 80,
              contentType: 'richeditor',
            };
            addNode(newNode);
            
            // 자동으로 edge 연결 (child node)
            const newEdge = {
              id: `e_${Date.now()}`,
              source: currentSelectedNodeId,
              target: newNode.id,
            };
            addEdge(newEdge);
            selectNode(newNode.id);
            
            if (import.meta.env.DEV) {
              console.log('➕ Added child node via a key');
            }
          }
        } else {
          // 노드가 선택되어 있지 않으면 일반 노드 생성 (엣지 없음)
          handleAddNode();
        }
      }
      // 'd' 키: 선택된 노드/엣지 삭제
      // e.code를 사용하여 물리적 키 위치를 감지 (한글/영어 구분 없음)
      else if ((e.code === 'KeyD' || e.key.toLowerCase() === 'd') && !isTextInputFocused && !isReadOnly) {
        // 편집 중일 때는 삭제 동작 안 함
        if (editingNodeId || editingEdgeId) {
          return;
        }
        
        // 최신 상태를 직접 가져옴 (클로저 문제 해결)
        const currentState = getCurrentState();
        const { selectedNodeId: currentSelectedNodeId, selectedEdgeId: currentSelectedEdgeId, map: currentMap } = currentState;
        
        if (currentSelectedNodeId || currentSelectedEdgeId) {
          e.preventDefault();
          e.stopPropagation(); // 이벤트 전파 방지
          
          if (currentSelectedNodeId) {
            const node = currentMap?.nodes.find((n) => n.id === currentSelectedNodeId);
            const nodeLabel = node?.label || '노드';
            
            setDeleteConfirm({
              isOpen: true,
              type: 'node',
              label: nodeLabel,
              onConfirm: () => {
                if (import.meta.env.DEV) {
                  console.log('🗑️ Deleting node via keyboard shortcut (d key):', currentSelectedNodeId);
                }
                deleteNode(currentSelectedNodeId);
                selectNode(null);
                setDeleteConfirm(null);
              },
            });
          } else if (currentSelectedEdgeId) {
            setDeleteConfirm({
              isOpen: true,
              type: 'edge',
              onConfirm: () => {
                if (import.meta.env.DEV) {
                  console.log('🗑️ Deleting edge via keyboard shortcut (d key):', currentSelectedEdgeId);
                }
                deleteEdge(currentSelectedEdgeId);
                selectEdge(null);
                setDeleteConfirm(null);
              },
            });
          }
        }
        return; // d 키 처리 완료
      }
      // Delete/Backspace 키: 선택된 노드/엣지 삭제 (기존 방식 유지)
      else if ((e.key === 'Delete' || e.key === 'Backspace') && !isTextInputFocused && !isReadOnly) {
        // 편집 중일 때는 삭제 동작 안 함
        if (editingNodeId || editingEdgeId) {
          return;
        }
        
        if (selectedNodeId || selectedEdgeId) {
          e.preventDefault();
          
          if (selectedNodeId) {
            const node = map?.nodes.find((n) => n.id === selectedNodeId);
            const nodeLabel = node?.label || '노드';
            
            setDeleteConfirm({
              isOpen: true,
              type: 'node',
              label: nodeLabel,
              onConfirm: () => {
                console.log('🗑️ Deleting node via keyboard shortcut:', selectedNodeId);
                deleteNode(selectedNodeId);
                selectNode(null);
                setDeleteConfirm(null);
              },
            });
          } else if (selectedEdgeId) {
            setDeleteConfirm({
              isOpen: true,
              type: 'edge',
              onConfirm: () => {
                console.log('🗑️ Deleting edge via keyboard shortcut:', selectedEdgeId);
                deleteEdge(selectedEdgeId);
                selectEdge(null);
                setDeleteConfirm(null);
              },
            });
          }
        }
      }
      // 'm' 키: 노드 컨텍스트 메뉴 열기
      else if ((e.code === 'KeyM' || e.key.toLowerCase() === 'm') && !isTextInputFocused) {
        if (editingNodeId || editingEdgeId) {
          return;
        }

        const currentState = getCurrentState();
        const { selectedNodeId: currentSelectedNodeId, map: currentMap } = currentState;

        if (!currentSelectedNodeId || !currentMap) {
          return;
        }

        const node = currentMap.nodes.find((n) => n.id === currentSelectedNodeId);
        if (!node) {
          return;
        }

        e.preventDefault();
        e.stopPropagation();

        const offset = 16;
        const { x: screenX, y: screenY } = svgToScreen(node.x + node.w + offset, node.y + offset);
        showNodeContextMenu(currentSelectedNodeId, { x: screenX, y: screenY });
      }
      else if (['ArrowUp', 'ArrowDown', 'ArrowLeft', 'ArrowRight'].includes(e.key)) {
        const direction = e.key as DirectionKey;
        const currentState = getCurrentState();
        const { selectedNodeId: currentSelectedNodeId, selectedEdgeId: currentSelectedEdgeId } = currentState;

        if (!currentSelectedNodeId && !currentSelectedEdgeId) {
          return;
        }

        if (editingNodeId || editingEdgeId) {
          return;
        }

        e.preventDefault();
        e.stopPropagation();

        if (currentSelectedEdgeId) {
          handleEdgeDirectionalNavigation(direction);
        } else if (currentSelectedNodeId) {
          handleNodeDirectionalNavigation(direction);
        }
      }
    };

    if (isDragging || isResizing || isPanning) {
      document.addEventListener('mouseup', handleGlobalMouseUp);
    }
    
    document.addEventListener('keydown', handleKeyDown, true); // 캡처 단계 사용
    
    return () => {
      document.removeEventListener('mouseup', handleGlobalMouseUp);
      document.removeEventListener('keydown', handleKeyDown, true);
    };
  }, [
    isDragging,
    isResizing,
    isConnecting,
    isPanning,
    setEditorMode,
    setEditingNodeId,
    deleteNode,
    deleteEdge,
    selectNode,
    selectEdge,
    clearAllSelections,
    isReadOnly,
    showNodeContextMenu,
    svgToScreen,
    contextMenu,
    handleNodeDirectionalNavigation,
    handleEdgeDirectionalNavigation,
  ]);

  return (
      <div ref={containerRef} className="mindmap-canvas-container">
        {isReadOnly && (
          <div className="readonly-overlay">
            <div className="readonly-banner">
              <AppleIcon name="lock" size="medium" className="readonly-icon" />
              <span className="readonly-text">{t('editor.readonly')}</span>
              <span className="readonly-subtitle">{t('editor.readonlySubtitle')}</span>
            </div>
          </div>
        )}
        {isRefreshing && (
          <div className="save-overlay">
            <div className="save-progress-container">
              <div className="save-progress-header">
                <span className="save-icon">🔄</span>
                <span className="save-title">{t('editor.saving')}</span>
              </div>
              <div className="save-progress-bar">
                <div 
                  className="save-progress-fill" 
                  style={{ width: `${refreshProgress}%` }}
                />
              </div>
              <div className="save-progress-text">
                {Math.round(refreshProgress)}%
              </div>
            </div>
          </div>
        )}

      <svg
        ref={svgRef}
        className={`mindmap-canvas ${isPanning ? 'panning' : ''}`}
        viewBox={`${viewBox.x} ${viewBox.y} ${viewBox.width} ${viewBox.height}`}
        onClick={handleCanvasClick}
        onMouseDown={(e) => {
          handleCanvasMouseDown(e);
          // Ensure SVG gets focus for paste events
          if (svgRef.current && !isReadOnly) {
            svgRef.current.focus();
          }
        }}
        onMouseMove={handleMouseMove}
        onMouseUp={handleMouseUp}
        onContextMenu={handleCanvasContextMenu}
        onPaste={handlePaste}
        tabIndex={0}
        style={{ outline: 'none' }}
      >
        {/* Grid background and arrow marker */}
        <defs>
          <pattern
            id="grid"
            width="20"
            height="20"
            patternUnits="userSpaceOnUse"
          >
            <path
              d="M 20 0 L 0 0 0 20"
              fill="none"
              stroke="#e5e7eb"
              strokeWidth="0.5"
            />
          </pattern>
          
          {/* Arrow marker for edges */}
          <marker
            id="arrowhead"
            markerWidth="10"
            markerHeight="10"
            refX="9"
            refY="3"
            orient="auto"
          >
            <polygon points="0 0, 10 3, 0 6" fill="#6b7280" />
          </marker>
        </defs>
        <rect
          id="grid-background"
          className="canvas-background"
          x={viewBox.x}
          y={viewBox.y}
          width={viewBox.width}
          height={viewBox.height}
          fill="url(#grid)"
        />

        {/* Boundary regions */}
        {boundaryEdges.map((edge) => (
          <BoundaryEdge
            key={edge.id}
            edge={edge}
            nodes={map.nodes}
            isSelected={selectedEdgeId === edge.id}
            onClick={(e) => handleEdgeSelect(e, edge.id)}
            onDoubleClick={(e) => handleEdgeDoubleClick(e, edge.id)}
            onContextMenu={(e) => handleEdgeContextMenu(e, edge.id)}
          />
        ))}

        {/* Summary arcs */}
        {summaryEdges.map((edge) => (
          <SummaryEdge
            key={edge.id}
            edge={edge}
            nodes={map.nodes}
            isSelected={selectedEdgeId === edge.id}
            onClick={(e) => handleEdgeSelect(e, edge.id)}
            onDoubleClick={(e) => handleEdgeDoubleClick(e, edge.id)}
            onContextMenu={(e) => handleEdgeContextMenu(e, edge.id)}
          />
        ))}

        {/* Edges */}
        {standardEdges.map((edge) => {
          const source = map.nodes.find((n) => n.id === edge.source);
          const target = map.nodes.find((n) => n.id === edge.target);
          if (!source || !target) return null;

          return (
            <Edge
              key={edge.id}
              edge={edge}
              sourceNode={source}
              targetNode={target}
              isSelected={selectedEdgeId === edge.id}
              onClick={(e) => handleEdgeSelect(e, edge.id)}
              onDoubleClick={(e) => handleEdgeDoubleClick(e, edge.id)}
              onContextMenu={(e) => handleEdgeContextMenu(e, edge.id)}
            />
          );
        })}

        {/* Temporary connection line */}
        {isConnecting && connectingFrom && (() => {
          const sourceNode = map.nodes.find((n) => n.id === connectingFrom);
          if (!sourceNode) return null;
          
          return (
            <TemporaryEdge
              key="temp-edge"
              sourceNode={sourceNode}
              endPoint={tempLineEnd}
            />
          );
        })()}

        {/* Nodes */}
        {map.nodes.map((node) => (
          <Node
            key={node.id}
            node={node}
            isSelected={selectedNodeId === node.id}
            isDragging={draggedNodeId === node.id}
            isConnecting={isConnecting}
            isConnectionSource={connectingFrom === node.id}
            onSelect={(e) => handleNodeSelect(e, node.id)}
            onDragStart={(e) => handleNodeDrag(e, node.id)}
            onStartConnection={(e) => handleStartConnection(e, node.id)}
            onCompleteConnection={(e) => handleCompleteConnection(e, node.id)}
            onDoubleClick={(e) => handleNodeDoubleClick(e, node.id)}
            onContextMenu={(e) => handleNodeContextMenu(e, node.id)}
            onResizeStart={(e, direction) => handleResizeStart(e, node.id, direction)}
            onToggleCollapse={(e) => handleToggleCollapse(e, node.id)}
                 onSwitchToRichEditor={(nodeId) => {
                   // Switch to Rich Editor mode
                   updateNode(nodeId, { contentType: 'richeditor' });
                   // Set editor mode and start editing
                   setEditorMode('richeditor');
                   setEditingNodeId(nodeId);
                 }}
                 onSwitchToMarkdown={(nodeId) => {
                   // Switch to Markdown mode
                   updateNode(nodeId, { contentType: 'markdown' });
                   // Set editor mode and start editing
                   setEditorMode('markdown');
                   setEditingNodeId(nodeId);
                 }}
                 onEditClick={(nodeId) => {
                   // 편집 버튼 클릭 시 모달 편집 시작
                   console.log('✏️ Edit button clicked for node:', nodeId);
                   const node = map.nodes.find((n) => n.id === nodeId);
                   if (node) {
                     // 현재 contentType에 맞는 모달 편집 모드 설정
                     if (node.contentType === 'markdown') {
                       setEditorMode('markdown');
                     } else {
                       // richeditor 또는 미지정 시 Rich Editor 모달
                       setEditorMode('richeditor');
                     }
                     setEditingNodeId(nodeId);
                   }
                 }}
                 showEditButton={true}
                 isEditing={editingNodeId === node.id && editorMode === null}
                 editorType={
                   editingNodeId === node.id && editorMode === null
                     ? (() => {
                         const editingNode = map.nodes.find((n) => n.id === node.id);
                         if (!editingNode) return undefined;
                         if (editingNode.contentType === 'markdown') return 'markdown' as const;
                         if (editingNode.contentType === 'richeditor') return 'richeditor' as const;
                         if (editingNode.contentType === 'text') return 'text' as const;
                         return 'richeditor' as const; // 기본값
                       })()
                     : undefined
                 }
          />
        ))}

        {/* Node Editor (when editing) */}
        {editingNodeId && (() => {
          const editingNode = map.nodes.find((n) => n.id === editingNodeId);
          if (!editingNode) {
            if (import.meta.env.DEV) {
              console.warn('⚠️ Editing node not found:', editingNodeId);
            }
            return null;
          }

          // Determine editor mode based on contentType and editorMode state
          let actualEditorMode: 'text' | 'richeditor' | 'markdown';
          let useModal = false; // 더블 클릭인지 버튼 클릭인지 구분
          
          if (editorMode) {
            // Explicit mode set (from toolbar buttons or edit button) - 모달 사용
            actualEditorMode = editorMode;
            useModal = true;
            if (import.meta.env.DEV) {
              console.log('🎨 Editor mode explicitly set:', editorMode, '→ using modal');
            }
          } else if (editingNode.contentType === 'markdown') {
            // Markdown mode: 더블 클릭 시 인라인 편집
            actualEditorMode = 'markdown';
            useModal = false;
            if (import.meta.env.DEV) {
              console.log('📝 Markdown inline editor (double-click)');
            }
          } else if (editingNode.contentType === 'richeditor') {
            // Rich Editor mode: 더블 클릭 시 인라인 편집
            actualEditorMode = 'richeditor';
            useModal = false;
            if (import.meta.env.DEV) {
              console.log('✨ Rich Editor inline editor (double-click)');
            }
          } else if (editingNode.contentType === 'text') {
            // Text mode: 인라인 편집
            actualEditorMode = 'text';
            useModal = false;
            if (import.meta.env.DEV) {
              console.log('📄 Text inline editor (double-click)');
            }
          } else {
            // contentType이 미지정된 경우 Rich Editor 인라인 편집이 기본
            actualEditorMode = 'richeditor';
            useModal = false;
            if (import.meta.env.DEV) {
              console.log('✨ Default Rich Editor inline editor (no contentType)');
            }
          }
          
          if (import.meta.env.DEV) {
            console.log('🎯 Rendering editor:', {
              editingNodeId,
              actualEditorMode,
              useModal,
              nodePosition: { x: editingNode.x, y: editingNode.y },
              nodeSize: { w: editingNode.w, h: editingNode.h }
            });
          }

          // Render appropriate editor
          if (actualEditorMode === 'text') {
            return (
              <TextEditor
                key={`text-editor-${editingNodeId}`}
                x={editingNode.x}
                y={editingNode.y}
                width={editingNode.w}
                height={editingNode.h}
                initialValue={editingNode.label}
                textAlign={editingNode.textAlign}
                onSave={(newLabel) => handleSaveNodeLabel(editingNodeId, newLabel)}
                onCancel={handleCancelEdit}
              />
            );
          } else if (actualEditorMode === 'richeditor') {
            if (useModal) {
              // 도구 상자 버튼 클릭 시 모달 사용
              return (
                <RichEditorModal
                  key={`richeditor-modal-${editingNodeId}`}
                  initialValue={editingNode.label}
                  textAlign={editingNode.textAlign}
                  onSave={(newLabel) => handleSaveNodeLabel(editingNodeId, newLabel)}
                  onCancel={handleCancelEdit}
                  onTextAlignChange={(align) => {
                    updateNode(editingNodeId, { textAlign: align });
                  }}
                />
              );
            } else {
              // 더블 클릭 시 인라인 편집
              return (
                <RichEditor
                  key={`richeditor-inline-${editingNodeId}`}
                  x={editingNode.x}
                  y={editingNode.y}
                  width={editingNode.w}
                  height={editingNode.h}
                  initialValue={editingNode.label}
                  textAlign={editingNode.textAlign}
                  onSave={(newLabel) => handleSaveNodeLabel(editingNodeId, newLabel)}
                  onCancel={handleCancelEdit}
                  onTextAlignChange={(align) => {
                    updateNode(editingNodeId, { textAlign: align });
                  }}
                  editorType="richeditor"
                />
              );
            }
          } else if (actualEditorMode === 'markdown') {
            if (useModal) {
              // 도구 상자 버튼 클릭 시 모달 사용
              return (
                <MarkdownEditorModal
                  key={`markdown-modal-${editingNodeId}`}
                  initialValue={editingNode.label}
                  textAlign={editingNode.textAlign}
                  onSave={(newLabel) => handleSaveNodeLabel(editingNodeId, newLabel)}
                  onCancel={handleCancelEdit}
                  onTextAlignChange={(align) => {
                    updateNode(editingNodeId, { textAlign: align });
                  }}
                />
              );
            } else {
              // 더블 클릭 시 인라인 편집 (NodeEditor 사용)
          return (
            <NodeEditor
                  key={`markdown-inline-${editingNodeId}`}
              x={editingNode.x}
              y={editingNode.y}
              width={editingNode.w}
              height={editingNode.h}
              initialValue={editingNode.label}
              textAlign={editingNode.textAlign}
              onSave={(newLabel) => handleSaveNodeLabel(editingNodeId, newLabel)}
              onCancel={handleCancelEdit}
                  onTextAlignChange={(align) => {
                    updateNode(editingNodeId, { textAlign: align });
                  }}
                  editorType="markdown"
            />
          );
            }
          }

          return null;
        })()}

        {/* Edge Editor (when editing) */}
        {editingEdgeId && (() => {
          const editingEdge = map.edges.find((e) => e.id === editingEdgeId);
          if (!editingEdge) return null;

          const source = map.nodes.find((n) => n.id === editingEdge.source);
          const target = map.nodes.find((n) => n.id === editingEdge.target);
          if (!source || !target) return null;

          // Calculate label position based on edge type
          const sourceDim = getNodeDisplayDimensions(source);
          const targetDim = getNodeDisplayDimensions(target);
          
          const x1 = source.x + sourceDim.w / 2;
          const y1 = source.y + sourceDim.h / 2;
          const x2 = target.x + targetDim.w / 2;
          const y2 = target.y + targetDim.h / 2;
          
          const routing = editingEdge.routing ?? 'organic';
          const edgeType =
            editingEdge.edgeType ||
            (routing === 'orthogonal'
              ? 'orthogonal'
              : editingEdge.category === 'relationship'
              ? 'bezier'
              : 'curved');
          const labelPos = getLabelPosition(
            x1,
            y1,
            x2,
            y2,
            edgeType,
            sourceDim.w,
            sourceDim.h,
            targetDim.w,
            targetDim.h,
            editingEdge.labelPosition,
            editingEdge.labelOffset,
            editingEdge.controlPoints
          );
          
          return (
            <EdgeEditor
              key={`edge-editor-${editingEdgeId}`}
              x={labelPos.x}
              y={labelPos.y}
              initialValue={editingEdge.label || ''}
              onSave={(newLabel) => handleSaveEdgeLabel(editingEdgeId, newLabel)}
              onCancel={handleCancelEdgeEdit}
            />
          );
        })()}



      </svg>

      {map.nodes.length === 0 && (
        <div className="empty-canvas">
          <p>Click "Add Node" to start building your mindmap</p>
          <p style={{ fontSize: '13px', color: '#9ca3af', marginTop: '8px' }}>
            Right-click for more options
          </p>
        </div>
      )}

        {/* Image Upload Indicator */}
        {isUploadingImage && uploadingImagePosition && (
          <foreignObject
            x={uploadingImagePosition.x - 40}
            y={uploadingImagePosition.y - 40}
            width={80}
            height={80}
            style={{ pointerEvents: 'none' }}
          >
            <div style={{
              width: '100%',
              height: '100%',
              display: 'flex',
              flexDirection: 'column',
              alignItems: 'center',
              justifyContent: 'center',
              background: 'rgba(37, 99, 235, 0.9)',
              borderRadius: '8px',
              color: '#ffffff',
              fontSize: '12px',
              padding: '8px',
            }}>
              <div style={{
                width: '32px',
                height: '32px',
                border: '3px solid rgba(255, 255, 255, 0.3)',
                borderTopColor: '#ffffff',
                borderRadius: '50%',
                animation: 'spin 0.8s linear infinite',
                marginBottom: '4px',
              }} />
              <div>Uploading...</div>
            </div>
          </foreignObject>
      )}

      {/* Context Menu */}
      {contextMenu && (
        <ContextMenu
          x={contextMenu.x}
          y={contextMenu.y}
          items={contextMenu.items}
          onClose={closeContextMenu}
        />
      )}

      {/* Embed Dialog */}
      {showEmbedDialog && (
        <EmbedDialog mapId={map.id} onSave={handleAddEmbed} onCancel={handleCancelEmbed} />
      )}

      {/* Shape Selector */}
      {showShapeSelector && shapeTargetNodeId && (() => {
        const targetNode = map.nodes.find((n) => n.id === shapeTargetNodeId);
        return (
          <ShapeSelector
            currentShape={targetNode?.nodeType}
            onSelect={(shape: NodeShapeType) => {
              updateNode(shapeTargetNodeId, { nodeType: shape });
              console.log('🔷 Node shape changed to:', shape);
            }}
            onClose={() => {
              setShowShapeSelector(false);
              setShapeTargetNodeId(null);
            }}
          />
        );
      })()}

      {/* Color Picker */}
      {showColorPicker && colorTargetNodeId && (() => {
        const targetNode = map.nodes.find((n) => n.id === colorTargetNodeId);
        return (
          <ColorPicker
            currentColor={targetNode?.backgroundColor}
            onConfirm={(color: string) => {
              updateNode(colorTargetNodeId, { backgroundColor: color });
              console.log('🎨 Node background color changed to:', color);
              setShowColorPicker(false);
              setColorTargetNodeId(null);
            }}
            onCancel={() => {
              setShowColorPicker(false);
              setColorTargetNodeId(null);
            }}
          />
        );
      })()}

      {/* JSON Preview Dialog */}
      {showJsonPreview && (
        <JsonPreviewDialog
          data={map}
          changeLog={getChangeLog()}
          onClose={() => setShowJsonPreview(false)}
          onConfirm={handleConfirmSave}
        />
      )}

      {/* Delete Confirm Dialog */}
      {deleteConfirm && (
        <DeleteConfirmDialog
          isOpen={deleteConfirm.isOpen}
          type={deleteConfirm.type}
          label={deleteConfirm.label}
          onConfirm={deleteConfirm.onConfirm}
          onCancel={() => setDeleteConfirm(null)}
        />
      )}

      {showColorPicker && colorTargetNodeId && (() => {
        const targetNode = map.nodes.find((n) => n.id === colorTargetNodeId);
        return (
          <ColorPicker
            currentColor={targetNode?.backgroundColor}
            onConfirm={(color: string) => {
              updateNode(colorTargetNodeId, { backgroundColor: color });
              console.log('🎨 Node background color changed to:', color);
              setShowColorPicker(false);
              setColorTargetNodeId(null);
            }}
            onCancel={() => {
              setShowColorPicker(false);
              setColorTargetNodeId(null);
            }}
          />
        );
      })()}

      {edgeInspectorState && (() => {
        const inspectorEdge = map.edges.find((edge) => edge.id === edgeInspectorState.edgeId);
        if (!inspectorEdge) {
          console.warn('🐞 [EdgeInspectorOverlay] missing edge for', edgeInspectorState.edgeId);
          return null;
        }

        let anchorX = edgeInspectorState.x;
        let anchorY = edgeInspectorState.y;

        if (inspectorEdge.category === 'boundary' && inspectorEdge.boundary) {
          const targetNodes = inspectorEdge.boundary.nodeIds
            .map((id) => map.nodes.find((node) => node.id === id))
            .filter((node): node is NodeType => Boolean(node));

          if (targetNodes.length > 0) {
            const rects = targetNodes.map((node) => {
              const { w, h } = getNodeDisplayDimensions(node);
              return { x: node.x, y: node.y, w, h };
            });
            const padding = inspectorEdge.boundary.padding ?? BOUNDARY_DEFAULT_PADDING;
            const left = Math.min(...rects.map((r) => r.x)) - padding;
            const right = Math.max(...rects.map((r) => r.x + r.w)) + padding;
            const top = Math.min(...rects.map((r) => r.y)) - padding;

            anchorX = (left + right) / 2;
            anchorY = top - 24;
          }
        } else if (inspectorEdge.category === 'summary' && inspectorEdge.summary) {
          const targetNodes = inspectorEdge.summary.nodeIds
            .map((id) => map.nodes.find((node) => node.id === id))
            .filter((node): node is NodeType => Boolean(node));

          if (targetNodes.length > 0) {
            const rects = targetNodes.map((node) => {
              const { w, h } = getNodeDisplayDimensions(node);
              return { x: node.x, y: node.y, w, h };
            });
            const padding = inspectorEdge.summary.padding ?? SUMMARY_DEFAULT_PADDING;
            const arcHeight = inspectorEdge.summary.height ?? SUMMARY_DEFAULT_HEIGHT;
            const left = Math.min(...rects.map((r) => r.x));
            const right = Math.max(...rects.map((r) => r.x + r.w));
            const top = Math.min(...rects.map((r) => r.y));
            const baseY = top - padding;
            const apexY = baseY - arcHeight;

            anchorX = (left + right) / 2;
            anchorY = apexY - 20;
          }
        } else {
          const source = map.nodes.find((n) => n.id === inspectorEdge.source);
          const target = map.nodes.find((n) => n.id === inspectorEdge.target);

          if (source && target) {
            const sourceDim = getNodeDisplayDimensions(source);
            const targetDim = getNodeDisplayDimensions(target);

            const x1 = source.x + sourceDim.w / 2;
            const y1 = source.y + sourceDim.h / 2;
            const x2 = target.x + targetDim.w / 2;
            const y2 = target.y + targetDim.h / 2;

            const routing = inspectorEdge.routing ?? 'organic';
            const edgeType =
              inspectorEdge.edgeType ||
              (routing === 'orthogonal'
                ? 'orthogonal'
                : inspectorEdge.category === 'relationship'
                ? 'bezier'
                : 'curved');

            const labelPos = getLabelPosition(
              x1,
              y1,
              x2,
              y2,
              edgeType,
              sourceDim.w,
              sourceDim.h,
              targetDim.w,
              targetDim.h,
              inspectorEdge.labelPosition,
              inspectorEdge.labelOffset,
              inspectorEdge.controlPoints
            );

            anchorX = labelPos.x;
            anchorY = labelPos.y;
          }
        }

        const screenPoint = svgToScreen(anchorX, anchorY);
        const viewportPadding = 16;
        const maxTop = window.innerHeight - 360;
        const maxLeft = window.innerWidth - 260;
        const top = Math.max(viewportPadding, Math.min(screenPoint.y, maxTop));
        const left = Math.max(viewportPadding, Math.min(screenPoint.x, maxLeft));

        console.log('🐞 [EdgeInspectorOverlay] position resolved', {
          anchor: { x: anchorX, y: anchorY },
          screenPoint,
          top,
          left,
          category: inspectorEdge.category,
        });

        const handleCloseInspector = () => setEdgeInspectorState(null);
        const handleRequestDelete = () => {
          if (isReadOnly) return;
          setDeleteConfirm({
            isOpen: true,
            type: 'edge',
            onConfirm: () => {
              deleteEdge(inspectorEdge.id);
              selectEdge(null);
              setEdgeInspectorState(null);
              setDeleteConfirm(null);
            },
          });
        };

        let relativeTop = screenPoint.y;
        let relativeLeft = screenPoint.x;

        if (containerRef.current) {
          const rect = containerRef.current.getBoundingClientRect();
          relativeTop -= rect.top;
          relativeLeft -= rect.left;

          const padding = 16;
          const inspectorHeight = edgeInspectorSize?.height ?? 360;
          const inspectorWidth = edgeInspectorSize?.width ?? 260;
          const maxTopWithin = rect.height - inspectorHeight - padding;
          const maxLeftWithin = rect.width - inspectorWidth - padding;

          relativeTop = Math.max(padding, Math.min(relativeTop, maxTopWithin));
          relativeLeft = Math.max(padding, Math.min(relativeLeft, maxLeftWithin));
        } else {
          const viewportPadding = 16;
          const maxTop = window.innerHeight - 360;
          const maxLeft = window.innerWidth - 260;
          relativeTop = Math.max(viewportPadding, Math.min(relativeTop, maxTop));
          relativeLeft = Math.max(viewportPadding, Math.min(relativeLeft, maxLeft));
        }

        const clampPosition = (left: number, top: number) => {
          if (!containerRef.current) {
            const vpPadding = 16;
            const maxTop = window.innerHeight - 360;
            const maxLeft = window.innerWidth - 260;
            return {
              left: Math.max(vpPadding, Math.min(left, maxLeft)),
              top: Math.max(vpPadding, Math.min(top, maxTop)),
            };
          }

          const rect = containerRef.current.getBoundingClientRect();
          const padding = 16;
          const inspectorHeight = edgeInspectorSize?.height ?? 360;
          const inspectorWidth = edgeInspectorSize?.width ?? 260;
          const maxTopWithin = rect.height - inspectorHeight - padding;
          const maxLeftWithin = rect.width - inspectorWidth - padding;

          return {
            left: Math.max(padding, Math.min(left, maxLeftWithin)),
            top: Math.max(padding, Math.min(top, maxTopWithin)),
          };
        };

        const clamped = clampPosition(relativeLeft, relativeTop);
        const handleDrag = ({ x, y }: { x: number; y: number }) => {
          setEdgeInspectorState((prev) => {
            if (!prev) return prev;
            if (prev.edgeId !== inspectorEdge.id) return prev;
            const nextOffset = {
              x: (prev.offset?.x ?? 0) + x,
              y: (prev.offset?.y ?? 0) + y,
            };
            const point = clampPosition(screenPoint.x + nextOffset.x, screenPoint.y + nextOffset.y);
            return {
              ...prev,
              offset: {
                x: point.left - screenPoint.x,
                y: point.top - screenPoint.y,
              },
            };
          });
        };

        return (
          <EdgeInspector
            key={`edge-inspector-${inspectorEdge.id}`}
            position={{ top: clamped.top, left: clamped.left }}
            edge={inspectorEdge}
            disabled={isReadOnly}
            onChange={(updates) => updateEdge(inspectorEdge.id, updates)}
            onClose={handleCloseInspector}
            onDelete={isReadOnly ? undefined : handleRequestDelete}
            onLayout={handleEdgeInspectorLayout}
            onDrag={handleDrag}
          />
        );
      })()}

    </div>
  );
}

