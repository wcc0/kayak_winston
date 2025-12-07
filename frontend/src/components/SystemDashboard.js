import React, { useState, useEffect } from 'react';
import {
  Card,
  CardContent,
  CardHeader,
  Grid,
  Box,
  Typography,
  Chip,
  LinearProgress,
  Alert,
  List,
  ListItem,
  ListItemText,
} from '@mui/material';
import CheckCircleIcon from '@mui/icons-material/CheckCircle';
import ErrorIcon from '@mui/icons-material/Error';
import { conciergeAPI, dealsAPI, checkSystemHealth } from '../services/agentAPI';

export default function SystemDashboard() {
  const [health, setHealth] = useState(null);
  const [stats, setStats] = useState(null);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    const fetchHealth = async () => {
      setLoading(true);
      try {
        const healthData = await checkSystemHealth();
        setHealth(healthData);

        // Fetch stats from Deals Agent
        const statsData = await dealsAPI.getStats();
        setStats(statsData.data);
      } catch (error) {
        console.error('Failed to fetch health:', error);
      } finally {
        setLoading(false);
      }
    };

    fetchHealth();
    const interval = setInterval(fetchHealth, 10000); // Refresh every 10s
    return () => clearInterval(interval);
  }, []);

  if (loading) {
    return <LinearProgress />;
  }

  return (
    <Box sx={{ p: 3 }}>
      <Typography variant="h4" gutterBottom>
        📊 System Dashboard
      </Typography>

      <Grid container spacing={2} sx={{ mb: 3 }}>
        {/* Concierge Agent Status */}
        <Grid item xs={12} sm={6} md={3}>
          <Card>
            <CardContent>
              <Box sx={{ display: 'flex', alignItems: 'center', gap: 1, mb: 1 }}>
                {health?.concierge ? (
                  <CheckCircleIcon sx={{ color: 'green' }} />
                ) : (
                  <ErrorIcon sx={{ color: 'red' }} />
                )}
                <Typography variant="h6">Concierge Agent</Typography>
              </Box>
              <Chip
                label={health?.concierge ? '🟢 Running' : '🔴 Down'}
                color={health?.concierge ? 'success' : 'error'}
                variant="outlined"
              />
              <Typography variant="caption" color="textSecondary" sx={{ display: 'block', mt: 1 }}>
                Port: 8002
              </Typography>
            </CardContent>
          </Card>
        </Grid>

        {/* Deals Agent Status */}
        <Grid item xs={12} sm={6} md={3}>
          <Card>
            <CardContent>
              <Box sx={{ display: 'flex', alignItems: 'center', gap: 1, mb: 1 }}>
                {health?.deals ? (
                  <CheckCircleIcon sx={{ color: 'green' }} />
                ) : (
                  <ErrorIcon sx={{ color: 'red' }} />
                )}
                <Typography variant="h6">Deals Agent</Typography>
              </Box>
              <Chip
                label={health?.deals ? '🟢 Running' : '🔴 Down'}
                color={health?.deals ? 'success' : 'error'}
                variant="outlined"
              />
              <Typography variant="caption" color="textSecondary" sx={{ display: 'block', mt: 1 }}>
                Port: 8003
              </Typography>
            </CardContent>
          </Card>
        </Grid>

        {/* Database Status */}
        <Grid item xs={12} sm={6} md={3}>
          <Card>
            <CardContent>
              <Box sx={{ display: 'flex', alignItems: 'center', gap: 1, mb: 1 }}>
                <CheckCircleIcon sx={{ color: 'green' }} />
                <Typography variant="h6">Database</Typography>
              </Box>
              <Chip
                label="1500 Records"
                variant="outlined"
              />
              <Typography variant="caption" color="textSecondary" sx={{ display: 'block', mt: 1 }}>
                Kaggle Data Loaded
              </Typography>
            </CardContent>
          </Card>
        </Grid>

        {/* LLM Status */}
        <Grid item xs={12} sm={6} md={3}>
          <Card>
            <CardContent>
              <Box sx={{ display: 'flex', alignItems: 'center', gap: 1, mb: 1 }}>
                <CheckCircleIcon sx={{ color: 'green' }} />
                <Typography variant="h6">LLM</Typography>
              </Box>
              <Chip
                label="llama3.2"
                variant="outlined"
              />
              <Typography variant="caption" color="textSecondary" sx={{ display: 'block', mt: 1 }}>
                Ollama: localhost:11434
              </Typography>
            </CardContent>
          </Card>
        </Grid>
      </Grid>

      {/* Stats Card */}
      {stats && (
        <Card sx={{ mb: 3 }}>
          <CardHeader title="Deals Agent Pipeline" />
          <CardContent>
            <Typography variant="body2" gutterBottom>
              <strong>Service:</strong> {stats.service}
            </Typography>
            <Typography variant="body2" gutterBottom>
              <strong>Message:</strong> {stats.message}
            </Typography>
            <Typography variant="body2" gutterBottom>
              <strong>Kafka Topics:</strong>
            </Typography>
            <Box sx={{ display: 'flex', gap: 0.5, flexWrap: 'wrap' }}>
              {stats.kafka_topics?.map((topic) => (
                <Chip key={topic} label={topic} size="small" variant="outlined" />
              ))}
            </Box>
          </CardContent>
        </Card>
      )}

      {/* Features */}
      <Card>
        <CardHeader title="🚀 Enabled Features" />
        <CardContent>
          <List dense>
            <ListItem>
              <ListItemText
                primary="LLM-Powered Chat"
                secondary="Natural language trip planning with intent extraction"
              />
            </ListItem>
            <ListItem>
              <ListItemText
                primary="Real Data Integration"
                secondary="1500 hotel records from Inside Airbnb NYC + Hotel Booking Demand"
              />
            </ListItem>
            <ListItem>
              <ListItemText
                primary="Deal Detection"
                secondary="Automatic scoring and tagging of travel deals"
              />
            </ListItem>
            <ListItem>
              <ListItemText
                primary="Price Tracking"
                secondary="Set alerts and monitor bundle prices"
              />
            </ListItem>
            <ListItem>
              <ListItemText
                primary="Multi-Agent Architecture"
                secondary="Concierge (8002) + Deals (8003) with Kaggle data"
              />
            </ListItem>
          </List>
        </CardContent>
      </Card>

      {health?.error && (
        <Alert severity="error" sx={{ mt: 3 }}>
          {health.error}
        </Alert>
      )}
    </Box>
  );
}
