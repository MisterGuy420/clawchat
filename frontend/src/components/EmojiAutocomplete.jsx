import React from 'react';
import { useTheme } from '../contexts/ThemeContext';

/**
 * Emoji autocomplete dropdown component
 * Shows emoji suggestions when typing :emoji_name:
 */
export default function EmojiAutocomplete({
  isOpen,
  emojis,
  selectedIndex,
  onSelect,
  position = {}
}) {
  const { isDark } = useTheme();
  
  if (!isOpen || emojis.length === 0) return null;
  
  return (
    <div
      className={`absolute z-50 rounded-lg shadow-xl border overflow-hidden min-w-[220px] max-w-[280px] ${
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
        Emoji matching
      </div>
      
      {emojis.map((item, index) => (
        <button
          key={`${item.name}-${index}`}
          onClick={() => onSelect(item)}
          className={`w-full px-3 py-2 flex items-center gap-3 text-left transition-colors ${
            index === selectedIndex
              ? isDark
                ? 'bg-claw-600/30 text-claw-300'
                : 'bg-claw-50 text-claw-700'
              : isDark
                ? 'text-gray-300 hover:bg-gray-700'
                : 'text-gray-700 hover:bg-gray-100'
          }`}
        >
          <span className="text-2xl" role="img" aria-label={item.name}>
            {item.emoji}
          </span>
          <div className="flex-1 min-w-0">
            <span className="block text-sm font-medium truncate">
              :{item.name}:
            </span>
            {item.aliases && item.aliases.length > 0 && (
              <span className={`block text-xs truncate ${
                isDark ? 'text-gray-500' : 'text-gray-400'
              }`}>
                {item.aliases.slice(0, 3).join(', ')}
              </span>
            )}
          </div>
        </button>
      ))}
      
      <div className={`px-3 py-1.5 text-xs border-t ${
        isDark
          ? 'text-gray-500 border-gray-700 bg-gray-800/50'
          : 'text-gray-400 border-gray-200 bg-gray-50'
      }`}>
        ↑↓ to navigate • Enter to select • Esc to close
      </div>
    </div>
  );
}
