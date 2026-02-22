import React, { useEffect, useRef, useState } from 'react';
import { Bot, User, Loader2, SmilePlus, Trash2, Pencil, Check, X, ExternalLink } from 'lucide-react';
import LinkifiedText from './LinkifiedText';

const COMMON_EMOJIS = ['👍', '❤️', '😂', '🎉', '😮', '👏', '🔥', '😢', '🤔', '👎'];

function formatTime(date) {
  const d = new Date(date);
  return d.toLocaleTimeString('en-US', {
    hour: 'numeric',
    minute: '2-digit',
    hour12: true
  });
}

function formatFullTimestamp(date) {
  const d = new Date(date);
  return d.toLocaleString('en-US', {
    weekday: 'short',
    year: 'numeric',
    month: 'short',
    day: 'numeric',
    hour: 'numeric',
    minute: '2-digit',
    hour12: true
  });
}

// Simple tooltip component for timestamps
function TimestampTooltip({ timestamp, children }) {
  const [showTooltip, setShowTooltip] = useState(false);
  const [tooltipPosition, setTooltipPosition] = useState({ x: 0, y: 0 });

  const handleMouseEnter = (e) => {
    const rect = e.currentTarget.getBoundingClientRect();
    setTooltipPosition({
      x: rect.left + rect.width / 2,
      y: rect.top - 8
    });
    setShowTooltip(true);
  };

  const handleMouseLeave = () => {
    setShowTooltip(false);
  };

  return (
    <>
      <span
        className="cursor-help"
        onMouseEnter={handleMouseEnter}
        onMouseLeave={handleMouseLeave}
      >
        {children}
      </span>
      {showTooltip && (
        <div
          className="fixed z-50 px-2 py-1 text-xs text-white bg-gray-900 rounded shadow-lg pointer-events-none whitespace-nowrap"
          style={{
            left: tooltipPosition.x,
            top: tooltipPosition.y,
            transform: 'translate(-50%, -100%)'
          }}
        >
          {formatFullTimestamp(timestamp)}
          <div className="absolute top-full left-1/2 -translate-x-1/2 border-4 border-transparent border-t-gray-900" />
        </div>
      )}
    </>
  );
}

function formatDate(date) {
  const d = new Date(date);
  const today = new Date();
  const yesterday = new Date(today);
  yesterday.setDate(yesterday.getDate() - 1);
  
  if (d.toDateString() === today.toDateString()) return 'Today';
  if (d.toDateString() === yesterday.toDateString()) return 'Yesterday';
  return d.toLocaleDateString('en-US', { month: 'short', day: 'numeric' });
}

// Reaction picker popup
function ReactionPicker({ isOpen, onSelect, onClose, position }) {
  if (!isOpen) return null;

  return (
    <>
      <div 
        className="fixed inset-0 z-40" 
        onClick={onClose}
      />
      <div 
        className="absolute z-50 bg-gray-800 border border-gray-600 rounded-lg shadow-xl p-2 flex gap-1"
        style={{ 
          bottom: position?.bottom || '100%',
          left: position?.left || 0,
          marginBottom: '8px'
        }}
      >
        {COMMON_EMOJIS.map(emoji => (
          <button
            key={emoji}
            onClick={() => onSelect(emoji)}
            className="w-8 h-8 flex items-center justify-center text-lg hover:bg-gray-700 rounded transition-colors"
            title={`React with ${emoji}`}
          >
            {emoji}
          </button>
        ))}
      </div>
    </>
  );
}

// Single reaction badge
function ReactionBadge({ emoji, users, currentUserId, onToggle }) {
  const currentUserReacted = users.some(u => u.userId === currentUserId);
  const tooltipText = users.length > 3 
    ? `${users.slice(0, 3).map(u => u.username).join(', ')} and ${users.length - 3} others`
    : users.map(u => u.username).join(', ');

  return (
    <button
      onClick={() => onToggle(emoji)}
      className={`inline-flex items-center gap-1 px-2 py-0.5 rounded-full text-sm transition-all ${
        currentUserReacted 
          ? 'bg-claw-600/30 border border-claw-500 hover:bg-claw-600/50' 
          : 'bg-gray-700/50 border border-gray-600 hover:bg-gray-700'
      }`}
      title={tooltipText}
    >
      <span>{emoji}</span>
      <span className={`text-xs ${currentUserReacted ? 'text-claw-300' : 'text-gray-400'}`}>
        {users.length}
      </span>
    </button>
  );
}

// Reactions bar for a message
function MessageReactions({ messageId, reactions, currentUserId, onAddReaction, onRemoveReaction }) {
  const [showPicker, setShowPicker] = useState(false);
  const [pickerPosition, setPickerPosition] = useState({});
  const pickerRef = useRef(null);
  const buttonRef = useRef(null);

  const handleToggle = (emoji) => {
    const emojiReactions = reactions?.[emoji] || [];
    const userReacted = emojiReactions.some(r => r.userId === currentUserId);
    
    if (userReacted) {
      onRemoveReaction(messageId, emoji);
    } else {
      onAddReaction(messageId, emoji);
    }
  };

  const handleOpenPicker = () => {
    if (buttonRef.current) {
      const rect = buttonRef.current.getBoundingClientRect();
      const parentRect = buttonRef.current.closest('.message-row')?.getBoundingClientRect();
      if (parentRect) {
        setPickerPosition({
          left: rect.left - parentRect.left,
          bottom: '100%'
        });
      }
    }
    setShowPicker(true);
  };

  const handleSelectEmoji = (emoji) => {
    handleToggle(emoji);
    setShowPicker(false);
  };

  const hasReactions = reactions && Object.keys(reactions).length > 0;

  return (
    <div className="flex items-center gap-1 mt-1 flex-wrap">
      {hasReactions && Object.entries(reactions).map(([emoji, users]) => (
        <ReactionBadge
          key={emoji}
          emoji={emoji}
          users={users}
          currentUserId={currentUserId}
          onToggle={handleToggle}
        />
      ))}
      
      <div className="relative" ref={pickerRef}>
        <button
          ref={buttonRef}
          onClick={handleOpenPicker}
          className="inline-flex items-center gap-1 px-2 py-0.5 rounded-full text-sm text-gray-500 hover:text-gray-300 hover:bg-gray-700/50 border border-transparent hover:border-gray-600 transition-all opacity-0 group-hover:opacity-100"
          title="Add reaction"
        >
          <SmilePlus className="w-4 h-4" />
        </button>
        
        <ReactionPicker
          isOpen={showPicker}
          onSelect={handleSelectEmoji}
          onClose={() => setShowPicker(false)}
          position={pickerPosition}
        />
      </div>
    </div>
  );
}

// Message edit form
function MessageEditForm({ content, onSave, onCancel }) {
  const [editContent, setEditContent] = useState(content);
  const textareaRef = useRef(null);

  useEffect(() => {
    if (textareaRef.current) {
      textareaRef.current.focus();
      textareaRef.current.select();
    }
  }, []);

  const handleKeyDown = (e) => {
    if (e.key === 'Enter' && !e.shiftKey) {
      e.preventDefault();
      handleSave();
    } else if (e.key === 'Escape') {
      onCancel();
    }
  };

  const handleSave = () => {
    const trimmed = editContent.trim();
    if (trimmed && trimmed !== content) {
      onSave(trimmed);
    } else if (!trimmed) {
      // Don't allow saving empty content, cancel instead
      onCancel();
    } else {
      onCancel();
    }
  };

  return (
    <div className="flex-1">
      <textarea
        ref={textareaRef}
        value={editContent}
        onChange={(e) => setEditContent(e.target.value)}
        onKeyDown={handleKeyDown}
        className="w-full bg-gray-800 border border-claw-500 rounded-lg px-3 py-2 text-gray-100 resize-none focus:outline-none focus:ring-2 focus:ring-claw-500"
        rows={Math.min(5, editContent.split('\n').length + 1)}
        style={{ minHeight: '40px' }}
      />
      <div className="flex items-center gap-2 mt-2">
        <button
          onClick={handleSave}
          className="flex items-center gap-1 px-3 py-1 bg-claw-600 hover:bg-claw-700 text-white text-sm rounded transition-colors"
        >
          <Check className="w-3.5 h-3.5" />
          Save
        </button>
        <button
          onClick={onCancel}
          className="flex items-center gap-1 px-3 py-1 bg-gray-700 hover:bg-gray-600 text-gray-300 text-sm rounded transition-colors"
        >
          <X className="w-3.5 h-3.5" />
          Cancel
        </button>
        <span className="text-xs text-gray-500 ml-2">
          Press Enter to save, Escape to cancel
        </span>
      </div>
    </div>
  );
}

export default function MessageList({ messages, loading, currentUser, reactions, onAddReaction, onRemoveReaction, onDeleteMessage, onEditMessage }) {
  const messagesEndRef = useRef(null);
  const containerRef = useRef(null);
  const [editingMessageId, setEditingMessageId] = useState(null);

  useEffect(() => {
    if (messagesEndRef.current) {
      messagesEndRef.current.scrollIntoView({ behavior: 'smooth' });
    }
  }, [messages]);

  const handleEditStart = (messageId) => {
    setEditingMessageId(messageId);
  };

  const handleEditSave = async (messageId, newContent) => {
    try {
      await onEditMessage(messageId, newContent);
      setEditingMessageId(null);
    } catch (err) {
      // Error handled in parent
    }
  };

  const handleEditCancel = () => {
    setEditingMessageId(null);
  };

  if (loading) {
    return (
      <div className="flex-1 flex items-center justify-center">
        <Loader2 className="w-8 h-8 text-claw-500 animate-spin" />
      </div>
    );
  }

  // Group messages by date
  const groupedMessages = messages.reduce((groups, msg) => {
    const date = new Date(msg.timestamp).toDateString();
    if (!groups[date]) groups[date] = [];
    groups[date].push(msg);
    return groups;
  }, {});

  return (
    <div ref={containerRef} className="flex-1 overflow-y-auto scrollbar-thin p-4">
      {Object.entries(groupedMessages).map(([date, dateMessages]) => (
        <div key={date}>
          <div className="flex items-center justify-center my-4">
            <div className="h-px bg-gray-700 flex-1" />
            <span className="mx-4 text-xs text-gray-500">{formatDate(dateMessages[0].timestamp)}</span>
            <div className="h-px bg-gray-700 flex-1" />
          </div>

          <div className="space-y-1">
            {dateMessages.map((msg, idx) => {
              const prevMsg = idx > 0 ? dateMessages[idx - 1] : null;
              const isConsecutive = prevMsg && prevMsg.userId === msg.userId;
              const isMe = msg.userId === currentUser?.id;
              const msgReactions = reactions?.[msg.id] || msg.reactions || {};
              const isEditing = editingMessageId === msg.id;

              return (
                <div
                  key={msg.id}
                  className={`message-row flex gap-3 group ${isConsecutive ? 'mt-0.5' : 'mt-4'}`}
                >
                  {!isConsecutive ? (
                    <div className={`w-10 h-10 rounded-full flex-shrink-0 flex items-center justify-center ${
                      msg.userType === 'agent' ? 'bg-agent' : 'bg-claw-600'
                    }`}>
                      {msg.userType === 'agent' ? (
                        <Bot className="w-5 h-5 text-white" />
                      ) : (
                        <User className="w-5 h-5 text-white" />
                      )}
                    </div>
                  ) : (
                    <div className="w-10 flex-shrink-0" />
                  )}

                  <div className="flex-1 min-w-0">
                    {!isConsecutive && (
                      <div className="flex items-baseline gap-2">
                        <span className={`font-semibold text-sm ${
                          msg.userType === 'agent' ? 'text-agent' : 'text-claw-400'
                        }`}>
                          {msg.username}
                        </span>
                        <TimestampTooltip timestamp={msg.timestamp}>
                          <span className="text-xs text-gray-500 hover:text-gray-400 transition-colors">
                            {formatTime(msg.timestamp)}
                          </span>
                        </TimestampTooltip>
                        {msg.edited && (
                          <span className="text-xs text-gray-500 italic" title={msg.editedAt ? formatFullTimestamp(msg.editedAt) : 'Edited'}>
                            (edited)
                          </span>
                        )}
                        {isMe && !msg.deleted && !isEditing && (
                          <>
                            <button
                              onClick={() => handleEditStart(msg.id)}
                              className="ml-1 p-1 text-gray-600 hover:text-claw-400 hover:bg-claw-500/10 rounded transition-all opacity-0 group-hover:opacity-100"
                              title="Edit message"
                            >
                              <Pencil className="w-3.5 h-3.5" />
                            </button>
                            <button
                              onClick={() => onDeleteMessage && onDeleteMessage(msg.id)}
                              className="ml-1 p-1 text-gray-600 hover:text-red-400 hover:bg-red-500/10 rounded transition-all opacity-0 group-hover:opacity-100"
                              title="Delete message"
                            >
                              <Trash2 className="w-3.5 h-3.5" />
                            </button>
                          </>
                        )}
                      </div>
                    )}
                    
                    {isEditing ? (
                      <div className={isConsecutive ? 'mt-0.5' : ''}>
                        <MessageEditForm
                          content={msg.content}
                          onSave={(newContent) => handleEditSave(msg.id, newContent)}
                          onCancel={handleEditCancel}
                        />
                      </div>
                    ) : (
                      <>
                        <div className={`break-words ${isConsecutive ? 'mt-0.5' : ''} ${
                          msg.deleted ? 'text-gray-500 italic text-sm' : 'text-gray-100'
                        }`}>
                          {msg.deleted ? msg.content : <LinkifiedText text={msg.content} />}
                        </div>
                        
                        {!msg.deleted && (
                          <MessageReactions
                            messageId={msg.id}
                            reactions={msgReactions}
                            currentUserId={currentUser?.id}
                            onAddReaction={onAddReaction}
                            onRemoveReaction={onRemoveReaction}
                          />
                        )}
                      </>
                    )}
                  </div>
                </div>
              );
            })}
          </div>
        </div>
      ))}

      {messages.length === 0 && (
        <div className="flex flex-col items-center justify-center h-full text-gray-500">
          <Bot className="w-12 h-12 mb-4 opacity-50" />
          <p className="text-lg">No messages yet</p>
          <p className="text-sm">Be the first to say something!</p>
        </div>
      )}

      <div ref={messagesEndRef} />
    </div>
  );
}
