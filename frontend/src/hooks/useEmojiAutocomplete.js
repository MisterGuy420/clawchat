import { useState, useCallback, useRef, useEffect } from 'react';

/**
 * Hook for handling emoji autocomplete in message input
 * Provides autocomplete suggestions when typing :emoji_name:
 */

// Common emojis with names for autocomplete
const EMOJI_LIST = [
  { emoji: '👍', name: 'thumbsup', aliases: ['+1', 'like'] },
  { emoji: '👎', name: 'thumbsdown', aliases: ['-1', 'dislike'] },
  { emoji: '❤️', name: 'heart', aliases: ['love', '<3'] },
  { emoji: '😂', name: 'joy', aliases: ['laugh', 'lol', 'haha'] },
  { emoji: '🎉', name: 'tada', aliases: ['party', 'celebrate'] },
  { emoji: '😮', name: 'open_mouth', aliases: ['wow', 'surprised'] },
  { emoji: '👏', name: 'clap', aliases: ['applause'] },
  { emoji: '🔥', name: 'fire', aliases: ['hot', 'lit'] },
  { emoji: '😢', name: 'cry', aliases: ['sad', 'tear'] },
  { emoji: '🤔', name: 'thinking', aliases: ['think', 'hmm'] },
  { emoji: '😊', name: 'smile', aliases: ['happy'] },
  { emoji: '😎', name: 'sunglasses', aliases: ['cool'] },
  { emoji: '🙏', name: 'pray', aliases: ['please', 'thanks'] },
  { emoji: '👋', name: 'wave', aliases: ['hello', 'bye'] },
  { emoji: '🚀', name: 'rocket', aliases: ['launch', 'fast'] },
  { emoji: '💯', name: '100', aliases: ['hundred', 'perfect'] },
  { emoji: '✅', name: 'white_check_mark', aliases: ['check', 'done'] },
  { emoji: '❌', name: 'x', aliases: ['no', 'wrong'] },
  { emoji: '⚠️', name: 'warning', aliases: ['alert'] },
  { emoji: '💡', name: 'bulb', aliases: ['idea', 'light'] },
  { emoji: '📌', name: 'pushpin', aliases: ['pin'] },
  { emoji: '🔗', name: 'link', aliases: ['url', 'chain'] },
  { emoji: '📝', name: 'memo', aliases: ['note', 'pencil'] },
  { emoji: '✨', name: 'sparkles', aliases: ['magic', 'shiny'] },
  { emoji: '🐛', name: 'bug', aliases: ['error', 'issue'] },
  { emoji: '🔧', name: 'wrench', aliases: ['fix', 'tool'] },
  { emoji: '📊', name: 'chart', aliases: ['stats', 'graph'] },
  { emoji: '🎯', name: 'dart', aliases: ['target', 'goal'] },
  { emoji: '🏆', name: 'trophy', aliases: ['win', 'award'] },
  { emoji: '⭐', name: 'star', aliases: ['favorite'] },
  { emoji: '👀', name: 'eyes', aliases: ['look', 'watch'] },
  { emoji: '🤖', name: 'robot', aliases: ['bot', 'ai'] },
  { emoji: '💻', name: 'computer', aliases: ['pc', 'laptop'] },
  { emoji: '📱', name: 'iphone', aliases: ['phone', 'mobile'] },
  { emoji: '☕', name: 'coffee', aliases: ['cafe'] },
  { emoji: '🍕', name: 'pizza', aliases: ['food'] },
  { emoji: '🎵', name: 'musical_note', aliases: ['music', 'song'] },
  { emoji: '🎮', name: 'video_game', aliases: ['game', 'play'] },
  { emoji: '🌍', name: 'earth_africa', aliases: ['world', 'global'] },
  { emoji: '⏰', name: 'alarm_clock', aliases: ['time', 'clock'] },
  { emoji: '📅', name: 'date', aliases: ['calendar'] },
  { emoji: '📎', name: 'paperclip', aliases: ['attachment'] },
  { emoji: '🔒', name: 'lock', aliases: ['secure', 'private'] },
  { emoji: '🔓', name: 'unlock', aliases: ['open'] },
  { emoji: '🆘', name: 'sos', aliases: ['help', 'emergency'] },
  { emoji: '✋', name: 'raised_hand', aliases: ['stop', 'wait'] },
  { emoji: '🎁', name: 'gift', aliases: ['present'] },
  { emoji: '🎄', name: 'christmas_tree', aliases: ['xmas'] },
  { emoji: '🎃', name: 'jack_o_lantern', aliases: ['halloween', 'pumpkin'] },
  { emoji: '🌈', name: 'rainbow', aliases: ['colors'] },
  { emoji: '🌙', name: 'crescent_moon', aliases: ['night'] },
  { emoji: '☀️', name: 'sunny', aliases: ['sun', 'day'] },
  { emoji: '⚡', name: 'zap', aliases: ['lightning', 'electric'] },
  { emoji: '💧', name: 'droplet', aliases: ['water', 'drop'] },
  { emoji: '🌊', name: 'ocean', aliases: ['wave'] },
  { emoji: '🔴', name: 'red_circle', aliases: ['circle', 'red'] },
  { emoji: '🟢', name: 'green_circle', aliases: ['green'] },
  { emoji: '🔵', name: 'blue_circle', aliases: ['blue'] },
  { emoji: '⚪', name: 'white_circle', aliases: ['white'] },
  { emoji: '⚫', name: 'black_circle', aliases: ['black'] },
];

// Create a lookup map for faster searching
const EMOJI_MAP = new Map();
EMOJI_LIST.forEach(item => {
  EMOJI_MAP.set(item.name, item);
  item.aliases?.forEach(alias => {
    if (!EMOJI_MAP.has(alias)) {
      EMOJI_MAP.set(alias, item);
    }
  });
});

export function useEmojiAutocomplete() {
  const [state, setState] = useState({
    isOpen: false,
    query: '',
    filteredEmojis: [],
    selectedIndex: 0,
    startPosition: null
  });
  
  const inputRef = useRef(null);

  // Filter emojis based on query
  const filterEmojis = useCallback((query) => {
    if (!query) return EMOJI_LIST.slice(0, 8);
    const lowerQuery = query.toLowerCase();
    
    const results = [];
    const seen = new Set();
    
    // Search in names first (exact match priority)
    EMOJI_LIST.forEach(item => {
      if (item.name.startsWith(lowerQuery) && !seen.has(item.emoji)) {
        results.push(item);
        seen.add(item.emoji);
      }
    });
    
    // Then search in names (includes)
    EMOJI_LIST.forEach(item => {
      if (item.name.includes(lowerQuery) && !seen.has(item.emoji)) {
        results.push(item);
        seen.add(item.emoji);
      }
    });
    
    // Then search in aliases
    EMOJI_LIST.forEach(item => {
      if (item.aliases?.some(alias => alias.includes(lowerQuery)) && !seen.has(item.emoji)) {
        results.push(item);
        seen.add(item.emoji);
      }
    });
    
    return results.slice(0, 8);
  }, []);

  // Handle input change and detect :emoji: pattern
  const handleInputChange = useCallback((value, cursorPosition) => {
    // Find the last : before cursor
    const textBeforeCursor = value.slice(0, cursorPosition);
    const lastColonIndex = textBeforeCursor.lastIndexOf(':');
    
    if (lastColonIndex !== -1) {
      const textAfterColon = textBeforeCursor.slice(lastColonIndex + 1);
      
      // Check if there's a space or another : after the colon (would close the emoji)
      const hasClosingChar = textAfterColon.includes(' ') || textAfterColon.includes(':');
      
      // If no space/another colon and we're within reasonable emoji name length
      if (!hasClosingChar && lastColonIndex < cursorPosition && textAfterColon.length <= 32) {
        // Don't trigger on just ':' (need at least 1 char) unless it's a common start
        if (textAfterColon.length >= 1) {
          const filtered = filterEmojis(textAfterColon);
          
          if (filtered.length > 0) {
            setState({
              isOpen: true,
              query: textAfterColon,
              filteredEmojis: filtered,
              selectedIndex: 0,
              startPosition: lastColonIndex
            });
            return;
          }
        }
      }
    }
    
    // Close dropdown if no :emoji: detected
    setState(prev => ({ ...prev, isOpen: false }));
  }, [filterEmojis]);

  // Select an emoji from the dropdown
  const selectEmoji = useCallback((emojiItem, currentValue) => {
    if (state.startPosition === null) return currentValue;
    
    const beforeEmoji = currentValue.slice(0, state.startPosition);
    const afterCursor = currentValue.slice(state.startPosition + state.query.length + 1);
    
    // Insert emoji (replace :query with the actual emoji)
    const newValue = `${beforeEmoji}${emojiItem.emoji} ${afterCursor}`;
    
    setState(prev => ({ ...prev, isOpen: false }));
    
    return newValue;
  }, [state]);

  // Handle keyboard navigation in emoji dropdown
  const handleKeyDown = useCallback((e, currentValue, onSelect) => {
    if (!state.isOpen) return false;
    
    switch (e.key) {
      case 'ArrowDown':
        e.preventDefault();
        setState(prev => ({
          ...prev,
          selectedIndex: (prev.selectedIndex + 1) % prev.filteredEmojis.length
        }));
        return true;
        
      case 'ArrowUp':
        e.preventDefault();
        setState(prev => ({
          ...prev,
          selectedIndex: (prev.selectedIndex - 1 + prev.filteredEmojis.length) % prev.filteredEmojis.length
        }));
        return true;
        
      case 'Enter':
      case 'Tab':
        e.preventDefault();
        const selectedEmoji = state.filteredEmojis[state.selectedIndex];
        if (selectedEmoji) {
          const newValue = selectEmoji(selectedEmoji, currentValue);
          onSelect(newValue);
          
          // Set cursor position after the emoji
          setTimeout(() => {
            if (inputRef.current) {
              const emojiIndex = newValue.indexOf(selectedEmoji.emoji);
              if (emojiIndex !== -1) {
                const newCursorPos = emojiIndex + selectedEmoji.emoji.length + 1;
                inputRef.current.setSelectionRange(newCursorPos, newCursorPos);
              }
            }
          }, 0);
        }
        return true;
        
      case 'Escape':
        setState(prev => ({ ...prev, isOpen: false }));
        return true;
        
      default:
        return false;
    }
  }, [state, selectEmoji]);

  // Close emoji dropdown
  const closeEmojiAutocomplete = useCallback(() => {
    setState(prev => ({ ...prev, isOpen: false }));
  }, []);

  return {
    emojiState: state,
    handleEmojiInputChange: handleInputChange,
    handleEmojiKeyDown: handleKeyDown,
    selectEmoji,
    closeEmojiAutocomplete,
    emojiInputRef: inputRef
  };
}

export default useEmojiAutocomplete;
