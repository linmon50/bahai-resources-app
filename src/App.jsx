import React, { useEffect, useState } from "react";
import { BrowserRouter as Router, Routes, Route, Navigate } from "react-router-dom";
import supabase from "./supabaseClient";
import Navbar from "./Navbar";
import Auth from "./Auth";
import AdminMembers from "./AdminMembers";
import ResetPassword from "./ResetPassword";

function JoinCommunity() {
  const [code, setCode] = useState("");
  const [loading, setLoading] = useState(false);
  const [msg, setMsg] = useState(null);

  const handleJoin = async (e) => {
    e.preventDefault();
    setLoading(true);
    setMsg(null);
    try {
      const cleanCode = code.trim();
      const { data: { user } } = await supabase.auth.getUser();

      if (!user) throw new Error("You must be logged in.");

      // 0. Pre-validate the invite code
      const { data: validationResult, error: valError } = await supabase.rpc(
        "validate_invite_pre_signup",
        { p_code: cleanCode, p_email: user.email }
      );

      if (valError) throw valError;

      if (validationResult === 'invalid') {
        throw new Error("Invalid invite code. Please check for typos.");
      } else if (validationResult === 'email_mismatch') {
        throw new Error("This invite code was generated for a different email address.");
      } else if (validationResult === 'used') {
        throw new Error("This invite code has already been used.");
      } else if (validationResult === 'expired') {
        throw new Error("This invite code has expired. Please ask an admin for a new one.");
      }

      // 1. Consume the invite
      const { error } = await supabase.rpc("consume_invite", { p_code: cleanCode });
      if (error) throw error;
      window.location.reload();
    } catch (err) {
      setMsg({ text: err.message, isError: true });
    } finally {
      setLoading(false);
    }
  };

  return (
    <div style={{ maxWidth: '500px', margin: '4rem auto', textAlign: 'center', padding: '2rem', border: '1px solid var(--border-color)', borderRadius: '12px', boxShadow: '0 4px 12px rgba(0,0,0,0.5)', backgroundColor: 'var(--bg-card)' }}>
      <h2 style={{ marginBottom: '1rem', color: 'var(--text-main)' }}>Almost There!</h2>
      <p style={{ color: 'var(--text-muted)', marginBottom: '2rem' }}>You are logged in, but you haven't joined a community yet. Enter your invite code below to get started.</p>

      <form onSubmit={handleJoin} style={{ display: 'flex', flexDirection: 'column', gap: '1.5rem' }}>
        <div style={{ textAlign: 'left' }}>
          <label style={{ display: 'block', marginBottom: '0.5rem', fontWeight: 'bold', color: 'var(--text-main)' }}>Invite Code</label>
          <input
            type="text"
            value={code}
            onChange={e => setCode(e.target.value)}
            placeholder="Enter your community invite code"
            style={{ width: '100%', padding: '0.8rem', borderRadius: '8px', border: '1px solid var(--border-color)', boxSizing: 'border-box', backgroundColor: 'var(--bg-input)', color: 'var(--text-main)' }}
            required
          />
        </div>
        <button
          type="submit"
          disabled={loading}
          style={{
            padding: '1rem',
            backgroundColor: 'var(--primary)',
            color: 'white',
            border: 'none',
            borderRadius: '8px',
            fontSize: '1rem',
            fontWeight: 'bold',
            cursor: loading ? 'not-allowed' : 'pointer',
            transition: 'background-color 0.2s'
          }}
        >
          {loading ? "Joining..." : "Join Community"}
        </button>
      </form>

      {msg && (
        <div style={{
          marginTop: '1.5rem',
          padding: '1rem',
          borderRadius: '8px',
          backgroundColor: msg.isError ? 'var(--error-bg)' : 'var(--success-bg)',
          color: msg.isError ? 'var(--error-text)' : 'var(--success-text)',
          border: `1px solid ${msg.isError ? 'var(--error-border)' : 'var(--success-border)'}`
        }}>
          {msg.text}
        </div>
      )}
    </div>
  );
}

export default function App() {
  const [session, setSession] = useState(null);
  const [isAdmin, setIsAdmin] = useState(false);
  const [isGlobalAdmin, setIsGlobalAdmin] = useState(false);
  const [hasMembership, setHasMembership] = useState(false);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    async function checkAdminStatus(userId) {
      if (!userId) {
        setIsAdmin(false);
        setIsGlobalAdmin(false);
        setHasMembership(false);
        return;
      }

      // Detect memberships and admin levels
      const { data, error } = await supabase
        .from('memberships')
        .select('id, admin_level')
        .eq('user_id', userId);

      if (!error && data) {
        setHasMembership(data.length > 0);
        const adminRows = data.filter(row => row.admin_level > 0);
        setIsAdmin(adminRows.length > 0);
        setIsGlobalAdmin(adminRows.some(row => row.admin_level >= 3));
      } else {
        setHasMembership(false);
        setIsAdmin(false);
        setIsGlobalAdmin(false);
      }
    }

    // 1. Get initial session
    supabase.auth.getSession().then(async ({ data: { session } }) => {
      setSession(session);
      if (session?.user) {
        await checkAdminStatus(session.user.id);
      }
      setLoading(false);
    });

    // 2. Listen for future login/logout events
    const { data: { subscription } } = supabase.auth.onAuthStateChange(
      (_event, session) => {
        setSession(session);
        if (session?.user) {
          checkAdminStatus(session.user.id);
        } else {
          setIsAdmin(false);
          setIsGlobalAdmin(false);
          setHasMembership(false);
        }
      }
    );

    return () => subscription.unsubscribe();
  }, []);

  if (loading) {
    return <div style={{ padding: '2rem', textAlign: 'center' }}>Loading...</div>;
  }

  return (
    <Router>
      <div className="app-layout">
        {session && <Navbar session={session} isAdmin={isAdmin} />}

        <div className="app-content" style={{ marginLeft: session ? undefined : 0 }}>
          <Routes>
            {/* Public Home Route (conditional logic for logged in users) */}
            <Route
              path="/"
              element={
                session
                  ? (hasMembership
                    ? (
                      <div style={{ padding: "2rem", textAlign: 'center', marginTop: '3rem' }}>
                        <h2>Welcome to Bahai Resources!</h2>
                        <p>You are successfully logged in and ready to contribute to your community.</p>
                      </div>
                    )
                    : (
                      <div style={{ padding: "2rem" }}>
                        <JoinCommunity />
                      </div>
                    )
                  )
                  : <Auth />
              }
            />

            {/* Protected Admin Routes */}
            <Route
              path="/admin/members"
              element={(session && isAdmin) ? <AdminMembers isGlobalAdmin={isGlobalAdmin} /> : <Navigate to="/" replace />}
            />

            {/* Public: password reset link from email */}
            <Route path="/reset-password" element={<div style={{ padding: "2rem" }}><ResetPassword /></div>} />

            {/* Fallback */}
            <Route path="*" element={<Navigate to="/" replace />} />
          </Routes>
        </div>
      </div>
    </Router>
  );
}
