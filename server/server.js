import express from 'express';
import { WebSocketServer, WebSocket } from 'ws';
import { createServer } from 'http';
import path from 'path';
import { fileURLToPath } from 'url';
import dotenv from 'dotenv';
import cors from 'cors';
import helmet from 'helmet';
import { v4 as uuidv4 } from 'uuid';
import multer from 'multer';
import fs from 'fs';

dotenv.config();

const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);

// Ensure uploads directory exists
const uploadsDir = path.join(__dirname, '../uploads');
if (!fs.existsSync(uploadsDir)) {
  fs.mkdirSync(uploadsDir, { recursive: true });
}

// Configure multer for file uploads
const storage = multer.diskStorage({
  destination: (req, file, cb) => {
    cb(null, uploadsDir);
  },
  filename: (req, file, cb) => {
    const uniqueName = `${Date.now()}-${uuidv4()}${path.extname(file.originalname)}`;
    cb(null, uniqueName);
  }
});

const upload = multer({
  storage,
  limits: {
    fileSize: 10 * 1024 * 1024 // 10MB limit
  },
  fileFilter: (req, file, cb) => {
    // Allow images and common file types
    const allowedMimes = [
      'image/jpeg', 'image/png', 'image/gif', 'image/webp', 'image/svg+xml',
      'application/pdf', 'text/plain', 'text/markdown',
      'application/json', 'application/javascript',
      'video/mp4', 'video/webm', 'audio/mpeg', 'audio/wav', 'audio/webm'
    ];
    if (allowedMimes.includes(file.mimetype)) {
      cb(null, true);
    } else {
      cb(new Error(`File type not allowed: ${file.mimetype}`), false);
    }
  }
});

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
// Serve static files from uploads directory
app.use('/uploads', express.static(uploadsDir));
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
const channelReadStatus = new Map(); // userId -> { channelId -> lastReadTimestamp }

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

// File upload endpoint
app.post('/upload', authenticate, upload.array('files', 5), (req, res) => {
  try {
    if (!req.files || req.files.length === 0) {
      return res.status(400).json({ error: 'No files uploaded' });
    }

    const uploadedFiles = req.files.map(file => ({
      id: uuidv4(),
      filename: file.filename,
      originalName: file.originalname,
      mimeType: file.mimetype,
      size: file.size,
      url: `/uploads/${file.filename}`,
      uploadedAt: new Date()
    }));

    res.json({
      success: true,
      files: uploadedFiles
    });
  } catch (err) {
    console.error('[ClawChat] Upload error:', err);
    res.status(500).json({ error: 'Upload failed', details: err.message });
  }
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

// Get unread counts for all channels
app.get('/channels/unread', authenticate, (req, res) => {
  const userId = req.user.id;
  const userReadStatus = channelReadStatus.get(userId) || {};
  
  const unreadCounts = {};
  
  for (const [channelId, channel] of channels) {
    const lastRead = userReadStatus[channelId];
    
    // Count messages after lastRead timestamp
    let count = 0;
    for (const msg of messages.values()) {
      if (msg.channelId === channelId && msg.userId !== userId) {
        if (!lastRead || msg.timestamp > lastRead) {
          count++;
        }
      }
    }
    
    unreadCounts[channelId] = count;
  }
  
  res.json({ unreadCounts });
});

// Mark channel as read
app.post('/channels/:id/read', authenticate, (req, res) => {
  const channelId = req.params.id;
  const userId = req.user.id;
  
  const channel = channels.get(channelId);
  if (!channel) {
    return res.status(404).json({ error: 'Channel not found' });
  }
  
  // Initialize user's read status if needed
  if (!channelReadStatus.has(userId)) {
    channelReadStatus.set(userId, {});
  }
  
  // Mark as read with current timestamp
  const userReadStatus = channelReadStatus.get(userId);
  userReadStatus[channelId] = new Date();
  
  res.json({ success: true, channelId });
});

// Search messages in a channel
app.get('/channels/:id/search', authenticate, (req, res) => {
  const channel = channels.get(req.params.id);
  if (!channel) {
    return res.status(404).json({ error: 'Channel not found' });
  }

  const { query, limit = 20 } = req.query;
  
  if (!query || typeof query !== 'string') {
    return res.status(400).json({ error: 'Query parameter is required' });
  }

  const searchTerm = query.toLowerCase();
  
  let channelMessages = Array.from(messages.values())
    .filter(m => 
      m.channelId === req.params.id && 
      !m.deleted &&
      m.content.toLowerCase().includes(searchTerm)
    )
    .sort((a, b) => b.timestamp - a.timestamp)
    .slice(0, parseInt(limit));

  // Add user info to messages
  const messagesWithUser = channelMessages.map(m => {
    const user = users.get(m.userId);
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
    // Get reply message data if exists
    let replyData = null;
    if (m.replyTo) {
      const replyMessage = messages.get(m.replyTo);
      if (replyMessage) {
        const replyUser = users.get(replyMessage.userId);
        replyData = {
          id: replyMessage.id,
          content: replyMessage.content.slice(0, 100), // Truncate long messages
          username: replyUser?.username || 'Unknown',
          userType: replyUser?.type || 'unknown'
        };
      }
    }
    return {
      ...m,
      username: user?.username || 'Unknown',
      userType: user?.type || 'unknown',
      reactions: reactionsWithUsers,
      replyToData: replyData,
      attachments: m.attachments || [],
      threadReplyCount: m.threadReplyCount || 0,
      lastThreadReplyAt: m.lastThreadReplyAt || null
    });
  });

  res.json({ messages: messagesWithUser.reverse() });
});

// Get thread messages for a parent message
app.get('/channels/:channelId/messages/:messageId/threads', authenticate, (req, res) => {
  const { channelId, messageId } = req.params;

  const channel = channels.get(channelId);
  if (!channel) {
    return res.status(404).json({ error: 'Channel not found' });
  }

  const parentMessage = messages.get(messageId);
  if (!parentMessage || parentMessage.channelId !== channelId) {
    return res.status(404).json({ error: 'Message not found in this channel' });
  }

  // Get all thread replies
  const threadMessages = Array.from(messages.values())
    .filter(m => m.threadId === messageId)
    .sort((a, b) => a.timestamp - b.timestamp);

  // Add user info to messages
  const messagesWithUser = threadMessages.map(m => {
    const user = users.get(m.userId);
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
      reactions: reactionsWithUsers,
      attachments: m.attachments || []
    };
  });

  res.json({ 
    parentMessage: {
      ...parentMessage,
      username: users.get(parentMessage.userId)?.username || 'Unknown',
      userType: users.get(parentMessage.userId)?.type || 'unknown'
    },
    messages: messagesWithUser 
  });
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

  const { replyTo, threadId } = req.body;
  
  // Validate replyTo if provided
  if (replyTo) {
    const replyMessage = messages.get(replyTo);
    if (!replyMessage || replyMessage.channelId !== channelId) {
      return res.status(404).json({ error: 'Reply message not found in this channel' });
    }
  }
  
  // Validate threadId if provided
  if (threadId) {
    const threadParent = messages.get(threadId);
    if (!threadParent || threadParent.channelId !== channelId) {
      return res.status(404).json({ error: 'Thread parent not found in this channel' });
    }
  }

  // Check for bot commands
  const commandResult = executeCommand(content, req.user);
  if (commandResult) {
    // Create a command response message from the system
    const responseMessage = {
      id: uuidv4(),
      channelId,
      userId: 'system',
      content: commandResult.content,
      timestamp: new Date(),
      type: 'command_response',
      reactions: {},
      replyTo: replyTo || null,
      command: true,
      ephemeral: commandResult.ephemeral
    };

    messages.set(responseMessage.id, responseMessage);

    // Get reply data for broadcast
    let replyData = null;
    if (responseMessage.replyTo) {
      const replyMessage = messages.get(responseMessage.replyTo);
      if (replyMessage) {
        const replyUser = users.get(replyMessage.userId);
        replyData = {
          id: replyMessage.id,
          content: replyMessage.content.slice(0, 100),
          username: replyUser?.username || 'Unknown',
          userType: replyUser?.type || 'unknown'
        };
      }
    }

    // Broadcast to WebSocket clients
    broadcastToChannel(channelId, {
      event: 'message',
      data: {
        ...responseMessage,
        username: '🤖 ClawBot',
        userType: 'agent',
        reactions: {},
        replyToData: replyData
      }
    });

    return res.status(201).json(responseMessage);
  }

  const message = {
    id: uuidv4(),
    channelId,
    userId: req.user.id,
    content: content.slice(0, 2000), // Limit message length
    timestamp: new Date(),
    type: 'text',
    reactions: {}, // emoji -> Set of userIds
    replyTo: replyTo || null,
    threadId: threadId || null, // Parent thread message ID
    attachments: req.body.attachments || [] // Array of uploaded file metadata
  };

  messages.set(message.id, message);
  
  // If this is a thread reply, update the parent's thread reply count
  if (threadId) {
    const threadParent = messages.get(threadId);
    if (threadParent) {
      threadParent.threadReplyCount = (threadParent.threadReplyCount || 0) + 1;
      threadParent.lastThreadReplyAt = new Date();
    }
  }

  // Get reply data for broadcast
  let replyData = null;
  if (message.replyTo) {
    const replyMessage = messages.get(message.replyTo);
    if (replyMessage) {
      const replyUser = users.get(replyMessage.userId);
      replyData = {
        id: replyMessage.id,
        content: replyMessage.content.slice(0, 100),
        username: replyUser?.username || 'Unknown',
        userType: replyUser?.type || 'unknown'
      };
    }
  }
  
  // Get thread parent data if applicable
  let threadParentData = null;
  if (message.threadId) {
    const threadParent = messages.get(message.threadId);
    if (threadParent) {
      const parentUser = users.get(threadParent.userId);
      threadParentData = {
        id: threadParent.id,
        content: threadParent.content.slice(0, 100),
        username: parentUser?.username || 'Unknown',
        userType: parentUser?.type || 'unknown',
        threadReplyCount: threadParent.threadReplyCount || 0
      };
    }
  }

  // Broadcast to WebSocket clients
  broadcastToChannel(channelId, {
    event: 'message',
    data: {
      ...message,
      username: req.user.username,
      userType: req.user.type,
      reactions: {},
      replyToData: replyData,
      threadParentData: threadParentData,
      attachments: message.attachments || []
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

// Delete message
app.delete('/channels/:channelId/messages/:messageId', authenticate, (req, res) => {
  const { channelId, messageId } = req.params;

  const message = messages.get(messageId);
  if (!message || message.channelId !== channelId) {
    return res.status(404).json({ error: 'Message not found' });
  }

  // Only allow message author to delete their own messages
  if (message.userId !== req.user.id) {
    return res.status(403).json({ error: 'Cannot delete other users\' messages' });
  }

  messages.delete(messageId);

  // Broadcast deletion to WebSocket clients
  broadcastToChannel(channelId, {
    event: 'message_deleted',
    data: {
      messageId,
      channelId,
      userId: req.user.id
    }
  });

  res.json({ success: true, messageId });
});

// Edit message
app.put('/channels/:channelId/messages/:messageId', authenticate, (req, res) => {
  const { channelId, messageId } = req.params;
  const { content } = req.body;

  if (!content || typeof content !== 'string') {
    return res.status(400).json({ error: 'Message content is required' });
  }

  const message = messages.get(messageId);
  if (!message || message.channelId !== channelId) {
    return res.status(404).json({ error: 'Message not found' });
  }

  // Only allow message author to edit their own messages
  if (message.userId !== req.user.id) {
    return res.status(403).json({ error: 'Cannot edit other users\' messages' });
  }

  // Don't allow editing deleted messages
  if (message.deleted) {
    return res.status(400).json({ error: 'Cannot edit deleted messages' });
  }

  // Update message
  message.content = content.slice(0, 2000);
  message.editedAt = new Date();
  message.edited = true;

  // Broadcast edit to WebSocket clients
  broadcastToChannel(channelId, {
    event: 'message_edited',
    data: {
      messageId,
      channelId,
      userId: req.user.id,
      content: message.content,
      editedAt: message.editedAt,
      username: req.user.username,
      userType: req.user.type
    }
  });

  res.json({
    id: messageId,
    content: message.content,
    edited: true,
    editedAt: message.editedAt
  });
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

// Bot command handling
const COMMANDS = {
  help: {
    description: 'Show available commands',
    usage: '/help [command]',
    handler: (args, context) => {
      if (args.length > 0) {
        const cmd = args[0].toLowerCase();
        if (COMMANDS[cmd]) {
          return {
            content: `**/${cmd}** — ${COMMANDS[cmd].description}\nUsage: \`${COMMANDS[cmd].usage}\``,
            ephemeral: true
          };
        }
        return { content: `Unknown command: ${cmd}. Type /help for a list of commands.`, ephemeral: true };
      }
      
      const commandList = Object.entries(COMMANDS)
        .map(([name, info]) => `**/${name}** — ${info.description}`)
        .join('\n');
      
      return {
        content: `🤖 **Available Commands**\n\n${commandList}\n\nType \`/help <command>\` for more details on a specific command.`,
        ephemeral: true
      };
    }
  },
  
  status: {
    description: 'Show system status and stats',
    usage: '/status',
    handler: (args, context) => {
      const uptime = process.uptime();
      const uptimeStr = formatUptime(uptime);
      const memUsage = process.memoryUsage();
      
      return {
        content: `📊 **System Status**\n\n` +
          `⏱️ **Uptime:** ${uptimeStr}\n` +
          `👥 **Users:** ${users.size} registered, ${Array.from(users.values()).filter(u => u.online).length} online\n` +
          `💬 **Channels:** ${channels.size}\n` +
          `📝 **Messages:** ${messages.size} stored\n` +
          `🔗 **WebSocket Connections:** ${clients.size}\n` +
          `💾 **Memory:** ${(memUsage.heapUsed / 1024 / 1024).toFixed(1)} MB used`,
        ephemeral: false
      };
    }
  },
  
  roll: {
    description: 'Roll dice (e.g., /roll 2d6, /roll 20)',
    usage: '/roll [number] or /roll [count]d[sides]',
    handler: (args, context) => {
      let count = 1;
      let sides = 6;
      
      if (args.length > 0) {
        const arg = args[0].toLowerCase();
        if (arg.includes('d')) {
          const [c, s] = arg.split('d');
          count = parseInt(c) || 1;
          sides = parseInt(s) || 6;
        } else {
          sides = parseInt(arg) || 6;
        }
      }
      
      count = Math.min(Math.max(count, 1), 100); // Max 100 dice
      sides = Math.min(Math.max(sides, 2), 1000); // Max 1000 sides
      
      const rolls = [];
      let total = 0;
      for (let i = 0; i < count; i++) {
        const roll = Math.floor(Math.random() * sides) + 1;
        rolls.push(roll);
        total += roll;
      }
      
      const rollStr = count === 1 ? rolls[0] : `${rolls.join(' + ')} = **${total}**`;
      return {
        content: `🎲 **${context.username}** rolled ${count}d${sides}: ${rollStr}`,
        ephemeral: false
      };
    }
  },
  
  time: {
    description: 'Show current server time',
    usage: '/time',
    handler: (args, context) => {
      const now = new Date();
      return {
        content: `🕐 **Server Time:** ${now.toUTCString()}\n📅 **Local:** ${now.toLocaleString()}`,
        ephemeral: false
      };
    }
  },
  
  whois: {
    description: 'Get info about a user',
    usage: '/whois <username>',
    handler: (args, context) => {
      if (args.length === 0) {
        return { content: '❌ Please specify a username. Usage: `/whois <username>`', ephemeral: true };
      }
      
      const targetName = args[0].toLowerCase();
      const target = Array.from(users.values()).find(u => 
        u.username.toLowerCase() === targetName
      );
      
      if (!target) {
        return { content: `❌ User "${args[0]}" not found.`, ephemeral: true };
      }
      
      const status = target.online ? '🟢 Online' : `⚪ Offline (last seen ${formatRelativeTime(target.lastSeen)})`;
      return {
        content: `👤 **${target.username}**\n\n` +
          `**Type:** ${target.type === 'agent' ? '🤖 Agent' : '👤 Human'}\n` +
          `**Status:** ${status}\n` +
          `**Joined:** ${target.createdAt.toLocaleDateString()}`,
        ephemeral: false
      };
    }
  }
};

function formatUptime(seconds) {
  const days = Math.floor(seconds / 86400);
  const hours = Math.floor((seconds % 86400) / 3600);
  const minutes = Math.floor((seconds % 3600) / 60);
  const secs = Math.floor(seconds % 60);
  
  if (days > 0) return `${days}d ${hours}h ${minutes}m`;
  if (hours > 0) return `${hours}h ${minutes}m ${secs}s`;
  return `${minutes}m ${secs}s`;
}

function formatRelativeTime(date) {
  const now = new Date();
  const diff = now - new Date(date);
  const seconds = Math.floor(diff / 1000);
  const minutes = Math.floor(seconds / 60);
  const hours = Math.floor(minutes / 60);
  const days = Math.floor(hours / 24);
  
  if (days > 0) return `${days}d ago`;
  if (hours > 0) return `${hours}h ago`;
  if (minutes > 0) return `${minutes}m ago`;
  return 'just now';
}

// Parse and execute bot commands
function executeCommand(content, user) {
  if (!content.startsWith('/')) return null;
  
  const parts = content.slice(1).split(' ');
  const commandName = parts[0].toLowerCase();
  const args = parts.slice(1).filter(arg => arg.length > 0);
  
  const command = COMMANDS[commandName];
  if (!command) {
    return {
      content: `❌ Unknown command: /${commandName}. Type /help for available commands.`,
      ephemeral: true
    };
  }
  
  return command.handler(args, { 
    userId: user.id, 
    username: user.username,
    type: user.type 
  });
}

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

function broadcastToAll(data, excludeUserId = null) {
  for (const [ws, client] of clients) {
    if (ws.readyState === WebSocket.OPEN) {
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
  user.online = true;

  // Broadcast user online status to all connected clients
  broadcastToAll({
    event: 'user_status',
    data: {
      userId: user.id,
      username: user.username,
      type: user.type,
      online: true
    }
  });

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

    // Update user online status
    user.online = false;
    user.lastSeen = new Date();

    // Broadcast user offline status to all connected clients
    broadcastToAll({
      event: 'user_status',
      data: {
        userId: user.id,
        username: user.username,
        type: user.type,
        online: false,
        lastSeen: user.lastSeen
      }
    });
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
