import React, { useState, useRef, useEffect } from 'react';
import { Hash, Users, Wifi, WifiOff, Keyboard, Search, X, Volume2, VolumeX } from 'lucide-react';

export default function ChannelHeader({ channel, connected, userCount, onShowShortcuts, onSearch, searchQuery, isSearching, soundEnabled, onToggleSound }) {
  const [isSearchOpen, setIsSearchOpen] = useState(false);
  const [localQuery, setLocalQuery] = useState(searchQuery || '');
  const inputRef = useRef(null);

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
    <div className="h-14 bg-gray-800 border-b border-gray-700 flex items-center justify-between px-4">
      <div className="flex items-center gap-3">
        <div className="w-8 h-8 bg-gray-700 rounded-lg flex items-center justify-center">
          <Hash className="w-4 h-4 text-gray-400" />
        </div>
        <div>
          <h2 className="font-bold text-white">{channel.name}</h2>
          {channel.description && !isSearchOpen && (
            <p className="text-xs text-gray-400">{channel.description}</p>
          )}
        </div>
      </div>

      <div className="flex items-center gap-4">
        {/* Search Bar */}
        {isSearchOpen ? (
          <form onSubmit={handleSubmit} className="flex items-center gap-2">
            <div className="relative">
              <Search className="w-4 h-4 text-gray-400 absolute left-3 top-1/2 -translate-y-1/2" />
              <input
                ref={inputRef}
                type="text"
                value={localQuery}
                onChange={(e) => setLocalQuery(e.target.value)}
                onKeyDown={handleKeyDown}
                placeholder="Search messages..."
                className="w-64 pl-9 pr-8 py-1.5 bg-gray-700 border border-gray-600 rounded-lg text-sm text-white placeholder-gray-400 focus:outline-none focus:ring-2 focus:ring-claw-500"
              />
              {localQuery && (
                <button
                  type="button"
                  onClick={handleClear}
                  className="absolute right-2 top-1/2 -translate-y-1/2 p-0.5 text-gray-400 hover:text-white hover:bg-gray-600 rounded"
                >
                  <X className="w-3.5 h-3.5" />
                </button>
              )}
            </div>
            <button
              type="button"
              onClick={handleSearchToggle}
              className="p-1.5 text-gray-400 hover:text-white hover:bg-gray-700 rounded transition-colors"
              title="Close search (Esc)"
            >
              <X className="w-4 h-4" />
            </button>
          </form>
        ) : (
          <button
            onClick={handleSearchToggle}
            className="p-2 text-gray-400 hover:text-white hover:bg-gray-700 rounded-lg transition-colors"
            title="Search messages (Ctrl+K)"
          >
            <Search className="w-4 h-4" />
          </button>
        )}

        <button
          onClick={onShowShortcuts}
          className="p-2 text-gray-400 hover:text-white hover:bg-gray-700 rounded-lg transition-colors"
          title="Keyboard shortcuts (Ctrl+/)"
        >
          <Keyboard className="w-4 h-4" />
        </button>
        <button
          onClick={onToggleSound}
          className={`p-2 rounded-lg transition-colors ${
            soundEnabled 
              ? 'text-claw-400 hover:bg-claw-500/20' 
              : 'text-gray-400 hover:text-white hover:bg-gray-700'
          }`}
          title={soundEnabled ? 'Mute notifications' : 'Enable notifications'}
        >
          {soundEnabled ? <Volume2 className="w-4 h-4" /> : <VolumeX className="w-4 h-4" />}
        </button>
        <div className="flex items-center gap-2 text-gray-400">
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
