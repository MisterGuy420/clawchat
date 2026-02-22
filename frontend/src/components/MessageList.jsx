import React, { useEffect, useRef, useState, useCallback } from 'react';
import { Bot, User, Loader2, SmilePlus, Trash2, Pencil, Check, X, ExternalLink, Search, ChevronDown, RefreshCw, AlertCircle, Reply, Copy, CheckCheck } from 'lucide-react';
import { useTheme } from '../contexts/ThemeContext';
import MarkdownMessage from './MarkdownMessage';

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

// Reply preview component
function ReplyPreview({ replyData, isDark, onClick }) {
  if (!replyData) return null;

  return (
    <div
      onClick={onClick}
      className={`flex items-center gap-2 mb-1 px-2 py-1 rounded cursor-pointer transition-colors ${
        isDark
          ? 'bg-gray-700/50 hover:bg-gray-700 border-l-2 border-gray-600'
          : 'bg-gray-200/50 hover:bg-gray-200 border-l-2 border-gray-300'
      }`}
    >
      <Reply className={`w-3 h-3 ${isDark ? 'text-gray-500' : 'text-gray-400'}`} />
      <span className={`text-xs font-medium ${
        replyData.userType === 'agent' ? 'text-agent' : 'text-claw-500'
      }`}>
        {replyData.username}
      </span>
      <span className={`text-xs truncate max-w-[200px] ${
        isDark ? 'text-gray-400' : 'text-gray-500'
      }`}>
        {replyData.content}
      </span>
    </div>
  );
}

// New Messages divider component
function NewMessagesDivider({ isDark }) {
  return (
    <div className="flex items-center justify-center my-4">
      <div className={`h-px flex-1 ${isDark ? 'bg-claw-500/50' : 'bg-claw-400/50'}`} />
      <span className={`mx-4 text-xs font-semibold uppercase tracking-wider px-2 py-0.5 rounded-full ${
        isDark 
          ? 'bg-claw-500/20 text-claw-400 border border-claw-500/30' 
          : 'bg-claw-100 text-claw-600 border border-claw-300'
      }`}>
        New Messages
      </span>
      <div className={`h-px flex-1 ${isDark ? 'bg-claw-500/50' : 'bg-claw-400/50'}`} />
    </div>
  );
}

// Reaction picker popup
function ReactionPicker({ isOpen, onSelect, onClose, position, isDark }) {
  if (!isOpen) return null;

  return (
    <>
      <div
        className="fixed inset-0 z-40"
        onClick={onClose}
      />
      <div
        className={`absolute z-50 border rounded-lg shadow-xl p-2 flex gap-1 ${
          isDark
            ? 'bg-gray-800 border-gray-600'
            : 'bg-white border-gray-300'
        }`}
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
            className={`w-8 h-8 flex items-center justify-center text-lg rounded transition-colors ${
              isDark ? 'hover:bg-gray-700' : 'hover:bg-gray-100'
            }`}
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
function ReactionBadge({ emoji, users, currentUserId, onToggle, isDark }) {
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
          : isDark
            ? 'bg-gray-700/50 border border-gray-600 hover:bg-gray-700'
            : 'bg-gray-200/50 border border-gray-300 hover:bg-gray-200'
      }`}
      title={tooltipText}
    >
      <span>{emoji}</span>
      <span className={`text-xs ${currentUserReacted ? 'text-claw-300' : isDark ? 'text-gray-400' : 'text-gray-500'}`}>
        {users.length}
      </span>
    </button>
  );
}

// Reactions bar for a message
function MessageReactions({ messageId, reactions, currentUserId, onAddReaction, onRemoveReaction, isDark }) {
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
          isDark={isDark}
        />
      ))}

      <div className="relative" ref={pickerRef}>
        <button
          ref={buttonRef}
          onClick={handleOpenPicker}
          className={`inline-flex items-center gap-1 px-2 py-0.5 rounded-full text-sm border border-transparent transition-all opacity-0 group-hover:opacity-100 ${
            isDark
              ? 'text-gray-500 hover:text-gray-300 hover:bg-gray-700/50 hover:border-gray-600'
              : 'text-gray-400 hover:text-gray-600 hover:bg-gray-200/50 hover:border-gray-300'
          }`}
          title="Add reaction"
        >
          <SmilePlus className="w-4 h-4" />
        </button>

        <ReactionPicker
          isOpen={showPicker}
          onSelect={handleSelectEmoji}
          onClose={() => setShowPicker(false)}
          position={pickerPosition}
          isDark={isDark}
        />
      </div>
    </div>
  );
}

// Message edit form
function MessageEditForm({ content, onSave, onCancel, isDark }) {
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
        className={`w-full border border-claw-500 rounded-lg px-3 py-2 resize-none focus:outline-none focus:ring-2 focus:ring-claw-500 ${
          isDark
            ? 'bg-gray-800 text-gray-100'
            : 'bg-white text-gray-900 border-gray-300'
        }`}
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
          className={`flex items-center gap-1 px-3 py-1 text-sm rounded transition-colors ${
            isDark
              ? 'bg-gray-700 hover:bg-gray-600 text-gray-300'
              : 'bg-gray-200 hover:bg-gray-300 text-gray-700'
          }`}
        >
          <X className="w-3.5 h-3.5" />
          Cancel
        </button>
        <span className={`text-xs ml-2 ${isDark ? 'text-gray-500' : 'text-gray-400'}`}>
          Press Enter to save, Escape to cancel
        </span>
      </div>
    </div>
  );
}

export default function MessageList({ messages, loading, currentUser, reactions, onAddReaction, onRemoveReaction, onDeleteMessage, onEditMessage, onReply, isSearching, searchQuery, pendingMessages = [], failedMessages = [], onRetryMessage, onCancelFailedMessage, lastReadTimestamp, onCopyMessage, copiedMessageId, userStatuses = {} }) {
  const messagesEndRef = useRef(null);
  const containerRef = useRef(null);
  const [editingMessageId, setEditingMessageId] = useState(null);
  const [showJumpButton, setShowJumpButton] = useState(false);
  const [hasNewMessages, setHasNewMessages] = useState(false);
  const [newMessageCount, setNewMessageCount] = useState(0);
  const lastMessageCountRef = useRef(messages.length);
  const isScrolledRef = useRef(false);
  const { isDark } = useTheme();

  // Check scroll position and show/hide jump button
  const handleScroll = () => {
    if (!containerRef.current) return;

    const { scrollTop, scrollHeight, clientHeight } = containerRef.current;
    const scrollBottom = scrollHeight - scrollTop - clientHeight;
    const isNearBottom = scrollBottom < 100;

    isScrolledRef.current = !isNearBottom;
    setShowJumpButton(!isNearBottom);

    // Clear new message indicator when scrolling to bottom
    if (isNearBottom && hasNewMessages) {
      setHasNewMessages(false);
      setNewMessageCount(0);
    }
  };

  // Find the index where new messages begin (after lastReadTimestamp)
  const findNewMessagesDividerIndex = useCallback(() => {
    if (!lastReadTimestamp || messages.length === 0 || isSearching) return -1;
    
    const lastRead = new Date(lastReadTimestamp);
    // Find the first message that comes after lastReadTimestamp
    for (let i = 0; i < messages.length; i++) {
      const msgTime = new Date(messages[i].timestamp);
      if (msgTime > lastRead) {
        // Make sure it's not from the current user (we don't want divider for our own messages)
        if (messages[i].userId !== currentUser?.id) {
          return i;
        }
      }
    }
    return -1;
  }, [lastReadTimestamp, messages, isSearching, currentUser?.id]);

  const newMessagesIndex = findNewMessagesDividerIndex();

  // Scroll to bottom function
  const scrollToBottom = () => {
    if (messagesEndRef.current) {
      messagesEndRef.current.scrollIntoView({ behavior: 'smooth' });
    }
    setHasNewMessages(false);
    setNewMessageCount(0);
    isScrolledRef.current = false;
  };

  // Auto-scroll on initial load and when at bottom
  useEffect(() => {
    if (messagesEndRef.current && !isScrolledRef.current) {
      messagesEndRef.current.scrollIntoView({ behavior: 'smooth' });
    }
  }, [messages]);

  // Track new messages when scrolled up
  useEffect(() => {
    const prevCount = lastMessageCountRef.current;
    const currentCount = messages.length;

    if (currentCount > prevCount) {
      const newCount = currentCount - prevCount;
      const lastMessage = messages[messages.length - 1];

      // Only count messages from other users
      if (lastMessage && lastMessage.userId !== currentUser?.id && isScrolledRef.current) {
        setHasNewMessages(true);
        setNewMessageCount(prev => prev + newCount);
      }
    }

    lastMessageCountRef.current = currentCount;
  }, [messages, currentUser?.id]);

  // Reset state when channel/search changes
  useEffect(() => {
    setShowJumpButton(false);
    setHasNewMessages(false);
    setNewMessageCount(0);
    isScrolledRef.current = false;
    lastMessageCountRef.current = messages.length;
  }, [isSearching, searchQuery]);

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
      <div className={`flex-1 flex items-center justify-center ${isDark ? '' : 'bg-gray-100'}`}>
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
    <div ref={containerRef} onScroll={handleScroll} className={`flex-1 overflow-y-auto scrollbar-thin p-4 relative ${
      isDark ? '' : 'bg-gray-100'
    }`}>
      {(() => {
        // Track global message index across all date groups
        let globalIndex = 0;
        return Object.entries(groupedMessages).map(([date, dateMessages]) => (
          <div key={date}>
            <div className="flex items-center justify-center my-4">
              <div className={`h-px flex-1 ${isDark ? 'bg-gray-700' : 'bg-gray-300'}`} />
              <span className={`mx-4 text-xs ${isDark ? 'text-gray-500' : 'text-gray-400'}`}>{formatDate(dateMessages[0].timestamp)}</span>
              <div className={`h-px flex-1 ${isDark ? 'bg-gray-700' : 'bg-gray-300'}`} />
            </div>

            <div className="space-y-1">
              {dateMessages.map((msg, idx) => {
                const currentGlobalIndex = globalIndex++;
                const prevMsg = idx > 0 ? dateMessages[idx - 1] : null;
                const isConsecutive = prevMsg && prevMsg.userId === msg.userId;
                const isMe = msg.userId === currentUser?.id;
                const isCommand = msg.command || msg.type === 'command_response';
                const msgReactions = reactions?.[msg.id] || msg.reactions || {};
                const isEditing = editingMessageId === msg.id;

                // Check if we should show new messages divider before this message
                const showNewMessagesDivider = currentGlobalIndex === newMessagesIndex;

                return (
                  <React.Fragment key={msg.id}>
                    {showNewMessagesDivider && (
                      <NewMessagesDivider isDark={isDark} />
                    )}
                    <div
                      id={`message-${msg.id}`}
                      className={`message-row flex gap-3 group ${isConsecutive ? 'mt-0.5' : 'mt-4'} ${isCommand ? 'command-message' : ''}`}
                    >
                      {!isConsecutive ? (
                        <div className={`w-10 h-10 rounded-full flex-shrink-0 flex items-center justify-center ${
                          isCommand 
                            ? 'bg-gradient-to-br from-claw-500 to-claw-700' 
                            : msg.userType === 'agent' 
                              ? 'bg-agent' 
                              : 'bg-claw-600'
                        }`}>
                          {isCommand ? (
                            <Bot className="w-5 h-5 text-white" />
                          ) : msg.userType === 'agent' ? (
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
                          isCommand 
                            ? 'text-claw-400' 
                            : msg.userType === 'agent' 
                              ? 'text-agent' 
                              : 'text-claw-500'
                        }`}>
                          {isCommand ? '🤖 ClawBot' : msg.username}
                        </span>
                        {/* Online indicator dot */}
                        {userStatuses[msg.userId]?.online && !isCommand && (
                          <span 
                            className="w-2 h-2 bg-green-500 rounded-full"
                            title="Online now"
                          />
                        )}
                        <TimestampTooltip timestamp={msg.timestamp}>
                          <span className={`text-xs hover:transition-colors ${
                            isDark ? 'text-gray-500 hover:text-gray-400' : 'text-gray-400 hover:text-gray-600'
                          }`}>
                            {formatTime(msg.timestamp)}
                          </span>
                        </TimestampTooltip>
                        {msg.edited && (
                          <span className={`text-xs italic ${isDark ? 'text-gray-500' : 'text-gray-400'}`} title={msg.editedAt ? formatFullTimestamp(msg.editedAt) : 'Edited'}>
                            (edited)
                          </span>
                        )}
                        {!msg.deleted && !isEditing && !isCommand && (
                          <button
                            onClick={() => onReply && onReply(msg)}
                            className={`ml-1 p-1 rounded transition-all opacity-0 group-hover:opacity-100 ${
                              isDark
                                ? 'text-gray-600 hover:text-claw-400 hover:bg-claw-500/10'
                                : 'text-gray-400 hover:text-claw-500 hover:bg-claw-500/10'
                            }`}
                            title="Reply to message"
                          >
                            <Reply className="w-3.5 h-3.5" />
                          </button>
                        )}
                        {!msg.deleted && !isEditing && onCopyMessage && !isCommand && (
                          <button
                            onClick={() => onCopyMessage(msg.content, msg.id)}
                            className={`ml-1 p-1 rounded transition-all opacity-0 group-hover:opacity-100 ${
                              copiedMessageId === msg.id
                                ? 'text-green-400 bg-green-500/10'
                                : isDark
                                  ? 'text-gray-600 hover:text-claw-400 hover:bg-claw-500/10'
                                  : 'text-gray-400 hover:text-claw-500 hover:bg-claw-500/10'
                            }`}
                            title={copiedMessageId === msg.id ? 'Copied!' : 'Copy message'}
                          >
                            {copiedMessageId === msg.id ? (
                              <CheckCheck className="w-3.5 h-3.5" />
                            ) : (
                              <Copy className="w-3.5 h-3.5" />
                            )}
                          </button>
                        )}
                        {isMe && !msg.deleted && !isEditing && (
                          <>
                            <button
                              onClick={() => handleEditStart(msg.id)}
                              className={`ml-1 p-1 rounded transition-all opacity-0 group-hover:opacity-100 ${
                                isDark
                                  ? 'text-gray-600 hover:text-claw-400 hover:bg-claw-500/10'
                                  : 'text-gray-400 hover:text-claw-500 hover:bg-claw-500/10'
                              }`}
                              title="Edit message"
                            >
                              <Pencil className="w-3.5 h-3.5" />
                            </button>
                            <button
                              onClick={() => onDeleteMessage && onDeleteMessage(msg.id)}
                              className={`ml-1 p-1 rounded transition-all opacity-0 group-hover:opacity-100 ${
                                isDark
                                  ? 'text-gray-600 hover:text-red-400 hover:bg-red-500/10'
                                  : 'text-gray-400 hover:text-red-500 hover:bg-red-500/10'
                              }`}
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
                          isDark={isDark}
                        />
                      </div>
                    ) : (
                      <>
                        {msg.replyToData && (
                          <ReplyPreview
                            replyData={msg.replyToData}
                            isDark={isDark}
                            onClick={() => {
                              const element = document.getElementById(`message-${msg.replyToData.id}`);
                              if (element) {
                                element.scrollIntoView({ behavior: 'smooth', block: 'center' });
                                element.classList.add('highlight-message');
                                setTimeout(() => element.classList.remove('highlight-message'), 2000);
                              }
                            }}
                          />
                        )}
                        <div className={`break-words ${isConsecutive ? 'mt-0.5' : ''} ${
                          msg.deleted
                            ? isDark ? 'text-gray-500 italic text-sm' : 'text-gray-400 italic text-sm'
                            : isCommand
                              ? isDark ? 'text-gray-200' : 'text-gray-800'
                              : isDark ? 'text-gray-100' : 'text-gray-900'
                        }`}>
                          {msg.deleted ? (
                            msg.content
                          ) : isCommand ? (
                            <div className="command-content prose prose-sm max-w-none dark:prose-invert" dangerouslySetInnerHTML={{ 
                              __html: msg.content.replace(/\*\*(.*?)\*\*/g, '<strong>$1</strong>')
                                                .replace(/\n/g, '<br />')
                            }} />
                          ) : (
                            <MarkdownMessage text={msg.content} isDark={isDark} />
                          )}
                        </div>

                        {!msg.deleted && !isCommand && (
                          <MessageReactions
                            messageId={msg.id}
                            reactions={msgReactions}
                            currentUserId={currentUser?.id}
                            onAddReaction={onAddReaction}
                            onRemoveReaction={onRemoveReaction}
                            isDark={isDark}
                          />
                        )}
                      </>
                    )}
                  </div>
                </div>
              </React.Fragment>
              );
            })}
          </div>
        </div>
      ));
      })()}

      {messages.length === 0 && (
        <div className={`flex flex-col items-center justify-center h-full ${isDark ? 'text-gray-500' : 'text-gray-400'}`}>
          {isSearching ? (
            <>
              <Search className="w-12 h-12 mb-4 opacity-50" />
              <p className={`text-lg ${isDark ? '' : 'text-gray-600'}`}>No messages found</p>
              <p className="text-sm">No results for "{searchQuery}"</p>
            </>
          ) : (
            <>
              <Bot className="w-12 h-12 mb-4 opacity-50" />
              <p className={`text-lg ${isDark ? '' : 'text-gray-600'}`}>No messages yet</p>
              <p className="text-sm">Be the first to say something!</p>
            </>
          )}
        </div>
      )}

      <div ref={messagesEndRef} />

      {/* Pending Messages */}
      {pendingMessages.length > 0 && (
        <div className="space-y-2 mt-4">
          {pendingMessages.map((msg) => (
            <div key={msg.id} className="flex gap-3 opacity-70">
              <div className={`w-10 h-10 rounded-full flex-shrink-0 flex items-center justify-center ${
                msg.userType === 'agent' ? 'bg-agent' : 'bg-claw-600'
              }`}>
                {msg.userType === 'agent' ? (
                  <Bot className="w-5 h-5 text-white" />
                ) : (
                  <User className="w-5 h-5 text-white" />
                )}
              </div>
              <div className="flex-1 min-w-0">
                <div className="flex items-baseline gap-2">
                  <span className={`font-semibold text-sm ${
                    msg.userType === 'agent' ? 'text-agent' : 'text-claw-500'
                  }`}>
                    {msg.username}
                  </span>
                  <span className={`text-xs ${isDark ? 'text-gray-500' : 'text-gray-400'}`}>{formatTime(msg.timestamp)}</span>
                  <span className={`text-xs italic ${isDark ? 'text-gray-500' : 'text-gray-400'}`}>(sending...)</span>
                  <Loader2 className={`w-3 h-3 animate-spin ${isDark ? 'text-gray-500' : 'text-gray-400'}`} />
                </div>
                <div className={`break-words ${isDark ? 'text-gray-300' : 'text-gray-700'}`}>
                  <MarkdownMessage text={msg.content} isDark={isDark} />
                </div>
              </div>
            </div>
          ))}
        </div>
      )}

      {/* Failed Messages */}
      {failedMessages.length > 0 && (
        <div className="space-y-2 mt-4">
          {failedMessages.map((msg) => (
            <div key={msg.id} className="flex gap-3">
              <div className={`w-10 h-10 rounded-full flex-shrink-0 flex items-center justify-center ${
                msg.userType === 'agent' ? 'bg-agent' : 'bg-claw-600'
              }`}>
                {msg.userType === 'agent' ? (
                  <Bot className="w-5 h-5 text-white" />
                ) : (
                  <User className="w-5 h-5 text-white" />
                )}
              </div>
              <div className="flex-1 min-w-0">
                <div className="flex items-baseline gap-2">
                  <span className={`font-semibold text-sm ${
                    msg.userType === 'agent' ? 'text-agent' : 'text-claw-500'
                  }`}>
                    {msg.username}
                  </span>
                  <span className={`text-xs ${isDark ? 'text-gray-500' : 'text-gray-400'}`}>{formatTime(msg.timestamp)}</span>
                  <span className="text-xs text-red-400 flex items-center gap-1">
                    <AlertCircle className="w-3 h-3" />
                    Failed to send
                  </span>
                </div>
                <div className={`break-words ${isDark ? 'text-gray-300' : 'text-gray-700'}`}>
                  <MarkdownMessage text={msg.content} isDark={isDark} />
                </div>
                <div className="flex items-center gap-2 mt-1">
                  <button
                    onClick={() => onRetryMessage && onRetryMessage(msg)}
                    className="flex items-center gap-1 px-2 py-1 bg-claw-600 hover:bg-claw-700 text-white text-xs rounded transition-colors"
                  >
                    <RefreshCw className="w-3 h-3" />
                    Retry
                  </button>
                  <button
                    onClick={() => onCancelFailedMessage && onCancelFailedMessage(msg.id)}
                    className={`flex items-center gap-1 px-2 py-1 text-xs rounded transition-colors ${
                      isDark
                        ? 'bg-gray-700 hover:bg-gray-600 text-gray-300'
                        : 'bg-gray-200 hover:bg-gray-300 text-gray-700'
                    }`}
                  >
                    <X className="w-3 h-3" />
                    Dismiss
                  </button>
                </div>
              </div>
            </div>
          ))}
        </div>
      )}

      {/* Jump to bottom button */}
      {showJumpButton && (
        <button
          onClick={scrollToBottom}
          className="absolute bottom-4 right-4 flex items-center gap-2 px-4 py-2 bg-claw-600 hover:bg-claw-700 text-white rounded-full shadow-lg transition-all hover:scale-105 z-10"
        >
          <ChevronDown className="w-4 h-4" />
          <span>Jump to bottom</span>
          {hasNewMessages && newMessageCount > 0 && (
            <span className="bg-red-500 text-white text-xs font-bold px-2 py-0.5 rounded-full">
              {newMessageCount > 99 ? '99+' : newMessageCount}
            </span>
          )}
        </button>
      )}
    </div>
  );
}
