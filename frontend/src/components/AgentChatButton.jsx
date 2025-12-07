import React, { useState } from 'react';
import { useNavigate } from 'react-router-dom';
import { Fab, Drawer, Box, IconButton, Typography, TextField, Button } from '@mui/material';
import ChatIcon from '@mui/icons-material/Chat';
import CloseIcon from '@mui/icons-material/Close';
import styles from './AgentChatButton.module.css';
import { useTheme } from '@mui/material/styles';

export default function AgentChatButton({ conciergeUrl, inline = false }) {
  const [open, setOpen] = useState(false);
  const [messages, setMessages] = useState([
    { role: 'bot', text: "Hi — I'm your concierge. Ask me to 'find deals' or 'search hotels'." },
  ]);
  const [text, setText] = useState('');
  const theme = useTheme();
  const navigate = useNavigate();

  const handleSend = async () => {
    if (!text.trim()) return;
    const userMsg = { role: 'user', text: text.trim() };
    setMessages((m) => [...m, userMsg]);

    // optimistic local reply while backend is optional
    setText('');

    try {
      const url = conciergeUrl || process.env.REACT_APP_CONCIERGE_URL || 'http://127.0.0.1:8002/chat';
      const resp = await fetch(url, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ session_id: 'web-ui', message: userMsg.text }),
      });
      if (resp.ok) {
        const j = await resp.json();
        setMessages((m) => [...m, { role: 'bot', text: j.reply || j.response || j.message || JSON.stringify(j) }]);
      } else {
        setMessages((m) => [...m, { role: 'bot', text: 'Sorry — concierge service error.' }]);
      }
    } catch (e) {
      // add a single network error reply to inform the user
      setMessages((m) => [...m, { role: 'bot', text: 'Could not reach concierge (network).' }]);
    }
  };

  const handleClear = () => {
    setMessages([{ role: 'bot', text: "Hi — I'm your concierge. Ask me to 'find deals' or 'search hotels'." }]);
  };

  // Render either as inline IconButton (for navbar) or as floating FAB
  // The button now navigates to the `/ai` route which hosts the full chat UI
  const trigger = inline ? (
    <IconButton aria-label="chat" color="inherit" onClick={() => navigate('/ai')}>
      <ChatIcon />
    </IconButton>
  ) : (
    <Fab
      aria-label="chat"
      className={styles.fab}
      color="primary"
      onClick={() => navigate('/ai')}
      sx={{
        right: open ? `calc(24px + 420px)` : 24,
        bottom: 24,
        zIndex: theme.zIndex.drawer + 2,
      }}
    >
      <ChatIcon />
    </Fab>
  );

  return (
    <>
      {trigger}

      <Drawer anchor="right" open={open} onClose={() => setOpen(false)}>
        <Box sx={{ width: 420, maxWidth: '100vw', display: 'flex', flexDirection: 'column', height: '100%' }} className={styles.panel}>
          <Box sx={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', p: 2, borderBottom: '1px solid #eaeaea' }}>
            <Typography variant="h6">Concierge</Typography>
            <IconButton onClick={() => setOpen(false)} size="small"><CloseIcon /></IconButton>
          </Box>

          <Box sx={{ flex: 1, overflow: 'auto', p: 2, display: 'flex', flexDirection: 'column', gap: 1 }}>
            {messages.map((m, idx) => (
              <Box key={idx} sx={{ display: 'flex', justifyContent: m.role === 'user' ? 'flex-end' : 'flex-start' }}>
                <Box className={`${styles.bubble} ${m.role === 'user' ? styles.bubbleUser : styles.bubbleBot}`}>
                  {m.text}
                </Box>
              </Box>
            ))}
          </Box>

          <Box sx={{ p: 2, borderTop: '1px solid #eaeaea' }}>
              <TextField
                fullWidth
                multiline
                maxRows={4}
                value={text}
                placeholder="Ask the concierge..."
                onChange={(e) => setText(e.target.value)}
                onKeyDown={(e) => {
                  // Enter sends the message; Shift+Enter inserts newline
                  if (e.key === 'Enter' && !e.shiftKey) {
                    e.preventDefault();
                    handleSend();
                  }
                }}
                sx={{ mt: 1 }}
              />
              <Box sx={{ display: 'flex', gap: 1, mt: 1 }}>
                <Button variant="text" onClick={handleClear}>Clear</Button>
                <Box sx={{ flex: 1 }} />
                <Button variant="contained" onClick={handleSend}>Send</Button>
              </Box>
          </Box>
        </Box>
      </Drawer>
    </>
  );
}
