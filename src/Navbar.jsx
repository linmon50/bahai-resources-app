import React, { useState } from "react";
import { Link, useNavigate, useLocation } from "react-router-dom";
import supabase from "./supabaseClient";

export default function Navbar({ session, isAdmin }) {
    const navigate = useNavigate();
    const location = useLocation();
    const [menuOpen, setMenuOpen] = useState(false);

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
