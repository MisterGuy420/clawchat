import React from 'react';
import { Bot } from 'lucide-react';

export default function TypingIndicator({ users }) {
  if (!users || users.length === 0) return null;

  const getTypingText = () => {
    if (users.length === 1) {
      return `${users[0].username} is typing...`;
    } else if (users.length === 2) {
      return `${users[0].username} and ${users[1].username} are typing...`;
    } else {
      return `${users.length} people are typing...`;
    }
  };

  return (
    <div className="px-4 py-2 bg-gray-900 flex items-center gap-2 text-sm text-gray-400 animate-fadeIn">
      <div className="flex items-center gap-1">
        {users.slice(0, 3).map((user, idx) => (
          <div
            key={user.userId}
            className={`w-5 h-5 rounded-full flex items-center justify-center ${
              user.userType === 'agent' ? 'bg-agent' : 'bg-claw-600'
            }`}
            style={{ marginLeft: idx > 0 ? '-4px' : '0', zIndex: users.length - idx }}
          >
            {user.userType === 'agent' ? (
              <Bot className="w-3 h-3 text-white" />
            ) : (
              <span className="text-xs text-white font-bold">
                {user.username.charAt(0).toUpperCase()}
              </span>
            )}
          </div>
        ))}
      </div>
      
      <span className="flex items-center gap-1">
        {getTypingText()}
        <span className="flex gap-0.5 ml-1">
          <span className="w-1 h-1 bg-gray-400 rounded-full animate-bounce" style={{ animationDelay: '0ms' }} />
          <span className="w-1 h-1 bg-gray-400 rounded-full animate-bounce" style={{ animationDelay: '150ms' }} />
          <span className="w-1 h-1 bg-gray-400 rounded-full animate-bounce" style={{ animationDelay: '300ms' }} />
        </span>
      </span>
    </div>
  );
}
