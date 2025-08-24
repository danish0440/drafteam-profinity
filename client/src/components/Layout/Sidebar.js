import React from 'react';
import {
  Drawer,
  List,
  ListItem,
  ListItemButton,
  ListItemIcon,
  ListItemText,
  Typography,
  Box,
  Avatar,
  Divider,
  IconButton,
  Tooltip,
  Chip
} from '@mui/material';
import {
  Dashboard,
  FolderOpen,
  Transform,
  Map,
  Business,
  Person,
  Logout,
  Menu,
  MenuOpen
} from '@mui/icons-material';
import { useNavigate, useLocation } from 'react-router-dom';
import { useAuth } from '../../contexts/AuthContext';

const Sidebar = ({ open, onToggle }) => {
  const navigate = useNavigate();
  const location = useLocation();
  const { user, logout } = useAuth();

  const menuItems = [
    {
      text: 'Dashboard',
      icon: <Dashboard />,
      path: '/dashboard',
      description: 'Overview and statistics'
    },
    {
      text: 'Projects',
      icon: <FolderOpen />,
      path: '/projects',
      description: 'AutoCAD, SketchUp & PDF files'
    },
    {
      text: 'Convert',
      icon: <Transform />,
      path: '/convert',
      description: 'Merge & split PDF files'
    },
    {
      text: 'Key&Loc',
      icon: <Map />,
      path: '/keyloc',
      description: 'OSM to DXF converter'
    }
  ];

  const handleNavigation = (path) => {
    navigate(path);
  };

  const handleLogout = () => {
    logout();
  };

  const drawerWidth = open ? 240 : 60;

  return (
    <Drawer
      variant="permanent"
      sx={{
        width: drawerWidth,
        flexShrink: 0,
        '& .MuiDrawer-paper': {
          width: drawerWidth,
          boxSizing: 'border-box',
          transition: 'width 0.3s ease',
          overflowX: 'hidden',
          border: 'none',
          margin: 0,
          padding: 0
        },
      }}
    >
      {/* Header */}
      <Box
        sx={{
          p: 2,
          display: 'flex',
          alignItems: 'center',
          justifyContent: open ? 'space-between' : 'center',
          minHeight: 64
        }}
      >
        {open && (
          <Box display="flex" alignItems="center" gap={1}>
            <img
              src="/logo.png"
              alt="DraftTeam Logo"
              style={{
                width: 32,
                height: 32,
                borderRadius: '4px',
                objectFit: 'cover'
              }}
            />
            <Typography variant="h6" color="white" fontWeight="bold">
              DraftTeam
            </Typography>
          </Box>
        )}
        <IconButton
          onClick={onToggle}
          sx={{ color: 'white' }}
        >
          {open ? <MenuOpen /> : <Menu />}
        </IconButton>
      </Box>

      <Divider sx={{ borderColor: 'rgba(255, 255, 255, 0.2)' }} />

      {/* User Info */}
      {user && (
        <Box sx={{ p: open ? 2 : 1, textAlign: open ? 'left' : 'center' }}>
          {open ? (
            <Box>
              <Box display="flex" alignItems="center" gap={1} mb={1}>
                <Avatar
                  sx={{
                    width: 40,
                    height: 40,
                    bgcolor: 'secondary.main'
                  }}
                >
                  <Person />
                </Avatar>
                <Box>
                  <Typography variant="subtitle1" color="white" fontWeight="bold">
                    {user.name}
                  </Typography>
                  <Chip
                    label={user.role}
                    size="small"
                    sx={{
                      bgcolor: user.role.includes('Senior') ? 'primary.main' : 'grey.600',
                      color: 'white',
                      fontSize: '0.7rem'
                    }}
                  />
                </Box>
              </Box>
            </Box>
          ) : (
            <Tooltip title={`${user.name} - ${user.role}`} placement="right">
              <Avatar
                sx={{
                  width: 40,
                  height: 40,
                  bgcolor: 'secondary.main',
                  mx: 'auto'
                }}
              >
                <Person />
              </Avatar>
            </Tooltip>
          )}
        </Box>
      )}

      <Divider sx={{ borderColor: 'rgba(255, 255, 255, 0.2)' }} />

      {/* Navigation Menu */}
      <List sx={{ flexGrow: 1, px: 1 }}>
        {menuItems.map((item) => {
          const isActive = location.pathname === item.path || 
                          (item.path === '/projects' && location.pathname.startsWith('/projects'));
          
          return (
            <ListItem key={item.text} disablePadding sx={{ mb: 0.5 }}>
              <Tooltip 
                title={open ? '' : `${item.text} - ${item.description}`} 
                placement="right"
              >
                <ListItemButton
                  selected={isActive}
                  onClick={() => handleNavigation(item.path)}
                  sx={{
                    borderRadius: 2,
                    mx: 0.5,
                    justifyContent: open ? 'initial' : 'center',
                    px: open ? 2 : 1.5
                  }}
                >
                  <ListItemIcon
                    sx={{
                      minWidth: 0,
                      mr: open ? 2 : 'auto',
                      justifyContent: 'center',
                      color: 'inherit'
                    }}
                  >
                    {item.icon}
                  </ListItemIcon>
                  {open && (
                    <Box>
                      <ListItemText
                        primary={item.text}
                        secondary={item.description}
                        primaryTypographyProps={{
                          fontWeight: isActive ? 'bold' : 'normal',
                          fontSize: '0.95rem'
                        }}
                        secondaryTypographyProps={{
                          fontSize: '0.75rem',
                          color: 'rgba(255, 255, 255, 0.7)'
                        }}
                      />
                    </Box>
                  )}
                </ListItemButton>
              </Tooltip>
            </ListItem>
          );
        })}
      </List>

      {/* Logout Button */}
      <Box sx={{ p: 1 }}>
        <Tooltip title={open ? '' : 'Logout'} placement="right">
          <ListItemButton
            onClick={handleLogout}
            sx={{
              borderRadius: 2,
              mx: 0.5,
              justifyContent: open ? 'initial' : 'center',
              px: open ? 2 : 1.5,
              '&:hover': {
                backgroundColor: 'rgba(220, 0, 78, 0.2)'
              }
            }}
          >
            <ListItemIcon
              sx={{
                minWidth: 0,
                mr: open ? 2 : 'auto',
                justifyContent: 'center',
                color: 'inherit'
              }}
            >
              <Logout />
            </ListItemIcon>
            {open && (
              <ListItemText
                primary="Logout"
                primaryTypographyProps={{
                  fontSize: '0.95rem'
                }}
              />
            )}
          </ListItemButton>
        </Tooltip>
      </Box>

      {/* Footer */}
      {open && (
        <Box sx={{ p: 2, textAlign: 'center' }}>
          <Typography variant="caption" color="rgba(255, 255, 255, 0.5)">
            DraftTeam v1.0.0
            <br />
            Workshop Renovation
          </Typography>
        </Box>
      )}
    </Drawer>
  );
};

export default Sidebar;