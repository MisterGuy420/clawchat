import React, { useState, useEffect, useRef } from 'react';
import { X, MessageSquare, Loader2, CornerDownRight } from 'lucide-react';
import { useTheme } from '../contexts/ThemeContext';
import MessageInput from './MessageInput';

const API_URL = '';

function formatTime(date) {
  const d = new Date(date);
  return d.toLocaleTimeString('en-US', {
    hour: 'numeric',
    minute: '2-digit',
    hour12: true
  });
}

export default function ThreadView({ 
  parentMessage, 
  channelId, 
  currentUser, 
  token, 
  onClose, 
  onAddReaction, 
  onRemoveReaction,
  onDeleteMessage,
  onEditMessage,
  userStatuses = {}
}) {
  const [threadMessages, setThreadMessages] = useState([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState(null);
  const messagesEndRef = useRef(null);
  const { isDark } = useTheme();

  // Fetch thread messages
  useEffect(() => {
    fetchThreadMessages();
  }, [parentMessage.id]);

  // Auto-scroll to bottom
  useEffect(() => {
    if (messagesEndRef.current && !loading) {
      messagesEndRef.current.scrollIntoView({ behavior: 'smooth' });
    }
  }, [threadMessages, loading]);

  const fetchThreadMessages = async () => {
    setLoading(true);
    try {
      const res = await fetch(`${API_URL}/channels/${channelId}/messages/${parentMessage.id}/threads`, {
        headers: { 'Authorization': `Bearer ${token}` }
      });
      if (!res.ok) throw new Error('Failed to fetch thread');
      const data = await res.json();
      setThreadMessages(data.messages || []);
    } catch (err) {
      console.error('Failed to fetch thread messages:', err);
      setError('Failed to load thread messages');
    } finally {
      setLoading(false);
    }
  };

  const sendThreadReply = async (content, attachments = []) => {
    const res = await fetch(`${API_URL}/channels/${channelId}/messages`, {
      method: 'POST',
      headers: {
        'Authorization': `Bearer ${token}`,
        'Content-Type': 'application/json'
      },
      body: JSON.stringify({ content, threadId: parentMessage.id, attachments })
    });
    
    if (!res.ok) {
      const errorData = await res.json();
      throw new Error(errorData.error || 'Failed to send reply');
    }
    
    // Refresh thread messages
    await fetchThreadMessages();
  };

  const isParentAgent = parentMessage.userType === 'agent' || parentMessage.username?.toLowerCase().includes('claw');

  return (
    <div className={`w-96 border-l flex flex-col h-full ${
      isDark ? 'bg-gray-900 border-gray-700' : 'bg-gray-50 border-gray-200'
    }`}>
      {/* Thread Header */}
      <div className={`flex items-center justify-between p-4 border-b ${
        isDark ? 'border-gray-700 bg-gray-800' : 'border-gray-200 bg-white'
      }`}>
        <div className="flex items-center gap-2">
          <MessageSquare className={`w-5 h-5 ${isDark ? 'text-gray-400' : 'text-gray-500'}`} />
          <h3 className={`font-semibold ${isDark ? 'text-gray-200' : 'text-gray-800'}`}>
            Thread
          </h3>
        </div>
        <button
          onClick={onClose}
          className={`p-1 rounded transition-colors ${
            isDark ? 'hover:bg-gray-700 text-gray-400' : 'hover:bg-gray-200 text-gray-500'
          }`}
        >
          <X className="w-5 h-5" />
        </button>
      </div>

      {/* Parent Message */}
      <div className={`p-4 border-b ${isDark ? 'border-gray-700' : 'border-gray-200'}`}>
        <div className="flex gap-3">
          <div className={`w-8 h-8 rounded-full flex items-center justify-center flex-shrink-0 ${
            isParentAgent ? 'bg-agent text-white' : 'bg-claw-600 text-white'
          }`}>
            <span className="text-sm font-semibold">
              {parentMessage.username?.charAt(0).toUpperCase() || '?'}
            </span>
          </div>
          <div className="flex-1 min-w-0">
            <div className="flex items-center gap-2">
              <span className={`font-medium text-sm ${isParentAgent ? 'text-agent' : 'text-claw-600'}`}>
                {parentMessage.username}
              </span>
              <span className={`text-xs ${isDark ? 'text-gray-500' : 'text-gray-400'}`}>
                {formatTime(parentMessage.timestamp)}
              </span>
            </div>
            <p className={`text-sm mt-0.5 ${isDark ? 'text-gray-300' : 'text-gray-700'}`}>
              {parentMessage.content}
            </p>
          </div>
        </div>
      </div>

      {/* Thread Messages */}
      <div className={`flex-1 overflow-y-auto p-4 ${isDark ? '' : 'bg-gray-50'}`}>
        {loading ? (
          <div className="flex items-center justify-center h-full">
            <Loader2 className={`w-6 h-6 animate-spin ${isDark ? 'text-gray-500' : 'text-gray-400'}`} />
          </div>
        ) : error ? (
          <div className={`text-center py-4 ${isDark ? 'text-red-400' : 'text-red-500'}`}>
            {error}
          </div>
        ) : threadMessages.length === 0 ? (
          <div className={`text-center py-8 ${isDark ? 'text-gray-500' : 'text-gray-400'}`}>
            <MessageSquare className="w-8 h-8 mx-auto mb-2 opacity-50" />
            <p className="text-sm">No replies yet</p>
            <p className="text-xs mt-1">Be the first to reply!</p>
          </div>
        ) : (
          <div className="space-y-3">
            {threadMessages.map((msg) => {
              const isMe = msg.userId === currentUser?.id;
              const isAgent = msg.userType === 'agent' || msg.username?.toLowerCase().includes('claw');
              
              return (
                <div key={msg.id} className="flex gap-2 group">
                  <div className={`w-6 h-6 rounded-full flex items-center justify-center flex-shrink-0 ${
                    isAgent ? 'bg-agent text-white' : 'bg-claw-600 text-white'
                  }`}>
                    <span className="text-xs font-semibold">
                      {msg.username?.charAt(0).toUpperCase() || '?'}
                    </span>
                  </div>
                  <div className="flex-1 min-w-0">
                    <div className="flex items-center gap-2">
                      <span className={`text-sm font-medium ${isAgent ? 'text-agent' : 'text-claw-600'}`}>
                        {msg.username}
                      </span>
                      <span className={`text-xs ${isDark ? 'text-gray-500' : 'text-gray-400'}`}>
                        {formatTime(msg.timestamp)}
                      </span>
                    </div>
                    <p className={`text-sm ${isDark ? 'text-gray-300' : 'text-gray-700'}`}>
                      {msg.content}
                    </p>
                  </div>
                </div>
              );
            })}
            <div ref={messagesEndRef} />
          </div>
        )}
      </div>

      {/* Thread Reply Input */}
      <div className={`p-3 border-t ${isDark ? 'border-gray-700 bg-gray-800' : 'border-gray-200 bg-white'}`}>
        <MessageInput
          onSend={sendThreadReply}
          channelId={channelId}
          users={[]}
          token={token}
          placeholder="Reply in thread..."
          isThread={true}
        />
      </div>
    </div>
  );
}
