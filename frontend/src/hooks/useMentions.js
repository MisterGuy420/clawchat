import { useState, useCallback, useRef, useEffect } from 'react';

/**
 * Hook for handling @mentions in message input
 * Provides autocomplete suggestions when typing @username
 */
export function useMentions(users = []) {
  const [mentionState, setMentionState] = useState({
    isOpen: false,
    query: '',
    filteredUsers: [],
    selectedIndex: 0,
    startPosition: null
  });
  
  const inputRef = useRef(null);

  // Filter users based on mention query
  const filterUsers = useCallback((query) => {
    if (!query) return users.slice(0, 5);
    const lowerQuery = query.toLowerCase();
    return users
      .filter(u => u.username.toLowerCase().includes(lowerQuery))
      .slice(0, 5);
  }, [users]);

  // Handle input change and detect @mentions
  const handleInputChange = useCallback((value, cursorPosition) => {
    // Find the last @ before cursor
    const textBeforeCursor = value.slice(0, cursorPosition);
    const lastAtIndex = textBeforeCursor.lastIndexOf('@');
    
    if (lastAtIndex !== -1) {
      const textAfterAt = textBeforeCursor.slice(lastAtIndex + 1);
      const hasSpaceAfterAt = textAfterAt.includes(' ');
      
      // If no space after @, we're in a mention
      if (!hasSpaceAfterAt && lastAtIndex < cursorPosition) {
        const query = textAfterAt;
        const filtered = filterUsers(query);
        
        setMentionState({
          isOpen: filtered.length > 0,
          query,
          filteredUsers: filtered,
          selectedIndex: 0,
          startPosition: lastAtIndex
        });
        return;
      }
    }
    
    // Close mention dropdown if no @ detected
    setMentionState(prev => ({ ...prev, isOpen: false }));
  }, [filterUsers]);

  // Select a user from the dropdown
  const selectMention = useCallback((user, currentValue) => {
    if (!mentionState.startPosition !== null) return currentValue;
    
    const beforeMention = currentValue.slice(0, mentionState.startPosition);
    const afterCursor = currentValue.slice(mentionState.startPosition + mentionState.query.length + 1);
    
    // Insert mention with @ symbol and a space after
    const newValue = `${beforeMention}@${user.username} ${afterCursor}`;
    
    setMentionState(prev => ({ ...prev, isOpen: false }));
    
    return newValue;
  }, [mentionState]);

  // Handle keyboard navigation in mention dropdown
  const handleKeyDown = useCallback((e, currentValue, onSelect) => {
    if (!mentionState.isOpen) return false;
    
    switch (e.key) {
      case 'ArrowDown':
        e.preventDefault();
        setMentionState(prev => ({
          ...prev,
          selectedIndex: (prev.selectedIndex + 1) % prev.filteredUsers.length
        }));
        return true;
        
      case 'ArrowUp':
        e.preventDefault();
        setMentionState(prev => ({
          ...prev,
          selectedIndex: (prev.selectedIndex - 1 + prev.filteredUsers.length) % prev.filteredUsers.length
        }));
        return true;
        
      case 'Enter':
      case 'Tab':
        e.preventDefault();
        const selectedUser = mentionState.filteredUsers[mentionState.selectedIndex];
        if (selectedUser) {
          const newValue = selectMention(selectedUser, currentValue);
          onSelect(newValue);
          
          // Set cursor position after the mention
          setTimeout(() => {
            if (inputRef.current) {
              const newCursorPos = newValue.indexOf(`@${selectedUser.username} `) + selectedUser.username.length + 2;
              inputRef.current.setSelectionRange(newCursorPos, newCursorPos);
            }
          }, 0);
        }
        return true;
        
      case 'Escape':
        setMentionState(prev => ({ ...prev, isOpen: false }));
        return true;
        
      default:
        return false;
    }
  }, [mentionState, selectMention]);

  // Close mention dropdown
  const closeMentions = useCallback(() => {
    setMentionState(prev => ({ ...prev, isOpen: false }));
  }, []);

  return {
    mentionState,
    handleInputChange,
    handleKeyDown,
    selectMention,
    closeMentions,
    inputRef
  };
}

/**
 * Parse mentions from message content
 * Returns array of mentioned usernames (without @)
 */
export function parseMentions(content) {
  if (!content) return [];
  const mentionRegex = /@(\w+)/g;
  const mentions = [];
  let match;
  
  while ((match = mentionRegex.exec(content)) !== null) {
    mentions.push(match[1]);
  }
  
  return [...new Set(mentions)]; // Remove duplicates
}

/**
 * Highlight mentions in message text
 * Returns array of React elements for rendering
 */
export function highlightMentions(text, currentUsername, isDark = true) {
  if (!text) return [];
  
  const mentionRegex = /@(\w+)/g;
  const parts = [];
  let lastIndex = 0;
  let match;
  
  while ((match = mentionRegex.exec(text)) !== null) {
    // Add text before mention
    if (match.index > lastIndex) {
      parts.push({
        type: 'text',
        content: text.slice(lastIndex, match.index)
      });
    }
    
    // Add mention
    const mentionedUser = match[1];
    const isCurrentUser = mentionedUser.toLowerCase() === currentUsername?.toLowerCase();
    
    parts.push({
      type: 'mention',
      content: match[0],
      username: mentionedUser,
      isCurrentUser
    });
    
    lastIndex = match.index + match[0].length;
  }
  
  // Add remaining text
  if (lastIndex < text.length) {
    parts.push({
      type: 'text',
      content: text.slice(lastIndex)
    });
  }
  
  return parts;
}

export default useMentions;
