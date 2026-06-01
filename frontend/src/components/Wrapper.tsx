import { Me } from "@/api/api-service";
import {
  AccountCircle,
  AccountCircleRounded,
  Logout,
} from "@mui/icons-material";
import {
  AppBar,
  Toolbar,
  Typography,
  Box,
  Container,
  IconButton,
  Menu,
  MenuItem,
  ListItemIcon,
  ListItemText,
} from "@mui/material";
import { ReactElement, useState } from "react";
import { ProfileDialog } from "./ProfileDialog";

interface WrapperProps {
  title: string;
  logout: () => void;
  color: "primary" | "secondary";
  children: ReactElement | null;
  user: Me | null;
}

export const Wrapper = ({
  title,
  logout,
  color,
  children,
  user,
}: WrapperProps) => {
  const [anchorEl, setAnchorEl] = useState<null | HTMLElement>(null);
  const [open, setOpen] = useState(false);

  const handleMenu = (event: React.MouseEvent<HTMLElement>) => {
    setAnchorEl(event.currentTarget);
  };

  const handleCloseMenu = () => {
    setAnchorEl(null);
  };

  const handleClickOpenProfileDialog = () => {
    setOpen(true);
    setAnchorEl(null);
  };

  const handleCloseProfileDialog = () => {
    setOpen(false);
    setAnchorEl(null);
  };

  return (
    <Box>
      <AppBar position='static' sx={{ bgcolor: color }}>
        <Toolbar>
          <Typography variant='h6' sx={{ flexGrow: 1 }}>
            {title}
          </Typography>
          <div>
            <IconButton
              size='large'
              aria-label='account of current user'
              aria-controls='menu-appbar'
              aria-haspopup='true'
              onClick={handleMenu}
              color='inherit'
            >
              <AccountCircle />
            </IconButton>
            <Menu
              id='menu-appbar'
              anchorEl={anchorEl}
              anchorOrigin={{
                vertical: "top",
                horizontal: "right",
              }}
              keepMounted
              transformOrigin={{
                vertical: "top",
                horizontal: "right",
              }}
              open={Boolean(anchorEl)}
              onClose={handleCloseMenu}
            >
              <MenuItem onClick={handleClickOpenProfileDialog}>
                <ListItemIcon>
                  <AccountCircleRounded fontSize='small' />
                </ListItemIcon>
                <ListItemText>{`Profil: ${user?.name}`}</ListItemText>
              </MenuItem>
              <MenuItem onClick={logout}>
                <ListItemIcon>
                  <Logout fontSize='small' />
                </ListItemIcon>
                <ListItemText>Logga ut</ListItemText>
              </MenuItem>
            </Menu>
          </div>
        </Toolbar>
      </AppBar>
      <Container sx={{ mt: 4 }}>{children}</Container>
      <ProfileDialog
        onClose={handleCloseProfileDialog}
        open={open}
        user={user}
      />
    </Box>
  );
};
