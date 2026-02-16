import { Renderer } from "@k8slens/extensions";

/**
 * Keyboard Navigation Extension for OpenLens
 *
 * Adds keyboard shortcuts for navigating table rows:
 *   ArrowDown / j  – select next row
 *   ArrowUp   / k  – select previous row
 *   Enter          – click (open) the selected row
 *   Escape         – clear selection
 *   Home           – select first row
 *   End            – select last row
 *   PageDown       – jump 10 rows down
 *   PageUp         – jump 10 rows up
 */

const STYLE_ID = "keyboard-nav-styles";
const SELECTED_ATTR = "data-kbnav-selected";
const PAGE_JUMP = 10;

// Multiple selectors to find table rows across OpenLens versions
const ROW_SELECTORS = [
  '.TableRow:not([class*="TableHead"])',
  '[class*="TableRow"]:not([class*="TableHead"])',
];

// Selectors for the scrollable table container
const SCROLL_CONTAINER_SELECTORS = [
  '[class*="tableWrapper"]',
  '[class*="TableWrapper"]',
  '[class*="virtual-list"]',
  '[class*="VirtualList"]',
  '[class*="scrollable"]',
  ".VirtualList",
];

function injectStyles(): void {
  if (document.getElementById(STYLE_ID)) return;

  const style = document.createElement("style");
  style.id = STYLE_ID;
  style.textContent = `
    [${SELECTED_ATTR}="true"] {
      outline: 2px solid #3d90ce !important;
      outline-offset: -2px;
      background: rgba(61, 144, 206, 0.15) !important;
      position: relative;
      z-index: 1;
    }
    [${SELECTED_ATTR}="true"]::before {
      content: "";
      position: absolute;
      left: 0;
      top: 0;
      bottom: 0;
      width: 3px;
      background: #3d90ce;
      border-radius: 0 2px 2px 0;
    }
  `;
  document.head.appendChild(style);
}

function removeStyles(): void {
  const style = document.getElementById(STYLE_ID);
  if (style) style.remove();
}

function getVisibleRows(): HTMLElement[] {
  const rows: HTMLElement[] = [];
  for (const sel of ROW_SELECTORS) {
    const found = document.querySelectorAll<HTMLElement>(sel);
    if (found.length > 0) {
      found.forEach((el) => {
        // Skip header rows and hidden rows
        const tag = el.tagName.toLowerCase();
        if (tag === "thead" || tag === "th") return;
        if (el.offsetParent === null) return; // hidden
        if (el.classList.toString().includes("Head")) return;
        // Avoid duplicates
        if (!rows.includes(el)) rows.push(el);
      });
      break; // Use the first selector that matches
    }
  }
  return rows;
}

// Per-view memory: stores the row index and row name/identifier for each URL
const selectionMemory = new Map<string, { index: number; rowText: string }>();

function getViewKey(): string {
  return window.location.href;
}

function getRowIdentifier(row: HTMLElement): string {
  // Use the first cell's text as a stable identifier (usually the resource name)
  const firstCell = row.querySelector('[class*="TableCell"]') || row.firstElementChild;
  return (firstCell?.textContent || row.textContent || "").trim().substring(0, 100);
}

function getSelectedRow(): HTMLElement | null {
  return document.querySelector<HTMLElement>(`[${SELECTED_ATTR}="true"]`);
}

function clearSelection(): void {
  const current = getSelectedRow();
  if (current) {
    current.removeAttribute(SELECTED_ATTR);
  }
}

function saveSelection(rows: HTMLElement[], index: number): void {
  if (index >= 0 && index < rows.length) {
    selectionMemory.set(getViewKey(), {
      index,
      rowText: getRowIdentifier(rows[index]),
    });
  }
}

function selectRow(row: HTMLElement, rows?: HTMLElement[]): void {
  clearSelection();
  row.setAttribute(SELECTED_ATTR, "true");
  scrollRowIntoView(row);
  // Remember this selection for the current view
  if (rows) {
    const idx = rows.indexOf(row);
    if (idx !== -1) saveSelection(rows, idx);
  }
}

function restoreSelection(rows: HTMLElement[]): number {
  const mem = selectionMemory.get(getViewKey());
  if (!mem || rows.length === 0) return -1;

  // First try to find the exact same row by its text content
  const matchByText = rows.findIndex(
    (r) => getRowIdentifier(r) === mem.rowText
  );
  if (matchByText !== -1) {
    selectRow(rows[matchByText], rows);
    return matchByText;
  }

  // Fall back to the remembered index (clamped to current row count)
  const clamped = Math.min(mem.index, rows.length - 1);
  selectRow(rows[clamped], rows);
  return clamped;
}

function scrollRowIntoView(row: HTMLElement): void {
  // Try to find the scrollable container
  let scrollContainer: HTMLElement | null = null;
  for (const sel of SCROLL_CONTAINER_SELECTORS) {
    scrollContainer = document.querySelector<HTMLElement>(sel);
    if (scrollContainer) break;
  }

  // Fallback: walk up from the row to find the nearest scrollable ancestor
  if (!scrollContainer) {
    let parent = row.parentElement;
    while (parent) {
      const style = getComputedStyle(parent);
      if (
        style.overflow === "auto" ||
        style.overflow === "scroll" ||
        style.overflowY === "auto" ||
        style.overflowY === "scroll"
      ) {
        scrollContainer = parent;
        break;
      }
      parent = parent.parentElement;
    }
  }

  // Use native scrollIntoView with block: nearest to avoid jarring jumps
  row.scrollIntoView({ block: "nearest", behavior: "smooth" });
}

function isInputFocused(): boolean {
  const el = document.activeElement;
  if (!el) return false;
  const tag = el.tagName.toLowerCase();
  if (tag === "input" || tag === "textarea" || tag === "select") return true;
  if ((el as HTMLElement).contentEditable === "true") return true;
  // Check if inside a dialog/modal input
  if (el.closest('[role="dialog"]')) return true;
  return false;
}

function findRowFromClick(target: HTMLElement): HTMLElement | null {
  // Walk up from the click target to find the TableRow
  let el: HTMLElement | null = target;
  while (el) {
    for (const sel of ROW_SELECTORS) {
      if (el.matches(sel)) return el;
    }
    el = el.parentElement;
  }
  return null;
}

export default class KeyboardNavExtension extends Renderer.LensExtension {
  private handleKeyDown: ((e: KeyboardEvent) => void) | null = null;
  private handleClick: ((e: MouseEvent) => void) | null = null;
  private mutationObserver: MutationObserver | null = null;
  private lastUrl: string = "";

  onActivate(): void {
    console.log("[KeyboardNav] Extension activated");
    injectStyles();
    this.setupClickListener();
    this.setupKeyboardListener();
    this.setupNavigationObserver();
  }

  onDeactivate(): void {
    console.log("[KeyboardNav] Extension deactivated");
    this.teardownKeyboardListener();
    this.teardownClickListener();
    this.teardownNavigationObserver();
    clearSelection();
    removeStyles();
  }

  private setupClickListener(): void {
    this.handleClick = (e: MouseEvent) => {
      const target = e.target as HTMLElement;
      if (!target) return;

      const clickedRow = findRowFromClick(target);
      if (!clickedRow) return;

      // Mark this row as selected and remember it
      const rows = getVisibleRows();
      const idx = rows.indexOf(clickedRow);
      if (idx !== -1) {
        clearSelection();
        clickedRow.setAttribute(SELECTED_ATTR, "true");
        saveSelection(rows, idx);
      }
    };

    // Use capture phase so we see the click before OpenLens navigates away
    document.addEventListener("click", this.handleClick, true);
  }

  private teardownClickListener(): void {
    if (this.handleClick) {
      document.removeEventListener("click", this.handleClick, true);
      this.handleClick = null;
    }
  }

  private setupKeyboardListener(): void {
    this.handleKeyDown = (e: KeyboardEvent) => {
      // Don't intercept when typing in inputs, search bars, dialogs etc.
      if (isInputFocused()) return;

      const key = e.key;
      const rows = getVisibleRows();
      if (rows.length === 0) return;

      let currentRow = getSelectedRow();
      let currentIndex = currentRow ? rows.indexOf(currentRow) : -1;

      // If current selection is no longer in the visible rows (e.g. view changed),
      // reset it
      if (currentRow && currentIndex === -1) {
        clearSelection();
        currentRow = null;
        currentIndex = -1;
      }

      // If no row is selected, try to restore from memory before acting
      if (currentIndex === -1 && key !== "Escape") {
        const restored = restoreSelection(rows);
        if (restored !== -1) {
          currentIndex = restored;
          currentRow = rows[currentIndex];
          // For navigation keys, we restored — now let the switch
          // move from this position. For Enter, the restored row is
          // already selected so it will be clicked.
        }
      }

      switch (key) {
        case "ArrowDown":
        case "j": {
          e.preventDefault();
          e.stopPropagation();
          const nextIndex =
            currentIndex === -1
              ? 0
              : Math.min(currentIndex + 1, rows.length - 1);
          selectRow(rows[nextIndex], rows);
          break;
        }

        case "ArrowUp":
        case "k": {
          e.preventDefault();
          e.stopPropagation();
          const prevIndex =
            currentIndex === -1
              ? rows.length - 1
              : Math.max(currentIndex - 1, 0);
          selectRow(rows[prevIndex], rows);
          break;
        }

        case "Enter": {
          if (!currentRow) return;
          e.preventDefault();
          e.stopPropagation();
          currentRow.click();
          break;
        }

        case "Escape": {
          clearSelection();
          if (document.activeElement) {
            (document.activeElement as HTMLElement).blur?.();
          }
          break;
        }

        case "Home": {
          if (rows.length === 0) return;
          e.preventDefault();
          e.stopPropagation();
          selectRow(rows[0], rows);
          break;
        }

        case "End": {
          if (rows.length === 0) return;
          e.preventDefault();
          e.stopPropagation();
          selectRow(rows[rows.length - 1], rows);
          break;
        }

        case "PageDown": {
          e.preventDefault();
          e.stopPropagation();
          const jumpDown =
            currentIndex === -1
              ? 0
              : Math.min(currentIndex + PAGE_JUMP, rows.length - 1);
          selectRow(rows[jumpDown], rows);
          break;
        }

        case "PageUp": {
          e.preventDefault();
          e.stopPropagation();
          const jumpUp =
            currentIndex === -1
              ? 0
              : Math.max(currentIndex - PAGE_JUMP, 0);
          selectRow(rows[jumpUp], rows);
          break;
        }

        default:
          return;
      }
    };

    // Use capture phase to intercept before OpenLens handlers
    document.addEventListener("keydown", this.handleKeyDown, true);
  }

  private teardownKeyboardListener(): void {
    if (this.handleKeyDown) {
      document.removeEventListener("keydown", this.handleKeyDown, true);
      this.handleKeyDown = null;
    }
  }

  private setupNavigationObserver(): void {
    // When the user navigates to a different view (Pods -> Services etc.),
    // clear the selection so it doesn't carry over.
    this.lastUrl = window.location.href;

    this.mutationObserver = new MutationObserver(() => {
      const currentUrl = window.location.href;
      if (currentUrl !== this.lastUrl) {
        // Save current selection before navigating away
        const currentRow = getSelectedRow();
        if (currentRow) {
          const rows = getVisibleRows();
          const idx = rows.indexOf(currentRow);
          if (idx !== -1) saveSelection(rows, idx);
        }
        clearSelection();
        this.lastUrl = currentUrl;
        // Try to restore selection for the new view after DOM settles
        setTimeout(() => {
          const rows = getVisibleRows();
          if (rows.length > 0 && !getSelectedRow()) {
            restoreSelection(rows);
          }
        }, 300);
      }
    });

    this.mutationObserver.observe(document.body, {
      childList: true,
      subtree: true,
    });
  }

  private teardownNavigationObserver(): void {
    if (this.mutationObserver) {
      this.mutationObserver.disconnect();
      this.mutationObserver = null;
    }
  }
}
