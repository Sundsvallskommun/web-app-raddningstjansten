import { createContext, useContext, useState, type ReactNode } from "react";

const COLLAPSE_KEY = "rtj-nav-collapsed";

/** Desktop sidebar widths — single source of truth, shared by SideNav (its own
 * width) and Wrapper (offsetting the AppBar/Footer so they line up with the
 * content container, which sits in the space after the sidebar). */
export const NAV_EXPANDED_WIDTH = 240;
export const NAV_COLLAPSED_WIDTH = 68;

interface NavContextValue {
  collapsed: boolean;
  toggle: () => void;
}

const NavContext = createContext<NavContextValue>({ collapsed: false, toggle: () => {} });

export const useNav = () => useContext(NavContext);

/** Holds the (persisted) collapsed state so both the sidebar and the layout
 * chrome around it react to the same width. */
export function NavProvider({ children }: { children: ReactNode }) {
  const [collapsed, setCollapsed] = useState(() => {
    try {
      return localStorage.getItem(COLLAPSE_KEY) === "1";
    } catch {
      return false;
    }
  });

  const toggle = () =>
    setCollapsed((c) => {
      const next = !c;
      try {
        localStorage.setItem(COLLAPSE_KEY, next ? "1" : "0");
      } catch {
        /* ignore */
      }
      return next;
    });

  return <NavContext.Provider value={{ collapsed, toggle }}>{children}</NavContext.Provider>;
}
