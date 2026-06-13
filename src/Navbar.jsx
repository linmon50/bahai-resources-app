import React, { useState } from "react";
import { Link, useNavigate, useLocation } from "react-router-dom";
import supabase from "./supabaseClient";
import { useCommunity } from "./context/CommunityContext";
import CustomSelect from "./components/CustomSelect";
import NotificationMenu from "./components/NotificationMenu";

// ── Icons ──────────────────────────────────────────────────────────────────
const HomeIcon = () => (
    <svg aria-hidden="true" focusable="false" width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
        <path d="M12 22v-5"/><path d="M9 8V2h6v6"/><path d="M17 17H7l1-9h8l1 9z"/>
    </svg>
);
const DirectoryIcon = () => (
    <svg aria-hidden="true" focusable="false" width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
        <path d="M16 21v-2a4 4 0 0 0-4-4H6a4 4 0 0 0-4 4v2"/><circle cx="9" cy="7" r="4"/><path d="M22 21v-2a4 4 0 0 0-3-3.87"/><path d="M16 3.13a4 4 0 0 1 0 7.75"/>
    </svg>
);
const PlanningIcon = () => (
    <svg aria-hidden="true" focusable="false" width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
        <rect x="3" y="4" width="18" height="18" rx="2" ry="2"/><line x1="16" y1="2" x2="16" y2="6"/><line x1="8" y1="2" x2="8" y2="6"/><line x1="3" y1="10" x2="21" y2="10"/><path d="m9 16 2 2 4-4"/>
    </svg>
);
const ProfileIcon = () => (
    <svg aria-hidden="true" focusable="false" width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
        <path d="M19 21v-2a4 4 0 0 0-4-4H9a4 4 0 0 0-4 4v2"/><circle cx="12" cy="7" r="4"/>
    </svg>
);
const SettingsIcon = () => (
    <svg aria-hidden="true" focusable="false" width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
        <circle cx="12" cy="12" r="3"/><path d="M19.4 15a1.65 1.65 0 0 0 .33 1.82l.06.06a2 2 0 0 1 0 2.83 2 2 0 0 1-2.83 0l-.06-.06a1.65 1.65 0 0 0-1.82-.33 1.65 1.65 0 0 0-1 1.51V21a2 2 0 0 1-2 2 2 2 0 0 1-2-2v-.09A1.65 1.65 0 0 0 9 19.4a1.65 1.65 0 0 0-1.82.33l-.06.06a2 2 0 0 1-2.83 0 2 2 0 0 1 0-2.83l.06-.06a1.65 1.65 0 0 0 .33-1.82 1.65 1.65 0 0 0-1.51-1H3a2 2 0 0 1-2-2 2 2 0 0 1 2-2h.09A1.65 1.65 0 0 0 4.6 9a1.65 1.65 0 0 0-.33-1.82l-.06-.06a2 2 0 0 1 0-2.83 2 2 0 0 1 2.83 0l.06.06a1.65 1.65 0 0 0 1.82.33H9a1.65 1.65 0 0 0 1-1.51V3a2 2 0 0 1 2-2 2 2 0 0 1 2 2v.09a1.65 1.65 0 0 0 1 1.51 1.65 1.65 0 0 0 1.82-.33l.06-.06a2 2 0 0 1 2.83 0 2 2 0 0 1 0 2.83l-.06.06a1.65 1.65 0 0 0-.33 1.82V9a1.65 1.65 0 0 0 1.51 1H21a2 2 0 0 1 2 2 2 2 0 0 1-2 2h-.09a1.65 1.65 0 0 0-1.51 1z"/>
    </svg>
);
const AdminIcon = () => (
    <svg aria-hidden="true" focusable="false" width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
        <path d="M12 22s8-4 8-10V5l-8-3-8 3v7c0 6 8 10 8 10z"/>
    </svg>
);
const SignOutIcon = () => (
    <svg aria-hidden="true" focusable="false" width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
        <path d="M9 21H5a2 2 0 0 1-2-2V5a2 2 0 0 1 2-2h4"/><polyline points="16 17 21 12 16 7"/><line x1="21" y1="12" x2="9" y2="12"/>
    </svg>
);

export default function Navbar({ session, isAdmin }) {
    const navigate = useNavigate();
    const location = useLocation();
    const [menuOpen, setMenuOpen] = useState(false);
    const { communities, activeCommunityId, setActiveCommunityId } = useCommunity();

    const handleSignOut = async () => {
        await supabase.auth.signOut();
        navigate("/");
        setMenuOpen(false);
    };

    const navLinkClass = (path) =>
        `nav-link${location.pathname === path ? " nav-link--active" : ""}`;

    const closeMenu = () => setMenuOpen(false);

    return (
        <nav className="navbar" aria-label="Main navigation">
            {/* Logo */}
            <div className="navbar-logo">The Columbus Baha'i<br />Resource App</div>

            {/* Global Community Switcher (only for multiple communities) */}
            {communities.length > 1 && (
                <div className="navbar-community-switcher" style={{ padding: "0 1.5rem", marginBottom: "1.5rem" }}>
                    <label style={{ 
                        display: 'block', 
                        fontSize: '0.75rem', 
                        color: isAdmin ? 'var(--admin-accent)' : 'var(--auth-text-light-blue)', 
                        textTransform: 'uppercase', 
                        letterSpacing: '0.05em',
                        marginBottom: '0.5rem',
                        fontWeight: 'bold'
                    }}>{isAdmin ? "Active Community" : "Your Community"}</label>
                    <CustomSelect
                        value={activeCommunityId}
                        onChange={(e) => setActiveCommunityId(e.target.value)}
                        options={communities.map(c => ({ value: c.id, label: c.name }))}
                        style={{ width: '100%' }}
                    />
                </div>
            )}

            {/* Hamburger button + Mobile Actions */}
            <div className="navbar-mobile-actions">
                <NotificationMenu session={session} />
                <button
                    className="navbar-hamburger"
                    aria-label={menuOpen ? "Close menu" : "Open menu"}
                    aria-expanded={menuOpen}
                    aria-controls="navbar-menu"
                    onClick={() => setMenuOpen(prev => !prev)}
                >
                    <span className={`hamburger-bar${menuOpen ? " open" : ""}`} />
                    <span className={`hamburger-bar${menuOpen ? " open" : ""}`} />
                    <span className={`hamburger-bar${menuOpen ? " open" : ""}`} />
                </button>
            </div>

            {/* Nav links */}
            <div
                id="navbar-menu"
                className={`navbar-links${menuOpen ? " navbar-links--open" : ""}`}
            >
                <Link to="/" className={navLinkClass("/")} onClick={closeMenu}>
                    <HomeIcon /> Bulletin Board
                </Link>
                {session && (
                    <>
                        <Link to="/directory" className={navLinkClass("/directory")} onClick={closeMenu}>
                            <DirectoryIcon /> Directory
                        </Link>
                        <Link to="/planning" className={navLinkClass("/planning")} onClick={closeMenu}>
                            <PlanningIcon /> Planning
                        </Link>
                        {isAdmin && (
                            <Link
                                to="/admin/members"
                                className={navLinkClass("/admin/members")}
                                onClick={closeMenu}
                                style={{ paddingRight: '1.5rem' }}
                            >
                                <AdminIcon /> Member Management
                            </Link>
                        )}

                        <div className="nav-divider" />

                        <Link to="/profile" className={navLinkClass("/profile")} onClick={closeMenu}>
                            <ProfileIcon /> My Profile
                        </Link>
                        <Link to="/settings" className={navLinkClass("/settings")} onClick={closeMenu}>
                            <SettingsIcon /> Account Settings
                        </Link>
                        <button onClick={handleSignOut} className="nav-link nav-btn">
                            <SignOutIcon /> Sign Out
                        </button>
                    </>
                )}
            </div>
        </nav>
    );
}
