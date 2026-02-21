import React, { useState, useEffect, useRef } from 'react';
import Sidebar from './Sidebar';
import MessageList from './MessageList';
import MessageInput from './MessageInput';
import ChannelHeader from './ChannelHeader';
import TypingIndicator from './TypingIndicator';
import { useWebSocket } from '../contexts/WebSocketContext';

const API_URL = '';

export default function Chat({ user, token, onLogout }) {
  const [channels, setChannels] = useState([]);
  const [users, setUsers] = useState([]);
  const [messages, setMessages] = useState([]);
  const [currentChannel, setCurrentChannel] = useState('general');
  const [loading, setLoading] = useState(true);
  const { connected, messages: wsMessages, typingUsers, messageReactions, subscribe } = useWebSocket();

  // Fetch channels
  useEffect(() => {
    fetchChannels();
    fetchUsers();
  }, [token]);

  // Fetch messages when channel changes
  useEffect(() => {
    fetchMessages(currentChannel);
    subscribe(currentChannel);
  }, [currentChannel, subscribe]);

  // Handle WebSocket messages
  useEffect(() => {
    if (wsMessages.length > 0) {
      const latest = wsMessages[wsMessages.length - 1];
      if (latest.channelId === currentChannel) {
        setMessages(prev => [...prev, latest]);
      }
    }
  }, [wsMessages, currentChannel]);

  const fetchChannels = async () => {
    try {
      const res = await fetch(`${API_URL}/channels`, {
        headers: { 'Authorization': `Bearer ${token}` }
      });
      const data = await res.json();
      setChannels(data.channels || []);
      // Set first channel as default if general not found
      if (data.channels.length > 0 && !data.channels.find(c => c.id === 'general')) {
        setCurrentChannel(data.channels[0].id);
      }
    } catch (err) {
      console.error('Failed to fetch channels:', err);
    }
  };

  const fetchUsers = async () => {
    try {
      const res = await fetch(`${API_URL}/users`, {
        headers: { 'Authorization': `Bearer ${token}` }
      });
      const data = await res.json();
      setUsers(data.users || []);
    } catch (err) {
      console.error('Failed to fetch users:', err);
    }
  };

  const fetchMessages = async (channelId) => {
    setLoading(true);
    try {
      const res = await fetch(`${API_URL}/channels/${channelId}/messages`, {
        headers: { 'Authorization': `Bearer ${token}` }
      });
      const data = await res.json();
      setMessages(data.messages || []);
    } catch (err) {
      console.error('Failed to fetch messages:', err);
    } finally {
      setLoading(false);
    }
  };

  const sendMessage = async (content) => {
    try {
      const res = await fetch(`${API_URL}/channels/${currentChannel}/messages`, {
        method: 'POST',
        headers: {
          'Authorization': `Bearer ${token}`,
          'Content-Type': 'application/json'
        },
        body: JSON.stringify({ content })
      });
      if (!res.ok) {
        const error = await res.json();
        throw new Error(error.error);
      }
    } catch (err) {
      console.error('Failed to send message:', err);
    }
  };

  const createChannel = async (name, description) => {
    try {
      const res = await fetch(`${API_URL}/channels`, {
        method: 'POST',
        headers: {
          'Authorization': `Bearer ${token}`,
          'Content-Type': 'application/json'
        },
        body: JSON.stringify({ name, description })
      });
      const data = await res.json();
      if (res.ok) {
        await fetchChannels();
        setCurrentChannel(data.id);
      }
      return data;
    } catch (err) {
      console.error('Failed to create channel:', err);
      throw err;
    }
  };

  const currentChannelData = channels.find(c => c.id === currentChannel);
  const currentTypingUsers = typingUsers[currentChannel] || [];

  const addReaction = async (messageId, emoji) => {
    try {
      const res = await fetch(`${API_URL}/channels/${currentChannel}/messages/${messageId}/reactions`, {
        method: 'POST',
        headers: {
          'Authorization': `Bearer ${token}`,
          'Content-Type': 'application/json'
        },
        body: JSON.stringify({ emoji })
      });
      if (!res.ok) {
        const error = await res.json();
        throw new Error(error.error);
      }
    } catch (err) {
      console.error('Failed to add reaction:', err);
    }
  };

  const removeReaction = async (messageId, emoji) => {
    try {
      const res = await fetch(`${API_URL}/channels/${currentChannel}/messages/${messageId}/reactions/${encodeURIComponent(emoji)}`, {
        method: 'DELETE',
        headers: {
          'Authorization': `Bearer ${token}`
        }
      });
      if (!res.ok) {
        const error = await res.json();
        throw new Error(error.error);
      }
    } catch (err) {
      console.error('Failed to remove reaction:', err);
    }
  };

  return (
    <div className="h-screen bg-gray-900 flex overflow-hidden">
      <Sidebar
        channels={channels}
        users={users}
        currentChannel={currentChannel}
        onChannelSelect={setCurrentChannel}
        onCreateChannel={createChannel}
        onLogout={onLogout}
        user={user}
      />

      <div className="flex-1 flex flex-col min-w-0">
        <ChannelHeader
          channel={currentChannelData}
          connected={connected}
          userCount={users.filter(u => u.online).length}
        />

        <MessageList
          messages={messages}
          loading={loading}
          currentUser={user}
          reactions={messageReactions}
          onAddReaction={addReaction}
          onRemoveReaction={removeReaction}
        />

        <TypingIndicator users={currentTypingUsers.filter(u => u.userId !== user?.id)} />

        <MessageInput onSend={sendMessage} channelId={currentChannel} />
      </div>
    </div>
  );
}
