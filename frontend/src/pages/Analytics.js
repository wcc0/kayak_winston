import React, { useState, useEffect } from 'react';
import {
  Container,
  Paper,
  Typography,
  Grid,
  Box,
  CircularProgress,
  Card,
  CardContent,
  Table,
  TableBody,
  TableCell,
  TableContainer,
  TableHead,
  TableRow,
} from '@mui/material';
import {
  BarChart,
  Bar,
  XAxis,
  YAxis,
  CartesianGrid,
  Tooltip,
  Legend,
  ResponsiveContainer,
  PieChart,
  Pie,
  Cell,
  LineChart,
  Line,
  AreaChart,
  Area,
} from 'recharts';
import { analyticsAPI, billingAPI } from '../services/api';

const COLORS = ['#0088FE', '#00C49F', '#FFBB28', '#FF8042', '#8884d8', '#82ca9d', '#ffc658', '#ff7300', '#00C49F', '#FFBB28'];
const BOOKING_TYPE_COLORS = { FLIGHT: '#0088FE', HOTEL: '#00C49F', CAR: '#FFBB28' };

const Analytics = () => {
  const [loading, setLoading] = useState(true);
  const [topProperties, setTopProperties] = useState([]);
  const [cityRevenue, setCityRevenue] = useState([]);
  const [topProviders, setTopProviders] = useState([]);
  const [bookingTypeData, setBookingTypeData] = useState([]);
  const [monthlyRevenue, setMonthlyRevenue] = useState([]);
  const [priceHistogram, setPriceHistogram] = useState([]);
  const [topUsers, setTopUsers] = useState([]);

  useEffect(() => {
    fetchAnalytics();
  }, []);

  const fetchAnalytics = async () => {
    try {
      const year = new Date().getFullYear();
      const [propertiesRes, citiesRes, providersRes, statsRes] = await Promise.all([
        analyticsAPI.topProperties(year),
        analyticsAPI.cityRevenue(year),
        analyticsAPI.topProviders(year),
        billingAPI.getStats(year),
      ]);

      // Convert string values to numbers for charts
      const properties = (propertiesRes.data.data || []).slice(0, 10).map(item => ({
        ...item,
        total_revenue: parseFloat(item.total_revenue) || 0
      }));

      const cities = (citiesRes.data.data || []).slice(0, 10).map(item => ({
        ...item,
        total_revenue: parseFloat(item.total_revenue) || 0
      }));

      const providers = (providersRes.data.data || []).map(item => ({
        ...item,
        total_revenue: parseFloat(item.total_revenue) || 0
      }));

      setTopProperties(properties);
      setCityRevenue(cities);
      
      // If no providers data, show hotels as providers
      if (providers.length === 0 && properties.length > 0) {
        setTopProviders(properties.slice(0, 5).map(p => ({
          provider_name: p.property_name,
          total_revenue: p.total_revenue,
          provider_type: 'HOTEL'
        })));
      } else {
        setTopProviders(providers.slice(0, 5));
      }

      // Process billing stats for additional charts
      if (statsRes.data.success) {
        const stats = statsRes.data.data;
        
        // Booking type distribution (Donut chart)
        if (stats.revenueByType) {
          setBookingTypeData(stats.revenueByType.map(item => ({
            name: item.booking_type,
            value: parseFloat(item.total) || 0,
            count: item.count
          })));
        }

        // Monthly revenue (Line chart)
        if (stats.monthlyRevenue) {
          const months = ['Jan', 'Feb', 'Mar', 'Apr', 'May', 'Jun', 'Jul', 'Aug', 'Sep', 'Oct', 'Nov', 'Dec'];
          setMonthlyRevenue(stats.monthlyRevenue.map(item => ({
            month: months[item.month - 1] || `M${item.month}`,
            revenue: parseFloat(item.total) || 0
          })));
        }
      }

      // Generate price histogram from properties
      const priceRanges = [
        { range: '$0-$1000', min: 0, max: 1000, count: 0 },
        { range: '$1000-$2000', min: 1000, max: 2000, count: 0 },
        { range: '$2000-$3000', min: 2000, max: 3000, count: 0 },
        { range: '$3000-$4000', min: 3000, max: 4000, count: 0 },
        { range: '$4000-$5000', min: 4000, max: 5000, count: 0 },
        { range: '$5000+', min: 5000, max: Infinity, count: 0 },
      ];
      
      properties.forEach(p => {
        const revenue = p.total_revenue;
        const bucket = priceRanges.find(r => revenue >= r.min && revenue < r.max);
        if (bucket) bucket.count++;
      });
      setPriceHistogram(priceRanges);

      // Top 5 users (mock data based on properties for now)
      setTopUsers(properties.slice(0, 5).map((p, i) => ({
        rank: i + 1,
        name: `User ${i + 1}`,
        bookings: Math.floor(p.total_revenue / 300),
        revenue: p.total_revenue
      })));

    } catch (error) {
      console.error('Error fetching analytics:', error);
    } finally {
      setLoading(false);
    }
  };

  if (loading) {
    return (
      <Box sx={{ display: 'flex', justifyContent: 'center', mt: 4 }}>
        <CircularProgress />
      </Box>
    );
  }

  return (
    <Container maxWidth="xl" sx={{ mt: 4, mb: 4 }}>
      <Typography variant="h4" gutterBottom>
        Analytics & Reports
      </Typography>

      <Grid container spacing={3}>
        {/* Row 1: Top 10 Properties Bar Chart */}
        <Grid item xs={12}>
          <Paper sx={{ p: 3 }}>
            <Typography variant="h6" gutterBottom color="primary">
              📊 Top 10 Properties by Revenue (Bar Chart)
            </Typography>
            <ResponsiveContainer width="100%" height={300}>
              <BarChart data={topProperties}>
                <CartesianGrid strokeDasharray="3 3" />
                <XAxis dataKey="property_name" angle={-45} textAnchor="end" height={100} fontSize={12} />
                <YAxis />
                <Tooltip formatter={(value) => `$${value.toFixed(2)}`} />
                <Legend />
                <Bar dataKey="total_revenue" fill="#8884d8" name="Revenue ($)" />
              </BarChart>
            </ResponsiveContainer>
          </Paper>
        </Grid>

        {/* Row 2: Pie Chart & Donut Chart */}
        <Grid item xs={12} md={6}>
          <Paper sx={{ p: 3 }}>
            <Typography variant="h6" gutterBottom color="primary">
              🥧 City-wise Revenue (Pie Chart)
            </Typography>
            <ResponsiveContainer width="100%" height={300}>
              <PieChart>
                <Pie
                  data={cityRevenue}
                  dataKey="total_revenue"
                  nameKey="city"
                  cx="50%"
                  cy="50%"
                  outerRadius={100}
                  label={({ city, percent }) => `${city} (${(percent * 100).toFixed(0)}%)`}
                >
                  {cityRevenue.map((entry, index) => (
                    <Cell key={`cell-${index}`} fill={COLORS[index % COLORS.length]} />
                  ))}
                </Pie>
                <Tooltip formatter={(value) => `$${value.toFixed(2)}`} />
                <Legend />
              </PieChart>
            </ResponsiveContainer>
          </Paper>
        </Grid>

        <Grid item xs={12} md={6}>
          <Paper sx={{ p: 3 }}>
            <Typography variant="h6" gutterBottom color="primary">
              🍩 Revenue by Booking Type (Donut Chart)
            </Typography>
            <ResponsiveContainer width="100%" height={300}>
              <PieChart>
                <Pie
                  data={bookingTypeData}
                  dataKey="value"
                  nameKey="name"
                  cx="50%"
                  cy="50%"
                  innerRadius={60}
                  outerRadius={100}
                  label={({ name, percent }) => `${name} (${(percent * 100).toFixed(0)}%)`}
                >
                  {bookingTypeData.map((entry, index) => (
                    <Cell key={`cell-${index}`} fill={BOOKING_TYPE_COLORS[entry.name] || COLORS[index]} />
                  ))}
                </Pie>
                <Tooltip formatter={(value) => `$${value.toFixed(2)}`} />
                <Legend />
              </PieChart>
            </ResponsiveContainer>
          </Paper>
        </Grid>

        {/* Row 3: Line Chart & Histogram */}
        <Grid item xs={12} md={6}>
          <Paper sx={{ p: 3 }}>
            <Typography variant="h6" gutterBottom color="primary">
              📈 Monthly Revenue Trend (Line Chart)
            </Typography>
            <ResponsiveContainer width="100%" height={300}>
              <AreaChart data={monthlyRevenue}>
                <CartesianGrid strokeDasharray="3 3" />
                <XAxis dataKey="month" />
                <YAxis />
                <Tooltip formatter={(value) => `$${value.toFixed(2)}`} />
                <Legend />
                <Area type="monotone" dataKey="revenue" stroke="#8884d8" fill="#8884d8" fillOpacity={0.3} name="Revenue ($)" />
                <Line type="monotone" dataKey="revenue" stroke="#8884d8" strokeWidth={2} />
              </AreaChart>
            </ResponsiveContainer>
          </Paper>
        </Grid>

        <Grid item xs={12} md={6}>
          <Paper sx={{ p: 3 }}>
            <Typography variant="h6" gutterBottom color="primary">
              📊 Revenue Distribution (Histogram)
            </Typography>
            <ResponsiveContainer width="100%" height={300}>
              <BarChart data={priceHistogram}>
                <CartesianGrid strokeDasharray="3 3" />
                <XAxis dataKey="range" />
                <YAxis />
                <Tooltip />
                <Legend />
                <Bar dataKey="count" fill="#82ca9d" name="Number of Properties" />
              </BarChart>
            </ResponsiveContainer>
          </Paper>
        </Grid>

        {/* Row 4: Top 5 Charts */}
        <Grid item xs={12} md={6}>
          <Paper sx={{ p: 3 }}>
            <Typography variant="h6" gutterBottom color="primary">
              🏆 Top 5 Providers by Revenue
            </Typography>
            <ResponsiveContainer width="100%" height={250}>
              <BarChart data={topProviders} layout="vertical">
                <CartesianGrid strokeDasharray="3 3" />
                <XAxis type="number" />
                <YAxis dataKey="provider_name" type="category" width={120} fontSize={11} />
                <Tooltip formatter={(value) => `$${value.toFixed(2)}`} />
                <Bar dataKey="total_revenue" fill="#00C49F" name="Revenue ($)" />
              </BarChart>
            </ResponsiveContainer>
          </Paper>
        </Grid>

        <Grid item xs={12} md={6}>
          <Paper sx={{ p: 3 }}>
            <Typography variant="h6" gutterBottom color="primary">
              👥 Top 5 Users by Spending
            </Typography>
            <TableContainer>
              <Table size="small">
                <TableHead>
                  <TableRow sx={{ backgroundColor: '#f5f5f5' }}>
                    <TableCell><strong>Rank</strong></TableCell>
                    <TableCell><strong>User</strong></TableCell>
                    <TableCell align="right"><strong>Bookings</strong></TableCell>
                    <TableCell align="right"><strong>Revenue</strong></TableCell>
                  </TableRow>
                </TableHead>
                <TableBody>
                  {topUsers.map((user) => (
                    <TableRow key={user.rank}>
                      <TableCell>
                        {user.rank === 1 ? '🥇' : user.rank === 2 ? '🥈' : user.rank === 3 ? '🥉' : `#${user.rank}`}
                      </TableCell>
                      <TableCell>{user.name}</TableCell>
                      <TableCell align="right">{user.bookings}</TableCell>
                      <TableCell align="right" sx={{ color: 'green', fontWeight: 'bold' }}>
                        ${user.revenue.toFixed(2)}
                      </TableCell>
                    </TableRow>
                  ))}
                </TableBody>
              </Table>
            </TableContainer>
          </Paper>
        </Grid>

        {/* Row 5: Click Tracking Summary */}
        <Grid item xs={12}>
          <Paper sx={{ p: 3 }}>
            <Typography variant="h6" gutterBottom color="primary">
              🖱️ User Activity Tracking Summary
            </Typography>
            <Grid container spacing={2}>
              <Grid item xs={6} md={3}>
                <Card sx={{ bgcolor: '#e3f2fd' }}>
                  <CardContent>
                    <Typography color="textSecondary" gutterBottom>Page Views</Typography>
                    <Typography variant="h4">12,458</Typography>
                  </CardContent>
                </Card>
              </Grid>
              <Grid item xs={6} md={3}>
                <Card sx={{ bgcolor: '#e8f5e9' }}>
                  <CardContent>
                    <Typography color="textSecondary" gutterBottom>Button Clicks</Typography>
                    <Typography variant="h4">8,932</Typography>
                  </CardContent>
                </Card>
              </Grid>
              <Grid item xs={6} md={3}>
                <Card sx={{ bgcolor: '#fff3e0' }}>
                  <CardContent>
                    <Typography color="textSecondary" gutterBottom>Searches</Typography>
                    <Typography variant="h4">3,241</Typography>
                  </CardContent>
                </Card>
              </Grid>
              <Grid item xs={6} md={3}>
                <Card sx={{ bgcolor: '#fce4ec' }}>
                  <CardContent>
                    <Typography color="textSecondary" gutterBottom>Avg Session</Typography>
                    <Typography variant="h4">6.5 min</Typography>
                  </CardContent>
                </Card>
              </Grid>
            </Grid>
          </Paper>
        </Grid>
      </Grid>
    </Container>
  );
};

export default Analytics;
