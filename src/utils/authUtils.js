import supabase from '../supabaseClient';

export async function clearSessionAndRedirect() {
    try {
        await supabase.auth.signOut();
    } catch (err) {
        console.error("Sign out error:", err);
    }
    
    // Manually delete all Supabase auth keys and active community ID from localStorage
    try {
        const keysToRemove = [];
        for (let i = 0; i < localStorage.length; i++) {
            const key = localStorage.key(i);
            if (key && (key.startsWith('sb-') || key === 'active_community_id')) {
                keysToRemove.push(key);
            }
        }
        keysToRemove.forEach(key => localStorage.removeItem(key));
    } catch (e) {
        console.error("Failed to clear localStorage:", e);
    }

    try {
        sessionStorage.clear();
    } catch (e) {
        console.error("Failed to clear sessionStorage:", e);
    }

    window.location.href = "/";
}
