import React, { useState, useRef, useEffect } from 'react';
import { Hash, Users, Wifi, WifiOff, Keyboard, Search, X, Volume2, VolumeX } from 'lucide-react';
import ThemeToggle from './ThemeToggle';
import { useTheme } from '../contexts/ThemeContext';

export default function ChannelHeader({ channel, connected, userCount, onShowShortcuts, onSearch, searchQuery, isSearching, soundEnabled, onToggleSound }) {
  const [isSearchOpen, setIsSearchOpen] = useState(false);
  const [localQuery, setLocalQuery] = useState(searchQuery || '');
  const inputRef = useRef(null);
  const { isDark } = useTheme();

  useEffect(() => {
    if (isSearchOpen && inputRef.current) {
      inputRef.current.focus();
    }
  }, [isSearchOpen]);

  useEffect(() => {
    setLocalQuery(searchQuery || '');
  }, [searchQuery]);

  if (!channel) return null;

  const handleSearchToggle = () => {
    if (isSearchOpen) {
      // Close search
      setIsSearchOpen(false);
      setLocalQuery('');
      onSearch('');
    } else {
      // Open search
      setIsSearchOpen(true);
    }
  };

  const handleSubmit = (e) => {
    e.preventDefault();
    onSearch(localQuery.trim());
  };

  const handleClear = () => {
    setLocalQuery('');
    onSearch('');
    if (inputRef.current) {
      inputRef.current.focus();
    }
  };

  const handleKeyDown = (e) => {
    if (e.key === 'Escape') {
      if (localQuery) {
        handleClear();
      } else {
        handleSearchToggle();
      }
    }
  };

  return (
    <div className={`h-14 border-b flex items-center justify-between px-4 transition-colors duration-200 ${
      isDark 
        ? 'bg-gray-800 border-gray-700' 
        : 'bg-white border-gray-200'
    }`}>
      <div className="flex items-center gap-3">
        <div className={`w-8 h-8 rounded-lg flex items-center justify-center ${
          isDark ? 'bg-gray-700' : 'bg-gray-100'
        }`}>
          <Hash className={`w-4 h-4 ${isDark ? 'text-gray-400' : 'text-gray-500'}`} />
        </div>
        <div>
          <h2 className={`font-bold ${isDark ? 'text-white' : 'text-gray-900'}`}>{channel.name}</h2>
          {channel.description && !isSearchOpen && (
            <p className={`text-xs ${isDark ? 'text-gray-400' : 'text-gray-500'}`}>{channel.description}</p>
          )}
        </div>
      </div>

      <div className="flex items-center gap-4">
        {/* Search Bar */}
        {isSearchOpen ? (
          <form onSubmit={handleSubmit} className="flex items-center gap-2">
            <div className="relative">
              <Search className={`w-4 h-4 absolute left-3 top-1/2 -translate-y-1/2 ${isDark ? 'text-gray-400' : 'text-gray-500'}`} />
              <input
                ref={inputRef}
                type="text"
                value={localQuery}
                onChange={(e) => setLocalQuery(e.target.value)}
                onKeyDown={handleKeyDown}
                placeholder="Search messages..."
                className={`w-64 pl-9 pr-8 py-1.5 border rounded-lg text-sm focus:outline-none focus:ring-2 focus:ring-claw-500 ${
                  isDark 
                    ? 'bg-gray-700 border-gray-600 text-white placeholder-gray-400' 
                    : 'bg-gray-100 border-gray-300 text-gray-900 placeholder-gray-500'
                }`}
              />
              {localQuery && (
                <button
                  type="button"
                  onClick={handleClear}
                  className={`absolute right-2 top-1/2 -translate-y-1/2 p-0.5 rounded ${
                    isDark 
                      ? 'text-gray-400 hover:text-white hover:bg-gray-600' 
                      : 'text-gray-500 hover:text-gray-900 hover:bg-gray-300'
                  }`}
                >
                  <X className="w-3.5 h-3.5" />
                </button>
              )}
            </div>
            <button
              type="button"
              onClick={handleSearchToggle}
              className={`p-1.5 rounded transition-colors ${
                isDark 
                  ? 'text-gray-400 hover:text-white hover:bg-gray-700' 
                  : 'text-gray-500 hover:text-gray-900 hover:bg-gray-200'
              }`}
              title="Close search (Esc)"
            >
              <X className="w-4 h-4" />
            </button>
          </form>
        ) : (
          <button
            onClick={handleSearchToggle}
            className={`p-2 rounded-lg transition-colors ${
              isDark 
                ? 'text-gray-400 hover:text-white hover:bg-gray-700' 
                : 'text-gray-500 hover:text-gray-900 hover:bg-gray-200'
            }`}
            title="Search messages (Ctrl+K)"
          >
            <Search className="w-4 h-4" />
          </button>
        )}

        <button
          onClick={onShowShortcuts}
          className={`p-2 rounded-lg transition-colors ${
            isDark 
              ? 'text-gray-400 hover:text-white hover:bg-gray-700' 
              : 'text-gray-500 hover:text-gray-900 hover:bg-gray-200'
          }`}
          title="Keyboard shortcuts (Ctrl+/)"
        >
          <Keyboard className="w-4 h-4" />
        </button>

        {/* Theme Toggle */}
        <ThemeToggle />

        <button
          onClick={onToggleSound}
          className={`p-2 rounded-lg transition-colors ${
            soundEnabled 
              ? 'text-claw-400 hover:bg-claw-500/20' 
              : isDark
                ? 'text-gray-400 hover:text-white hover:bg-gray-700'
                : 'text-gray-500 hover:text-gray-900 hover:bg-gray-200'
          }`}
          title={soundEnabled ? 'Mute notifications' : 'Enable notifications'}
        >
          {soundEnabled ? <Volume2 className="w-4 h-4" /> : <VolumeX className="w-4 h-4" />}
        </button>

        <div className={`flex items-center gap-2 ${isDark ? 'text-gray-400' : 'text-gray-500'}`}>
          <Users className="w-4 h-4" />
          <span className="text-sm">{userCount} online</span>
        </div>

        <div className={`flex items-center gap-1 ${connected ? 'text-green-500' : 'text-red-500'}`}>
          {connected ? (
            <>
              <Wifi className="w-4 h-4" />
              <span className="text-xs">Connected</span>
            </>
          ) : (
            <>
              <WifiOff className="w-4 h-4" />
              <span className="text-xs">Reconnecting...</span>
            </>
          )}
        </div>
      </div>
    </div>
  );
}
