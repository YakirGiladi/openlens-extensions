# OpenLens Column Resizer Pro

A powerful column resizing extension for OpenLens with persistence, auto-fit, and context menus.

## Features

### All Columns Resizable
Every column in every table can now be resized - not just specific ones.

### Persistent Widths
Column widths are automatically saved to localStorage and restored when you return to a view. Your customizations persist across sessions.

### Double-Click to Auto-Fit
Double-click any resize handle to automatically fit the column width to its content.

### Context Menu (Right-Click)
Right-click any column header to access:
- **Auto-fit Column** - Fit this column to content
- **Auto-fit All Columns** - Fit all columns to content
- **Reset Column** - Reset this column to default
- **Reset All Columns** - Reset all columns everywhere
- **Reset This View** - Reset only columns in current view

### Visual Feedback
- Subtle resize handles appear on hover
- Full-height resize line indicator while dragging
- Width tooltip shows exact pixel value
- Column highlights during resize

### Smart Persistence
Widths are saved per-view, so your Pods table can have different widths than your Deployments table.

## Installation

The extension is already installed at:
```
~/.k8slens/extensions/column-resizer/
```

**To activate:**
1. Restart OpenLens completely (Quit and reopen)
2. The extension loads automatically

## Verify Installation

1. Open OpenLens
2. Go to **File > Extensions** (Mac: **OpenLens > Extensions**)
3. You should see "column-resizer" in the list
4. Make sure it's enabled

## How to Use

### Basic Resize
1. Navigate to any resource view (Pods, Deployments, etc.)
2. Hover over the right edge of any column header
3. A subtle blue line appears - that's the resize handle
4. Click and drag left/right to resize

### Auto-Fit Column
- **Double-click** the resize handle to auto-fit the column to content
- Or right-click and select "Auto-fit Column"

### Reset Columns
- **Right-click** any column header for reset options
- Or clear localStorage key `openlens-column-widths` in DevTools

## Keyboard Shortcuts

- **Escape** - Close context menu

## Troubleshooting

### Extension not showing
```bash
# Verify files exist
ls -la ~/.k8slens/extensions/column-resizer/dist/

# Should show renderer.js
```

### Extension not working
1. Open Developer Tools: **View > Toggle Developer Tools**
2. Look in Console for: `"Column Resizer Pro activated"`
3. Check for error messages

### Reset all widths
In Developer Tools Console:
```javascript
localStorage.removeItem('openlens-column-widths');
location.reload();
```

## What's New in v2.0

- All columns now resizable (not just Name/Node/Controlled By)
- Persistent storage across sessions
- Double-click to auto-fit
- Right-click context menu
- Visual resize line indicator
- Width tooltip while dragging
- Per-view column memory
- Improved visual design with smooth animations
- Column highlighting during resize

## Technical Details

- Uses MutationObserver for dynamic table detection
- Debounced updates for performance
- localStorage for persistence
- CSS transitions for smooth interactions
- Proper cleanup on deactivation

---

Built for the OpenLens community.
