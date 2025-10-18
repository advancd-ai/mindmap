/**
 * Node Component - Individual mindmap node
 */

import { useState } from 'react';
import { type Node as NodeType } from '../store/mindmap';
import ConnectionHandles from './ConnectionHandles';
import ResizeHandles, { type ResizeDirection } from './ResizeHandles';
import EmbedFallback from './EmbedFallback';
import NodeTypeIcon from './NodeTypeIcon';
import CollapseButton from './CollapseButton';
import NodeShape from './NodeShape';
import ImageDisplay from './ImageDisplay';
import PdfDisplay from './PdfDisplay';
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
  onCompleteConnection: (e: React.MouseEvent) => void;
  onDoubleClick?: (e: React.MouseEvent) => void;
  onContextMenu?: (e: React.MouseEvent) => void;
  onResizeStart?: (e: React.MouseEvent, direction: ResizeDirection) => void;
  onToggleCollapse?: (e: React.MouseEvent) => void;
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
  onCompleteConnection,
  onDoubleClick,
  onContextMenu,
  onResizeStart,
  onToggleCollapse,
}: NodeProps) {
  const [showFallback, setShowFallback] = useState(false);

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
          e.stopPropagation();
          if (isConnecting) {
            onCompleteConnection(e);
          } else {
            onSelect(e);
          }
        }}
        onDoubleClick={(e) => {
          e.stopPropagation();
          if (onDoubleClick) {
            onDoubleClick(e);
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

        {/* Title text - non-interactive */}
        <g pointerEvents="none">
          <text
            x={(() => {
              const align = node.textAlign || 'center';
              const padding = 40;
              switch (align) {
                case 'left':
                  return node.x + padding;
                case 'right':
                  return node.x + displayWidth - padding;
                case 'center':
                default:
                  return node.x + displayWidth / 2;
              }
            })()}
            y={(() => {
              const vAlign = node.textVerticalAlign || 'middle';
              const padding = 16;
              switch (vAlign) {
                case 'top':
                  return node.y + padding;
                case 'bottom':
                  return node.y + displayHeight - padding;
                case 'middle':
                default:
                  return node.y + displayHeight / 2;
              }
            })()}
            textAnchor={(() => {
              const align = node.textAlign || 'center';
              switch (align) {
                case 'left': return 'start';
                case 'right': return 'end';
                case 'center':
                default: return 'middle';
              }
            })()}
            dominantBaseline={(() => {
              const vAlign = node.textVerticalAlign || 'middle';
              switch (vAlign) {
                case 'top': return 'hanging';
                case 'bottom': return 'alphabetic';
                case 'middle':
                default: return 'middle';
              }
            })()}
            fontSize="14"
            fontWeight="600"
            fill="#111827"
          >
            {node.collapsed ? getCollapsedTitle(node.label) : node.label}
          </text>
        </g>

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
