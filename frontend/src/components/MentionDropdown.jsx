import React from 'react';
import { useTheme } from '../contexts/ThemeContext';

/**
 * Mention dropdown component for autocomplete
 */
export default function MentionDropdown({ 
  isOpen, 
  users, 
  selectedIndex, 
  onSelect, 
  position = {} 
}) {
  const { isDark } = useTheme();
  
  if (!isOpen || users.length === 0) return null;
  
  return (
    <div 
      className={`absolute z-50 rounded-lg shadow-xl border overflow-hidden min-w-[200px] ${
        isDark 
          ? 'bg-gray-800 border-gray-600' 
          : 'bg-white border-gray-300'
      }`}
      style={{
        bottom: position.bottom || '100%',
        left: position.left || 0,
        marginBottom: '8px'
      }}
    >
      <div className={`px-3 py-2 text-xs border-b ${
        isDark 
          ? 'text-gray-400 border-gray-700 bg-gray-800/50' 
          : 'text-gray-500 border-gray-200 bg-gray-50'
      }`}>
        Mention someone
      </div>
      
      {users.map((user, index) => (
        <button
          key={user.id}
          onClick={() => onSelect(user)}
          className={`w-full px-3 py-2 flex items-center gap-2 text-left transition-colors ${
            index === selectedIndex 
              ? isDark 
                ? 'bg-claw-600/30 text-claw-300' 
                : 'bg-claw-50 text-claw-700'
              : isDark 
                ? 'text-gray-300 hover:bg-gray-700' 
                : 'text-gray-700 hover:bg-gray-100'
          }`}
        >
          <div className={`w-6 h-6 rounded-full flex items-center justify-center text-xs ${
            user.type === 'agent' 
              ? 'bg-gradient-to-br from-purple-500 to-indigo-600' 
              : 'bg-claw-600'
          }`}>
            {user.username.charAt(0).toUpperCase()}
          </div>
          <span className="flex-1 truncate">{user.username}</span>
          {user.type === 'agent' && (
            <span className={`text-xs px-1.5 py-0.5 rounded ${
              isDark 
                ? 'bg-purple-500/20 text-purple-400' 
                : 'bg-purple-100 text-purple-600'
            }`}>
              bot
            </span>
          )}
        </button>
      ))}
      
      <div className={`px-3 py-1.5 text-xs border-t ${
        isDark 
          ? 'text-gray-500 border-gray-700 bg-gray-800/50' 
          : 'text-gray-400 border-gray-200 bg-gray-50'
      }`}>
        ↑↓ to navigate • Enter to select
      </div>
    </div>
  );
}
