# Open Mindmap User Manual

**Version**: 1.0  
**Last Updated**: 2025-01-XX

## 📋 Table of Contents

1. [Getting Started](#getting-started)
2. [Basic Concepts](#basic-concepts)
3. [Working with Nodes](#working-with-nodes)
4. [Working with Edges](#working-with-edges)
5. [Edit Modes](#edit-modes)
6. [Toolbox](#toolbox)
7. [Keyboard Shortcuts](#keyboard-shortcuts)
8. [Advanced Features](#advanced-features)
9. [Sharing & Collaboration](#sharing--collaboration)
10. [Saving & Synchronization](#saving--synchronization)
11. [Troubleshooting](#troubleshooting)

---

## Getting Started

### First Login

1. **Sign in with Google**
   - Click "Sign in with Google" button
   - Select Google account and grant permissions
   - Your personal storage will be created automatically

2. **Start as Guest**
   - Click "Continue as Guest" button
   - Use immediately without signing in
   - ⚠️ Guest mode uses a shared repository for all guests

### Understanding the Dashboard

The dashboard is the center for managing all your mindmaps:

- **Mindmap List**: All your mindmaps are displayed as cards
- **Search**: Search mindmaps by title or tags in the search bar
- **Create New Mindmap**: Click "+ Create New Mind Map" button
- **Mindmap Info**: Each card shows node count, edge count, and last modified time

### Creating Your First Mindmap

1. Click **"+ Create New Mind Map"** in the dashboard
2. Enter mindmap title (e.g., "Project Plan")
3. Add tags (optional, comma-separated)
4. Click **"Create Mind Map"**
5. You'll be automatically redirected to the editor page

---

## Basic Concepts

### What is a Mindmap?

A mindmap is a tool for visually organizing ideas:

- **Node**: A box representing each idea or concept
- **Edge**: A connection line showing relationships between nodes
- **Root Node**: The central starting node of the mindmap

### Canvas Controls

- **Zoom**: Use mouse wheel or zoom buttons in the toolbox
- **Pan**: Drag the background to move the view
- **Fit to Screen**: Automatically adjust to fit all nodes on screen
- **Center View**: Position the root node at the center of the screen

---

## Working with Nodes

### Creating Nodes

#### Method 1: Using Toolbox
1. Click **"➕ Add Node"** button in the left toolbox
2. If a node is selected, it will be created nearby
3. If no node is selected, it will be created at the center of the canvas

#### Method 2: Keyboard Shortcut
- Press **`a`** or **`A`** key
- Works regardless of input language

#### Method 3: Right-click Menu
- Right-click canvas → **"Add Node Here"**
- Right-click node → **"Add Child Node"**

### Selecting Nodes

- **Click**: Click a node to select it
- **Deselect**: Click background or press **`Esc`** key
- Selected nodes are highlighted with a blue border

### Moving Nodes

- **Drag & Drop**: Click and drag a node to move it
- Connected edges automatically follow the node

### Resizing Nodes

1. Select a node
2. Drag one of the **8 handles** on the corners or edges
3. Adjust to desired size

### Changing Node Shape

Nodes support various shapes:

- **Rectangle**: Default shape
- **Circle**: For nodes that need emphasis
- **Diamond**: For decision points
- **Hexagon**: For process steps
- **Cloud**: For ideas or concepts
- **Capsule**: For action items
- **File**: For document or file references
- **Card**: For information cards

**How to Change**:
1. Right-click node
2. Select **"Change Shape"**
3. Choose desired shape

### Collapsing/Expanding Nodes

- Click the **"‹"** button at the top-right of the node
- Collapsed nodes hide child nodes and connections
- Click again to expand

### Deleting Nodes

1. Select the node to delete
2. Press **`d`** or **`D`** key (or **`Delete`** / **`Backspace`**)
3. Click "Confirm" in the confirmation dialog
4. ⚠️ Connected edges will also be deleted

### Editing Nodes

There are three ways to edit nodes:

#### 1. Double-click (Inline Edit)
- Double-click a node to edit directly on the node
- Quick editing without popups
- **`Alt + Enter`** to save, **`Esc`** to cancel

#### 2. Edit Button (Modal Edit)
- Click the **"✏️ Edit"** button that appears when a node is selected
- Opens a large editing window
- Suitable for long text or content with rich formatting

#### 3. Keyboard Shortcut
- Select a node and press **`e`** or **`E`** key
- Enters modal edit mode

---

## Working with Edges

### Creating Edges

#### Method 1: Using Node Handles
1. Select a node
2. Click the **blue handle** on the node edge
3. Drag to another node
4. Release mouse button on the target node

#### Method 2: Using Toolbox
1. Select the starting node
2. Click **"🔗 Connect"** button in the left toolbox
3. Click the target node
4. Automatically connects in auto mode

#### Method 3: Right-click Menu
1. Right-click node
2. Select **"Connect"**
3. Click target node

### Selecting Edges

- **Click**: Click on the edge line to select it
- Selected edges are displayed with a thicker line

### Changing Edge Type

Edges support three types:

- **Straight**: Simple connection
- **Curved**: Smooth connection
- **Bezier**: Complex curved connection

**How to Change**:
1. Right-click edge
2. Select **"Edge Type"**
3. Choose desired type

### Adding Edge Labels

1. Double-click edge or right-click → **"Add Label"**
2. Enter label text
3. Label is displayed at the center of the edge

### Deleting Edges

1. Select the edge to delete
2. Press **`d`** or **`D`** key (or **`Delete`** / **`Backspace`**)
3. Click "Confirm" in the confirmation dialog

---

## Edit Modes

Open Mindmap provides three edit modes:

### 1. Text Mode (Inline Edit)

**Features**:
- Suitable for quick text modifications
- Edit directly on the node
- No formatting support

**How to Use**:
- Double-click a node with `contentType: 'text'`
- Or click "📄 Text Editor" button in node header

**Shortcuts**:
- **`Enter`**: Save and exit (single line)
- **`Alt + Enter`**: Save and exit (multi-line)
- **`Esc`**: Cancel

### 2. Rich Editor Mode (WYSIWYG Edit)

**Features**:
- Edit formatted text (Bold, Italic, Underline, Link, etc.)
- Support for rich content like images and links
- Large editing window (modal or inline)

**How to Use**:
- Double-click node → Inline edit
- Select node and click edit button → Modal edit
- Click **"📝 Rich Editor"** button in toolbox

**Shortcuts**:
- **`Alt + Enter`**: Save and exit
- **`Ctrl/Cmd + B`**: Bold
- **`Ctrl/Cmd + I`**: Italic
- **`Ctrl/Cmd + U`**: Underline
- **`Ctrl/Cmd + K`**: Insert/Edit Link
- **`Shift + Ctrl/Cmd + V`**: Paste plain text

### 3. Markdown Editor Mode

**Features**:
- Write structured text using Markdown syntax
- Support for advanced syntax like code blocks and tables
- Real-time preview (Split View)

**How to Use**:
- Double-click node → Inline edit
- Click **"📄 Markdown Editor"** button in toolbox → Modal edit

**Shortcuts**:
- **`Alt + Enter`**: Save and exit
- **`Tab`**: 2-space indent

**Markdown Syntax Example**:
```markdown
# Heading 1
## Heading 2
**Bold** *Italic*
- List item 1
- List item 2
```

### Mode Switching

1. **Using Toolbox**: Select node and click edit mode button in toolbox
2. **Node Header Button**: Click button displayed in Text mode node header
3. **Auto Selection**: Appropriate mode is automatically selected based on node's `contentType`

---

## Toolbox

The toolbox is a floating panel located on the left side of the editor.

### Position & Design

- **Position**: Left center of editor
- **Design**: Apple-style translucent background with blur effect
- **Fixed**: Always stays in the same position regardless of scroll

### Tool Configuration

#### 1. Node Creation Tool
- **➕ Add Node**: Add new node
- Creates near selected node if one is selected
- Creates at canvas center if no node is selected

#### 2. Selection Tool
- **👆 Select**: Activate selection mode

#### 3. Connection Tool
- **🔗 Connect**: Activate node connection mode
- Only displayed when node is selected
- Operates in auto connection mode

#### 4. Edit Tool
- **✏️ Edit**: Enter edit mode for selected node
- Only displayed when node is selected

#### 5. Delete Tool
- **🗑️ Delete**: Delete selected node/edge
- Only displayed when node/edge is selected

#### 6. Shape Change Tool
- **🔷 Shape**: Change node shape
- Only displayed when node is selected

#### 7. Embed Tool
- **📎 Embed**: Embed YouTube videos or web pages
- Only displayed when node is selected

#### 8. Zoom & View Controls
- **🔍 Zoom In**: Zoom in
- **🔍 Zoom Out**: Zoom out
- **📐 Fit to Screen**: Adjust to fit all nodes on screen
- **🎯 Center View**: Position root node at screen center

### Dynamic Display

The toolbox dynamically displays based on current selection state:

- **No Node Selected**: Only basic tools displayed (Add Node, Select, Zoom, etc.)
- **Node Selected**: Additional tools displayed (Edit, Delete, Connect, Shape Change, etc.)
- **Edge Selected**: Only edge-related tools displayed

---

## Keyboard Shortcuts

### Node Operations

| Shortcut | Action |
|----------|--------|
| `a` / `A` | Add node ✅ |
| `e` / `E` | Enter edit mode for selected node ✅ |
| `d` / `D` | Delete selected node/edge ✅ |
| `Delete` / `Backspace` | Delete selected node/edge ✅ |
| `Enter` | Enter inline edit mode for selected node ✅ |

### Edge Operations

| Shortcut | Action |
|----------|--------|
| `d` / `D` | Delete selected edge ✅ |
| `Delete` / `Backspace` | Delete selected edge ✅ |

### Edit Shortcuts

| Shortcut | Action |
|----------|--------|
| `Alt + Enter` | Save and exit |
| `Ctrl/Cmd + Enter` | Save |
| `Esc` | Cancel |

### Rich Editor Formatting

| Shortcut | Action |
|----------|--------|
| `Ctrl/Cmd + B` | Bold |
| `Ctrl/Cmd + I` | Italic |
| `Ctrl/Cmd + U` | Underline |
| `Ctrl/Cmd + K` | Link |
| `Shift + Ctrl/Cmd + V` | Paste plain text |

### Canvas Operations

| Shortcut | Action |
|----------|--------|
| `Esc` | Deselect / Reset state |
| `Ctrl/Cmd + V` | Paste image (when canvas is focused) |

### Quick Workflows

#### Quick Node Add & Edit
1. Press **`a`** key → Add new node
2. Press **`e`** key on automatically selected new node → Enter edit mode
3. Modify content
4. **`Alt + Enter`** → Save and exit

#### Quick Edit
1. Click node → Node selected
2. Press **`Enter`** key → Enter inline edit mode
3. Modify content
4. **`Alt + Enter`** → Save and exit

> **Note**: Keyboard shortcuts work regardless of input language (`e.code` is used). Shortcuts are ignored during IME input (while typing Korean/Chinese/Japanese).

For more details, see the [Keyboard Shortcuts Guide](./keyboard-shortcut.md).

---

## Advanced Features

### Working with Images

#### Creating Image Nodes

**Method 1: Paste Image**
1. Copy image to clipboard (e.g., screenshot, image file)
2. Press **`Ctrl/Cmd + V`** when canvas is focused
3. Image node is automatically created

**Method 2: Upload Image File**
1. Right-click node → **"Add Image"**
2. Select image file
3. Convert to image node after upload

#### Image Display

- Image nodes automatically adjust to image size
- Image nodes can be moved, resized, and connected like regular nodes

### Embedding Content

#### Embedding YouTube Videos

1. Select node
2. Right-click → **"Add Embed"** → **"YouTube"**
3. Enter YouTube URL (e.g., `https://www.youtube.com/watch?v=...`)
4. Video is embedded in the node

#### Embedding Web Pages

1. Select node
2. Right-click → **"Add Embed"** → **"Web Page"**
3. Enter web page URL
4. Web page preview is displayed in the node

### Text Alignment

You can adjust text alignment within nodes:

**Horizontal Alignment**:
- **Left**
- **Center**
- **Right**

**Vertical Alignment**:
- **Top**
- **Middle**
- **Bottom**

**How to Change**:
1. Right-click node
2. Select **"Text Align"**
3. Choose horizontal/vertical alignment

### PDF Export & View

#### View PDF

1. Click **"👁️ View PDF"** button in editor header
2. Current mindmap is rendered as PDF
3. Preview PDF in new tab

#### PDF Features

- All nodes and connections are included
- Images and embedded content are also included
- Korean font support (Noto CJK)
- PDF view available on share page as well

### Context Menu

Right-clicking on nodes, edges, or canvas displays a context menu:

**Node Context Menu**:
- Edit
- Add Child Node
- Connect
- Change Shape
- Add Embed
- Add Image
- Text Align
- Delete

**Edge Context Menu**:
- Add Label
- Edge Type
- Delete

**Canvas Context Menu**:
- Add Node Here

---

## Sharing & Collaboration

### Sharing Mindmaps

#### Creating Share Link

1. Click **"🔗 Share"** button in editor header
2. Select share settings:
   - **Read-only**: Other users can only view
   - **Editable**: Other users can also edit
3. Copy share link
4. Share link with other users

#### Share Page Features

- Accessible via share link
- Viewable without login (read-only mode)
- PDF view feature supported
- Zoom, Fit to Screen, Center View available in toolbox

### Guest Mode

Guest mode allows immediate use without login:

- **Advantages**: Quick start, no account needed
- **Disadvantages**: Uses shared repository for all guests
- **Recommended**: Suitable for testing or temporary work

Mindmaps created in guest mode:
- Can be viewed by other guest users
- Can be migrated to personal storage after Google login (planned for future)

---

## Saving & Synchronization

### Auto Save

- Mindmaps are automatically saved to **GitHub**
- Each mindmap is stored in a separate Git branch
- Changes are recorded as Git commits

### Manual Save

1. Click **"💾 Save (Preview)"** button in editor header
2. Review changes in JSON Preview dialog
3. Click **"Confirm & Save"**
4. Saved to GitHub

### Repository Structure

```
Repository: {username}/mindmap-data

Branches:
├── main                     # Documentation (README.md)
├── maps/map_1234567890     # Mindmap 1
│   └── map.json
├── maps/map_9876543210     # Mindmap 2
│   └── map.json
└── maps/map_5678901234     # Mindmap 3
    └── map.json
```

### Version Control

- Version number automatically increments with each save
- Previous versions can be viewed via Git history
- Current version number displayed in footer

### Synchronization

- Access the same mindmap from multiple devices by logging in with the same Google account
- Real-time synchronization is not currently supported (planned for future)
- Refresh on another device after saving to see the latest version

---

## Troubleshooting

### Common Issues

#### Q: Nodes are not visible
**A**: 
- Click **Fit to Screen** button to fit all nodes on screen
- Try adjusting zoom level (use zoom buttons in toolbox)

#### Q: Images are not displayed
**A**:
- Check if image file size is under 10MB
- Supported formats: PNG, JPEG, GIF, WebP
- Share token may be required on share pages

#### Q: Saving is not working
**A**:
- Check internet connection
- Verify GitHub repository settings are correct
- Check error messages in browser console

#### Q: Keyboard shortcuts are not working
**A**:
- Shortcuts don't work while typing text
- Shortcuts are ignored during IME input (while typing Korean/Chinese/Japanese)
- Make sure a node or edge is selected

#### Q: Korean text is not displayed in PDF
**A**:
- Check if Korean fonts are installed on the server
- In Docker environment, `font-noto-cjk` package must be installed

### Performance Issues

#### Large mindmap is slow
**A**:
- Collapse nodes to reduce the number of displayed nodes
- Delete unnecessary nodes or edges
- Clear browser cache and refresh

### Accessibility

#### Screen Reader Usage
- All buttons and nodes include ARIA labels
- All features can be used with keyboard only

#### High Contrast Mode
- Dark mode support (planned for future)
- High contrast theme auto-apply (planned for future)

---

## Additional Resources

### Documentation

- [Keyboard Shortcuts Guide](./keyboard-shortcut.md)
- [Node Editor Mode System](./node.md)
- [Edge Experience Design](./edge.md)
- [Toolbox Planning Document](./toolbox.md)
- [PDF Rendering Guide](./PLAYWRIGHT_PDF_RENDERING.md)

### Support

- **GitHub Issues**: [Report Issue](https://github.com/ziin-ai/mindmap/issues)
- **Documentation**: See detailed documents in `/docs` folder

### Feedback

Please submit bug reports or feature suggestions via GitHub Issues.

---

## Update History

### v1.0 (2025-01-XX)
- Initial user manual created
- Basic features documented
- Keyboard shortcuts guide integrated

---

**Open Mindmap** - A tool for visual thinking

Built with ❤️ for visual thinkers everywhere


