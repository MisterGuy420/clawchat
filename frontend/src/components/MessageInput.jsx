import React, { useState, useRef, useCallback } from 'react';
import { Send, Smile, Paperclip, X, Image as ImageIcon } from 'lucide-react';
import { useWebSocket } from '../contexts/WebSocketContext';
import { useClipboard } from '../hooks/useClipboard';

export default function MessageInput({ onSend, channelId }) {
  const [message, setMessage] = useState('');
  const textareaRef = useRef(null);
  const { sendTyping } = useWebSocket();
  const typingTimeoutRef = useRef(null);
  const { attachments, handlePaste, removeAttachment, clearAttachments, hasAttachments } = useClipboard();
  const fileInputRef = useRef(null);

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
    
    // Clear typing indicator immediately on send
    if (typingTimeoutRef.current) {
      clearTimeout(typingTimeoutRef.current);
    }
    sendTyping(channelId, false);
    
    // TODO: Send attachments with message (for now just send message)
    // In a full implementation, you'd upload attachments first, then send
    // message with attachment URLs
    
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
    setMessage(e.target.value);
    handleTyping();
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

  return (
    <div className="p-4 bg-gray-800 border-t border-gray-700">
      {/* Attachments preview */}
      {hasAttachments && (
        <div className="mb-3 flex flex-wrap gap-2">
          {attachments.map((attachment) => (
            <div
              key={attachment.id}
              className="relative group bg-gray-700 rounded-lg overflow-hidden border border-gray-600"
            >
              <div className="w-20 h-20 flex items-center justify-center">
                {attachment.previewUrl ? (
                  <img
                    src={attachment.previewUrl}
                    alt="Attachment preview"
                    className="w-full h-full object-cover"
                  />
                ) : (
                  <ImageIcon className="w-8 h-8 text-gray-500" />
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
              <div className="absolute bottom-0 left-0 right-0 bg-gray-900/80 px-1 py-0.5">
                <span className="text-[10px] text-gray-300 truncate block">
                  {formatFileSize(attachment.size)}
                </span>
              </div>
            </div>
          ))}
        </div>
      )}

      <form onSubmit={handleSubmit} className="flex gap-2">
        <div className="flex-1 bg-gray-700 rounded-lg flex items-end">
          <textarea
            ref={textareaRef}
            value={message}
            onChange={handleChange}
            onKeyDown={handleKeyDown}
            onInput={handleInput}
            onPaste={handlePaste}
            placeholder="Type a message... (paste images directly)"
            rows={1}
            className="flex-1 bg-transparent px-4 py-3 text-white placeholder-gray-500 resize-none focus:outline-none max-h-32"
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
              onClick={() => fileInputRef.current?.click()}
              className="p-2 text-gray-500 hover:text-gray-300 hover:bg-gray-600 rounded-lg transition-colors"
              title="Attach file"
            >
              <Paperclip className="w-5 h-5" />
            </button>
            <button
              type="button"
              className="p-2 text-gray-500 hover:text-gray-300 hover:bg-gray-600 rounded-lg transition-colors"
            >
              <Smile className="w-5 h-5" />
            </button>
          </div>
        </div>

        <button
          type="submit"
          disabled={!message.trim() && !hasAttachments}
          className="px-4 bg-claw-600 hover:bg-claw-700 disabled:opacity-50 disabled:cursor-not-allowed rounded-lg transition-colors flex items-center justify-center"
        >
          <Send className="w-5 h-5 text-white" />
        </button>
      </form>

      <div className="mt-2 text-xs text-gray-500 text-center">
        Press Enter to send, Shift+Enter for new line • Paste images directly from clipboard
      </div>
    </div>
  );
}
