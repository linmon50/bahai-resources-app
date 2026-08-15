import supabase from '../supabaseClient';

/**
 * Send a lockout notification email to the user.
 *
 * Expected RPC signature in Supabase:
 *   CREATE FUNCTION public.notify_lockout(p_email text) RETURNS void ...
 *
 * @param {Object} supabase - Supabase client instance
 * @param {Object} opts
 * @param {string} opts.email - User's email address
 */
export async function notifyLockout(supabase, { email }) {
  try {
    const { error } = await supabase.rpc('notify_lockout', {
      p_email: email,
    });
    if (error) console.error('notifyLockout RPC error:', error);
  } catch (err) {
    console.error('notifyLockout failed:', err);
  }
}
