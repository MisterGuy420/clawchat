import React, { useState, useEffect, useRef, useCallback } from 'react';
import Sidebar from './Sidebar';
import MessageList from './MessageList';
import MessageInput from './MessageInput';
import ChannelHeader from './ChannelHeader';
import TypingIndicator from './TypingIndicator';
import KeyboardShortcutsHelp, { useKeyboardShortcuts } from './KeyboardShortcuts';
import { useWebSocket } from '../contexts/WebSocketContext';
import { useToast } from '../contexts/ToastContext';
import { useTheme } from '../contexts/ThemeContext';
import useSoundNotifications from '../hooks/useSoundNotifications';
import { useClipboard } from '../hooks/useClipboard';

const API_URL = '';

export default function Chat({ user, token, onLogout }) {
  const [channels, setChannels] = useState([]);
  const [users, setUsers] = useState([]);
  const [messages, setMessages] = useState([]);
  const [currentChannel, setCurrentChannel] = useState('general');
  const [loading, setLoading] = useState(true);
  const [showShortcutsHelp, setShowShortcutsHelp] = useState(false);
  const [emojiPickerOpen, setEmojiPickerOpen] = useState(false);
  const [searchQuery, setSearchQuery] = useState('');
  const [isSearching, setIsSearching] = useState(false);
  const [unreadCounts, setUnreadCounts] = useState({});
  const [pendingMessages, setPendingMessages] = useState([]); // Messages being sent
  const [failedMessages, setFailedMessages] = useState([]); // Messages that failed to send
  const [channelLastRead, setChannelLastRead] = useState({}); // channelId -> timestamp for new messages divider
  const [replyTo, setReplyTo] = useState(null);
  const messageInputRef = useRef(null);
  const { connected, messages: wsMessages, typingUsers, messageReactions, subscribe } = useWebSocket();
  const { error, success } = useToast();
  const { soundEnabled, toggleSound, playNotificationSound } = useSoundNotifications();
  const { isDark } = useTheme();
  const { copyToClipboard, copiedMessageId } = useClipboard();

  const currentChannelIndex = channels.findIndex(c => c.id === currentChannel);

  const focusInput = useCallback(() => {
    messageInputRef.current?.focus();
  }, []);

  const handleChannelSelect = useCallback((channelId) => {
    // Save timestamp for the channel we're leaving
    if (channelId !== currentChannel) {
      setChannelLastRead(prev => ({
        ...prev,
        [currentChannel]: new Date()
      }));
      setCurrentChannel(channelId);
      setSearchQuery('');
    }
  }, [currentChannel]);

  const navigateChannel = useCallback((index) => {
    if (index >= 0 && index < channels.length) {
      // Save timestamp for the channel we're leaving
      setChannelLastRead(prev => ({
        ...prev,
        [currentChannel]: new Date()
      }));
      setCurrentChannel(channels[index].id);
      setSearchQuery(''); // Clear search when switching channels
    }
  }, [channels, currentChannel]);

  const toggleEmojiPicker = useCallback(() => {
    setEmojiPickerOpen(prev => !prev);
  }, []);

  const openSearch = useCallback(() => {
    // This will be handled by ChannelHeader
    const searchButton = document.querySelector('[title*="Search messages"]');
    if (searchButton) searchButton.click();
  }, []);

  // Set up keyboard shortcuts
  useKeyboardShortcuts({
    onFocusInput: focusInput,
    onChannelNavigate: navigateChannel,
    onShowHelp: () => setShowShortcutsHelp(true),
    onClosePicker: () => setEmojiPickerOpen(false),
    onToggleEmoji: toggleEmojiPicker,
    onSearch: openSearch,
    isEmojiOpen: emojiPickerOpen,
    isEditing: false,
    channelCount: channels.length,
    currentChannelIndex
  });

  // Fetch channels
  useEffect(() => {
    fetchChannels();
    fetchUsers();
    fetchUnreadCounts();
  }, [token]);

  // Fetch messages when channel changes or search query changes
  useEffect(() => {
    if (searchQuery) {
      searchMessages(currentChannel, searchQuery);
    } else {
      fetchMessages(currentChannel);
    }
    subscribe(currentChannel);
    // Mark channel as read when switching to it
    markChannelAsRead(currentChannel);
    // Clear pending and failed messages when switching channels
    setPendingMessages([]);
    setFailedMessages([]);
  }, [currentChannel, searchQuery, subscribe]);

  // Handle WebSocket messages
  useEffect(() => {
    if (wsMessages.length > 0) {
      const latest = wsMessages[wsMessages.length - 1];
      if (latest.channelId === currentChannel) {
        // If searching, check if the new message matches the search query
        if (searchQuery) {
          if (latest.content.toLowerCase().includes(searchQuery.toLowerCase())) {
            setMessages(prev => [...prev, latest]);
          }
        } else {
          setMessages(prev => [...prev, latest]);
        }
        
        // Play sound notification for messages from other users
        if (latest.userId !== user?.id) {
          playNotificationSound();
        }
      } else if (latest.userId !== user?.id) {
        // Message in another channel - increment unread count
        setUnreadCounts(prev => ({
          ...prev,
          [latest.channelId]: (prev[latest.channelId] || 0) + 1
        }));
        
        // Also play sound for messages in other channels
        playNotificationSound();
      }
    }
  }, [wsMessages, currentChannel, searchQuery, user?.id, playNotificationSound]);

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
      error('Failed to load channels. Please refresh the page.');
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
      error('Failed to load users. Please try again later.');
    }
  };

  const fetchMessages = async (channelId) => {
    setLoading(true);
    setIsSearching(false);
    try {
      const res = await fetch(`${API_URL}/channels/${channelId}/messages`, {
        headers: { 'Authorization': `Bearer ${token}` }
      });
      const data = await res.json();
      setMessages(data.messages || []);
    } catch (err) {
      console.error('Failed to fetch messages:', err);
      error('Failed to load messages. Please try again.');
    } finally {
      setLoading(false);
    }
  };

  const fetchUnreadCounts = async () => {
    try {
      const res = await fetch(`${API_URL}/channels/unread`, {
        headers: { 'Authorization': `Bearer ${token}` }
      });
      const data = await res.json();
      setUnreadCounts(data.unreadCounts || {});
    } catch (err) {
      console.error('Failed to fetch unread counts:', err);
    }
  };

  const markChannelAsRead = async (channelId) => {
    // Optimistically clear unread count
    setUnreadCounts(prev => ({
      ...prev,
      [channelId]: 0
    }));
    
    try {
      await fetch(`${API_URL}/channels/${channelId}/read`, {
        method: 'POST',
        headers: { 'Authorization': `Bearer ${token}` }
      });
    } catch (err) {
      console.error('Failed to mark channel as read:', err);
    }
  };

  const searchMessages = async (channelId, query) => {
    if (!query.trim()) {
      fetchMessages(channelId);
      return;
    }
    setLoading(true);
    setIsSearching(true);
    try {
      const res = await fetch(`${API_URL}/channels/${channelId}/search?query=${encodeURIComponent(query)}`, {
        headers: { 'Authorization': `Bearer ${token}` }
      });
      const data = await res.json();
      setMessages(data.messages || []);
    } catch (err) {
      console.error('Failed to search messages:', err);
      error('Failed to search messages. Please try again.');
    } finally {
      setLoading(false);
    }
  };

  const handleSearch = (query) => {
    setSearchQuery(query);
  };

  const sendMessage = async (content) => {
    const tempId = `pending-${Date.now()}-${Math.random().toString(36).slice(2, 9)}`;
    const pendingMessage = {
      id: tempId,
      channelId: currentChannel,
      userId: user?.id,
      username: user?.username,
      userType: user?.type,
      content: content.trim(),
      timestamp: new Date(),
      pending: true,
      replyTo: replyTo?.id || null,
      replyToData: replyTo ? {
        id: replyTo.id,
        content: replyTo.content.slice(0, 100),
        username: replyTo.username,
        userType: replyTo.userType
      } : null
    };

    // Add to pending messages immediately for UI feedback
    setPendingMessages(prev => [...prev, pendingMessage]);

    try {
      const res = await fetch(`${API_URL}/channels/${currentChannel}/messages`, {
        method: 'POST',
        headers: {
          'Authorization': `Bearer ${token}`,
          'Content-Type': 'application/json'
        },
        body: JSON.stringify({ content, replyTo: replyTo?.id })
      });
      if (!res.ok) {
        const errorData = await res.json();
        throw new Error(errorData.error || 'Failed to send message');
      }
      // Remove from pending on success
      setPendingMessages(prev => prev.filter(m => m.id !== tempId));
      // Clear reply after successful send
      setReplyTo(null);
    } catch (err) {
      console.error('Failed to send message:', err);
      // Move to failed messages
      setPendingMessages(prev => prev.filter(m => m.id !== tempId));
      setFailedMessages(prev => [...prev, { ...pendingMessage, error: err.message }]);
      error(err.message || 'Failed to send message. Click retry to try again.');
    }
  };

  const retryMessage = async (failedMessage) => {
    // Remove from failed
    setFailedMessages(prev => prev.filter(m => m.id !== failedMessage.id));
    // Retry sending
    await sendMessage(failedMessage.content);
  };

  const cancelFailedMessage = (failedMessageId) => {
    setFailedMessages(prev => prev.filter(m => m.id !== failedMessageId));
  };

  const handleReply = (message) => {
    setReplyTo(message);
    // Focus the input after setting reply
    setTimeout(() => {
      messageInputRef.current?.focus();
    }, 0);
  };

  const cancelReply = () => {
    setReplyTo(null);
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
        success(`Channel #${name} created successfully!`);
      } else {
        throw new Error(data.error || 'Failed to create channel');
      }
      return data;
    } catch (err) {
      console.error('Failed to create channel:', err);
      error(err.message || 'Failed to create channel. Please try again.');
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
        const errorData = await res.json();
        throw new Error(errorData.error);
      }
    } catch (err) {
      console.error('Failed to add reaction:', err);
      error('Failed to add reaction. Please try again.');
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
        const errorData = await res.json();
        throw new Error(errorData.error);
      }
    } catch (err) {
      console.error('Failed to remove reaction:', err);
      error('Failed to remove reaction. Please try again.');
    }
  };

  const deleteMessage = async (messageId) => {
    try {
      const res = await fetch(`${API_URL}/channels/${currentChannel}/messages/${messageId}`, {
        method: 'DELETE',
        headers: {
          'Authorization': `Bearer ${token}`
        }
      });
      if (!res.ok) {
        const errorData = await res.json();
        throw new Error(errorData.error);
      }
      // Optimistically update local state
      setMessages(prev => prev.map(msg => 
        msg.id === messageId 
          ? { ...msg, deleted: true, content: '[deleted]' }
          : msg
      ));
      success('Message deleted successfully');
    } catch (err) {
      console.error('Failed to delete message:', err);
      error(err.message || 'Failed to delete message. Please try again.');
    }
  };

  const editMessage = async (messageId, newContent) => {
    try {
      const res = await fetch(`${API_URL}/channels/${currentChannel}/messages/${messageId}`, {
        method: 'PUT',
        headers: {
          'Authorization': `Bearer ${token}`,
          'Content-Type': 'application/json'
        },
        body: JSON.stringify({ content: newContent })
      });
      if (!res.ok) {
        const errorData = await res.json();
        throw new Error(errorData.error);
      }
      const data = await res.json();
      // Optimistically update local state
      setMessages(prev => prev.map(msg => 
        msg.id === messageId 
          ? { ...msg, content: data.content, edited: true, editedAt: data.editedAt }
          : msg
      ));
      success('Message edited successfully');
      return data;
    } catch (err) {
      console.error('Failed to edit message:', err);
      error(err.message || 'Failed to edit message. Please try again.');
      throw err;
    }
  };

  return (
    <div className={`h-screen flex overflow-hidden transition-colors duration-200 ${
      isDark ? 'bg-gray-900' : 'bg-gray-100'
    }`}>
      <Sidebar
        channels={channels}
        users={users}
        currentChannel={currentChannel}
        onChannelSelect={handleChannelSelect}
        onCreateChannel={createChannel}
        onLogout={onLogout}
        user={user}
        unreadCounts={unreadCounts}
      />

      <div className="flex-1 flex flex-col min-w-0">
        <ChannelHeader
          channel={currentChannelData}
          connected={connected}
          userCount={users.filter(u => u.online).length}
          onShowShortcuts={() => setShowShortcutsHelp(true)}
          onSearch={handleSearch}
          searchQuery={searchQuery}
          isSearching={isSearching}
          soundEnabled={soundEnabled}
          onToggleSound={toggleSound}
        />

        <MessageList
          messages={messages}
          loading={loading}
          currentUser={user}
          reactions={messageReactions}
          onAddReaction={addReaction}
          onRemoveReaction={removeReaction}
          onDeleteMessage={deleteMessage}
          onEditMessage={editMessage}
          onReply={handleReply}
          isSearching={isSearching}
          searchQuery={searchQuery}
          pendingMessages={pendingMessages}
          failedMessages={failedMessages}
          onRetryMessage={retryMessage}
          onCancelFailedMessage={cancelFailedMessage}
          lastReadTimestamp={channelLastRead[currentChannel]}
          onCopyMessage={copyToClipboard}
          copiedMessageId={copiedMessageId}
        />

        <TypingIndicator users={currentTypingUsers.filter(u => u.userId !== user?.id)} />

        <MessageInput 
          onSend={sendMessage} 
          channelId={currentChannel}
          inputRef={messageInputRef}
          emojiPickerOpen={emojiPickerOpen}
          setEmojiPickerOpen={setEmojiPickerOpen}
          users={users}
          replyTo={replyTo}
          onCancelReply={cancelReply}
        />
      </div>

      <KeyboardShortcutsHelp 
        isOpen={showShortcutsHelp} 
        onClose={() => setShowShortcutsHelp(false)} 
      />
    </div>
  );
}
