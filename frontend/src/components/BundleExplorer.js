import React, { useState, useEffect } from 'react';
import {
  Card,
  CardContent,
  CardHeader,
  Grid,
  TextField,
  Button,
  CircularProgress,
  Alert,
  Chip,
  Box,
  Typography,
  Rating,
} from '@mui/material';
import { conciergeAPI } from '../services/agentAPI';

export default function BundleExplorer() {
  const [origin, setOrigin] = useState('SFO');
  const [destination, setDestination] = useState('NYC');
  const [hotelLocation, setHotelLocation] = useState('NYC');
  const [nights, setNights] = useState(3);
  const [bundles, setBundles] = useState([]);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState(null);

  const fetchBundles = async () => {
    setLoading(true);
    setError(null);
    try {
      const response = await conciergeAPI.getBundles(origin, destination, hotelLocation, nights);
      setBundles(response.data?.bundles || []);
    } catch (err) {
      setError(`Failed to fetch bundles: ${err.message}`);
      console.error(err);
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    // Load initial bundles on component mount
    fetchBundles();
  }, []);

  const handleSearch = (e) => {
    e.preventDefault();
    fetchBundles();
  };

  return (
    <Box sx={{ p: 3 }}>
      <Typography variant="h4" gutterBottom>
        🌍 Travel Bundle Explorer
      </Typography>
      <Typography variant="body2" color="textSecondary" gutterBottom>
        Powered by Real Kaggle Data - 1500+ Hotels from Inside Airbnb
      </Typography>

      <Card sx={{ mb: 3 }}>
        <CardHeader title="Search Bundles" />
        <CardContent>
          <form onSubmit={handleSearch}>
            <Grid container spacing={2} sx={{ mb: 2 }}>
              <Grid item xs={12} sm={6} md={3}>
                <TextField
                  label="Origin Airport"
                  value={origin}
                  onChange={(e) => setOrigin(e.target.value.toUpperCase())}
                  placeholder="e.g., SFO"
                  fullWidth
                />
              </Grid>
              <Grid item xs={12} sm={6} md={3}>
                <TextField
                  label="Destination Airport"
                  value={destination}
                  onChange={(e) => setDestination(e.target.value.toUpperCase())}
                  placeholder="e.g., NYC"
                  fullWidth
                />
              </Grid>
              <Grid item xs={12} sm={6} md={3}>
                <TextField
                  label="Hotel City"
                  value={hotelLocation}
                  onChange={(e) => setHotelLocation(e.target.value)}
                  placeholder="e.g., NYC"
                  fullWidth
                />
              </Grid>
              <Grid item xs={12} sm={6} md={3}>
                <TextField
                  label="Nights"
                  type="number"
                  value={nights}
                  onChange={(e) => setNights(parseInt(e.target.value))}
                  inputProps={{ min: 1, max: 30 }}
                  fullWidth
                />
              </Grid>
            </Grid>
            <Button type="submit" variant="contained" disabled={loading}>
              {loading ? <CircularProgress size={24} /> : 'Search Bundles'}
            </Button>
          </form>
        </CardContent>
      </Card>

      {error && (
        <Alert severity="error" sx={{ mb: 2 }}>
          {error}
        </Alert>
      )}

      {loading && (
        <Box sx={{ display: 'flex', justifyContent: 'center', py: 4 }}>
          <CircularProgress />
        </Box>
      )}

      {!loading && bundles.length === 0 && !error && (
        <Alert severity="info">No bundles found. Try different search criteria.</Alert>
      )}

      <Grid container spacing={2}>
        {bundles.map((bundle, idx) => (
          <Grid item xs={12} sm={6} md={4} key={bundle.bundle_id || idx}>
            <Card sx={{ height: '100%', display: 'flex', flexDirection: 'column' }}>
              <CardHeader
                title={bundle.summary}
                subheader={`ID: ${bundle.bundle_id}`}
              />
              <CardContent sx={{ flexGrow: 1 }}>
                <Typography variant="h6" color="primary">
                  ${bundle.total_price}
                </Typography>
                <Box sx={{ my: 1 }}>
                  <Typography variant="body2" color="textSecondary">
                    ✈️ Flight: ${bundle.flight_price}
                  </Typography>
                  <Typography variant="body2" color="textSecondary">
                    🏨 Hotel: ${bundle.hotel_price}
                  </Typography>
                </Box>

                <Box sx={{ my: 2 }}>
                  <Typography variant="body2" gutterBottom>
                    Fit Score:
                  </Typography>
                  <Rating
                    value={bundle.fit_score}
                    max={5}
                    precision={0.1}
                    readOnly
                  />
                </Box>

                <Typography variant="body2" gutterBottom>
                  <strong>Airline:</strong> {bundle.details?.airline}
                </Typography>
                <Typography variant="body2" gutterBottom>
                  <strong>Hotel:</strong> {bundle.details?.hotel}
                </Typography>
                <Typography variant="body2" gutterBottom>
                  <strong>Neighbourhood:</strong> {bundle.details?.neighbourhood}
                </Typography>

                {bundle.details?.amenities && (
                  <Box sx={{ mt: 1 }}>
                    {bundle.details.amenities.split(',').map((amenity) => (
                      <Chip
                        key={amenity}
                        label={amenity.trim()}
                        size="small"
                        sx={{ mr: 0.5, mb: 0.5 }}
                      />
                    ))}
                  </Box>
                )}

                <Typography variant="caption" color="textSecondary" sx={{ mt: 1, display: 'block' }}>
                  💡 {bundle.why_this}
                </Typography>
                <Typography variant="caption" color="textSecondary" display="block">
                  📌 {bundle.what_to_watch}
                </Typography>
              </CardContent>
            </Card>
          </Grid>
        ))}
      </Grid>
    </Box>
  );
}
