import { ReactNode, useState } from "react";
import { useLocation, useNavigate } from "react-router-dom";
import {
  Box,
  Collapse,
  Divider,
  Drawer,
  IconButton,
  List,
  ListItemButton,
  ListItemIcon,
  ListItemText,
  Tooltip,
} from "@mui/material";
import {
  ChevronLeft,
  ChevronRight,
  DashboardOutlined,
  DescriptionOutlined,
  ExpandLess,
  ExpandMore,
  ListAltOutlined,
  NoteAddOutlined,
} from "@mui/icons-material";
import { ERRAND_MODULES } from "@/utils/modules";
import { NAV_COLLAPSED_WIDTH, NAV_EXPANDED_WIDTH, useNav } from "./NavContext";

const EXPANDED_WIDTH = NAV_EXPANDED_WIDTH;
const COLLAPSED_WIDTH = NAV_COLLAPSED_WIDTH;

type NavChild = { label: string; path: string };
type NavItem =
  | { kind: "leaf"; label: string; path: string; icon: ReactNode }
  | { kind: "group"; label: string; icon: ReactNode; children: NavChild[] };

/** The errands group, with one sub-item per module plus an "all modules" entry. */
function errandsGroup(navType: "citizen" | "admin"): NavItem {
  const base = navType === "admin" ? "/admin/errands" : "/errands";
  return {
    kind: "group",
    label: navType === "admin" ? "Ärenden" : "Mina ärenden",
    icon: <ListAltOutlined />,
    children: [
      { label: "Alla", path: base },
      ...ERRAND_MODULES.map((m) => ({
        label: m.label,
        path: `${base}?module=${m.slug}`,
      })),
    ],
  };
}

function buildItems(navType: "citizen" | "admin"): NavItem[] {
  if (navType === "admin") {
    return [
      {
        kind: "leaf",
        label: "Översikt",
        path: "/admin/dashboard",
        icon: <DashboardOutlined />,
      },
      errandsGroup("admin"),
    ];
  }
  return [
    {
      kind: "leaf",
      label: "Översikt",
      path: "/dashboard",
      icon: <DashboardOutlined />,
    },
    {
      kind: "leaf",
      label: "Ny ansökan",
      path: "/errand/new",
      icon: <NoteAddOutlined />,
    },
    errandsGroup("citizen"),
    {
      kind: "leaf",
      label: "Mina beslut",
      path: "/decisions",
      icon: <DescriptionOutlined />,
    },
  ];
}

const itemSx = { borderRadius: 1, mb: 0.5 } as const;

function NavList({
  items,
  collapsed,
  onNavigate,
}: {
  items: NavItem[];
  collapsed: boolean;
  onNavigate?: () => void;
}) {
  const navigate = useNavigate();
  const location = useLocation();
  const current = location.pathname + location.search;

  const activeGroup = items.find(
    (i) =>
      i.kind === "group" &&
      i.children.some((c) => c.path.split("?")[0] === location.pathname),
  );
  const [openGroup, setOpenGroup] = useState<string | null>(
    activeGroup ? activeGroup.label : null,
  );

  const go = (path: string) => {
    navigate(path);
    onNavigate?.();
  };

  return (
    <List component='nav' sx={{ px: collapsed ? 0.5 : 1 }}>
      {items.map((item) => {
        if (item.kind === "leaf") {
          const button = (
            <ListItemButton
              selected={location.pathname === item.path}
              onClick={() => go(item.path)}
              sx={{
                ...itemSx,
                justifyContent: collapsed ? "center" : "flex-start",
              }}
            >
              <ListItemIcon
                sx={{ minWidth: collapsed ? 0 : 40, justifyContent: "center" }}
              >
                {item.icon}
              </ListItemIcon>
              {!collapsed && <ListItemText primary={item.label} />}
            </ListItemButton>
          );
          return collapsed ? (
            <Tooltip key={item.path} title={item.label} placement='right'>
              {button}
            </Tooltip>
          ) : (
            <Box key={item.path}>{button}</Box>
          );
        }

        const groupActive = item.children.some(
          (c) => c.path.split("?")[0] === location.pathname,
        );

        // Collapsed: no room for an accordion — go straight to "Alla".
        if (collapsed) {
          return (
            <Tooltip key={item.label} title={item.label} placement='right'>
              <ListItemButton
                selected={groupActive}
                onClick={() => go(item.children[0].path)}
                sx={{ ...itemSx, justifyContent: "center" }}
              >
                <ListItemIcon sx={{ minWidth: 0, justifyContent: "center" }}>
                  {item.icon}
                </ListItemIcon>
              </ListItemButton>
            </Tooltip>
          );
        }

        const isOpen = openGroup === item.label;
        return (
          <Box key={item.label}>
            <ListItemButton
              selected={groupActive && !isOpen}
              onClick={() =>
                setOpenGroup((o) => (o === item.label ? null : item.label))
              }
              sx={itemSx}
            >
              <ListItemIcon sx={{ minWidth: 40 }}>{item.icon}</ListItemIcon>
              <ListItemText primary={item.label} />
              {isOpen ? <ExpandLess /> : <ExpandMore />}
            </ListItemButton>
            <Collapse in={isOpen} timeout='auto' unmountOnExit>
              <List disablePadding>
                {item.children.map((c) => (
                  <ListItemButton
                    key={c.path}
                    selected={current === c.path}
                    onClick={() => go(c.path)}
                    sx={{ ...itemSx, pl: 4 }}
                  >
                    <ListItemText
                      primary={c.label}
                      primaryTypographyProps={{ variant: "body2" }}
                    />
                  </ListItemButton>
                ))}
              </List>
            </Collapse>
          </Box>
        );
      })}
    </List>
  );
}

/**
 * Left navigation. On desktop it is a static sidebar that can collapse to an
 * icons-only "mini" rail (persisted in localStorage); on mobile it is a temporary
 * drawer toggled from the AppBar. The errands entry expands to one sub-item per
 * module (plus "Alla"). Used for both citizen and admin.
 */
export function SideNav({
  navType,
  mobileOpen,
  onMobileClose,
}: {
  navType: "citizen" | "admin";
  mobileOpen: boolean;
  onMobileClose: () => void;
}) {
  const items = buildItems(navType);
  const { collapsed, toggle } = useNav();

  const width = collapsed ? COLLAPSED_WIDTH : EXPANDED_WIDTH;

  return (
    <>
      {/* Mobile: temporary overlay drawer */}
      <Drawer
        variant='temporary'
        open={mobileOpen}
        onClose={onMobileClose}
        ModalProps={{ keepMounted: true }}
        sx={{
          display: { xs: "block", md: "none" },
          "& .MuiDrawer-paper": {
            width: EXPANDED_WIDTH,
            boxSizing: "border-box",
          },
        }}
      >
        <Box sx={{ pt: 1 }}>
          <NavList items={items} collapsed={false} onNavigate={onMobileClose} />
        </Box>
      </Drawer>

      {/* Desktop: collapsible sidebar. Sticky under the AppBar and capped to the
          viewport, so it fills down to the footer on short pages but stays pinned
          (always visible) on long/scrolly pages without overlapping the footer. */}
      <Box
        component='nav'
        sx={{
          display: { xs: "none", md: "flex" },
          flexDirection: "column",
          width,
          flexShrink: 0,
          transition: "width .2s",
          overflowX: "hidden",
          overflowY: "auto",
          borderRight: 1,
          borderColor: "divider",
          pt: 1,
          position: "sticky",
          top: 64,
          maxHeight: "calc(100vh - 64px)",
        }}
      >
        <NavList items={items} collapsed={collapsed} />
        <Box sx={{ mt: "auto" }}>
          <Divider />
          <Box
            sx={{
              display: "flex",
              justifyContent: collapsed ? "center" : "flex-end",
              p: 0.5,
            }}
          >
            <Tooltip
              title={collapsed ? "Expandera meny" : "Minimera meny"}
              placement='right'
            >
              <IconButton
                size='small'
                onClick={toggle}
                aria-label='Minimera meny'
              >
                {collapsed ? <ChevronRight /> : <ChevronLeft />}
              </IconButton>
            </Tooltip>
          </Box>
        </Box>
      </Box>
    </>
  );
}
