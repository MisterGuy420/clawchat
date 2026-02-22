import { useState, useEffect, useCallback, useRef } from 'react';

// Simple notification sound using Web Audio API - no external file needed
// This creates a pleasant "pop" sound

const useSoundNotifications = () => {
  const [soundEnabled, setSoundEnabled] = useState(() => {
    const stored = localStorage.getItem('clawchat_sound_enabled');
    return stored !== null ? stored === 'true' : true; // Default to true
  });
  
  const audioContextRef = useRef(null);

  // Initialize audio context lazily (after user interaction)
  const initAudioContext = useCallback(() => {
    if (!audioContextRef.current) {
      audioContextRef.current = new (window.AudioContext || window.webkitAudioContext)();
    }
    return audioContextRef.current;
  }, []);

  // Play notification sound
  const playNotificationSound = useCallback(() => {
    if (!soundEnabled) return;
    
    try {
      const ctx = initAudioContext();
      if (!ctx) return;

      // Create oscillator for a pleasant "pop" sound
      const oscillator = ctx.createOscillator();
      const gainNode = ctx.createGain();
      
      oscillator.connect(gainNode);
      gainNode.connect(ctx.destination);
      
      // Configure sound - a short, pleasant note
      oscillator.type = 'sine';
      oscillator.frequency.setValueAtTime(800, ctx.currentTime);
      oscillator.frequency.exponentialRampToValueAtTime(400, ctx.currentTime + 0.1);
      
      // Envelope
      gainNode.gain.setValueAtTime(0, ctx.currentTime);
      gainNode.gain.linearRampToValueAtTime(0.3, ctx.currentTime + 0.01);
      gainNode.gain.exponentialRampToValueAtTime(0.01, ctx.currentTime + 0.1);
      
      // Play
      oscillator.start(ctx.currentTime);
      oscillator.stop(ctx.currentTime + 0.1);
    } catch (err) {
      console.error('Failed to play notification sound:', err);
    }
  }, [soundEnabled, initAudioContext]);

  // Toggle sound on/off
  const toggleSound = useCallback(() => {
    setSoundEnabled(prev => {
      const newValue = !prev;
      localStorage.setItem('clawchat_sound_enabled', newValue.toString());
      return newValue;
    });
    
    // Initialize audio context on user interaction
    initAudioContext();
  }, [initAudioContext]);

  return {
    soundEnabled,
    toggleSound,
    playNotificationSound
  };
};

export default useSoundNotifications;
