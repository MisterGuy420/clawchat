import React, { useState, useRef, useCallback, useEffect, forwardRef, useImperativeHandle } from 'react';
import { Send, Smile, Paperclip, X, Image as ImageIcon, Keyboard, AtSign, Reply } from 'lucide-react';
import { useWebSocket } from '../contexts/WebSocketContext';
import { useClipboard } from '../hooks/useClipboard';
import { useTheme } from '../contexts/ThemeContext';
import { useMentions } from '../hooks/useMentions';
import { useEmojiAutocomplete } from '../hooks/useEmojiAutocomplete';
import EmojiPicker from './EmojiPicker';
import MentionDropdown from './MentionDropdown';
import EmojiAutocomplete from './EmojiAutocomplete';

const MessageInput = forwardRef(function MessageInput({ onSend, channelId, emojiPickerOpen, setEmojiPickerOpen, users = [], replyTo, onCancelReply }, ref) {
  const [message, setMessage] = useState('');
  const textareaRef = useRef(null);
  const { sendTyping } = useWebSocket();
  const typingTimeoutRef = useRef(null);
  const { attachments, handlePaste, removeAttachment, clearAttachments, hasAttachments } = useClipboard();
  const fileInputRef = useRef(null);
  const { isDark } = useTheme();
  const mentionContainerRef = useRef(null);
  
  const { 
    mentionState, 
    handleInputChange, 
    handleKeyDown: handleMentionKeyDown,
    selectMention,
    closeMentions,
    inputRef: mentionInputRef
  } = useMentions(users);

  // Emoji autocomplete
  const {
    emojiState,
    handleEmojiInputChange,
    handleEmojiKeyDown,
    selectEmoji,
    closeEmojiAutocomplete,
    emojiInputRef
  } = useEmojiAutocomplete();

  // Expose focus method to parent via ref
  useImperativeHandle(ref, () => ({
    focus: () => {
      textareaRef.current?.focus();
    }
  }));

  // Sync refs
  useEffect(() => {
    mentionInputRef.current = textareaRef.current;
    emojiInputRef.current = textareaRef.current;
  }, [mentionInputRef, emojiInputRef]);

  const handleTyping = useCallback(() => {
    if (!channelId) return;
    
    // Send typing start
    sendTyping(channelId, true);
    
    // Clear previous timeout
    if (typingTimeoutRef.current) {
      clearTimeout(typingTimeoutRef.current);
    }
    
    // Send typing stop after 3 seconds of inactivity
    typingTimeoutRef.current = setTimeout(() => {
      sendTyping(channelId, false);
    }, 3000);
  }, [channelId, sendTyping]);

  const handleSubmit = (e) => {
    e.preventDefault();
    if (!message.trim() && !hasAttachments) return;
    
    // Close any open mentions
    closeMentions();
    
    // Clear typing indicator immediately on send
    if (typingTimeoutRef.current) {
      clearTimeout(typingTimeoutRef.current);
    }
    sendTyping(channelId, false);
    
    // TODO: Send attachments with message (for now just send message)
    
    if (message.trim()) {
      onSend(message.trim());
    }
    
    setMessage('');
    clearAttachments();
    if (textareaRef.current) {
      textareaRef.current.style.height = 'auto';
    }
  };

  const handleKeyDown = (e) => {
    // Handle emoji autocomplete first (if open)
    if (emojiState.isOpen) {
      const handledByEmoji = handleEmojiKeyDown(e, message, (newValue) => {
        setMessage(newValue);
      });
      if (handledByEmoji) return;
    }
    
    // Handle mention navigation
    const handledByMention = handleMentionKeyDown(e, message, (newValue) => {
      setMessage(newValue);
    });
    
    if (handledByMention) return;
    
    if (e.key === 'Enter' && !e.shiftKey) {
      e.preventDefault();
      handleSubmit(e);
    }
  };

  const handleInput = (e) => {
    const target = e.target;
    target.style.height = 'auto';
    target.style.height = `${Math.min(target.scrollHeight, 120)}px`;
  };

  const handleChange = (e) => {
    const newValue = e.target.value;
    const cursorPosition = e.target.selectionStart;
    setMessage(newValue);
    
    // Only trigger one autocomplete at a time (mentions take priority)
    if (!emojiState.isOpen) {
      handleInputChange(newValue, cursorPosition);
    }
    if (!mentionState.isOpen) {
      handleEmojiInputChange(newValue, cursorPosition);
    }
    
    handleTyping();
  };

  const handleSelectMention = (user) => {
    const newValue = selectMention(user, message);
    setMessage(newValue);
  };

  const handleSelectEmojiAutocomplete = (emojiItem) => {
    const newValue = selectEmoji(emojiItem, message);
    setMessage(newValue);
    handleTyping();
  };

  const insertAtSymbol = () => {
    const textarea = textareaRef.current;
    if (!textarea) return;
    
    const start = textarea.selectionStart;
    const end = textarea.selectionEnd;
    const newMessage = message.substring(0, start) + '@' + message.substring(end);
    
    setMessage(newMessage);
    
    setTimeout(() => {
      textarea.focus();
      const newCursorPos = start + 1;
      textarea.setSelectionRange(newCursorPos, newCursorPos);
      handleInputChange(newMessage, newCursorPos);
    }, 0);
  };

  const handleFileSelect = (e) => {
    const files = e.target.files;
    if (!files || files.length === 0) return;
    
    Array.from(files).forEach(file => {
      if (file.type.startsWith('image/')) {
        const id = `${Date.now()}-${Math.random().toString(36).slice(2, 9)}`;
        const previewUrl = URL.createObjectURL(file);
        
        // Access the attachments setter through the hook's internal mechanism
        // We need to add the file via the paste handler logic
        const syntheticEvent = {
          clipboardData: {
            items: [{
              type: file.type,
              getAsFile: () => file
            }]
          },
          preventDefault: () => {}
        };
        handlePaste(syntheticEvent);
      }
    });
    
    // Reset file input
    e.target.value = '';
  };

  const formatFileSize = (bytes) => {
    if (bytes < 1024) return bytes + ' B';
    if (bytes < 1024 * 1024) return (bytes / 1024).toFixed(1) + ' KB';
    return (bytes / (1024 * 1024)).toFixed(1) + ' MB';
  };

  const handleEmojiSelect = (emoji) => {
    const textarea = textareaRef.current;
    if (!textarea) return;

    const start = textarea.selectionStart;
    const end = textarea.selectionEnd;
    const newMessage = message.substring(0, start) + emoji + message.substring(end);
    
    setMessage(newMessage);
    
    // Focus back on textarea and position cursor after the inserted emoji
    setTimeout(() => {
      textarea.focus();
      textarea.setSelectionRange(start + emoji.length, start + emoji.length);
    }, 0);
    
    handleTyping();
  };

  return (
    <div className={`p-4 border-t transition-colors duration-200 ${
      isDark 
        ? 'bg-gray-800 border-gray-700' 
        : 'bg-white border-gray-200'
    }`}>
      {/* Attachments preview */}
      {hasAttachments && (
        <div className="mb-3 flex flex-wrap gap-2">
          {attachments.map((attachment) => (
            <div
              key={attachment.id}
              className={`relative group rounded-lg overflow-hidden border ${
                isDark 
                  ? 'bg-gray-700 border-gray-600' 
                  : 'bg-gray-100 border-gray-300'
              }`}
            >
              <div className="w-20 h-20 flex items-center justify-center">
                {attachment.previewUrl ? (
                  <img
                    src={attachment.previewUrl}
                    alt="Attachment preview"
                    className="w-full h-full object-cover"
                  />
                ) : (
                  <ImageIcon className={`w-8 h-8 ${isDark ? 'text-gray-500' : 'text-gray-400'}`} />
                )}
              </div>
              <button
                type="button"
                onClick={() => removeAttachment(attachment.id)}
                className="absolute -top-1 -right-1 w-5 h-5 bg-red-500 hover:bg-red-600 rounded-full flex items-center justify-center text-white opacity-0 group-hover:opacity-100 transition-opacity shadow-md"
                title="Remove attachment"
              >
                <X className="w-3 h-3" />
              </button>
              <div className={`absolute bottom-0 left-0 right-0 px-1 py-0.5 ${
                isDark ? 'bg-gray-900/80' : 'bg-gray-800/80'
              }`}>
                <span className="text-[10px] text-gray-300 truncate block">
                  {formatFileSize(attachment.size)}
                </span>
              </div>
            </div>
          ))}
        </div>
      )}

      {/* Reply preview */}
      {replyTo && (
        <div className={`mb-3 flex items-center gap-2 px-3 py-2 rounded-lg ${
          isDark ? 'bg-gray-700/50' : 'bg-gray-100'
        }`}>
          <Reply className={`w-4 h-4 ${isDark ? 'text-claw-400' : 'text-claw-500'}`} />
          <div className="flex-1 min-w-0">
            <span className={`text-xs ${isDark ? 'text-gray-400' : 'text-gray-500'}`}>
              Replying to <span className={replyTo.userType === 'agent' ? 'text-agent' : 'text-claw-500'}>{replyTo.username}</span>
            </span>
            <p className={`text-sm truncate ${isDark ? 'text-gray-300' : 'text-gray-700'}`}>
              {replyTo.content}
            </p>
          </div>
          <button
            type="button"
            onClick={onCancelReply}
            className={`p-1 rounded transition-colors ${
              isDark 
                ? 'hover:bg-gray-600 text-gray-400' 
                : 'hover:bg-gray-200 text-gray-500'
            }`}
            title="Cancel reply"
          >
            <X className="w-4 h-4" />
          </button>
        </div>
      )}

      <form onSubmit={handleSubmit} className="flex gap-2 relative">
        <div 
          ref={mentionContainerRef}
          className={`flex-1 rounded-lg flex items-end transition-colors duration-200 ${
            isDark ? 'bg-gray-700' : 'bg-gray-100'
          }`}
        >
          <textarea
            ref={textareaRef}
            value={message}
            onChange={handleChange}
            onKeyDown={handleKeyDown}
            onInput={handleInput}
            onPaste={handlePaste}
            placeholder="Type a message... (paste images directly)"
            rows={1}
            className={`flex-1 bg-transparent px-4 py-3 resize-none focus:outline-none max-h-32 ${
              isDark 
                ? 'text-white placeholder-gray-500' 
                : 'text-gray-900 placeholder-gray-400'
            }`}
            style={{ minHeight: '48px' }}
          />
          <div className="flex items-center gap-1 p-2">
            <input
              type="file"
              ref={fileInputRef}
              onChange={handleFileSelect}
              accept="image/*"
              multiple
              className="hidden"
            />
            <button
              type="button"
              onClick={insertAtSymbol}
              className={`p-2 rounded-lg transition-colors ${
                mentionState.isOpen
                  ? 'text-claw-400 bg-claw-500/20'
                  : isDark 
                    ? 'text-gray-500 hover:text-gray-300 hover:bg-gray-600' 
                    : 'text-gray-500 hover:text-gray-700 hover:bg-gray-200'
              }`}
              title="Mention someone (@)"
            >
              <AtSign className="w-5 h-5" />
            </button>
            <button
              type="button"
              onClick={() => fileInputRef.current?.click()}
              className={`p-2 rounded-lg transition-colors ${
                isDark 
                  ? 'text-gray-500 hover:text-gray-300 hover:bg-gray-600' 
                  : 'text-gray-500 hover:text-gray-700 hover:bg-gray-200'
              }`}
              title="Attach file"
            >
              <Paperclip className="w-5 h-5" />
            </button>
            <div className="relative">
              <button
                type="button"
                onClick={() => setEmojiPickerOpen(!emojiPickerOpen)}
                className={`p-2 rounded-lg transition-colors ${
                  emojiPickerOpen 
                    ? 'text-claw-400 bg-claw-500/20' 
                    : isDark
                      ? 'text-gray-500 hover:text-gray-300 hover:bg-gray-600'
                      : 'text-gray-500 hover:text-gray-700 hover:bg-gray-200'
                }`}
                title="Add emoji (Ctrl+E)"
              >
                <Smile className="w-5 h-5" />
              </button>
              <EmojiPicker
                isOpen={emojiPickerOpen}
                onSelect={handleEmojiSelect}
                onClose={() => setEmojiPickerOpen(false)}
              />
            </div>
          </div>
        </div>

        <button
          type="submit"
          disabled={!message.trim() && !hasAttachments}
          className="px-4 bg-claw-600 hover:bg-claw-700 disabled:opacity-50 disabled:cursor-not-allowed rounded-lg transition-colors flex items-center justify-center"
        >
          <Send className="w-5 h-5 text-white" />
        </button>
        
        {/* Mention Dropdown */}
        <MentionDropdown
          isOpen={mentionState.isOpen}
          users={mentionState.filteredUsers}
          selectedIndex={mentionState.selectedIndex}
          onSelect={handleSelectMention}
          position={{ bottom: '100%', left: '56px' }}
        />

        {/* Emoji Autocomplete Dropdown */}
        <EmojiAutocomplete
          isOpen={emojiState.isOpen}
          emojis={emojiState.filteredEmojis}
          selectedIndex={emojiState.selectedIndex}
          onSelect={handleSelectEmojiAutocomplete}
          position={{ bottom: '100%', left: '56px' }}
        />
      </form>

      <div className={`mt-2 text-xs text-center flex items-center justify-center gap-2 ${
        isDark ? 'text-gray-500' : 'text-gray-400'
      }`}>
        <span>Enter to send • Shift+Enter for new line • @ to mention • : for emoji • **bold** • `code`</span>
        <button
          type="button"
          onClick={() => window.dispatchEvent(new KeyboardEvent('keydown', { key: '/', ctrlKey: true }))}
          className="flex items-center gap-1 text-claw-400 hover:text-claw-300 transition-colors"
          title="Show keyboard shortcuts"
        >
          <Keyboard className="w-3 h-3" />
          <span>Ctrl+/</span>
        </button>
      </div>
    </div>
  );
});

export default MessageInput;
