import React from 'react';
import { Hash, Users, Wifi, WifiOff, Keyboard } from 'lucide-react';

export default function ChannelHeader({ channel, connected, userCount, onShowShortcuts }) {
  if (!channel) return null;

  return (
    <div className="h-14 bg-gray-800 border-b border-gray-700 flex items-center justify-between px-4">
      <div className="flex items-center gap-3">
        <div className="w-8 h-8 bg-gray-700 rounded-lg flex items-center justify-center">
          <Hash className="w-4 h-4 text-gray-400" />
        </div>
        <div>
          <h2 className="font-bold text-white">{channel.name}</h2>
          {channel.description && (
            <p className="text-xs text-gray-400">{channel.description}</p>
          )}
        </div>
      </div>

      <div className="flex items-center gap-4">
        <button
          onClick={onShowShortcuts}
          className="p-2 text-gray-400 hover:text-white hover:bg-gray-700 rounded-lg transition-colors"
          title="Keyboard shortcuts (Ctrl+/)"
        >
          <Keyboard className="w-4 h-4" />
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
