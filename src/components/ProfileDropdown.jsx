import React, { useState, useEffect, useRef } from 'react';
import { useNavigate, Link } from 'react-router-dom';
import supabase from '../supabaseClient';
import NotificationMenu from './NotificationMenu';
import { getInitials, getAvatarColor } from '../utils/avatarUtils';

const ChevronDown = () => (
    <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.5" strokeLinecap="round" strokeLinejoin="round">
        <polyline points="6 9 12 15 18 9" />
    </svg>
);

export default function ProfileDropdown({ session, isAdmin }) {
    const navigate = useNavigate();
    const [isOpen, setIsOpen] = useState(false);
    const [profile, setProfile] = useState(null);
    const dropdownRef = useRef(null);

    useEffect(() => {
        if (session?.user?.id) {
            fetchProfile();
        }

        const handleProfileUpdate = (event) => {
            if (event.detail) {
                setProfile(prev => ({
                    ...prev,
                    display_name: event.detail.display_name,
                    avatar_url: event.detail.avatar_url
                }));
            }
        };

        window.addEventListener('profileUpdated', handleProfileUpdate);

        return () => {
            window.removeEventListener('profileUpdated', handleProfileUpdate);
        };
    }, [session]);

    const fetchProfile = async () => {
        const { data, error } = await supabase
            .from('profiles')
            .select('display_name, avatar_url')
            .eq('user_id', session.user.id)
            .single();
        
        if (!error && data) {
            setProfile(data);
        }
    };

    useEffect(() => {
        function handleClickOutside(event) {
            if (dropdownRef.current && !dropdownRef.current.contains(event.target)) {
                setIsOpen(false);
            }
        }
        document.addEventListener('mousedown', handleClickOutside);
        return () => document.removeEventListener('mousedown', handleClickOutside);
    }, []);

    const handleSignOut = async () => {
        await supabase.auth.signOut();
        navigate('/');
    };

    return (
        <div className="profile-top-nav">
            <div className="nav-icon-group desktop-only">
                <NotificationMenu session={session} />
                <div className="nav-v-separator" />
            </div>

            <div className="profile-dropdown-container" ref={dropdownRef}>
                <button 
                    className="profile-trigger" 
                    onClick={() => setIsOpen(!isOpen)}
                    aria-expanded={isOpen}
                    aria-haspopup="true"
                >
                    <div 
                        className="profile-avatar"
                        style={!profile?.avatar_url ? { background: getAvatarColor(profile?.display_name || session?.user?.email) } : {}}
                    >
                        {profile?.avatar_url ? (
                            <img src={profile.avatar_url} alt="" />
                        ) : (
                            <span>{getInitials(profile?.display_name || session?.user?.email)}</span>
                        )}
                    </div>
                    <div className="profile-info">
                        <div className="profile-name">{profile?.display_name || 'My Account'}</div>
                        <div className="profile-role">{isAdmin ? 'Admin' : 'Member'}</div>
                    </div>
                    <div className={`profile-chevron ${isOpen ? 'open' : ''}`}>
                        <ChevronDown />
                    </div>
                </button>

                {isOpen && (
                    <ul className="custom-select-dropdown profile-dropdown-menu">
                        <li className="custom-select-option">
                            <Link to="/profile" onClick={() => setIsOpen(false)}>My Profile</Link>
                        </li>
                        <li className="custom-select-option">
                            <Link to="/settings" onClick={() => setIsOpen(false)}>Account Settings</Link>
                        </li>
                        <li className="menu-divider" />
                        <li className="custom-select-option">
                            <button onClick={handleSignOut}>Sign Out</button>
                        </li>
                    </ul>
                )}
            </div>
        </div>
    );
}
