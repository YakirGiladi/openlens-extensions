# pod-metrics-columns

A Lens extension that adds **CPU** and **Memory** usage columns to the Pods table, providing real-time resource consumption metrics directly in the UI.

## Features

- Injects CPU and Memory columns into the Pods table
- Fetches live metrics from the cluster using `kubectl top pods` every 20 seconds
- Namespace-aware — fetches metrics for the selected namespace(s) or all namespaces
- Automatically detects navigation to/from the Pods page and updates accordingly
- Clean activation/deactivation with proper DOM cleanup

## Prerequisites

- Lens / OpenLens **6.0.0+**
- A Kubernetes cluster with **metrics-server** installed (`kubectl top` must work)
- `kubectl` available on the system PATH

## Installation

Copy or symlink the extension directory into your Lens extensions folder:

```
~/.k8slens/extensions/pod-metrics-columns/
```

Restart Lens to load the extension.

## How It Works

1. On activation the extension locates the Pods table in the DOM (supporting iframes and shadow DOMs).
2. A `MutationObserver` watches for table changes and injects header + data cells for CPU and Memory.
3. Every 20 seconds `kubectl top pods` is executed against the active cluster context, and the results are cached and rendered into the injected cells.
4. When metrics are unavailable for a pod, a dash (`-`) is displayed.

## Configuration

All values are currently hardcoded in the source:

| Parameter | Default | Description |
|-----------|---------|-------------|
| Refresh interval | 20 s | Time between `kubectl top` calls |
| Initial fetch delay | 2 s | Delay before first fetch after activation |
| Mutation debounce | 250 ms | Delay before re-injecting columns after DOM changes |
| kubectl timeout | 30 s | Maximum wait for `kubectl top` to complete |
