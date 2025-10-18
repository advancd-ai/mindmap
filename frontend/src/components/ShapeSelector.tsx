/**
 * ShapeSelector - 노드 형태 선택 다이얼로그
 */

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

export default function ShapeSelector({ currentShape, onSelect, onClose }: ShapeSelectorProps) {
  const { t } = useTranslation();
  
  return (
    <div className="shape-selector-overlay" onClick={onClose}>
      <div className="shape-selector" onClick={(e) => e.stopPropagation()}>
        <div className="shape-selector-header">
          <h3>{t('nodeShape.title')}</h3>
          <button className="shape-selector-close" onClick={onClose}>
            ✕
          </button>
        </div>
        
        <div className="shape-selector-grid">
          {SHAPE_OPTIONS.map((option) => {
            const isSelected = (currentShape || 'rect') === option.type;
            return (
              <button
                key={option.type}
                className={`shape-option ${isSelected ? 'selected' : ''}`}
                onClick={() => {
                  onSelect(option.type);
                  onClose();
                }}
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
