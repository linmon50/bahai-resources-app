import supabase from '../supabaseClient';

export async function clearSessionAndRedirect() {
    // 1. Wipe localStorage and sessionStorage first so no residual tokens remain
    try {
        localStorage.clear();
    } catch (e) {
        console.error("Failed to clear localStorage:", e);
    }

    try {
        sessionStorage.clear();
    } catch (e) {
        console.error("Failed to clear sessionStorage:", e);
    }

    // 2. Perform Supabase signOut with a 1s safety timeout so UI never hangs on slow network/auth RPCs
    try {
        await Promise.race([
            supabase.auth.signOut(),
            new Promise((resolve) => setTimeout(resolve, 1000))
        ]);
    } catch (err) {
        console.error("Sign out error:", err);
    }

    // 3. Force hard reload to root login page (window.location.href = "/" is a no-op when already at "/")
    if (window.location.pathname === '/' || window.location.pathname === '') {
        window.location.reload();
    } else {
        window.location.href = "/";
    }
}
