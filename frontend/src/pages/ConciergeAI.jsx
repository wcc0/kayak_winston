import React, { useEffect, useState, useRef } from 'react';
import {
  AppBar,
  Avatar,
  Box,
  Button,
  Divider,
  Drawer,
  IconButton,
  List,
  ListItem,
  ListItemButton,
  ListItemText,
  TextField,
  Toolbar,
  Typography,
  useTheme,
} from '@mui/material';
import MenuIcon from '@mui/icons-material/Menu';
import AddIcon from '@mui/icons-material/Add';
import SendIcon from '@mui/icons-material/Send';
import { useNavigate } from 'react-router-dom';

const BACKEND_AI_API = process.env.REACT_APP_BACKEND_AI || '/api/ai';

function simpleId() {
  return 'c-' + Date.now().toString(36) + '-' + Math.random().toString(36).slice(2, 8);
}

function loadChats() {
  try {
    const raw = localStorage.getItem('concierge_chats');
    return raw ? JSON.parse(raw) : [];
  } catch (e) {
    return [];
  }
}

function saveChats(chats) {
  try {
    localStorage.setItem('concierge_chats', JSON.stringify(chats));
  } catch (e) {}
}

export default function ConciergeAI() {
  const [chats, setChats] = useState(() => loadChats());
  const [activeId, setActiveId] = useState(chats?.[0]?.id || null);
  const [text, setText] = useState('');
  const [drawerOpen, setDrawerOpen] = useState(false);
  const scrollRef = useRef(null);
  const navigate = useNavigate();
  const theme = useTheme();

  useEffect(() => {
    if (!activeId && chats.length) setActiveId(chats[0].id);
  }, [chats, activeId]);

  useEffect(() => {
    saveChats(chats);
  }, [chats]);

  const active = chats.find((c) => c.id === activeId) || null;

  const startNew = () => {
    const id = simpleId();
    const title = `Chat ${chats.length + 1}`;
    const newChat = { id, title, messages: [{ role: 'bot', text: "Hi — I'm your concierge. Ask me to find hotels, flights, or deals.", ts: Date.now() }] };
    const next = [newChat, ...chats];
    setChats(next);
    setActiveId(id);
  };

  const selectChat = (id) => setActiveId(id);

  const fmt = (ts) => {
    if (!ts) return '';
    const d = new Date(ts);
    return d.toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' });
  };

  const sendMessage = async () => {
    if (!text.trim() || !activeId) return;
    const payload = text.trim();
    setText('');

    // optimistic UI
    const now = Date.now();
    setChats((prev) => prev.map((c) => (c.id === activeId ? { ...c, messages: [...c.messages, { role: 'user', text: payload, ts: now }] } : c)));

    // ensure session exists (best-effort)
    try { await fetch(`${BACKEND_AI_API}/sessions`, { method: 'POST', headers: { 'Content-Type': 'application/json' }, body: JSON.stringify({ chat_id: activeId, title: active?.title }) }); } catch (e) {}

    // use backend combined endpoint
    try {
      const resp = await fetch(`${BACKEND_AI_API}/sessions/${activeId}/message`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ content: payload }),
      });
      if (resp.ok) {
        const j = await resp.json();
        const reply = j.reply || 'No reply';
        setChats((prev) => prev.map((c) => (c.id === activeId ? { ...c, messages: [...c.messages, { role: 'bot', text: reply, ts: Date.now() }] } : c)));
      } else {
        setChats((prev) => prev.map((c) => (c.id === activeId ? { ...c, messages: [...c.messages, { role: 'bot', text: 'AI proxy error', ts: Date.now() }] } : c)));
      }
    } catch (e) {
      setChats((prev) => prev.map((c) => (c.id === activeId ? { ...c, messages: [...c.messages, { role: 'bot', text: 'Network error reaching AI proxy', ts: Date.now() }] } : c)));
    }
  };

  useEffect(() => {
    if (scrollRef.current) scrollRef.current.scrollTop = scrollRef.current.scrollHeight;
  }, [active?.messages?.length]);

  const goDashboard = () => navigate('/user/dashboard');
  const toggleDrawer = (open) => () => setDrawerOpen(open);

  return (
    <Box sx={{ height: '100vh', display: 'flex', bgcolor: '#fff' }}>
      <AppBar position="fixed" color="default" elevation={0} sx={{ bgcolor: '#fff', borderBottom: '1px solid #e0e0e0' }}>
        <Toolbar>
          <IconButton edge="start" color="inherit" onClick={toggleDrawer(true)} aria-label="menu"><MenuIcon /></IconButton>
          <Typography variant="h6" sx={{ flex: 1, ml: 1, cursor: 'pointer', fontWeight: 600, color: '#FF690F' }} onClick={goDashboard}>KAYAK</Typography>
          <Button variant="text" sx={{ textTransform: 'none', color: '#000' }} onClick={goDashboard}>Dashboard</Button>
        </Toolbar>
      </AppBar>

      <Drawer open={drawerOpen} onClose={toggleDrawer(false)}>
        <Box sx={{ width: 320, p: 2 }} role="presentation">
          <Box sx={{ display: 'flex', alignItems: 'center', gap: 1 }}>
            <Typography variant="h6">Chats</Typography>
            <Box sx={{ flex: 1 }} />
            <IconButton onClick={startNew} size="small"><AddIcon /></IconButton>
          </Box>
          <Divider sx={{ my: 1 }} />
          <List>
            {chats.map((c) => (
              <ListItem key={c.id} disablePadding>
                <ListItemButton selected={c.id === activeId} onClick={() => { selectChat(c.id); setDrawerOpen(false); }}>
                  <ListItemText primary={c.title} secondary={c.messages?.slice(-1)[0]?.text?.slice(0, 80)} />
                </ListItemButton>
              </ListItem>
            ))}
          </List>
        </Box>
      </Drawer>

      <Box sx={{ width: 280, borderRight: '1px solid #e0e0e0', display: { xs: 'none', md: 'flex' }, flexDirection: 'column', bgcolor: '#fafafa' }}>
        <Box sx={{ p: 2.5, display: 'flex', alignItems: 'center', gap: 1 }}>
          <Typography variant="subtitle1" sx={{ fontWeight: 600 }}>Conversations</Typography>
          <Box sx={{ flex: 1 }} />
          <IconButton aria-label="new" onClick={startNew} size="small" sx={{ color: '#FF690F' }}><AddIcon /></IconButton>
        </Box>
        <Divider />
        <List sx={{ overflow: 'auto', flex: 1, px: 1 }}>
          {chats.map((c) => (
            <ListItem key={c.id} disablePadding sx={{ mb: 0.5 }}>
              <ListItemButton 
                selected={c.id === activeId} 
                onClick={() => selectChat(c.id)}
                sx={{ 
                  borderRadius: 1,
                  '&.Mui-selected': { 
                    bgcolor: '#fff', 
                    boxShadow: '0 1px 3px rgba(0,0,0,0.08)',
                    '&:hover': { bgcolor: '#fff' }
                  }
                }}
              >
                <ListItemText 
                  primary={c.title} 
                  secondary={c.messages?.slice(-1)[0]?.text?.slice(0, 60) + '...'}
                  primaryTypographyProps={{ fontWeight: c.id === activeId ? 600 : 400, fontSize: '0.875rem' }}
                  secondaryTypographyProps={{ fontSize: '0.75rem' }}
                />
              </ListItemButton>
            </ListItem>
          ))}
        </List>
      </Box>

      <Box sx={{ flex: 1, display: 'flex', flexDirection: 'column', mt: 8 }}>
        <Box sx={{ p: 3, borderBottom: '1px solid #e0e0e0', bgcolor: '#fff' }}>
          <Typography variant="h5" sx={{ fontWeight: 600, mb: 0.5 }}>{active?.title || 'Chat with KAYAK'}</Typography>
          <Typography variant="body2" color="text.secondary">Get personalized travel recommendations, compare deals, and book with confidence.</Typography>
        </Box>

        <Box sx={{ flex: 1, overflow: 'auto', p: 3, bgcolor: '#f9f9f9' }} ref={scrollRef}>
          {active ? (
            active.messages.map((m, idx) => (
              <Box key={idx} sx={{ display: 'flex', justifyContent: m.role === 'user' ? 'flex-end' : 'flex-start', mb: 3 }}>
                <Box sx={{ display: 'flex', gap: 1.5, alignItems: 'flex-start', maxWidth: '75%' }}>
                  {m.role !== 'user' && <Avatar sx={{ width: 40, height: 40, bgcolor: '#FF690F', color: '#fff', fontSize: '1rem', fontWeight: 600 }}>K</Avatar>}
                  <Box sx={{ flex: 1 }}>
                    <Box sx={{ 
                      bgcolor: m.role === 'user' ? '#FF690F' : '#fff', 
                      color: m.role === 'user' ? '#fff' : '#000', 
                      p: 2, 
                      borderRadius: 3, 
                      boxShadow: '0 1px 3px rgba(0,0,0,0.1)' 
                    }}>
                      <Typography variant="body1" sx={{ whiteSpace: 'pre-wrap', lineHeight: 1.6 }}>{m.text}</Typography>
                    </Box>
                    <Typography variant="caption" sx={{ display: 'block', mt: 0.5, ml: 1, color: 'text.secondary' }}>{fmt(m.ts)}</Typography>
                  </Box>
                  {m.role === 'user' && <Avatar sx={{ width: 40, height: 40, bgcolor: '#1976d2', fontSize: '1rem', fontWeight: 600 }}>U</Avatar>}
                </Box>
              </Box>
            ))
          ) : (
            <Box sx={{ 
              display: 'flex', 
              flexDirection: 'column', 
              alignItems: 'center', 
              justifyContent: 'center', 
              height: '100%', 
              color: 'text.secondary',
              textAlign: 'center'
            }}>
              <Typography variant="h6" sx={{ mb: 1 }}>Welcome to KAYAK AI</Typography>
              <Typography variant="body2">Start a new conversation to explore flights, hotels, and travel deals.</Typography>
              <Button variant="contained" sx={{ mt: 3, bgcolor: '#FF690F', '&:hover': { bgcolor: '#e65e0a' } }} onClick={startNew}>Start New Chat</Button>
            </Box>
          )}
        </Box>

        <Box sx={{ p: 2, borderTop: '1px solid #e0e0e0', bgcolor: '#fff', display: 'flex', gap: 1, alignItems: 'flex-end' }}>
          <TextField 
            fullWidth 
            value={text} 
            onChange={(e) => setText(e.target.value)} 
            placeholder="Ask about flights, hotels, or deals..." 
            multiline 
            maxRows={4} 
            onKeyDown={(e) => { if (e.key === 'Enter' && !e.shiftKey) { e.preventDefault(); sendMessage(); } }}
            variant="outlined"
            sx={{ 
              '& .MuiOutlinedInput-root': { 
                borderRadius: 3,
                '&:hover fieldset': { borderColor: '#FF690F' },
                '&.Mui-focused fieldset': { borderColor: '#FF690F' }
              }
            }}
          />
          <IconButton 
            aria-label="send" 
            onClick={sendMessage}
            sx={{ 
              bgcolor: '#FF690F', 
              color: '#fff',
              width: 48,
              height: 48,
              '&:hover': { bgcolor: '#e65e0a' },
              '&:disabled': { bgcolor: '#ccc' }
            }}
            disabled={!text.trim()}
          >
            <SendIcon />
          </IconButton>
        </Box>
      </Box>
    </Box>
  );
}
