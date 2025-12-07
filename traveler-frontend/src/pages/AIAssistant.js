import React, { useState, useEffect, useRef } from 'react';
import {
  Box,
  Container,
  Paper,
  Typography,
  TextField,
  Button,
  Grid,
  Card,
  CardContent,
  Chip,
  Avatar,
  Divider,
  Alert,
  CircularProgress,
  IconButton,
  Badge,
  Rating,
  List,
  ListItem,
  ListItemText,
} from '@mui/material';
import {
  Send,
  SmartToy,
  Person,
  Flight,
  Hotel,
  TrendingDown,
  Notifications,
  Star,
  Check,
  Error as ErrorIcon,
} from '@mui/icons-material';
import { conciergeAPI, dealsAPI } from '../services/agentAPI';

const AIAssistant = () => {
  const [messages, setMessages] = useState([
    {
      role: 'assistant',
      content: "Hi! I'm your Kayak AI travel concierge. Tell me about your trip plans and I'll find the best deals for you using real Kaggle data.\n\nTry something like:\n• \"I want to go from SFO to NYC in December, budget $1,500\"\n• \"Find me pet-friendly hotels in San Francisco\"\n• \"Show me deals under $200 per night\"",
    }
  ]);
  const [input, setInput] = useState('');
  const [loading, setLoading] = useState(false);
  const [bundles, setBundles] = useState([]);
  const [intent, setIntent] = useState(null);
  const [systemStatus, setSystemStatus] = useState({ concierge: 'checking', deals: 'checking' });
  const [sessionId] = useState(`session-${Date.now()}`);
  
  const messagesEndRef = useRef(null);
  const wsRef = useRef(null);

  // Check system health on mount
  useEffect(() => {
    const checkHealth = async () => {
      try {
        const [conciergeHealth, dealsHealth] = await Promise.all([
          conciergeAPI.health().catch(() => ({ status: 'error' })),
          dealsAPI.health().catch(() => ({ status: 'error' })),
        ]);
        
        setSystemStatus({
          concierge: conciergeHealth.status === 'healthy' ? 'connected' : 'error',
          deals: dealsHealth.status === 'healthy' ? 'connected' : 'error',
        });
      } catch (err) {
        console.error('Health check failed:', err);
        setSystemStatus({ concierge: 'error', deals: 'error' });
      }
    };

    checkHealth();
    const interval = setInterval(checkHealth, 30000);
    return () => clearInterval(interval);
  }, []);

  // Scroll to bottom on new messages
  useEffect(() => {
    messagesEndRef.current?.scrollIntoView({ behavior: 'smooth' });
  }, [messages]);

  const handleSend = async () => {
    if (!input.trim()) return;
    
    const userMessage = { role: 'user', content: input };
    setMessages(prev => [...prev, userMessage]);
    setInput('');
    setLoading(true);
    
    try {
      // Call Concierge Agent with LLM-powered chat
      const response = await conciergeAPI.chat(sessionId, input);
      
      // Add assistant response
      if (response.message) {
        setMessages(prev => [...prev, {
          role: 'assistant',
          content: response.message,
        }]);
      }
      
      // Extract and display intent
      if (response.intent) {
        setIntent(response.intent);
      }
      
      // Display bundles if returned
      if (response.bundles && response.bundles.length > 0) {
        setBundles(response.bundles);
      }
    } catch (err) {
      console.error('Chat error:', err);
      setMessages(prev => [...prev, {
        role: 'assistant',
        content: `Sorry, I encountered an error: ${err.message}. Make sure the Concierge Agent is running on port 8002.`,
      }]);
    } finally {
      setLoading(false);
    }
  };

  const handleKeyPress = (e) => {
    if (e.key === 'Enter' && !e.shiftKey) {
      e.preventDefault();
      handleSend();
    }
  };

  return (
    <Box sx={{ bgcolor: '#f8f9fa', minHeight: '100vh', py: 4 }}>
      <Container maxWidth="lg">
        <Grid container spacing={3}>
          {/* Left Sidebar - Status & Info */}
          <Grid item xs={12} md={3}>
            <Paper sx={{ p: 3, position: 'sticky', top: 100 }}>
              {/* System Status */}
              <Box sx={{ mb: 3 }}>
                <Typography variant="h6" sx={{ mb: 2, fontWeight: 600 }}>
                  System Status
                </Typography>
                
                <Box sx={{ display: 'flex', alignItems: 'center', mb: 1.5 }}>
                  {systemStatus.concierge === 'connected' ? (
                    <Check sx={{ color: 'success.main', mr: 1 }} />
                  ) : (
                    <ErrorIcon sx={{ color: 'error.main', mr: 1 }} />
                  )}
                  <Typography variant="body2">
                    Concierge Agent
                    <br />
                    <code style={{ fontSize: '0.75rem' }}>127.0.0.1:8002</code>
                  </Typography>
                </Box>

                <Box sx={{ display: 'flex', alignItems: 'center', mb: 1.5 }}>
                  {systemStatus.deals === 'connected' ? (
                    <Check sx={{ color: 'success.main', mr: 1 }} />
                  ) : (
                    <ErrorIcon sx={{ color: 'error.main', mr: 1 }} />
                  )}
                  <Typography variant="body2">
                    Deals Agent
                    <br />
                    <code style={{ fontSize: '0.75rem' }}>127.0.0.1:8003</code>
                  </Typography>
                </Box>
              </Box>

              <Divider sx={{ my: 2 }} />

              {/* Kaggle Data Info */}
              <Box sx={{ mb: 3 }}>
                <Typography variant="h6" sx={{ mb: 2, fontWeight: 600 }}>
                  📊 Real Data
                </Typography>
                <Typography variant="body2" color="text.secondary">
                  ✅ 1,000 Inside Airbnb NYC listings
                </Typography>
                <Typography variant="body2" color="text.secondary">
                  ✅ 500 Hotel Booking records
                </Typography>
                <Typography variant="body2" color="text.secondary" sx={{ mt: 1 }}>
                  <strong>Total:</strong> 1,500+ real hotel properties
                </Typography>
              </Box>

              <Divider sx={{ my: 2 }} />

              {/* Current Intent */}
              {intent && (
                <Box>
                  <Typography variant="h6" sx={{ mb: 2, fontWeight: 600 }}>
                    Detected Intent
                  </Typography>
                  <Box sx={{ display: 'flex', flexWrap: 'wrap', gap: 1 }}>
                    {intent.origin && (
                      <Chip icon={<Flight />} label={`From: ${intent.origin}`} size="small" />
                    )}
                    {intent.destination && (
                      <Chip icon={<Hotel />} label={`To: ${intent.destination}`} size="small" />
                    )}
                    {intent.budget && (
                      <Chip label={`Budget: $${intent.budget}`} size="small" />
                    )}
                    {intent.constraints && Object.keys(intent.constraints).length > 0 && (
                      <Chip label={`${Object.keys(intent.constraints).length} constraints`} size="small" />
                    )}
                  </Box>
                </Box>
              )}
            </Paper>
          </Grid>

          {/* Main Chat Area */}
          <Grid item xs={12} md={9}>
            <Grid container spacing={3}>
              {/* Messages Area */}
              <Grid item xs={12}>
                <Paper sx={{ p: 3, minHeight: '500px', maxHeight: '600px', overflow: 'auto', bgcolor: '#ffffff' }}>
                  <Box sx={{ display: 'flex', flexDirection: 'column', gap: 2 }}>
                    {messages.map((msg, idx) => (
                      <Box
                        key={idx}
                        sx={{
                          display: 'flex',
                          justifyContent: msg.role === 'user' ? 'flex-end' : 'flex-start',
                          mb: 1,
                        }}
                      >
                        <Paper
                          sx={{
                            p: 2,
                            maxWidth: '80%',
                            bgcolor: msg.role === 'user' ? 'primary.main' : 'grey.100',
                            color: msg.role === 'user' ? 'white' : 'text.primary',
                            borderRadius: 2,
                          }}
                        >
                          {msg.role === 'assistant' && !msg.content.startsWith('Sorry') && (
                            <Box sx={{ display: 'flex', alignItems: 'center', mb: 1 }}>
                              <SmartToy sx={{ mr: 1, fontSize: '1.2rem' }} />
                              <Typography variant="caption" sx={{ fontWeight: 600 }}>
                                Kayak AI
                              </Typography>
                            </Box>
                          )}
                          <Typography variant="body2" sx={{ whiteSpace: 'pre-wrap' }}>
                            {msg.content}
                          </Typography>
                        </Paper>
                      </Box>
                    ))}
                    {loading && (
                      <Box sx={{ display: 'flex', justifyContent: 'flex-start', mb: 1 }}>
                        <Paper sx={{ p: 2, bgcolor: 'grey.100', borderRadius: 2 }}>
                          <CircularProgress size={24} />
                        </Paper>
                      </Box>
                    )}
                    <div ref={messagesEndRef} />
                  </Box>
                </Paper>
              </Grid>

              {/* Input Area */}
              <Grid item xs={12}>
                <Box sx={{ display: 'flex', gap: 1 }}>
                  <TextField
                    fullWidth
                    multiline
                    maxRows={3}
                    placeholder="Ask me anything about your trip... (e.g., 'Pet-friendly hotels under $200/night in SF')"
                    value={input}
                    onChange={(e) => setInput(e.target.value)}
                    onKeyPress={handleKeyPress}
                    disabled={loading}
                    variant="outlined"
                  />
                  <Button
                    variant="contained"
                    endIcon={<Send />}
                    onClick={handleSend}
                    disabled={!input.trim() || loading}
                    sx={{ alignSelf: 'flex-end' }}
                  >
                    Send
                  </Button>
                </Box>
              </Grid>

              {/* Bundles Display */}
              {bundles.length > 0 && (
                <Grid item xs={12}>
                  <Typography variant="h6" sx={{ mb: 2, fontWeight: 600 }}>
                    🎯 Recommended Bundles ({bundles.length})
                  </Typography>
                  <Grid container spacing={2}>
                    {bundles.map((bundle, idx) => (
                      <Grid item xs={12} key={idx}>
                        <Card sx={{ p: 2 }}>
                          <CardContent>
                            <Grid container spacing={2}>
                              <Grid item xs={12} md={6}>
                                <Typography variant="h6">{bundle.summary || 'Trip Bundle'}</Typography>
                                <Box sx={{ display: 'flex', gap: 1, mt: 1, flexWrap: 'wrap' }}>
                                  {bundle.airline && (
                                    <Chip icon={<Flight />} label={bundle.airline} size="small" />
                                  )}
                                  {bundle.hotel && (
                                    <Chip icon={<Hotel />} label={bundle.hotel} size="small" />
                                  )}
                                  {bundle.neighbourhood && (
                                    <Chip label={`📍 ${bundle.neighbourhood}`} size="small" />
                                  )}
                                </Box>
                                {bundle.amenities && (
                                  <Box sx={{ mt: 2 }}>
                                    <Typography variant="caption" color="text.secondary">
                                      Amenities:
                                    </Typography>
                                    <Box sx={{ display: 'flex', gap: 0.5, flexWrap: 'wrap', mt: 0.5 }}>
                                      {(typeof bundle.amenities === 'string' 
                                        ? JSON.parse(bundle.amenities) 
                                        : bundle.amenities || []
                                      ).slice(0, 4).map((amenity, i) => (
                                        <Chip key={i} label={amenity} size="small" variant="outlined" />
                                      ))}
                                    </Box>
                                  </Box>
                                )}
                              </Grid>
                              <Grid item xs={12} md={6}>
                                <Box sx={{ textAlign: 'right' }}>
                                  <Typography variant="h5" sx={{ color: 'primary.main', fontWeight: 700 }}>
                                    ${bundle.total_price?.toFixed(2) || 'N/A'}
                                  </Typography>
                                  <Box sx={{ display: 'flex', justifyContent: 'flex-end', gap: 2, mt: 1 }}>
                                    <Box>
                                      <Typography variant="caption" color="text.secondary">
                                        Flight
                                      </Typography>
                                      <Typography variant="body2" sx={{ fontWeight: 600 }}>
                                        ${bundle.flight_price?.toFixed(2) || 'N/A'}
                                      </Typography>
                                    </Box>
                                    <Box>
                                      <Typography variant="caption" color="text.secondary">
                                        Hotel
                                      </Typography>
                                      <Typography variant="body2" sx={{ fontWeight: 600 }}>
                                        ${bundle.hotel_price?.toFixed(2) || 'N/A'}
                                      </Typography>
                                    </Box>
                                  </Box>
                                  {bundle.fit_score !== undefined && (
                                    <Box sx={{ mt: 2 }}>
                                      <Typography variant="caption" color="text.secondary">
                                        Fit Score
                                      </Typography>
                                      <Box sx={{ display: 'flex', justifyContent: 'flex-end', mt: 0.5 }}>
                                        <Rating value={bundle.fit_score / 20} readOnly max={5} />
                                      </Box>
                                    </Box>
                                  )}
                                </Box>
                              </Grid>
                            </Grid>
                          </CardContent>
                        </Card>
                      </Grid>
                    ))}
                  </Grid>
                </Grid>
              )}
            </Grid>
          </Grid>
        </Grid>
      </Container>
    </Box>
  );
};

export default AIAssistant;


