import React, { useState, useMemo } from 'react';
import { useSearchParams, useNavigate } from 'react-router-dom';
import { Box, Container, Paper, Typography, TextField, MenuItem, Button, Rating, Grid, Alert } from '@mui/material';
import { travelerAPI } from '../services/api';

const SubmitReview = () => {
  const [searchParams] = useSearchParams();
  const navigate = useNavigate();
  const listingType = (searchParams.get('type') || '').toUpperCase();
  const listingId = searchParams.get('id') || '';

  const [form, setForm] = useState({
    user_id: '', // SSN format expected by backend validator
    user_name: '',
    booking_id: '',
    rating: 5,
    title: '',
    review_text: '',
  });
  const [submitting, setSubmitting] = useState(false);
  const [error, setError] = useState('');
  const [success, setSuccess] = useState('');

  const canSubmit = useMemo(() => {
    return (
      !!listingType && !!listingId &&
      form.user_id && form.user_name && form.booking_id &&
      form.rating >= 1 && form.review_text.length >= 10
    );
  }, [listingType, listingId, form]);

  const handleSubmit = async (e) => {
    e.preventDefault();
    setSubmitting(true);
    setError('');
    setSuccess('');
    try {
      const payload = {
        user_id: form.user_id,
        user_name: form.user_name,
        listing_type: listingType,
        listing_id: listingId,
        booking_id: form.booking_id,
        rating: Number(form.rating),
        title: form.title,
        review_text: form.review_text,
      };
      const resp = await travelerAPI.createReview(payload);
      if (resp.data?.success) {
        setSuccess('Review submitted successfully.');
        setTimeout(() => navigate(-1), 900);
      } else {
        setError(resp.data?.message || 'Failed to submit review');
      }
    } catch (err) {
      setError(err?.response?.data?.message || err.message || 'Failed to submit review');
    } finally {
      setSubmitting(false);
    }
  };

  return (
    <Box sx={{ bgcolor: 'grey.50', minHeight: '100vh', py: 6 }}>
      <Container maxWidth="sm">
        <Paper sx={{ p: 3 }}>
          <Typography variant="h5" fontWeight={600} gutterBottom>
            Write a Review
          </Typography>
          <Typography variant="body2" color="text.secondary" gutterBottom>
            Listing: {listingType || 'UNKNOWN'} • {listingId || 'UNKNOWN'}
          </Typography>
          {error && <Alert severity="error" sx={{ mb: 2 }}>{error}</Alert>}
          {success && <Alert severity="success" sx={{ mb: 2 }}>{success}</Alert>}
          <Box component="form" onSubmit={handleSubmit}>
            <Grid container spacing={2}>
              <Grid item xs={12}>
                <TextField
                  label="User ID (SSN format XXX-XX-XXXX)"
                  fullWidth
                  value={form.user_id}
                  onChange={(e) => setForm({ ...form, user_id: e.target.value })}
                  required
                />
              </Grid>
              <Grid item xs={12} sm={6}>
                <TextField
                  label="Your Name"
                  fullWidth
                  value={form.user_name}
                  onChange={(e) => setForm({ ...form, user_name: e.target.value })}
                  required
                />
              </Grid>
              <Grid item xs={12} sm={6}>
                <TextField
                  label="Booking ID"
                  fullWidth
                  value={form.booking_id}
                  onChange={(e) => setForm({ ...form, booking_id: e.target.value })}
                  required
                />
              </Grid>
              <Grid item xs={12}>
                <Typography component="legend">Rating</Typography>
                <Rating
                  name="rating"
                  value={Number(form.rating)}
                  onChange={(_, v) => setForm({ ...form, rating: v || 5 })}
                />
              </Grid>
              <Grid item xs={12}>
                <TextField
                  label="Title (optional)"
                  fullWidth
                  value={form.title}
                  onChange={(e) => setForm({ ...form, title: e.target.value })}
                />
              </Grid>
              <Grid item xs={12}>
                <TextField
                  label="Your Review"
                  fullWidth
                  multiline
                  minRows={4}
                  value={form.review_text}
                  onChange={(e) => setForm({ ...form, review_text: e.target.value })}
                  helperText="Min 10 characters"
                  required
                />
              </Grid>
              <Grid item xs={12}>
                <Button type="submit" variant="contained" fullWidth disabled={!canSubmit || submitting}>
                  {submitting ? 'Submitting...' : 'Submit Review'}
                </Button>
              </Grid>
            </Grid>
          </Box>
        </Paper>
      </Container>
    </Box>
  );
};

export default SubmitReview;
