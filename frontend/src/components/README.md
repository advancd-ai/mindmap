# MindMap Components

React components for the mindmap editor.

## Component Structure

```
MindMapCanvas (Container)
├── Node (Presentation)
│   └── ConnectionHandles
├── Edge (Presentation)
├── TemporaryEdge (Feedback)
└── ToolbarHelp (UI)
```

## Usage Examples

### Creating and Connecting Nodes

1. **Add nodes**: Click "Add Node" button
2. **Move nodes**: Click and drag anywhere on the node
3. **Connect nodes**:
   - Method 1: Click blue handles on selected node → click target node
   - Method 2: Click "Connect" button → click target node
4. **Cancel connection**: Press ESC or click "Cancel Connection"

### Console Debugging

Open browser console to see:
- `🔗 Starting connection from node: n_xxx`
- `🔗 Completing connection to node: n_yyy`
- `✅ Edge created: {...}`
- `⚠️ Edge already exists`
- `❌ Connection cancelled`

## Component Props

### Node.tsx
```typescript
{
  node: NodeType;              // Node data
  isSelected: boolean;         // Is this node selected?
  isDragging: boolean;         // Is this node being dragged?
  isConnecting: boolean;       // Are we in connection mode?
  isConnectionSource: boolean; // Is this the source of connection?
  onSelect: () => void;
  onDragStart: () => void;
  onStartConnection: () => void;
  onCompleteConnection: () => void;
}
```

### Edge.tsx
```typescript
{
  edge: EdgeType;      // Edge data
  sourceNode: Node;    // Source node
  targetNode: Node;    // Target node
  isSelected?: boolean;
  onClick?: () => void;
}
```

## Styling

Each component has its own CSS file:
- `Node.css` - Node styles, animations
- `Edge.css` - Edge hover effects
- `ConnectionHandles.css` - Handle styles
- `MindMapCanvas.css` - Canvas layout

