import React, { createContext, useContext, useEffect, useRef, useState, useCallback } from 'react';

const WebSocketContext = createContext(null);

export function WebSocketProvider({ children, token }) {
  const ws = useRef(null);
  const [connected, setConnected] = useState(false);
  const [messages, setMessages] = useState([]);
  const [currentChannel, setCurrentChannel] = useState('general');
  const [typingUsers, setTypingUsers] = useState({}); // channelId -> { userId, username, userType }
  const [messageReactions, setMessageReactions] = useState({}); // messageId -> { emoji: [{userId, username, type}] }
  const reconnectTimeout = useRef(null);
  const typingTimeoutRef = useRef(null);

  const connect = useCallback(() => {
    const wsUrl = `${window.location.protocol === 'https:' ? 'wss:' : 'ws:'}//${window.location.host}/ws?token=${token}`;
    
    ws.current = new WebSocket(wsUrl);

    ws.current.onopen = () => {
      console.log('[ClawChat] WebSocket connected');
      setConnected(true);
      // Subscribe to current channel
      ws.current.send(JSON.stringify({
        event: 'subscribe',
        data: { channelId: currentChannel }
      }));
    };

    ws.current.onmessage = (event) => {
      try {
        const data = JSON.parse(event.data);
        if (data.event === 'message') {
          setMessages(prev => [...prev, data.data]);
          // Initialize empty reactions for new message
          if (data.data.reactions) {
            setMessageReactions(prev => ({
              ...prev,
              [data.data.id]: data.data.reactions
            }));
          }
          // Clear typing indicator when user sends a message
          if (data.data.channelId) {
            setTypingUsers(prev => ({
              ...prev,
              [data.data.channelId]: (prev[data.data.channelId] || []).filter(
                u => u.userId !== data.data.userId
              )
            }));
          }
        } else if (data.event === 'typing') {
          const { channelId, userId, username, userType, isTyping } = data.data;
          setTypingUsers(prev => {
            const current = prev[channelId] || [];
            if (isTyping) {
              // Add user if not already present
              if (!current.find(u => u.userId === userId)) {
                return { ...prev, [channelId]: [...current, { userId, username, userType }] };
              }
            } else {
              // Remove user
              return { ...prev, [channelId]: current.filter(u => u.userId !== userId) };
            }
            return prev;
          });
        } else if (data.event === 'reaction') {
          const { messageId, emoji, userId, username, userType, action } = data.data;
          setMessageReactions(prev => {
            const current = prev[messageId] || {};
            const currentReactions = current[emoji] || [];
            
            if (action === 'add') {
              // Add reaction if not already present
              if (!currentReactions.find(r => r.userId === userId)) {
                return {
                  ...prev,
                  [messageId]: {
                    ...current,
                    [emoji]: [...currentReactions, { userId, username, type: userType }]
                  }
                };
              }
            } else if (action === 'remove') {
              // Remove reaction
              const updated = currentReactions.filter(r => r.userId !== userId);
              const updatedMessageReactions = { ...current };
              if (updated.length === 0) {
                delete updatedMessageReactions[emoji];
              } else {
                updatedMessageReactions[emoji] = updated;
              }
              return {
                ...prev,
                [messageId]: updatedMessageReactions
              };
            }
            return prev;
          });
        } else if (data.event === 'message_deleted') {
          // Mark message as deleted in the messages list
          setMessages(prev => prev.map(msg => 
            msg.id === data.data.messageId 
              ? { ...msg, deleted: true, content: '[deleted]' }
              : msg
          ));
          // Clean up reactions for deleted message
          setMessageReactions(prev => {
            const updated = { ...prev };
            delete updated[data.data.messageId];
            return updated;
          });
        } else if (data.event === 'message_edited') {
          // Update edited message in the messages list
          setMessages(prev => prev.map(msg => 
            msg.id === data.data.messageId 
              ? { 
                  ...msg, 
                  content: data.data.content, 
                  edited: true, 
                  editedAt: data.data.editedAt 
                }
              : msg
          ));
        }
      } catch (err) {
        console.error('[ClawChat] Message parse error:', err);
      }
    };

    ws.current.onclose = () => {
      console.log('[ClawChat] WebSocket disconnected');
      setConnected(false);
      // Reconnect after 3 seconds
      reconnectTimeout.current = setTimeout(connect, 3000);
    };

    ws.current.onerror = (err) => {
      console.error('[ClawChat] WebSocket error:', err);
    };
  }, [token, currentChannel]);

  useEffect(() => {
    connect();
    return () => {
      if (reconnectTimeout.current) {
        clearTimeout(reconnectTimeout.current);
      }
      if (ws.current) {
        ws.current.close();
      }
    };
  }, [connect]);

  const subscribe = useCallback((channelId) => {
    setCurrentChannel(channelId);
    if (ws.current?.readyState === WebSocket.OPEN) {
      ws.current.send(JSON.stringify({
        event: 'subscribe',
        data: { channelId }
      }));
    }
    setMessages([]);
    setMessageReactions({});
  }, []);

  const sendTyping = useCallback((channelId, isTyping) => {
    if (ws.current?.readyState === WebSocket.OPEN) {
      ws.current.send(JSON.stringify({
        event: 'typing',
        data: { channelId, isTyping }
      }));
    }
  }, []);

  const value = {
    ws: ws.current,
    connected,
    messages,
    currentChannel,
    typingUsers,
    messageReactions,
    subscribe,
    sendTyping
  };

  return (
    <WebSocketContext.Provider value={value}>
      {children}
    </WebSocketContext.Provider>
  );
}

export function useWebSocket() {
  return useContext(WebSocketContext);
}
