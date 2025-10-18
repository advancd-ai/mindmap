/**
 * CreateMapDialog - 새 맵 생성 다이얼로그 (Enhanced Design)
 */

import { useState } from 'react';
import { useTranslation } from 'react-i18next';
import './CreateMapDialog.css';

interface CreateMapDialogProps {
  onConfirm: (title: string, tags: string[]) => void;
  onCancel: () => void;
}

export default function CreateMapDialog({ onConfirm, onCancel }: CreateMapDialogProps) {
  const { t } = useTranslation();
  const [title, setTitle] = useState('');
  const [tagInput, setTagInput] = useState('');
  const [tags, setTags] = useState<string[]>([]);

  const handleAddTag = () => {
    if (tagInput.trim() && !tags.includes(tagInput.trim())) {
      setTags([...tags, tagInput.trim()]);
      setTagInput('');
    }
  };

  const handleRemoveTag = (tag: string) => {
    setTags(tags.filter(t => t !== tag));
  };

  const handleKeyDown = (e: React.KeyboardEvent) => {
    if (e.key === 'Enter') {
      if (e.currentTarget === (e.target as HTMLElement).closest('.tag-input-wrapper')?.querySelector('input')) {
        e.preventDefault();
        handleAddTag();
      } else {
        e.preventDefault();
        handleConfirm();
      }
    } else if (e.key === 'Escape') {
      onCancel();
    }
  };

  const handleConfirm = () => {
    if (title.trim()) {
      onConfirm(title.trim(), tags);
    }
  };

  return (
    <div className="create-map-overlay" onClick={onCancel}>
      <div className="create-map-dialog" onClick={(e) => e.stopPropagation()}>
        {/* Decorative Background Elements */}
        <div className="dialog-bg-decoration"></div>
        
        {/* Header with Gradient */}
        <div className="create-map-header">
          <div className="header-icon-wrapper">
            <div className="header-icon">🧠</div>
          </div>
          <h2 className="create-map-title">{t('createMapDialog.title')}</h2>
          <p className="create-map-subtitle">
            {t('createMapDialog.subtitle')}
          </p>
          <button onClick={onCancel} className="create-map-close">✕</button>
        </div>

        <div className="create-map-body">
          {/* Title Input */}
          <div className="form-group">
            <label htmlFor="map-title" className="form-label">
              <span className="label-icon">📝</span>
              {t('createMapDialog.mapTitle')}
              <span className="required-mark">*</span>
            </label>
            <div className="input-wrapper">
              <input
                id="map-title"
                type="text"
                className="input input-enhanced"
                placeholder={t('createMapDialog.titlePlaceholder')}
                value={title}
                onChange={(e) => setTitle(e.target.value)}
                onKeyDown={handleKeyDown}
                autoFocus
                maxLength={100}
              />
              <span className="input-icon">✨</span>
            </div>
            <div className="form-footer">
              <span className="form-hint">
                {title.length}/100 characters
              </span>
            </div>
          </div>

          {/* Tags Input */}
          <div className="form-group">
            <label htmlFor="map-tags" className="form-label">
              <span className="label-icon">🏷️</span>
              {t('createMapDialog.tags')} 
              <span className="optional-badge">{t('createMapDialog.optional')}</span>
            </label>
            <div className="tag-input-wrapper">
              <input
                id="map-tags"
                type="text"
                className="input input-enhanced"
                placeholder={t('createMapDialog.tagsPlaceholder')}
                value={tagInput}
                onChange={(e) => setTagInput(e.target.value)}
                onKeyDown={handleKeyDown}
              />
              <button
                type="button"
                onClick={handleAddTag}
                className="button button-add-tag"
                disabled={!tagInput.trim()}
              >
                <span>+</span>
              </button>
            </div>
            
            {/* Tags Display */}
            {tags.length > 0 && (
              <div className="tags-display">
                {tags.map((tag) => (
                  <span key={tag} className="tag-chip">
                    <span className="tag-text">{tag}</span>
                    <button
                      onClick={() => handleRemoveTag(tag)}
                      className="tag-remove"
                      aria-label={`Remove ${tag}`}
                    >
                      ✕
                    </button>
                  </span>
                ))}
              </div>
            )}
            
            {tags.length === 0 && (
              <p className="tags-hint">
                💡 {t('createMapDialog.tagsHint')}
              </p>
            )}
          </div>
        </div>

        {/* Actions */}
        <div className="create-map-actions">
          <button onClick={onCancel} className="button button-secondary button-large">
            {t('createMapDialog.cancel')}
          </button>
          <button
            onClick={handleConfirm}
            className="button button-primary button-large"
            disabled={!title.trim()}
          >
            <span className="button-icon">✨</span>
            {t('createMapDialog.create')}
          </button>
        </div>
      </div>
    </div>
  );
}
