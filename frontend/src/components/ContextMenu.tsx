/**
 * ContextMenu - Right-click context menu with submenu support
 */

import { useEffect, useRef, useState } from 'react';
import './ContextMenu.css';

export interface MenuItem {
  label: string;
  icon?: string | JSX.Element;
  onClick: () => void;
  disabled?: boolean;
  divider?: boolean;
  submenu?: MenuItem[];
  shortcut?: string; // Keyboard shortcut (e.g., "e", "Ctrl+D", "Delete")
}

interface ContextMenuProps {
  x: number;
  y: number;
  items: MenuItem[];
  onClose: () => void;
}

export default function ContextMenu({ x, y, items, onClose }: ContextMenuProps) {
  const menuRef = useRef<HTMLDivElement>(null);
  const [hoveredIndex, setHoveredIndex] = useState<number | null>(null);
  const [position, setPosition] = useState({ x, y });
  const [positionAbove, setPositionAbove] = useState(false);
  const submenuRefs = useRef<Map<number, HTMLDivElement>>(new Map());

  // Adjust menu position to stay within viewport
  useEffect(() => {
    if (!menuRef.current) return;

    const menu = menuRef.current;
    const rect = menu.getBoundingClientRect();
    const viewportHeight = window.innerHeight;
    const viewportWidth = window.innerWidth;

    let adjustedX = x;
    let adjustedY = y;
    let showAbove = false;

    // Check if menu goes beyond bottom of screen
    if (y + rect.height > viewportHeight - 20) {
      // Not enough space below, show above
      adjustedY = y - rect.height;
      showAbove = true;
      
      // If still goes beyond top, adjust to fit
      if (adjustedY < 20) {
        adjustedY = 20;
        showAbove = false;
      }
    }

    // Check if menu goes beyond right of screen
    if (x + rect.width > viewportWidth - 20) {
      adjustedX = viewportWidth - rect.width - 20;
    }

    // Check if menu goes beyond left of screen
    if (adjustedX < 20) {
      adjustedX = 20;
    }

    setPosition({ x: adjustedX, y: adjustedY });
    setPositionAbove(showAbove);
  }, [x, y]);

  useEffect(() => {
    const handleClickOutside = (e: MouseEvent) => {
      if (menuRef.current && !menuRef.current.contains(e.target as Node)) {
        onClose();
      }
    };

    const handleEscape = (e: KeyboardEvent) => {
      if (e.key === 'Escape') {
        onClose();
      }
    };

    // Add listeners with a small delay to avoid immediate closing
    setTimeout(() => {
      document.addEventListener('mousedown', handleClickOutside);
      document.addEventListener('keydown', handleEscape);
    }, 10);

    return () => {
      document.removeEventListener('mousedown', handleClickOutside);
      document.removeEventListener('keydown', handleEscape);
    };
  }, [onClose]);

  return (
    <div
      ref={menuRef}
      className={`context-menu ${positionAbove ? 'position-above' : ''}`}
      style={{
        position: 'fixed',
        left: `${position.x}px`,
        top: `${position.y}px`,
      }}
    >
      {items.map((item, index) => (
        item.divider ? (
          <div key={index} className="context-menu-divider" />
        ) : (
          <div
            key={index}
            className="context-menu-item-wrapper"
            onMouseEnter={() => setHoveredIndex(index)}
            onMouseLeave={() => setHoveredIndex(null)}
          >
            <button
              className={`context-menu-item ${item.disabled ? 'disabled' : ''} ${
                item.submenu ? 'has-submenu' : ''
              }`}
              onClick={() => {
                if (!item.disabled && !item.submenu) {
                  item.onClick();
                  onClose();
                }
              }}
              disabled={item.disabled}
            >
              {item.icon && (
                <span className="context-menu-icon">
                  {typeof item.icon === 'string' ? item.icon : item.icon}
                </span>
              )}
              <span className="context-menu-label">{item.label}</span>
              {item.shortcut && (
                <span className="context-menu-shortcut">
                  {item.shortcut.split('+').map((key, idx) => (
                    <span key={idx}>
                      {idx > 0 && <span className="shortcut-separator">+</span>}
                      <kbd className="shortcut-key">{key.trim()}</kbd>
                    </span>
                  ))}
                </span>
              )}
              {item.submenu && <span className="context-menu-arrow">›</span>}
            </button>
            
            {/* Submenu */}
            {item.submenu && hoveredIndex === index && (
              <div 
                className="context-submenu"
                ref={(el) => {
                  if (el) {
                    submenuRefs.current.set(index, el);
                    // Check if submenu goes beyond right edge
                    const rect = el.getBoundingClientRect();
                    const viewportWidth = window.innerWidth;
                    if (rect.right > viewportWidth - 20) {
                      // Position to the left instead
                      el.style.left = 'auto';
                      el.style.right = '100%';
                      el.style.marginLeft = '0';
                      el.style.marginRight = '4px';
                    }
                  }
                }}
              >
                {item.submenu.map((subitem, subindex) => (
                  subitem.divider ? (
                    <div key={subindex} className="context-menu-divider" />
                  ) : (
                    <button
                      key={subindex}
                      className={`context-menu-item ${subitem.disabled ? 'disabled' : ''}`}
                      onClick={() => {
                        if (!subitem.disabled) {
                          subitem.onClick();
                          onClose();
                        }
                      }}
                      disabled={subitem.disabled}
                    >
                      {subitem.icon && <span className="context-menu-icon">{subitem.icon}</span>}
                      <span className="context-menu-label">{subitem.label}</span>
                      {subitem.shortcut && (
                        <span className="context-menu-shortcut">
                          {subitem.shortcut.split('+').map((key, idx) => (
                            <span key={idx}>
                              {idx > 0 && <span className="shortcut-separator">+</span>}
                              <kbd className="shortcut-key">{key.trim()}</kbd>
                            </span>
                          ))}
                        </span>
                      )}
                    </button>
                  )
                ))}
              </div>
            )}
          </div>
        )
      ))}
    </div>
  );
}
