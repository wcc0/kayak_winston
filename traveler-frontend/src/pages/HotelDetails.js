import React from 'react';
import { useParams, useNavigate } from 'react-router-dom';
import { Container, Typography, Button, Box } from '@mui/material';
import { Hotel } from '@mui/icons-material';

const HotelDetails = () => {
  const { id } = useParams();
  const navigate = useNavigate();

  return (
    <Container maxWidth="md" sx={{ py: 8, textAlign: 'center' }}>
      <Hotel sx={{ fontSize: 80, color: 'primary.main', mb: 2 }} />
      <Typography variant="h4" fontWeight={600} gutterBottom>
        Hotel Details
      </Typography>
      <Typography color="text.secondary" sx={{ mb: 4 }}>
        Hotel ID: {id}
      </Typography>
      <Box sx={{ display: 'flex', gap: 2, justifyContent: 'center' }}>
        <Button variant="outlined" onClick={() => navigate(-1)}>
          Back to Search
        </Button>
        <Button variant="contained" onClick={() => navigate(`/booking/hotels/${id}`)}>
          Book This Hotel
        </Button>
      </Box>
    </Container>
  );
};

export default HotelDetails;

