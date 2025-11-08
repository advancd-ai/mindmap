# Edge Experience Design (XMind-Class)

## Vision
- Deliver expressive, visually rich connections between nodes that match the polish of tools such as XMind while remaining accessible to power keyboard users.
- Support structured thinking workflows: emphasize clarity for tree hierarchies, highlight relationships, and provide annotation space without clutter.

## Core Edge Types
- **Primary Branch**: default parent→child connector. Smooth quadratic/Bezier curve with optional elbow variant for org-chart layouts.
- **Relationship Edge**: freeform connection between any two nodes; supports arrowheads on either end, optional mid-node label bubbles, and dashed/colored styles to differentiate meaning (cause/effect, support/against, etc.).
- **Summary Edge**: stylized boundary arc that wraps multiple sibling nodes, similar to XMind “summary”. Includes configurable caption block.
- **Boundary Edge**: polygon or rounded rectangle overlay grouping nodes with themed background; edges emanating from boundary respect the contour.

## Visual Styling
- Style tokens tied to theme system (`edge.primary.stroke`, `edge.relationship.dash`, `edge.label.font`). Edge palette derives from node palette for cohesion.
- Width, dash pattern, arrowheads, and endpoint markers configurable per edge type.
- Auto-adjust contrast for dark/light backgrounds; respect high-contrast accessibility settings.
- Subtle shadow/glow when edge or connected nodes are focused, with configurable emphasis level.

## Interaction Model
- **Creation**
  - Drag from node handles with visual preview.
  - Keyboard shortcut (e.g., `L`) opens edge creation palette; arrow keys select target.
  - Relationship edges allow click-on-background to set bend points.
- **Editing**
  - Control points appear on hover/focus for fine-tuning curvature.
  - Context toolbar (floating) for style changes: thickness, color, arrowhead, label toggles.
  - Inline label editor activated via double-click or `Enter`.
  - Snap lines help align overlapping edges; grid-aware bending.
- **Selection**
  - Thickened stroke and glow when selected.
  - Multi-select via marquee or shift-click; bulk style changes applied through inspector.
  - Keyboard navigation: arrow keys hop between connected nodes/edges; tab cycles through overlapping edges.

## Edge Decorations
- Start/end markers: arrow, round, diamond, custom icon (library driven).
- Mid-edge badges: icons indicating relationship type (e.g., ✔, ✖, ⚠).
- Bracketed annotations: highlight segments with color spans.
- Animated pulse for active/highlighted edges (optional).

## Label System
- Labels support plain text, quick markdown (bold, italic, inline code), emoji.
- Auto-position along edge with options: center, near source/target, follow path.
- Prevent overlap with nodes by smart offset; labels remember manual drag positions.
- Popover inspector for metadata fields (priority, status, tags).

## Layout & Geometry
- Edge routing algorithm options:
  - Natural curves (default) following XMind organic style.
  - Orthogonal elbows for business diagrams.
  - Smart avoidance to reduce crossings; reroute when nodes move.
- Auto-spacing respects node bounding boxes and boundary regions.
- Hierarchy-aware tension parameter: deeper levels get tighter curves to shorten branch length.

## Data Model Extensions
- `edge.type`: `'branch' | 'relationship' | 'summary' | 'boundary' | 'custom'`
- `edge.style`: `{ strokeColor, strokeWidth, dash, arrowStart, arrowEnd }`
- `edge.geometry`: control points, routing mode, manual path overrides.
- `edge.label`: `{ text, richText, position, offset }`
- `edge.decorators`: array of markers/badges.
- Versioning fields to enable undo/history and collaboration diffs.

## Persistence & API
- Ensure git-friendly JSON: stable ordering, minimal float precision.
- Export/import compatibility with XMind `.xmind` relationship data for future interoperability.
- REST endpoints accept batch edge updates for reduced round-trips.
- Server-side validation of node existence, cycle prevention (if required).

## Performance Considerations
- Use memoized path computation keyed by node positions + style hash.
- GPU-accelerated rendering via SVG path caching or canvas layer for large maps.
- Progressive detail: simplify stroke decorations when zoomed out; restore on zoom in.

## Accessibility
- Text alternatives for labels; ARIA relationships linking source/target nodes.
- Keyboard-first workflows: all edge creation and styling reachable without mouse.
- High-contrast theme automatically adapts stroke colors and label backgrounds.

## Implementation Roadmap
- **Phase 1 – Foundations**
  - Extend schema/API to handle `edge.type`, styles, labels.
  - Render basic primary/relationship edges with selection & keyboard navigation parity.
  - Persist edge operations in Git providers.
- **Phase 2 – Styling & Editing**
  - Add context toolbar for stroke color/width, arrowheads, dash patterns.
  - Inline label editing with markdown support and positioning controls.
  - Smart routing improvements (auto curved/orthogonal mode).
- **Phase 3 – Advanced Structures**
  - Implement summary arcs and boundary regions.
  - Mid-edge decorations (badges, segment highlights) and snapping aids.
  - Batch edge updates, undo/redo integration.
- **Phase 4 – Polish & Interop**
  - Theme integration, accessibility refinements, performance optimization.
  - Export/import compatibility layers (e.g., XMind).
  - Collaborative conflict-handling strategies.

### Phase 2 Implementation Notes
- Inspector UX: floating panel near the selected edge’s midpoint containing color picker, stroke slider, dash presets, start/end marker toggles, routing toggle (organic ↔ orthogonal), and label position buttons.
- Label handling: render markdown text in edge labels; editor keeps lightweight single-line input but stores markdown syntax. Provide offset nudgers for fine placement.
- Routing: introduce orthogonal path generator (two/three segment polyline) that avoids node overlap; reuse organic curve for default.
- Persistence: reuse existing `updateEdge` action to apply atomic updates; ensure defaults remain backward-compatible.

### Phase 3 Plan (Summaries, Boundaries, Decorations)
- **Summary Arcs**
  - Input gesture: drag-select sibling nodes → toolbar action “Add Summary”.
  - Data model: `edge.category = 'summary'`, `summary.bounds` capturing arc span (start/end nodes) and title.
  - Rendering: bezier arc drawn above nodes, caption bubble anchored at midpoint; respects zoom; optional collapse toggle.
  - Editing: handles to adjust arc height/tension; inspector options for title, color theme, collapse default.
- **Boundary Regions**
  - Node grouping overlay (rounded rectangle / organic blob) defined by bounding box plus padding.
  - Stored as specialized edge with `category = 'boundary'` and `boundary.shape`, `boundary.padding`, `boundary.theme`.
  - Supports drag-resize, background fill, title label. Nodes remember boundary membership for edge routing constraints.
  - Integrate with auto-layout (nodes moved inside boundary update boundary bounds).
- **Decorations & Badges**
  - Extend `edge.decorators` to include icon badges (`type`, `color`) and segment highlights (position, length).
  - Inspector chips to add/remove badges; preview icons (support/against, risk, priority).
- **Snapping & Smart Alignment**
  - Show guide lines when edges nearly overlapping; snap control points to horizontal/vertical alignment.
  - Optional magnetic snapping to grid/padding when routing = orthogonal.
- **Batch Updates & Multi-select**
  - Shift-click edges or marquee selection to create selection set.
  - Inspector applies style changes to all selected edges; backend accepts array payload (`PATCH /edges`) for efficiency.
- **Undo/Redo Integration**
  - Wrap edge style/geometry updates in undoable transactions.
  - Ensure summary/boundary creation, resize, and deletion participate in history stack.
- **Milestones**
  1. Summary arc data model & renderer + inspector integration.
  2. Boundary region overlay + node membership management.
  3. Decorations & snapping aids.
  4. Batch updates + undo/redo extension + persistence polish.

## Open Questions
- Do we enforce tree constraints on primary branches to match XMind’s “balanced map” mode?
- How should shared styles be managed (theme presets vs per-edge overrides)?
- What default keyboard shortcuts align with existing map interactions?
- Do we introduce collaborative conflict resolution for simultaneous edge edits?


