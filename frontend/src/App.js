import React from 'react';
import { BrowserRouter, Routes, Route, Navigate } from 'react-router-dom';
import { ThemeProvider, createTheme } from '@mui/material/styles';
import { AuthProvider } from './context/AuthContext';
import ProtectedRoute from './components/ProtectedRoute';
import Layout from './components/Layout';
import Login from './pages/Login';
import Signup from './pages/Signup';
import Dashboard from './pages/Dashboard';
import ConciergeAI from './pages/ConciergeAI';
import Listings from './pages/Listings';
import Users from './pages/Users';
import Billing from './pages/Billing';
import Analytics from './pages/Analytics';
import UserLogin from './pages/UserLogin';
import UserRegister from './pages/UserRegister';
import UserDashboard from './pages/UserDashboard';
import SystemDashboard from './components/SystemDashboard';
import BundleExplorer from './components/BundleExplorer';
import ChatAssistant from './components/ChatAssistant';

const theme = createTheme({
  palette: {
    primary: {
      main: '#ff6b35',
    },
    secondary: {
      main: '#004e89',
    },
  },
});

function App() {
  return (
    <ThemeProvider theme={theme}>
      <AuthProvider>
        <BrowserRouter>
          <Routes>
            <Route path="/login" element={<Login />} />
            <Route path="/signup" element={<Signup />} />
            <Route path="/ai" element={<ConciergeAI />} />
            <Route path="/user/login" element={<UserLogin />} />
            <Route path="/user/signup" element={<UserRegister />} />
            <Route path="/user/dashboard" element={<UserDashboard />} />
            <Route
              path="/"
              element={
                <ProtectedRoute>
                  <Layout />
                </ProtectedRoute>
              }
            >
              <Route index element={<Navigate to="/dashboard" replace />} />
              <Route path="dashboard" element={<Dashboard />} />
              <Route path="ai" element={<ConciergeAI />} />
              <Route path="listings" element={<Listings />} />
              <Route path="users" element={<Users />} />
              <Route path="billing" element={<Billing />} />
              <Route path="analytics" element={<Analytics />} />
              <Route path="system" element={<SystemDashboard />} />
              <Route path="bundles" element={<BundleExplorer />} />
              <Route path="chat" element={<ChatAssistant />} />
            </Route>
            <Route path="*" element={<Navigate to="/dashboard" replace />} />
          </Routes>
        </BrowserRouter>
      </AuthProvider>
    </ThemeProvider>
  );
}

export default App;
