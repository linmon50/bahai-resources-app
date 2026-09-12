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

/**
 * Normalizes planning session links JSON/array structure into headerLink and resourceLinks array.
 */
export function parseSessionLinks(rawLinks) {
    if (!rawLinks) return { headerLink: null, resourceLinks: [] };

    if (Array.isArray(rawLinks)) {
        const headerLink = rawLinks[0] && rawLinks[0].url ? rawLinks[0] : null;
        const resourceLinks = rawLinks.slice(1).map((lk, i) => ({
            id: lk.id || `res-${i}-${Date.now()}`,
            label: lk.label || lk.url,
            url: lk.url,
            category: lk.category || 'Document',
            created_at: lk.created_at || new Date().toISOString()
        }));
        return { headerLink, resourceLinks };
    }

    if (typeof rawLinks === 'object') {
        const headerLink = rawLinks.header_link && rawLinks.header_link.url ? rawLinks.header_link : null;
        const resourceLinks = Array.isArray(rawLinks.resource_links) ? rawLinks.resource_links : [];
        return { headerLink, resourceLinks };
    }

    return { headerLink: null, resourceLinks: [] };
}

/**
 * Formats headerLink and resourceLinks into the standard JSON structure for planning_sessions.links.
 */
export function formatSessionLinks(headerLink, resourceLinks) {
    return {
        header_link: headerLink && headerLink.url ? { label: headerLink.label?.trim() || headerLink.url.trim(), url: headerLink.url.trim() } : null,
        resource_links: resourceLinks || []
    };
}

