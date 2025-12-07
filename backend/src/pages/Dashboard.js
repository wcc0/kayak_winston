import React, { useState, useEffect } from 'react';
import {
  Container,
  Grid,
  Paper,
  Typography,
  Box,
  Card,
  CardContent,
} from '@mui/material';
import {
  People,
  Flight,
  Hotel,
  DirectionsCar,
  AttachMoney,
} from '@mui/icons-material';
import { billingAPI, usersAPI, analyticsAPI } from '../services/api';

const StatCard = ({ title, value, icon, color }) => (
  <Card>
    <CardContent>
      <Box sx={{ display: 'flex', justifyContent: 'space-between' }}>
        <Box>
          <Typography color="textSecondary" gutterBottom>
            {title}
          </Typography>
          <Typography variant="h4">{value}</Typography>
        </Box>
        <Box
          sx={{
            bgcolor: color,
            borderRadius: 2,
            p: 2,
            display: 'flex',
            alignItems: 'center',
          }}
        >
          {icon}
        </Box>
      </Box>
    </CardContent>
  </Card>
);

const Dashboard = () => {
  const [stats, setStats] = useState({
    totalUsers: 0,
    totalRevenue: 0,
    totalBookings: 0,
  });
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    fetchStats();
  }, []);

  const fetchStats = async () => {
    try {
      const year = new Date().getFullYear();
      const [usersRes, billingRes] = await Promise.all([
        usersAPI.getAll(1, 1),
        billingAPI.getStats(year),
      ]);

      setStats({
        totalUsers: usersRes.data.data.pagination.total,
        totalRevenue: billingRes.data.data.totalRevenue,
        totalBookings: billingRes.data.data.revenueByType.reduce(
          (sum, item) => sum + item.count,
          0
        ),
      });
    } catch (error) {
      console.error('Error fetching stats:', error);
    } finally {
      setLoading(false);
    }
  };

  return (
    <Container maxWidth="lg" sx={{ mt: 4, mb: 4 }}>
      <Typography variant="h4" gutterBottom>
        Dashboard
      </Typography>

      <Grid container spacing={3}>
        <Grid item xs={12} sm={6} md={3}>
          <StatCard
            title="Total Users"
            value={loading ? '...' : stats.totalUsers.toLocaleString()}
            icon={<People sx={{ color: 'white', fontSize: 40 }} />}
            color="primary.main"
          />
        </Grid>

        <Grid item xs={12} sm={6} md={3}>
          <StatCard
            title="Total Revenue"
            value={loading ? '...' : `$${stats.totalRevenue.toLocaleString()}`}
            icon={<AttachMoney sx={{ color: 'white', fontSize: 40 }} />}
            color="success.main"
          />
        </Grid>

        <Grid item xs={12} sm={6} md={3}>
          <StatCard
            title="Total Bookings"
            value={loading ? '...' : stats.totalBookings.toLocaleString()}
            icon={<Flight sx={{ color: 'white', fontSize: 40 }} />}
            color="info.main"
          />
        </Grid>

        <Grid item xs={12} sm={6} md={3}>
          <StatCard
            title="Active Listings"
            value="156"
            icon={<Hotel sx={{ color: 'white', fontSize: 40 }} />}
            color="warning.main"
          />
        </Grid>

        <Grid item xs={12}>
          <Paper sx={{ p: 3 }}>
            <Typography variant="h6" gutterBottom>
              Welcome to Kayak Admin Dashboard
            </Typography>
            <Typography variant="body1" color="textSecondary">
              Manage your travel listings, users, billing, and view analytics all in one place.
            </Typography>
          </Paper>
        </Grid>
      </Grid>
    </Container>
  );
};

export default Dashboard;
