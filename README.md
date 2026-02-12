# OpenLens Extensions

A collection of community extensions for OpenLens.

## Downloads

| Extension | Download |
|-----------|----------|
| Column Resizer Pro | [column-resizer.tgz](https://github.com/YakirGiladi/openlens-extensions/raw/main/column-resizer.tgz) |
| Pod Metrics Columns | [pod-metrics-columns.tgz](https://github.com/YakirGiladi/openlens-extensions/raw/main/pod-metrics-columns.tgz) |
| Resource Tab Search | [resource-tab-search.tgz](https://github.com/YakirGiladi/openlens-extensions/raw/main/resource-tab-search.tgz) |

## Installation

1. Download the `.tgz` file for the extension you want
2. Open OpenLens
3. Go to **File > Extensions** (Mac: **OpenLens > Extensions**)
4. Drag the `.tgz` file into the extensions window, or click "Install" and select the file
5. Restart OpenLens

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

**[Download column-resizer.tgz](https://github.com/YakirGiladi/openlens-extensions/raw/main/column-resizer.tgz)**

---

## Pod Metrics Columns

Adds **CPU** and **Memory** usage columns to the Pods table, providing real-time resource consumption metrics directly in the UI.

- Injects CPU and Memory columns into the Pods table
- Fetches live metrics from the cluster using `kubectl top pods` every 20 seconds
- Namespace-aware — fetches metrics for the selected namespace(s) or all namespaces
- Automatically detects navigation to/from the Pods page and updates accordingly
- Requires **metrics-server** installed on the cluster (`kubectl top` must work)

**[Download pod-metrics-columns.tgz](https://github.com/YakirGiladi/openlens-extensions/raw/main/pod-metrics-columns.tgz)**

---

## Resource Tab Search

Adds a **search/filter input** to the sidebar, letting you quickly find resources by name.

- Real-time filtering of sidebar items as you type (case-insensitive, substring match)
- Automatically expands collapsed menu sections to reveal matching items (up to 5 levels deep)
- Restores the original sidebar state when the filter is cleared
- Persists across sidebar re-renders via `MutationObserver`
- Lightweight — zero runtime dependencies, ~5 KB bundled

**[Download resource-tab-search.tgz](https://github.com/YakirGiladi/openlens-extensions/raw/main/resource-tab-search.tgz)**

---

Built with Claude AI.
