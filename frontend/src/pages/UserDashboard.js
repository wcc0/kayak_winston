import React, { useState, useEffect } from 'react';
import { useNavigate } from 'react-router-dom';
import {
  Box,
  AppBar,
  Toolbar,
  IconButton,
  Typography,
  Avatar,
  Drawer,
  List,
  ListItem,
  ListItemButton,
  ListItemIcon,
  ListItemText,
  Container,
  Card,
  CardContent,
  Grid,
  Tabs,
  Tab,
  Menu,
  MenuItem,
} from '@mui/material';
import AgentChatButton from '../components/AgentChatButton';
import {
  Menu as MenuIcon,
  Flight as FlightIcon,
  Hotel as HotelIcon,
  DirectionsCar as CarIcon,
  Chat as ChatIcon,
  AccountCircle as AccountCircleIcon,
} from '@mui/icons-material';

const drawerWidth = 240;

function TabPanel({ children, value, index }) {
  return (
    <div role="tabpanel" hidden={value !== index} style={{ height: '100%' }}>
      {value === index && <Box sx={{ p: 2 }}>{children}</Box>}
    </div>
  );
}

export default function UserDashboard() {
  const [open, setOpen] = useState(false);
  const [tab, setTab] = useState(0);
  const [anchorEl, setAnchorEl] = useState(null);
  const menuOpen = Boolean(anchorEl);

  const [userEmail, setUserEmail] = useState(localStorage.getItem('userEmail') || localStorage.getItem('email') || 'user@example.com');
  const [homeAirport, setHomeAirport] = useState(localStorage.getItem('homeAirport') || '');

  useEffect(() => {
    const currentUserId = localStorage.getItem('currentUserId');
    const token = localStorage.getItem('token');
    if (currentUserId && token) {
      import('../services/usersAPI').then(({ default: usersAPI }) => {
        usersAPI.getProfile(currentUserId).then((res) => {
          const u = res.data?.data;
          if (u) {
            if (u.email) {
              setUserEmail(u.email);
              localStorage.setItem('userEmail', u.email);
            }
            if (u.home_airport) {
              setHomeAirport(u.home_airport);
              localStorage.setItem('homeAirport', u.home_airport);
            } else if (u.city) {
              setHomeAirport(u.city);
              localStorage.setItem('homeAirport', u.city);
            }
          }
        }).catch(() => {});
      }).catch(() => {});
    }
  }, []);

  const navigate = useNavigate();
  const handleProfileClick = (e) => setAnchorEl(e.currentTarget);
  const handleProfileClose = () => setAnchorEl(null);
  const currentUserId = localStorage.getItem('currentUserId');

  // Top-left hamburger menu will show the site sections requested
  const menuItems = [
    { text: 'Flights', icon: <FlightIcon />, path: '/listings?type=flight' },
    { text: 'Hotels', icon: <HotelIcon />, path: '/listings?type=hotel' },
    { text: 'Cars', icon: <CarIcon />, path: '/listings?type=car' },
    { text: 'Concierge', icon: <ChatIcon />, path: '/user/dashboard#concierge' },
  ];

  return (
    <Box sx={{ display: 'flex', height: '100vh', bgcolor: 'background.default' }}>
      <AppBar position="fixed" color="primary" sx={{ zIndex: (theme) => theme.zIndex.drawer + 1 }}>
        <Toolbar sx={{ display: 'flex', justifyContent: 'space-between' }}>
          <Box sx={{ display: 'flex', alignItems: 'center' }}>
            <IconButton color="inherit" edge="start" onClick={() => setOpen(!open)} sx={{ mr: 1 }}>
              <MenuIcon />
            </IconButton>
            <Box sx={{ display: 'flex', alignItems: 'center' }}>
              <img src="/logo192.png" alt="Kayak" style={{ height: 32, marginRight: 8 }} />
              <Typography variant="h6" noWrap>Kayak</Typography>
            </Box>
          </Box>

          <Box sx={{ display: 'flex', alignItems: 'center', gap: 1 }}>
            <AgentChatButton inline />
            <IconButton color="inherit" onClick={handleProfileClick} aria-controls={menuOpen ? 'profile-menu' : undefined} aria-haspopup="true">
              <Avatar sx={{ width: 36, height: 36 }}>
                <AccountCircleIcon />
              </Avatar>
            </IconButton>
            <Menu
              id="profile-menu"
              anchorEl={anchorEl}
              open={menuOpen}
              onClose={handleProfileClose}
              anchorOrigin={{ vertical: 'bottom', horizontal: 'right' }}
              transformOrigin={{ vertical: 'top', horizontal: 'right' }}
            >
              <MenuItem onClick={() => { handleProfileClose(); if (currentUserId) navigate(`/user/${encodeURIComponent(currentUserId)}/change`); }}>Edit Profile</MenuItem>
              <MenuItem onClick={() => {
                handleProfileClose();
                localStorage.removeItem('token');
                localStorage.removeItem('currentUserId');
                localStorage.removeItem('userEmail');
                localStorage.removeItem('homeAirport');
                navigate('/user/login');
              }}>Logout</MenuItem>
            </Menu>
          </Box>
        </Toolbar>
      </AppBar>

      <Drawer
        variant="persistent"
        open={open}
        sx={{
          width: drawerWidth,
          flexShrink: 0,
          '& .MuiDrawer-paper': {
            width: drawerWidth,
            boxSizing: 'border-box',
            top: '64px',
            height: 'calc(100% - 64px)'
          }
        }}
      >
        <List>
          {menuItems.map((item) => (
            <ListItem key={item.text} disablePadding>
              <ListItemButton>
                <ListItemIcon>{item.icon}</ListItemIcon>
                <ListItemText primary={item.text} />
              </ListItemButton>
            </ListItem>
          ))}
        </List>
      </Drawer>

      <Box component="main" sx={{ flexGrow: 1, ml: open ? drawerWidth : 0, mt: '64px', height: 'calc(100vh - 64px)' }}>
        <Container maxWidth="lg" sx={{ height: '100%', py: 2 }}>
          <Grid container spacing={2} sx={{ height: '100%' }}>
            <Grid item xs={12} sx={{ height: '40%' }}>
              <Card sx={{ height: '100%', borderRadius: 2, overflow: 'hidden' }}>
                <CardContent sx={{ height: '100%', display: 'flex', flexDirection: 'column', justifyContent: 'space-between', p: 3 }}>
                  {/* Hero/search area similar to Kayak: prominent search fields and CTA */}
                  <Box sx={{ display: 'flex', flexDirection: 'column', gap: 2 }}>
                    <Box>
                      <Typography variant="h4" sx={{ fontWeight: 700 }}>Find great travel deals</Typography>
                      <Typography variant="body2" color="text.secondary">Quick searches for flights, hotels and cars — get started below.</Typography>
                    </Box>

                    <Box sx={{ display: 'flex', gap: 2, alignItems: 'center' }}>
                      <input placeholder="From (city or airport)" style={{ flex: 1, padding: '12px 14px', borderRadius: 8, border: '1px solid #ddd' }} />
                      <input placeholder="To (city or airport)" style={{ flex: 1, padding: '12px 14px', borderRadius: 8, border: '1px solid #ddd' }} />
                      <button style={{ padding: '12px 18px', borderRadius: 8, background: '#ff6b35', color: '#fff', border: 'none' }}>Search</button>
                    </Box>
                  </Box>

                  {/* Quick category buttons (square rounded) */}
                  <Box sx={{ display: 'flex', gap: 2, justifyContent: 'space-between', mt: 2 }}>
                    {[{
                      id: 'flights', label: 'Flights', icon: <FlightIcon sx={{ fontSize: 28 }} />,
                    }, {
                      id: 'hotels', label: 'Hotels', icon: <HotelIcon sx={{ fontSize: 28 }} />,
                    }, {
                      id: 'cars', label: 'Cars', icon: <CarIcon sx={{ fontSize: 28 }} />,
                    }, {
                      id: 'concierge', label: 'Concierge', icon: <ChatIcon sx={{ fontSize: 28 }} />,
                    }].map((b) => (
                      <Box key={b.id} sx={{ flex: '1 1 0', display: 'flex', justifyContent: 'center' }}>
                        <Card onClick={() => {
                          if (b.id === 'concierge') {
                            // scroll to concierge (chat button in top-right)
                            const el = document.querySelector('[aria-label="chat"]');
                            if (el && el.click) el.click();
                          } else {
                            navigate(`/listings?type=${b.id === 'flights' ? 'flight' : b.id}`);
                          }
                        }} sx={{ width: '100%', maxWidth: 220, height: 80, borderRadius: 2, display: 'flex', alignItems: 'center', justifyContent: 'center', cursor: 'pointer' }}>
                          <Box sx={{ textAlign: 'center' }}>
                            <Box sx={{ display: 'flex', alignItems: 'center', justifyContent: 'center', mb: 1 }}>{b.icon}</Box>
                            <Typography variant="subtitle1">{b.label}</Typography>
                          </Box>
                        </Card>
                      </Box>
                    ))}
                  </Box>
                </CardContent>
              </Card>
            </Grid>

            <Grid item xs={12} sx={{ height: '60%', overflow: 'auto' }}>
              <Box sx={{ height: '100%', bgcolor: 'background.paper', p: 2 }}>
                <TabPanel value={tab} index={0}>
                  <Typography variant="h6">Deals & Listings</Typography>
                  <Typography variant="body2" sx={{ mt: 1 }}>Latest deals curated for you.</Typography>

                  <Grid container spacing={2} sx={{ mt: 2 }}>
                    {/* Placeholder sample deals — replace with API-driven content as needed */}
                    {[
                      { id: 1, title: 'NYC → LAX — $129', desc: 'Nonstop, roundtrip — limited seats' },
                      { id: 2, title: 'Paris hotels — from $89/night', desc: 'Top rated hotels this week' },
                      { id: 3, title: 'Car rentals LA — from $25/day', desc: 'Compact cars with free cancellation' },
                      { id: 4, title: 'Weekend getaway — Chicago from $199', desc: 'Flight + Hotel packages' },
                    ].map((deal) => (
                      <Grid item xs={12} sm={6} md={3} key={deal.id}>
                        <Card sx={{ height: '100%', cursor: 'pointer' }} onClick={() => navigate('/listings')}>
                          <CardContent>
                            <Typography variant="subtitle1" sx={{ fontWeight: 700 }}>{deal.title}</Typography>
                            <Typography variant="body2" color="text.secondary">{deal.desc}</Typography>
                          </CardContent>
                        </Card>
                      </Grid>
                    ))}
                  </Grid>
                </TabPanel>
                <TabPanel value={tab} index={1}>
                  <Typography variant="h6">Account</Typography>
                  <Typography variant="body2" sx={{ mt: 1 }}>Manage your account details and email preferences.</Typography>
                </TabPanel>
                <TabPanel value={tab} index={2}>
                  <Typography variant="h6">Preferences</Typography>
                  <Typography variant="body2" sx={{ mt: 1 }}>Set currency, language, and travel preferences.</Typography>
                </TabPanel>
                <TabPanel value={tab} index={3}>
                  <Typography variant="h6">Travelers</Typography>
                  <Typography variant="body2" sx={{ mt: 1 }}>Add or manage travelers on your account.</Typography>
                </TabPanel>
                <TabPanel value={tab} index={4}>
                  <Typography variant="h6">Notifications</Typography>
                  <Typography variant="body2" sx={{ mt: 1 }}>Manage alerts and notifications.</Typography>
                </TabPanel>
              </Box>
            </Grid>
          </Grid>
        </Container>
        
      </Box>
    </Box>
  );
}
