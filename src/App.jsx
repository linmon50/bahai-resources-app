import React, { useEffect, useState } from "react";
import { BrowserRouter as Router, Routes, Route, Navigate } from "react-router-dom";
import supabase from "./supabaseClient";
import Navbar from "./Navbar";
import Auth from "./Auth";
import AdminMembers from "./AdminMembers";
import ResetPassword from "./ResetPassword";
import EditProfilePage from "./EditProfilePage";
import ProfilePage from "./ProfilePage";
import DirectoryPage from "./DirectoryPage";
import BulletinBoard from "./BulletinBoard";
import { CommunityProvider } from "./context/CommunityContext";

function MembershipRequired() {
  return (
    <div className="glass-panel" style={{ padding: '2rem', maxWidth: '500px', margin: '4rem auto', textAlign: 'center' }}>
      <h2 style={{ color: 'var(--auth-text-light-blue)', marginBottom: '1.5rem' }}>Membership Required</h2>
      <p style={{ color: 'white', marginBottom: '1.5rem' }}>Your account is not currently associated with an approved community.</p>
      <p style={{ color: 'rgba(255,255,255,0.7)', fontSize: '0.9rem', marginBottom: '2rem' }}>If you just signed up, please wait for an administrator to approve your request, or ensure you used a valid invite link.</p>
      <button 
        onClick={() => supabase.auth.signOut()} 
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
  const [loading, setLoading] = useState(true);
  const [checkingMembership, setCheckingMembership] = useState(false);

  useEffect(() => {
    async function checkAdminStatus(userId) {
      if (!userId) {
        setIsAdmin(false);
        setIsGlobalAdmin(false);
        setHasMembership(false);
        return;
      }

      setCheckingMembership(true);
      try {
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
        setCheckingMembership(false);
        setLoading(false);
      }
    }


    const { data: { subscription } } = supabase.auth.onAuthStateChange(
      async (_event, session) => {
        setSession(session);
        if (session?.user) {
          checkAdminStatus(session.user.id);
        } else {
          setLoading(false);
          setIsAdmin(false);
          setIsGlobalAdmin(false);
          setHasMembership(false);
        }
      }
    );

    return () => subscription.unsubscribe();
  }, []);

  if (loading || checkingMembership) {
    return <div style={{ padding: '2rem', textAlign: 'center', color: 'white' }}>Loading...</div>;
  }

  return (
    <Router>
      <CommunityProvider>
        <div className="app-layout">
          {session && <Navbar session={session} isAdmin={isAdmin} />}

          <div className="app-content" style={{ marginLeft: session ? undefined : 0 }}>
          <Routes>
            <Route
              path="/"
              element={
                session
                  ? (hasMembership
                    ? <BulletinBoard session={session} isAdmin={isAdmin} />
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
              element={(session && isAdmin) ? <AdminMembers isGlobalAdmin={isGlobalAdmin} /> : <Navigate to="/" replace />}
            />

            <Route path="/profile" element={(session && hasMembership) ? <ProfilePage session={session} /> : <Navigate to="/" replace />} />
            <Route path="/profile/edit" element={(session && hasMembership) ? <EditProfilePage session={session} /> : <Navigate to="/" replace />} />
            <Route path="/profile/:userId" element={(session && hasMembership) ? <ProfilePage session={session} /> : <Navigate to="/" replace />} />
            <Route path="/directory" element={(session && hasMembership) ? <DirectoryPage session={session} /> : <Navigate to="/" replace />} />
            <Route path="/bulletin" element={(session && hasMembership) ? <BulletinBoard session={session} isAdmin={isAdmin} /> : <Navigate to="/" replace />} />

            <Route path="/reset-password" element={<div style={{ padding: "2rem" }}><ResetPassword /></div>} />

            <Route path="*" element={<Navigate to="/" replace />} />
          </Routes>
        </div>
      </div>
    </CommunityProvider>
    </Router>
  );
}
