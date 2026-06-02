import { useState } from 'react';
import { useNavigate } from 'react-router-dom';
import {
  Box,
  Drawer,
  IconButton,
  List,
  ListItem,
  ListItemButton,
  ListItemIcon,
  ListItemText,
  Toolbar,
  Typography,
} from '@mui/material';
import {
  Menu as MenuIcon,
  DashboardOutlined,
  NoteAddOutlined,
  ListAltOutlined,
} from '@mui/icons-material';

interface NavItem {
  label: string;
  path: string;
  icon: React.ReactNode;
}

const CITIZEN_ITEMS: NavItem[] = [
  { label: 'Översikt', path: '/dashboard', icon: <DashboardOutlined /> },
  { label: 'Ny ansökan', path: '/errand/new', icon: <NoteAddOutlined /> },
  { label: 'Mina ärenden', path: '/errands', icon: <ListAltOutlined /> },
];

const ADMIN_ITEMS: NavItem[] = [
  { label: 'Översikt', path: '/admin/dashboard', icon: <DashboardOutlined /> },
  { label: 'Ärenden', path: '/admin/errands', icon: <ListAltOutlined /> },
];

/**
 * Left navigation drawer, toggled by a hamburger button rendered into the AppBar.
 */
export function NavDrawer({ navType }: { navType: 'citizen' | 'admin' }) {
  const [open, setOpen] = useState(false);
  const navigate = useNavigate();
  const items = navType === 'admin' ? ADMIN_ITEMS : CITIZEN_ITEMS;

  const go = (path: string) => {
    navigate(path);
    setOpen(false);
  };

  return (
    <>
      <IconButton
        color="inherit"
        edge="start"
        aria-label="Öppna meny"
        onClick={() => setOpen(true)}
        sx={{ mr: 1 }}
      >
        <MenuIcon />
      </IconButton>

      <Drawer anchor="left" open={open} onClose={() => setOpen(false)}>
        <Box sx={{ width: 260 }} role="presentation">
          <Toolbar>
            <Typography variant="h6">Meny</Typography>
          </Toolbar>
          <List>
            {items.map(item => (
              <ListItem key={item.path} disablePadding>
                <ListItemButton onClick={() => go(item.path)}>
                  <ListItemIcon>{item.icon}</ListItemIcon>
                  <ListItemText primary={item.label} />
                </ListItemButton>
              </ListItem>
            ))}
          </List>
        </Box>
      </Drawer>
    </>
  );
}
