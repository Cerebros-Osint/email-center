import { generateToken } from './crypto';

export function generateTrackingId(): string {
  // Use cryptographically secure random instead of Math.random
  return `trk_${generateToken(8).substring(0, 16)}`;
}

export function prepareEmailWithTracking(
  html: string,
  recipientId: string,
  appUrl: string,
  enabled: boolean
): string {
  if (!enabled) return html;

  const img = `<img src="${appUrl}/api/track/${recipientId}/pixel" alt="" width="1" height="1" style="display:none" />`;
  // Append tracking pixel before closing body if present
  if (html.includes('</body>')) {
    return html.replace('</body>', `${img}</body>`);
  }
  return html + img;
}
