/**
 * ToolboxButton - Individual button component for Toolbox
 */

import { useState, useRef, useEffect } from 'react';
import './ToolboxButton.css';

interface ToolboxButtonProps {
  icon: React.ReactNode;
  label: string;
  onClick: () => void;
  active?: boolean;
  disabled?: boolean;
  shortcut?: string;
  'aria-label'?: string;
}

export default function ToolboxButton({
  icon,
  label,
  onClick,
  active = false,
  disabled = false,
  shortcut,
  'aria-label': ariaLabel
}: ToolboxButtonProps) {
  const [showTooltip, setShowTooltip] = useState(false);
  const timeoutRef = useRef<ReturnType<typeof setTimeout> | null>(null);
  const buttonRef = useRef<HTMLButtonElement>(null);

  const handleMouseEnter = () => {
    timeoutRef.current = setTimeout(() => {
      setShowTooltip(true);
    }, 500);
  };

  const handleMouseLeave = () => {
    if (timeoutRef.current) {
      clearTimeout(timeoutRef.current);
      timeoutRef.current = null;
    }
    setShowTooltip(false);
  };

  useEffect(() => {
    return () => {
      if (timeoutRef.current) {
        clearTimeout(timeoutRef.current);
      }
    };
  }, []);

  const handleClick = () => {
    if (!disabled) {
      onClick();
    }
  };

  const displayLabel = shortcut ? `${label} (${shortcut})` : label;

  return (
    <div className="toolbox-button-wrapper">
      <button
        ref={buttonRef}
        className={`toolbox-button ${active ? 'active' : ''} ${disabled ? 'disabled' : ''}`}
        onClick={handleClick}
        onMouseEnter={handleMouseEnter}
        onMouseLeave={handleMouseLeave}
        disabled={disabled}
        aria-label={ariaLabel || displayLabel}
        aria-pressed={active}
        title={displayLabel}
      >
        <span className="toolbox-button-icon">{icon}</span>
      </button>
      {showTooltip && !disabled && (
        <div className="toolbox-tooltip">
          {displayLabel}
        </div>
      )}
    </div>
  );
}

