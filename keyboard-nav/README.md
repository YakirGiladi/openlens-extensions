# keyboard-nav

Keyboard navigation extension for OpenLens / FreeLens. Navigate resource tables (Pods, Deployments, Services, etc.) using your keyboard.

## Features

- **Arrow key navigation** across all table views
- **Vim-style keys** (`j` / `k`) for power users
- **Selection memory** -- remembers your last selected row per view, for both keyboard and mouse selections
- **Mouse-aware** -- click a row to set the selection anchor, then continue with keyboard
- **Smart restore** -- when switching between views (e.g. Pods -> Services -> Pods), your previous selection is restored by matching the resource name
- **Visual highlight** -- selected row gets a blue outline with a left accent bar

## Keyboard Shortcuts

| Key              | Action                          |
|------------------|---------------------------------|
| `ArrowDown` / `j` | Select next row               |
| `ArrowUp` / `k`   | Select previous row           |
| `Enter`          | Open (click) the selected row   |
| `Escape`         | Clear selection                 |
| `Home`           | Jump to first row               |
| `End`            | Jump to last row                |
| `PageDown`       | Jump 10 rows down               |
| `PageUp`         | Jump 10 rows up                 |

Keyboard shortcuts are disabled when focus is inside an input field, search bar, or dialog.

## Install

### From tarball

1. Open OpenLens
2. Go to **Extensions** (Cmd+Shift+E / Ctrl+Shift+E)
3. Install from file: select `keyboard-nav.tgz`

### From source

1. Copy or symlink the `keyboard-nav` folder into `~/.k8slens/extensions/`
2. Restart OpenLens

## Build from source

```bash
npm install
npm run build
```

Requires Node.js and the `@k8slens/extensions` SDK (dev dependency).

## Compatibility

- OpenLens 6.x
- FreeLens 6.x

## License

MIT
