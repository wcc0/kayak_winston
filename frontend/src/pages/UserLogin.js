import React, { useState } from 'react';
import { useNavigate } from 'react-router-dom';
import {
  Container,
  Paper,
  TextField,
  Button,
  Typography,
  Box,
  Alert,
} from '@mui/material';
import { Person as PersonIcon } from '@mui/icons-material';
import usersAPI from '../services/usersAPI';

const UserLogin = () => {
  const navigate = useNavigate();
  const [formData, setFormData] = useState({ email: '', password: '' });
  const [error, setError] = useState('');
  const [loading, setLoading] = useState(false);

  const handleChange = (e) => {
    setFormData({ ...formData, [e.target.name]: e.target.value });
    setError('');
  };

  const handleSubmit = async (e) => {
    e.preventDefault();
    setError('');
    setLoading(true);

    try {
      const resp = await usersAPI.login({ email: formData.email, password: formData.password });
      if (resp && resp.data && resp.data.data && resp.data.data.token) {
        const token = resp.data.data.token;
        const user = resp.data.data.user;
        localStorage.setItem('token', token);
        localStorage.setItem('currentUserId', user.user_id);
        if (user.email) localStorage.setItem('userEmail', user.email);
        if (user.home_airport) localStorage.setItem('homeAirport', user.home_airport);
        else if (user.city) localStorage.setItem('homeAirport', user.city);
        navigate('/user/dashboard');
      } else {
        setError('Login failed: unexpected response');
      }
    } catch (err) {
      const msg = err.response?.data?.message || err.message || 'Login failed';
      setError(msg);
    }

    setLoading(false);
  };

  return (
    <Container maxWidth="sm">
      <Box sx={{ marginTop: 8, display: 'flex', flexDirection: 'column', alignItems: 'center' }}>
        <Paper elevation={3} sx={{ padding: 4, width: '100%' }}>
          <Box sx={{ display: 'flex', alignItems: 'center', mb: 3 }}>
            <PersonIcon sx={{ fontSize: 40, mr: 2, color: 'primary.main' }} />
            <Typography component="h1" variant="h5">Kayak User Login</Typography>
          </Box>

          {error && (
            <Alert severity="error" sx={{ mb: 2 }}>{error}</Alert>
          )}

          <form onSubmit={handleSubmit}>
            <TextField margin="normal" required fullWidth id="email" label="Email" name="email" autoComplete="email" autoFocus value={formData.email} onChange={handleChange} />
            <TextField margin="normal" required fullWidth name="password" label="Password" type="password" id="password" autoComplete="current-password" value={formData.password} onChange={handleChange} />

            <Button type="submit" fullWidth variant="contained" sx={{ mt: 3, mb: 2 }} disabled={loading}>{loading ? 'Signing In...' : 'Sign In'}</Button>

            <Button fullWidth variant="outlined" sx={{ mt: 1 }} onClick={() => navigate('/login')}>Switch to Admin Login</Button>

            <Button fullWidth variant="text" sx={{ mt: 1 }} onClick={() => navigate('/user/signup')}>Create an account</Button>
          </form>

          <Box sx={{ mt: 2, p: 2, bgcolor: 'grey.100', borderRadius: 1 }}>
            <Typography variant="caption" display="block" gutterBottom><strong>Login:</strong> jdoe@mail.com, testpasS1@</Typography>
          </Box>
        </Paper>
      </Box>
    </Container>
  );
};

export default UserLogin;
