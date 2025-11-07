/**
 * ContextMenu - Right-click context menu with submenu support
 */

import { useCallback, useEffect, useMemo, useRef, useState } from 'react';
import type { KeyboardEvent as ReactKeyboardEvent } from 'react';
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
  const [focusedIndex, setFocusedIndex] = useState<number | null>(null);
  const [submenuFocus, setSubmenuFocus] = useState<{ parentIndex: number | null; subIndex: number | null }>({
    parentIndex: null,
    subIndex: null,
  });

  const isItemFocusable = useCallback((item: MenuItem) => !item.divider && !item.disabled, []);

  const findNextFocusableIndex = useCallback(
    (list: MenuItem[], startIndex: number, direction: 1 | -1) => {
      if (!list.length) return null;

      let index = startIndex;
      for (let i = 0; i < list.length; i += 1) {
        index = (index + direction + list.length) % list.length;
        const item = list[index];
        if (isItemFocusable(item)) {
          return index;
        }
      }
      return null;
    },
    [isItemFocusable]
  );

  const firstFocusableIndex = useMemo(() => findNextFocusableIndex(items, -1, 1), [items, findNextFocusableIndex]);

  useEffect(() => {
    setFocusedIndex(firstFocusableIndex);
    setHoveredIndex(firstFocusableIndex);
    setSubmenuFocus({ parentIndex: null, subIndex: null });
  }, [firstFocusableIndex, items]);

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

  useEffect(() => {
    menuRef.current?.focus();
  }, []);

  const handleKeyboardNavigation = useCallback(
    (event: ReactKeyboardEvent<HTMLDivElement>) => {
      if (items.length === 0) {
        return;
      }

      const { key } = event;
      const prevent = () => {
        event.preventDefault();
        event.stopPropagation();
      };

      const focusedItem = focusedIndex !== null ? items[focusedIndex] : null;
      const activeSubmenu =
        submenuFocus.parentIndex !== null && submenuFocus.parentIndex === focusedIndex && focusedItem?.submenu
          ? focusedItem.submenu
          : null;

      if (key === 'ArrowDown') {
        prevent();
        if (activeSubmenu) {
          const next = findNextFocusableIndex(activeSubmenu, submenuFocus.subIndex ?? -1, 1);
          if (next !== null) {
            setSubmenuFocus({ parentIndex: focusedIndex, subIndex: next });
          }
        } else {
          const next = findNextFocusableIndex(items, focusedIndex ?? -1, 1);
          if (next !== null) {
            setFocusedIndex(next);
            setHoveredIndex(next);
            setSubmenuFocus({ parentIndex: null, subIndex: null });
          }
        }
      } else if (key === 'ArrowUp') {
        prevent();
        if (activeSubmenu) {
          const next = findNextFocusableIndex(activeSubmenu, submenuFocus.subIndex ?? activeSubmenu.length, -1);
          if (next !== null) {
            setSubmenuFocus({ parentIndex: focusedIndex, subIndex: next });
          }
        } else {
          const next = findNextFocusableIndex(items, focusedIndex ?? 0, -1);
          if (next !== null) {
            setFocusedIndex(next);
            setHoveredIndex(next);
            setSubmenuFocus({ parentIndex: null, subIndex: null });
          }
        }
      } else if (key === 'ArrowRight') {
        if (focusedItem?.submenu && !activeSubmenu) {
          prevent();
          setHoveredIndex(focusedIndex ?? null);
          const first = findNextFocusableIndex(focusedItem.submenu, -1, 1);
          if (first !== null) {
            setSubmenuFocus({ parentIndex: focusedIndex, subIndex: first });
          }
        }
      } else if (key === 'ArrowLeft') {
        if (activeSubmenu) {
          prevent();
          setSubmenuFocus({ parentIndex: null, subIndex: null });
        }
      } else if (key === 'Enter' || key === ' ') {
        if (activeSubmenu) {
          prevent();
          if (submenuFocus.subIndex !== null && focusedItem?.submenu) {
            const subitem = focusedItem.submenu[submenuFocus.subIndex];
            if (subitem && !subitem.disabled && !subitem.divider) {
              subitem.onClick();
              onClose();
            }
          }
        } else if (focusedItem) {
          prevent();
          if (focusedItem.submenu) {
            const first = findNextFocusableIndex(focusedItem.submenu, -1, 1);
            if (first !== null) {
              setHoveredIndex(focusedIndex ?? null);
              setSubmenuFocus({ parentIndex: focusedIndex, subIndex: first });
            }
          } else if (!focusedItem.disabled && !focusedItem.divider) {
            focusedItem.onClick();
            onClose();
          }
        }
      }
    },
    [items, focusedIndex, submenuFocus, findNextFocusableIndex, onClose]
  );

  return (
    <div
      ref={menuRef}
      className={`context-menu ${positionAbove ? 'position-above' : ''}`}
      style={{
        position: 'fixed',
        left: `${position.x}px`,
        top: `${position.y}px`,
      }}
      tabIndex={-1}
      onKeyDown={handleKeyboardNavigation}
    >
      {items.map((item, index) => (
        item.divider ? (
          <div key={index} className="context-menu-divider" />
        ) : (
          <div
            key={index}
            className="context-menu-item-wrapper"
            onMouseEnter={() => {
              setHoveredIndex(index);
              setFocusedIndex(index);
              setSubmenuFocus({ parentIndex: null, subIndex: null });
            }}
            onMouseLeave={() => {
              setHoveredIndex(null);
            }}
          >
            <button
              className={`context-menu-item ${item.disabled ? 'disabled' : ''} ${
                item.submenu ? 'has-submenu' : ''
              } ${
                focusedIndex === index && submenuFocus.parentIndex === null ? 'focused' : ''
              }`}
              onClick={() => {
                if (!item.disabled && !item.submenu) {
                  item.onClick();
                  onClose();
                }
              }}
              disabled={item.disabled}
              tabIndex={-1}
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
            {item.submenu && (hoveredIndex === index || submenuFocus.parentIndex === index) && (
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
                      className={`context-menu-item ${subitem.disabled ? 'disabled' : ''} ${
                        submenuFocus.parentIndex === index && submenuFocus.subIndex === subindex ? 'focused' : ''
                      }`}
                      onClick={() => {
                        if (!subitem.disabled) {
                          subitem.onClick();
                          onClose();
                        }
                      }}
                      disabled={subitem.disabled}
                      onMouseEnter={() => {
                        setHoveredIndex(index);
                        setSubmenuFocus({ parentIndex: index, subIndex: subindex });
                      }}
                      tabIndex={-1}
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
