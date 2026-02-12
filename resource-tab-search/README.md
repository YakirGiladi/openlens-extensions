# resource-tab-search

A Lens extension that adds a **search/filter input** to the sidebar, letting you quickly find resources by name.

## Features

- Real-time filtering of sidebar items as you type (case-insensitive, substring match)
- Automatically expands collapsed menu sections to reveal matching items (up to 5 levels deep)
- Restores the original sidebar state when the filter is cleared
- Persists across sidebar re-renders via `MutationObserver`
- Lightweight — zero runtime dependencies, ~5 KB bundled

## Prerequisites

- Lens / OpenLens / FreeLens **6.0.0+**

## Installation

Copy or symlink the extension directory into your Lens extensions folder:

```
~/.k8slens/extensions/resource-tab-search/
```

Restart Lens to load the extension.

## Usage

After installation a **"Filter sidebar..."** input appears at the top of the cluster sidebar. Type any text to filter; matching items (and their parent sections) remain visible while everything else is hidden. Click the **✕** button or clear the input to reset.

## Building from Source

```bash
npm install
npm run build
```

This runs Webpack and outputs `dist/renderer.js`.

## How It Works

1. On activation the extension injects a React component into the sidebar container.
2. As the user types, a debounced filter (250 ms) walks the sidebar DOM tree:
   - Collapsed sections are expanded in multiple rounds (60 ms apart) so React can render children.
   - Items whose label matches the query — or that have a matching descendant — stay visible; the rest are hidden.
3. Original `display` values are saved and restored when the filter is cleared.
4. A `MutationObserver` re-injects the filter if Lens recreates the sidebar.
