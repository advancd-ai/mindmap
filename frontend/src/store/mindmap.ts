/**
 * Mindmap editor store using Zustand
 */

import { create } from 'zustand';

export type NodeShapeType = 
  | 'rect'      // 사각형 - 기본 개념
  | 'circle'    // 원형
  | 'diamond'   // 마름모 - 결정 단계/분기점
  | 'hex'       // 육각형
  | 'cloud'     // 구름형
  | 'capsule'   // 캡슐형 - 진행 상태
  | 'file'      // 파일형 - 참고자료/첨부 문서
  | 'card';     // 카드형

export type TextAlignHorizontal = 'left' | 'center' | 'right';
export type TextAlignVertical = 'top' | 'middle' | 'bottom';

export interface Node {
  id: string;
  label: string;
  x: number;
  y: number;
  w: number;
  h: number;
  nodeType?: NodeShapeType;
  contentType?: 'markdown' | 'richeditor';  // 콘텐츠 타입 (기본: 'markdown')
  textAlign?: TextAlignHorizontal;
  textVerticalAlign?: TextAlignVertical;
  collapsed?: boolean;
  embedUrl?: string;
  embedType?: 'youtube' | 'webpage' | 'image' | 'pdf';
  backgroundColor?: string;
  meta?: Record<string, any>;
}

export type EdgeType = 'straight' | 'curved' | 'bezier';

export type EdgeCategory = 'branch' | 'relationship' | 'summary' | 'boundary';
export const EDGE_ROUTING_VALUES = [
  'organic',
  'orthogonal',
  'straight',
  'radial',
  'spline',
  'bundle',
  'hierarchical',
] as const;

export type EdgeRouting = (typeof EDGE_ROUTING_VALUES)[number];
export type EdgeMarker = 'none' | 'arrow' | 'circle';

export interface EdgeStyle {
  strokeColor?: string;
  strokeWidth?: number;
  dashPattern?: number[];
  markerStart?: EdgeMarker;
  markerEnd?: EdgeMarker;
}

export type EdgeLabelPosition = 'source' | 'middle' | 'target';

export interface EdgeLabelOffset {
  x: number;
  y: number;
}

export interface EdgeControlPoint {
  x: number;
  y: number;
}

export interface EdgeDecorator {
  type: 'icon' | 'highlight';
  position?: number;
  icon?: string;
  label?: string;
  color?: string;
  length?: number;
}

export interface SummaryEdgeData {
  nodeIds: string[];
  title?: string;
  padding?: number;
  height?: number;
  collapsed?: boolean;
}

export interface BoundaryEdgeData {
  nodeIds: string[];
  title?: string;
  padding?: number;
  theme?: 'default' | 'info' | 'success' | 'warning';
  shape?: 'rounded' | 'organic';
}

const DEFAULT_BRANCH_STYLE: Readonly<EdgeStyle> = Object.freeze({
  strokeColor: '#94a3b8',
  strokeWidth: 1.5,
  markerStart: 'none',
  markerEnd: 'arrow',
});

const DEFAULT_RELATIONSHIP_STYLE: Readonly<EdgeStyle> = Object.freeze({
  strokeColor: '#f97316',
  strokeWidth: 1.75,
  dashPattern: [8, 4],
  markerStart: 'none',
  markerEnd: 'arrow',
});

const DEFAULT_SUMMARY_STYLE: Readonly<EdgeStyle> = Object.freeze({
  strokeColor: '#60a5fa',
  strokeWidth: 2,
  markerStart: 'none',
  markerEnd: 'none',
});

const DEFAULT_BOUNDARY_STYLE: Readonly<EdgeStyle> = Object.freeze({
  strokeColor: '#3b82f6',
  strokeWidth: 1.5,
  markerStart: 'none',
  markerEnd: 'none',
});

const EDGE_ID_PATTERN = /^e_[A-Za-z0-9_-]{4,}$/;

const createEdgeId = (category: EdgeCategory) => {
  const prefix = category ? category.replace(/[^A-Za-z0-9]+/g, '') : 'edge';
  const random = Math.random().toString(36).slice(2, 8);
  const timestamp = Date.now().toString(36);
  return `e_${prefix}_${timestamp}_${random}`;
};

const cloneDashPattern = (pattern?: number[]) =>
  pattern ? [...pattern] : undefined;

const cloneSummary = (summary?: SummaryEdgeData): SummaryEdgeData | undefined =>
  summary
    ? {
        nodeIds: [...summary.nodeIds],
        title: summary.title,
        padding: summary.padding,
        height: summary.height,
        collapsed: summary.collapsed ?? false,
      }
    : undefined;

const cloneBoundary = (boundary?: BoundaryEdgeData): BoundaryEdgeData | undefined =>
  boundary
    ? {
        nodeIds: [...boundary.nodeIds],
        title: boundary.title,
        padding: boundary.padding,
        theme: boundary.theme ?? 'default',
        shape: boundary.shape ?? 'rounded',
      }
    : undefined;

const DEFAULT_EDGE_ROUTING: EdgeRouting = 'straight';

const normalizeRouting = (value: unknown, category: EdgeCategory): EdgeRouting => {
  if (category === 'boundary' || category === 'summary') {
    return 'organic';
  }

  if (typeof value === 'string') {
    const lower = value.toLowerCase();
    const matched = EDGE_ROUTING_VALUES.find((option) => option === lower);
    if (matched) {
      return matched;
    }
  }

  return DEFAULT_EDGE_ROUTING;
};

const normalizeAnchor = (value: number | undefined): number | undefined =>
  typeof value === 'number' && Number.isFinite(value) && value >= 0 && value < 12
    ? Math.floor(value)
    : undefined;

const normalizeEdge = (edge: Edge): Edge => {
  const category: EdgeCategory = edge.category ?? 'branch';
  let normalizedId = EDGE_ID_PATTERN.test(edge.id)
    ? edge.id
    : createEdgeId(category);
  const baseStyle =
    category === 'relationship'
      ? DEFAULT_RELATIONSHIP_STYLE
      : category === 'summary'
      ? DEFAULT_SUMMARY_STYLE
      : category === 'boundary'
      ? DEFAULT_BOUNDARY_STYLE
      : DEFAULT_BRANCH_STYLE;

  const style = edge.style ?? {};
  const routing = normalizeRouting(edge.routing, category);
  const labelPosition: EdgeLabelPosition =
    category === 'boundary' ? 'middle' : edge.labelPosition ?? 'middle';
  const labelOffset: EdgeLabelOffset = edge.labelOffset
    ? { ...edge.labelOffset }
    : { x: 0, y: 0 };

  return {
    ...edge,
    id: normalizedId,
    category,
    routing,
    labelPosition,
    labelOffset,
    sourceAnchor: normalizeAnchor(edge.sourceAnchor),
    targetAnchor: normalizeAnchor(edge.targetAnchor),
    style: {
      strokeColor: style.strokeColor ?? baseStyle.strokeColor,
      strokeWidth: style.strokeWidth ?? baseStyle.strokeWidth,
      dashPattern: cloneDashPattern(
        style.dashPattern ?? baseStyle.dashPattern
      ),
      markerStart: style.markerStart ?? baseStyle.markerStart ?? 'none',
      markerEnd: style.markerEnd ?? baseStyle.markerEnd ?? 'arrow',
    },
    summary: category === 'summary' ? cloneSummary(edge.summary) : undefined,
    boundary: category === 'boundary' ? cloneBoundary(edge.boundary) : undefined,
    decorators: edge.decorators ? edge.decorators.map((decorator) => ({ ...decorator })) : undefined,
  };
};

export interface Edge {
  id: string;
  source: string;
  target: string;
  label?: string;
  labelPosition?: EdgeLabelPosition;
  labelOffset?: EdgeLabelOffset;
  edgeType?: EdgeType;
  category?: EdgeCategory;
  routing?: EdgeRouting;
  controlPoints?: EdgeControlPoint[];
  style?: EdgeStyle;
  summary?: SummaryEdgeData;
  boundary?: BoundaryEdgeData;
  decorators?: EdgeDecorator[];
  meta?: Record<string, any>;
  sourceAnchor?: number;
  targetAnchor?: number;
}

export interface ViewState {
  zoom: number;
  viewBox: {
    x: number;
    y: number;
    width: number;
    height: number;
  };
}

export interface MindMap {
  id: string;
  title: string;
  tags?: string[];
  nodes: Node[];
  edges: Edge[];
  viewState?: ViewState;
  updatedAt: string;
  version: number;
  shareEnabled?: boolean;
  shareToken?: string;
}

interface MindMapState {
  map: MindMap | null;
  selectedNodeId: string | null;
  selectedEdgeId: string | null;
  isDirty: boolean;
  isSaving: boolean;
  changeLog: string[];
  
  // Actions
  setMap: (map: MindMap) => void;
  updateTitle: (title: string) => void;
  addNode: (node: Node) => void;
  updateNode: (id: string, updates: Partial<Node>) => void;
  deleteNode: (id: string) => void;
  addEdge: (edge: Edge) => void;
  updateEdge: (id: string, updates: Partial<Edge>) => void;
  deleteEdge: (id: string) => void;
  selectNode: (id: string | null) => void;
  selectEdge: (id: string | null) => void;
  updateViewState: (viewState: ViewState) => void;
  setDirty: (dirty: boolean) => void;
  setIsSaving: (saving: boolean) => void;
  getChangeLog: () => string[];
  clearChangeLog: () => void;
  reset: () => void;
}

export const useMindMapStore = create<MindMapState>((set, get) => ({
  map: null,
  selectedNodeId: null,
  selectedEdgeId: null,
  isDirty: false,
  isSaving: false,
  changeLog: [],

  setMap: (map) => {
    console.log('📝 Setting map in store:', map);

    const normalizedEdges = (map.edges || []).map(normalizeEdge);
    const normalizedMap: MindMap = {
      ...map,
      edges: normalizedEdges,
    };

    set({ map: normalizedMap, isDirty: false, changeLog: [] });
  },

  updateTitle: (title) =>
    set((state) => ({
      map: state.map ? { ...state.map, title } : null,
      isDirty: true,
      changeLog: [...state.changeLog, `📝 Title changed to "${title}"`],
    })),

  addNode: (node) =>
    set((state) => ({
      map: state.map ? { ...state.map, nodes: [...state.map.nodes, node] } : null,
      isDirty: true,
      changeLog: [...state.changeLog, `➕ Node added: "${node.label}"`],
    })),

  updateNode: (id, updates) =>
    set((state) => {
      const node = state.map?.nodes.find((n) => n.id === id);
      const changes: string[] = [];
      
      if (updates.label && node && updates.label !== node.label) {
        changes.push(`✏️ Node "${node.label}" → "${updates.label}"`);
      } else if (updates.backgroundColor && node) {
        changes.push(`🎨 Node "${node.label}" color changed`);
      } else if (updates.nodeType && node) {
        changes.push(`◇ Node "${node.label}" shape changed`);
      } else if (updates.embedUrl && node) {
        const embedType = updates.embedType || 'webpage';
        changes.push(`🌐 Node "${node.label}" embed added: ${embedType}`);
      } else if (node && (updates.x !== undefined || updates.y !== undefined || updates.w !== undefined || updates.h !== undefined)) {
        // Skip position/size changes (too noisy)
      } else if (node && Object.keys(updates).length > 0) {
        changes.push(`📝 Node "${node.label}" updated`);
      }

      return {
        map: state.map
          ? {
              ...state.map,
              nodes: state.map.nodes.map((n) => (n.id === id ? { ...n, ...updates } : n)),
            }
          : null,
        isDirty: true,
        changeLog: changes.length > 0 ? [...state.changeLog, ...changes] : state.changeLog,
      };
    }),

  deleteNode: (id) =>
    set((state) => {
      const node = state.map?.nodes.find((n) => n.id === id);
      return {
        map: state.map
          ? {
              ...state.map,
              nodes: state.map.nodes.filter((n) => n.id !== id),
              edges: state.map.edges.filter((e) => {
                const summaryContains = e.summary?.nodeIds?.includes(id) ?? false;
                const boundaryContains = e.boundary?.nodeIds?.includes(id) ?? false;
                return e.source !== id && e.target !== id && !summaryContains && !boundaryContains;
              }),
            }
          : null,
        isDirty: true,
        changeLog: node ? [...state.changeLog, `🗑️ Node deleted: "${node.label}"`] : state.changeLog,
      };
    }),

  addEdge: (edge) =>
    set((state) => {
      const sourceNode = state.map?.nodes.find((n) => n.id === edge.source);
      const targetNode = state.map?.nodes.find((n) => n.id === edge.target);
      const edgeDesc = sourceNode && targetNode 
        ? `"${sourceNode.label}" → "${targetNode.label}"`
        : 'New edge';
      const normalizedEdge = normalizeEdge(edge);
      
      return {
        map: state.map ? { ...state.map, edges: [...state.map.edges, normalizedEdge] } : null,
        isDirty: true,
        changeLog: [...state.changeLog, `🔗 Edge added: ${edgeDesc}`],
      };
    }),

  updateEdge: (id, updates) =>
    set((state) => {
      const edge = state.map?.edges.find((e) => e.id === id);
      const changes: string[] = [];
      
      if (updates.label !== undefined && edge) {
        const sourceNode = state.map?.nodes.find((n) => n.id === edge.source);
        const targetNode = state.map?.nodes.find((n) => n.id === edge.target);
        const edgeDesc = sourceNode && targetNode 
          ? `"${sourceNode.label}" → "${targetNode.label}"`
          : 'Edge';
        
        if (updates.label && !edge.label) {
          changes.push(`🏷️ Edge label added: ${edgeDesc} = "${updates.label}"`);
        } else if (updates.label && edge.label) {
          changes.push(`✏️ Edge label: ${edgeDesc} → "${updates.label}"`);
        } else if (!updates.label && edge.label) {
          changes.push(`🗑️ Edge label removed: ${edgeDesc}`);
        }
      } else if (updates.edgeType && edge) {
        changes.push(`📐 Edge type changed to ${updates.edgeType}`);
      }

      return {
        map: state.map
          ? {
              ...state.map,
              edges: state.map.edges.map((e) => {
                if (e.id !== id) return e;

                const mergedStyle =
                  updates.style || e.style
                    ? {
                        strokeColor: updates.style?.strokeColor ?? e.style?.strokeColor,
                        strokeWidth: updates.style?.strokeWidth ?? e.style?.strokeWidth,
                        dashPattern: updates.style?.dashPattern ?? e.style?.dashPattern,
                        markerStart: updates.style?.markerStart ?? e.style?.markerStart,
                        markerEnd: updates.style?.markerEnd ?? e.style?.markerEnd,
                      }
                    : undefined;

                const mergedSummary =
                  updates.summary || e.summary
                    ? {
                        ...(e.summary ?? { nodeIds: [] }),
                        ...(updates.summary ?? {}),
                        nodeIds: updates.summary?.nodeIds
                          ? [...updates.summary.nodeIds]
                          : e.summary?.nodeIds
                          ? [...e.summary.nodeIds]
                          : [],
                      }
                    : undefined;

                const mergedBoundary =
                  updates.boundary || e.boundary
                    ? {
                        ...(e.boundary ?? { nodeIds: [] }),
                        ...(updates.boundary ?? {}),
                        nodeIds: updates.boundary?.nodeIds
                          ? [...updates.boundary.nodeIds]
                          : e.boundary?.nodeIds
                          ? [...e.boundary.nodeIds]
                          : [],
                      }
                    : undefined;

                const mergedDecorators =
                  updates.decorators !== undefined
                    ? updates.decorators?.map((decorator) => ({ ...decorator }))
                    : e.decorators
                    ? e.decorators.map((decorator) => ({ ...decorator }))
                    : undefined;

                const mergedEdge: Edge = {
                  ...e,
                  ...updates,
                  style: mergedStyle,
                  summary: mergedSummary,
                  boundary: mergedBoundary,
                  decorators: mergedDecorators,
                  sourceAnchor: updates.sourceAnchor !== undefined ? normalizeAnchor(updates.sourceAnchor) : e.sourceAnchor,
                  targetAnchor: updates.targetAnchor !== undefined ? normalizeAnchor(updates.targetAnchor) : e.targetAnchor,
                };

                return normalizeEdge(mergedEdge);
              }),
            }
          : null,
        isDirty: true,
        changeLog: changes.length > 0 ? [...state.changeLog, ...changes] : state.changeLog,
      };
    }),

  deleteEdge: (id) =>
    set((state) => {
      const edge = state.map?.edges.find((e) => e.id === id);
      const sourceNode = state.map?.nodes.find((n) => n.id === edge?.source);
      const targetNode = state.map?.nodes.find((n) => n.id === edge?.target);
      const edgeDesc = sourceNode && targetNode 
        ? `"${sourceNode.label}" → "${targetNode.label}"`
        : 'Edge';
      
      return {
        map: state.map
          ? { ...state.map, edges: state.map.edges.filter((e) => e.id !== id) }
          : null,
        isDirty: true,
        changeLog: [...state.changeLog, `🗑️ Edge deleted: ${edgeDesc}`],
      };
    }),

  selectNode: (id) => set({ selectedNodeId: id, selectedEdgeId: null }),

  selectEdge: (id) => set({ selectedEdgeId: id, selectedNodeId: null }),

  updateViewState: (viewState) =>
    set((state) => ({
      map: state.map ? { ...state.map, viewState } : null,
      isDirty: true,
      changeLog: [...state.changeLog, `🔍 View state updated: zoom ${(viewState.zoom * 100).toFixed(0)}%`],
    })),

  setDirty: (dirty) => set({ isDirty: dirty }),
  setIsSaving: (saving) => set({ isSaving: saving }),

  getChangeLog: () => get().changeLog,

  clearChangeLog: () => set({ changeLog: [] }),

  reset: () => set({ map: null, selectedNodeId: null, selectedEdgeId: null, isDirty: false, changeLog: [] }),
}));

