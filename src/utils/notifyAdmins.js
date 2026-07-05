import supabase from '../supabaseClient';

/**
 * Notify all community-level admins about an event.
 * Uses the `notify_community_admins` SECURITY DEFINER RPC so it works
 * regardless of the caller's auth level.
 *
 * @param {Object}  opts
 * @param {string}  opts.communityId  - UUID of the community
 * @param {string}  [opts.actorId]    - UUID of the user who triggered the event (excluded from recipients)
 * @param {string}  opts.type         - Notification type string (e.g. 'admin_pending_post')
 * @param {Object}  [opts.metadata]   - Extra JSONB metadata (community_name is auto-added by the RPC)
 * @param {string}  [opts.referenceId]- Optional reference UUID (e.g. post id)
 */
export async function notifyAdmins({ communityId, actorId = null, type, metadata = {}, referenceId = null }) {
    try {
        const { error } = await supabase.rpc('notify_community_admins', {
            p_community_id: communityId,
            p_actor_id: actorId,
            p_type: type,
            p_metadata: metadata,
            p_reference_id: referenceId,
        });
        if (error) console.error('notifyAdmins RPC error:', error);
    } catch (err) {
        console.error('notifyAdmins error:', err);
    }
}
