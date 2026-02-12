import { Renderer } from "@k8slens/extensions";
import React, { useState, useEffect, useRef, useCallback } from "react";
import ReactDOM from "react-dom";

const CONTAINER_ID = "rts-filter";
const MAX_EXPAND_ROUNDS = 5;
const EXPAND_DELAY = 60;

// Selectors for the sidebar container (in priority order)
const SIDEBAR_SELECTORS = [
  '[data-testid="cluster-sidebar"]',
  '[class*="sidebarNav"]',
  '[class*="Sidebar"]',
];

// Selectors for sidebar items and their parts
const ITEM_SELECTOR = '[class*="SidebarItem"]';
const NAV_ITEM_SELECTOR = '[class*="navItem"]';
const EXPAND_ICON_SELECTOR = '[class*="expandIcon"]';
const SUB_MENU_SELECTOR = '[class*="subMenu"]';

function findSidebar(): Element | null {
  for (const sel of SIDEBAR_SELECTORS) {
    const el = document.querySelector(sel);
    if (el) return el;
  }
  return null;
}

function isExpandable(item: Element): boolean {
  // Only check for a direct expand icon, not one nested in a child SidebarItem
  const icon = item.querySelector(EXPAND_ICON_SELECTOR);
  if (!icon) return false;
  // Make sure the icon belongs to this item, not a descendant SidebarItem
  let parent = icon.parentElement;
  while (parent && parent !== item) {
    if (parent.matches(ITEM_SELECTOR)) return false;
    parent = parent.parentElement;
  }
  return true;
}

function isCollapsed(item: Element): boolean {
  // Check for a direct subMenu (not one inside a nested SidebarItem)
  const subMenus = item.querySelectorAll(SUB_MENU_SELECTOR);
  for (let i = 0; i < subMenus.length; i++) {
    let parent = subMenus[i].parentElement;
    while (parent && parent !== item) {
      if (parent.matches(ITEM_SELECTOR)) break;
      parent = parent.parentElement;
    }
    if (parent === item) return false; // found a direct subMenu
  }
  return true;
}

function clickToggle(item: Element): void {
  // Click only the direct navItem of this item, not a nested one
  const navItems = item.querySelectorAll(NAV_ITEM_SELECTOR);
  for (let i = 0; i < navItems.length; i++) {
    let parent = navItems[i].parentElement;
    while (parent && parent !== item) {
      if (parent.matches(ITEM_SELECTOR)) break;
      parent = parent.parentElement;
    }
    if (parent === item) {
      (navItems[i] as HTMLElement).click();
      return;
    }
  }
}

// Get the direct navItem text for an item (not including nested children text)
function getItemLabel(item: Element): string {
  const navItems = item.querySelectorAll(NAV_ITEM_SELECTOR);
  for (let i = 0; i < navItems.length; i++) {
    let parent = navItems[i].parentElement;
    while (parent && parent !== item) {
      if (parent.matches(ITEM_SELECTOR)) break;
      parent = parent.parentElement;
    }
    if (parent === item) {
      return (navItems[i].textContent || "").toLowerCase();
    }
  }
  return (item.textContent || "").toLowerCase();
}

// Get direct child SidebarItems of a container (sidebar or subMenu)
function getDirectChildItems(container: Element): Element[] {
  const all = Array.from(container.querySelectorAll(ITEM_SELECTOR));
  return all.filter((item) => {
    let parent = item.parentElement;
    while (parent && parent !== container) {
      if (parent.matches(ITEM_SELECTOR)) return false;
      parent = parent.parentElement;
    }
    return true;
  });
}

const SidebarFilter: React.FC = () => {
  const [query, setQuery] = useState("");
  const hiddenEls = useRef<Map<Element, string>>(new Map());
  const expandedByUs = useRef<Set<Element>>(new Set());
  const debounceRef = useRef<ReturnType<typeof setTimeout> | null>(null);

  const collapseAllOpened = useCallback(() => {
    // Collapse in reverse order (deepest first) to avoid parent collapse
    // removing children before we can collapse them
    const items = Array.from(expandedByUs.current);
    for (let i = items.length - 1; i >= 0; i--) {
      if (!isCollapsed(items[i])) clickToggle(items[i]);
    }
    expandedByUs.current.clear();
  }, []);

  const restoreHidden = useCallback(() => {
    hiddenEls.current.forEach((prev, el) => {
      (el as HTMLElement).style.display = prev;
    });
    hiddenEls.current.clear();
  }, []);

  const applyFilter = useCallback(
    (q: string) => {
      // Restore everything first
      restoreHidden();
      collapseAllOpened();

      const search = q.toLowerCase().trim();
      if (!search) return;

      const sidebar = findSidebar();
      if (!sidebar) return;

      // Recursively expand all collapsed dropdowns at every depth level,
      // waiting for React to render between each round.
      let round = 0;

      const expandAndFilter = () => {
        const sidebar2 = findSidebar();
        if (!sidebar2) return;

        // Find all collapsed expandable items currently in the sidebar
        const allItems = Array.from(sidebar2.querySelectorAll(ITEM_SELECTOR));
        let expanded = 0;

        allItems.forEach((item) => {
          if (
            isExpandable(item) &&
            isCollapsed(item) &&
            !expandedByUs.current.has(item)
          ) {
            clickToggle(item);
            expandedByUs.current.add(item);
            expanded++;
          }
        });

        round++;

        if (expanded > 0 && round < MAX_EXPAND_ROUNDS) {
          // More items were expanded — wait for React, then check again
          setTimeout(expandAndFilter, EXPAND_DELAY);
        } else {
          // All levels expanded — now filter
          runFilter(search);
        }
      };

      // Kick off: expand top-level first, then recurse deeper
      const allItems = Array.from(sidebar.querySelectorAll(ITEM_SELECTOR));
      let expanded = 0;

      allItems.forEach((item) => {
        if (isExpandable(item) && isCollapsed(item)) {
          clickToggle(item);
          expandedByUs.current.add(item);
          expanded++;
        }
      });

      if (expanded > 0) {
        setTimeout(expandAndFilter, EXPAND_DELAY);
      } else {
        runFilter(search);
      }
    },
    [restoreHidden, collapseAllOpened]
  );

  // Recursive filter: returns true if this item or any descendant matches
  const filterItem = useCallback(
    (item: Element, search: string): boolean => {
      const label = getItemLabel(item);
      const labelMatches = label.includes(search);

      // Get direct subMenu of this item
      const subMenus = item.querySelectorAll(SUB_MENU_SELECTOR);
      let directSubMenu: Element | null = null;
      for (let i = 0; i < subMenus.length; i++) {
        let parent = subMenus[i].parentElement;
        while (parent && parent !== item) {
          if (parent.matches(ITEM_SELECTOR)) break;
          parent = parent.parentElement;
        }
        if (parent === item) {
          directSubMenu = subMenus[i];
          break;
        }
      }

      if (directSubMenu) {
        const children = getDirectChildItems(directSubMenu);
        let anyChildMatch = false;

        children.forEach((child) => {
          const childMatches = filterItem(child, search);
          if (childMatches) {
            anyChildMatch = true;
          } else if (!labelMatches) {
            // Hide non-matching child (unless parent label itself matches)
            const el = child as HTMLElement;
            hiddenEls.current.set(child, el.style.display || "");
            el.style.display = "none";
          }
        });

        if (labelMatches) {
          // Parent label matches — unhide all children we just hid
          children.forEach((child) => {
            if (hiddenEls.current.has(child)) {
              (child as HTMLElement).style.display =
                hiddenEls.current.get(child) || "";
              hiddenEls.current.delete(child);
            }
          });
          return true;
        }

        return anyChildMatch;
      }

      // Leaf item
      return labelMatches;
    },
    []
  );

  const runFilter = useCallback(
    (search: string) => {
      const sidebar = findSidebar();
      if (!sidebar) return;

      const topItems = getDirectChildItems(sidebar);

      topItems.forEach((item) => {
        const matches = filterItem(item, search);
        if (!matches) {
          const el = item as HTMLElement;
          hiddenEls.current.set(item, el.style.display || "");
          el.style.display = "none";
        }
      });

      // Collapse expanded groups that had no matches at all
      expandedByUs.current.forEach((item) => {
        // Check if this item is hidden (or inside a hidden parent)
        const el = item as HTMLElement;
        const isHidden =
          hiddenEls.current.has(item) ||
          el.offsetParent === null;
        if (isHidden && !isCollapsed(item)) {
          clickToggle(item);
          expandedByUs.current.delete(item);
        }
      });
    },
    [filterItem]
  );

  useEffect(() => {
    if (debounceRef.current) clearTimeout(debounceRef.current);
    debounceRef.current = setTimeout(() => applyFilter(query), 250);
    return () => {
      if (debounceRef.current) clearTimeout(debounceRef.current);
    };
  }, [query, applyFilter]);

  // Restore all on unmount
  useEffect(
    () => () => {
      restoreHidden();
      collapseAllOpened();
    },
    [restoreHidden, collapseAllOpened]
  );

  return (
    <div
      style={{
        display: "flex",
        alignItems: "center",
        background: "rgba(255,255,255,0.06)",
        border: "1px solid rgba(255,255,255,0.1)",
        borderRadius: 4,
        padding: "8px 12px",
      }}
    >
      <input
        type="text"
        placeholder="Filter sidebar..."
        value={query}
        onChange={(e) => setQuery(e.target.value)}
        style={{
          flex: 1,
          background: "transparent",
          border: "none",
          outline: "none",
          color: "#fff",
          fontSize: 13,
        }}
      />
      {query && (
        <span
          onClick={() => setQuery("")}
          style={{
            cursor: "pointer",
            color: "rgba(255,255,255,0.5)",
            marginLeft: 8,
          }}
        >
          ✕
        </span>
      )}
    </div>
  );
};

export default class ResourceTabSearch extends Renderer.LensExtension {
  private container: HTMLDivElement | null = null;
  private observer: MutationObserver | null = null;

  onActivate() {
    this.tryInject();

    this.observer = new MutationObserver(() => {
      if (!document.getElementById(CONTAINER_ID)) {
        this.tryInject();
      }
    });
    this.observer.observe(document.body, { childList: true, subtree: true });
  }

  onDeactivate() {
    if (this.observer) {
      this.observer.disconnect();
      this.observer = null;
    }
    if (this.container) {
      ReactDOM.unmountComponentAtNode(this.container);
      this.container.remove();
      this.container = null;
    }
  }

  private tryInject(): boolean {
    if (document.getElementById(CONTAINER_ID)) return true;

    let sidebar: Element | null = null;
    for (const sel of SIDEBAR_SELECTORS) {
      sidebar = document.querySelector(sel);
      if (sidebar) break;
    }
    if (!sidebar) return false;

    this.container = document.createElement("div");
    this.container.id = CONTAINER_ID;
    this.container.style.cssText =
      "padding:10px 16px;position:sticky;top:0;z-index:100;border-bottom:1px solid rgba(255,255,255,0.07)";
    sidebar.insertBefore(this.container, sidebar.firstChild);
    ReactDOM.render(<SidebarFilter />, this.container);
    console.log("[RTS] Sidebar filter injected");
    return true;
  }
}
