import React, { useState } from 'react';
import { Container, TextField, Button, Typography, Box } from '@mui/material';
import usersAPI from '../services/usersAPI';

export default function UserRegister() {
  const [form, setForm] = useState({ user_id: '', first_name: '', last_name: '', email: '', password: '', confirm_password: '' });
  const [message, setMessage] = useState(null);

  const onChange = (e) => setForm({ ...form, [e.target.name]: e.target.value });

  const submit = async () => {
    if (!form.password || form.password.length < 8) {
      setMessage({ severity: 'error', text: 'Password must be at least 8 characters long' });
      return;
    }
    if (form.password !== form.confirm_password) {
      setMessage({ severity: 'error', text: 'Passwords do not match' });
      return;
    }

    try {
      const payload = {
        user_id: form.user_id || undefined,
        first_name: form.first_name || undefined,
        last_name: form.last_name || undefined,
        email: form.email,
        password: form.password
      };

      const res = await usersAPI.register(payload);
      setMessage({ severity: 'success', text: `Registered ${res.data.data.user_id}` });
      setForm({ ...form, password: '', confirm_password: '' });
    } catch (err) {
      setMessage({ severity: 'error', text: err.response?.data?.message || err.message });
    }
  };

  return (
    <Container maxWidth="sm">
      <Box sx={{ mt: 4 }}>
        <Typography variant="h5">User Registration</Typography>
        <TextField fullWidth label="User ID (SSN)" name="user_id" value={form.user_id} onChange={onChange} sx={{ mt: 2 }} />
        <TextField fullWidth label="First name" name="first_name" value={form.first_name} onChange={onChange} sx={{ mt: 2 }} />
        <TextField fullWidth label="Last name" name="last_name" value={form.last_name} onChange={onChange} sx={{ mt: 2 }} />
        <TextField fullWidth label="Email" name="email" value={form.email} onChange={onChange} sx={{ mt: 2 }} />
        <TextField fullWidth label="Password" name="password" type="password" value={form.password} onChange={onChange} sx={{ mt: 2 }} />
        <TextField fullWidth label="Confirm Password" name="confirm_password" type="password" value={form.confirm_password} onChange={onChange} sx={{ mt: 2 }} />
        <Button variant="contained" sx={{ mt: 3 }} onClick={submit}>Register</Button>
        {message && <Typography sx={{ mt: 2 }}>{message.text}</Typography>}
      </Box>
    </Container>
  );
}
