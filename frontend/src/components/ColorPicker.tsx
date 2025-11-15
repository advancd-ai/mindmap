/**
 * ColorPicker - Node background color picker
 */

import { useEffect, useRef, useState } from 'react';
import { useTranslation } from 'react-i18next';
import './ColorPicker.css';

interface ColorPickerProps {
  currentColor?: string;
  onConfirm: (color: string) => void;
  onCancel: () => void;
}

const PRESET_COLORS = [
  // Core colors
  { name: 'Red', value: '#E53935' },
  { name: 'Orange', value: '#FB8C00' },
  { name: 'Yellow', value: '#FDD835' },
  { name: 'Lime', value: '#C0CA33' },
  { name: 'Green', value: '#43A047' },
  { name: 'Teal', value: '#00897B' },
  { name: 'Blue', value: '#1E88E5' },
  { name: 'Purple', value: '#8E24AA' },

  // Pastel set
  { name: 'Pastel Red', value: '#FF8A80' },
  { name: 'Pastel Orange', value: '#FFCC80' },
  { name: 'Pastel Yellow', value: '#FFF59D' },
  { name: 'Pastel Lime', value: '#E6EE9C' },
  { name: 'Pastel Green', value: '#A5D6A7' },
  { name: 'Pastel Teal', value: '#80CBC4' },
  { name: 'Pastel Blue', value: '#90CAF9' },
  { name: 'Pastel Purple', value: '#CE93D8' },

  // Dark/Vibrant set
  { name: 'Dark Red', value: '#B71C1C' },
  { name: 'Dark Orange', value: '#E65100' },
  { name: 'Dark Yellow', value: '#F9A825' },
  { name: 'Dark Green', value: '#2E7D32' },
  { name: 'Dark Teal', value: '#00695C' },
  { name: 'Dark Blue', value: '#1565C0' },
  { name: 'Dark Indigo', value: '#283593' },
  { name: 'Dark Purple', value: '#6A1B9A' },
];
const PRESET_COLUMNS = 6;


export default function ColorPicker({ currentColor, onConfirm, onCancel }: ColorPickerProps) {
  const { t } = useTranslation();
  const [selectedColor, setSelectedColor] = useState(currentColor || '#ffffff');
  const [customColor, setCustomColor] = useState(currentColor || '#ffffff');
  const initialPresetIndex = Math.max(
    0,
    PRESET_COLORS.findIndex((preset) => preset.value === (currentColor || '#ffffff'))
  );
  const [focusedPresetIndex, setFocusedPresetIndex] = useState(initialPresetIndex);
  const presetRefs = useRef<Array<HTMLButtonElement | null>>([]);
  const dialogRef = useRef<HTMLDivElement | null>(null);

  useEffect(() => {
    const presetIndex = Math.max(
      0,
      PRESET_COLORS.findIndex((preset) => preset.value === (currentColor || '#ffffff'))
    );
    setFocusedPresetIndex(presetIndex);
    setSelectedColor(currentColor || '#ffffff');
    setCustomColor(currentColor || '#ffffff');
  }, [currentColor]);

  useEffect(() => {
    const button = presetRefs.current[focusedPresetIndex];
    button?.focus();
  }, [focusedPresetIndex]);

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

  const handleDialogKeyDown = (event: React.KeyboardEvent<HTMLDivElement>) => {
    const activeElement = document.activeElement as HTMLElement | null;
    const isFocusedPreset = presetRefs.current.some((el) => el === activeElement);

    if (!isFocusedPreset) {
      if (event.key === 'Escape') {
        onCancel();
        event.preventDefault();
        event.stopPropagation();
      }
      return;
    }

    const total = PRESET_COLORS.length;
    let nextIndex = focusedPresetIndex;
    let handled = false;

    switch (event.key) {
      case 'ArrowRight':
        nextIndex = (focusedPresetIndex + 1) % total;
        handled = true;
        break;
      case 'ArrowLeft':
        nextIndex = (focusedPresetIndex - 1 + total) % total;
        handled = true;
        break;
      case 'ArrowDown':
        nextIndex = (focusedPresetIndex + PRESET_COLUMNS) % total;
        handled = true;
        break;
      case 'ArrowUp':
        nextIndex = (focusedPresetIndex - PRESET_COLUMNS + total) % total;
        handled = true;
        break;
      case 'Enter':
      case ' ':
        handlePresetClick(PRESET_COLORS[focusedPresetIndex].value);
        handled = true;
        break;
      case 'Escape':
        onCancel();
        handled = true;
        break;
      default:
        break;
    }

    if (handled) {
      event.preventDefault();
      event.stopPropagation();
      setFocusedPresetIndex(nextIndex);
    }
  };

  return (
    <div className="color-picker-overlay" onClick={onCancel}>
      <div
        className="color-picker-dialog"
        onClick={(e) => e.stopPropagation()}
        onKeyDown={handleDialogKeyDown}
        ref={dialogRef}
      >
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
              {PRESET_COLORS.map((preset, index) => (
                <button
                  key={preset.value}
                  className={`preset-color-btn ${selectedColor === preset.value ? 'selected' : ''}`}
                  style={{ backgroundColor: preset.value }}
                  onClick={() => handlePresetClick(preset.value)}
                  title={preset.name}
                  aria-label={preset.name}
                  ref={(el) => {
                    presetRefs.current[index] = el;
                  }}
                  tabIndex={focusedPresetIndex === index ? 0 : -1}
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

