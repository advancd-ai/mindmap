import { useEffect, useMemo, useState, useLayoutEffect, useRef } from 'react';
import {
  type Edge,
  type EdgeMarker,
  type EdgeStyle,
  type EdgeRouting,
} from '../store/mindmap';
import AppleIcon from './AppleIcon';
import './EdgeInspector.css';

type DashPreset = 'solid' | 'dashed' | 'dotted';

type InspectorSize = { width: number; height: number };

interface EdgeInspectorProps {
  position: { top: number; left: number };
  edge: Edge;
  disabled?: boolean;
  onChange: (updates: Partial<Edge>) => void;
  onClose?: () => void;
  onDelete?: () => void;
  onLayout?: (size: InspectorSize) => void;
  onDrag?: (delta: { x: number; y: number }) => void;
}

const DASH_PRESETS: Record<DashPreset, number[] | undefined> = {
  solid: undefined,
  dashed: [12, 6],
  dotted: [3, 6],
};

const ROUTING_OPTIONS: Array<{
  value: EdgeRouting;
  label: string;
}> = [
  {
    value: 'organic',
    label: 'Organic',
  },
  {
    value: 'straight',
    label: 'Direct',
  },
  {
    value: 'radial',
    label: 'Radial',
  },
  {
    value: 'spline',
    label: 'Spline',
  },
  {
    value: 'bundle',
    label: 'Bundle',
  },
  {
    value: 'orthogonal',
    label: 'Right Angle',
  },
  {
    value: 'hierarchical',
    label: 'Hierarchical',
  },
];

const DASH_OPTIONS: Array<{ value: DashPreset; label: string }> = [
  { value: 'solid', label: 'Solid' },
  { value: 'dashed', label: 'Dashed' },
  { value: 'dotted', label: 'Dotted' },
];

const MARKER_SELECT_OPTIONS: Array<{ value: EdgeMarker; label: string }> = [
  { value: 'none', label: 'None' },
  { value: 'arrow', label: 'Arrow' },
  { value: 'circle', label: 'Circle' },
];

function EdgePreview({
  color,
  width,
  dash,
  markerStart,
  markerEnd,
  variant = 'default',
}: {
  color: string;
  width: number;
  dash?: number[];
  markerStart: EdgeMarker;
  markerEnd: EdgeMarker;
  variant?: 'default' | 'compact';
}) {
  const strokeDasharray = dash ? dash.join(' ') : undefined;
  const markerStartId = markerStart !== 'none' ? `edge-preview-marker-${markerStart}` : undefined;
  const markerEndId = markerEnd !== 'none' ? `edge-preview-marker-${markerEnd}` : undefined;
  const size = variant === 'compact' ? { width: 60, height: 26 } : { width: 80, height: 32 };
  const padding = variant === 'compact' ? 6 : 8;
  const centerY = size.height / 2;
  return (
    <svg
      className={`edge-preview edge-preview--${variant}`}
      width={size.width}
      height={size.height}
      viewBox={`0 0 ${size.width} ${size.height}`}
    >
      <defs>
        <marker
          id="edge-preview-marker-arrow"
          viewBox="0 0 8 8"
          refX="7"
          refY="4"
          markerWidth="8"
          markerHeight="8"
          orient="auto-start-reverse"
        >
          <path d="M0 0 L8 4 L0 8 z" fill={color} />
        </marker>
        <marker
          id="edge-preview-marker-circle"
          viewBox="0 0 8 8"
          refX="4"
          refY="4"
          markerWidth="6"
          markerHeight="6"
          orient="auto"
        >
          <circle cx="4" cy="4" r="3" fill={color} />
        </marker>
      </defs>
      <line
        x1={padding}
        y1={centerY}
        x2={size.width - padding}
        y2={centerY}
        stroke={color}
        strokeWidth={width}
        strokeDasharray={strokeDasharray}
        markerStart={markerStartId ? `url(#${markerStartId})` : undefined}
        markerEnd={markerEndId ? `url(#${markerEndId})` : undefined}
        strokeLinecap="round"
      />
    </svg>
  );
}

export default function EdgeInspector({
  position,
  edge,
  disabled = false,
  onChange,
  onClose,
  onDelete,
  onLayout,
  onDrag,
}: EdgeInspectorProps) {
  const wrapperRef = useRef<HTMLDivElement | null>(null);
  const dragStateRef = useRef<{ x: number; y: number } | null>(null);
  const category = edge.category ?? 'branch';
  const isBoundary = category === 'boundary';
  const isStandard = !isBoundary;
  const [labelDraft, setLabelDraft] = useState(edge.label ?? '');
  const [boundaryTitle, setBoundaryTitle] = useState(edge.boundary?.title ?? '');
  const [boundaryPadding, setBoundaryPadding] = useState(edge.boundary?.padding ?? 36);
  const [boundaryTheme, setBoundaryTheme] = useState<'default' | 'info' | 'success' | 'warning'>(
    edge.boundary?.theme === 'info' ||
      edge.boundary?.theme === 'success' ||
      edge.boundary?.theme === 'warning'
      ? edge.boundary.theme
      : 'default'
  );
  const [boundaryShape, setBoundaryShape] = useState<'rounded' | 'organic'>(
    edge.boundary?.shape === 'organic' ? 'organic' : 'rounded'
  );
  useEffect(() => {
    setLabelDraft(edge.label ?? '');
    setBoundaryTitle(edge.boundary?.title ?? '');
    setBoundaryPadding(edge.boundary?.padding ?? 36);
    const nextTheme =
      edge.boundary?.theme === 'info' ||
      edge.boundary?.theme === 'success' ||
      edge.boundary?.theme === 'warning'
        ? edge.boundary.theme
        : 'default';
    const nextShape = edge.boundary?.shape === 'organic' ? 'organic' : 'rounded';
    setBoundaryTheme(nextTheme);
    setBoundaryShape(nextShape);
  }, [
    edge.id,
    edge.label,
    edge.boundary?.title,
    edge.boundary?.padding,
    edge.boundary?.theme,
    edge.boundary?.shape,
  ]);

  const strokeColor = edge.style?.strokeColor ?? '#1d4ed8';
  const strokeWidth = edge.style?.strokeWidth ?? 1.5;
  const strokeMin = 0.5;
  const strokeMax = 6;
  const dashPreset: DashPreset = useMemo(() => {
    const dash = edge.style?.dashPattern;
    if (!dash || dash.length === 0) return 'solid';
    if (dash[0] <= 3) return 'dotted';
    return 'dashed';
  }, [edge.style?.dashPattern]);

  const markerStart = edge.style?.markerStart ?? 'none';
  const markerEnd = edge.style?.markerEnd ?? 'arrow';
  const routing = edge.routing ?? 'straight';

  const widthPercent = useMemo(() => {
    const ratio = (strokeWidth - strokeMin) / (strokeMax - strokeMin);
    return Math.min(100, Math.max(0, ratio * 100));
  }, [strokeWidth]);

  useLayoutEffect(() => {
    if (!wrapperRef.current || !onLayout) return;

    const notify = () => {
      const rect = wrapperRef.current?.getBoundingClientRect();
      if (rect) {
        onLayout({ width: rect.width, height: rect.height });
      }
    };

    notify();

    const ro = new ResizeObserver(() => notify());
    ro.observe(wrapperRef.current);

    return () => {
      ro.disconnect();
    };
  }, [onLayout, edge.id, labelDraft, boundaryPadding]);

  const handleLabelCommit = () => {
    const trimmed = labelDraft.trim();
    if (!trimmed) {
      onChange({ label: undefined });
      setLabelDraft('');
    } else if (trimmed !== (edge.label ?? '').trim()) {
      onChange({ label: trimmed });
    }
  };

  const handleBoundaryCommit = (patch: Partial<NonNullable<Edge['boundary']>>) => {
    onChange({
      boundary: {
        ...(edge.boundary ?? { nodeIds: [] }),
        ...patch,
      },
    });
  };

  const applyStyle = (update: Partial<EdgeStyle>) => {
    onChange({
      style: {
        ...edge.style,
        ...update,
      },
    });
  };

  useEffect(() => {
    const handlePointerMove = (event: PointerEvent) => {
      if (!dragStateRef.current || !onDrag) return;
      if (!event.buttons) {
        dragStateRef.current = null;
        return;
      }

      event.preventDefault();
      const deltaX = event.clientX - dragStateRef.current.x;
      const deltaY = event.clientY - dragStateRef.current.y;
      dragStateRef.current = { x: event.clientX, y: event.clientY };
      onDrag({ x: deltaX, y: deltaY });
    };

    const handlePointerUp = () => {
      dragStateRef.current = null;
    };

    window.addEventListener('pointermove', handlePointerMove);
    window.addEventListener('pointerup', handlePointerUp);
    return () => {
      window.removeEventListener('pointermove', handlePointerMove);
      window.removeEventListener('pointerup', handlePointerUp);
    };
  }, [onDrag]);

  return (
    <div
      ref={wrapperRef}
      className="edge-inspector-wrapper"
      style={{ top: position.top, left: position.left }}
    >
      <div className="edge-inspector edge-inspector--compact">
        <header className="edge-inspector__header edge-inspector__header--compact">
          <div
            className="edge-inspector__title-block edge-inspector__title-block--compact"
            onPointerDown={(e) => {
              if (e.button !== 0 || !onDrag) return;
              dragStateRef.current = { x: e.clientX, y: e.clientY };
            }}
            role="button"
            tabIndex={0}
            onKeyDown={(e) => {
              if (!onDrag) return;
              if (e.key === 'ArrowUp') {
                e.preventDefault();
                onDrag({ x: 0, y: -12 });
              } else if (e.key === 'ArrowDown') {
                e.preventDefault();
                onDrag({ x: 0, y: 12 });
              } else if (e.key === 'ArrowLeft') {
                e.preventDefault();
                onDrag({ x: -12, y: 0 });
              } else if (e.key === 'ArrowRight') {
                e.preventDefault();
                onDrag({ x: 12, y: 0 });
              }
            }}
          >
            <AppleIcon name="bolt" size="medium" className="edge-inspector__title-icon" />
            <div className="edge-inspector__meta-row">
              <span className="edge-inspector__pill">{category}</span>
              {isStandard && (
                <>
                  <span className="edge-inspector__meta-dot" style={{ backgroundColor: strokeColor }} />
                  <span className="edge-inspector__meta-chip">{strokeWidth.toFixed(1)}px</span>
                </>
              )}
            </div>
          </div>
          {isStandard && (
            <EdgePreview
              color={strokeColor}
              width={strokeWidth}
              dash={edge.style?.dashPattern}
              markerStart={markerStart}
              markerEnd={markerEnd}
              variant="compact"
            />
          )}
          <button
            type="button"
            className="edge-inspector__header-close"
            onClick={onClose}
            aria-label="Close edge inspector"
          >
            <AppleIcon name="close" size="small" />
          </button>
        </header>

        {isStandard && (
          <section className="edge-inspector__section edge-inspector__section--compact edge-inspector__section--quick">
            <div className="edge-inspector__section-heading">
              <span className="edge-inspector__section-title">Quick Style</span>
            </div>

            <div className="edge-inspector__field">
              <div className="edge-inspector__field-header">
                <span className="edge-inspector__chip-label">Color</span>
              </div>
              <input
                type="color"
                className="edge-inspector__color"
                value={strokeColor}
                onChange={(e) => applyStyle({ strokeColor: e.target.value })}
                disabled={disabled}
              />
            </div>

            <div className="edge-inspector__field">
              <div className="edge-inspector__field-header">
                <span className="edge-inspector__chip-label">Width</span>
                <span className="edge-inspector__field-value">{strokeWidth.toFixed(1)}px</span>
              </div>
              <input
                type="range"
                min={strokeMin}
                max={strokeMax}
                step={0.25}
                value={strokeWidth}
                onChange={(e) =>
                  applyStyle({
                    strokeWidth: Math.min(strokeMax, Math.max(strokeMin, Number(e.target.value))),
                  })
                }
                disabled={disabled}
                className="edge-inspector__range edge-inspector__range--slim"
                style={{
                  background: `linear-gradient(90deg, #2563eb ${widthPercent}%, rgba(148, 163, 184, 0.25) ${widthPercent}%)`,
                }}
                aria-valuemin={strokeMin}
                aria-valuemax={strokeMax}
                aria-valuenow={strokeWidth}
                aria-label="Edge width"
              />
            </div>

            <div className="edge-inspector__field">
              <div className="edge-inspector__field-header">
                <span className="edge-inspector__chip-label">Dash</span>
              </div>
              <select
                id="edge-dash-select"
                className="edge-inspector__select edge-inspector__select--inline"
                value={dashPreset}
                onChange={(e) => {
                  const preset = e.target.value as DashPreset;
                  applyStyle({ dashPattern: DASH_PRESETS[preset] ?? [] });
                }}
                disabled={disabled}
              >
                {DASH_OPTIONS.map((option) => (
                  <option key={option.value} value={option.value}>
                    {option.label}
                  </option>
                ))}
              </select>
            </div>

            <div className="edge-inspector__field">
              <div className="edge-inspector__field-header">
                <span className="edge-inspector__chip-label">Markers</span>
              </div>
              <div className="edge-inspector__marker-select-group" role="group" aria-label="Markers">
                <label className="edge-inspector__marker-select">
                  <span className="edge-inspector__marker-label">Start</span>
                  <select
                    className="edge-inspector__select edge-inspector__select--inline"
                    value={markerStart}
                    onChange={(e) => applyStyle({ markerStart: e.target.value as EdgeMarker })}
                    disabled={disabled}
                  >
                    {MARKER_SELECT_OPTIONS.map((option) => (
                      <option key={`marker-start-${option.value}`} value={option.value}>
                        {option.label}
                      </option>
                    ))}
                  </select>
                </label>
                <label className="edge-inspector__marker-select">
                  <span className="edge-inspector__marker-label">End</span>
                  <select
                    className="edge-inspector__select edge-inspector__select--inline"
                    value={markerEnd}
                    onChange={(e) => applyStyle({ markerEnd: e.target.value as EdgeMarker })}
                    disabled={disabled}
                  >
                    {MARKER_SELECT_OPTIONS.map((option) => (
                      <option key={`marker-end-${option.value}`} value={option.value}>
                        {option.label}
                      </option>
                    ))}
                  </select>
                </label>
              </div>
            </div>
          </section>
        )}

        <section className="edge-inspector__section edge-inspector__section--compact">
          <div className="edge-inspector__section-heading edge-inspector__section-heading--tight">
            <span className="edge-inspector__section-title">Label</span>
            {/* Subtitle intentionally removed for compact layout */}
          </div>
          <textarea
            className="edge-inspector__textarea"
            value={labelDraft}
            onChange={(e) => setLabelDraft(e.target.value)}
            onBlur={handleLabelCommit}
            onKeyDown={(e) => {
              if (e.key === 'Enter' && !e.shiftKey) {
                e.preventDefault();
                handleLabelCommit();
              } else if (e.key === 'Escape') {
                e.preventDefault();
                setLabelDraft(edge.label ?? '');
              }
            }}
            placeholder="Describe the relationship"
            rows={2}
            maxLength={200}
            disabled={disabled}
          />
        </section>

        {isStandard && (
          <section className="edge-inspector__section edge-inspector__section--stacked">
            <div className="edge-inspector__label-row">
              <span className="edge-inspector__label edge-inspector__label--caps">Routing</span>
            </div>
            <select
              className="edge-inspector__select edge-inspector__select--inline"
              value={routing}
              onChange={(e) => onChange({ routing: e.target.value as EdgeRouting })}
              disabled={disabled}
              aria-label="Routing style"
            >
              {ROUTING_OPTIONS.map((option) => (
                <option key={option.value} value={option.value}>
                  {option.label}
                </option>
              ))}
            </select>
          </section>
        )}

        {isBoundary && (
          <section className="edge-inspector__section edge-inspector__section--stacked">
            <label className="edge-inspector__label">Boundary title</label>
            <input
              className="edge-inspector__input"
              value={boundaryTitle}
              onChange={(e) => setBoundaryTitle(e.target.value)}
              onBlur={() =>
                handleBoundaryCommit({ title: boundaryTitle.trim() || undefined })
              }
              placeholder="Group title"
              maxLength={80}
              disabled={disabled}
            />
            <label className="edge-inspector__label">Padding</label>
            <input
              type="range"
              min={12}
              max={120}
              step={2}
              value={boundaryPadding}
              onChange={(e) => {
                const value = Number(e.target.value);
                setBoundaryPadding(value);
                handleBoundaryCommit({ padding: value });
              }}
              disabled={disabled}
            />
            <span className="edge-inspector__value">{boundaryPadding}px</span>
            <label className="edge-inspector__label">Theme</label>
            <select
              className="edge-inspector__select"
              value={boundaryTheme}
              onChange={(e) => {
                const value = e.target.value as 'default' | 'info' | 'success' | 'warning';
                setBoundaryTheme(value);
                handleBoundaryCommit({ theme: value });
              }}
              disabled={disabled}
            >
              <option value="default">Default</option>
              <option value="info">Info</option>
              <option value="success">Success</option>
              <option value="warning">Warning</option>
            </select>
            <label className="edge-inspector__label">Shape</label>
            <select
              className="edge-inspector__select"
              value={boundaryShape}
              onChange={(e) => {
                const value = e.target.value as 'rounded' | 'organic';
                setBoundaryShape(value);
                handleBoundaryCommit({ shape: value });
              }}
              disabled={disabled}
            >
              <option value="rounded">Rounded</option>
              <option value="organic">Organic</option>
            </select>
          </section>
        )}

        <footer className="edge-inspector__footer">
          <button
            type="button"
            className="edge-inspector__button edge-inspector__button--ghost"
            onClick={onClose}
          >
            Save
          </button>
          <button
            type="button"
            className="edge-inspector__button edge-inspector__button--danger"
            onClick={onDelete}
            disabled={disabled || !onDelete}
          >
            <AppleIcon name="delete" size="small" /> Delete
          </button>
        </footer>
      </div>
    </div>
  );
}

