import React, { createContext, useContext, useState, useEffect } from 'react';
import supabase from '../supabaseClient';

const CommunityContext = createContext();

export const CommunityProvider = ({ children }) => {
  const [communities, setCommunities] = useState([]);
  const [activeCommunityId, setActiveCommunityId] = useState(localStorage.getItem('active_community_id') || '');
  const [loading, setLoading] = useState(true);
  const [userMemberships, setUserMemberships] = useState([]);
  const [isGlobalAdmin, setIsGlobalAdmin] = useState(false);

  useEffect(() => {
    let mounted = true;

    // Safety fallback: ensure loading spinner disappears after 3.5s
    const safetyTimer = setTimeout(() => {
      if (mounted) setLoading(false);
    }, 3500);

    async function fetchUserCommunities(sessionObj, isBackgroundRefresh = false) {
      if (mounted && !isBackgroundRefresh) setLoading(true);
      try {
        const session = sessionObj !== undefined ? sessionObj : (await supabase.auth.getSession()).data.session;
        if (!session?.user) {
          if (mounted) {
            setCommunities([]);
            setUserMemberships([]);
            setIsGlobalAdmin(false);
            setActiveCommunityId('');
            setLoading(false);
          }
          return;
        }

        // 1. Check if user is a global admin
        const { data: userIsGlobalAdmin } = await supabase.rpc("is_global_admin", { uid: session.user.id });
        
        let combined = [];
        let membershipsList = [];
        
        if (userIsGlobalAdmin) {
            const { data } = await supabase.from("communities").select("id, name").order("name");
            combined = data || [];
        } else {
            // Fetch all communities where the user is an approved member (admin or regular)
            const { data: rows } = await supabase
              .from("memberships")
              .select("community_id, admin_level, communities(id, name)")
              .eq("user_id", session.user.id)
              .eq("approved", true);

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
          setIsGlobalAdmin(!!userIsGlobalAdmin);
          
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
        if (mounted) setLoading(false);
      }
    }

    fetchUserCommunities();

    const { data: { subscription } } = supabase.auth.onAuthStateChange((event, session) => {
        // Skip routine token refresh on tab switching if communities are already loaded in memory
        if (event === 'TOKEN_REFRESHED' && communities.length > 0) {
            return;
        }
        const isBackground = communities.length > 0;
        fetchUserCommunities(session, isBackground);
    });

    return () => {
        mounted = false;
        clearTimeout(safetyTimer);
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

  const refreshCommunities = async () => {
    const session = (await supabase.auth.getSession()).data.session;
    if (!session?.user) return;
    const { data: userIsGlobalAdmin } = await supabase.rpc("is_global_admin", { uid: session.user.id });
    let combined = [];
    let membershipsList = [];
    if (userIsGlobalAdmin) {
      const { data } = await supabase.from("communities").select("id, name").order("name");
      combined = data || [];
    } else {
      const { data: rows } = await supabase
        .from("memberships")
        .select("community_id, admin_level, communities(id, name)")
        .eq("user_id", session.user.id)
        .eq("approved", true);
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
