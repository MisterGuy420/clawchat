import React, { useState, useEffect, useCallback } from 'react';
import { X, Command, CornerDownLeft, ArrowUp, ArrowDown, Slash, Smile, Edit3, Trash2, Search, AtSign } from 'lucide-react';
import { useTheme } from '../contexts/ThemeContext';

const SHORTCUTS = [
  { keys: ['Ctrl', 'K'], description: 'Focus message input', icon: CornerDownLeft },
  { keys: ['Ctrl', 'F'], description: 'Search messages', icon: Search },
  { keys: ['Alt', '↑/↓'], description: 'Navigate channels', icon: ArrowUp },
  { keys: ['Ctrl', '/'], description: 'Show this help', icon: Slash },
  { keys: ['Esc'], description: 'Close picker / Cancel edit or reply', icon: X },
  { keys: ['Ctrl', 'E'], description: 'Open emoji picker', icon: Smile },
  { keys: ['↑'], description: 'Edit last message (when input empty)', icon: Edit3 },
  { keys: ['@'], description: 'Mention someone in message', icon: AtSign },
  { keys: ['Click'], description: 'Reply to a message (hover & click reply)', icon: CornerDownLeft },
];

export function useKeyboardShortcuts({
  onFocusInput,
  onChannelNavigate,
  onShowHelp,
  onClosePicker,
  onToggleEmoji,
  onEditLastMessage,
  onSearch,
  isEmojiOpen,
  isEditing,
  channelCount,
  currentChannelIndex
}) {
  useEffect(() => {
    const handleKeyDown = (e) => {
      const isMac = navigator.platform.toUpperCase().indexOf('MAC') >= 0;
      const ctrlKey = isMac ? e.metaKey : e.ctrlKey;

      // Ctrl/Cmd + K - Focus input
      if (ctrlKey && e.key === 'k') {
        e.preventDefault();
        onFocusInput?.();
        return;
      }

      // Ctrl/Cmd + F - Search messages
      if (ctrlKey && e.key === 'f') {
        e.preventDefault();
        onSearch?.();
        return;
      }

      // Ctrl/Cmd + / - Show help
      if (ctrlKey && e.key === '/') {
        e.preventDefault();
        onShowHelp?.();
        return;
      }

      // Ctrl/Cmd + E - Toggle emoji picker
      if (ctrlKey && e.key === 'e') {
        e.preventDefault();
        onToggleEmoji?.();
        return;
      }

      // Alt + Up/Down - Navigate channels
      if (e.altKey && (e.key === 'ArrowUp' || e.key === 'ArrowDown')) {
        e.preventDefault();
        const direction = e.key === 'ArrowUp' ? -1 : 1;
        const newIndex = currentChannelIndex + direction;
        if (newIndex >= 0 && newIndex < channelCount) {
          onChannelNavigate?.(newIndex);
        }
        return;
      }

      // Escape - Close picker or cancel edit
      if (e.key === 'Escape') {
        if (isEmojiOpen) {
          e.preventDefault();
          onClosePicker?.();
        } else if (isEditing) {
          e.preventDefault();
          onClosePicker?.(); // This will cancel edit
        }
        return;
      }
    };

    window.addEventListener('keydown', handleKeyDown);
    return () => window.removeEventListener('keydown', handleKeyDown);
  }, [onFocusInput, onChannelNavigate, onShowHelp, onClosePicker, onToggleEmoji, onEditLastMessage, onSearch, isEmojiOpen, isEditing, channelCount, currentChannelIndex]);
}

export function KeyboardShortcutsHelp({ isOpen, onClose }) {
  const [isMac, setIsMac] = useState(false);
  const { isDark } = useTheme();

  useEffect(() => {
    setIsMac(navigator.platform.toUpperCase().indexOf('MAC') >= 0);
  }, []);

  useEffect(() => {
    const handleKeyDown = (e) => {
      if (e.key === 'Escape') {
        onClose();
      }
    };

    if (isOpen) {
      window.addEventListener('keydown', handleKeyDown);
      return () => window.removeEventListener('keydown', handleKeyDown);
    }
  }, [isOpen, onClose]);

  if (!isOpen) return null;

  const formatKey = (key) => {
    if (key === 'Ctrl') return isMac ? '⌘' : 'Ctrl';
    if (key === 'Alt') return isMac ? '⌥' : 'Alt';
    return key;
  };

  return (
    <div className="fixed inset-0 bg-black/50 flex items-center justify-center z-50 p-4">
      <div className={`rounded-xl shadow-2xl w-full max-w-md animate-slideIn ${
        isDark ? 'bg-gray-800' : 'bg-white'
      }`}>
        {/* Header */}
        <div className={`flex items-center justify-between p-4 border-b ${
          isDark ? 'border-gray-700' : 'border-gray-200'
        }`}>
          <div className="flex items-center gap-2">
            <Command className="w-5 h-5 text-claw-500" />
            <h2 className={`text-lg font-bold ${isDark ? 'text-white' : 'text-gray-900'}`}>Keyboard Shortcuts</h2>
          </div>
          <button
            onClick={onClose}
            className={`p-1 rounded-lg transition-colors ${
              isDark ? 'hover:bg-gray-700' : 'hover:bg-gray-100'
            }`}
          >
            <X className={`w-5 h-5 ${isDark ? 'text-gray-400' : 'text-gray-500'}`} />
          </button>
        </div>

        {/* Shortcuts list */}
        <div className="p-4 space-y-3">
          {SHORTCUTS.map((shortcut, idx) => (
            <div
              key={idx}
              className={`flex items-center justify-between py-2 px-3 rounded-lg transition-colors ${
                isDark 
                  ? 'bg-gray-700/50 hover:bg-gray-700' 
                  : 'bg-gray-50 hover:bg-gray-100'
              }`}
            >
              <div className="flex items-center gap-3">
                <shortcut.icon className={`w-4 h-4 ${isDark ? 'text-gray-500' : 'text-gray-400'}`} />
                <span className={`text-sm ${isDark ? 'text-gray-200' : 'text-gray-700'}`}>{shortcut.description}</span>
              </div>
              <div className="flex items-center gap-1">
                {shortcut.keys.map((key, keyIdx) => (
                  <React.Fragment key={keyIdx}>
                    <kbd className={`px-2 py-1 border rounded text-xs font-mono min-w-[24px] text-center ${
                      isDark 
                        ? 'bg-gray-800 border-gray-600 text-gray-300' 
                        : 'bg-white border-gray-300 text-gray-700'
                    }`}>
                      {formatKey(key)}
                    </kbd>
                    {keyIdx < shortcut.keys.length - 1 && (
                      <span className={`mx-0.5 ${isDark ? 'text-gray-500' : 'text-gray-400'}`}>+</span>
                    )}
                  </React.Fragment>
                ))}
              </div>
            </div>
          ))}
        </div>

        {/* Footer */}
        <div className={`px-4 py-3 border-t rounded-b-xl ${
          isDark 
            ? 'bg-gray-900/50 border-gray-700' 
            : 'bg-gray-50 border-gray-200'
        }`}>
          <p className={`text-xs text-center ${isDark ? 'text-gray-500' : 'text-gray-400'}`}>
            Press <kbd className={`px-1.5 py-0.5 border rounded text-xs font-mono ${
              isDark 
                ? 'bg-gray-800 border-gray-600' 
                : 'bg-white border-gray-300'
            }`}>Esc</kbd> to close
          </p>
        </div>
      </div>
    </div>
  );
}

export default KeyboardShortcutsHelp;
