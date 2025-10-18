/**
 * ColorPicker - Node background color picker
 */

import { useState } from 'react';
import { useTranslation } from 'react-i18next';
import './ColorPicker.css';

interface ColorPickerProps {
  currentColor?: string;
  onConfirm: (color: string) => void;
  onCancel: () => void;
}

const PRESET_COLORS = [
  { name: 'Default', value: '#ffffff' },
  { name: 'Light Blue', value: '#dbeafe' },
  { name: 'Light Green', value: '#dcfce7' },
  { name: 'Light Yellow', value: '#fef9c3' },
  { name: 'Light Red', value: '#fee2e2' },
  { name: 'Light Purple', value: '#f3e8ff' },
  { name: 'Light Orange', value: '#ffedd5' },
  { name: 'Light Pink', value: '#fce7f3' },
  { name: 'Light Cyan', value: '#cffafe' },
  { name: 'Light Lime', value: '#ecfccb' },
  { name: 'Light Amber', value: '#fef3c7' },
  { name: 'Light Rose', value: '#ffe4e6' },
  { name: 'Light Sky', value: '#e0f2fe' },
  { name: 'Light Indigo', value: '#e0e7ff' },
  { name: 'Light Teal', value: '#ccfbf1' },
  { name: 'Light Gray', value: '#f3f4f6' },
];

export default function ColorPicker({ currentColor, onConfirm, onCancel }: ColorPickerProps) {
  const { t } = useTranslation();
  const [selectedColor, setSelectedColor] = useState(currentColor || '#ffffff');
  const [customColor, setCustomColor] = useState(currentColor || '#ffffff');

  const handleConfirm = () => {
    onConfirm(selectedColor);
  };

  const handlePresetClick = (color: string) => {
    setSelectedColor(color);
    setCustomColor(color);
  };

  const handleCustomColorChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    const color = e.target.value;
    setCustomColor(color);
    setSelectedColor(color);
  };

  return (
    <div className="color-picker-overlay" onClick={onCancel}>
      <div className="color-picker-dialog" onClick={(e) => e.stopPropagation()}>
        {/* Header */}
        <div className="color-picker-header">
          <h3 className="color-picker-title">🎨 {t('colorPicker.title')}</h3>
          <button onClick={onCancel} className="color-picker-close">✕</button>
        </div>

        {/* Body */}
        <div className="color-picker-body">
          {/* Preview */}
          <div className="color-preview">
            <div 
              className="color-preview-box"
              style={{ backgroundColor: selectedColor }}
            >
              <span className="color-preview-text">{t('colorPicker.preview')}</span>
            </div>
            <div className="color-preview-value">{selectedColor}</div>
          </div>

          {/* Preset Colors */}
          <div className="preset-colors">
            <h4 className="preset-colors-title">{t('colorPicker.presets')}</h4>
            <div className="preset-colors-grid">
              {PRESET_COLORS.map((preset) => (
                <button
                  key={preset.value}
                  className={`preset-color-btn ${selectedColor === preset.value ? 'selected' : ''}`}
                  style={{ backgroundColor: preset.value }}
                  onClick={() => handlePresetClick(preset.value)}
                  title={preset.name}
                  aria-label={preset.name}
                >
                  {selectedColor === preset.value && <span className="check-mark">✓</span>}
                </button>
              ))}
            </div>
          </div>

          {/* Custom Color */}
          <div className="custom-color">
            <h4 className="custom-color-title">{t('colorPicker.custom')}</h4>
            <div className="custom-color-input-wrapper">
              <input
                type="color"
                value={customColor}
                onChange={handleCustomColorChange}
                className="custom-color-input"
              />
              <input
                type="text"
                value={customColor}
                onChange={handleCustomColorChange}
                className="custom-color-text"
                placeholder="#ffffff"
                maxLength={7}
              />
            </div>
          </div>
        </div>

        {/* Actions */}
        <div className="color-picker-actions">
          <button onClick={onCancel} className="button button-secondary">
            {t('colorPicker.cancel')}
          </button>
          <button onClick={handleConfirm} className="button">
            {t('colorPicker.apply')}
          </button>
        </div>
      </div>
    </div>
  );
}

