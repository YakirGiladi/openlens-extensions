/******/ (() => { // webpackBootstrap
/******/ "use strict";
/******/ var __webpack_modules__ = ({

/***/ 1:
/***/ ((__unused_webpack_module, exports, __webpack_require__) => {

Object.defineProperty(exports, "__esModule", ({ value: true }));
const LensExtensions = __webpack_require__(2);
const { execSync } = require('child_process');

class PodMetricsColumnsExtension extends LensExtensions.Renderer.LensExtension {
  constructor() {
    super(...arguments);
    this.observer = null;
    this.metricsCache = {};
    this.refreshTimer = null;
    this.injectDebounce = null;
    this.lastPodsPage = false;
    this.fetching = false;
    this.REFRESH_INTERVAL = 20000;
    this.targetDoc = null;
  }

  onActivate() {
    console.log('[PodMetrics] v3.0 activated');
    this.findTargetDocument();
    this.startObserving();

    this.refreshTimer = setInterval(() => {
      this.findTargetDocument();
      if (this.isOnPodsPage()) this.fetchAndInject();
    }, this.REFRESH_INTERVAL);

    setTimeout(() => {
      this.findTargetDocument();
      if (this.isOnPodsPage()) this.fetchAndInject();
    }, 2000);

    // Re-check on navigation
    document.addEventListener('click', () => {
      setTimeout(() => {
        this.findTargetDocument();
        const onPods = this.isOnPodsPage();
        if (onPods) {
          this.injectColumns();
          if (Object.keys(this.metricsCache).length === 0) this.fetchAndInject();
        } else if (this.lastPodsPage) {
          this.cleanup();
        }
        this.lastPodsPage = onPods;
      }, 500);
    }, true);
  }

  onDeactivate() {
    console.log('[PodMetrics] deactivated');
    if (this.refreshTimer) clearInterval(this.refreshTimer);
    this.stopObserving();
    this.cleanup();
  }

  // ========== FIND THE RIGHT DOCUMENT ==========
  findTargetDocument() {
    // Strategy 1: Check current document
    if (this.findTable(document)) {
      if (this.targetDoc !== document) {
        console.log('[PodMetrics] Table found in main document');
        this.targetDoc = document;
        this.injectStylesInDoc(document);
      }
      return;
    }

    // Strategy 2: Check iframes
    const iframes = document.querySelectorAll('iframe, webview');
    for (const iframe of iframes) {
      try {
        const iframeDoc = iframe.contentDocument || iframe.contentWindow?.document;
        if (iframeDoc && this.findTable(iframeDoc)) {
          if (this.targetDoc !== iframeDoc) {
            console.log('[PodMetrics] Table found in iframe:', iframe.src || iframe.className);
            this.targetDoc = iframeDoc;
            this.injectStylesInDoc(iframeDoc);
            this.observeDoc(iframeDoc);
          }
          return;
        }
      } catch (e) {
        // Cross-origin iframe, skip
      }
    }

    // Strategy 3: Check shadow DOMs
    const allElements = document.querySelectorAll('*');
    for (const el of allElements) {
      if (el.shadowRoot) {
        try {
          if (this.findTable(el.shadowRoot)) {
            console.log('[PodMetrics] Table found in shadow DOM');
            this.targetDoc = el.shadowRoot;
            this.injectStylesInDoc(el.shadowRoot);
            return;
          }
        } catch (e) {}
      }
    }

    // Strategy 4: Deep scan all documents for any table-like structure
    this.targetDoc = null;
  }

  findTable(doc) {
    if (!doc) return false;

    // Try multiple selector strategies
    const selectors = [
      '[class*="table-module__thead"]',
      '[class*="Table"] [class*="header"]',
      '[class*="thead"]',
      'div[role="table"]',
      'div[role="grid"]',
    ];

    for (const sel of selectors) {
      try {
        const el = doc.querySelector(sel);
        if (el) {
          const text = el.textContent || '';
          if (text.includes('Containers') && text.includes('Restarts')) {
            return true;
          }
        }
      } catch (e) {}
    }

    // Brute force: find any element with header-like text
    try {
      const walker = doc.createTreeWalker(
        doc.body || doc.documentElement || doc,
        NodeFilter.SHOW_ELEMENT,
        null
      );

      let node;
      while (node = walker.nextNode()) {
        if (node.children && node.children.length >= 5) {
          const text = node.textContent || '';
          if (text.includes('Name') && text.includes('Namespace') && text.includes('Containers') && text.includes('Restarts') && text.includes('Node')) {
            // Check if this is a row-like element (not a huge container)
            const directText = Array.from(node.children).map(c => (c.textContent || '').trim()).join('|');
            if (directText.includes('Name') && directText.includes('Containers')) {
              console.log('[PodMetrics] Found table header via tree walk, tag:', node.tagName, 'class:', node.className.substring(0, 80));
              return true;
            }
          }
        }
      }
    } catch (e) {}

    return false;
  }

  // ========== CLUSTER CONTEXT ==========
  getClusterContext() {
    try {
      const entity = LensExtensions.Renderer.Catalog.catalogEntities.activeEntity;
      if (entity && entity.spec && entity.spec.kubeconfigContext) {
        return entity.spec.kubeconfigContext;
      }
    } catch (e) {}
    return null;
  }

  // ========== PAGE DETECTION ==========
  isOnPodsPage() {
    if (!this.targetDoc) return false;
    return !!this.findHeaderRow();
  }

  findHeaderRow() {
    if (!this.targetDoc) return null;
    const doc = this.targetDoc;

    // Try known selectors
    const selectors = [
      '.TableHead',
      '[class*="TableHead"]',
      '[class*="table-module__thead"] [class*="table-module__tr"]',
      '[class*="thead"] [class*="tr"]',
      'div[role="rowgroup"] div[role="row"]',
    ];

    for (const sel of selectors) {
      try {
        const el = doc.querySelector(sel);
        if (el && el.textContent.includes('Containers') && el.textContent.includes('Restarts')) {
          return el;
        }
      } catch (e) {}
    }

    // Brute force: find the header row
    try {
      const allDivs = doc.querySelectorAll('div');
      for (const div of allDivs) {
        if (div.children.length >= 5 && div.children.length <= 20) {
          const childTexts = Array.from(div.children).map(c => (c.textContent || '').trim());
          if (childTexts.includes('Name') && childTexts.includes('Namespace') &&
              childTexts.includes('Containers') && childTexts.includes('Restarts')) {
            return div;
          }
        }
      }
    } catch (e) {}

    return null;
  }

  // ========== NAMESPACE DETECTION ==========
  getSelectedNamespaces() {
    const docs = [document];
    if (this.targetDoc && this.targetDoc !== document) docs.push(this.targetDoc);

    for (const doc of docs) {
      try {
        const badges = doc.querySelectorAll('[class*="NamespaceSelect"] [class*="badge"], [class*="namespace"] [class*="badge"]');
        if (badges.length > 0) {
          return Array.from(badges).map(b => b.textContent.trim()).filter(Boolean);
        }

        const nsValue = doc.querySelector('[class*="NamespaceSelect"] [class*="value"], [class*="namespace-select"]');
        if (nsValue) {
          const text = nsValue.textContent.trim();
          if (text && !text.toLowerCase().includes('all namespace')) return [text];
        }

        // Look for "Namespace: xxx" text anywhere
        const allText = doc.body ? doc.body.textContent : '';
        const nsMatch = allText.match(/Namespace:\s*(\S+)/);
        if (nsMatch && nsMatch[1] !== 'All') return [nsMatch[1]];
      } catch (e) {}
    }

    return [];
  }

  // ========== METRICS FETCHING ==========
  async fetchMetrics() {
    if (this.fetching) return;
    this.fetching = true;

    try {
      const context = this.getClusterContext();
      if (!context) {
        console.warn('[PodMetrics] No cluster context');
        return;
      }

      const namespaces = this.getSelectedNamespaces();
      let cmd;
      if (namespaces.length === 1) {
        cmd = 'kubectl top pods -n ' + namespaces[0] + ' --no-headers --context=' + context + ' 2>/dev/null';
      } else {
        cmd = 'kubectl top pods -A --no-headers --context=' + context + ' 2>/dev/null';
      }

      console.log('[PodMetrics] Running:', cmd);
      const output = execSync(cmd, { timeout: 30000, encoding: 'utf8' });

      const newCache = {};
      const lines = output.trim().split('\n');
      for (const line of lines) {
        if (!line.trim()) continue;
        const parts = line.trim().split(/\s+/);
        let ns, name, cpu, mem;
        if (namespaces.length === 1) {
          name = parts[0]; ns = namespaces[0]; cpu = parts[1]; mem = parts[2];
        } else {
          ns = parts[0]; name = parts[1]; cpu = parts[2]; mem = parts[3];
        }
        if (name && cpu && mem) {
          newCache[ns + '/' + name] = { cpu: cpu, memory: mem };
        }
      }

      this.metricsCache = newCache;
      console.log('[PodMetrics] Cached metrics for ' + Object.keys(newCache).length + ' pods');
    } catch (e) {
      console.warn('[PodMetrics] kubectl error:', e.message);
    } finally {
      this.fetching = false;
    }
  }

  // ========== DOM INJECTION ==========
  startObserving() {
    this.observer = new MutationObserver(() => {
      if (this.injectDebounce) clearTimeout(this.injectDebounce);
      this.injectDebounce = setTimeout(() => {
        this.findTargetDocument();
        if (this.isOnPodsPage()) this.injectColumns();
      }, 250);
    });
    this.observer.observe(document.body || document.documentElement, { childList: true, subtree: true });
  }

  observeDoc(doc) {
    // Also observe the iframe document
    try {
      const obs = new MutationObserver(() => {
        if (this.injectDebounce) clearTimeout(this.injectDebounce);
        this.injectDebounce = setTimeout(() => {
          if (this.isOnPodsPage()) this.injectColumns();
        }, 250);
      });
      obs.observe(doc.body || doc.documentElement, { childList: true, subtree: true });
    } catch (e) {}
  }

  stopObserving() {
    if (this.observer) {
      this.observer.disconnect();
      this.observer = null;
    }
  }

  async fetchAndInject() {
    await this.fetchMetrics();
    this.injectColumns();
  }

  injectColumns() {
    const headerRow = this.findHeaderRow();
    if (!headerRow) return;

    // Check if already injected
    if (!headerRow.querySelector('[data-metrics-col="cpu"]')) {
      this.injectHeaders(headerRow);
    }

    this.injectAllCells(headerRow);
  }

  injectHeaders(headerRow) {
    const children = Array.from(headerRow.children);

    // Find insertion point
    let insertBefore = null;
    for (const child of children) {
      const text = (child.textContent || '').trim();
      if (text.startsWith('QoS') || text.startsWith('Age')) {
        insertBefore = child;
        break;
      }
    }

    const cpuHeader = document.createElement('div');
    cpuHeader.setAttribute('data-metrics-col', 'cpu');
    cpuHeader.className = 'TableCell';
    cpuHeader.textContent = 'CPU';
    cpuHeader.style.justifyContent = 'flex-end';

    const memHeader = document.createElement('div');
    memHeader.setAttribute('data-metrics-col', 'memory');
    memHeader.className = 'TableCell';
    memHeader.textContent = 'Memory';
    memHeader.style.justifyContent = 'flex-end';

    if (insertBefore) {
      headerRow.insertBefore(cpuHeader, insertBefore);
      headerRow.insertBefore(memHeader, insertBefore);
    } else {
      headerRow.appendChild(cpuHeader);
      headerRow.appendChild(memHeader);
    }

    // Trigger column-resizer to pick up new cells
    setTimeout(() => document.body.click(), 100);

    console.log('[PodMetrics] Headers injected');
  }

  injectAllCells(headerRow) {
    if (!this.targetDoc) return;

    const parent = headerRow.parentElement;
    if (!parent) return;

    // Determine column indices from header (accounting for checkbox column)
    const headerChildren = Array.from(headerRow.children);
    let nameColIdx = -1;
    let nsColIdx = -1;
    let insertBeforeIdx = -1;
    let colIdx = 0;
    for (const h of headerChildren) {
      if (h.hasAttribute('data-metrics-col')) continue;
      const text = (h.textContent || '').trim();
      if (text.startsWith('Namespace') && nsColIdx === -1) {
        nsColIdx = colIdx;
      } else if (text.startsWith('Name') && nameColIdx === -1) {
        nameColIdx = colIdx;
      }
      if ((text.startsWith('QoS') || text.startsWith('Age')) && insertBeforeIdx === -1) {
        insertBeforeIdx = colIdx;
      }
      colIdx++;
    }
    if (nameColIdx === -1) nameColIdx = 1;
    if (nsColIdx === -1) nsColIdx = 2;

    const headerChildCount = headerChildren.filter(c => !c.hasAttribute('data-metrics-col')).length;
    const potentialRows = [];
    const seen = new Set();

    // Method 1: Direct children of parent that are siblings of headerRow (OpenLens layout)
    for (const child of Array.from(parent.children)) {
      if (child === headerRow) continue;
      if (seen.has(child)) continue;
      if (child.children && child.children.length >= headerChildCount - 2 && child.children.length <= headerChildCount + 4) {
        seen.add(child);
        potentialRows.push(child);
      }
    }

    // Method 2: Try .TableRow selector
    if (potentialRows.length === 0) {
      try {
        const rows = this.targetDoc.querySelectorAll('.TableRow, [class*="TableRow"]');
        for (const row of rows) {
          if (row === headerRow || seen.has(row)) continue;
          if (row.children && row.children.length >= headerChildCount - 2) {
            seen.add(row);
            potentialRows.push(row);
          }
        }
      } catch (e) {}
    }

    // Method 3: Fallback — sibling containers of header's parent
    if (potentialRows.length === 0) {
      const siblings = parent.parentElement ? Array.from(parent.parentElement.children) : [];
      for (const sibling of siblings) {
        if (sibling === parent) continue;
        const rows = sibling.children ? Array.from(sibling.children) : [];
        for (const row of rows) {
          if (row.children && row.children.length >= headerChildCount - 2 && row.children.length <= headerChildCount + 4) {
            if (!seen.has(row)) {
              seen.add(row);
              potentialRows.push(row);
            }
          }
        }
      }
    }

    if (potentialRows.length > 0) {
      console.log('[PodMetrics] Found ' + potentialRows.length + ' data rows (nameCol=' + nameColIdx + ' nsCol=' + nsColIdx + ' insertBefore=' + insertBeforeIdx + ')');
    }

    for (const row of potentialRows) {
      if (row.querySelector('[data-metrics-col="cpu"]')) {
        this.updateRowCells(row);
        continue;
      }

      const cells = Array.from(row.children).filter(c => !c.hasAttribute('data-metrics-col'));
      if (cells.length < 3) continue;

      const podName = (cells[nameColIdx] ? cells[nameColIdx].textContent || '' : '').trim();
      const namespace = (cells[nsColIdx] ? cells[nsColIdx].textContent || '' : '').trim();

      if (!podName || !namespace || podName === 'Name' || namespace === 'Namespace') continue;

      const key = namespace + '/' + podName;
      const metrics = this.metricsCache[key];

      const cpuCell = document.createElement('div');
      cpuCell.setAttribute('data-metrics-col', 'cpu');
      cpuCell.setAttribute('data-metrics-key', key);
      cpuCell.className = 'TableCell';
      cpuCell.textContent = metrics ? metrics.cpu : '-';
      cpuCell.style.justifyContent = 'flex-end';

      const memCell = document.createElement('div');
      memCell.setAttribute('data-metrics-col', 'memory');
      memCell.setAttribute('data-metrics-key', key);
      memCell.className = 'TableCell';
      memCell.textContent = metrics ? metrics.memory : '-';
      memCell.style.justifyContent = 'flex-end';

      if (insertBeforeIdx >= 0 && cells[insertBeforeIdx]) {
        row.insertBefore(cpuCell, cells[insertBeforeIdx]);
        row.insertBefore(memCell, cells[insertBeforeIdx]);
      } else {
        row.appendChild(cpuCell);
        row.appendChild(memCell);
      }
    }
  }

  updateRowCells(row) {
    const cpuCell = row.querySelector('[data-metrics-col="cpu"]');
    const memCell = row.querySelector('[data-metrics-col="memory"]');
    if (!cpuCell || !memCell) return;
    const key = cpuCell.getAttribute('data-metrics-key');
    if (!key) return;
    const metrics = this.metricsCache[key];
    cpuCell.textContent = metrics ? metrics.cpu : '-';
    memCell.textContent = metrics ? metrics.memory : '-';
  }

  cleanup() {
    const docs = [document];
    if (this.targetDoc && this.targetDoc !== document) docs.push(this.targetDoc);
    for (const doc of docs) {
      try {
        doc.querySelectorAll('[data-metrics-col]').forEach(el => el.remove());
      } catch (e) {}
    }
  }

  injectStylesInDoc(doc) {
    // No custom styles needed — cells use TableCell class and inherit table layout
  }
}

exports["default"] = PodMetricsColumnsExtension;

/***/ }),

/***/ 2:
/***/ ((module) => {

module.exports = global.LensExtensions;

/***/ })

/******/ });
/******/ var __webpack_module_cache__ = {};
/******/ function __webpack_require__(moduleId) {
/******/   var cachedModule = __webpack_module_cache__[moduleId];
/******/   if (cachedModule !== undefined) return cachedModule.exports;
/******/   var module = __webpack_module_cache__[moduleId] = { exports: {} };
/******/   __webpack_modules__[moduleId](module, module.exports, __webpack_require__);
/******/   return module.exports;
/******/ }
/******/ var __webpack_exports__ = __webpack_require__(1);
/******/ module.exports = __webpack_exports__;
/******/ })();
