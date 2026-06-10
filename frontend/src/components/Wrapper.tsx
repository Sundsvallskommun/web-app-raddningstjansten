import { Me } from "@/api/api-service";
import {
  AccountCircle,
  AccountCircleRounded,
  Logout,
  Menu as MenuIcon,
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
import { SideNav } from "./SideNav";
import { Footer } from "./Footer";
import { SessionTimeout } from "./SessionTimeout";
import {
  NavProvider,
  useNav,
  NAV_COLLAPSED_WIDTH,
  NAV_EXPANDED_WIDTH,
} from "./NavContext";
import Logo from "@/assets/logo-red.svg?react";
import { CONTENT_MAX_WIDTH } from "@/theme";

// Keep the app-bar row and page content within the same centered max width.
const contentSx = {
  maxWidth: CONTENT_MAX_WIDTH,
  mx: "auto",
  px: { xs: 2, sm: 3 },
} as const;

interface WrapperProps {
  title: string;
  logout: () => void;
  color: "primary" | "secondary";
  children: ReactElement | null;
  user: Me | null;
  showNav?: boolean;
  navType?: "citizen" | "admin";
}

export const Wrapper = (props: WrapperProps) => (
  <NavProvider>
    <WrapperContent {...props} />
  </NavProvider>
);

const WrapperContent = ({
  title,
  logout,
  color,
  children,
  user,
  showNav = false,
  navType = "citizen",
}: WrapperProps) => {
  const [anchorEl, setAnchorEl] = useState<null | HTMLElement>(null);
  const [open, setOpen] = useState(false);
  const [mobileNavOpen, setMobileNavOpen] = useState(false);
  const { collapsed } = useNav();

  // Width the sidebar occupies on desktop — used to push the AppBar/Footer inner
  // content right so they line up with the centered content container (which
  // lives in the space after the sidebar). 0 on mobile (the nav is an overlay).
  const navWidth = showNav ? (collapsed ? NAV_COLLAPSED_WIDTH : NAV_EXPANDED_WIDTH) : 0;

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
    <Box sx={{ display: "flex", flexDirection: "column", minHeight: "100vh" }}>
      <AppBar position='sticky' color={color}>
        <Toolbar
          disableGutters
          sx={{ pl: { md: `${navWidth}px` }, transition: "padding-left .2s" }}
        >
          <Box sx={{ ...contentSx, width: "100%", display: "flex", alignItems: "center" }}>
            {showNav && (
              <IconButton
                color='inherit'
                edge='start'
                aria-label='Öppna meny'
                onClick={() => setMobileNavOpen(true)}
                sx={{ mr: 1, display: { md: "none" } }}
              >
                <MenuIcon />
              </IconButton>
            )}
            <Box sx={{ display: "flex", mr: 1.5 }}>
              <Logo width={"28px"} />
            </Box>
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
          </Box>
        </Toolbar>
      </AppBar>
      <Box sx={{ display: "flex", flexGrow: 1, width: "100%" }}>
        {showNav && (
          <SideNav
            navType={navType}
            mobileOpen={mobileNavOpen}
            onMobileClose={() => setMobileNavOpen(false)}
          />
        )}
        <Box
          component='main'
          sx={{ flexGrow: 1, minWidth: 0, display: "flex" }}
        >
          <Container
            maxWidth={false}
            disableGutters
            sx={{ ...contentSx, mt: 4, mb: 6, flexGrow: 1, width: "100%" }}
          >
            {children}
          </Container>
        </Box>
      </Box>
      <Footer offsetLeft={navWidth} />
      <ProfileDialog
        onClose={handleCloseProfileDialog}
        open={open}
        user={user}
      />
      <SessionTimeout />
    </Box>
  );
};
