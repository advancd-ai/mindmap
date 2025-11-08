import { useEffect, useMemo, useState, useLayoutEffect, useRef } from 'react';
import {
  type Edge,
  type EdgeMarker,
  type EdgeStyle,
  type EdgeLabelPosition,
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

const MARKER_OPTIONS: EdgeMarker[] = ['none', 'arrow', 'circle'];
const LABEL_POSITIONS: EdgeLabelPosition[] = ['source', 'middle', 'target'];
const ROUTING_OPTIONS: Array<{
  value: EdgeRouting;
  label: string;
  description: string;
  icon: string;
}> = [
  {
    value: 'organic',
    label: 'Organic',
    description: 'Natural bezier sweep for mind map branches.',
    icon: '🌿',
  },
  {
    value: 'straight',
    label: 'Direct',
    description: 'Shortest line between nodes.',
    icon: '—',
  },
  {
    value: 'radial',
    label: 'Radial',
    description: 'Arc that fans around the source node.',
    icon: '◴',
  },
  {
    value: 'spline',
    label: 'Spline',
    description: 'Soft S-curve for weaving through dense clusters.',
    icon: '∿',
  },
  {
    value: 'bundle',
    label: 'Bundle',
    description: 'Shared trunk with a gentle fan-out.',
    icon: '≋',
  },
  {
    value: 'orthogonal',
    label: 'Right Angle',
    description: 'L-shaped elbows ideal for diagrams.',
    icon: '┐',
  },
  {
    value: 'hierarchical',
    label: 'Hierarchical',
    description: 'Tiered top-to-bottom alignment.',
    icon: '⇵',
  },
];

function EdgePreview({
  color,
  width,
  dash,
  markerStart,
  markerEnd,
}: {
  color: string;
  width: number;
  dash?: number[];
  markerStart: EdgeMarker;
  markerEnd: EdgeMarker;
}) {
  const strokeDasharray = dash ? dash.join(' ') : undefined;
  const markerStartId = markerStart !== 'none' ? `edge-preview-marker-${markerStart}` : undefined;
  const markerEndId = markerEnd !== 'none' ? `edge-preview-marker-${markerEnd}` : undefined;
  return (
    <svg className="edge-preview" width={80} height={32} viewBox="0 0 80 32">
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
        x1={8}
        y1={16}
        x2={72}
        y2={16}
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
  const [showAdvanced, setShowAdvanced] = useState(false);

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
  const activeRouting = ROUTING_OPTIONS.find((option) => option.value === routing) ?? ROUTING_OPTIONS[0];
  const labelPosition = edge.labelPosition ?? 'middle';
  const offset = edge.labelOffset ?? { x: 0, y: 0 };

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

  const applyLabelPosition = (position: EdgeLabelPosition) => {
    onChange({ labelPosition: position });
  };

  const nudgeLabel = (dx: number, dy: number) => {
    onChange({
      labelOffset: {
        x: (edge.labelOffset?.x ?? 0) + dx,
        y: (edge.labelOffset?.y ?? 0) + dy,
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

  const markerButton = (value: EdgeMarker, current: EdgeMarker, onSelect: (val: EdgeMarker) => void) => (
    <button
      key={value}
      type="button"
      className={`edge-inspector__toggle edge-inspector__toggle--compact ${current === value ? 'active' : ''}`}
      onClick={() => onSelect(value)}
      disabled={disabled}
    >
      {value}
    </button>
  );

  return (
    <div
      ref={wrapperRef}
      className="edge-inspector-wrapper"
      style={{ top: position.top, left: position.left }}
    >
      <div className="edge-inspector">
        <header className="edge-inspector__header edge-inspector__header--modern">
          <div
            className="edge-inspector__title-block"
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
            <div>
              <div className="edge-inspector__title-text">Edge Style</div>
              <div className="edge-inspector__meta-row">
                <span className="edge-inspector__pill">{category}</span>
                {isStandard && (
                  <>
                    <span className="edge-inspector__meta-dot" style={{ backgroundColor: strokeColor }} />
                    <span className="edge-inspector__meta-chip">{strokeWidth.toFixed(2)}px</span>
                  </>
                )}
              </div>
            </div>
          </div>
          {isStandard && (
            <EdgePreview
              color={strokeColor}
              width={strokeWidth}
              dash={edge.style?.dashPattern}
              markerStart={markerStart}
              markerEnd={markerEnd}
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

        <section className="edge-inspector__section">
          <label className="edge-inspector__label edge-inspector__label--caps">Label</label>
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
            placeholder="Describe the relationship (Markdown supported)"
            rows={3}
            maxLength={200}
            disabled={disabled}
          />
        </section>

        {isStandard && (
          <section className="edge-inspector__section">
            <div className="edge-inspector__dash-row">
              <label className="edge-inspector__label edge-inspector__label--caps">Dash</label>
              <div className="edge-inspector__toggle-group" role="group" aria-label="Dash pattern">
                {(Object.keys(DASH_PRESETS) as DashPreset[]).map((preset) => (
                  <button
                    key={preset}
                    type="button"
                    className={`edge-inspector__toggle edge-inspector__toggle--compact ${dashPreset === preset ? 'active' : ''}`}
                    onClick={() =>
                      applyStyle({
                        dashPattern: DASH_PRESETS[preset] ?? [],
                      })
                    }
                    disabled={disabled}
                  >
                    {preset.charAt(0).toUpperCase() + preset.slice(1)}
                  </button>
                ))}
              </div>
            </div>

            <div className="edge-inspector__row edge-inspector__row--appearance">
              <label className="edge-inspector__label edge-inspector__label--caps">Color</label>
              <input
                type="color"
                className="edge-inspector__color"
                value={strokeColor}
                onChange={(e) => applyStyle({ strokeColor: e.target.value })}
                disabled={disabled}
              />
            </div>

            <div className="edge-inspector__width-section">
              <div className="edge-inspector__label-row edge-inspector__label-row--tight">
                <span className="edge-inspector__label edge-inspector__label--caps">Width</span>
                <span className="edge-inspector__label-value">{strokeWidth.toFixed(2)}px</span>
              </div>
              <div className="edge-inspector__range-wrapper">
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
                  className="edge-inspector__range"
                  style={{
                    background: `linear-gradient(90deg, #2563eb ${widthPercent}%, rgba(148, 163, 184, 0.3) ${widthPercent}%)`,
                  }}
                  aria-valuemin={strokeMin}
                  aria-valuemax={strokeMax}
                  aria-valuenow={strokeWidth}
                  aria-label="Edge width"
                />
                <div className="edge-inspector__range-marks">
                  <span>{`${strokeMin.toFixed(1)}px`}</span>
                  <span className="edge-inspector__range-value">{strokeWidth.toFixed(2)}px</span>
                  <span>{`${strokeMax.toFixed(0)}px`}</span>
                </div>
              </div>
            </div>

            <div className="edge-inspector__markers-inline" role="group" aria-label="Markers">
              <span className="edge-inspector__label edge-inspector__label--caps">Start</span>
              {MARKER_OPTIONS.map((option) =>
                markerButton(option, markerStart, (value) => applyStyle({ markerStart: value })),
              )}
              <span className="edge-inspector__label edge-inspector__label--caps edge-inspector__label--markers">End</span>
              {MARKER_OPTIONS.map((option) =>
                markerButton(option, markerEnd, (value) => applyStyle({ markerEnd: value })),
              )}
            </div>
          </section>
        )}

        {isStandard && (
          <>
            <section className="edge-inspector__section edge-inspector__section--stacked">
              <div className="edge-inspector__label-row">
                <span className="edge-inspector__label edge-inspector__label--caps">Routing</span>
                <span className="edge-inspector__label-hint">Choose how this edge flows between nodes.</span>
              </div>
              <div className="edge-inspector__routing-grid" role="list">
                {ROUTING_OPTIONS.map((option) => {
                  const isActive = routing === option.value;
                  return (
                    <button
                      key={option.value}
                      type="button"
                      className={`edge-inspector__routing-option ${isActive ? 'active' : ''}`}
                      onClick={() => {
                        if (option.value !== routing) {
                          onChange({ routing: option.value });
                        }
                      }}
                      disabled={disabled}
                      aria-pressed={isActive}
                    >
                      <span className="edge-inspector__routing-icon" aria-hidden="true">
                        {option.icon}
                      </span>
                      <span className="edge-inspector__routing-text">
                        <span className="edge-inspector__routing-label">{option.label}</span>
                        <span className="edge-inspector__routing-description">{option.description}</span>
                      </span>
                    </button>
                  );
                })}
              </div>
              <div className="edge-inspector__routing-summary" aria-live="polite">
                <span className="edge-inspector__routing-summary-label">{activeRouting.icon}</span>
                <div>
                  <div className="edge-inspector__routing-summary-title">{activeRouting.label}</div>
                  <div className="edge-inspector__routing-summary-hint">{activeRouting.description}</div>
                </div>
              </div>
            </section>

            <section className="edge-inspector__section edge-inspector__section--stacked">
              <div className="edge-inspector__label-row">
                <span className="edge-inspector__label edge-inspector__label--caps">Label Position</span>
                <span className="edge-inspector__label-hint">Adjust anchor and offsets</span>
              </div>
              <div className="edge-inspector__segmented edge-inspector__segmented--full" role="group" aria-label="Label Position">
                {LABEL_POSITIONS.map((position) => (
                  <button
                    key={position}
                    type="button"
                    className={labelPosition === position ? 'active' : ''}
                    onClick={() => applyLabelPosition(position)}
                    disabled={disabled}
                  >
                    {position.charAt(0).toUpperCase() + position.slice(1)}
                  </button>
                ))}
              </div>

              <div className="edge-inspector__nudgers" aria-label="Offset controls">
                <button type="button" onClick={() => nudgeLabel(0, -6)} disabled={disabled}>
                  ↑
                </button>
                <div className="edge-inspector__nudgers-middle">
                  <button type="button" onClick={() => nudgeLabel(-6, 0)} disabled={disabled}>
                    ←
                  </button>
                  <span className="edge-inspector__offset">
                    {offset.x}, {offset.y}
                  </span>
                  <button type="button" onClick={() => nudgeLabel(6, 0)} disabled={disabled}>
                    →
                  </button>
                </div>
                <button type="button" onClick={() => nudgeLabel(0, 6)} disabled={disabled}>
                  ↓
                </button>
              </div>

              <button
                type="button"
                className="edge-inspector__reset-button"
                onClick={() => onChange({ labelOffset: { x: 0, y: 0 } })}
                disabled={disabled}
              >
                <AppleIcon name="refresh" size="small" /> Reset offset
              </button>

              <button
                type="button"
                className="edge-inspector__advanced-toggle"
                onClick={() => setShowAdvanced((prev) => !prev)}
                aria-expanded={showAdvanced}
              >
                <AppleIcon name={showAdvanced ? 'chevron.up' : 'chevron.down'} size="small" />
                Advanced label controls
              </button>
              {showAdvanced && (
                <div className="edge-inspector__advanced">
                  <p className="edge-inspector__helper">Use the nudgers or enter precise offsets above.</p>
                </div>
              )}
            </section>
          </>
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
            <AppleIcon name="delete" size="small" /> Delete Edge
          </button>
        </footer>
      </div>
    </div>
  );
}

