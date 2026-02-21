import React, { useState } from 'react';
import { Hash, Users, Plus, Settings, LogOut, Bot, Circle, MessageSquare } from 'lucide-react';

export default function Sidebar({ channels, users, currentChannel, onChannelSelect, onCreateChannel, onLogout, user }) {
  const [showCreateModal, setShowCreateModal] = useState(false);
  const [newChannel, setNewChannel] = useState({ name: '', description: '' });

  const handleCreate = async (e) => {
    e.preventDefault();
    await onCreateChannel(newChannel.name, newChannel.description);
    setShowCreateModal(false);
    setNewChannel({ name: '', description: '' });
  };

  const onlineUsers = users.filter(u => u.online);

  return (
    <>
      <div className="w-64 bg-gray-800 flex flex-col">
        {/* Header */}
        <div className="p-4 border-b border-gray-700">
          <div className="flex items-center gap-2">
            <div className="w-8 h-8 bg-claw-600 rounded-lg flex items-center justify-center">
              <MessageSquare className="w-4 h-4 text-white" />
            </div>
            <div>
              <h1 className="font-bold text-white">ClawChat</h1>
              <p className="text-xs text-gray-400">{onlineUsers.length} online</p>
            </div>
          </div>
        </div>

        {/* Channels */}
        <div className="flex-1 overflow-y-auto scrollbar-thin p-3">
          <div className="flex items-center justify-between mb-2">
            <span className="text-xs font-semibold text-gray-500 uppercase tracking-wider">Channels</span>
            <button
              onClick={() => setShowCreateModal(true)}
              className="p-1 hover:bg-gray-700 rounded transition-colors"
            >
              <Plus className="w-4 h-4 text-gray-400" />
            </button>
          </div>

          <div className="space-y-1">
            {channels.map(channel => (
              <button
                key={channel.id}
                onClick={() => onChannelSelect(channel.id)}
                className={`w-full flex items-center gap-2 px-3 py-2 rounded-lg text-left transition-colors ${
                  currentChannel === channel.id
                    ? 'bg-claw-600 text-white'
                    : 'text-gray-400 hover:bg-gray-700 hover:text-gray-200'
                }`}
              >
                <Hash className="w-4 h-4" />
                <span className="flex-1 truncate">{channel.name}</span>
                {channel.memberCount > 0 && (
                  <span className="text-xs opacity-70">{channel.memberCount}</span>
                )}
              </button>
            ))}
          </div>

          {/* Online Users */}
          <div className="mt-6">
            <span className="text-xs font-semibold text-gray-500 uppercase tracking-wider">Online — {onlineUsers.length}</span>
            <div className="mt-2 space-y-1">
              {onlineUsers.map(u => (
                <div
                  key={u.id}
                  className="flex items-center gap-2 px-3 py-2 text-gray-400"
                >
                  {u.type === 'agent' ? (
                    <Bot className="w-4 h-4 text-agent" />
                  ) : (
                    <Circle className="w-4 h-4 text-green-500 fill-green-500" />
                  )}
                  <span className="truncate">{u.username}</span>
                  {u.type === 'agent' && (
                    <span className="text-xs text-agent ml-auto">BOT</span>
                  )}
                </div>
              ))}
            </div>
          </div>
        </div>

        {/* User Footer */}
        <div className="p-3 border-t border-gray-700">
          <div className="flex items-center justify-between">
            <div className="flex items-center gap-2">
              <div className={`w-8 h-8 rounded-full flex items-center justify-center ${
                user?.type === 'agent' ? 'bg-agent' : 'bg-claw-600'
              }`}>
                {user?.type === 'agent' ? (
                  <Bot className="w-4 h-4 text-white" />
                ) : (
                  <Users className="w-4 h-4 text-white" />
                )}
              </div>
              <div className="overflow-hidden">
                <p className="text-sm font-medium text-white truncate">{user?.username}</p>
                <p className="text-xs text-gray-400">{user?.type === 'agent' ? 'Agent' : 'Human'}</p>
              </div>
            </div>
            <button
              onClick={onLogout}
              className="p-2 hover:bg-gray-700 rounded-lg transition-colors"
              title="Logout"
            >
              <LogOut className="w-4 h-4 text-gray-400" />
            </button>
          </div>
        </div>
      </div>

      {/* Create Channel Modal */}
      {showCreateModal && (
        <div className="fixed inset-0 bg-black/50 flex items-center justify-center z-50">
          <div className="bg-gray-800 rounded-xl p-6 w-full max-w-md">
            <h3 className="text-lg font-bold text-white mb-4">Create Channel</h3>
            <form onSubmit={handleCreate} className="space-y-4">
              <div>
                <label className="block text-sm text-gray-400 mb-1">Channel Name</label>
                <input
                  type="text"
                  value={newChannel.name}
                  onChange={(e) => setNewChannel({ ...newChannel, name: e.target.value })}
                  className="w-full px-3 py-2 bg-gray-700 border border-gray-600 rounded-lg text-white focus:outline-none focus:ring-2 focus:ring-claw-500"
                  placeholder="e.g., random"
                  required
                />
              </div>
              <div>
                <label className="block text-sm text-gray-400 mb-1">Description</label>
                <input
                  type="text"
                  value={newChannel.description}
                  onChange={(e) => setNewChannel({ ...newChannel, description: e.target.value })}
                  className="w-full px-3 py-2 bg-gray-700 border border-gray-600 rounded-lg text-white focus:outline-none focus:ring-2 focus:ring-claw-500"
                  placeholder="What's this channel about?"
                />
              </div>
              <div className="flex gap-2">
                <button
                  type="button"
                  onClick={() => setShowCreateModal(false)}
                  className="flex-1 py-2 bg-gray-700 text-gray-300 rounded-lg hover:bg-gray-600"
                >
                  Cancel
                </button>
                <button
                  type="submit"
                  className="flex-1 py-2 bg-claw-600 text-white rounded-lg hover:bg-claw-700"
                >
                  Create
                </button>
              </div>
            </form>
          </div>
        </div>
      )}
    </>
  );
}
