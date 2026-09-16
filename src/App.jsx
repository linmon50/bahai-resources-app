import React, { useEffect, useState } from "react";
import { BrowserRouter as Router, Routes, Route, Navigate, useLocation, useNavigate } from "react-router-dom";
import supabase from "./supabaseClient";
import Navbar from "./Navbar";
import { clearSessionAndRedirect } from "./utils/authUtils";
import Auth from "./Auth";
import AdminMembers from "./AdminMembers";
import ResetPassword from "./ResetPassword";
import EditProfilePage from "./EditProfilePage";
import ProfilePage from "./ProfilePage";
import AccountSettings from "./AccountSettings";
import DirectoryPage from "./DirectoryPage";
import BulletinBoard from "./BulletinBoard";
import PlanningSessionsPage from "./PlanningSessionsPage";
import PlanningSessionDetail from "./PlanningSessionDetail";
import { CommunityProvider, useCommunity } from "./context/CommunityContext";
import ProfileDropdown from "./components/ProfileDropdown";

async function fetchWithRetry(fn, retries = 2, delay = 400) {
  for (let attempt = 0; attempt <= retries; attempt++) {
    try {
      return await fn();
    } catch (err) {
      if (attempt === retries) throw err;
      await new Promise(r => setTimeout(r, delay * Math.pow(1.5, attempt)));
    }
  }
}

function MembershipRequired({ onRetry }) {
  const [signingOut, setSigningOut] = useState(false);
  const [retrying, setRetrying] = useState(false);

  const handleSignOut = async (e) => {
    if (e) e.preventDefault();
    setSigningOut(true);
    await clearSessionAndRedirect();
  };

  const handleRetry = async () => {
    if (!onRetry || retrying) return;
    setRetrying(true);
    try {
      await onRetry();
    } finally {
      setRetrying(false);
    }
  };

  return (
    <div className="glass-panel" style={{ padding: '2rem', maxWidth: '500px', margin: '4rem auto', textAlign: 'center' }}>
      <h2 style={{ color: 'var(--auth-text-light-blue)', marginBottom: '1.5rem' }}>Membership Required</h2>
      <p style={{ color: 'white', marginBottom: '1.5rem' }}>Your account is not currently associated with an approved community.</p>
      <p style={{ color: 'rgba(255,255,255,0.7)', fontSize: '0.9rem', marginBottom: '2rem' }}>If you just signed up, please wait for an administrator to approve your request, or ensure you used a valid invite link.</p>
      <div style={{ display: 'flex', gap: '1rem', justifyContent: 'center' }}>
        {onRetry && (
          <button
            type="button"
            onClick={handleRetry}
            disabled={retrying || signingOut}
            className="admin-pill-btn"
            style={{ flex: 1, cursor: (retrying || signingOut) ? 'wait' : 'pointer', justifyContent: 'center' }}
          >
            {retrying ? "Checking..." : "Check Again"}
          </button>
        )}
        <button 
          type="button"
          onClick={handleSignOut} 
          disabled={signingOut || retrying}
          className="admin-pill-btn danger" 
          style={{ flex: 1, cursor: signingOut ? 'wait' : 'pointer', justifyContent: 'center' }}
        >
          {signingOut ? "Signing Out..." : "Sign Out"}
        </button>
      </div>
    </div>
  );
}

function NotFound() {
  const navigate = useNavigate();
  return (
    <div className="glass-panel" style={{ padding: '2.5rem 2rem', maxWidth: '500px', margin: '4rem auto', textAlign: 'center' }}>
      <h2 style={{ color: 'var(--auth-text-light-blue)', marginBottom: '1rem', fontSize: '1.5rem' }}>Page Not Found</h2>
      <p style={{ color: 'white', marginBottom: '1.5rem', lineHeight: 1.5 }}>
        The link you clicked does not exist or may have been removed.
      </p>
      <button 
        type="button"
        onClick={() => navigate('/')} 
        className="admin-pill-btn" 
        style={{ width: '100%', justifyContent: 'center' }}
      >
        ← Return to Home
      </button>
    </div>
  );
}

export default function App() {
  const [session, setSession] = useState(null);
  const [isAdmin, setIsAdmin] = useState(false);
  const [isGlobalAdmin, setIsGlobalAdmin] = useState(false);
  const [hasMembership, setHasMembership] = useState(false);
  // loading stays true until we know both session AND membership status
  const [loading, setLoading] = useState(true);
  const [isRecovering, setIsRecovering] = useState(() => sessionStorage.getItem('isRecoveringPassword') === 'true');

  const checkAdminStatus = async (userId) => {
    if (!userId) {
      setIsAdmin(false);
      setIsGlobalAdmin(false);
      setHasMembership(false);
      setLoading(false);
      return;
    }

    try {
      const pendingInvite = sessionStorage.getItem('pending_invite_code');
      if (pendingInvite) {
        const { error: consumeErr } = await supabase.rpc('consume_invite', { p_code: pendingInvite });
        if (consumeErr) {
          console.error('Failed to consume invite code:', consumeErr);
        }
        sessionStorage.removeItem('pending_invite_code');
      }

      const cachedStatus = sessionStorage.getItem('membership_status_' + userId);

      // Attempt 1: Call get_my_membership_status RPC with retry
      try {
        const { data, error } = await fetchWithRetry(() => supabase.rpc('get_my_membership_status'), 2, 400);

        if (!error && data && data.length > 0) {
          const status = data[0];
          if (status.has_membership) {
            setHasMembership(true);
            setIsAdmin(status.is_admin);
            setIsGlobalAdmin(status.is_global_admin);
            sessionStorage.setItem('membership_status_' + userId, 'approved');
            return;
          }
        }
      } catch (rpcErr) {
        console.warn('RPC get_my_membership_status failed, trying fallback check:', rpcErr);
      }

      // Attempt 2: Direct table checks fallback in case RPC returned false or failed
      try {
        const [{ data: memberRows }, { data: globalAdminRows }] = await Promise.all([
          fetchWithRetry(() =>
            supabase
              .from('memberships')
              .select('community_id, role, admin_level')
              .eq('user_id', userId)
              .eq('approved', true),
            2,
            400
          ),
          fetchWithRetry(() =>
            supabase
              .from('global_admins')
              .select('user_id')
              .eq('user_id', userId),
            2,
            400
          )
        ]);

        const hasApprovedMembership = (memberRows && memberRows.length > 0);
        const isGlobal = (globalAdminRows && globalAdminRows.length > 0);
        const isCommunityAdmin = hasApprovedMembership && memberRows.some(m => m.admin_level > 0);

        if (hasApprovedMembership || isGlobal) {
          setHasMembership(true);
          setIsAdmin(isCommunityAdmin || isGlobal);
          setIsGlobalAdmin(isGlobal);
          sessionStorage.setItem('membership_status_' + userId, 'approved');
          return;
        }
      } catch (fallbackErr) {
        console.error('Direct table check fallback also failed:', fallbackErr);
      }

      // If both RPC and direct table query confirmed no membership, verify against cached approval
      if (cachedStatus === 'approved') {
        setHasMembership(true);
      } else {
        setHasMembership(false);
        setIsAdmin(false);
        setIsGlobalAdmin(false);
        sessionStorage.removeItem('membership_status_' + userId);
      }
    } catch (err) {
      console.error('Error checking membership status:', err);
      if (sessionStorage.getItem('membership_status_' + userId) === 'approved') {
        setHasMembership(true);
      } else {
        setHasMembership(false);
        setIsAdmin(false);
        setIsGlobalAdmin(false);
      }
    } finally {
      // Only clear loading once the full membership check is done
      setLoading(false);
    }
  };

  useEffect(() => {
    let lastUserId = null;
    const { data: { subscription } } = supabase.auth.onAuthStateChange(
      async (event, session) => {
        if (event === 'PASSWORD_RECOVERY') {
          sessionStorage.setItem('isRecoveringPassword', 'true');
          setIsRecovering(true);
        }

        // On tab switching within the same browser port, Supabase fires TOKEN_REFRESHED.
        // If the user is already logged in with the same ID, ignore token refresh re-renders completely.
        if (event === 'TOKEN_REFRESHED' && session?.user && session.user.id === lastUserId) {
          return;
        }

        setSession(session);
        if (session?.user) {
          // If first load or user changed, perform full admin status check
          if (!lastUserId || session.user.id !== lastUserId) {
            setLoading(true);
            await checkAdminStatus(session.user.id);
            lastUserId = session.user.id;
          } else {
            setLoading(false);
          }
        } else {
          lastUserId = null;
          setIsAdmin(false);
          setIsGlobalAdmin(false);
          setHasMembership(false);
          setLoading(false);
        }
      }
    );

    return () => subscription.unsubscribe();
  }, []);

  // Safety net: if the auth listener never fires (stale localStorage, network issue, etc.)
  // clear loading after 8 seconds so the user at least sees the login page.
  useEffect(() => {
    const timeout = setTimeout(() => setLoading(false), 8000);
    return () => clearTimeout(timeout);
  }, []);

  if (loading && !isRecovering) {
    return <div style={{ padding: '2rem', textAlign: 'center', color: 'white' }}>Loading...</div>;
  }

  if (isRecovering) {
    return (
      <Router>
        <Routes>
          <Route path="*" element={<ResetPassword />} />
        </Routes>
      </Router>
    );
  }

  return (
    <Router>
      <CommunityProvider>
        <AppContent 
          session={session} 
          hasMembership={hasMembership} 
          isGlobalAdmin={isGlobalAdmin}
          onRecheckMembership={() => session?.user?.id && checkAdminStatus(session.user.id)}
        />
      </CommunityProvider>
    </Router>
  );
}

function AppContent({ session, hasMembership, isGlobalAdmin, onRecheckMembership }) {
  const { 
    isAdmin: activeCommunityAdmin, 
    isGlobalAdmin: contextGlobalAdmin,
    hasMembership: contextHasMembership,
    communities, 
    loading: communityLoading,
    refreshCommunities
  } = useCommunity();
  const location = useLocation();
  const navigate = useNavigate();

  const isMember = hasMembership || contextHasMembership || (communities && communities.length > 0) || isGlobalAdmin || contextGlobalAdmin;

  const handleRetry = async () => {
    if (onRecheckMembership) await onRecheckMembership();
    if (refreshCommunities) await refreshCommunities();
  };

  // Guard for brand new users: if first login is not completed, take them to edit profile page
  useEffect(() => {
    if (session?.user?.id && isMember && (location.pathname === '/' || location.pathname === '/bulletin')) {
      supabase
        .from('profiles')
        .select('first_login_completed')
        .eq('user_id', session.user.id)
        .maybeSingle()
        .then(({ data }) => {
          if (data && data.first_login_completed === false) {
            navigate('/profile/edit?first_login=true', { replace: true });
          }
        });
    }
  }, [session?.user?.id, isMember, location.pathname, navigate]);

  return (
    <div className="app-layout">
      <a href="#main-content" className="skip-link">Skip to main content</a>
      {session && <Navbar session={session} isAdmin={activeCommunityAdmin} />}

      <main id="main-content" className="app-content" style={{ marginLeft: session ? undefined : 0, paddingTop: session ? undefined : 0 }}>
        {session && <ProfileDropdown session={session} isAdmin={activeCommunityAdmin} />}
        
        {communityLoading ? (
          <div style={{ padding: '4rem 2rem', textAlign: 'center', color: 'white' }}>
            <p style={{ color: 'var(--auth-text-light-blue)', fontSize: '1.1rem', marginBottom: '0.5rem' }}>Loading community...</p>
          </div>
        ) : (
          <Routes>
            <Route
              path="/"
              element={
                session
                  ? (isMember
                    ? <BulletinBoard session={session} isAdmin={activeCommunityAdmin} />
                    : (
                      <div style={{ padding: "2rem" }}>
                        <MembershipRequired onRetry={handleRetry} />
                      </div>
                    )
                  )
                  : <Auth />
              }
            />

            <Route
              path="/admin/members"
              element={(session && activeCommunityAdmin) ? <AdminMembers isGlobalAdmin={isGlobalAdmin || contextGlobalAdmin} /> : <Navigate to="/" state={{ from: location.pathname }} replace />}
            />

            <Route path="/profile" element={(session && isMember) ? <ProfilePage session={session} /> : <Navigate to="/" state={{ from: location.pathname }} replace />} />
            <Route path="/profile/edit" element={(session && isMember) ? <EditProfilePage session={session} /> : <Navigate to="/" state={{ from: location.pathname }} replace />} />
            <Route path="/profile/:userId" element={(session && isMember) ? <ProfilePage session={session} /> : <Navigate to="/" state={{ from: location.pathname }} replace />} />
            <Route path="/settings" element={(session && isMember) ? <AccountSettings session={session} /> : <Navigate to="/" state={{ from: location.pathname }} replace />} />
            <Route path="/directory" element={(session && isMember) ? <DirectoryPage session={session} /> : <Navigate to="/" state={{ from: location.pathname }} replace />} />
            <Route path="/bulletin" element={(session && isMember) ? <BulletinBoard session={session} isAdmin={activeCommunityAdmin} /> : <Navigate to="/" state={{ from: location.pathname }} replace />} />
            <Route path="/planning" element={(session && isMember) ? <PlanningSessionsPage session={session} isAdmin={activeCommunityAdmin} /> : <Navigate to="/" state={{ from: location.pathname }} replace />} />
            <Route path="/planning/:sessionId" element={(session && isMember) ? <PlanningSessionDetail session={session} isAdmin={activeCommunityAdmin} /> : <Navigate to="/" state={{ from: location.pathname }} replace />} />

            <Route path="/reset-password" element={<div style={{ padding: "2rem" }}><ResetPassword /></div>} />

            <Route path="*" element={<NotFound />} />
          </Routes>
        )}
      </main>
    </div>
  );
}
