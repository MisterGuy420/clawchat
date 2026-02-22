import React, { useMemo } from 'react';
import { useTheme } from '../contexts/ThemeContext';
import { useAuth } from '../contexts/AuthContext';
import { highlightMentions } from '../hooks/useMentions';

// URL regex pattern that matches most common URLs
const URL_REGEX = /(https?:\/\/[^\s<>"{}|\\^`[\]]+)/gi;

/**
 * Component that detects URLs in text and renders them as clickable links
 * Also handles markdown-style links [text](url) and @mentions
 */
export function LinkifiedText({ text, className = '' }) {
  const { isDark } = useTheme();
  const { user } = useAuth();
  
  const renderedContent = useMemo(() => {
    if (!text) return null;
    
    // First process mentions
    const mentionParts = highlightMentions(text, user?.username, isDark);
    
    // Then process URLs in each text part
    const elements = [];
    let keyCounter = 0;
    
    mentionParts.forEach((part, partIndex) => {
      if (part.type === 'mention') {
        // Render mention with highlight
        const isCurrentUser = part.isCurrentUser;
        elements.push(
          <span
            key={`mention-${partIndex}`}
            className={`font-semibold ${
              isCurrentUser
                ? 'bg-claw-500/30 text-claw-400 px-1 rounded'
                : isDark 
                  ? 'text-claw-400 hover:text-claw-300'
                  : 'text-claw-600 hover:text-claw-700'
            }`}
            title={isCurrentUser ? 'You were mentioned!' : `Mentioned @${part.username}`}
          >
            {part.content}
          </span>
        );
      } else {
        // Process text part for URLs
        const textContent = part.content;
        
        // Handle markdown-style links [text](url)
        const markdownLinkRegex = /\[([^\]]+)\]\(([^)]+)\)/g;
        const markdownLinks = [];
        let processedText = textContent.replace(markdownLinkRegex, (match, linkText, url) => {
          const placeholder = `__MARKDOWN_LINK_${markdownLinks.length}__`;
          markdownLinks.push({ placeholder, text: linkText, url });
          return placeholder;
        });
        
        // Split by URLs and rebuild with links
        const urlParts = processedText.split(URL_REGEX);
        const matches = processedText.match(URL_REGEX) || [];
        
        urlParts.forEach((urlPart, urlIndex) => {
          // Check if this part is a markdown link placeholder
          const markdownLink = markdownLinks.find(ml => ml.placeholder === urlPart);
          if (markdownLink) {
            elements.push(
              <a
                key={`md-${keyCounter++}`}
                href={markdownLink.url}
                target="_blank"
                rel="noopener noreferrer"
                className="text-claw-400 hover:text-claw-300 hover:underline break-all"
                onClick={(e) => e.stopPropagation()}
              >
                {markdownLink.text}
              </a>
            );
          } else if (urlPart) {
            // Regular text
            elements.push(<span key={`text-${keyCounter++}`}>{urlPart}</span>);
          }
          
          // Add URL link if there's a match for this position
          if (matches[urlIndex]) {
            const url = matches[urlIndex];
            if (url.match(/^https?:\/\/[^\s]+\.[^\s]+/)) {
              const displayUrl = url.length > 60 ? url.slice(0, 57) + '...' : url;
              elements.push(
                <a
                  key={`link-${keyCounter++}`}
                  href={url}
                  target="_blank"
                  rel="noopener noreferrer"
                  className="text-claw-400 hover:text-claw-300 hover:underline break-all"
                  title={url}
                  onClick={(e) => e.stopPropagation()}
                >
                  {displayUrl}
                </a>
              );
            } else {
              elements.push(<span key={`invalid-${keyCounter++}`}>{url}</span>);
            }
          }
        });
      }
    });
    
    return elements;
  }, [text, user?.username, isDark]);

  return <span className={className}>{renderedContent}</span>;
}

/**
 * Extract the first URL from text (useful for link previews)
 */
export function extractFirstUrl(text) {
  if (!text) return null;
  const match = text.match(URL_REGEX);
  return match ? match[0] : null;
}

/**
 * Check if text contains any URLs
 */
export function containsUrl(text) {
  if (!text) return false;
  return URL_REGEX.test(text);
}

export default LinkifiedText;
