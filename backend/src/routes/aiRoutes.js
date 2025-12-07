const express = require('express');
const router = express.Router();
const aiCtrl = require('../controllers/aiController');

// Public AI endpoints to manage chat sessions/messages
router.post('/sessions', aiCtrl.createSession);
router.get('/sessions', aiCtrl.listSessions);
router.get('/sessions/:id/messages', aiCtrl.getMessages);
router.post('/sessions/:id/messages', aiCtrl.addMessage);
// combined endpoint: persist message and proxy to AI to obtain reply (persisted)
router.post('/sessions/:id/message', aiCtrl.messageAndReply);

module.exports = router;
