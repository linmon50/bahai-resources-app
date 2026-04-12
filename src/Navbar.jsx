import React, { useState } from "react";
import { Link, useNavigate, useLocation } from "react-router-dom";
import supabase from "./supabaseClient";
import { useCommunity } from "./context/CommunityContext";
import CustomSelect from "./components/CustomSelect";

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

            {/* Hamburger button — visible only on mobile */}
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

            {/* Nav links */}
            <div
                id="navbar-menu"
                className={`navbar-links${menuOpen ? " navbar-links--open" : ""}`}
            >
                <Link to="/" className={navLinkClass("/")} onClick={closeMenu}>Home</Link>
                {session && (
                    <>
                        <Link to="/directory" className={navLinkClass("/directory")} onClick={closeMenu}>Directory</Link>

                        <Link to="/profile" className={navLinkClass("/profile")} onClick={closeMenu}>My Profile</Link>
                        {isAdmin && (
                            <Link
                                to="/admin/members"
                                className={navLinkClass("/admin/members")}
                                onClick={closeMenu}
                            >
                                Member Management
                            </Link>
                        )}
                        <button onClick={handleSignOut} className="nav-link nav-btn">
                            Sign Out
                        </button>
                    </>
                )}
            </div>
        </nav>
    );
}
