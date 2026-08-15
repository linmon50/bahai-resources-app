import React from 'react';

const LockoutNotice = ({ remaining }) => {
  return (
    <div className="lockout-notice" style={{
      background: 'rgba(255,0,0,0.1)',
      border: '1px solid #ff4d4f',
      color: '#ff4d4f',
      padding: '0.75rem 1rem',
      borderRadius: '4px',
      marginBottom: '1rem',
      textAlign: 'center',
      fontWeight: '500'
    }}>
      Too many failed login attempts. Please try again in {remaining} minute{remaining === 1 ? '' : 's'}.
    </div>
  );
};

export default LockoutNotice;
