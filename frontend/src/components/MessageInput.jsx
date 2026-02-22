import React, { useState, useRef, useCallback, useEffect, forwardRef, useImperativeHandle } from 'react';
import { Send, Smile, Paperclip, X, Image as ImageIcon, Keyboard, AtSign, Reply, Loader2, Bold, Italic, Code, Strikethrough } from 'lucide-react';
import { useWebSocket } from '../contexts/WebSocketContext';
import { useClipboard } from '../hooks/useClipboard';
import { useTheme } from '../contexts/ThemeContext';
import { useMentions } from '../hooks/useMentions';
import { useEmojiAutocomplete } from '../hooks/useEmojiAutocomplete';
import EmojiPicker from './EmojiPicker';
import MentionDropdown from './MentionDropdown';
import EmojiAutocomplete from './EmojiAutocomplete';

const MessageInput = forwardRef(function MessageInput({ 
  onSend, 
  channelId, 
  emojiPickerOpen, 
  setEmojiPickerOpen, 
  users = [], 
  replyTo, 
  onCancelReply, 
  token,
  placeholder,
  isThread = false
}, ref) {
  const [message, setMessage] = useState('');
  const [isUploading, setIsUploading] = useState(false);
  const [uploadProgress, setUploadProgress] = useState(0);
  const textareaRef = useRef(null);
  const { sendTyping } = useWebSocket();
  const typingTimeoutRef = useRef(null);
  const { attachments, handlePaste, removeAttachment, clearAttachments, hasAttachments, addAttachment } = useClipboard();
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

  // Format text helper - wraps selected text or inserts at cursor
  const formatText = useCallback((before, after = before) => {
    const textarea = textareaRef.current;
    if (!textarea) return;

    const start = textarea.selectionStart;
    const end = textarea.selectionEnd;
    const selectedText = message.substring(start, end);
    const hasSelection = start !== end;

    let newText;
    let newCursorPos;

    if (hasSelection) {
      // Wrap selected text
      newText = message.substring(0, start) + before + selectedText + after + message.substring(end);
      newCursorPos = end + before.length + after.length;
    } else {
      // Insert at cursor
      newText = message.substring(0, start) + before + after + message.substring(end);
      newCursorPos = start + before.length;
    }

    setMessage(newText);

    // Focus back and set cursor position
    setTimeout(() => {
      textarea.focus();
      textarea.setSelectionRange(newCursorPos, newCursorPos);
    }, 0);

    handleTyping();
  }, [message, handleTyping]);

  const insertBold = useCallback(() => formatText('**', '**'), [formatText]);
  const insertItalic = useCallback(() => formatText('_', '_'), [formatText]);
  const insertStrikethrough = useCallback(() => formatText('~~', '~~'), [formatText]);

  const insertCode = useCallback(() => {
    const textarea = textareaRef.current;
    if (!textarea) return;

    const start = textarea.selectionStart;
    const end = textarea.selectionEnd;
    const selectedText = message.substring(start, end);
    const hasSelection = start !== end;

    let newText;
    let newCursorPos;

    if (hasSelection) {
      // Check if selection has multiple lines
      const hasNewlines = selectedText.includes('\n');
      if (hasNewlines) {
        // Multi-line code block
        newText = message.substring(0, start) + '```\n' + selectedText + '\n```' + message.substring(end);
        newCursorPos = end + 8;
      } else {
        // Inline code
        newText = message.substring(0, start) + '`' + selectedText + '`' + message.substring(end);
        newCursorPos = end + 2;
      }
    } else {
      // Insert inline code at cursor
      newText = message.substring(0, start) + '`' + message.substring(end);
      newCursorPos = start + 1;
    }

    setMessage(newText);

    setTimeout(() => {
      textarea.focus();
      textarea.setSelectionRange(newCursorPos, newCursorPos);
    }, 0);

    handleTyping();
  }, [message, handleTyping]);

  const handleSubmit = async (e) => {
    e.preventDefault();
    if ((!message.trim() && !hasAttachments) || isUploading) return;
    
    // Close any open mentions
    closeMentions();
    
    // Clear typing indicator immediately on send
    if (typingTimeoutRef.current) {
      clearTimeout(typingTimeoutRef.current);
    }
    sendTyping(channelId, false);
    
    // Upload attachments first if any
    let uploadedAttachments = [];
    if (hasAttachments) {
      setIsUploading(true);
      setUploadProgress(0);
      try {
        const formData = new FormData();
        attachments.forEach(attachment => {
          formData.append('files', attachment.blob, attachment.name);
        });
        
        const response = await fetch('/upload', {
          method: 'POST',
          headers: {
            'Authorization': `Bearer ${token}`
          },
          body: formData
        });
        
        if (!response.ok) {
          throw new Error('Upload failed');
        }
        
        const result = await response.json();
        uploadedAttachments = result.files || [];
      } catch (err) {
        console.error('Upload error:', err);
        // Continue sending message without attachments
      } finally {
        setIsUploading(false);
        setUploadProgress(0);
      }
    }
    
    // Send message with attachments
    if (message.trim() || uploadedAttachments.length > 0) {
      onSend(message.trim(), uploadedAttachments);
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
      // Check file size (10MB limit)
      if (file.size > 10 * 1024 * 1024) {
        alert(`File ${file.name} is too large. Max size is 10MB.`);
        return;
      }
      addAttachment(file);
    });
    
    // Reset file input
    e.target.value = '';
  };

  const formatFileSize = (bytes) => {
    if (bytes < 1024) return bytes + ' B';
    if (bytes < 1024 * 1024) return (bytes / 1024).toFixed(1) + ' KB';
    return (bytes / (1024 * 1024)).toFixed(1) + ' MB';
  };

  const getFileIcon = (mimeType) => {
    if (mimeType?.startsWith('image/')) return <ImageIcon className={`w-8 h-8 ${isDark ? 'text-gray-400' : 'text-gray-500'}`} />;
    if (mimeType?.startsWith('video/')) return <span className={`text-2xl ${isDark ? 'text-gray-400' : 'text-gray-500'}`}>🎥</span>;
    if (mimeType?.startsWith('audio/')) return <span className={`text-2xl ${isDark ? 'text-gray-400' : 'text-gray-500'}`}>🎵</span>;
    if (mimeType === 'application/pdf') return <span className={`text-2xl ${isDark ? 'text-gray-400' : 'text-gray-500'}`}>📄</span>;
    return <span className={`text-2xl ${isDark ? 'text-gray-400' : 'text-gray-500'}`}>📎</span>;
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
    <div className={`border-t transition-colors duration-200 ${
      isDark 
        ? 'bg-gray-800 border-gray-700' 
        : 'bg-white border-gray-200'
    } ${isThread ? 'p-2' : 'p-4'}`}>
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
                  getFileIcon(attachment.type)
                )}
              </div>
              <button
                type="button"
                onClick={() => removeAttachment(attachment.id)}
                disabled={isUploading}
                className="absolute -top-1 -right-1 w-5 h-5 bg-red-500 hover:bg-red-600 rounded-full flex items-center justify-center text-white opacity-0 group-hover:opacity-100 transition-opacity shadow-md disabled:opacity-50"
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
          
          {/* Uploading indicator */}
          {isUploading && (
            <div className={`flex items-center justify-center w-20 h-20 rounded-lg border ${
              isDark 
                ? 'bg-gray-700 border-gray-600' 
                : 'bg-gray-100 border-gray-300'
            }`}>
              <Loader2 className={`w-6 h-6 animate-spin ${isDark ? 'text-claw-400' : 'text-claw-500'}`} />
            </div>
          )}
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

      {/* Formatting Toolbar - hidden in thread mode */}
      {!isThread && (
        <div className={`flex items-center gap-1 mb-2 px-2 py-1.5 rounded-lg ${
          isDark ? 'bg-gray-700/50' : 'bg-gray-100'
        }`}>
          <span className={`text-xs mr-2 ${isDark ? 'text-gray-500' : 'text-gray-400'}`}>Format:</span>
          <button
            type="button"
            onClick={insertBold}
            className={`p-1.5 rounded transition-colors ${
              isDark 
                ? 'text-gray-400 hover:text-white hover:bg-gray-600' 
                : 'text-gray-600 hover:text-gray-900 hover:bg-gray-200'
            }`}
            title="Bold"
          >
            <Bold className="w-4 h-4" />
          </button>
          <button
            type="button"
            onClick={insertItalic}
            className={`p-1.5 rounded transition-colors ${
              isDark 
                ? 'text-gray-400 hover:text-white hover:bg-gray-600' 
                : 'text-gray-600 hover:text-gray-900 hover:bg-gray-200'
            }`}
            title="Italic"
          >
            <Italic className="w-4 h-4" />
          </button>
          <button
            type="button"
            onClick={insertCode}
            className={`p-1.5 rounded transition-colors ${
              isDark 
                ? 'text-gray-400 hover:text-white hover:bg-gray-600' 
                : 'text-gray-600 hover:text-gray-900 hover:bg-gray-200'
            }`}
            title="Code"
          >
            <Code className="w-4 h-4" />
          </button>
          <button
            type="button"
            onClick={insertStrikethrough}
            className={`p-1.5 rounded transition-colors ${
              isDark 
                ? 'text-gray-400 hover:text-white hover:bg-gray-600' 
                : 'text-gray-600 hover:text-gray-900 hover:bg-gray-200'
            }`}
            title="Strikethrough"
          >
            <Strikethrough className="w-4 h-4" />
          </button>
          <div className={`w-px h-4 mx-2 ${isDark ? 'bg-gray-600' : 'bg-gray-300'}`} />
          <span className={`text-xs ${isDark ? 'text-gray-500' : 'text-gray-400'}`}>
            Select text or click to insert
          </span>
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
            placeholder={placeholder || "Type a message... (paste images directly)"}
            rows={1}
            className={`flex-1 bg-transparent resize-none focus:outline-none max-h-32 ${
              isDark 
                ? 'text-white placeholder-gray-500' 
                : 'text-gray-900 placeholder-gray-400'
            } ${isThread ? 'px-3 py-2' : 'px-4 py-3'}`}
            style={{ minHeight: isThread ? '36px' : '48px' }}
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
          disabled={(!message.trim() && !hasAttachments) || isUploading}
          className="px-4 bg-claw-600 hover:bg-claw-700 disabled:opacity-50 disabled:cursor-not-allowed rounded-lg transition-colors flex items-center justify-center"
        >
          {isUploading ? (
            <Loader2 className="w-5 h-5 text-white animate-spin" />
          ) : (
            <Send className="w-5 h-5 text-white" />
          )}
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
