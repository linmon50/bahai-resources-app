import React, { createContext, useContext, useState, useEffect, useRef } from 'react';
import supabase from '../supabaseClient';

const CommunityContext = createContext();

function withTimeout(promise, ms = 8000, errorMsg = 'Request timed out') {
  return Promise.race([
    promise,
    new Promise((_, reject) => setTimeout(() => reject(new Error(errorMsg)), ms))
  ]);
}

async function fetchWithRetry(fn, retries = 2, delay = 400, timeoutMs = 8000) {
  for (let attempt = 0; attempt <= retries; attempt++) {
    try {
      const res = await withTimeout(fn(), timeoutMs, `Request timed out after ${timeoutMs}ms`);
      if (res && res.error) {
        throw res.error;
      }
      return res;
    } catch (err) {
      if (attempt === retries) throw err;
      await new Promise(r => setTimeout(r, delay * Math.pow(1.5, attempt)));
    }
  }
}

const getInitialCache = () => {
  try {
    const cached = localStorage.getItem('community_cache') || sessionStorage.getItem('community_cache');
    if (cached) {
      const parsed = JSON.parse(cached);
      if (parsed && Array.isArray(parsed.communities)) {
        return parsed;
      }
    }
  } catch (e) {
    // Ignore JSON parse errors
  }
  return null;
};

export const CommunityProvider = ({ children }) => {
  const initialCache = getInitialCache();
  const [communities, setCommunities] = useState(initialCache?.communities || []);
  const [activeCommunityId, setActiveCommunityId] = useState(() => {
    return localStorage.getItem('active_community_id') || initialCache?.communities?.[0]?.id || '';
  });
  // If we had valid cached communities, we start with loading=false so UI renders immediately
  const [loading, setLoading] = useState(initialCache?.communities?.length ? false : true);
  const [userMemberships, setUserMemberships] = useState(initialCache?.userMemberships || []);
  const [isGlobalAdmin, setIsGlobalAdmin] = useState(initialCache?.isGlobalAdmin || false);

  const activeTimerRef = useRef(null);
  const isFetchingRef = useRef(false);

  useEffect(() => {
    let mounted = true;

    const handleSigningOut = () => {
      if (mounted) {
        setCommunities([]);
        setUserMemberships([]);
        setIsGlobalAdmin(false);
        setActiveCommunityId('');
        try {
          localStorage.removeItem('community_cache');
          sessionStorage.removeItem('community_cache');
        } catch (e) {}
        setLoading(false);
      }
    };

    window.addEventListener('appSigningOut', handleSigningOut);

    // Safety watchdog: Only clear after a generous 15 seconds if network hangs
    if (activeTimerRef.current) clearTimeout(activeTimerRef.current);
    activeTimerRef.current = setTimeout(() => {
      if (mounted) {
        console.warn('CommunityProvider loading watchdog triggered (15s).');
        setLoading(false);
      }
    }, 15000);

    async function fetchUserCommunities(sessionObj, isBackgroundRefresh = false) {
      if (isFetchingRef.current) return;
      isFetchingRef.current = true;

      if (mounted && !isBackgroundRefresh && !communities.length) {
        setLoading(true);
      }
      try {
        let session = sessionObj;
        if (session === undefined) {
          const { data } = await withTimeout(supabase.auth.getSession(), 6000, 'getSession timeout').catch(() => ({ data: {} }));
          session = data?.session;
        }

        if (!session?.user) {
          if (mounted) {
            setCommunities([]);
            setUserMemberships([]);
            setIsGlobalAdmin(false);
            setActiveCommunityId('');
            try {
              localStorage.removeItem('community_cache');
              sessionStorage.removeItem('community_cache');
            } catch (e) {}
            setLoading(false);
          }
          return;
        }

        // 1. Check if user is a global admin (with retry & timeout)
        let userIsGlobalAdmin = false;
        try {
          const res = await fetchWithRetry(() => supabase.rpc("is_global_admin", { uid: session.user.id }), 2, 400, 7000);
          userIsGlobalAdmin = !!res?.data;
        } catch (e) {
          console.warn("is_global_admin check error:", e);
        }
        
        let combined = [];
        let membershipsList = [];
        
        if (userIsGlobalAdmin) {
            const { data } = await fetchWithRetry(() =>
              supabase.from("communities").select("id, name, settings").order("name"), 2, 400, 7000
            );
            combined = data || [];
        } else {
            // Fetch all communities where the user is an approved member (admin or regular)
            const { data: rows } = await fetchWithRetry(() =>
              supabase
                .from("memberships")
                .select("community_id, admin_level, member_tier, communities(id, name, settings)")
                .eq("user_id", session.user.id)
                .eq("approved", true),
              2,
              400,
              7000
            );

            if (rows) {
                membershipsList = rows;
                // Filter and sort the communities
                combined = rows
                    .map(r => r.communities)
                    .filter(Boolean)
                    .sort((a, b) => a.name.localeCompare(b.name));
            }
        }

        if (mounted) {
          setCommunities(combined);
          setUserMemberships(membershipsList);
          setIsGlobalAdmin(userIsGlobalAdmin);

          // Update localStorage and sessionStorage cache
          try {
            const cacheData = JSON.stringify({
              userId: session.user.id,
              communities: combined,
              userMemberships: membershipsList,
              isGlobalAdmin: userIsGlobalAdmin
            });
            localStorage.setItem('community_cache', cacheData);
            sessionStorage.setItem('community_cache', cacheData);
          } catch (e) { /* ignore */ }
          
          if (combined.length > 0) {
            const savedId = localStorage.getItem('active_community_id');
            const exists = combined.find(c => c.id === savedId);
            if (exists) {
              setActiveCommunityId(exists.id);
            } else {
              setActiveCommunityId(combined[0].id);
              localStorage.setItem('active_community_id', combined[0].id);
            }
          } else {
            setActiveCommunityId('');
          }
        }
      } catch (err) {
        console.error("Error in CommunityProvider:", err);
      } finally {
        isFetchingRef.current = false;
        if (mounted) {
          if (activeTimerRef.current) clearTimeout(activeTimerRef.current);
          setLoading(false);
        }
      }
    }

    // Synchronous auth listener: defer async queries outside the auth state machine lock
    const { data: { subscription } } = supabase.auth.onAuthStateChange((event, session) => {
        if (event === 'SIGNED_OUT') {
          if (mounted) {
            setCommunities([]);
            setUserMemberships([]);
            setIsGlobalAdmin(false);
            setActiveCommunityId('');
            try {
              localStorage.removeItem('community_cache');
              sessionStorage.removeItem('community_cache');
            } catch (e) {}
            setLoading(false);
          }
          return;
        }

        // Skip routine token refresh if user and communities are already in state
        if (event === 'TOKEN_REFRESHED' && communities.length > 0) {
            return;
        }
        
        // Defer database query call outside of onAuthStateChange dispatch lock
        setTimeout(() => {
          if (mounted) {
            const isBackground = communities.length > 0;
            fetchUserCommunities(session, isBackground);
          }
        }, 0);
    });

    return () => {
        mounted = false;
        if (activeTimerRef.current) clearTimeout(activeTimerRef.current);
        window.removeEventListener('appSigningOut', handleSigningOut);
        subscription?.unsubscribe();
    };
  }, []);

  const handleSetCommunity = (id) => {
    setActiveCommunityId(prev => {
        if (prev !== id) {
            if (id) localStorage.setItem('active_community_id', id);
            return id;
        }
        return prev;
    });
  };

  const activeCommunity = communities.find(c => c.id === activeCommunityId) || null;
  const activeMembership = userMemberships.find(m => m.community_id === activeCommunityId);
  const currentIsAdmin = isGlobalAdmin || (activeMembership && activeMembership.admin_level > 0);
  const hasMembership = isGlobalAdmin || (communities && communities.length > 0) || (userMemberships && userMemberships.length > 0);
  const currentMemberTier = activeMembership?.member_tier || (isGlobalAdmin ? 'full' : 'full');
  const hasFullTierAccess = isGlobalAdmin || currentIsAdmin || currentMemberTier === 'full';

  const tierLabels = {
    full: activeCommunity?.settings?.tier_labels?.full || "Registered Baha'i",
    guest: activeCommunity?.settings?.tier_labels?.guest || "Friend of the Faith",
    guarded: activeCommunity?.settings?.tier_labels?.guarded_content_label || "Registered Baha'is Only",
    public: activeCommunity?.settings?.tier_labels?.public_content_label || "All Members & Friends"
  };

  const refreshCommunities = async () => {
    const session = (await supabase.auth.getSession()).data.session;
    if (!session?.user) return;
    try {
      const { data: userIsGlobalAdmin } = await fetchWithRetry(() =>
        supabase.rpc("is_global_admin", { uid: session.user.id }), 2, 400, 7000
      );
      let combined = [];
      let membershipsList = [];
      if (userIsGlobalAdmin) {
        const { data } = await fetchWithRetry(() =>
          supabase.from("communities").select("id, name, settings").order("name"), 2, 400, 7000
        );
        combined = data || [];
      } else {
        const { data: rows } = await fetchWithRetry(() =>
          supabase
            .from("memberships")
            .select("community_id, admin_level, member_tier, communities(id, name, settings)")
            .eq("user_id", session.user.id)
            .eq("approved", true),
          2,
          400,
          7000
        );
        if (rows) {
          membershipsList = rows;
          combined = rows
            .map(r => r.communities)
            .filter(Boolean)
            .sort((a, b) => a.name.localeCompare(b.name));
        }
      }
      setCommunities(combined);
      setUserMemberships(membershipsList);
      setIsGlobalAdmin(!!userIsGlobalAdmin);
      try {
        const cacheData = JSON.stringify({
          userId: session.user.id,
          communities: combined,
          userMemberships: membershipsList,
          isGlobalAdmin: !!userIsGlobalAdmin
        });
        localStorage.setItem('community_cache', cacheData);
        sessionStorage.setItem('community_cache', cacheData);
      } catch (e) { /* ignore */ }

      if (combined.length > 0) {
        const savedId = localStorage.getItem('active_community_id');
        const exists = combined.find(c => c.id === savedId);
        if (exists) {
          setActiveCommunityId(exists.id);
        } else {
          setActiveCommunityId(combined[0].id);
          localStorage.setItem('active_community_id', combined[0].id);
        }
      } else {
        setActiveCommunityId('');
      }
    } catch (e) {
      console.error("Error refreshing communities:", e);
    }
  };

  return (
    <CommunityContext.Provider value={{ 
      communities, 
      activeCommunityId, 
      communityDetails: activeCommunity,
      setActiveCommunityId: handleSetCommunity, 
      loading,
      isAdmin: currentIsAdmin,
      isGlobalAdmin,
      hasMembership,
      refreshCommunities,
      memberTier: currentMemberTier,
      hasFullTierAccess,
      tierLabels
    }}>
      {children}
    </CommunityContext.Provider>
  );
};

export const useCommunity = () => {
  const context = useContext(CommunityContext);
  if (!context) {
    throw new Error('useCommunity must be used within a CommunityProvider');
  }
  return context;
};
