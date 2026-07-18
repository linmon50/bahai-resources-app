import React, { useEffect, useState } from "react";
import { BrowserRouter as Router, Routes, Route, Navigate, useLocation } from "react-router-dom";
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

function MembershipRequired() {
  return (
    <div className="glass-panel" style={{ padding: '2rem', maxWidth: '500px', margin: '4rem auto', textAlign: 'center' }}>
      <h2 style={{ color: 'var(--auth-text-light-blue)', marginBottom: '1.5rem' }}>Membership Required</h2>
      <p style={{ color: 'white', marginBottom: '1.5rem' }}>Your account is not currently associated with an approved community.</p>
      <p style={{ color: 'rgba(255,255,255,0.7)', fontSize: '0.9rem', marginBottom: '2rem' }}>If you just signed up, please wait for an administrator to approve your request, or ensure you used a valid invite link.</p>
      <button 
        onClick={clearSessionAndRedirect} 
        className="admin-pill-btn danger" 
        style={{ width: '100%' }}
      >
        Sign Out
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

  useEffect(() => {
    async function checkAdminStatus(userId) {
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

        const { data, error } = await supabase.rpc('get_my_membership_status');

        if (error) throw error;

        // data is an array because the function returns a table
        if (data && data.length > 0) {
          const status = data[0];
          setHasMembership(status.has_membership);
          setIsAdmin(status.is_admin);
          setIsGlobalAdmin(status.is_global_admin);
        } else {
          setHasMembership(false);
          setIsAdmin(false);
          setIsGlobalAdmin(false);
        }
      } catch (err) {
        console.error('Error checking membership status:', err);
        setHasMembership(false);
        setIsAdmin(false);
        setIsGlobalAdmin(false);
      } finally {
        // Only clear loading once the full membership check is done —
        // this prevents the router from rendering with stale hasMembership=false
        setLoading(false);
      }
    }

    let authListenerInitialized = false;
    const { data: { subscription } } = supabase.auth.onAuthStateChange(
      async (event, session) => {
        if (event === 'PASSWORD_RECOVERY') {
          sessionStorage.setItem('isRecoveringPassword', 'true');
          setIsRecovering(true);
        }

        setSession(session);
        if (session?.user) {
          // Only show global loading on the very first auth event to prevent flickers on refreshes
          if (!authListenerInitialized) setLoading(true);
          checkAdminStatus(session.user.id);
          authListenerInitialized = true;
        } else {
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
        />
      </CommunityProvider>
    </Router>
  );
}

function AppContent({ session, hasMembership, isGlobalAdmin }) {
  const { isAdmin: activeCommunityAdmin, loading: communityLoading } = useCommunity();
  const location = useLocation();

  if (communityLoading) {
    return <div style={{ padding: '2rem', textAlign: 'center', color: 'white' }}>Loading community...</div>;
  }

  return (
    <div className="app-layout">
      <a href="#main-content" className="skip-link">Skip to main content</a>
      {session && <Navbar session={session} isAdmin={activeCommunityAdmin} />}

      <main id="main-content" className="app-content" style={{ marginLeft: session ? undefined : 0, paddingTop: session ? undefined : 0 }}>
        {session && <ProfileDropdown session={session} isAdmin={activeCommunityAdmin} />}
        <Routes>
          <Route
            path="/"
            element={
              session
                ? (hasMembership
                  ? <BulletinBoard session={session} isAdmin={activeCommunityAdmin} />
                  : (
                    <div style={{ padding: "2rem" }}>
                      <MembershipRequired />
                    </div>
                  )
                )
                : <Auth />
            }
          />

          <Route
            path="/admin/members"
            element={(session && activeCommunityAdmin) ? <AdminMembers isGlobalAdmin={isGlobalAdmin} /> : <Navigate to="/" state={{ from: location.pathname }} replace />}
          />

          <Route path="/profile" element={(session && hasMembership) ? <ProfilePage session={session} /> : <Navigate to="/" state={{ from: location.pathname }} replace />} />
          <Route path="/profile/edit" element={(session && hasMembership) ? <EditProfilePage session={session} /> : <Navigate to="/" state={{ from: location.pathname }} replace />} />
          <Route path="/profile/:userId" element={(session && hasMembership) ? <ProfilePage session={session} /> : <Navigate to="/" state={{ from: location.pathname }} replace />} />
          <Route path="/settings" element={(session && hasMembership) ? <AccountSettings session={session} /> : <Navigate to="/" state={{ from: location.pathname }} replace />} />
          <Route path="/directory" element={(session && hasMembership) ? <DirectoryPage session={session} /> : <Navigate to="/" state={{ from: location.pathname }} replace />} />
          <Route path="/bulletin" element={(session && hasMembership) ? <BulletinBoard session={session} isAdmin={activeCommunityAdmin} /> : <Navigate to="/" state={{ from: location.pathname }} replace />} />
          <Route path="/planning" element={(session && hasMembership) ? <PlanningSessionsPage session={session} isAdmin={activeCommunityAdmin} /> : <Navigate to="/" state={{ from: location.pathname }} replace />} />
          <Route path="/planning/:sessionId" element={(session && hasMembership) ? <PlanningSessionDetail session={session} isAdmin={activeCommunityAdmin} /> : <Navigate to="/" state={{ from: location.pathname }} replace />} />

          <Route path="/reset-password" element={<div style={{ padding: "2rem" }}><ResetPassword /></div>} />

          <Route path="*" element={<Navigate to="/" state={{ from: location.pathname }} replace />} />
        </Routes>
      </main>
    </div>
  );
}
