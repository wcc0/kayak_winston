import React from 'react';
import { Box, Container, Grid, Typography, Link, IconButton } from '@mui/material';
import { Facebook, Twitter, Instagram, LinkedIn } from '@mui/icons-material';

const Footer = () => {
  return (
    <Box
      component="footer"
      sx={{
        bgcolor: 'secondary.main',
        color: 'white',
        py: 6,
        mt: 'auto',
      }}
    >
      <Container maxWidth="lg">
        <Grid container spacing={4}>
          <Grid item xs={12} md={4}>
            <Typography variant="h5" fontWeight={700} sx={{ mb: 2, color: 'primary.main' }}>
              KAYAK
            </Typography>
            <Typography variant="body2" sx={{ opacity: 0.8, mb: 2 }}>
              Find the best deals on flights, hotels, and car rentals. Your journey starts here.
            </Typography>
            <Box sx={{ display: 'flex', gap: 1 }}>
              <IconButton size="small" sx={{ color: 'white' }}>
                <Facebook />
              </IconButton>
              <IconButton size="small" sx={{ color: 'white' }}>
                <Twitter />
              </IconButton>
              <IconButton size="small" sx={{ color: 'white' }}>
                <Instagram />
              </IconButton>
              <IconButton size="small" sx={{ color: 'white' }}>
                <LinkedIn />
              </IconButton>
            </Box>
          </Grid>

          <Grid item xs={6} md={2}>
            <Typography variant="subtitle1" fontWeight={600} sx={{ mb: 2 }}>
              Company
            </Typography>
            <Box sx={{ display: 'flex', flexDirection: 'column', gap: 1 }}>
              <Link href="#" color="inherit" underline="hover" sx={{ opacity: 0.8 }}>About</Link>
              <Link href="#" color="inherit" underline="hover" sx={{ opacity: 0.8 }}>Careers</Link>
              <Link href="#" color="inherit" underline="hover" sx={{ opacity: 0.8 }}>Press</Link>
              <Link href="#" color="inherit" underline="hover" sx={{ opacity: 0.8 }}>Blog</Link>
            </Box>
          </Grid>

          <Grid item xs={6} md={2}>
            <Typography variant="subtitle1" fontWeight={600} sx={{ mb: 2 }}>
              Support
            </Typography>
            <Box sx={{ display: 'flex', flexDirection: 'column', gap: 1 }}>
              <Link href="#" color="inherit" underline="hover" sx={{ opacity: 0.8 }}>Help Center</Link>
              <Link href="#" color="inherit" underline="hover" sx={{ opacity: 0.8 }}>Contact Us</Link>
              <Link href="#" color="inherit" underline="hover" sx={{ opacity: 0.8 }}>FAQs</Link>
              <Link href="#" color="inherit" underline="hover" sx={{ opacity: 0.8 }}>Feedback</Link>
            </Box>
          </Grid>

          <Grid item xs={6} md={2}>
            <Typography variant="subtitle1" fontWeight={600} sx={{ mb: 2 }}>
              Legal
            </Typography>
            <Box sx={{ display: 'flex', flexDirection: 'column', gap: 1 }}>
              <Link href="#" color="inherit" underline="hover" sx={{ opacity: 0.8 }}>Privacy</Link>
              <Link href="#" color="inherit" underline="hover" sx={{ opacity: 0.8 }}>Terms</Link>
              <Link href="#" color="inherit" underline="hover" sx={{ opacity: 0.8 }}>Cookies</Link>
            </Box>
          </Grid>

          <Grid item xs={6} md={2}>
            <Typography variant="subtitle1" fontWeight={600} sx={{ mb: 2 }}>
              Explore
            </Typography>
            <Box sx={{ display: 'flex', flexDirection: 'column', gap: 1 }}>
              <Link href="#" color="inherit" underline="hover" sx={{ opacity: 0.8 }}>Flights</Link>
              <Link href="#" color="inherit" underline="hover" sx={{ opacity: 0.8 }}>Hotels</Link>
              <Link href="#" color="inherit" underline="hover" sx={{ opacity: 0.8 }}>Car Rentals</Link>
              <Link href="#" color="inherit" underline="hover" sx={{ opacity: 0.8 }}>Deals</Link>
            </Box>
          </Grid>
        </Grid>

        <Box sx={{ borderTop: '1px solid rgba(255,255,255,0.1)', mt: 4, pt: 3, textAlign: 'center' }}>
          <Typography variant="body2" sx={{ opacity: 0.6 }}>
            © {new Date().getFullYear()} Kayak. All rights reserved. | Distributed Systems Project
          </Typography>
        </Box>
      </Container>
    </Box>
  );
};

export default Footer;

