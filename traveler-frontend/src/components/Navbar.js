import React, { useState } from 'react';
import { Link, useNavigate } from 'react-router-dom';
import {
  AppBar,
  Toolbar,
  Typography,
  Button,
  IconButton,
  Menu,
  MenuItem,
  Box,
  Avatar,
  Divider,
} from '@mui/material';
import {
  Flight,
  Hotel,
  DirectionsCar,
  Person,
  Logout,
  BookOnline,
  SmartToy,
} from '@mui/icons-material';
import { useAuth } from '../context/AuthContext';

const Navbar = () => {
  const { user, logout } = useAuth();
  const navigate = useNavigate();
  const [anchorEl, setAnchorEl] = useState(null);

  const handleMenuOpen = (event) => {
    setAnchorEl(event.currentTarget);
  };

  const handleMenuClose = () => {
    setAnchorEl(null);
  };

  const handleLogout = () => {
    logout();
    handleMenuClose();
    navigate('/');
  };

  return (
    <AppBar position="sticky" sx={{ backgroundColor: 'white', color: 'text.primary' }} elevation={1}>
      <Toolbar sx={{ justifyContent: 'space-between' }}>
        {/* Logo */}
        <Link to="/" style={{ textDecoration: 'none', display: 'flex', alignItems: 'center' }}>
          <Typography
            variant="h5"
            sx={{
              fontWeight: 700,
              background: 'linear-gradient(135deg, #ff6b35, #f7931e)',
              backgroundClip: 'text',
              WebkitBackgroundClip: 'text',
              WebkitTextFillColor: 'transparent',
            }}
          >
            KAYAK
          </Typography>
        </Link>

        {/* Navigation Links */}
        <Box sx={{ display: { xs: 'none', md: 'flex' }, gap: 1 }}>
          <Button
            component={Link}
            to="/?tab=flights"
            startIcon={<Flight />}
            sx={{ color: 'text.secondary' }}
          >
            Flights
          </Button>
          <Button
            component={Link}
            to="/?tab=hotels"
            startIcon={<Hotel />}
            sx={{ color: 'text.secondary' }}
          >
            Hotels
          </Button>
          <Button
            component={Link}
            to="/?tab=cars"
            startIcon={<DirectionsCar />}
            sx={{ color: 'text.secondary' }}
          >
            Cars
          </Button>
          <Button
            component={Link}
            to="/ai-assistant"
            startIcon={<SmartToy />}
            sx={{ 
              color: 'white',
              bgcolor: 'primary.main',
              '&:hover': { bgcolor: 'primary.dark' }
            }}
          >
            AI Concierge
          </Button>
        </Box>

        {/* User Menu */}
        <Box sx={{ display: 'flex', alignItems: 'center', gap: 1 }}>
          {user ? (
            <>
              <Button
                component={Link}
                to="/my-bookings"
                startIcon={<BookOnline />}
                sx={{ display: { xs: 'none', sm: 'flex' } }}
              >
                My Trips
              </Button>
              <IconButton onClick={handleMenuOpen}>
                <Avatar sx={{ bgcolor: 'primary.main', width: 36, height: 36 }}>
                  {user.first_name?.charAt(0) || 'U'}
                </Avatar>
              </IconButton>
              <Menu
                anchorEl={anchorEl}
                open={Boolean(anchorEl)}
                onClose={handleMenuClose}
                PaperProps={{
                  sx: { width: 200, mt: 1 },
                }}
              >
                <Box sx={{ px: 2, py: 1 }}>
                  <Typography variant="subtitle1" fontWeight={600}>
                    {user.first_name} {user.last_name}
                  </Typography>
                  <Typography variant="body2" color="text.secondary">
                    {user.email}
                  </Typography>
                </Box>
                <Divider />
                <MenuItem component={Link} to="/profile" onClick={handleMenuClose}>
                  <Person sx={{ mr: 1 }} /> Profile
                </MenuItem>
                <MenuItem component={Link} to="/my-bookings" onClick={handleMenuClose}>
                  <BookOnline sx={{ mr: 1 }} /> My Bookings
                </MenuItem>
                <Divider />
                <MenuItem onClick={handleLogout} sx={{ color: 'error.main' }}>
                  <Logout sx={{ mr: 1 }} /> Logout
                </MenuItem>
              </Menu>
            </>
          ) : (
            <>
              <Button component={Link} to="/login" variant="text">
                Sign In
              </Button>
              <Button component={Link} to="/signup" variant="contained" color="primary">
                Sign Up
              </Button>
            </>
          )}
        </Box>
      </Toolbar>
    </AppBar>
  );
};

export default Navbar;

