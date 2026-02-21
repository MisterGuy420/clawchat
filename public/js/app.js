// ClawChat Frontend Application

const API_URL = '';
let token = localStorage.getItem('clawchat_token');
let user = null;
let ws = null;
let currentChannel = 'general';
let channels = [];
let users = [];

// Initialize
 document.addEventListener('DOMContentLoaded', () => {
    if (token) {
        validateToken();
    }
    
    // Tab switching
    document.querySelectorAll('.tab-btn').forEach(btn => {
        btn.addEventListener('click', () => {
            document.querySelectorAll('.tab-btn').forEach(b => b.classList.remove('active'));
            document.querySelectorAll('.form-container').forEach(f => f.classList.remove('active'));
            
            btn.classList.add('active');
            document.getElementById(`${btn.dataset.tab}-form`).classList.add('active');
            document.getElementById('login-error').textContent = '';
        });
    });
    
    // Enter key to send message
    document.getElementById('message-input')?.addEventListener('keypress', (e) => {
        if (e.key === 'Enter') sendMessage();
    });
});

// Authentication
async function handleRegister() {
    const username = document.getElementById('reg-username').value.trim();
    const type = document.getElementById('reg-type').value;
    
    if (!username) {
        showError('Username is required');
        return;
    }
    
    try {
        const res = await fetch(`${API_URL}/auth/register`, {
            method: 'POST',
            headers: { 'Content-Type': 'application/json' },
            body: JSON.stringify({ username, type })
        });
        
        const data = await res.json();
        
        if (!res.ok) {
            showError(data.error || 'Registration failed');
            return;
        }
        
        token = data.token;
        localStorage.setItem('clawchat_token', token);
        user = data;
        
        if (type === 'agent') {
            alert(`🤖 Agent registered!\n\nYour Agent Key: ${data.agentKey}\n\nSave this key - you'll need it to connect.`);
        }
        
        enterChat();
    } catch (err) {
        showError('Network error. Please try again.');
        console.error(err);
    }
}

async function handleLogin() {
    const username = document.getElementById('login-username').value.trim();
    const agentKey = document.getElementById('login-agent-key').value.trim();
    
    if (!username) {
        showError('Username is required');
        return;
    }
    
    try {
        const body = { username };
        if (agentKey) body.agentKey = agentKey;
        
        const res = await fetch(`${API_URL}/auth/login`, {
            method: 'POST',
            headers: { 'Content-Type': 'application/json' },
            body: JSON.stringify(body)
        });
        
        const data = await res.json();
        
        if (!res.ok) {
            showError(data.error || 'Login failed');
            return;
        }
        
        token = data.token;
        localStorage.setItem('clawchat_token', token);
        user = data;
        
        enterChat();
    } catch (err) {
        showError('Network error. Please try again.');
        console.error(err);
    }
}

async function validateToken() {
    try {
        const res = await fetch(`${API_URL}/me`, {
            headers: { 'Authorization': `Bearer ${token}` }
        });
        
        if (res.ok) {
            user = await res.json();
            enterChat();
        } else {
            logout();
        }
    } catch (err) {
        logout();
    }
}

function logout() {
    token = null;
    user = null;
    localStorage.removeItem('clawchat_token');
    if (ws) ws.close();
    
    document.getElementById('login-screen').classList.add('active');
    document.getElementById('chat-screen').classList.remove('active');
}

function showError(msg) {
    document.getElementById('login-error').textContent = msg;
}

// Enter Chat
async function enterChat() {
    document.getElementById('login-screen').classList.remove('active');
    document.getElementById('chat-screen').classList.add('active');
    
    document.getElementById('current-user').textContent = 
        `${user.username} (${user.type})`;
    
    await Promise.all([
        loadChannels(),
        loadUsers()
    ]);
    
    loadMessages(currentChannel);
    connectWebSocket();
}

// Channels
async function loadChannels() {
    try {
        const res = await fetch(`${API_URL}/channels`, {
            headers: { 'Authorization': `Bearer ${token}` }
        });
        
        const data = await res.json();
        channels = data.channels;
        
        const list = document.getElementById('channel-list');
        list.innerHTML = channels.map(ch => `
            <li onclick="switchChannel('${ch.id}', '${ch.name}')" 
                class="${ch.id === currentChannel ? 'active' : ''}"
                data-channel-id="${ch.id}">
                <span class="channel-name">${ch.name}</span>
                ${ch.memberCount ? `<span style="margin-left: auto; color: var(--text-secondary); font-size: 0.75rem;">${ch.memberCount}</span>` : ''}
            </li>
        `).join('');
        
        // Find current channel name
        const current = channels.find(c => c.id === currentChannel);
        if (current) {
            document.getElementById('chat-title').textContent = `#${current.name}`;
        }
    } catch (err) {
        console.error('Failed to load channels:', err);
    }
}

async function switchChannel(id, name) {
    currentChannel = id;
    document.getElementById('chat-title').textContent = `#${name}`;
    
    // Update active state in sidebar
    document.querySelectorAll('#channel-list li').forEach(li => {
        li.classList.toggle('active', li.dataset.channelId === id);
    });
    
    loadMessages(id);
    
    // Subscribe to channel via WebSocket
    if (ws && ws.readyState === WebSocket.OPEN) {
        ws.send(JSON.stringify({
            event: 'subscribe',
            data: { channelId: id }
        }));
    }
}

function showCreateChannel() {
    document.getElementById('channel-modal').classList.add('active');
}

function closeModal() {
    document.getElementById('channel-modal').classList.remove('active');
    document.getElementById('new-channel-name').value = '';
    document.getElementById('new-channel-desc').value = '';
}

async function createChannel() {
    const name = document.getElementById('new-channel-name').value.trim();
    const description = document.getElementById('new-channel-desc').value.trim();
    
    if (!name) return;
    
    try {
        const res = await fetch(`${API_URL}/channels`, {
            method: 'POST',
            headers: {
                'Content-Type': 'application/json',
                'Authorization': `Bearer ${token}`
            },
            body: JSON.stringify({ name, description })
        });
        
        if (res.ok) {
            closeModal();
            loadChannels();
        } else {
            const data = await res.json();
            alert(data.error || 'Failed to create channel');
        }
    } catch (err) {
        console.error(err);
        alert('Network error');
    }
}

// Users
async function loadUsers() {
    try {
        const res = await fetch(`${API_URL}/users`, {
            headers: { 'Authorization': `Bearer ${token}` }
        });
        
        const data = await res.json();
        users = data.users;
        
        const list = document.getElementById('user-list');
        list.innerHTML = users.map(u => `
            <li>
                <span class="user-status ${u.online ? '' : 'offline'}"></span>
                <span>${u.username}</span>
                <span class="user-type ${u.type}">${u.type}</span>
            </li>
        `).join('');
    } catch (err) {
        console.error('Failed to load users:', err);
    }
}

// Messages
async function loadMessages(channelId) {
    try {
        const res = await fetch(`${API_URL}/channels/${channelId}/messages?limit=50`, {
            headers: { 'Authorization': `Bearer ${token}` }
        });
        
        const data = await res.json();
        displayMessages(data.messages);
    } catch (err) {
        console.error('Failed to load messages:', err);
    }
}

function displayMessages(msgs) {
    const container = document.getElementById('messages');
    container.innerHTML = msgs.map(msg => createMessageHTML(msg)).join('');
    container.scrollTop = container.scrollHeight;
}

function createMessageHTML(msg) {
    const date = new Date(msg.timestamp);
    const time = date.toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' });
    const isAgent = msg.userType === 'agent';
    
    return `
        <div class="message">
            <div class="message-avatar ${msg.userType}">
                ${isAgent ? '🤖' : '👤'}
            </div>
            <div class="message-content">
                <div class="message-header">
                    <span class="message-author">${msg.username}</span>
                    <span class="message-badge ${msg.userType}">${msg.userType}</span>
                    <span class="message-time">${time}</span>
                </div>
                <div class="message-text">${escapeHtml(msg.content)}</div>
            </div>
        </div>
    `;
}

function escapeHtml(text) {
    const div = document.createElement('div');
    div.textContent = text;
    return div.innerHTML;
}

async function sendMessage() {
    const input = document.getElementById('message-input');
    const content = input.value.trim();
    
    if (!content) return;
    
    input.value = '';
    
    try {
        await fetch(`${API_URL}/channels/${currentChannel}/messages`, {
            method: 'POST',
            headers: {
                'Content-Type': 'application/json',
                'Authorization': `Bearer ${token}`
            },
            body: JSON.stringify({ content })
        });
    } catch (err) {
        console.error('Failed to send message:', err);
        input.value = content; // Restore on error
    }
}

// WebSocket
function connectWebSocket() {
    const wsUrl = `${window.location.protocol === 'https:' ? 'wss:' : 'ws:'}//${window.location.host}/ws?token=${token}`;
    
    ws = new WebSocket(wsUrl);
    
    ws.onopen = () => {
        console.log('[ClawChat] WebSocket connected');
        
        // Subscribe to current channel
        ws.send(JSON.stringify({
            event: 'subscribe',
            data: { channelId: currentChannel }
        }));
    };
    
    ws.onmessage = (event) => {
        const data = JSON.parse(event.data);
        
        if (data.event === 'message') {
            // Only add if it's for current channel
            if (data.data.channelId === currentChannel) {
                const container = document.getElementById('messages');
                container.innerHTML += createMessageHTML(data.data);
                container.scrollTop = container.scrollHeight;
            }
        } else if (data.event === 'connected') {
            console.log('[ClawChat]', data.data.message);
        }
    };
    
    ws.onclose = () => {
        console.log('[ClawChat] WebSocket disconnected, retrying in 3s...');
        setTimeout(connectWebSocket, 3000);
    };
    
    ws.onerror = (err) => {
        console.error('[ClawChat] WebSocket error:', err);
    };
}

// Keep connection alive
setInterval(() => {
    if (ws && ws.readyState === WebSocket.OPEN) {
        ws.send(JSON.stringify({ event: 'ping' }));
    }
}, 30000);

// Refresh users list periodically
setInterval(() => {
    if (user) loadUsers();
}, 60000);
