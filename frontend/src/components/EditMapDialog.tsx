/**
 * EditMapDialog - 맵 정보 편집 다이얼로그
 */

import { useState } from 'react';
import { useTranslation } from 'react-i18next';
import './EditMapDialog.css';

interface EditMapDialogProps {
  currentTitle: string;
  currentTags: string[];
  onConfirm: (title: string, tags: string[]) => void;
  onCancel: () => void;
}

export default function EditMapDialog({ 
  currentTitle, 
  currentTags, 
  onConfirm, 
  onCancel 
}: EditMapDialogProps) {
  const { t } = useTranslation();
  const [title, setTitle] = useState(currentTitle);
  const [tagInput, setTagInput] = useState('');
  const [tags, setTags] = useState<string[]>(currentTags);

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
      console.log('💾 EditMapDialog: Confirming changes', { title: title.trim(), tags });
      onConfirm(title.trim(), tags);
    }
  };

  return (
    <div className="edit-map-overlay" onClick={onCancel}>
      <div className="edit-map-dialog" onClick={(e) => e.stopPropagation()}>
        {/* Decorative Background Elements */}
        <div className="dialog-bg-decoration"></div>
        
        {/* Header */}
        <div className="edit-map-header">
          <div className="header-icon-wrapper">
            <div className="header-icon">✏️</div>
          </div>
          <h2 className="edit-map-title">{t('editMapDialog.title')}</h2>
          <p className="edit-map-subtitle">
            {t('editMapDialog.subtitle')}
          </p>
          <button onClick={onCancel} className="edit-map-close">✕</button>
        </div>

        <div className="edit-map-body">
          {/* Title Input */}
          <div className="form-group">
            <label htmlFor="edit-map-title" className="form-label">
              <span className="label-icon">📝</span>
              {t('editMapDialog.mapTitle')}
              <span className="required-mark">*</span>
            </label>
            <div className="input-wrapper">
              <input
                id="edit-map-title"
                type="text"
                className="input input-enhanced"
                placeholder={t('editMapDialog.titlePlaceholder')}
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
            <label htmlFor="edit-map-tags" className="form-label">
              <span className="label-icon">🏷️</span>
              {t('editMapDialog.tags')} 
              <span className="optional-badge">{t('editMapDialog.optional')}</span>
            </label>
            <div className="tag-input-wrapper">
              <input
                id="edit-map-tags"
                type="text"
                className="input input-enhanced"
                placeholder={t('editMapDialog.tagsPlaceholder')}
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
                💡 {t('editMapDialog.tagsHint')}
              </p>
            )}
          </div>
        </div>

        {/* Actions */}
        <div className="edit-map-actions">
          <button onClick={onCancel} className="button button-secondary button-large">
            {t('editMapDialog.cancel')}
          </button>
          <button
            onClick={handleConfirm}
            className="button button-primary button-large"
            disabled={!title.trim()}
          >
            <span className="button-icon">✓</span>
            {t('editMapDialog.save')}
          </button>
        </div>
      </div>
    </div>
  );
}

