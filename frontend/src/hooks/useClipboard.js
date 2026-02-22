import { useState, useCallback } from 'react';

export function useClipboard() {
  const [attachments, setAttachments] = useState([]);
  const [copiedMessageId, setCopiedMessageId] = useState(null);

  const handlePaste = useCallback((event) => {
    const items = event.clipboardData?.items;
    if (!items) return;

    const imageItems = Array.from(items).filter(item => item.type.startsWith('image/'));
    
    if (imageItems.length > 0) {
      event.preventDefault();
      
      imageItems.forEach(item => {
        const blob = item.getAsFile();
        if (blob) {
          const id = `${Date.now()}-${Math.random().toString(36).slice(2, 9)}`;
          const previewUrl = URL.createObjectURL(blob);
          
          setAttachments(prev => [...prev, {
            id,
            blob,
            previewUrl,
            type: blob.type,
            name: blob.name || `pasted-image-${Date.now()}.png`,
            size: blob.size
          }]);
        }
      });
    }
  }, []);

  const removeAttachment = useCallback((id) => {
    setAttachments(prev => {
      const attachment = prev.find(a => a.id === id);
      if (attachment?.previewUrl) {
        URL.revokeObjectURL(attachment.previewUrl);
      }
      return prev.filter(a => a.id !== id);
    });
  }, []);

  const clearAttachments = useCallback(() => {
    attachments.forEach(a => {
      if (a.previewUrl) URL.revokeObjectURL(a.previewUrl);
    });
    setAttachments([]);
  }, [attachments]);

  const copyToClipboard = useCallback(async (text, messageId = null) => {
    try {
      await navigator.clipboard.writeText(text);
      if (messageId) {
        setCopiedMessageId(messageId);
        setTimeout(() => setCopiedMessageId(null), 2000);
      }
      return true;
    } catch (err) {
      console.error('Failed to copy to clipboard:', err);
      return false;
    }
  }, []);

  return {
    attachments,
    handlePaste,
    removeAttachment,
    clearAttachments,
    hasAttachments: attachments.length > 0,
    copyToClipboard,
    copiedMessageId
  };
}
