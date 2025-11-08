/**
 * Node Component - Individual mindmap node
 */

import { useEffect, useState } from 'react';
import { type Node as NodeType } from '../store/mindmap';
import ConnectionHandles from './ConnectionHandles';
import NodeAnchors from './NodeAnchors';
import ResizeHandles, { type ResizeDirection } from './ResizeHandles';
import EmbedFallback from './EmbedFallback';
import NodeTypeIcon from './NodeTypeIcon';
import CollapseButton from './CollapseButton';
import NodeShape from './NodeShape';
import ImageDisplay from './ImageDisplay';
import PdfDisplay from './PdfDisplay';
import MarkdownRenderer from './MarkdownRenderer';
import RichEditorRenderer from './RichEditorRenderer';
import AppleIcon from './AppleIcon';
import { getNodeDisplayDimensions, getCollapsedTitle } from '../utils/nodeHelpers';
import './Node.css';
import './NodeShape.css';

interface NodeProps {
  node: NodeType;
  isSelected: boolean;
  isDragging: boolean;
  isConnecting: boolean;
  isConnectionSource: boolean;
  onSelect: (e: React.MouseEvent) => void;
  onDragStart: (e: React.MouseEvent) => void;
  onStartConnection: (e: React.MouseEvent) => void;
  onDoubleClick?: (e: React.MouseEvent) => void;
  onContextMenu?: (e: React.MouseEvent) => void;
  onResizeStart?: (e: React.MouseEvent, direction: ResizeDirection) => void;
  onToggleCollapse?: (e: React.MouseEvent) => void;
  onSwitchToRichEditor?: (nodeId: string) => void;
  onSwitchToMarkdown?: (nodeId: string) => void;
  onEditClick?: (nodeId: string) => void;
  showEditButton?: boolean; // 노드 편집 버튼 표시 여부
  isEditing?: boolean; // 현재 편집 중인지
  editorType?: 'text' | 'richeditor' | 'markdown'; // 편집 중인 에디터 타입
  showAnchors?: boolean;
  anchorInteractive?: boolean;
  activeAnchor?: number | null;
  hoveredAnchor?: number | null;
  onAnchorClick?: (anchorIndex: number) => void;
  onAnchorEnter?: (anchorIndex: number) => void;
  onAnchorLeave?: () => void;
}

// Helper function to get YouTube video ID
function getYoutubeVideoId(url: string): string | null {
  const match = url.match(/(?:youtube\.com\/watch\?v=|youtu\.be\/)([^&\s]+)/);
  return match ? match[1] : null;
}

export default function Node({
  node,
  isSelected,
  isDragging,
  isConnecting,
  isConnectionSource,
  onSelect,
  onDragStart,
  onStartConnection,
  onDoubleClick,
  onContextMenu,
  onResizeStart,
  onToggleCollapse,
  onSwitchToRichEditor,
  onSwitchToMarkdown,
  onEditClick,
  showEditButton = true, // 기본값: true (기존 동작 유지)
  isEditing = false,
  editorType,
  showAnchors = false,
  anchorInteractive = false,
  activeAnchor = null,
  hoveredAnchor = null,
  onAnchorClick,
  onAnchorEnter,
  onAnchorLeave,
}: NodeProps) {
  const [showFallback, setShowFallback] = useState(false);

  useEffect(() => {
    setShowFallback(false);
  }, [node.id, node.embedUrl]);
  
  // Check if node is in text mode (no contentType or contentType is not 'markdown'/'richeditor')
  const isTextMode = !node.contentType || (node.contentType !== 'markdown' && node.contentType !== 'richeditor');

  // Calculate display dimensions
  const { w: displayWidth, h: displayHeight } = getNodeDisplayDimensions(node);

  const getCursor = () => {
    if (isConnecting) return 'crosshair';
    if (isDragging) return 'grabbing';
    return 'grab';
  };

  const getStroke = () => {
    if (isConnectionSource) return '#10b981'; // Green when connecting from this node
    if (isSelected) return '#2563eb'; // Blue when selected
    return '#d1d5db'; // Gray default
  };

  return (
    <g>
      {/* Type Icon - top left (outside main group for better event handling) */}
      <NodeTypeIcon node={node} x={node.x} y={node.y} />

      {/* Main node group */}
      <g
        className={`node ${isSelected ? 'selected' : ''} ${isDragging ? 'dragging' : ''} ${
          isConnectionSource ? 'connecting' : ''
        } ${node.collapsed ? 'collapsed' : ''}`}
        data-shape={node.nodeType || 'rect'}
        onClick={(e) => {
          if (e.detail === 1) {
            e.stopPropagation();
            if (!isConnecting) {
              onSelect(e);
            }
          }
        }}
        onDoubleClick={(e) => {
          e.stopPropagation();
          e.preventDefault();
          if (import.meta.env.DEV) {
            console.log('🖱️ Node onDoubleClick event:', node.id, {
              target: e.target,
              currentTarget: e.currentTarget,
              detail: e.detail,
              timestamp: Date.now()
            });
          }
          if (onDoubleClick) {
            onDoubleClick(e);
          } else {
            if (import.meta.env.DEV) {
              console.warn('⚠️ onDoubleClick handler not provided for node:', node.id);
            }
          }
        }}
        onContextMenu={(e) => {
          e.preventDefault();
          e.stopPropagation();
          if (onContextMenu) {
            onContextMenu(e);
          }
        }}
        onMouseDown={(e) => {
          // Don't start drag if clicking on special elements
          const target = e.target as SVGElement;
          const classList = target.classList;
          
          if (
            classList.contains('connection-handle') ||
            classList.contains('collapse-button') ||
            classList.contains('collapse-button-bg') ||
            classList.contains('resize-handle')
          ) {
            console.log('⚠️ Skipping drag - clicked on interactive element');
            e.stopPropagation();
            return;
          }
          
          if (!isConnecting) {
            onDragStart(e);
          }
        }}
        style={{ cursor: getCursor() }}
      >
        {/* Node shape - 타입에 따른 형태 */}
        <NodeShape
          x={node.x}
          y={node.y}
          w={displayWidth}
          h={displayHeight}
          nodeType={node.nodeType}
          fill={node.backgroundColor || (isSelected ? '#dbeafe' : '#ffffff')}
          stroke={getStroke()}
          strokeWidth={isSelected || isConnectionSource ? 2.5 : 2}
        />

        {/* Editor Type Label - 인라인 편집 중일 때 표시 */}
        {isEditing && !node.collapsed && editorType && (
          <foreignObject
            x={node.x}
            y={node.y + 8}
            width={displayWidth}
            height={28}
            pointerEvents="none"
            className="node-editor-type-label"
          >
            <div
              style={{
                width: '100%',
                height: '100%',
                display: 'flex',
                alignItems: 'center',
                justifyContent: 'flex-start',
                padding: '4px 8px',
                background: 'rgba(37, 99, 235, 0.1)',
                borderBottom: '1px solid rgba(37, 99, 235, 0.2)',
              }}
              title={
                editorType === 'markdown' ? 'Markdown Editor' :
                editorType === 'richeditor' ? 'Rich Editor' :
                editorType === 'text' ? 'Text Editor' : ''
              }
            >
              <span
                style={{
                  fontSize: '11px',
                  fontWeight: '600',
                  color: '#2563eb',
                  display: 'flex',
                  alignItems: 'center',
                  gap: '4px',
                }}
              >
                {editorType === 'markdown' && '📝'}
                {editorType === 'richeditor' && '✨'}
                {editorType === 'text' && '📄'}
                <span>
                  {editorType === 'markdown' && 'Markdown'}
                  {editorType === 'richeditor' && 'Rich Editor'}
                  {editorType === 'text' && 'Text'}
                </span>
              </span>
            </div>
          </foreignObject>
        )}

        {/* Edit Button - Overlay 구조: 노드가 선택되었을 때, showEditButton이 true일 때, 인라인 편집 중이 아닐 때 */}
        {isSelected && !node.collapsed && onEditClick && showEditButton && !isEditing && (
          <foreignObject
            x={node.x + displayWidth - 28}
            y={node.y + 6}
            width={24}
            height={24}
            pointerEvents="all"
            className="node-edit-button-container"
          >
            <button
              onClick={(e) => {
                e.stopPropagation();
                e.preventDefault();
                onEditClick(node.id);
              }}
              className="node-edit-button node-edit-button-overlay"
              onMouseDown={(e) => e.stopPropagation()}
              title="Edit (모달 편집)"
            >
              <AppleIcon name="edit" size="small" />
            </button>
          </foreignObject>
        )}

        {/* Node header - Editor mode switcher (only in text mode) */}
        {isTextMode && isSelected && !node.collapsed && (onSwitchToRichEditor || onSwitchToMarkdown) && (
          <foreignObject
            x={node.x}
            y={node.y + (onEditClick ? 36 : 0)}
            width={displayWidth}
            height={28}
            pointerEvents="all"
            className="node-header-container"
          >
            <div
              style={{
                width: '100%',
                height: '100%',
                display: 'flex',
                alignItems: 'center',
                justifyContent: 'flex-end',
                gap: '4px',
                padding: '4px 8px',
                background: 'rgba(255, 255, 255, 0.95)',
                borderBottom: '1px solid #e5e7eb',
              }}
              onClick={(e) => e.stopPropagation()}
              onMouseDown={(e) => e.stopPropagation()}
            >
              {onSwitchToMarkdown && (
                <button
                  onClick={(e) => {
                    e.stopPropagation();
                    e.preventDefault();
                    onSwitchToMarkdown(node.id);
                  }}
                  style={{
                    padding: '2px 8px',
                    fontSize: '11px',
                    background: '#f3f4f6',
                    border: '1px solid #d1d5db',
                    borderRadius: '4px',
                    cursor: 'pointer',
                    color: '#374151',
                    fontWeight: '500',
                    display: 'flex',
                    alignItems: 'center',
                    gap: '4px',
                  }}
                  title="Switch to Markdown Editor"
                >
                  <span>📝</span>
                  <span>Markdown</span>
                </button>
              )}
              {onSwitchToRichEditor && (
                <button
                  onClick={(e) => {
                    e.stopPropagation();
                    e.preventDefault();
                    onSwitchToRichEditor(node.id);
                  }}
                  style={{
                    padding: '2px 8px',
                    fontSize: '11px',
                    background: '#f3f4f6',
                    border: '1px solid #d1d5db',
                    borderRadius: '4px',
                    cursor: 'pointer',
                    color: '#374151',
                    fontWeight: '500',
                    display: 'flex',
                    alignItems: 'center',
                    gap: '4px',
                  }}
                  title="Switch to Rich Editor"
                >
                  <span>✏️</span>
                  <span>Rich</span>
                </button>
              )}
            </div>
          </foreignObject>
        )}

               {/* Node label with markdown support */}
               <foreignObject
                 x={node.x}
                 y={
                   isEditing && !node.collapsed
                     ? node.y + 36
                     : isSelected && !node.collapsed && onEditClick
                     ? node.y + 36
                     : isTextMode && isSelected && !node.collapsed
                     ? node.y + 28
                     : node.y + 8
                 }
                 width={displayWidth}
                 height={
                   isEditing && !node.collapsed
                     ? displayHeight - 36
                     : isSelected && !node.collapsed && onEditClick
                     ? displayHeight - 36
                     : isTextMode && isSelected && !node.collapsed
                     ? displayHeight - 28
                     : displayHeight - 8
                 }
          pointerEvents="none"
          className="node-label-container"
        >
          <div
            style={{
              width: '100%',
              height: '100%',
              position: 'relative',
              overflow: 'hidden',
            }}
          >
            {node.collapsed ? (
              // Collapsed: show simple text preview
              <div
                style={{
                  width: '100%',
                  height: '100%',
                  display: 'flex',
                  alignItems: node.textVerticalAlign === 'top' ? 'flex-start' : 
                             node.textVerticalAlign === 'bottom' ? 'flex-end' : 'center',
                  justifyContent: node.textAlign === 'left' ? 'flex-start' :
                                 node.textAlign === 'right' ? 'flex-end' : 'center',
                  padding: '8px',
                  fontSize: '14px',
                  fontWeight: '600',
                  color: '#111827',
                  textAlign: node.textAlign || 'left',
                }}
              >
                {getCollapsedTitle(node.label)}
              </div>
            ) : isTextMode ? (
              // Text mode: show plain text
              <div
                style={{
                  width: '100%',
                  height: '100%',
                  display: 'flex',
                  alignItems: node.textVerticalAlign === 'top' ? 'flex-start' : 
                             node.textVerticalAlign === 'bottom' ? 'flex-end' : 'center',
                  justifyContent: node.textAlign === 'left' ? 'flex-start' :
                                 node.textAlign === 'right' ? 'flex-end' : 'center',
                  padding: '8px',
                  fontSize: '14px',
                  color: '#111827',
                  textAlign: node.textAlign || 'left',
                  whiteSpace: 'pre-wrap',
                  wordBreak: 'break-word',
                }}
              >
                {node.label || 'Empty'}
              </div>
            ) : node.contentType === 'markdown' ? (
              // Expanded: show markdown
              <MarkdownRenderer
                content={node.label}
                textAlign={node.textAlign || 'left'}
                textVerticalAlign={node.textVerticalAlign || 'middle'}
              />
            ) : (
              // Expanded: show rich editor HTML content (default)
              <RichEditorRenderer
                content={node.label}
                textAlign={node.textAlign || 'left'}
                textVerticalAlign={node.textVerticalAlign || 'middle'}
              />
            )}
          </div>
        </foreignObject>

        {/* Embedded content - only show when not collapsed */}
        {node.embedUrl && !node.collapsed && (
          <foreignObject
            x={node.x + 8}
            y={node.y + 35}
            width={node.w - 16}
            height={node.h - 43}
            pointerEvents="all"
          >
            <div
              style={{
                width: '100%',
                height: '100%',
                borderRadius: '4px',
                overflow: 'hidden',
                background: '#f9fafb',
                display: 'flex',
                flexDirection: 'column',
              }}
            >
              {node.embedType === 'youtube' ? (
                <iframe
                  src={`https://www.youtube.com/embed/${getYoutubeVideoId(node.embedUrl)}`}
                  title={node.label}
                  style={{
                    width: '100%',
                    height: '100%',
                    border: 'none',
                  }}
                  allow="accelerometer; autoplay; clipboard-write; encrypted-media; gyroscope; picture-in-picture; web-share"
                  allowFullScreen
                />
              ) : node.embedType === 'image' ? (
                // Image display with local download
                <ImageDisplay 
                  imageUrl={node.embedUrl}
                  alt={node.label}
                  onError={() => setShowFallback(true)}
                />
              ) : node.embedType === 'pdf' ? (
                // PDF display with authentication
                <PdfDisplay
                  pdfUrl={node.embedUrl!}
                  title={node.label}
                  onError={() => setShowFallback(true)}
                />
              ) : showFallback ? (
                // Fallback UI when embedding fails
                <EmbedFallback url={node.embedUrl} title={node.label} />
              ) : (
                // Try to embed webpage
                <div style={{ width: '100%', height: '100%', position: 'relative' }}>
                  <iframe
                    src={node.embedUrl}
                    title={node.label}
                    style={{
                      width: '100%',
                      height: '100%',
                      border: 'none',
                    }}
                    sandbox="allow-scripts allow-same-origin allow-forms allow-popups allow-popups-to-escape-sandbox"
                    onError={() => {
                      console.error('❌ Failed to load embed:', node.embedUrl);
                      setShowFallback(true);
                    }}
                  />
                  {/* Always show open link at bottom */}
                  <div
                    style={{
                      position: 'absolute',
                      bottom: '0',
                      left: '0',
                      right: '0',
                      background: 'linear-gradient(to top, rgba(255,255,255,0.95), transparent)',
                      padding: '20px 8px 8px 8px',
                      textAlign: 'center',
                    }}
                  >
                    <a
                      href={node.embedUrl}
                      target="_blank"
                      rel="noopener noreferrer"
                      style={{
                        display: 'inline-block',
                        padding: '6px 12px',
                        background: '#2563eb',
                        color: 'white',
                        borderRadius: '4px',
                        fontSize: '11px',
                        textDecoration: 'none',
                        fontWeight: 500,
                      }}
                      onClick={(e) => e.stopPropagation()}
                    >
                      🔗 Open Full Page
                    </a>
                    <button
                      onClick={(e) => {
                        e.stopPropagation();
                        setShowFallback(true);
                      }}
                      style={{
                        marginLeft: '8px',
                        padding: '6px 12px',
                        background: '#f3f4f6',
                        color: '#374151',
                        border: 'none',
                        borderRadius: '4px',
                        fontSize: '11px',
                        cursor: 'pointer',
                        fontWeight: 500,
                      }}
                    >
                      ⚠️ Can't see? Click here
                    </button>
                  </div>
                </div>
              )}
            </div>
          </foreignObject>
        )}
      </g>

      <NodeAnchors
        node={{ ...node, w: displayWidth, h: displayHeight }}
        visible={showAnchors}
        activeAnchor={activeAnchor}
        hoveredAnchor={hoveredAnchor}
        interactive={anchorInteractive}
        onAnchorClick={onAnchorClick}
        onAnchorEnter={onAnchorEnter}
        onAnchorLeave={onAnchorLeave}
      />

      {/* Collapse/Expand Button - only show for embed nodes or already collapsed nodes */}
      {onToggleCollapse && (node.embedUrl || node.collapsed) && (
        <g 
          style={{ pointerEvents: 'all', cursor: 'pointer' }}
          onClick={(e) => {
            console.log('🔘 Collapse button clicked for node:', node.id, 'embedUrl:', node.embedUrl);
            e.stopPropagation();
            e.preventDefault();
            onToggleCollapse(e);
          }}
          onMouseDown={(e) => {
            e.stopPropagation();
            e.preventDefault();
          }}
        >
          <CollapseButton
            x={node.x + displayWidth - 16}
            y={node.y + 16}
            isCollapsed={!!node.collapsed}
          />
        </g>
      )}

      {/* Connection handles - show when selected, adjust to display size */}
      {isSelected && (!isConnecting || isConnectionSource) && (
        <ConnectionHandles 
          node={{ ...node, w: displayWidth, h: displayHeight }} 
          onStartConnection={onStartConnection} 
        />
      )}

      {/* Resize handles - show when selected and not collapsed */}
      {isSelected && !isConnecting && !node.collapsed && onResizeStart && (() => {
        console.log('🔲 Rendering ResizeHandles for node:', node.id, 'displaySize:', displayWidth, displayHeight);
        return (
          <ResizeHandles 
            node={{ ...node, w: displayWidth, h: displayHeight }} 
            onResizeStart={onResizeStart} 
          />
        );
      })()}
    </g>
  );
}
