# OpenLens Extensions

A collection of community extensions for OpenLens, installed locally at `~/.k8slens/extensions/`.

## Installed Extensions

| Extension | Tarball | Description |
|-----------|---------|-------------|
| Column Resizer Pro | [column-resizer.tgz](https://github.com/YakirGiladi/openlens-extensions/raw/main/column-resizer.tgz) | Resizable table columns with persistence |
| Pod Metrics Columns | [pod-metrics-columns.tgz](https://github.com/YakirGiladi/openlens-extensions/raw/main/pod-metrics-columns.tgz) | CPU/Memory usage columns in Pods table |
| Resource Tab Search | [resource-tab-search.tgz](https://github.com/YakirGiladi/openlens-extensions/raw/main/resource-tab-search.tgz) | Search/filter sidebar resources |
| Keyboard Nav | [keyboard-nav.tgz](https://github.com/YakirGiladi/openlens-extensions/raw/main/keyboard-nav.tgz) | Keyboard navigation for table views |

## Installation

1. Open OpenLens
2. Go to **File > Extensions** (Mac: **OpenLens > Extensions**)
3. Drag the `.tgz` file into the extensions window, or click "Install" and select the file
4. Restart OpenLens

## Compatibility

- Lens / OpenLens 6.x

---

## Column Resizer Pro

**Finally, resizable columns in OpenLens.** OpenLens doesn't support column resizing in resource tables out of the box. This extension fixes that.

- **Resize any column** — Drag the edge of any column header to resize
- **Persistent widths** — Column sizes are saved and restored across sessions
- **Double-click to auto-fit** — Automatically size columns to fit their content
- **Right-click context menu** — Quick access to auto-fit, reset column, reset all
- **Visual feedback** — Resize indicators, tooltips showing exact width, column highlighting
- **Per-view memory** — Different tables remember their own column widths

---

## Pod Metrics Columns

Adds **CPU** and **Memory** usage columns to the Pods table, providing real-time resource consumption metrics directly in the UI.

- Injects CPU and Memory columns into the Pods table
- Fetches live metrics from the cluster using `kubectl top pods` every 20 seconds
- Namespace-aware — fetches metrics for the selected namespace(s) or all namespaces
- Automatically detects navigation to/from the Pods page and updates accordingly
- Requires **metrics-server** installed on the cluster (`kubectl top` must work)

---

## Resource Tab Search

Adds a **search/filter input** to the sidebar, letting you quickly find resources by name.

- Real-time filtering of sidebar items as you type (case-insensitive, substring match)
- Automatically expands collapsed menu sections to reveal matching items (up to 5 levels deep)
- Restores the original sidebar state when the filter is cleared
- Persists across sidebar re-renders via `MutationObserver`
- Lightweight — zero runtime dependencies, ~5 KB bundled

---

## Keyboard Nav

**Navigate resource tables with your keyboard.** Browse Pods, Deployments, Services and any other table view without touching the mouse.

- **Arrow key navigation** — `ArrowDown` / `ArrowUp` to move between rows
- **Vim-style keys** — `j` / `k` for power users
- **Selection memory** — Remembers your last selected row per view, for both keyboard and mouse
- **Mouse-aware** — Click a row to set the selection anchor, then continue with keyboard
- **Smart restore** — Switching between views (e.g. Pods -> Services -> Pods) restores your previous selection by matching the resource name
- **Visual highlight** — Selected row gets a blue outline with a left accent bar

### Keyboard Shortcuts

| Key | Action |
|-----|--------|
| `ArrowDown` / `j` | Select next row |
| `ArrowUp` / `k` | Select previous row |
| `Enter` | Open (click) the selected row |
| `Escape` | Clear selection |
| `Home` | Jump to first row |
| `End` | Jump to last row |
| `PageDown` | Jump 10 rows down |
| `PageUp` | Jump 10 rows up |

Keyboard shortcuts are disabled when focus is inside an input field, search bar, or dialog.

---

Built with Claude AI.
