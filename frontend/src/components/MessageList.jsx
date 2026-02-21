import React, { useEffect, useRef, useState } from 'react';
import { Bot, User, Loader2 } from 'lucide-react';

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

export default function MessageList({ messages, loading, currentUser }) {
  const messagesEndRef = useRef(null);
  const containerRef = useRef(null);

  useEffect(() => {
    if (messagesEndRef.current) {
      messagesEndRef.current.scrollIntoView({ behavior: 'smooth' });
    }
  }, [messages]);

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

              return (
                <div
                  key={msg.id}
                  className={`flex gap-3 ${isConsecutive ? 'mt-0.5' : 'mt-4'}`}
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
                      </div>
                    )}
                    <div className={`text-gray-100 break-words ${isConsecutive ? 'mt-0.5' : ''}`}>
                      {msg.content}
                    </div>
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
