/**
 * Utility functions for Research Platform Extension
 */

/**
 * Generate a unique ID
 */
function generateId() {
  return `${Date.now()}-${Math.random().toString(36).substr(2, 9)}`;
}

/**
 * Format a date for display
 */
function formatDate(dateString, options = {}) {
  if (!dateString) return '';
  
  const date = new Date(dateString);
  if (isNaN(date.getTime())) return dateString;
  
  const defaultOptions = {
    year: 'numeric',
    month: 'short',
    day: 'numeric'
  };
  
  return date.toLocaleDateString('en-US', { ...defaultOptions, ...options });
}

/**
 * Format relative time (e.g., "2 hours ago")
 */
function formatRelativeTime(dateString) {
  if (!dateString) return '';
  
  const date = new Date(dateString);
  const now = new Date();
  const diffMs = now - date;
  const diffMins = Math.floor(diffMs / 60000);
  const diffHours = Math.floor(diffMs / 3600000);
  const diffDays = Math.floor(diffMs / 86400000);
  
  if (diffMins < 1) return 'Just now';
  if (diffMins < 60) return `${diffMins}m ago`;
  if (diffHours < 24) return `${diffHours}h ago`;
  if (diffDays < 7) return `${diffDays}d ago`;
  
  return formatDate(dateString);
}

/**
 * Truncate text with ellipsis
 */
function truncate(text, maxLength = 100) {
  if (!text || text.length <= maxLength) return text;
  return text.substring(0, maxLength - 3) + '...';
}

/**
 * Escape HTML to prevent XSS
 */
function escapeHtml(text) {
  if (!text) return '';
  const div = document.createElement('div');
  div.textContent = text;
  return div.innerHTML;
}

/**
 * Debounce function calls
 */
function debounce(func, wait) {
  let timeout;
  return function executedFunction(...args) {
    const later = () => {
      clearTimeout(timeout);
      func(...args);
    };
    clearTimeout(timeout);
    timeout = setTimeout(later, wait);
  };
}

/**
 * Throttle function calls
 */
function throttle(func, limit) {
  let inThrottle;
  return function executedFunction(...args) {
    if (!inThrottle) {
      func(...args);
      inThrottle = true;
      setTimeout(() => inThrottle = false, limit);
    }
  };
}

/**
 * Deep clone an object
 */
function deepClone(obj) {
  return JSON.parse(JSON.stringify(obj));
}

/**
 * Check if object is empty
 */
function isEmpty(obj) {
  if (!obj) return true;
  if (Array.isArray(obj)) return obj.length === 0;
  if (typeof obj === 'object') return Object.keys(obj).length === 0;
  return false;
}

/**
 * Get domain from URL
 */
function getDomain(url) {
  try {
    const hostname = new URL(url).hostname;
    // Remove www. prefix
    return hostname.replace(/^www\./, '');
  } catch {
    return '';
  }
}

/**
 * Detect source type from URL
 */
function detectSourceType(url) {
  const domain = getDomain(url).toLowerCase();
  
  if (domain.includes('.gov')) return 'government';
  if (domain.includes('court') || domain.includes('law.cornell')) return 'legal';
  if (domain.includes('twitter.com') || domain.includes('x.com')) return 'social_media';
  if (domain.includes('facebook.com')) return 'social_media';
  if (domain.includes('youtube.com')) return 'video';
  if (domain.includes('wikipedia.org')) return 'reference';
  if (domain.includes('arxiv.org') || domain.includes('pubmed')) return 'academic';
  
  return 'news';
}

/**
 * Format status for display
 */
function formatStatus(status) {
  const statusMap = {
    'pending_review': 'Pending Review',
    'pending_validation': 'Pending Validation',
    'published': 'Published',
    'verified': 'Published',
    'rejected': 'Rejected',
    'archived': 'Archived',
    'draft': 'Draft'
  };
  return statusMap[status] || status;
}

/**
 * Get status color class
 */
function getStatusColor(status) {
  const colorMap = {
    'pending_review': 'yellow',
    'pending_validation': 'blue',
    'published': 'green',
    'verified': 'green',
    'rejected': 'red',
    'archived': 'gray',
    'draft': 'gray'
  };
  return colorMap[status] || 'gray';
}

/**
 * Validate URL format
 */
function isValidUrl(string) {
  try {
    new URL(string);
    return true;
  } catch {
    return false;
  }
}

/**
 * Validate email format
 */
function isValidEmail(email) {
  const re = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;
  return re.test(email);
}

/**
 * Split text into sentences
 */
function splitIntoSentences(text) {
  if (!text) return [];
  
  // Handle common abbreviations
  const preserved = text
    .replace(/Mr\./g, 'Mr\u0000')
    .replace(/Mrs\./g, 'Mrs\u0000')
    .replace(/Ms\./g, 'Ms\u0000')
    .replace(/Dr\./g, 'Dr\u0000')
    .replace(/Jr\./g, 'Jr\u0000')
    .replace(/Sr\./g, 'Sr\u0000')
    .replace(/vs\./gi, 'vs\u0000')
    .replace(/U\.S\./g, 'U\u0000S\u0000')
    .replace(/i\.e\./gi, 'i\u0000e\u0000')
    .replace(/e\.g\./gi, 'e\u0000g\u0000');
  
  // Split on sentence endings
  const sentences = preserved
    .replace(/([.!?])\s+/g, '$1|SPLIT|')
    .split('|SPLIT|')
    .map(s => s.replace(/\u0000/g, '.').trim())
    .filter(s => s.length > 10);
  
  return sentences;
}

/**
 * Get initials from name
 */
function getInitials(name) {
  if (!name) return '?';
  return name
    .split(' ')
    .map(part => part[0])
    .join('')
    .toUpperCase()
    .substring(0, 2);
}

/**
 * Create element with attributes and children
 */
function createElement(tag, attrs = {}, children = []) {
  const el = document.createElement(tag);
  
  for (const [key, value] of Object.entries(attrs)) {
    if (key === 'className') {
      el.className = value;
    } else if (key === 'style' && typeof value === 'object') {
      Object.assign(el.style, value);
    } else if (key.startsWith('on') && typeof value === 'function') {
      el.addEventListener(key.substring(2).toLowerCase(), value);
    } else if (key === 'dataset') {
      Object.assign(el.dataset, value);
    } else {
      el.setAttribute(key, value);
    }
  }
  
  for (const child of children) {
    if (typeof child === 'string') {
      el.appendChild(document.createTextNode(child));
    } else if (child instanceof Node) {
      el.appendChild(child);
    }
  }
  
  return el;
}

/**
 * Show toast notification
 */
function showToast(message, type = 'info', duration = 3000) {
  // Remove existing toasts
  document.querySelectorAll('.toast').forEach(t => t.remove());
  
  const toast = createElement('div', {
    className: `toast toast-${type}`,
    style: {
      position: 'fixed',
      bottom: '20px',
      right: '20px',
      padding: '12px 20px',
      borderRadius: '8px',
      color: 'white',
      fontWeight: '500',
      zIndex: '10000',
      animation: 'slideIn 0.3s ease',
      backgroundColor: type === 'error' ? '#dc2626' : 
                       type === 'success' ? '#16a34a' : 
                       type === 'warning' ? '#d97706' : '#3b82f6'
    }
  }, [message]);
  
  document.body.appendChild(toast);
  
  setTimeout(() => {
    toast.style.animation = 'slideOut 0.3s ease';
    setTimeout(() => toast.remove(), 300);
  }, duration);
}

/**
 * Copy text to clipboard
 */
async function copyToClipboard(text) {
  try {
    await navigator.clipboard.writeText(text);
    showToast('Copied to clipboard', 'success');
    return true;
  } catch {
    showToast('Failed to copy', 'error');
    return false;
  }
}

// Export for use
if (typeof window !== 'undefined') {
  window.Utils = {
    generateId,
    formatDate,
    formatRelativeTime,
    truncate,
    escapeHtml,
    debounce,
    throttle,
    deepClone,
    isEmpty,
    getDomain,
    detectSourceType,
    formatStatus,
    getStatusColor,
    isValidUrl,
    isValidEmail,
    splitIntoSentences,
    getInitials,
    createElement,
    showToast,
    copyToClipboard
  };
}

export {
  generateId,
  formatDate,
  formatRelativeTime,
  truncate,
  escapeHtml,
  debounce,
  throttle,
  deepClone,
  isEmpty,
  getDomain,
  detectSourceType,
  formatStatus,
  getStatusColor,
  isValidUrl,
  isValidEmail,
  splitIntoSentences,
  getInitials,
  createElement,
  showToast,
  copyToClipboard
};
