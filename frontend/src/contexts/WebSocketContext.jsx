import React, { createContext, useContext, useEffect, useRef, useState, useCallback } from 'react';

const WebSocketContext = createContext(null);

export function WebSocketProvider({ children, token }) {
  const ws = useRef(null);
  const [connected, setConnected] = useState(false);
  const [messages, setMessages] = useState([]);
  const [currentChannel, setCurrentChannel] = useState('general');
  const reconnectTimeout = useRef(null);

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
  }, []);

  const value = {
    ws: ws.current,
    connected,
    messages,
    currentChannel,
    subscribe
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
