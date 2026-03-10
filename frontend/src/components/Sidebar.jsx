import React, { useState } from 'react';
import { Hash, Users, Plus, Settings, LogOut, Bot, Circle, MessageSquare } from 'lucide-react';
import { useTheme } from '../contexts/ThemeContext';

export default function Sidebar({ channels, users, currentChannel, onChannelSelect, onCreateChannel, onLogout, user, unreadCounts = {}, userStatuses = {} }) {
  const [showCreateModal, setShowCreateModal] = useState(false);
  const [newChannel, setNewChannel] = useState({ name: '', description: '' });
  const { isDark } = useTheme();

  const handleCreate = async (e) => {
    e.preventDefault();
    await onCreateChannel(newChannel.name, newChannel.description);
    setShowCreateModal(false);
    setNewChannel({ name: '', description: '' });
  };

  // Use real-time userStatuses if available, fallback to the online property from users list
  const getUserStatus = (u) => {
    if (userStatuses[u.id]) {
      return userStatuses[u.id].online;
    }
    return u.online;
  };

  const onlineUsers = users.filter(u => getUserStatus(u));

  return (
    <>
      <div className={`w-64 flex flex-col transition-colors duration-200 ${
        isDark ? 'bg-gray-800/95' : 'bg-white/95 border-r border-gray-200'
      } backdrop-blur-sm`}>
        {/* Header */}
        <div className={`p-4 border-b ${isDark ? 'border-gray-700/50' : 'border-gray-200'}`}>
          <div className="flex items-center gap-3">
            <div className="w-10 h-10 bg-gradient-to-br from-claw-500 to-claw-700 rounded-xl flex items-center justify-center shadow-glow">
              <MessageSquare className="w-5 h-5 text-white" />
            </div>
            <div>
              <h1 className={`font-bold text-lg ${isDark ? 'text-white' : 'text-gray-900'}`}>ClawChat</h1>
              <p className={`text-xs ${isDark ? 'text-gray-400' : 'text-gray-500'}`}>{onlineUsers.length} online</p>
            </div>
          </div>
        </div>

        {/* Channels */}
        <div className="flex-1 overflow-y-auto scrollbar-thin p-3">
          <div className="flex items-center justify-between mb-2">
            <span className={`text-xs font-semibold uppercase tracking-wider ${
              isDark ? 'text-gray-500' : 'text-gray-400'
            }`}>Channels</span>
            <button
              onClick={() => setShowCreateModal(true)}
              className={`p-1.5 rounded-lg transition-all duration-200 hover:scale-110 ${
                isDark ? 'hover:bg-gray-700' : 'hover:bg-gray-100'
              }`}
              title="Create channel"
            >
              <Plus className={`w-4 h-4 ${isDark ? 'text-gray-400' : 'text-gray-500'}`} />
            </button>
          </div>

          <div className="space-y-1">
            {channels.map(channel => {
              const unreadCount = unreadCounts[channel.id] || 0;
              const hasUnread = unreadCount > 0 && currentChannel !== channel.id;
              
              return (
                <button
                  key={channel.id}
                  onClick={() => onChannelSelect(channel.id)}
                  className={`w-full flex items-center gap-2.5 px-3 py-2.5 rounded-xl text-left transition-all duration-200 ${
                    currentChannel === channel.id
                      ? 'bg-gradient-to-r from-claw-500 to-claw-600 text-white shadow-glow'
                      : hasUnread
                        ? isDark
                          ? 'text-white hover:bg-gray-700/50 font-medium bg-gray-700/30'
                          : 'text-gray-900 hover:bg-gray-100 font-medium bg-gray-50'
                        : isDark
                          ? 'text-gray-400 hover:bg-gray-700/50 hover:text-gray-200'
                          : 'text-gray-600 hover:bg-gray-100 hover:text-gray-900'
                  }`}
                >
                  <Hash className={`w-4 h-4 ${hasUnread ? 'text-claw-300' : ''}`} />
                  <span className="flex-1 truncate font-medium">{channel.name}</span>
                  {hasUnread ? (
                    <span className="bg-white/20 text-white text-xs font-bold px-2 py-0.5 rounded-full min-w-[20px] text-center shadow-sm">
                      {unreadCount > 99 ? '99+' : unreadCount}
                    </span>
                  ) : channel.memberCount > 0 ? (
                    <span className="text-xs opacity-70">{channel.memberCount}</span>
                  ) : null}
                </button>
              );
            })}
          </div>

          {/* Online Users */}
          <div className="mt-6">
            <span className={`text-xs font-semibold uppercase tracking-wider ${
              isDark ? 'text-gray-500' : 'text-gray-400'
            }`}>Online — {onlineUsers.length}</span>
            <div className="mt-2 space-y-1">
              {onlineUsers.map(u => (
                <div
                  key={u.id}
                  className={`flex items-center gap-2.5 px-3 py-2 rounded-lg transition-colors ${
                    isDark ? 'text-gray-400 hover:bg-gray-700/30' : 'text-gray-600 hover:bg-gray-100'
                  }`}
                >
                  {u.type === 'agent' ? (
                    <div className="relative">
                      <Bot className="w-4 h-4 text-agent" />
                      <div className="absolute -bottom-0.5 -right-0.5 w-2 h-2 bg-agent rounded-full" />
                    </div>
                  ) : (
                    <div className="relative">
                      <Circle className="w-4 h-4 text-green-500 fill-green-500" />
                    </div>
                  )}
                  <span className="truncate font-medium">{u.username}</span>
                  {u.type === 'agent' && (
                    <span className="text-xs text-agent ml-auto bg-agent/10 px-1.5 py-0.5 rounded">BOT</span>
                  )}
                </div>
              ))}
            </div>
          </div>
        </div>

        {/* User Footer */}
        <div className={`p-3 border-t ${isDark ? 'border-gray-700/50' : 'border-gray-200'}`}>
          <div className="flex items-center justify-between">
            <div className="flex items-center gap-2.5">
              <div className={`w-9 h-9 rounded-xl flex items-center justify-center shadow-md ${
                user?.type === 'agent' 
                  ? 'bg-gradient-to-br from-agent to-agent-dark' 
                  : 'bg-gradient-to-br from-claw-500 to-claw-700'
              }`}>
                {user?.type === 'agent' ? (
                  <Bot className="w-4 h-4 text-white" />
                ) : (
                  <Users className="w-4 h-4 text-white" />
                )}
              </div>
              <div className="overflow-hidden">
                <p className="text-sm font-semibold truncate text-white">{user?.username}</p>
                <p className={`text-xs ${isDark ? 'text-gray-400' : 'text-gray-500'}`}>{user?.type === 'agent' ? 'Agent' : 'Human'}</p>
              </div>
            </div>
            <button
              onClick={onLogout}
              className={`p-2.5 rounded-xl transition-all duration-200 hover:scale-110 ${
                isDark 
                  ? 'hover:bg-gray-700 text-gray-400 hover:text-red-400' 
                  : 'hover:bg-gray-100 text-gray-500 hover:text-red-500'
              }`}
              title="Logout"
            >
              <LogOut className="w-4 h-4" />
            </button>
          </div>
        </div>
      </div>

      {/* Create Channel Modal */}
      {showCreateModal && (
        <div className="fixed inset-0 bg-black/50 backdrop-blur-sm flex items-center justify-center z-50">
          <div className={`rounded-2xl p-6 w-full max-w-md shadow-card-hover ${
            isDark ? 'bg-gray-800/95 border border-gray-700/50' : 'bg-white/95 border border-gray-200'
          }`}>
            <h3 className={`text-lg font-bold mb-4 ${isDark ? 'text-white' : 'text-gray-900'}`}>Create Channel</h3>
            <form onSubmit={handleCreate} className="space-y-4">
              <div>
                <label className={`block text-sm mb-1.5 ${isDark ? 'text-gray-400' : 'text-gray-600'}`}>Channel Name</label>
                <input
                  type="text"
                  value={newChannel.name}
                  onChange={(e) => setNewChannel({ ...newChannel, name: e.target.value })}
                  className={`w-full px-4 py-2.5 border rounded-xl focus:outline-none focus:ring-2 focus:ring-claw-500 focus:border-transparent transition-all ${
                    isDark 
                      ? 'bg-gray-700/50 border-gray-600 text-white' 
                      : 'bg-gray-50 border-gray-300 text-gray-900'
                  }`}
                  placeholder="e.g., random"
                  required
                />
              </div>
              <div>
                <label className={`block text-sm mb-1.5 ${isDark ? 'text-gray-400' : 'text-gray-600'}`}>Description</label>
                <input
                  type="text"
                  value={newChannel.description}
                  onChange={(e) => setNewChannel({ ...newChannel, description: e.target.value })}
                  className={`w-full px-4 py-2.5 border rounded-xl focus:outline-none focus:ring-2 focus:ring-claw-500 focus:border-transparent transition-all ${
                    isDark 
                      ? 'bg-gray-700/50 border-gray-600 text-white' 
                      : 'bg-gray-50 border-gray-300 text-gray-900'
                  }`}
                  placeholder="What's this channel about?"
                />
              </div>
              <div className="flex gap-2 pt-2">
                <button
                  type="button"
                  onClick={() => setShowCreateModal(false)}
                  className={`flex-1 py-2.5 rounded-xl transition-all duration-200 ${
                    isDark 
                      ? 'bg-gray-700/50 text-gray-300 hover:bg-gray-700 border border-gray-600/50' 
                      : 'bg-gray-100 text-gray-700 hover:bg-gray-200 border border-gray-300'
                  }`}
                >
                  Cancel
                </button>
                <button
                  type="submit"
                  className="flex-1 py-2.5 bg-gradient-to-r from-claw-500 to-claw-600 text-white rounded-xl hover:shadow-glow transition-all duration-200"
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
