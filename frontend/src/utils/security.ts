/**
 * Security utilities for the frontend application
 */

/**
 * Sanitize filename to prevent XSS attacks
 * Removes or escapes potentially dangerous characters
 */
export function sanitizeFilename(filename: string): string {
  if (!filename) return '';
  
  // Remove any HTML tags
  const withoutTags = filename.replace(/<[^>]*>/g, '');
  
  // Escape special characters that could be used in XSS
  const escaped = withoutTags
    .replace(/&/g, '&amp;')
    .replace(/</g, '&lt;')
    .replace(/>/g, '&gt;')
    .replace(/"/g, '&quot;')
    .replace(/'/g, '&#x27;')
    .replace(/\//g, '&#x2F;');
  
  // Remove any non-printable characters
  const clean = escaped.replace(/[\x00-\x1F\x7F-\x9F]/g, '');
  
  // Limit length to prevent DoS
  return clean.substring(0, 255);
}

/**
 * Sanitize user-provided text content
 * More permissive than filename sanitization but still safe
 */
export function sanitizeText(text: string): string {
  if (!text) return '';
  
  // Basic HTML entity encoding
  return text
    .replace(/&/g, '&amp;')
    .replace(/</g, '&lt;')
    .replace(/>/g, '&gt;')
    .replace(/"/g, '&quot;')
    .replace(/'/g, '&#x27;');
}

/**
 * Validate and sanitize URL to prevent javascript: and data: URLs
 */
export function sanitizeUrl(url: string): string {
  if (!url) return '#';
  
  const trimmed = url.trim().toLowerCase();
  
  // Block dangerous protocols
  const dangerousProtocols = [
    'javascript:',
    'data:',
    'vbscript:',
    'file:',
    'about:'
  ];
  
  for (const protocol of dangerousProtocols) {
    if (trimmed.startsWith(protocol)) {
      return '#';
    }
  }
  
  // Allow only safe protocols
  const safeProtocols = ['http://', 'https://', 'mailto:', '/'];
  const isSafe = safeProtocols.some(protocol => 
    trimmed.startsWith(protocol) || 
    (!trimmed.includes(':') && !trimmed.startsWith('//'))
  );
  
  return isSafe ? url : '#';
}

/**
 * Create a safe download URL with proper encoding
 */
export function createSafeDownloadUrl(baseUrl: string, filename: string): string {
  const safeBase = sanitizeUrl(baseUrl);
  const encodedFilename = encodeURIComponent(sanitizeFilename(filename));
  return `${safeBase}?filename=${encodedFilename}`;
}

/**
 * Validate file type against allowed list
 */
export function isAllowedFileType(mimeType: string): boolean {
  const allowedTypes = [
    'application/pdf',
    'image/jpeg',
    'image/jpg',
    'image/png',
    'image/webp',
    'application/vnd.openxmlformats-officedocument.wordprocessingml.document',
    'application/vnd.openxmlformats-officedocument.spreadsheetml.sheet',
    'application/vnd.ms-excel',
    'text/plain',
    'text/csv'
  ];
  
  return allowedTypes.includes(mimeType.toLowerCase());
}

/**
 * Get safe file extension from mime type
 */
export function getSafeFileExtension(mimeType: string): string {
  const mimeToExtension: Record<string, string> = {
    'application/pdf': '.pdf',
    'image/jpeg': '.jpg',
    'image/jpg': '.jpg',
    'image/png': '.png',
    'image/webp': '.webp',
    'application/vnd.openxmlformats-officedocument.wordprocessingml.document': '.docx',
    'application/vnd.openxmlformats-officedocument.spreadsheetml.sheet': '.xlsx',
    'application/vnd.ms-excel': '.xls',
    'text/plain': '.txt',
    'text/csv': '.csv'
  };
  
  return mimeToExtension[mimeType.toLowerCase()] || '';
}