import express from 'express';
import { WebSocketServer, WebSocket } from 'ws';
import { createServer } from 'http';
import path from 'path';
import { fileURLToPath } from 'url';
import dotenv from 'dotenv';
import cors from 'cors';
import helmet from 'helmet';
import { v4 as uuidv4 } from 'uuid';

dotenv.config();

const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);

const app = express();
const PORT = process.env.PORT || 3000;

// Middleware
app.use(helmet({
  contentSecurityPolicy: {
    directives: {
      defaultSrc: ["'self'"],
      styleSrc: ["'self'", "'unsafe-inline'"],
      scriptSrc: ["'self'"],
      connectSrc: ["'self'", "ws:", "wss:"]
    }
  }
}));

app.use(cors());
app.use(express.json());
// Serve static files from frontend build
const staticPath = process.env.NODE_ENV === 'development' 
  ? path.join(__dirname, '../frontend/dist')
  : path.join(__dirname, '../frontend/dist');
app.use(express.static(staticPath));

// SPA fallback - serve index.html for all non-API routes
app.get('*', (req, res) => {
  if (!req.path.startsWith('/auth') && 
      !req.path.startsWith('/channels') && 
      !req.path.startsWith('/users') && 
      !req.path.startsWith('/dm') && 
      !req.path.startsWith('/webhook') && 
      !req.path.startsWith('/health') &&
      !req.path.startsWith('/ws')) {
    res.sendFile(path.join(staticPath, 'index.html'));
  }
});

// In-memory storage (replace with database in production)
const users = new Map();
const channels = new Map();
const messages = new Map();
const sessions = new Map();
const typingUsers = new Map(); // channelId -> Set of userIds typing

// Default channels
channels.set('general', {
  id: 'general',
  name: 'general',
  description: 'General discussion for everyone',
  type: 'public',
  createdAt: new Date(),
  members: new Set()
});

channels.set('agents', {
  id: 'agents',
  name: 'agents',
  description: 'For OpenClaw agents to communicate',
  type: 'public',
  createdAt: new Date(),
  members: new Set()
});

// Authentication middleware
const authenticate = (req, res, next) => {
  const token = req.headers.authorization?.replace('Bearer ', '');
  if (!token) {
    return res.status(401).json({ error: 'No token provided' });
  }

  const user = sessions.get(token);
  if (!user) {
    return res.status(401).json({ error: 'Invalid token' });
  }

  req.user = user;
  next();
};

// Routes

// Health check
app.get('/health', (req, res) => {
  res.json({
    status: 'ok',
    uptime: process.uptime(),
    timestamp: new Date().toISOString(),
    users: users.size,
    channels: channels.size,
    messages: messages.size
  });
});

// Register user or agent
app.post('/auth/register', (req, res) => {
  const { username, type = 'human', agentKey } = req.body;

  if (!username || typeof username !== 'string') {
    return res.status(400).json({ error: 'Username is required' });
  }

  // Check if username exists
  for (const user of users.values()) {
    if (user.username === username) {
      return res.status(409).json({ error: 'Username already exists' });
    }
  }

  const id = uuidv4();
  const token = uuidv4();
  
  const user = {
    id,
    username,
    type, // 'human' or 'agent'
    agentKey: type === 'agent' ? (agentKey || uuidv4()) : null,
    createdAt: new Date(),
    lastSeen: new Date()
  };

  users.set(id, user);
  sessions.set(token, user);

  console.log(`[ClawChat] ${type} registered: ${username}`);

  res.status(201).json({
    id,
    username,
    token,
    type,
    agentKey: user.agentKey
  });
});

// Login
app.post('/auth/login', (req, res) => {
  const { username, agentKey } = req.body;

  let user;
  for (const u of users.values()) {
    if (u.username === username) {
      user = u;
      break;
    }
  }

  if (!user) {
    return res.status(404).json({ error: 'User not found' });
  }

  // For agents, verify agent key
  if (user.type === 'agent' && agentKey !== user.agentKey) {
    return res.status(401).json({ error: 'Invalid agent key' });
  }

  const token = uuidv4();
  sessions.set(token, user);
  user.lastSeen = new Date();

  res.json({
    id: user.id,
    username: user.username,
    token,
    type: user.type
  });
});

// Get current user
app.get('/me', authenticate, (req, res) => {
  res.json({
    id: req.user.id,
    username: req.user.username,
    type: req.user.type,
    createdAt: req.user.createdAt
  });
});

// List channels
app.get('/channels', authenticate, (req, res) => {
  const channelList = Array.from(channels.values()).map(ch => ({
    id: ch.id,
    name: ch.name,
    description: ch.description,
    type: ch.type,
    memberCount: ch.members.size
  }));

  res.json({ channels: channelList });
});

// Create channel
app.post('/channels', authenticate, (req, res) => {
  const { name, description = '', type = 'public' } = req.body;

  if (!name || typeof name !== 'string') {
    return res.status(400).json({ error: 'Channel name is required' });
  }

  // Check if channel exists
  for (const ch of channels.values()) {
    if (ch.name === name) {
      return res.status(409).json({ error: 'Channel already exists' });
    }
  }

  const id = uuidv4();
  const channel = {
    id,
    name,
    description,
    type,
    createdAt: new Date(),
    members: new Set([req.user.id]),
    createdBy: req.user.id
  };

  channels.set(id, channel);

  console.log(`[ClawChat] Channel created: ${name} by ${req.user.username}`);

  res.status(201).json({
    id,
    name,
    description,
    type
  });
});

// Join channel
app.post('/channels/:id/join', authenticate, (req, res) => {
  const channel = channels.get(req.params.id);
  if (!channel) {
    return res.status(404).json({ error: 'Channel not found' });
  }

  channel.members.add(req.user.id);

  res.json({ success: true });
});

// Get messages
app.get('/channels/:id/messages', authenticate, (req, res) => {
  const channel = channels.get(req.params.id);
  if (!channel) {
    return res.status(404).json({ error: 'Channel not found' });
  }

  const limit = parseInt(req.query.limit) || 50;
  const before = req.query.before;

  let channelMessages = Array.from(messages.values())
    .filter(m => m.channelId === req.params.id)
    .sort((a, b) => b.timestamp - a.timestamp);

  if (before) {
    const beforeDate = new Date(before);
    channelMessages = channelMessages.filter(m => m.timestamp < beforeDate);
  }

  channelMessages = channelMessages.slice(0, limit);

  // Add user info and serialize reactions to messages
  const messagesWithUser = channelMessages.map(m => {
    const user = users.get(m.userId);
    // Convert reaction Sets to arrays with user info
    const reactionsWithUsers = {};
    if (m.reactions) {
      for (const [emoji, userIds] of Object.entries(m.reactions)) {
        reactionsWithUsers[emoji] = Array.from(userIds).map(id => {
          const reactor = users.get(id);
          return {
            userId: id,
            username: reactor?.username || 'Unknown',
            type: reactor?.type || 'unknown'
          };
        });
      }
    }
    return {
      ...m,
      username: user?.username || 'Unknown',
      userType: user?.type || 'unknown',
      reactions: reactionsWithUsers
    };
  });

  res.json({ messages: messagesWithUser.reverse() });
});

// Send message
app.post('/channels/:id/messages', authenticate, (req, res) => {
  const { content } = req.body;
  const channelId = req.params.id;

  if (!content || typeof content !== 'string') {
    return res.status(400).json({ error: 'Message content is required' });
  }

  const channel = channels.get(channelId);
  if (!channel) {
    return res.status(404).json({ error: 'Channel not found' });
  }

  const message = {
    id: uuidv4(),
    channelId,
    userId: req.user.id,
    content: content.slice(0, 2000), // Limit message length
    timestamp: new Date(),
    type: 'text',
    reactions: {} // emoji -> Set of userIds
  };

  messages.set(message.id, message);

  // Broadcast to WebSocket clients
  broadcastToChannel(channelId, {
    event: 'message',
    data: {
      ...message,
      username: req.user.username,
      userType: req.user.type,
      reactions: {}
    }
  });

  res.status(201).json(message);
});

// List users
app.get('/users', authenticate, (req, res) => {
  const userList = Array.from(users.values()).map(u => ({
    id: u.id,
    username: u.username,
    type: u.type,
    online: u.lastSeen > new Date(Date.now() - 300000) // Online if seen in last 5 min
  }));

  res.json({ users: userList });
});

// Add reaction to message
app.post('/channels/:channelId/messages/:messageId/reactions', authenticate, (req, res) => {
  const { emoji } = req.body;
  const { channelId, messageId } = req.params;

  if (!emoji || typeof emoji !== 'string') {
    return res.status(400).json({ error: 'Emoji is required' });
  }

  const message = messages.get(messageId);
  if (!message || message.channelId !== channelId) {
    return res.status(404).json({ error: 'Message not found' });
  }

  // Initialize reactions if not exists
  if (!message.reactions) {
    message.reactions = {};
  }
  if (!message.reactions[emoji]) {
    message.reactions[emoji] = new Set();
  }

  // Add user reaction
  message.reactions[emoji].add(req.user.id);

  // Broadcast reaction update
  broadcastToChannel(channelId, {
    event: 'reaction',
    data: {
      messageId,
      channelId,
      emoji,
      userId: req.user.id,
      username: req.user.username,
      userType: req.user.type,
      action: 'add'
    }
  });

  res.json({ success: true });
});

// Remove reaction from message
app.delete('/channels/:channelId/messages/:messageId/reactions/:emoji', authenticate, (req, res) => {
  const { channelId, messageId, emoji } = req.params;

  const message = messages.get(messageId);
  if (!message || message.channelId !== channelId) {
    return res.status(404).json({ error: 'Message not found' });
  }

  if (message.reactions && message.reactions[emoji]) {
    message.reactions[emoji].delete(req.user.id);
    
    // Remove emoji if no reactions left
    if (message.reactions[emoji].size === 0) {
      delete message.reactions[emoji];
    }

    // Broadcast reaction update
    broadcastToChannel(channelId, {
      event: 'reaction',
      data: {
        messageId,
        channelId,
        emoji,
        userId: req.user.id,
        username: req.user.username,
        userType: req.user.type,
        action: 'remove'
      }
    });
  }

  res.json({ success: true });
});
app.get('/dm/:userId', authenticate, (req, res) => {
  const targetId = req.params.userId;
  const limit = parseInt(req.query.limit) || 50;

  // Get DM messages between these two users
  const dmMessages = Array.from(messages.values())
    .filter(m => 
      m.type === 'dm' && 
      ((m.fromId === req.user.id && m.toId === targetId) ||
       (m.fromId === targetId && m.toId === req.user.id))
    )
    .sort((a, b) => b.timestamp - a.timestamp)
    .slice(0, limit);

  const messagesWithUser = dmMessages.map(m => {
    const user = users.get(m.fromId);
    return {
      ...m,
      username: user?.username || 'Unknown',
      userType: user?.type || 'unknown'
    };
  });

  res.json({ messages: messagesWithUser.reverse() });
});

app.post('/dm/:userId', authenticate, (req, res) => {
  const { content } = req.body;
  const toId = req.params.userId;

  if (!content || typeof content !== 'string') {
    return res.status(400).json({ error: 'Message content is required' });
  }

  const targetUser = users.get(toId);
  if (!targetUser) {
    return res.status(404).json({ error: 'User not found' });
  }

  const message = {
    id: uuidv4(),
    type: 'dm',
    fromId: req.user.id,
    toId,
    content: content.slice(0, 2000),
    timestamp: new Date()
  };

  messages.set(message.id, message);

  // Broadcast to both users if connected
  broadcastToUser(toId, {
    event: 'dm',
    data: {
      ...message,
      username: req.user.username,
      userType: req.user.type
    }
  });

  broadcastToUser(req.user.id, {
    event: 'dm_sent',
    data: message
  });

  res.status(201).json(message);
});

// Agent-specific endpoints

// Simple agent webhook endpoint
app.post('/webhook/agent', (req, res) => {
  const { agentKey, channel, message } = req.body;

  if (!agentKey || !channel || !message) {
    return res.status(400).json({ error: 'agentKey, channel, and message required' });
  }

  // Find agent by key
  let agent;
  for (const u of users.values()) {
    if (u.type === 'agent' && u.agentKey === agentKey) {
      agent = u;
      break;
    }
  }

  if (!agent) {
    return res.status(401).json({ error: 'Invalid agent key' });
  }

  // Find channel
  let targetChannel;
  for (const ch of channels.values()) {
    if (ch.name === channel) {
      targetChannel = ch;
      break;
    }
  }

  if (!targetChannel) {
    return res.status(404).json({ error: 'Channel not found' });
  }

  const msg = {
    id: uuidv4(),
    channelId: targetChannel.id,
    userId: agent.id,
    content: message.slice(0, 2000),
    timestamp: new Date(),
    type: 'text'
  };

  messages.set(msg.id, msg);

  broadcastToChannel(targetChannel.id, {
    event: 'message',
    data: {
      ...msg,
      username: agent.username,
      userType: 'agent'
    }
  });

  res.json({ success: true, messageId: msg.id });
});

// WebSocket handling
const server = createServer(app);
const wss = new WebSocketServer({ server, path: '/ws' });

const clients = new Map();

function broadcastToChannel(channelId, data, excludeUserId = null) {
  for (const [ws, client] of clients) {
    if (client.channels?.has(channelId) && ws.readyState === WebSocket.OPEN) {
      if (!excludeUserId || client.userId !== excludeUserId) {
        ws.send(JSON.stringify(data));
      }
    }
  }
}

function broadcastToUser(userId, data) {
  for (const [ws, client] of clients) {
    if (client.userId === userId && ws.readyState === WebSocket.OPEN) {
      ws.send(JSON.stringify(data));
    }
  }
}

// Typing indicator timeouts
const typingTimeouts = new Map(); // userId_channelId -> timeout

function scheduleTypingClear(userId, channelId) {
  const key = `${userId}_${channelId}`;
  if (typingTimeouts.has(key)) {
    clearTimeout(typingTimeouts.get(key));
  }
  const timeout = setTimeout(() => {
    broadcastTyping(userId, channelId, false);
    typingTimeouts.delete(key);
  }, 10000);
  typingTimeouts.set(key, timeout);
}

function broadcastTyping(userId, channelId, isTyping) {
  if (!typingUsers.has(channelId)) {
    typingUsers.set(channelId, new Set());
  }
  const channelTypers = typingUsers.get(channelId);
  
  if (isTyping) {
    channelTypers.add(userId);
    scheduleTypingClear(userId, channelId);
  } else {
    channelTypers.delete(userId);
    const key = `${userId}_${channelId}`;
    if (typingTimeouts.has(key)) {
      clearTimeout(typingTimeouts.get(key));
      typingTimeouts.delete(key);
    }
  }
  
  // Broadcast typing update to channel
  const user = users.get(userId);
  if (user) {
    broadcastToChannel(channelId, {
      event: 'typing',
      data: {
        channelId,
        userId,
        username: user.username,
        userType: user.type,
        isTyping
      }
    }, userId); // Exclude sender
  }
}

function getTypingUsers(channelId) {
  if (!typingUsers.has(channelId)) return [];
  const userIds = Array.from(typingUsers.get(channelId));
  return userIds.map(id => {
    const user = users.get(id);
    return user ? { id: user.id, username: user.username, type: user.type } : null;
  }).filter(Boolean);
}

wss.on('connection', (ws, req) => {
  const url = new URL(req.url, `http://${req.headers.host}`);
  const token = url.searchParams.get('token');

  if (!token) {
    ws.close(1008, 'Token required');
    return;
  }

  const user = sessions.get(token);
  if (!user) {
    ws.close(1008, 'Invalid token');
    return;
  }

  console.log(`[ClawChat] WebSocket connected: ${user.username}`);

  clients.set(ws, {
    userId: user.id,
    channels: new Set()
  });

  user.lastSeen = new Date();

  // Send welcome
  ws.send(JSON.stringify({
    event: 'connected',
    data: {
      userId: user.id,
      username: user.username,
      message: 'Connected to ClawChat'
    }
  }));

  ws.on('message', (data) => {
    try {
      const parsed = JSON.parse(data.toString());
      const client = clients.get(ws);

      if (parsed.event === 'subscribe') {
        const channelId = parsed.data?.channelId;
        if (channelId) {
          client.channels.add(channelId);
          ws.send(JSON.stringify({
            event: 'subscribed',
            data: { channelId }
          }));
        }
      }

      if (parsed.event === 'unsubscribe') {
        const channelId = parsed.data?.channelId;
        if (channelId) {
          client.channels.delete(channelId);
        }
      }

      if (parsed.event === 'ping') {
        ws.send(JSON.stringify({ event: 'pong', timestamp: Date.now() }));
      }

      if (parsed.event === 'typing') {
        const channelId = parsed.data?.channelId;
        const isTyping = parsed.data?.isTyping;
        if (channelId && typeof isTyping === 'boolean') {
          broadcastTyping(user.id, channelId, isTyping);
        }
      }
    } catch (err) {
      console.error('[ClawChat] WebSocket message error:', err);
    }
  });

  ws.on('close', () => {
    console.log(`[ClawChat] WebSocket disconnected: ${user.username}`);
    // Clear typing status on disconnect
    for (const [channelId, typers] of typingUsers) {
      if (typers.has(user.id)) {
        broadcastTyping(user.id, channelId, false);
      }
    }
    clients.delete(ws);
  });

  ws.on('error', (err) => {
    console.error('[ClawChat] WebSocket error:', err);
  });
});

// Cleanup old messages every hour
setInterval(() => {
  const oneDayAgo = Date.now() - 86400000;
  let cleaned = 0;
  
  for (const [id, msg] of messages) {
    if (msg.timestamp.getTime() < oneDayAgo) {
      messages.delete(id);
      cleaned++;
    }
  }

  if (cleaned > 0) {
    console.log(`[ClawChat] Cleaned up ${cleaned} old messages`);
  }
}, 3600000);

// Start server
server.listen(PORT, () => {
  console.log('╔════════════════════════════════════════════════════════════╗');
  console.log('║                  🤖 ClawChat v1.0.0                        ║');
  console.log('║                                                            ║');
  console.log('║     Chat platform built for OpenClaw agents                ║');
  console.log('║                                                            ║');
  console.log(`║  Web UI:    http://localhost:${PORT.toString().padEnd(27)} ║`);
  console.log(`║  API:       http://localhost:${PORT}/api`.padEnd(57) + '║');
  console.log(`║  WebSocket: ws://localhost:${PORT}/ws`.padEnd(57) + '║');
  console.log('║                                                            ║');
  console.log('╚════════════════════════════════════════════════════════════╝');
  console.log('');
  console.log('[ClawChat] Ready for connections');
  console.log('[ClawChat] Default channels: #general, #agents');
});

// Graceful shutdown
process.on('SIGTERM', () => {
  console.log('[ClawChat] Shutting down gracefully...');
  wss.clients.forEach((ws) => ws.close());
  server.close(() => process.exit(0));
});

process.on('SIGINT', () => {
  console.log('[ClawChat] Shutting down gracefully...');
  wss.clients.forEach((ws) => ws.close());
  server.close(() => process.exit(0));
});
