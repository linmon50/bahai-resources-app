import React, { createContext, useContext, useState, useEffect, useRef } from 'react';
import supabase from '../supabaseClient';

const CommunityContext = createContext();

async function fetchWithRetry(fn, retries = 2, delay = 500) {
  for (let attempt = 0; attempt <= retries; attempt++) {
    try {
      return await fn();
    } catch (err) {
      if (attempt === retries) throw err;
      await new Promise(r => setTimeout(r, delay * Math.pow(1.5, attempt)));
    }
  }
}

const getInitialCache = () => {
  try {
    const cached = sessionStorage.getItem('community_cache');
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
  // If we had valid cached communities, we can start with loading=false to avoid false flashing
  const [loading, setLoading] = useState(initialCache?.communities?.length ? false : true);
  const [userMemberships, setUserMemberships] = useState(initialCache?.userMemberships || []);
  const [isGlobalAdmin, setIsGlobalAdmin] = useState(initialCache?.isGlobalAdmin || false);

  const activeTimerRef = useRef(null);

  useEffect(() => {
    let mounted = true;

    // Safety watchdog: Only clear after a generous 15 seconds if network hangs
    if (activeTimerRef.current) clearTimeout(activeTimerRef.current);
    activeTimerRef.current = setTimeout(() => {
      if (mounted) {
        console.warn('CommunityProvider loading watchdog triggered (15s).');
        setLoading(false);
      }
    }, 15000);

    async function fetchUserCommunities(sessionObj, isBackgroundRefresh = false) {
      if (mounted && !isBackgroundRefresh && !communities.length) {
        setLoading(true);
      }
      try {
        const session = sessionObj !== undefined ? sessionObj : (await supabase.auth.getSession()).data.session;
        if (!session?.user) {
          if (mounted) {
            setCommunities([]);
            setUserMemberships([]);
            setIsGlobalAdmin(false);
            setActiveCommunityId('');
            sessionStorage.removeItem('community_cache');
            setLoading(false);
          }
          return;
        }

        // 1. Check if user is a global admin (with retry)
        let userIsGlobalAdmin = false;
        try {
          const res = await fetchWithRetry(() => supabase.rpc("is_global_admin", { uid: session.user.id }), 2, 400);
          userIsGlobalAdmin = !!res?.data;
        } catch (e) {
          console.warn("is_global_admin check error:", e);
        }
        
        let combined = [];
        let membershipsList = [];
        
        if (userIsGlobalAdmin) {
            const { data } = await fetchWithRetry(() =>
              supabase.from("communities").select("id, name").order("name"), 2, 400
            );
            combined = data || [];
        } else {
            // Fetch all communities where the user is an approved member (admin or regular)
            const { data: rows } = await fetchWithRetry(() =>
              supabase
                .from("memberships")
                .select("community_id, admin_level, communities(id, name)")
                .eq("user_id", session.user.id)
                .eq("approved", true),
              2,
              400
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

          // Update sessionStorage cache
          try {
            sessionStorage.setItem('community_cache', JSON.stringify({
              userId: session.user.id,
              communities: combined,
              userMemberships: membershipsList,
              isGlobalAdmin: userIsGlobalAdmin
            }));
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
        if (mounted) {
          if (activeTimerRef.current) clearTimeout(activeTimerRef.current);
          setLoading(false);
        }
      }
    }

    fetchUserCommunities();

    const { data: { subscription } } = supabase.auth.onAuthStateChange((event, session) => {
        // Skip routine token refresh if user and communities are already in state
        if (event === 'TOKEN_REFRESHED' && communities.length > 0) {
            return;
        }
        const isBackground = communities.length > 0;
        fetchUserCommunities(session, isBackground);
    });

    return () => {
        mounted = false;
        if (activeTimerRef.current) clearTimeout(activeTimerRef.current);
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

  const activeMembership = userMemberships.find(m => m.community_id === activeCommunityId);
  const currentIsAdmin = isGlobalAdmin || (activeMembership && activeMembership.admin_level > 0);
  const hasMembership = isGlobalAdmin || (communities && communities.length > 0) || (userMemberships && userMemberships.length > 0);

  const refreshCommunities = async () => {
    const session = (await supabase.auth.getSession()).data.session;
    if (!session?.user) return;
    try {
      const { data: userIsGlobalAdmin } = await fetchWithRetry(() =>
        supabase.rpc("is_global_admin", { uid: session.user.id }), 2, 400
      );
      let combined = [];
      let membershipsList = [];
      if (userIsGlobalAdmin) {
        const { data } = await fetchWithRetry(() =>
          supabase.from("communities").select("id, name").order("name"), 2, 400
        );
        combined = data || [];
      } else {
        const { data: rows } = await fetchWithRetry(() =>
          supabase
            .from("memberships")
            .select("community_id, admin_level, communities(id, name)")
            .eq("user_id", session.user.id)
            .eq("approved", true),
          2,
          400
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
        sessionStorage.setItem('community_cache', JSON.stringify({
          userId: session.user.id,
          communities: combined,
          userMemberships: membershipsList,
          isGlobalAdmin: !!userIsGlobalAdmin
        }));
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
      communityDetails: communities.find(c => c.id === activeCommunityId) || null,
      setActiveCommunityId: handleSetCommunity, 
      loading,
      isAdmin: currentIsAdmin,
      isGlobalAdmin,
      hasMembership,
      refreshCommunities
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
