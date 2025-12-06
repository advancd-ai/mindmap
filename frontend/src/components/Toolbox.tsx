/**
 * Toolbox - Floating toolbox for editor tools
 * Located on the left side of the editor
 */

import { useMemo } from 'react';
import { useTranslation } from 'react-i18next';
import { useMindMapStore } from '../store/mindmap';
import ToolboxButton from './ToolboxButton';
import AppleIcon from './AppleIcon';
import './Toolbox.css';

interface ToolboxProps {
  isConnecting: boolean;
  zoom: number;
  onAddNode: () => void;
  onConnect: () => void;
  onCancelConnection: () => void;
  onEdit: () => void;
  onDelete: () => void;
  onChangeShape: () => void;
  onEmbed: () => void;
  onZoomIn: () => void;
  onZoomOut: () => void;
  onResetZoom: () => void;
  onFitToScreen: () => void;
  onCenterView: () => void;
  isReadOnly?: boolean;
}

export default function Toolbox({
  isConnecting,
  zoom,
  onAddNode,
  onConnect,
  onCancelConnection,
  onEdit,
  onDelete,
  onChangeShape,
  onEmbed,
  onZoomIn,
  onZoomOut,
  onResetZoom,
  onFitToScreen,
  onCenterView,
  isReadOnly = false
}: ToolboxProps) {
  const { t } = useTranslation();
  const selectedNodeId = useMindMapStore((state) => state.selectedNodeId);
  const selectedEdgeId = useMindMapStore((state) => state.selectedEdgeId);

  const hasSelection = selectedNodeId !== null || selectedEdgeId !== null;
  const hasNodeSelection = selectedNodeId !== null;
  const hasEdgeSelection = selectedEdgeId !== null;

  // Zoom level display
  const zoomPercent = Math.round(zoom * 100);

  // Tool groups
  const tools = useMemo(() => {
    const groups: Array<{
      id: string;
      tools: Array<{
        id: string;
        icon: React.ReactNode;
        label: string;
        shortcut?: string;
        onClick: () => void;
        active?: boolean;
        disabled?: boolean;
        show?: boolean;
      }>;
    }> = [];

    // Group 1: Node Creation & Selection
    groups.push({
      id: 'creation',
      tools: [
        {
          id: 'add-node',
          icon: <AppleIcon name="add" size="small" />,
          label: hasNodeSelection ? t('toolbar.addNode') : t('toolbar.addNode'),
          shortcut: 'A',
          onClick: onAddNode,
          disabled: isReadOnly,
          show: true
        },
        {
          id: 'select',
          icon: <span style={{ fontSize: '18px' }}>👆</span>,
          label: 'Select Tool',
          shortcut: 'S',
          onClick: () => {
            // Clear selection
            useMindMapStore.getState().selectNode(null);
            useMindMapStore.getState().selectEdge(null);
          },
          show: true
        }
      ]
    });

    // Group 2: Node/Edge Actions (conditional)
    if (hasSelection) {
      const nodeEdgeTools: Array<typeof groups[0]['tools'][0]> = [];

      if (hasNodeSelection) {
        // Node-specific tools
        if (isConnecting) {
          nodeEdgeTools.push({
            id: 'connect-active',
            icon: <AppleIcon name="link" size="small" />,
            label: 'Connect (Active)',
            onClick: () => {},
            active: true,
            show: true
          });
          nodeEdgeTools.push({
            id: 'cancel-connection',
            icon: <span>✕</span>,
            label: 'Cancel Connection',
            shortcut: 'Esc',
            onClick: onCancelConnection,
            show: true
          });
        } else {
          nodeEdgeTools.push({
            id: 'connect',
            icon: <AppleIcon name="link" size="small" />,
            label: t('toolbar.connect'),
            shortcut: 'C',
            onClick: onConnect,
            disabled: isReadOnly,
            show: true
          });
        }

        nodeEdgeTools.push({
          id: 'edit',
          icon: <AppleIcon name="edit" size="small" />,
          label: t('toolbar.edit'),
          shortcut: 'E',
          onClick: onEdit,
          disabled: isReadOnly,
          show: true
        });

        nodeEdgeTools.push({
          id: 'delete',
          icon: <AppleIcon name="delete" size="small" />,
          label: t('toolbar.delete'),
          shortcut: 'Delete',
          onClick: onDelete,
          disabled: isReadOnly,
          show: true
        });

        nodeEdgeTools.push({
          id: 'change-shape',
          icon: <span>◇</span>,
          label: 'Change Shape',
          shortcut: 'S',
          onClick: onChangeShape,
          disabled: isReadOnly,
          show: true
        });

        nodeEdgeTools.push({
          id: 'embed',
          icon: <AppleIcon name="add" size="small" />,
          label: t('toolbar.embed'),
          shortcut: 'I',
          onClick: onEmbed,
          disabled: isReadOnly,
          show: true
        });
      } else if (hasEdgeSelection) {
        // Edge-specific tools
        nodeEdgeTools.push({
          id: 'edit-edge',
          icon: <AppleIcon name="edit" size="small" />,
          label: 'Edit Edge Label',
          shortcut: 'E',
          onClick: onEdit,
          disabled: isReadOnly,
          show: true
        });

        nodeEdgeTools.push({
          id: 'delete-edge',
          icon: <AppleIcon name="delete" size="small" />,
          label: t('toolbar.deleteEdge'),
          shortcut: 'Delete',
          onClick: onDelete,
          disabled: isReadOnly,
          show: true
        });
      }

      if (nodeEdgeTools.length > 0) {
        groups.push({
          id: 'node-edge-actions',
          tools: nodeEdgeTools
        });
      }
    }

    // Group 3: Zoom Controls
    groups.push({
      id: 'zoom',
      tools: [
        {
          id: 'zoom-in',
          icon: <span>🔍+</span>,
          label: 'Zoom In',
          shortcut: 'Ctrl + Plus',
          onClick: onZoomIn,
          show: true
        },
        {
          id: 'zoom-out',
          icon: <span>🔍-</span>,
          label: 'Zoom Out',
          shortcut: 'Ctrl + Minus',
          onClick: onZoomOut,
          show: true
        },
        {
          id: 'reset-zoom',
          icon: <span>⟲</span>,
          label: 'Reset Zoom',
          shortcut: 'Ctrl + 0',
          onClick: onResetZoom,
          show: true
        },
        {
          id: 'zoom-level',
          icon: <span style={{ fontSize: '11px', fontWeight: 600 }}>{zoomPercent}%</span>,
          label: `Zoom Level: ${zoomPercent}%`,
          onClick: () => {
            const input = prompt(`Enter zoom level (10-500%):`, zoomPercent.toString());
            if (input) {
              const level = parseInt(input, 10);
              if (level >= 10 && level <= 500) {
                // Convert percentage to zoom factor (e.g., 100% = 1.0)
                const newZoom = level / 100;
                // This will be handled by parent component's zoom prop
                // We need to trigger zoom change - but we can't directly call setZoom
                // Instead, we'll use a custom event or the parent should handle this
                // For now, we'll just log - parent component should add a handler
                console.log('Set zoom to:', newZoom);
                // Dispatch custom event that parent can listen to
                window.dispatchEvent(new CustomEvent('toolbox-zoom-change', { detail: { zoom: newZoom } }));
              } else {
                alert('Zoom level must be between 10% and 500%');
              }
            }
          },
          show: true
        }
      ]
    });

    // Group 4: View Controls
    groups.push({
      id: 'view',
      tools: [
        {
          id: 'fit-to-screen',
          icon: <span>⊞</span>,
          label: 'Fit to Screen',
          shortcut: 'F',
          onClick: onFitToScreen,
          show: true
        },
        {
          id: 'center-view',
          icon: <span>⊙</span>,
          label: 'Center View',
          shortcut: 'Ctrl + C',
          onClick: onCenterView,
          show: true
        }
      ]
    });

    return groups;
  }, [
    hasSelection,
    hasNodeSelection,
    hasEdgeSelection,
    isConnecting,
    isReadOnly,
    zoomPercent,
    t,
    onAddNode,
    onConnect,
    onCancelConnection,
    onEdit,
    onDelete,
    onChangeShape,
    onEmbed,
    onZoomIn,
    onZoomOut,
    onResetZoom,
    onFitToScreen,
    onCenterView
  ]);

  return (
    <div className="toolbox" role="toolbar" aria-label="Editor tools">
      {tools.map((group, groupIndex) => (
        <div key={group.id}>
          <div className="toolbox-group" role="group" aria-label={group.id}>
            {group.tools
              .filter((tool) => tool.show !== false)
              .map((tool) => (
                <ToolboxButton
                  key={tool.id}
                  icon={tool.icon}
                  label={tool.label}
                  onClick={tool.onClick}
                  active={tool.active}
                  disabled={tool.disabled}
                  shortcut={tool.shortcut}
                  aria-label={tool.label}
                />
              ))}
          </div>
          {groupIndex < tools.length - 1 && <div className="toolbox-separator" />}
        </div>
      ))}
    </div>
  );
}

