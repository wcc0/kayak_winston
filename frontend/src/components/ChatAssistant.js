import React, { useState, useRef, useEffect } from 'react';
import {
  Card,
  CardContent,
  CardHeader,
  TextField,
  Button,
  Box,
  Typography,
  CircularProgress,
  List,
  ListItem,
  ListItemText,
  Paper,
  Chip,
} from '@mui/material';
import SendIcon from '@mui/icons-material/Send';
import { conciergeAPI } from '../services/agentAPI';

export default function ChatAssistant() {
  const [messages, setMessages] = useState([]);
  const [input, setInput] = useState('');
  const [loading, setLoading] = useState(false);
  const [sessionId] = useState(`session-${Date.now()}`);
  const messagesEndRef = useRef(null);

  const scrollToBottom = () => {
    messagesEndRef.current?.scrollIntoView({ behavior: 'smooth' });
  };

  useEffect(() => {
    scrollToBottom();
  }, [messages]);

  const handleSendMessage = async (e) => {
    e.preventDefault();
    if (!input.trim()) return;

    // Add user message
    const userMessage = { role: 'user', content: input };
    setMessages((prev) => [...prev, userMessage]);
    setInput('');
    setLoading(true);

    try {
      const response = await conciergeAPI.chat(sessionId, input);
      const assistantMessage = {
        role: 'assistant',
        content: response.data?.response,
        bundles: response.data?.bundles,
        intent: response.data?.intent,
      };
      setMessages((prev) => [...prev, assistantMessage]);
    } catch (error) {
      setMessages((prev) => [
        ...prev,
        { role: 'assistant', content: `Error: ${error.message}` },
      ]);
    } finally {
      setLoading(false);
    }
  };

  return (
    <Box sx={{ p: 3 }}>
      <Typography variant="h4" gutterBottom>
        💬 Travel Assistant (LLM-Powered)
      </Typography>
      <Typography variant="body2" color="textSecondary" gutterBottom>
        Ask questions about your trip, constraints, or preferences. Using llama3.2 via Ollama.
      </Typography>

      <Card sx={{ height: '600px', display: 'flex', flexDirection: 'column' }}>
        <CardContent sx={{ flexGrow: 1, overflowY: 'auto', display: 'flex', flexDirection: 'column' }}>
          {messages.length === 0 && (
            <Box sx={{ textAlign: 'center', py: 4 }}>
              <Typography color="textSecondary">
                Start by asking about your travel preferences...
              </Typography>
            </Box>
          )}

          {messages.map((message, idx) => (
            <Box
              key={idx}
              sx={{
                mb: 2,
                display: 'flex',
                justifyContent: message.role === 'user' ? 'flex-end' : 'flex-start',
              }}
            >
              <Paper
                sx={{
                  p: 1.5,
                  maxWidth: '70%',
                  backgroundColor: message.role === 'user' ? '#1976d2' : '#f5f5f5',
                  color: message.role === 'user' ? 'white' : 'black',
                }}
              >
                <Typography variant="body2">{message.content}</Typography>

                {message.intent && (
                  <Box sx={{ mt: 1 }}>
                    <Typography variant="caption" fontWeight="bold">
                      Detected Intent:
                    </Typography>
                    <Box sx={{ display: 'flex', gap: 0.5, flexWrap: 'wrap', mt: 0.5 }}>
                      <Chip label={`From: ${message.intent.origin}`} size="small" />
                      <Chip label={`To: ${message.intent.destination}`} size="small" />
                      {message.intent.constraints && (
                        <Chip label={`Constraints: ${message.intent.constraints}`} size="small" />
                      )}
                    </Box>
                  </Box>
                )}

                {message.bundles && message.bundles.length > 0 && (
                  <Box sx={{ mt: 1 }}>
                    <Typography variant="caption" fontWeight="bold">
                      Found {message.bundles.length} Bundles:
                    </Typography>
                    <List dense>
                      {message.bundles.map((bundle) => (
                        <ListItem key={bundle.bundle_id}>
                          <ListItemText
                            primary={bundle.summary}
                            secondary={`$${bundle.total_price} (Score: ${bundle.fit_score})`}
                          />
                        </ListItem>
                      ))}
                    </List>
                  </Box>
                )}
              </Paper>
            </Box>
          ))}

          {loading && (
            <Box sx={{ display: 'flex', justifyContent: 'center', py: 2 }}>
              <CircularProgress size={24} />
            </Box>
          )}

          <div ref={messagesEndRef} />
        </CardContent>

        <Box sx={{ p: 2, borderTop: '1px solid #eee' }}>
          <form onSubmit={handleSendMessage}>
            <Box sx={{ display: 'flex', gap: 1 }}>
              <TextField
                fullWidth
                placeholder="Ask about your trip..."
                value={input}
                onChange={(e) => setInput(e.target.value)}
                disabled={loading}
                size="small"
              />
              <Button
                type="submit"
                variant="contained"
                disabled={loading || !input.trim()}
                endIcon={<SendIcon />}
              >
                Send
              </Button>
            </Box>
          </form>
        </Box>
      </Card>
    </Box>
  );
}
