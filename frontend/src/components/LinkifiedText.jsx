import React from 'react';

// URL regex pattern that matches most common URLs
const URL_REGEX = /(https?:\/\/[^\s<>"{}|\\^`[\]]+)/gi;

/**
 * Component that detects URLs in text and renders them as clickable links
 * Also handles markdown-style links [text](url)
 */
export function LinkifiedText({ text, className = '' }) {
  if (!text) return null;

  // First, handle markdown-style links [text](url)
  const markdownLinkRegex = /\[([^\]]+)\]\(([^)]+)\)/g;
  
  // Replace markdown links with placeholders and collect them
  const markdownLinks = [];
  let processedText = text.replace(markdownLinkRegex, (match, linkText, url) => {
    const placeholder = `__MARKDOWN_LINK_${markdownLinks.length}__`;
    markdownLinks.push({ placeholder, text: linkText, url });
    return placeholder;
  });

  // Split by URLs and rebuild with links
  const parts = processedText.split(URL_REGEX);
  const matches = processedText.match(URL_REGEX) || [];

  const elements = [];
  
  parts.forEach((part, index) => {
    // Check if this part is a markdown link placeholder
    const markdownLink = markdownLinks.find(ml => ml.placeholder === part);
    if (markdownLink) {
      elements.push(
        <a
          key={`md-${index}`}
          href={markdownLink.url}
          target="_blank"
          rel="noopener noreferrer"
          className="text-claw-400 hover:text-claw-300 hover:underline break-all"
          onClick={(e) => e.stopPropagation()}
        >
          {markdownLink.text}
        </a>
      );
    } else {
      // Regular text
      if (part) {
        elements.push(<span key={`text-${index}`}>{part}</span>);
      }
    }

    // Add URL link if there's a match for this position
    if (matches[index]) {
      const url = matches[index];
      // Check if URL looks valid (has a dot after protocol)
      if (url.match(/^https?:\/\/[^\s]+\.[^\s]+/)) {
        // Truncate long URLs for display
        const displayUrl = url.length > 60 ? url.slice(0, 57) + '...' : url;
        elements.push(
          <a
            key={`link-${index}`}
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
        // Not a valid URL, render as text
        elements.push(<span key={`invalid-${index}`}>{url}</span>);
      }
    }
  });

  return <span className={className}>{elements}</span>;
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
