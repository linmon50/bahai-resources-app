/**
 * Helper to determine if a URL points to an internal page within the app.
 * Internal links: relative URLs ('/directory', '#section'), or URLs sharing the current origin/hostname.
 */
export function isInternalLink(url) {
    if (!url) return false;
    const cleanUrl = String(url).trim();
    if (cleanUrl.startsWith('/') || cleanUrl.startsWith('#') || cleanUrl.startsWith('.')) {
        return true;
    }
    try {
        const parsed = new URL(cleanUrl.startsWith('http') ? cleanUrl : `https://${cleanUrl}`, window.location.origin);
        return parsed.hostname === window.location.hostname;
    } catch (e) {
        return false;
    }
}

/**
 * Returns '_self' for internal links (stay in same tab) and '_blank' for external links.
 */
export function getLinkTarget(url) {
    return isInternalLink(url) ? '_self' : '_blank';
}
