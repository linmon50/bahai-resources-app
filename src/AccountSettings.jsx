import React, { useState, useEffect, useRef } from 'react';
import supabase from './supabaseClient';
import { useNavigate } from 'react-router-dom';

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

  return (
    <div style={{ width: '100%', maxWidth: '700px', margin: '2rem auto', padding: '0 1rem', color: 'white', boxSizing: 'border-box' }}>
      <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '2rem' }}>
        <h2 className="admin-title" style={{ margin: 0 }}>Account Settings</h2>
      </div>

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
      
    </div>
  );
}
