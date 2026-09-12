import React, { useState, useEffect, useRef } from 'react';
import supabase from './supabaseClient';
import { useNavigate } from 'react-router-dom';
import { clearSessionAndRedirect } from './utils/authUtils';
import { useCommunity } from './context/CommunityContext';

const EyeIcon = () => (
  <svg xmlns="http://www.w3.org/2000/svg" width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
    <path d="M1 12s4-8 11-8 11 8 11 8-4 8-11 8-11-8-11-8z"></path>
    <circle cx="12" cy="12" r="3"></circle>
  </svg>
);

const EyeOffIcon = () => (
  <svg xmlns="http://www.w3.org/2000/svg" width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
    <path d="M17.94 17.94A10.07 10.07 0 0 1 12 20c-7 0-11-8-11-8a18.45 18.45 0 0 1 5.06-5.94M9.9 4.24A9.12 9.12 0 0 1 12 4c7 0 11 8 11 8a18.5 18.5 0 0 1-2.16 3.19m-6.72-1.07a3 3 0 1 1-4.24-4.24"></path>
    <line x1="1" y1="1" x2="23" y2="23"></line>
  </svg>
);

export default function AccountSettings({ session }) {
  const navigate = useNavigate();
  const { communities, refreshCommunities, isGlobalAdmin } = useCommunity();

  const [emailLoading, setEmailLoading] = useState(false);
  const [passwordLoading, setPasswordLoading] = useState(false);
  
  const [newEmail, setNewEmail] = useState('');
  const [newPassword, setNewPassword] = useState('');
  const [confirmPassword, setConfirmPassword] = useState('');
  
  const [emailMsg, setEmailMsg] = useState({ text: '', type: '' });
  const [passwordMsg, setPasswordMsg] = useState({ text: '', type: '' });
  
  const [showNewPassword, setShowNewPassword] = useState(false);
  const [showConfirmPassword, setShowConfirmPassword] = useState(false);
  const [logoutCountdown, setLogoutCountdown] = useState(null);
  const countdownRef = useRef(null);

  // Account Deletion States
  const [showDeleteModal, setShowDeleteModal] = useState(false);
  const [deleteOption, setDeleteOption] = useState('anonymize');
  const [confirmInput, setConfirmInput] = useState('');
  const [deleteLoading, setDeleteLoading] = useState(false);
  const [deleteError, setDeleteError] = useState('');

  // Leave Single Community States
  const [selectedLeaveCommunity, setSelectedLeaveCommunity] = useState(null);
  const [leaveOption, setLeaveOption] = useState('anonymize');
  const [leaveConfirmInput, setLeaveConfirmInput] = useState('');
  const [leaveLoading, setLeaveLoading] = useState(false);
  const [leaveError, setLeaveError] = useState('');

  // Active Session Safeguard States
  const [userActiveSessions, setUserActiveSessions] = useState([]);
  const [communityMembersMap, setCommunityMembersMap] = useState({});
  const [sessionTransferTarget, setSessionTransferTarget] = useState({});
  const [fetchingSessions, setFetchingSessions] = useState(false);
  const [sessionActionMsg, setSessionActionMsg] = useState('');

  const fetchUserActiveSessions = async () => {
    if (!session?.user?.id) return;
    setFetchingSessions(true);
    setSessionActionMsg('');
    try {
      const { data, error } = await supabase
        .from('planning_sessions')
        .select('id, title, community_id, status, communities(name)')
        .eq('created_by', session.user.id)
        .neq('status', 'archived');

      if (error) throw error;
      setUserActiveSessions(data || []);

      if (data && data.length > 0) {
        const communityIds = [...new Set(data.map(s => s.community_id))];
        const { data: members, error: mErr } = await supabase
          .from('memberships')
          .select('community_id, user_id, profiles(user_id, display_name)')
          .in('community_id', communityIds)
          .eq('approved', true)
          .neq('user_id', session.user.id);

        if (!mErr && members) {
          const map = {};
          members.forEach(m => {
            if (!map[m.community_id]) map[m.community_id] = [];
            if (m.profiles && m.profiles.display_name) {
              map[m.community_id].push({
                user_id: m.user_id,
                display_name: m.profiles.display_name
              });
            }
          });
          setCommunityMembersMap(map);
        }
      }
    } catch (err) {
      console.error("Error fetching active sessions:", err);
    } finally {
      setFetchingSessions(false);
    }
  };

  const handleTransferSession = async (sessionId, newOwnerId) => {
    if (!sessionId || !newOwnerId) return;
    setSessionActionMsg('');
    try {
      const { error } = await supabase.rpc('transfer_planning_session_ownership', {
        p_session_id: sessionId,
        p_new_owner_id: newOwnerId
      });
      if (error) throw error;
      setUserActiveSessions(prev => prev.filter(s => s.id !== sessionId));
      setSessionActionMsg('Ownership transferred successfully.');
    } catch (err) {
      console.error("Transfer error:", err);
      alert(err.message || 'Failed to transfer ownership.');
    }
  };

  const handleArchiveSession = async (sessionId) => {
    if (!sessionId) return;
    setSessionActionMsg('');
    try {
      const { error } = await supabase
        .from('planning_sessions')
        .update({ status: 'archived', archived_at: new Date().toISOString() })
        .eq('id', sessionId);
      if (error) throw error;
      setUserActiveSessions(prev => prev.filter(s => s.id !== sessionId));
      setSessionActionMsg('Session archived successfully.');
    } catch (err) {
      console.error("Archive error:", err);
      alert(err.message || 'Failed to archive session.');
    }
  };

  useEffect(() => {
    if (logoutCountdown === null) return;
    if (logoutCountdown <= 0) {
      supabase.auth.signOut();
      return;
    }
    countdownRef.current = setTimeout(() => setLogoutCountdown(c => c - 1), 1000);
    return () => clearTimeout(countdownRef.current);
  }, [logoutCountdown]);

  const clearEmailForm = () => {
    setNewEmail('');
    setEmailMsg({ text: '', type: '' });
  };

  const clearPasswordForm = () => {
    setNewPassword('');
    setConfirmPassword('');
    setPasswordMsg({ text: '', type: '' });
    setShowNewPassword(false);
    setShowConfirmPassword(false);
  };

  const handleEmailUpdate = async (e) => {
    e.preventDefault();
    if (!newEmail) return;

    setEmailLoading(true);
    setEmailMsg({ text: '', type: '' });

    try {
      const { data, error } = await supabase.auth.updateUser({
        email: newEmail
      });

      if (error) throw error;
      
      setNewEmail('');
      setLogoutCountdown(5);
    } catch (err) {
      setEmailMsg({ text: err.message, type: 'error' });
    } finally {
      setEmailLoading(false);
    }
  };

  const handlePasswordUpdate = async (e) => {
    e.preventDefault();
    if (!newPassword || !confirmPassword) return;

    if (newPassword !== confirmPassword) {
      setPasswordMsg({ text: 'Passwords do not match.', type: 'error' });
      return;
    }

    if (newPassword.length < 6) {
      setPasswordMsg({ text: 'Password must be at least 6 characters.', type: 'error' });
      return;
    }

    setPasswordLoading(true);
    setPasswordMsg({ text: '', type: '' });

    try {
      const { data, error } = await supabase.auth.updateUser({
        password: newPassword
      });

      if (error) throw error;
      
      const pText = 'Your password has been successfully updated.';
      setPasswordMsg({ text: pText, type: 'success' });
      
      setNewPassword('');
      setConfirmPassword('');
    } catch (err) {
      setPasswordMsg({ text: err.message, type: 'error' });
    } finally {
      setPasswordLoading(false);
    }
  };

  const handleDeleteAccount = async (e) => {
    if (e) e.preventDefault();

    if (confirmInput.trim().toUpperCase() !== 'DELETE') {
      setDeleteError('Please type DELETE to confirm account deletion.');
      return;
    }

    setDeleteLoading(true);
    setDeleteError('');

    try {
      const { error } = await supabase.rpc('delete_own_account', { p_option: deleteOption });
      if (error) throw error;

      await clearSessionAndRedirect();
    } catch (err) {
      console.error("Failed to delete account:", err);
      setDeleteError(err.message || 'An error occurred while deleting your account.');
      setDeleteLoading(false);
    }
  };

  const handleLeaveCommunity = async (e) => {
    if (e) e.preventDefault();
    if (!selectedLeaveCommunity) return;

    if (leaveConfirmInput.trim().toUpperCase() !== 'LEAVE') {
      setLeaveError('Please type LEAVE to confirm leaving this community.');
      return;
    }

    setLeaveLoading(true);
    setLeaveError('');

    try {
      const { error } = await supabase.rpc('leave_community', {
        p_community_id: selectedLeaveCommunity.id,
        p_option: leaveOption
      });

      if (error) throw error;

      if (refreshCommunities) {
        await refreshCommunities();
      }

      setSelectedLeaveCommunity(null);
      setLeaveConfirmInput('');
      setLeaveError('');
    } catch (err) {
      console.error("Failed to leave community:", err);
      setLeaveError(err.message || 'An error occurred while leaving the community.');
    } finally {
      setLeaveLoading(false);
    }
  };

  return (
    <div className="content-container" style={{ maxWidth: '700px' }}>
      <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '2rem' }}>
        <h2 className="admin-title" style={{ margin: 0 }}>Account Settings</h2>
      </div>

      {isGlobalAdmin && (
        <div className="glass-panel" style={{ padding: '1rem 1.5rem', marginBottom: '2rem', display: 'flex', alignItems: 'center', gap: '0.75rem', backgroundColor: 'rgba(59, 130, 246, 0.12)', border: '1px solid rgba(59, 130, 246, 0.3)' }}>
          <span style={{ fontSize: '1.2rem' }}>🌐</span>
          <span style={{ fontSize: '0.9rem', color: '#ffffff', lineHeight: '1.4' }}>
            You are a <strong>Global Administrator</strong>. You have system-wide access to all communities by default.
          </span>
        </div>
      )}

      <div className="glass-panel" style={{ padding: '2rem', marginBottom: '2rem' }}>
        <h3 style={{ color: '#ffffff', borderBottom: '1px solid rgba(255,255,255,0.1)', paddingBottom: '0.5rem', marginBottom: '1.5rem', marginTop: 0 }}>
          Change Email Address
        </h3>
        
        <p style={{ fontSize: '0.85rem', color: 'rgba(255,255,255,0.6)', marginBottom: '0.75rem', marginTop: 0, lineHeight: '1.5' }}>
          A verification link will be sent to your <strong>new</strong> email. You will be signed out automatically so you can log back in safely with your current credentials.
        </p>
        {logoutCountdown !== null ? (
          <div style={{ 
            padding: '1rem', 
            marginBottom: '1.5rem', 
            borderRadius: '8px', 
            backgroundColor: 'var(--success-bg)',
            border: '1px solid var(--success-border)',
            lineHeight: '1.6'
          }}>
            <strong>✅ Verification email sent!</strong><br />
            Check your <strong>new</strong> email inbox and click the link to complete the change.<br />
            <span style={{ opacity: 0.8 }}>You will be signed out in <strong>{logoutCountdown}</strong> second{logoutCountdown !== 1 ? 's' : ''}. Log back in using your <strong>current email and password</strong>.</span>
          </div>
        ) : emailMsg.text ? (
          <div style={{ 
            padding: '1rem', 
            marginBottom: '1.5rem', 
            borderRadius: '8px', 
            backgroundColor: 'var(--error-bg)',
            border: '1px solid var(--error-border)'
          }}>
            {emailMsg.text}
          </div>
        ) : null}

        <form onSubmit={handleEmailUpdate} style={{ display: 'flex', flexDirection: 'column', gap: '1rem' }}>
          <div>
            <label style={{ display: 'block', marginBottom: '0.5rem', fontWeight: 'bold' }}>Current Email</label>
            <input 
              type="email" 
              value={session?.user?.email || ''} 
              disabled 
              className="admin-input" 
              style={{ opacity: 0.7, cursor: 'not-allowed' }}
            />
          </div>
          <div>
            <label style={{ display: 'block', marginBottom: '0.5rem', fontWeight: 'bold' }}>New Email Address</label>
            <input 
              type="email" 
              value={newEmail}
              onChange={(e) => setNewEmail(e.target.value)}
              required 
              className="admin-input" 
              placeholder="Enter new email"
            />
          </div>
          
          <div style={{ display: 'flex', justifyContent: 'center', gap: '1rem', marginTop: '1rem' }}>
            <button 
              type="submit" 
              disabled={emailLoading} 
              className="admin-pill-btn"
              style={{ background: '#47b260', border: 'none', color: '#fff' }}
            >
              {emailLoading ? 'Updating...' : 'Update Email'}
            </button>
            <button
              type="button"
              onClick={clearEmailForm}
              className="admin-pill-btn danger"
            >
              Clear
            </button>
          </div>
        </form>
      </div>

      <div className="glass-panel" style={{ padding: '2rem', marginBottom: '2rem' }}>
        <h3 style={{ color: '#ffffff', borderBottom: '1px solid rgba(255,255,255,0.1)', paddingBottom: '0.5rem', marginBottom: '1.5rem', marginTop: 0 }}>
          Change Password
        </h3>

        {passwordMsg.text && (
          <div style={{ 
            padding: '1rem', 
            marginBottom: '1.5rem', 
            borderRadius: '8px', 
            backgroundColor: passwordMsg.type === 'error' ? 'var(--error-bg)' : 'var(--success-bg)',
            border: '1px solid ' + (passwordMsg.type === 'error' ? 'var(--error-border)' : 'var(--success-border)')
          }}>
            {passwordMsg.text}
          </div>
        )}

        <form onSubmit={handlePasswordUpdate} style={{ display: 'flex', flexDirection: 'column', gap: '1rem' }}>
          <div>
            <label style={{ display: 'block', marginBottom: '0.5rem', fontWeight: 'bold' }}>New Password</label>
            <div style={{ position: 'relative' }}>
              <input 
                type={showNewPassword ? "text" : "password"}
                value={newPassword}
                onChange={(e) => setNewPassword(e.target.value)}
                required 
                minLength={6}
                className="admin-input" 
                placeholder="Enter new password"
                style={{ width: '100%', paddingRight: '2.5rem', boxSizing: 'border-box' }}
              />
              <button
                type="button"
                onClick={() => setShowNewPassword(!showNewPassword)}
                style={{ position: 'absolute', right: '10px', top: '50%', transform: 'translateY(-50%)', background: 'none', border: 'none', color: 'rgba(255,255,255,0.6)', cursor: 'pointer', display: 'flex', alignItems: 'center' }}
              >
                {showNewPassword ? <EyeIcon /> : <EyeOffIcon />}
              </button>
            </div>
          </div>
          <div>
            <label style={{ display: 'block', marginBottom: '0.5rem', fontWeight: 'bold' }}>Confirm New Password</label>
            <div style={{ position: 'relative' }}>
              <input 
                type={showConfirmPassword ? "text" : "password"}
                value={confirmPassword}
                onChange={(e) => setConfirmPassword(e.target.value)}
                required 
                minLength={6}
                className="admin-input" 
                placeholder="Confirm new password"
                style={{ width: '100%', paddingRight: '2.5rem', boxSizing: 'border-box' }}
              />
              <button
                type="button"
                onClick={() => setShowConfirmPassword(!showConfirmPassword)}
                style={{ position: 'absolute', right: '10px', top: '50%', transform: 'translateY(-50%)', background: 'none', border: 'none', color: 'rgba(255,255,255,0.6)', cursor: 'pointer', display: 'flex', alignItems: 'center' }}
              >
                {showConfirmPassword ? <EyeIcon /> : <EyeOffIcon />}
              </button>
            </div>
          </div>
          
          <div style={{ display: 'flex', justifyContent: 'center', gap: '1rem', marginTop: '1rem' }}>
            <button 
              type="submit" 
              disabled={passwordLoading} 
              className="admin-pill-btn"
              style={{ background: '#47b260', border: 'none', color: '#fff' }}
            >
              {passwordLoading ? 'Updating...' : 'Update Password'}
            </button>
            <button
              type="button"
              onClick={clearPasswordForm}
              className="admin-pill-btn danger"
            >
              Clear
            </button>
          </div>
        </form>
      </div>

      {/* My Communities Panel (Only shown for non-global admins belonging to >1 community) */}
      {!isGlobalAdmin && communities && communities.length > 1 && (
        <div className="glass-panel" style={{ padding: '2rem', marginBottom: '2rem' }}>
          <h3 style={{ color: '#ffffff', borderBottom: '1px solid rgba(255,255,255,0.1)', paddingBottom: '0.5rem', marginBottom: '1.5rem', marginTop: 0 }}>
            My Communities
          </h3>
          <p style={{ fontSize: '0.9rem', color: 'rgba(255,255,255,0.8)', marginBottom: '1.5rem', lineHeight: '1.5' }}>
            You are a member of multiple communities. You can leave an individual community below without closing your overall account.
          </p>

          <div style={{ display: 'flex', flexDirection: 'column', gap: '1rem' }}>
            {communities.map((comm) => (
              <div key={comm.id} style={{
                display: 'flex',
                justifyContent: 'space-between',
                alignItems: 'center',
                padding: '1rem',
                borderRadius: '8px',
                backgroundColor: 'rgba(255, 255, 255, 0.03)',
                border: '1px solid rgba(255, 255, 255, 0.1)',
                flexWrap: 'wrap',
                gap: '1rem'
              }}>
                <div>
                  <strong style={{ color: '#ffffff', fontSize: '1rem', display: 'block' }}>{comm.name}</strong>
                  <span style={{ fontSize: '0.85rem', color: 'rgba(255, 255, 255, 0.6)' }}>Approved Member</span>
                </div>
                <button
                  type="button"
                  onClick={() => {
                    setSelectedLeaveCommunity(comm);
                    setLeaveOption('anonymize');
                    setLeaveConfirmInput('');
                    setLeaveError('');
                    fetchUserActiveSessions();
                  }}
                  className="admin-pill-btn danger"
                >
                  Leave Community...
                </button>
              </div>
            ))}
          </div>
        </div>
      )}

      {/* Delete Account Panel */}
      <div className="glass-panel" style={{ padding: '2rem', marginBottom: '2rem' }}>
        <h3 style={{ color: '#ffffff', borderBottom: '1px solid rgba(255,255,255,0.1)', paddingBottom: '0.5rem', marginBottom: '1.5rem', marginTop: 0 }}>
          Delete Account
        </h3>

        <p style={{ fontSize: '0.9rem', color: 'rgba(255,255,255,0.8)', marginBottom: '1.5rem', lineHeight: '1.5' }}>
          Permanently delete your profile and account access across all communities. Choose what happens to your public community contributions below before proceeding.
        </p>

        <div style={{ display: 'flex', flexDirection: 'column', gap: '1rem', marginBottom: '1.5rem' }}>
          <label style={{ 
            display: 'flex', 
            alignItems: 'flex-start', 
            gap: '0.75rem', 
            padding: '1rem', 
            borderRadius: '8px', 
            backgroundColor: deleteOption === 'anonymize' ? 'rgba(239, 68, 68, 0.15)' : 'rgba(255, 255, 255, 0.03)', 
            border: '1px solid ' + (deleteOption === 'anonymize' ? 'rgba(239, 68, 68, 0.6)' : 'rgba(255, 255, 255, 0.1)'), 
            backdropFilter: deleteOption === 'anonymize' ? 'blur(8px)' : 'none',
            boxShadow: deleteOption === 'anonymize' ? '0 4px 12px rgba(239, 68, 68, 0.15)' : 'none',
            cursor: 'pointer',
            transition: 'all 0.2s ease'
          }}>
            <input 
              type="radio" 
              name="deleteOption" 
              value="anonymize" 
              checked={deleteOption === 'anonymize'} 
              onChange={() => setDeleteOption('anonymize')} 
              style={{ marginTop: '0.2rem', accentColor: '#ef4444' }}
            />
            <div>
              <strong style={{ color: '#ffffff', display: 'block', marginBottom: '0.25rem' }}>
                Keep my community contributions anonymized (Recommended)
              </strong>
              <span style={{ fontSize: '0.85rem', color: 'rgba(255, 255, 255, 0.7)', lineHeight: '1.4' }}>
                Deletes your profile details, contact information, and account login. Your posts and session notes remain visible credited to "Deleted User" so community discussions stay intact.
              </span>
            </div>
          </label>

          <label style={{ 
            display: 'flex', 
            alignItems: 'flex-start', 
            gap: '0.75rem', 
            padding: '1rem', 
            borderRadius: '8px', 
            backgroundColor: deleteOption === 'purge' ? 'rgba(239, 68, 68, 0.15)' : 'rgba(255, 255, 255, 0.03)', 
            border: '1px solid ' + (deleteOption === 'purge' ? 'rgba(239, 68, 68, 0.6)' : 'rgba(255, 255, 255, 0.1)'), 
            backdropFilter: deleteOption === 'purge' ? 'blur(8px)' : 'none',
            boxShadow: deleteOption === 'purge' ? '0 4px 12px rgba(239, 68, 68, 0.15)' : 'none',
            cursor: 'pointer',
            transition: 'all 0.2s ease'
          }}>
            <input 
              type="radio" 
              name="deleteOption" 
              value="purge" 
              checked={deleteOption === 'purge'} 
              onChange={() => setDeleteOption('purge')} 
              style={{ marginTop: '0.2rem', accentColor: '#ef4444' }}
            />
            <div>
              <strong style={{ color: '#ffffff', display: 'block', marginBottom: '0.25rem' }}>
                Delete all my posts, comments, and account data
              </strong>
              <span style={{ fontSize: '0.85rem', color: 'rgba(255, 255, 255, 0.7)', lineHeight: '1.4' }}>
                Completely erases all your posts, comments, likes, planning sessions, assigned tasks, profile details, and account login permanently.
              </span>
            </div>
          </label>
        </div>

        <div style={{ display: 'flex', justifyContent: 'center', gap: '1rem', marginTop: '1rem' }}>
          <button 
            type="button" 
            onClick={() => {
              setShowDeleteModal(true);
              setConfirmInput('');
              setDeleteError('');
              fetchUserActiveSessions();
            }}
            className="admin-pill-btn danger"
          >
            Delete Account...
          </button>
        </div>
      </div>

      {/* Leave Single Community Modal */}
      {selectedLeaveCommunity && (
        <div style={{
          position: 'fixed',
          top: 0,
          left: 0,
          right: 0,
          bottom: 0,
          backgroundColor: 'rgba(0, 0, 0, 0.75)',
          backdropFilter: 'blur(4px)',
          display: 'flex',
          justifyContent: 'center',
          alignItems: 'center',
          zIndex: 9999,
          padding: '1rem'
        }}>
          <div className="glass-panel" style={{
            maxWidth: '520px',
            width: '100%',
            maxHeight: '90vh',
            overflowY: 'auto',
            padding: '2rem',
            borderRadius: '12px',
            border: '1px solid rgba(255, 255, 255, 0.2)',
            boxShadow: '0 20px 25px -5px rgba(0, 0, 0, 0.5)'
          }}>
            <h3 style={{ color: '#ffffff', marginTop: 0, marginBottom: '1rem' }}>
              Leave {selectedLeaveCommunity.name}
            </h3>

            <p style={{ color: '#ffffff', fontSize: '0.95rem', lineHeight: '1.5', marginBottom: '1rem' }}>
              Choose what happens to your contributions in <strong>{selectedLeaveCommunity.name}</strong> before leaving.
            </p>

            {/* Active Sessions Safeguard Warning inside Leave Modal */}
            {leaveOption === 'purge' && userActiveSessions.filter(s => s.community_id === selectedLeaveCommunity.id).length > 0 && (
              <div style={{
                padding: '1rem',
                backgroundColor: 'rgba(245, 158, 11, 0.15)',
                border: '1px solid rgba(245, 158, 11, 0.5)',
                borderRadius: '8px',
                marginBottom: '1.25rem'
              }}>
                <strong style={{ color: '#f59e0b', display: 'flex', alignItems: 'center', gap: '0.5rem', marginBottom: '0.5rem' }}>
                  ⚠️ Active Planning Sessions Warning
                </strong>
                <p style={{ fontSize: '0.85rem', color: '#ffffff', margin: 0, lineHeight: '1.4' }}>
                  You are the creator of active planning sessions in <strong>{selectedLeaveCommunity.name}</strong>. Purging your contributions will erase these sessions and tasks for your team.
                </p>

                <button
                  type="button"
                  onClick={() => setLeaveOption('anonymize')}
                  className="admin-pill-btn"
                  style={{ marginTop: '0.75rem', backgroundColor: 'rgba(255,255,255,0.15)', color: '#fff', fontSize: '0.8rem' }}
                >
                  ✨ Switch to Anonymize Mode (Preserves Sessions)
                </button>

                {sessionActionMsg && (
                  <div style={{ marginTop: '0.5rem', color: '#34d399', fontSize: '0.8rem' }}>
                    ✅ {sessionActionMsg}
                  </div>
                )}

                <div style={{ marginTop: '1rem', display: 'flex', flexDirection: 'column', gap: '0.75rem' }}>
                  {userActiveSessions.filter(s => s.community_id === selectedLeaveCommunity.id).map(sess => (
                    <div key={sess.id} style={{
                      padding: '0.75rem',
                      backgroundColor: 'rgba(0, 0, 0, 0.3)',
                      borderRadius: '6px',
                      fontSize: '0.85rem'
                    }}>
                      <div style={{ fontWeight: 'bold', color: '#ffffff', marginBottom: '0.5rem' }}>{sess.title}</div>
                      <div style={{ display: 'flex', gap: '0.5rem', flexWrap: 'wrap', alignItems: 'center' }}>
                        {communityMembersMap[sess.community_id] && communityMembersMap[sess.community_id].length > 0 ? (
                          <>
                            <select
                              value={sessionTransferTarget[sess.id] || ''}
                              onChange={(e) => setSessionTransferTarget(prev => ({ ...prev, [sess.id]: e.target.value }))}
                              style={{
                                padding: '0.35rem 0.5rem',
                                borderRadius: '4px',
                                backgroundColor: 'rgba(255,255,255,0.1)',
                                color: '#fff',
                                border: '1px solid rgba(255,255,255,0.2)',
                                fontSize: '0.8rem'
                              }}
                            >
                              <option value="" style={{ color: '#000' }}>Select new owner...</option>
                              {communityMembersMap[sess.community_id].map(m => (
                                <option key={m.user_id} value={m.user_id} style={{ color: '#000' }}>
                                  {m.display_name}
                                </option>
                              ))}
                            </select>
                            <button
                              type="button"
                              disabled={!sessionTransferTarget[sess.id]}
                              onClick={() => handleTransferSession(sess.id, sessionTransferTarget[sess.id])}
                              className="admin-pill-btn"
                              style={{ padding: '0.35rem 0.75rem', fontSize: '0.75rem' }}
                            >
                              Transfer Ownership
                            </button>
                          </>
                        ) : (
                          <span style={{ fontSize: '0.75rem', color: 'rgba(255,255,255,0.5)' }}>No other members</span>
                        )}

                        <button
                          type="button"
                          onClick={() => handleArchiveSession(sess.id)}
                          className="admin-pill-btn danger"
                          style={{ padding: '0.35rem 0.75rem', fontSize: '0.75rem' }}
                        >
                          Archive Session
                        </button>
                      </div>
                    </div>
                  ))}
                </div>
              </div>
            )}

            <div style={{ display: 'flex', flexDirection: 'column', gap: '1rem', marginBottom: '1.5rem' }}>
              <label style={{ 
                display: 'flex', 
                alignItems: 'flex-start', 
                gap: '0.75rem', 
                padding: '1rem', 
                borderRadius: '8px', 
                backgroundColor: leaveOption === 'anonymize' ? 'rgba(239, 68, 68, 0.15)' : 'rgba(255, 255, 255, 0.03)', 
                border: '1px solid ' + (leaveOption === 'anonymize' ? 'rgba(239, 68, 68, 0.6)' : 'rgba(255, 255, 255, 0.1)'), 
                backdropFilter: leaveOption === 'anonymize' ? 'blur(8px)' : 'none',
                boxShadow: leaveOption === 'anonymize' ? '0 4px 12px rgba(239, 68, 68, 0.15)' : 'none',
                cursor: 'pointer',
                transition: 'all 0.2s ease'
              }}>
                <input 
                  type="radio" 
                  name="leaveOption" 
                  value="anonymize" 
                  checked={leaveOption === 'anonymize'} 
                  onChange={() => setLeaveOption('anonymize')} 
                  style={{ marginTop: '0.2rem', accentColor: '#ef4444' }}
                />
                <div>
                  <strong style={{ color: '#ffffff', display: 'block', marginBottom: '0.25rem' }}>
                    Keep my contributions in this community anonymized (Recommended)
                  </strong>
                  <span style={{ fontSize: '0.85rem', color: 'rgba(255, 255, 255, 0.7)', lineHeight: '1.4' }}>
                    Your posts and session notes in {selectedLeaveCommunity.name} remain visible credited to "Deleted User".
                  </span>
                </div>
              </label>

              <label style={{ 
                display: 'flex', 
                alignItems: 'flex-start', 
                gap: '0.75rem', 
                padding: '1rem', 
                borderRadius: '8px', 
                backgroundColor: leaveOption === 'purge' ? 'rgba(239, 68, 68, 0.15)' : 'rgba(255, 255, 255, 0.03)', 
                border: '1px solid ' + (leaveOption === 'purge' ? 'rgba(239, 68, 68, 0.6)' : 'rgba(255, 255, 255, 0.1)'), 
                backdropFilter: leaveOption === 'purge' ? 'blur(8px)' : 'none',
                boxShadow: leaveOption === 'purge' ? '0 4px 12px rgba(239, 68, 68, 0.15)' : 'none',
                cursor: 'pointer',
                transition: 'all 0.2s ease'
              }}>
                <input 
                  type="radio" 
                  name="leaveOption" 
                  value="purge" 
                  checked={leaveOption === 'purge'} 
                  onChange={() => setLeaveOption('purge')} 
                  style={{ marginTop: '0.2rem', accentColor: '#ef4444' }}
                />
                <div>
                  <strong style={{ color: '#ffffff', display: 'block', marginBottom: '0.25rem' }}>
                    Delete all my posts and comments in this community
                  </strong>
                  <span style={{ fontSize: '0.85rem', color: 'rgba(255, 255, 255, 0.7)', lineHeight: '1.4' }}>
                    Completely erases all your posts, comments, likes, and planning sessions created inside {selectedLeaveCommunity.name}.
                  </span>
                </div>
              </label>
            </div>

            {leaveError && (
              <div style={{
                padding: '0.75rem 1rem',
                marginBottom: '1rem',
                borderRadius: '6px',
                backgroundColor: 'var(--error-bg)',
                border: '1px solid var(--error-border)',
                color: '#f87171',
                fontSize: '0.85rem'
              }}>
                {leaveError}
              </div>
            )}

            <form onSubmit={handleLeaveCommunity}>
              <label style={{ display: 'block', marginBottom: '0.5rem', fontSize: '0.9rem', color: 'rgba(255, 255, 255, 0.8)' }}>
                Type <strong>LEAVE</strong> to confirm:
              </label>
              <input 
                type="text" 
                value={leaveConfirmInput}
                onChange={(e) => setLeaveConfirmInput(e.target.value)}
                placeholder="Type LEAVE"
                required
                className="admin-input"
                style={{ width: '100%', marginBottom: '1.5rem', boxSizing: 'border-box' }}
                disabled={leaveLoading}
              />

              <div style={{ display: 'flex', justifyContent: 'center', gap: '1rem' }}>
                <button
                  type="button"
                  onClick={() => setSelectedLeaveCommunity(null)}
                  disabled={leaveLoading}
                  className="admin-pill-btn"
                  style={{ backgroundColor: 'rgba(255, 255, 255, 0.1)', color: '#ffffff', border: 'none' }}
                >
                  Cancel
                </button>
                <button
                  type="submit"
                  disabled={leaveLoading || leaveConfirmInput.trim().toUpperCase() !== 'LEAVE'}
                  className="admin-pill-btn danger"
                  style={{
                    cursor: (leaveLoading || leaveConfirmInput.trim().toUpperCase() !== 'LEAVE') ? 'not-allowed' : 'pointer',
                    opacity: (leaveLoading || leaveConfirmInput.trim().toUpperCase() !== 'LEAVE') ? 0.6 : 1
                  }}
                >
                  {leaveLoading ? 'Leaving...' : 'Leave Community'}
                </button>
              </div>
            </form>
          </div>
        </div>
      )}

      {/* Account Deletion Confirmation Modal */}
      {showDeleteModal && (
        <div style={{
          position: 'fixed',
          top: 0,
          left: 0,
          right: 0,
          bottom: 0,
          backgroundColor: 'rgba(0, 0, 0, 0.75)',
          backdropFilter: 'blur(4px)',
          display: 'flex',
          justifyContent: 'center',
          alignItems: 'center',
          zIndex: 9999,
          padding: '1rem'
        }}>
          <div className="glass-panel" style={{
            maxWidth: '520px',
            width: '100%',
            maxHeight: '90vh',
            overflowY: 'auto',
            padding: '2rem',
            borderRadius: '12px',
            border: '1px solid rgba(255, 255, 255, 0.2)',
            boxShadow: '0 20px 25px -5px rgba(0, 0, 0, 0.5)'
          }}>
            <h3 style={{ color: '#ffffff', marginTop: 0, marginBottom: '1rem' }}>
              Confirm Account Deletion
            </h3>

            <p style={{ color: '#ffffff', fontSize: '0.95rem', lineHeight: '1.5', marginBottom: '1rem' }}>
              Are you sure you want to delete your account? This action is <strong>irreversible</strong> and will immediately log you out.
            </p>

            <div style={{
              padding: '0.75rem 1rem',
              backgroundColor: 'rgba(255, 255, 255, 0.08)',
              borderLeft: '4px solid #ffffff',
              borderRadius: '4px',
              fontSize: '0.85rem',
              color: '#ffffff',
              marginBottom: '1.25rem'
            }}>
              <strong>Selected Mode:</strong> {deleteOption === 'anonymize' ? 'Anonymize contributions (credited to "Deleted User")' : 'Completely purge all posts, comments, and sessions'}
            </div>

            {/* Active Sessions Safeguard Warning inside Delete Account Modal */}
            {deleteOption === 'purge' && userActiveSessions.length > 0 && (
              <div style={{
                padding: '1rem',
                backgroundColor: 'rgba(245, 158, 11, 0.15)',
                border: '1px solid rgba(245, 158, 11, 0.5)',
                borderRadius: '8px',
                marginBottom: '1.25rem'
              }}>
                <strong style={{ color: '#f59e0b', display: 'flex', alignItems: 'center', gap: '0.5rem', marginBottom: '0.5rem' }}>
                  ⚠️ Active Planning Sessions Warning
                </strong>
                <p style={{ fontSize: '0.85rem', color: '#ffffff', margin: 0, lineHeight: '1.4' }}>
                  You are the creator of <strong>{userActiveSessions.length} active planning session{userActiveSessions.length !== 1 ? 's' : ''}</strong>. Purging your account will permanently delete these sessions and assigned tasks for your team.
                </p>

                <button
                  type="button"
                  onClick={() => setDeleteOption('anonymize')}
                  className="admin-pill-btn"
                  style={{ marginTop: '0.75rem', backgroundColor: 'rgba(255,255,255,0.15)', color: '#fff', fontSize: '0.8rem' }}
                >
                  ✨ Switch to Anonymize Mode (Preserves Sessions)
                </button>

                {sessionActionMsg && (
                  <div style={{ marginTop: '0.5rem', color: '#34d399', fontSize: '0.8rem' }}>
                    ✅ {sessionActionMsg}
                  </div>
                )}

                <div style={{ marginTop: '1rem', display: 'flex', flexDirection: 'column', gap: '0.75rem' }}>
                  {userActiveSessions.map(sess => (
                    <div key={sess.id} style={{
                      padding: '0.75rem',
                      backgroundColor: 'rgba(0, 0, 0, 0.3)',
                      borderRadius: '6px',
                      fontSize: '0.85rem'
                    }}>
                      <div style={{ fontWeight: 'bold', color: '#ffffff' }}>{sess.title}</div>
                      <div style={{ fontSize: '0.75rem', color: 'rgba(255,255,255,0.6)', marginBottom: '0.5rem' }}>
                        Community: {sess.communities?.name || 'General'}
                      </div>

                      <div style={{ display: 'flex', gap: '0.5rem', flexWrap: 'wrap', alignItems: 'center' }}>
                        {communityMembersMap[sess.community_id] && communityMembersMap[sess.community_id].length > 0 ? (
                          <>
                            <select
                              value={sessionTransferTarget[sess.id] || ''}
                              onChange={(e) => setSessionTransferTarget(prev => ({ ...prev, [sess.id]: e.target.value }))}
                              style={{
                                padding: '0.35rem 0.5rem',
                                borderRadius: '4px',
                                backgroundColor: 'rgba(255,255,255,0.1)',
                                color: '#fff',
                                border: '1px solid rgba(255,255,255,0.2)',
                                fontSize: '0.8rem'
                              }}
                            >
                              <option value="" style={{ color: '#000' }}>Select new owner...</option>
                              {communityMembersMap[sess.community_id].map(m => (
                                <option key={m.user_id} value={m.user_id} style={{ color: '#000' }}>
                                  {m.display_name}
                                </option>
                              ))}
                            </select>
                            <button
                              type="button"
                              disabled={!sessionTransferTarget[sess.id]}
                              onClick={() => handleTransferSession(sess.id, sessionTransferTarget[sess.id])}
                              className="admin-pill-btn"
                              style={{ padding: '0.35rem 0.75rem', fontSize: '0.75rem' }}
                            >
                              Transfer Ownership
                            </button>
                          </>
                        ) : (
                          <span style={{ fontSize: '0.75rem', color: 'rgba(255,255,255,0.5)' }}>No other members</span>
                        )}

                        <button
                          type="button"
                          onClick={() => handleArchiveSession(sess.id)}
                          className="admin-pill-btn danger"
                          style={{ padding: '0.35rem 0.75rem', fontSize: '0.75rem' }}
                        >
                          Archive Session
                        </button>
                      </div>
                    </div>
                  ))}
                </div>
              </div>
            )}

            {deleteError && (
              <div style={{
                padding: '0.75rem 1rem',
                marginBottom: '1rem',
                borderRadius: '6px',
                backgroundColor: 'var(--error-bg)',
                border: '1px solid var(--error-border)',
                color: '#f87171',
                fontSize: '0.85rem'
              }}>
                {deleteError}
              </div>
            )}

            <form onSubmit={handleDeleteAccount}>
              <label style={{ display: 'block', marginBottom: '0.5rem', fontSize: '0.9rem', color: 'rgba(255, 255, 255, 0.8)' }}>
                Type <strong>DELETE</strong> to confirm:
              </label>
              <input 
                type="text" 
                value={confirmInput}
                onChange={(e) => setConfirmInput(e.target.value)}
                placeholder="Type DELETE"
                required
                className="admin-input"
                style={{ width: '100%', marginBottom: '1.5rem', boxSizing: 'border-box' }}
                disabled={deleteLoading}
              />

              <div style={{ display: 'flex', justifyContent: 'center', gap: '1rem' }}>
                <button
                  type="button"
                  onClick={() => setShowDeleteModal(false)}
                  disabled={deleteLoading}
                  className="admin-pill-btn"
                  style={{ backgroundColor: 'rgba(255, 255, 255, 0.1)', color: '#ffffff', border: 'none' }}
                >
                  Cancel
                </button>
                <button
                  type="submit"
                  disabled={deleteLoading || confirmInput.trim().toUpperCase() !== 'DELETE'}
                  className="admin-pill-btn danger"
                  style={{
                    cursor: (deleteLoading || confirmInput.trim().toUpperCase() !== 'DELETE') ? 'not-allowed' : 'pointer',
                    opacity: (deleteLoading || confirmInput.trim().toUpperCase() !== 'DELETE') ? 0.6 : 1
                  }}
                >
                  {deleteLoading ? 'Deleting Account...' : 'Permanently Delete My Account'}
                </button>
              </div>
            </form>
          </div>
        </div>
      )}
      
    </div>
  );
}

