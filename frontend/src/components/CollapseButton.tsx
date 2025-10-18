/**
 * CollapseButton - Modern Apple-style collapse/expand button
 */

import './CollapseButton.css';

interface CollapseButtonProps {
  x: number;
  y: number;
  isCollapsed: boolean;
  onClick?: (e: React.MouseEvent) => void;
}

export default function CollapseButton({ x, y, isCollapsed }: CollapseButtonProps) {
  return (
    <g className="collapse-button">
      {/* Outer glow circle */}
      <circle
        cx={x}
        cy={y}
        r="14"
        fill="url(#collapseGlow)"
        opacity="0"
        className="collapse-button-glow"
      />
      
      {/* Background with gradient */}
      <circle
        cx={x}
        cy={y}
        r="10"
        fill="url(#collapseGradient)"
        className="collapse-button-bg"
      />
      
      {/* Border ring */}
      <circle
        cx={x}
        cy={y}
        r="10"
        fill="none"
        stroke={isCollapsed ? '#2563EB' : '#94A3B8'}
        strokeWidth="1.5"
        className="collapse-button-ring"
        opacity="0.6"
      />
      
      {/* Icon - using chevron style */}
      <g className="collapse-button-icon-wrapper">
        <text
          x={x}
          y={y}
          textAnchor="middle"
          dominantBaseline="middle"
          fill={isCollapsed ? '#2563EB' : '#1E293B'}
          fontWeight="600"
          pointerEvents="none"
          className="collapse-button-icon"
          style={{ 
            fontFamily: '-apple-system, BlinkMacSystemFont, "SF Pro Text", sans-serif',
            letterSpacing: '-0.5px',
            fontSize: '11px'
          }}
        >
          {isCollapsed ? '›' : '‹'}
        </text>
      </g>
      
      {/* Gradients definition */}
      <defs>
        <linearGradient id="collapseGradient" x1="0%" y1="0%" x2="0%" y2="100%">
          <stop offset="0%" stopColor="#FFFFFF" stopOpacity="0.98" />
          <stop offset="100%" stopColor="#F5F5F7" stopOpacity="0.95" />
        </linearGradient>
        <radialGradient id="collapseGlow">
          <stop offset="0%" stopColor="#2563EB" stopOpacity="0.2" />
          <stop offset="100%" stopColor="#2563EB" stopOpacity="0" />
        </radialGradient>
      </defs>
    </g>
  );
}
