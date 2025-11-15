/**
 * ShapeSelector - 노드 형태 선택 다이얼로그
 */

import { useEffect, useRef, useState } from 'react';
import { useTranslation } from 'react-i18next';
import { type NodeShapeType } from '../store/mindmap';
import './ShapeSelector.css';

interface ShapeSelectorProps {
  currentShape?: NodeShapeType;
  onSelect: (shape: NodeShapeType) => void;
  onClose: () => void;
}

interface ShapeOption {
  type: NodeShapeType;
  icon: string;
  color: string;
}

const SHAPE_OPTIONS: ShapeOption[] = [
  { type: 'rect', icon: '▭', color: '#64748B' },
  { type: 'circle', icon: '●', color: '#3B82F6' },
  { type: 'diamond', icon: '◆', color: '#8B5CF6' },
  { type: 'hex', icon: '⬡', color: '#10B981' },
  { type: 'cloud', icon: '☁', color: '#0EA5E9' },
  { type: 'capsule', icon: '⬬', color: '#F59E0B' },
  { type: 'file', icon: '📄', color: '#64748B' },
  { type: 'card', icon: '🃏', color: '#EC4899' },
];

const GRID_COLUMNS = 4;

export default function ShapeSelector({ currentShape, onSelect, onClose }: ShapeSelectorProps) {
  const { t } = useTranslation();
  const initialIndex =
    SHAPE_OPTIONS.findIndex((option) => option.type === (currentShape || 'rect')) || 0;
  const [focusedIndex, setFocusedIndex] = useState(Math.max(0, initialIndex));
  const optionRefs = useRef<Array<HTMLButtonElement | null>>([]);
  const containerRef = useRef<HTMLDivElement | null>(null);

  useEffect(() => {
    const newIndex =
      SHAPE_OPTIONS.findIndex((option) => option.type === (currentShape || 'rect')) || 0;
    setFocusedIndex(Math.max(0, newIndex));
  }, [currentShape]);

  useEffect(() => {
    optionRefs.current[focusedIndex]?.focus();
  }, [focusedIndex]);

  useEffect(() => {
    containerRef.current?.focus();
  }, []);

  const selectShape = (shape: NodeShapeType) => {
    onSelect(shape);
    onClose();
  };

  const handleKeyNavigation = (event: React.KeyboardEvent<HTMLDivElement>) => {
    const { key } = event;
    const total = SHAPE_OPTIONS.length;
    let nextIndex = focusedIndex;
    let handled = false;

    switch (key) {
      case 'Escape':
        onClose();
        handled = true;
        break;
      case 'ArrowRight':
        nextIndex = (focusedIndex + 1) % total;
        handled = true;
        break;
      case 'ArrowLeft':
        nextIndex = (focusedIndex - 1 + total) % total;
        handled = true;
        break;
      case 'ArrowDown':
        nextIndex = (focusedIndex + GRID_COLUMNS) % total;
        handled = true;
        break;
      case 'ArrowUp':
        nextIndex = (focusedIndex - GRID_COLUMNS + total) % total;
        handled = true;
        break;
      case 'Enter':
      case ' ':
        selectShape(SHAPE_OPTIONS[focusedIndex].type);
        handled = true;
        break;
      default:
        break;
    }

    if (handled) {
      event.preventDefault();
      event.stopPropagation();
      setFocusedIndex(nextIndex);
    }
  };

  return (
    <div className="shape-selector-overlay" onClick={onClose}>
      <div
        className="shape-selector"
        onClick={(e) => e.stopPropagation()}
        onKeyDown={handleKeyNavigation}
        tabIndex={-1}
        ref={containerRef}
      >
        <div className="shape-selector-header">
          <h3>{t('nodeShape.title')}</h3>
          <button className="shape-selector-close" onClick={onClose}>
            ✕
          </button>
        </div>
        
        <div className="shape-selector-grid">
          {SHAPE_OPTIONS.map((option, index) => {
            const isSelected = (currentShape || 'rect') === option.type;
            return (
              <button
                key={option.type}
                className={`shape-option ${isSelected ? 'selected' : ''}`}
                onClick={() => selectShape(option.type)}
                ref={(el) => {
                  optionRefs.current[index] = el;
                }}
                tabIndex={focusedIndex === index ? 0 : -1}
                style={{ borderColor: isSelected ? option.color : undefined }}
              >
                <div 
                  className="shape-option-icon"
                  style={{ color: option.color }}
                >
                  {option.icon}
                </div>
                <div className="shape-option-label">{t(`nodeShape.${option.type}`)}</div>
                <div className="shape-option-description">{t(`nodeShape.description.${option.type}`)}</div>
                {isSelected && (
                  <div className="shape-option-check">✓</div>
                )}
              </button>
            );
          })}
        </div>
        
        <div className="shape-selector-hint">
          {t('nodeShape.hint')}
        </div>
      </div>
    </div>
  );
}
