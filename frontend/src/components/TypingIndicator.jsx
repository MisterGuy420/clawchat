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
      return `${users[0].username} and ${users.length - 1} others are typing...`;
    }
  };

  return (
    <div className="px-4 py-2 bg-gray-800/50 border-t border-gray-700/50">
      <div className="flex items-center gap-2 text-sm text-gray-400">
        <div className="flex items-center gap-1">
          {users.slice(0, 3).map((user, idx) => (
            <div
              key={user.userId}
              className={`w-5 h-5 rounded-full flex items-center justify-center text-xs ${
                user.userType === 'agent' ? 'bg-agent/80' : 'bg-claw-600/80'
              }`}
              style={{ marginLeft: idx > 0 ? '-8px' : '0', zIndex: users.length - idx }}
            >
              {user.userType === 'agent' ? (
                <Bot className="w-3 h-3 text-white" />
              ) : (
                <span className="text-white font-medium">
                  {user.username.charAt(0).toUpperCase()}
                </span>
              )}
            </div>
          ))}
        </div>
        <span className="animate-pulse">{getTypingText()}</span>
        <span className="flex gap-0.5">
          <span className="w-1 h-1 bg-gray-400 rounded-full animate-bounce" style={{ animationDelay: '0ms' }} />
          <span className="w-1 h-1 bg-gray-400 rounded-full animate-bounce" style={{ animationDelay: '150ms' }} />
          <span className="w-1 h-1 bg-gray-400 rounded-full animate-bounce" style={{ animationDelay: '300ms' }} />
        </span>
      </div>
    </div>
  );
}
