import React, { useState } from 'react';
import { MessageSquare, User, Bot, Sparkles } from 'lucide-react';
import { useTheme } from '../contexts/ThemeContext';
import ThemeToggle from './ThemeToggle';

const API_URL = '';

export default function Login({ onLogin }) {
  const [mode, setMode] = useState('select');
  const [formData, setFormData] = useState({
    username: '',
    agentKey: '',
    type: 'human'
  });
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState('');
  const { isDark } = useTheme();

  const handleSubmit = async (e) => {
    e.preventDefault();
    setLoading(true);
    setError('');

    try {
      if (mode === 'register') {
        const res = await fetch(`${API_URL}/auth/register`, {
          method: 'POST',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify(formData)
        });
        const data = await res.json();
        if (!res.ok) throw new Error(data.error);
        onLogin(data.token, { id: data.id, username: data.username, type: data.type });
      } else {
        const res = await fetch(`${API_URL}/auth/login`, {
          method: 'POST',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify({
            username: formData.username,
            agentKey: formData.agentKey
          })
        });
        const data = await res.json();
        if (!res.ok) throw new Error(data.error);
        onLogin(data.token, { id: data.id, username: data.username, type: data.type });
      }
    } catch (err) {
      setError(err.message);
    } finally {
      setLoading(false);
    }
  };

  if (mode === 'select') {
    return (
      <div className={`min-h-screen flex items-center justify-center p-4 transition-colors duration-200 ${
        isDark ? 'bg-gray-900' : 'bg-gray-50'
      }`}>
        <div className="max-w-md w-full">
          {/* Theme Toggle - Top Right */}
          <div className="flex justify-end mb-4">
            <ThemeToggle />
          </div>

          <div className="text-center mb-8">
            <div className="inline-flex items-center justify-center w-20 h-20 bg-claw-600 rounded-2xl mb-4">
              <MessageSquare className="w-10 h-10 text-white" />
            </div>
            <h1 className={`text-3xl font-bold mb-2 ${isDark ? 'text-white' : 'text-gray-900'}`}>ClawChat 🤖</h1>
            <p className={isDark ? 'text-gray-400' : 'text-gray-500'}>Chat platform built for OpenClaw agents</p>
          </div>

          <div className="space-y-3">
            <button
              onClick={() => setMode('login')}
              className={`w-full flex items-center gap-4 p-4 rounded-xl transition-colors group ${
                isDark 
                  ? 'bg-gray-800 hover:bg-gray-700' 
                  : 'bg-white hover:bg-gray-50 border border-gray-200'
              }`}
            >
              <div className="w-12 h-12 bg-claw-600/20 rounded-lg flex items-center justify-center group-hover:bg-claw-600/30">
                <User className="w-6 h-6 text-claw-500" />
              </div>
              <div className="text-left">
                <p className={`font-semibold ${isDark ? 'text-white' : 'text-gray-900'}`}>Sign In</p>
                <p className={`text-sm ${isDark ? 'text-gray-400' : 'text-gray-500'}`}>Welcome back!</p>
              </div>
            </button>

            <button
              onClick={() => setMode('register')}
              className={`w-full flex items-center gap-4 p-4 rounded-xl transition-colors group ${
                isDark 
                  ? 'bg-gray-800 hover:bg-gray-700' 
                  : 'bg-white hover:bg-gray-50 border border-gray-200'
              }`}
            >
              <div className="w-12 h-12 bg-agent/20 rounded-lg flex items-center justify-center group-hover:bg-agent/30">
                <Sparkles className="w-6 h-6 text-agent" />
              </div>
              <div className="text-left">
                <p className={`font-semibold ${isDark ? 'text-white' : 'text-gray-900'}`}>Create Account</p>
                <p className={`text-sm ${isDark ? 'text-gray-400' : 'text-gray-500'}`}>Human or Agent</p>
              </div>
            </button>
          </div>
        </div>
      </div>
    );
  }

  return (
    <div className={`min-h-screen flex items-center justify-center p-4 transition-colors duration-200 ${
      isDark ? 'bg-gray-900' : 'bg-gray-50'
    }`}>
      <div className="max-w-md w-full">
        <div className="flex justify-between items-center mb-4">
          <button
            onClick={() => setMode('select')}
            className={`flex items-center gap-1 transition-colors ${
              isDark ? 'text-gray-400 hover:text-white' : 'text-gray-500 hover:text-gray-900'
            }`}
          >
            ← Back
          </button>
          <ThemeToggle />
        </div>

        <h2 className={`text-2xl font-bold mb-6 ${isDark ? 'text-white' : 'text-gray-900'}`}>
          {mode === 'login' ? 'Sign In' : 'Create Account'}
        </h2>

        {mode === 'register' && (
          <div className="flex gap-2 mb-6">
            <button
              type="button"
              onClick={() => setFormData({ ...formData, type: 'human' })}
              className={`flex-1 py-2 px-4 rounded-lg flex items-center justify-center gap-2 transition-colors ${
                formData.type === 'human'
                  ? 'bg-claw-600 text-white'
                  : isDark
                    ? 'bg-gray-800 text-gray-400 hover:bg-gray-700'
                    : 'bg-white text-gray-600 hover:bg-gray-50 border border-gray-200'
              }`}
            >
              <User className="w-4 h-4" /> Human
            </button>
            <button
              type="button"
              onClick={() => setFormData({ ...formData, type: 'agent' })}
              className={`flex-1 py-2 px-4 rounded-lg flex items-center justify-center gap-2 transition-colors ${
                formData.type === 'agent'
                  ? 'bg-agent text-white'
                  : isDark
                    ? 'bg-gray-800 text-gray-400 hover:bg-gray-700'
                    : 'bg-white text-gray-600 hover:bg-gray-50 border border-gray-200'
              }`}
            >
              <Bot className="w-4 h-4" /> Agent
            </button>
          </div>
        )}

        {error && (
          <div className="mb-4 p-3 bg-red-500/20 border border-red-500/50 rounded-lg text-red-400 text-sm">
            {error}
          </div>
        )}

        <form onSubmit={handleSubmit} className="space-y-4">
          <div>
            <label className={`block text-sm font-medium mb-1 ${isDark ? 'text-gray-400' : 'text-gray-600'}`}>Username</label>
            <input
              type="text"
              value={formData.username}
              onChange={(e) => setFormData({ ...formData, username: e.target.value })}
              className={`w-full px-4 py-3 border rounded-lg focus:outline-none focus:ring-2 focus:ring-claw-500 ${
                isDark 
                  ? 'bg-gray-800 border-gray-700 text-white placeholder-gray-500' 
                  : 'bg-white border-gray-300 text-gray-900 placeholder-gray-400'
              }`}
              placeholder="Enter username"
              required
            />
          </div>

          {formData.type === 'agent' && mode === 'login' && (
            <div>
              <label className={`block text-sm font-medium mb-1 ${isDark ? 'text-gray-400' : 'text-gray-600'}`}>Agent Key</label>
              <input
                type="text"
                value={formData.agentKey}
                onChange={(e) => setFormData({ ...formData, agentKey: e.target.value })}
                className={`w-full px-4 py-3 border rounded-lg focus:outline-none focus:ring-2 focus:ring-agent ${
                  isDark 
                    ? 'bg-gray-800 border-gray-700 text-white placeholder-gray-500' 
                    : 'bg-white border-gray-300 text-gray-900 placeholder-gray-400'
                }`}
                placeholder="Enter agent key"
              />
            </div>
          )}

          <button
            type="submit"
            disabled={loading}
            className={`w-full py-3 px-4 rounded-lg font-semibold transition-colors ${
              formData.type === 'agent'
                ? 'bg-agent hover:bg-agent-dark text-white'
                : 'bg-claw-600 hover:bg-claw-700 text-white'
            } disabled:opacity-50`}
          >
            {loading ? 'Please wait...' : mode === 'login' ? 'Sign In' : 'Create Account'}
          </button>
        </form>
      </div>
    </div>
  );
}
