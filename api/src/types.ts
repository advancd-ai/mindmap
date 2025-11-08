/**
 * Type definitions for the API
 */

export interface Env {
  // Environment variables
  PORT?: string;
  NODE_ENV?: string;
  CORS_ORIGIN?: string;
  DEV_MODE?: string;

  // Google OAuth credentials
  GOOGLE_CLIENT_ID: string;
  GOOGLE_CLIENT_SECRET: string;
  GOOGLE_REDIRECT_URI: string;
  FRONTEND_URL?: string;

  // Session management
  SESSION_SECRET?: string;

  // Redis
  REDIS_URL?: string;
  REDIS_PASSWORD?: string;

  // GitHub for data storage
  GITHUB_TOKEN?: string;
  GITHUB_ORG?: string;  // Organization name (e.g., "open-mindmap")
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

export interface Map {
  id: string;
  title: string;
  tags?: string[];
  nodes: Node[];
  edges: Edge[];
  viewState?: ViewState;
  updatedAt: string;
  version: number;
}

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
  meta?: Record<string, any>;
}

export type EdgeType = 'straight' | 'curved' | 'bezier';

export type EdgeCategory = 'branch' | 'relationship' | 'summary' | 'boundary';
export type EdgeRouting = 'organic' | 'orthogonal';
export type EdgeMarker = 'none' | 'arrow' | 'circle';

export interface EdgeStyle {
  strokeColor?: string;
  strokeWidth?: number;
  dashPattern?: number[];
  markerStart?: EdgeMarker;
  markerEnd?: EdgeMarker;
}

export interface EdgeControlPoint {
  x: number;
  y: number;
}

export type EdgeLabelPosition = 'source' | 'middle' | 'target';

export interface EdgeLabelOffset {
  x: number;
  y: number;
}

export interface EdgeDecorator {
  type: 'icon' | 'highlight';
  position?: number; // 0-1 along the edge path
  icon?: string;
  label?: string;
  color?: string;
  length?: number; // for highlight segments
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

export interface Edge {
  id: string;
  source: string;
  target: string;
  label?: string;
  labelPosition?: EdgeLabelPosition;
  labelOffset?: EdgeLabelOffset;
  /**
   * @deprecated Use routing + controlPoints instead. Left for backward compatibility.
   */
  edgeType?: EdgeType;
  category?: EdgeCategory;
  routing?: EdgeRouting;
  controlPoints?: EdgeControlPoint[];
  style?: EdgeStyle;
  summary?: SummaryEdgeData;
  boundary?: BoundaryEdgeData;
  decorators?: EdgeDecorator[];
  meta?: Record<string, any>;
}

export interface IndexItem {
  id: string;
  title: string;
  tags: string[];
  nodeCount: number;
  edgeCount: number;
  updatedAt: string;
  version: number;
  shareToken?: string;
  shareEnabled?: boolean;
}

export interface Index {
  generatedAt: string;
  items: IndexItem[];
}

export interface User {
  userId: string;
  email: string;
  name?: string;
  picture?: string;
  org?: string;
  repo?: string;
}

export interface ApiResponse<T = any> {
  ok: boolean;
  data?: T;
  error?: {
    code: string;
    message: string;
    details?: any;
  };
  meta?: {
    requestId: string;
    elapsedMs: number;
  };
}

export interface PRTransaction {
  prNumber?: number; // Deprecated: No longer used with branch-based storage
  branch: string;
  mapId?: string;
  branchDeleted?: boolean;
}

export interface ShareInfo {
  mapId: string;
  userId: string;
  userEmail: string;
  token: string;
  enabled: boolean;
  expiresAt?: string;
  allowEmbed: boolean;
  passwordHash?: string;
  viewCount: number;
  lastViewedAt?: string;
  createdAt: string;
}

export interface ShareConfig {
  enabled?: boolean;
  expiresAt?: string;
  allowEmbed?: boolean;
  regenerateToken?: boolean;
  password?: string;
}

