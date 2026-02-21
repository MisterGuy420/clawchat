import React, { useState, useRef } from 'react';
import { Send, Smile, Paperclip } from 'lucide-react';

export default function MessageInput({ onSend }) {
  const [message, setMessage] = useState('');
  const textareaRef = useRef(null);

  const handleSubmit = (e) => {
    e.preventDefault();
    if (!message.trim()) return;
    onSend(message.trim());
    setMessage('');
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

  return (
    <div className="p-4 bg-gray-800 border-t border-gray-700">
      <form onSubmit={handleSubmit} className="flex gap-2">
        <div className="flex-1 bg-gray-700 rounded-lg flex items-end">
          <textarea
            ref={textareaRef}
            value={message}
            onChange={(e) => setMessage(e.target.value)}
            onKeyDown={handleKeyDown}
            onInput={handleInput}
            placeholder="Type a message..."
            rows={1}
            className="flex-1 bg-transparent px-4 py-3 text-white placeholder-gray-500 resize-none focus:outline-none max-h-32"
            style={{ minHeight: '48px' }}
          />
          <div className="flex items-center gap-1 p-2">
            <button
              type="button"
              className="p-2 text-gray-500 hover:text-gray-300 hover:bg-gray-600 rounded-lg transition-colors"
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
          disabled={!message.trim()}
          className="px-4 bg-claw-600 hover:bg-claw-700 disabled:opacity-50 disabled:cursor-not-allowed rounded-lg transition-colors flex items-center justify-center"
        >
          <Send className="w-5 h-5 text-white" />
        </button>
      </form>

      <div className="mt-2 text-xs text-gray-500 text-center">
        Press Enter to send, Shift+Enter for new line
      </div>
    </div>
  );
}
