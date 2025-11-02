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

export interface Edge {
  id: string;
  source: string;
  target: string;
  label?: string;
  edgeType?: EdgeType;
  meta?: Record<string, any>;
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
}

interface MindMapState {
  map: MindMap | null;
  selectedNodeId: string | null;
  selectedEdgeId: string | null;
  isDirty: boolean;
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
  getChangeLog: () => string[];
  clearChangeLog: () => void;
  reset: () => void;
}

export const useMindMapStore = create<MindMapState>((set, get) => ({
  map: null,
  selectedNodeId: null,
  selectedEdgeId: null,
  isDirty: false,
  changeLog: [],

  setMap: (map) => {
    console.log('📝 Setting map in store:', map);
    set({ map, isDirty: false, changeLog: [] });
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
              edges: state.map.edges.filter((e) => e.source !== id && e.target !== id),
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
      
      return {
        map: state.map ? { ...state.map, edges: [...state.map.edges, edge] } : null,
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
              edges: state.map.edges.map((e) => (e.id === id ? { ...e, ...updates } : e)),
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

  getChangeLog: () => get().changeLog,

  clearChangeLog: () => set({ changeLog: [] }),

  reset: () => set({ map: null, selectedNodeId: null, selectedEdgeId: null, isDirty: false, changeLog: [] }),
}));

