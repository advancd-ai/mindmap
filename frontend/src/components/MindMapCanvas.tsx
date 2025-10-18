/**
 * MindMap Canvas - SVG-based mindmap renderer
 */

import { useRef, useState, useEffect } from 'react';
import { useMutation } from '@tanstack/react-query';
import { useTranslation } from 'react-i18next';
import { useMindMapStore, type Node as NodeType, type Edge as EdgeType } from '../store/mindmap';
import { createMap, updateMap } from '../api/maps';
import Node from './Node';
import Edge from './Edge';
import TemporaryEdge from './TemporaryEdge';
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
import './MindMapCanvas.css';

interface MindMapCanvasProps {
  isReadOnly?: boolean;
  onRefreshToLatest?: () => void;
  isRefreshing?: boolean;
  refreshProgress?: number;
}

export default function MindMapCanvas({ 
  isReadOnly = false, 
  onRefreshToLatest,
  isRefreshing = false,
  refreshProgress = 0
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
    },
    onError: (error) => {
      console.error('Save error:', error);
      setShowJsonPreview(false);
      
      // Optimistic update 실패 처리
      if (map) {
        optimisticVersionManager.failVersionUpdate(map.id);
        console.log(`❌ Optimistic version update failed for map ${map.id}`);
      }
    },
  });

  const handleSave = () => {
    setShowJsonPreview(true);
  };

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
    }
  }, [map?.id]); // Only when map ID changes, not on every map update

  if (!map) {
    console.warn('⚠️ MindMapCanvas: No map data available');
    return null;
  }

  console.log('🖼️ Rendering canvas with', map.nodes.length, 'nodes and', map.edges.length, 'edges');

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

  // Zoom functions
  const handleZoomIn = () => {
    const newZoom = Math.min(zoom * 1.2, 5.0); // Max 500%
    const baseWidth = 1200;
    const baseHeight = 800;
    
    // Calculate center point of current viewBox
    const centerX = viewBox.x + viewBox.width / 2;
    const centerY = viewBox.y + viewBox.height / 2;
    
    // Calculate new viewBox size (smaller viewBox = zoomed in)
    const newWidth = baseWidth / newZoom;
    const newHeight = baseHeight / newZoom;
    
    // Adjust viewBox to keep center point
    setViewBox({
      x: centerX - newWidth / 2,
      y: centerY - newHeight / 2,
      width: newWidth,
      height: newHeight,
    });
    setZoom(newZoom);
    console.log('🔍 Zoom in:', (newZoom * 100).toFixed(0) + '%');
    
    // Save view state
    const newViewBox = {
      x: centerX - newWidth / 2,
      y: centerY - newHeight / 2,
      width: newWidth,
      height: newHeight,
    };
    updateViewState({ zoom: newZoom, viewBox: newViewBox });
  };

  const handleZoomOut = () => {
    const newZoom = Math.max(zoom / 1.2, 0.1); // Min 10%
    const baseWidth = 1200;
    const baseHeight = 800;
    
    // Calculate center point of current viewBox
    const centerX = viewBox.x + viewBox.width / 2;
    const centerY = viewBox.y + viewBox.height / 2;
    
    // Calculate new viewBox size (larger viewBox = zoomed out)
    const newWidth = baseWidth / newZoom;
    const newHeight = baseHeight / newZoom;
    
    // Adjust viewBox to keep center point
    setViewBox({
      x: centerX - newWidth / 2,
      y: centerY - newHeight / 2,
      width: newWidth,
      height: newHeight,
    });
    setZoom(newZoom);
    console.log('🔍 Zoom out:', (newZoom * 100).toFixed(0) + '%');
    
    // Save view state
    const newViewBox = {
      x: centerX - newWidth / 2,
      y: centerY - newHeight / 2,
      width: newWidth,
      height: newHeight,
    };
    updateViewState({ zoom: newZoom, viewBox: newViewBox });
  };

  const handleZoomReset = () => {
    const resetViewBox = { x: 0, y: 0, width: 1200, height: 800 };
    setZoom(1.0);
    setViewBox(resetViewBox);
    console.log('🔍 Zoom reset: 100%');
    
    // Save view state
    updateViewState({ zoom: 1.0, viewBox: resetViewBox });
  };

  const handleScreenshot = async () => {
    if (!svgRef.current || !map) return;
    
    console.log('📸 Taking screenshot...');

    // Store original collapsed states
    const originalStates = new Map<string, boolean>();
    map.nodes.forEach(node => {
      if (node.embedUrl && !node.collapsed) {
        originalStates.set(node.id, false);
      }
    });

    // Temporarily collapse all embed nodes for screenshot
    if (originalStates.size > 0) {
      console.log(`📸 Temporarily collapsing ${originalStates.size} embed nodes for screenshot...`);
      originalStates.forEach((_, nodeId) => {
        updateNode(nodeId, { collapsed: true });
      });
      
      // Wait for React to re-render
      await new Promise(resolve => setTimeout(resolve, 100));
    }

    try {
      const svgElement = svgRef.current;
      
      // Clone SVG to avoid modifying the original
      const clonedSvg = svgElement.cloneNode(true) as SVGSVGElement;
      
      // Remove all foreignObject elements (they don't render in canvas)
      const foreignObjects = clonedSvg.querySelectorAll('foreignObject');
      foreignObjects.forEach(fo => fo.remove());
      
      // Get SVG bounds
      const bbox = svgElement.getBBox();
      const padding = 50;
      
      // Set viewBox to fit all content
      clonedSvg.setAttribute('viewBox', `${bbox.x - padding} ${bbox.y - padding} ${bbox.width + padding * 2} ${bbox.height + padding * 2}`);
      clonedSvg.setAttribute('width', `${bbox.width + padding * 2}`);
      clonedSvg.setAttribute('height', `${bbox.height + padding * 2}`);
      
      // Add white background
      const rect = document.createElementNS('http://www.w3.org/2000/svg', 'rect');
      rect.setAttribute('x', `${bbox.x - padding}`);
      rect.setAttribute('y', `${bbox.y - padding}`);
      rect.setAttribute('width', `${bbox.width + padding * 2}`);
      rect.setAttribute('height', `${bbox.height + padding * 2}`);
      rect.setAttribute('fill', '#ffffff');
      clonedSvg.insertBefore(rect, clonedSvg.firstChild);
      
      // Serialize SVG to string
      const serializer = new XMLSerializer();
      let svgString = serializer.serializeToString(clonedSvg);
      
      // Add XML declaration and DOCTYPE
      svgString = '<?xml version="1.0" encoding="UTF-8"?>' + svgString;
      
      // Convert to blob
      const blob = new Blob([svgString], { type: 'image/svg+xml;charset=utf-8' });
      
      // Create canvas
      const canvas = document.createElement('canvas');
      const ctx = canvas.getContext('2d');
      if (!ctx) throw new Error('Could not get canvas context');
      
      // Set canvas size (2x for better quality)
      const scale = 2;
      canvas.width = (bbox.width + padding * 2) * scale;
      canvas.height = (bbox.height + padding * 2) * scale;
      
      // Create image from SVG
      const img = new Image();
      const url = URL.createObjectURL(blob);
      
      img.onload = () => {
        // Draw white background
        ctx.fillStyle = '#ffffff';
        ctx.fillRect(0, 0, canvas.width, canvas.height);
        
        // Draw SVG
        ctx.drawImage(img, 0, 0, canvas.width, canvas.height);
        URL.revokeObjectURL(url);
        
        // Convert to PNG and download
        canvas.toBlob((pngBlob) => {
          if (!pngBlob) {
            console.error('❌ Failed to create PNG blob');
            return;
          }
          
          const downloadUrl = URL.createObjectURL(pngBlob);
          const link = document.createElement('a');
          link.href = downloadUrl;
          link.download = `${map.title || 'mindmap'}-${Date.now()}.png`;
          document.body.appendChild(link);
          link.click();
          document.body.removeChild(link);
          URL.revokeObjectURL(downloadUrl);
          
          console.log('✅ Screenshot saved!');
          
          // Restore original states
          if (originalStates.size > 0) {
            console.log('📸 Restoring original node states...');
            originalStates.forEach((wasCollapsed, nodeId) => {
              updateNode(nodeId, { collapsed: wasCollapsed });
            });
          }
        }, 'image/png');
      };
      
      img.onerror = () => {
        console.error('❌ Failed to load SVG image');
        URL.revokeObjectURL(url);
        
        // Restore original states even on error
        if (originalStates.size > 0) {
          console.log('📸 Restoring original node states (after error)...');
          originalStates.forEach((wasCollapsed, nodeId) => {
            updateNode(nodeId, { collapsed: wasCollapsed });
          });
        }
        
        // Fallback: download SVG directly
        const downloadUrl = URL.createObjectURL(blob);
        const link = document.createElement('a');
        link.href = downloadUrl;
        link.download = `${map.title || 'mindmap'}-${Date.now()}.svg`;
        document.body.appendChild(link);
        link.click();
        document.body.removeChild(link);
        URL.revokeObjectURL(downloadUrl);
        console.log('⚠️ Downloaded as SVG instead');
      };
      
      img.src = url;
      
    } catch (error) {
      console.error('❌ Screenshot error:', error);
      
      // Restore original states on error
      if (originalStates.size > 0) {
        console.log('📸 Restoring original node states (after error)...');
        originalStates.forEach((wasCollapsed, nodeId) => {
          updateNode(nodeId, { collapsed: wasCollapsed });
        });
      }
      
      alert('Failed to take screenshot. Please try again.');
    }
  };

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
      
      setZoom(newZoom);
      setViewBox({
        x: newX,
        y: newY,
        width: newWidth,
        height: newHeight,
      });
      
      console.log('🔍 Wheel zoom:', (newZoom * 100).toFixed(0) + '%');
    };

    // Add event listener with passive: false to allow preventDefault
    svg.addEventListener('wheel', handleWheelNative, { passive: false });

    return () => {
      svg.removeEventListener('wheel', handleWheelNative);
    };
  }, [zoom, viewBox]);

  const handleCanvasClick = (e: React.MouseEvent<SVGSVGElement>) => {
    if (e.target === svgRef.current) {
      selectNode(null);
      selectEdge(null);
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
    };
    
    addNode(newNode);
    selectNode(newNode.id);
  };


  const handleMouseMove = (e: React.MouseEvent<SVGSVGElement>) => {
    const svgCoords = screenToSVG(e.clientX, e.clientY);

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

  const handleDeleteNode = () => {
    if (selectedNodeId) {
      deleteNode(selectedNodeId);
      selectNode(null);
    }
  };

  const handleStartConnection = (e: React.MouseEvent, nodeId: string) => {
    e.stopPropagation();
    e.preventDefault();
    
    console.log('🔗 Starting connection from node:', nodeId);
    
    setIsConnecting(true);
    setConnectingFrom(nodeId);
    
    const node = map.nodes.find((n) => n.id === nodeId);
    if (node) {
      setTempLineEnd({
        x: node.x + node.w / 2,
        y: node.y + node.h / 2,
      });
    }
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
    }
  };

  const handleNodeDoubleClick = (e: React.MouseEvent, nodeId: string) => {
    e.stopPropagation();
    e.preventDefault();
    console.log('✏️ Editing node:', nodeId);
    setEditingNodeId(nodeId);
  };

  const handleSaveNodeLabel = (nodeId: string, newLabel: string) => {
    console.log('💾 Saving node label:', nodeId, newLabel);
    updateNode(nodeId, { label: newLabel });
    setEditingNodeId(null);
  };

  const handleCancelEdit = () => {
    console.log('❌ Edit cancelled');
    setEditingNodeId(null);
  };

  const handleEdgeSelect = (e: React.MouseEvent, edgeId: string) => {
    e.stopPropagation();
    console.log('🔗 Edge selected:', edgeId);
    selectEdge(edgeId);
  };

  const handleEdgeDoubleClick = (e: React.MouseEvent, edgeId: string) => {
    e.stopPropagation();
    e.preventDefault();
    console.log('✏️ Editing edge:', edgeId);
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

  const handleDeleteEdge = () => {
    if (selectedEdgeId) {
      console.log('🗑️ Deleting edge:', selectedEdgeId);
      deleteEdge(selectedEdgeId);
      selectEdge(null);
    }
  };

  const handleNodeContextMenu = (e: React.MouseEvent, nodeId: string) => {
    e.preventDefault();
    e.stopPropagation();
    
    console.log('📋 Node context menu:', nodeId);
    selectNode(nodeId);

    const node = map.nodes.find((n) => n.id === nodeId);
    const menuItems: MenuItem[] = [
      {
        label: 'Edit Label',
        icon: <AppleIcon name="edit" size="medium" />,
        onClick: () => setEditingNodeId(nodeId),
        disabled: isReadOnly,
      },
      {
        label: 'Connect to...',
        icon: <AppleIcon name="connect" size="medium" />,
        onClick: () => handleStartConnection(e, nodeId),
        disabled: isReadOnly,
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
            h: 80 
          });
        },
        disabled: !node?.embedUrl || isReadOnly,
      },
      // Only show collapse/expand option for nodes with embeds
      ...(node?.embedUrl || node?.collapsed ? [
        { divider: true } as MenuItem,
        {
          label: node?.collapsed ? '📂 Expand' : '📁 Collapse',
          icon: node?.collapsed ? '📂' : '📁',
          onClick: () => {
            const newCollapsed = !node?.collapsed;
            console.log('Menu: Toggling collapse to', newCollapsed, 'for node:', nodeId);
            updateNode(nodeId, { collapsed: newCollapsed });
            
            // Log connected edges
            const connectedEdges = map.edges.filter(
              e => e.source === nodeId || e.target === nodeId
            );
            if (connectedEdges.length > 0) {
              console.log(`  → ${connectedEdges.length} connected edges will update`);
            }
          },
        }
      ] : []),
      { divider: true } as MenuItem,
      {
        label: 'Add Child Node',
        icon: <AppleIcon name="add" size="medium" />,
        onClick: () => {
          const node = map.nodes.find((n) => n.id === nodeId);
          if (node) {
            // 현재 노드 아래 오른쪽에 새 노드 생성
            const newNode: NodeType = {
              id: `n_${Date.now()}`,
              label: 'New Node',
              x: node.x + 180,
              y: node.y + 100,
              w: 150,
              h: 80,
            };
            addNode(newNode);
            
            // 자동으로 edge 연결
            const newEdge = {
              id: `e_${Date.now()}`,
              source: nodeId,
              target: newNode.id,
            };
            addEdge(newEdge);
            selectNode(newNode.id);
            console.log('➕ Added child node and edge');
          }
        },
      },
      {
        label: 'Duplicate',
        icon: <AppleIcon name="copy" size="medium" />,
        onClick: () => {
          const node = map.nodes.find((n) => n.id === nodeId);
          if (node) {
            // 겹치지 않도록 offset 추가
            const newNode: NodeType = {
              ...node,
              id: `n_${Date.now()}`,
              x: node.x + 30,
              y: node.y + 30,
            };
            addNode(newNode);
            selectNode(newNode.id);
          }
        },
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
            label: `  ${node?.textAlign === 'left' ? '✓' : '  '} Left`,
            icon: '⊣',
            onClick: () => {
              updateNode(nodeId, { textAlign: 'left' });
              console.log('📝 Text align: left');
            },
          },
          {
            label: `  ${node?.textAlign === 'center' || !node?.textAlign ? '✓' : '  '} Center`,
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
          deleteNode(nodeId);
          selectNode(null);
        },
      },
    ];

    setContextMenu({
      x: e.clientX,
      y: e.clientY,
      items: menuItems,
    });
  };

  const handleEdgeContextMenu = (e: React.MouseEvent, edgeId: string) => {
    e.preventDefault();
    e.stopPropagation();
    
    console.log('📋 Edge context menu:', edgeId);
    selectEdge(edgeId);

    const edge = map.edges.find((ed) => ed.id === edgeId);
    const currentType = edge?.edgeType || 'straight';
    
    const menuItems: MenuItem[] = [
      {
        label: edge?.label ? 'Edit Label' : 'Add Label',
        icon: '✏️',
        onClick: () => setEditingEdgeId(edgeId),
      },
      {
        label: 'Remove Label',
        icon: '🏷️',
        onClick: () => updateEdge(edgeId, { label: undefined }),
        disabled: !edge?.label,
      },
      { divider: true } as MenuItem,
      {
        label: 'Edge Type',
        icon: '〰️',
        onClick: () => {},
        submenu: [
          {
            label: `${currentType === 'straight' ? '✓' : '  '} Straight Line`,
            icon: '━',
            onClick: () => {
              updateEdge(edgeId, { edgeType: 'straight' });
              console.log('Edge type changed to: straight');
            },
          },
          {
            label: `${currentType === 'curved' ? '✓' : '  '} Curved Line`,
            icon: '⌢',
            onClick: () => {
              updateEdge(edgeId, { edgeType: 'curved' });
              console.log('Edge type changed to: curved');
            },
          },
          {
            label: `${currentType === 'bezier' ? '✓' : '  '} Bezier Curve`,
            icon: '〜',
            onClick: () => {
              updateEdge(edgeId, { edgeType: 'bezier' });
              console.log('Edge type changed to: bezier');
            },
          },
        ],
      },
      { divider: true } as MenuItem,
      {
        label: 'Delete Edge',
        icon: <AppleIcon name="delete" size="medium" />,
        onClick: () => {
          deleteEdge(edgeId);
          selectEdge(null);
        },
      },
    ];

    setContextMenu({
      x: e.clientX,
      y: e.clientY,
      items: menuItems,
    });
  };

  const handleCanvasContextMenu = (e: React.MouseEvent) => {
    e.preventDefault();
    
    console.log('📋 Canvas context menu');
    
    const svgCoords = screenToSVG(e.clientX, e.clientY);
    
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

  // Add global event listeners
  useEffect(() => {
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
      if (e.key === 'Escape') {
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
    };

    if (isDragging || isResizing || isPanning) {
      document.addEventListener('mouseup', handleGlobalMouseUp);
    }
    
    document.addEventListener('keydown', handleKeyDown);
    
    return () => {
      document.removeEventListener('mouseup', handleGlobalMouseUp);
      document.removeEventListener('keydown', handleKeyDown);
    };
  }, [isDragging, isResizing, isConnecting, isPanning]);

  return (
      <div className="mindmap-canvas-container">
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
          <div className="refresh-overlay">
            <div className="refresh-progress-container">
              <div className="refresh-progress-header">
                <span className="refresh-icon">🔄</span>
                <span className="refresh-title">{t('editor.refreshing')}</span>
              </div>
              <div className="refresh-progress-bar">
                <div 
                  className="refresh-progress-fill" 
                  style={{ width: `${refreshProgress}%` }}
                />
              </div>
              <div className="refresh-progress-text">
                {Math.round(refreshProgress)}%
              </div>
            </div>
          </div>
        )}
        <div className="canvas-toolbar">
        <button onClick={handleAddNode} className="button" disabled={isReadOnly}>
          <AppleIcon name="add" size="medium" />
          Add Node
        </button>
        {selectedNodeId && !selectedEdgeId && (
          <>
            <button
              onClick={(e) => {
                e.stopPropagation();
                setEditingNodeId(selectedNodeId);
              }}
              className="button"
              disabled={isConnecting}
            >
              <AppleIcon name="edit" size="medium" />
              Edit
            </button>
            <button
              onClick={(e) => {
                e.stopPropagation();
                setEmbedTargetNodeId(selectedNodeId);
                setShowEmbedDialog(true);
              }}
              className="button"
            >
              {(() => {
                const node = map.nodes.find((n) => n.id === selectedNodeId);
                if (node?.embedUrl) {
                  return node.embedType === 'youtube' ? '🎥 Change' : '🌐 Change';
                }
                return '➕ Embed';
              })()}
            </button>
            <button
              onClick={(e) => {
                e.stopPropagation();
                if (isConnecting) {
                  // Cancel connection
                  setIsConnecting(false);
                  setConnectingFrom(null);
                  console.log('❌ Connection cancelled');
                } else {
                  handleStartConnection(e, selectedNodeId);
                }
              }}
              className={`button ${isConnecting ? 'button-secondary' : ''}`}
              disabled={!!editingNodeId || isReadOnly}
            >
              {isConnecting && connectingFrom === selectedNodeId ? (
                <>
                  <AppleIcon name="close" size="medium" />
                  Cancel Connection
                </>
              ) : (
                <>
                  <AppleIcon name="connect" size="medium" />
                  Connect
                </>
              )}
            </button>
            <button 
              onClick={handleDeleteNode} 
              className="button button-secondary"
              disabled={isConnecting || !!editingNodeId || isReadOnly}
            >
              <AppleIcon name="delete" size="medium" />
              Delete
            </button>
          </>
        )}

        {selectedEdgeId && !selectedNodeId && (
          <>
            <button
              onClick={(e) => {
                e.stopPropagation();
                setEditingEdgeId(selectedEdgeId);
              }}
              className="button"
              disabled={isReadOnly}
            >
              <AppleIcon name="edit" size="medium" />
              Edit Label
            </button>
            <button 
              onClick={handleDeleteEdge} 
              className="button button-secondary"
              disabled={isReadOnly}
            >
              <AppleIcon name="delete" size="medium" />
              Delete Edge
            </button>
          </>
        )}
        <div className="zoom-controls">
          <button onClick={handleZoomOut} className="button" title="Zoom Out (Ctrl + Scroll)">
            <AppleIcon name="zoom-out" size="medium" />
          </button>
          <span className="zoom-level">{(zoom * 100).toFixed(0)}%</span>
          <button onClick={handleZoomIn} className="button" title="Zoom In (Ctrl + Scroll)">
            <AppleIcon name="zoom-in" size="medium" />
          </button>
          <button onClick={handleZoomReset} className="button" title="Reset Zoom (100%)">
            <AppleIcon name="zoom-reset" size="medium" />
          </button>
        </div>
        {/* Canvas Status Info */}
        {(isPanning || isConnecting || isResizing || editingNodeId || editingEdgeId) && (
          <div className="canvas-status">
            {isPanning && (
              <span style={{ color: 'var(--accent-primary)', fontWeight: 600 }}>
                🖐️ Panning canvas...
              </span>
            )}
            {isConnecting && (
              <span style={{ color: 'var(--semantic-success)', fontWeight: 600 }}>
                🔗 Connecting... Click target node
              </span>
            )}
            {isResizing && (
              <span style={{ color: 'var(--viz-decision)', fontWeight: 600 }}>
                📐 Resizing...
              </span>
            )}
            {editingNodeId && (
              <span style={{ color: 'var(--semantic-warning)', fontWeight: 600 }}>
                ✏️ Editing node...
              </span>
            )}
            {editingEdgeId && (
              <span style={{ color: 'var(--semantic-warning)', fontWeight: 600 }}>
                ✏️ Editing edge label...
              </span>
            )}
          </div>
        )}
        {isReadOnly ? (
          <button 
            className="button button-readonly" 
            onClick={onRefreshToLatest}
            disabled={isRefreshing}
            title={t('editor.refreshToLatest')}
          >
            {isRefreshing ? (
              <span className="refresh-indicator">
                <AppleIcon name="loading" size="medium" className="refresh-spinner" />
                <span className="refresh-text">{t('editor.refreshing')}</span>
              </span>
            ) : (
              <>
                <AppleIcon name="refresh" size="medium" />
                {t('editor.refreshToLatest')}
              </>
            )}
          </button>
        ) : (
          <button 
            onClick={handleSave} 
            className="button button-save" 
            disabled={saveMutation.isPending}
            title="Save mindmap"
          >
            <AppleIcon name="save" size="medium" />
            {saveMutation.isPending ? t('editor.saving') : t('editor.save')}
          </button>
        )}
        <button 
          onClick={handleScreenshot} 
          className="button button-screenshot" 
          title="Save as image (PNG)"
        >
          <AppleIcon name="screenshot" size="medium" />
          Screenshot
        </button>
      </div>

      <svg
        ref={svgRef}
        className={`mindmap-canvas ${isPanning ? 'panning' : ''}`}
        viewBox={`${viewBox.x} ${viewBox.y} ${viewBox.width} ${viewBox.height}`}
        onClick={handleCanvasClick}
        onMouseDown={handleCanvasMouseDown}
        onMouseMove={handleMouseMove}
        onMouseUp={handleMouseUp}
        onContextMenu={handleCanvasContextMenu}
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

        {/* Edges */}
        {map.edges.map((edge) => {
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
          />
        ))}

        {/* Node Editor (when editing) */}
        {editingNodeId && (() => {
          const editingNode = map.nodes.find((n) => n.id === editingNodeId);
          if (!editingNode) return null;
          
          return (
            <NodeEditor
              key={`editor-${editingNodeId}`}
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
          
          const edgeType = editingEdge.edgeType || 'straight';
          const labelPos = getLabelPosition(x1, y1, x2, y2, edgeType);
          
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

    </div>
  );
}

