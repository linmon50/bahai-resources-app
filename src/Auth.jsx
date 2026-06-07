import React, { useState, useEffect, useRef } from "react";
import supabase from "./supabaseClient";
import { useNavigate } from "react-router-dom";
import CustomSelect from "./components/CustomSelect";

// Which "view" we are showing
// 'login' | 'signup' | 'forgot' | 'forgot_sent'
export default function Auth() {
    const [view, setView] = useState("login");
    const [email, setEmail] = useState("");
    const [password, setPassword] = useState("");
    const [confirmPassword, setConfirmPassword] = useState("");
    const [inviteCode, setInviteCode] = useState("");
    const [zipCode, setZipCode] = useState("");
    const [intro, setIntro] = useState("");
    const [communityId, setCommunityId] = useState("");
    const [allCommunities, setAllCommunities] = useState([]);
    const [message, setMessage] = useState({ text: "", isError: true });
    const [loading, setLoading] = useState(false);
    const [requiresPassword, setRequiresPassword] = useState(false);
    const navigate = useNavigate();

    useEffect(() => {
        if (view === "request_invite") {
            fetchCommunities();
        }
    }, [view]);

    async function fetchCommunities() {
        const { data } = await supabase.from("communities").select("id, name, zip_codes");
        setAllCommunities(data || []);
    }

    const matchedCommunities = allCommunities.filter(c =>
        c.zip_codes && Array.isArray(c.zip_codes) && c.zip_codes.includes(zipCode)
    );

    const setError = (text) => setMessage({ text, isError: true });
    const setSuccess = (text) => setMessage({ text, isError: false });

    const reset = (nextView) => {
        setView(nextView);
        setMessage({ text: "", isError: true });
        setPassword("");
        setConfirmPassword("");
        setZipCode("");
        setIntro("");
        setCommunityId("");
        setRequiresPassword(false);
    };

    // --- LOGIN ---
    const handleLogin = async (e) => {
        e.preventDefault();
        setLoading(true);
        setMessage({ text: "", isError: true });
        try {
            const { error } = await supabase.auth.signInWithPassword({ email, password });
            if (error) throw error;
            navigate("/");
        } catch (err) {
            setError(err.message || "Login failed.");
        } finally {
            setLoading(false);
        }
    };

    // --- SIGNUP ---
    const handleSignup = async (e) => {
        e.preventDefault();
        if (password !== confirmPassword) {
            setError("Passwords do not match.");
            return;
        }
        if (password.length < 8) {
            setError("Password must be at least 8 characters.");
            return;
        }
        if (!inviteCode) {
            setError("An invite code is required to sign up.");
            return;
        }

        const cleanCode = inviteCode.trim();
        const cleanEmail = email.trim();

        setLoading(true);
        setMessage({ text: "", isError: "" });
        try {
            // 0. Pre-validate the invite code BEFORE creating an account or logging in
            const { data: validationResult, error: valError } = await supabase.rpc(
                "validate_invite_pre_signup",
                { p_code: cleanCode, p_email: cleanEmail }
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

            // 1. Attempt Sign Up
            const { data: signUpData, error: signUpError } = await supabase.auth.signUp({
                email: cleanEmail,
                password,
                options: {
                    data: { display_name: cleanEmail.split('@')[0] } // Default display name
                }
            });
            
            // 0.5 Save invite code to sessionStorage so App.jsx can consume it after session refresh
            sessionStorage.setItem('pending_invite_code', cleanCode);

            if (signUpError) {
                const msg = signUpError.message?.toLowerCase() || "";
                if (msg.includes("already registered") || signUpError.status === 422) {
                    // User exists, try to Sign In instead
                    const { error: signInError } = await supabase.auth.signInWithPassword({ email: cleanEmail, password });
                    if (signInError) {
                        if (signInError.message?.toLowerCase().includes("invalid login credentials")) {
                            throw new Error("This email is already registered. Please use the correct password for your existing account to apply the invite code.");
                        }
                        throw signInError;
                    }
                } else {
                    throw signUpError;
                }
            } else {
                // New user flow - Ensure session is established
                const { data: { session: currentSession } } = await supabase.auth.getSession();
                if (!currentSession) {
                    const { error: signInError } = await supabase.auth.signInWithPassword({ email: cleanEmail, password });
                    if (signInError) throw signInError;
                }
            }

            navigate("/");
            window.location.reload(); // Force refresh to update Navbar/App state
        } catch (err) {
            setError(err.message || "Sign up failed.");
        } finally {
            setLoading(false);
        }
    };

    // --- FORGOT PASSWORD ---
    const handleForgotPassword = async (e) => {
        e.preventDefault();
        setLoading(true);
        setMessage({ text: "", isError: true });
        try {
            const { error } = await supabase.auth.resetPasswordForEmail(email, {
                redirectTo: `${window.location.origin}/reset-password`,
            });
            if (error) throw error;
            setView("forgot_sent");
        } catch (err) {
            setError(err.message || "Could not send reset email.");
        } finally {
            setLoading(false);
        }
    };

    // --- REQUEST INVITE ---
    const handleRequestInvite = async (e) => {
        e.preventDefault();
        setLoading(true);
        setMessage({ text: "", isError: true });
        try {
            // --- SAFETAIL: Run all checks FIRST (since they are SECURITY DEFINER) ---

            // 1. Check if user is already a member of the selected community
            if (communityId) {
                const { data: existingMembers, error: memberError } = await supabase.rpc(
                    "check_existing_members",
                    { p_emails: [email], p_community_id: communityId }
                );
                if (memberError) console.warn("Membership check failed:", memberError.message);
                if (existingMembers && existingMembers.length > 0) {
                    setError("You are already a member of this community! Please log in to access your resources.");
                    setLoading(false);
                    return;
                }
            }

            // 2. Check for existing pending requests for this email/community
            const { data: hasPending, error: requestError } = await supabase.rpc(
                "check_pending_request",
                { p_email: email, p_community_id: communityId || null }
            );
            if (requestError) console.warn("Pending request check failed:", requestError.message);
            if (hasPending) {
                setError("You already have a pending request for this community. An admin will review it soon!");
                setLoading(false);
                return;
            }

            // 3. Check for active/usable invites
            const { data: hasActiveInvite, error: inviteError } = await supabase.rpc(
                "check_active_invite",
                { p_email: email, p_community_id: communityId || null }
            );
            if (inviteError) console.warn("Active invite check failed:", inviteError.message);
            if (hasActiveInvite) {
                setError("You already have an active invite code for this community! Please check your email and use that code to sign up.");
                setLoading(false);
                return;
            }

            // --- IDENTITY VERIFICATION ---
            if (!requiresPassword) {
                const { data: userExists, error: existenceError } = await supabase.rpc("check_user_exists_raw", { p_email: email });
                if (existenceError) console.warn("Existence check failed:", existenceError.message);

                if (userExists) {
                    setRequiresPassword(true);
                    setError("This email is already registered. Please verify your password to request an invite to this new community.");
                    setLoading(false);
                    return;
                }
            } else {
                if (!password) {
                    setError("Please enter your password to proceed.");
                    setLoading(false);
                    return;
                }
                // Verify password by signing in. 
                // NOTE: This will immediately alter the global session and unmount this component!
                const { error: signInError } = await supabase.auth.signInWithPassword({ email, password });
                if (signInError) {
                    setError("Incorrect password. Please verify your identity to request an invite.");
                    setLoading(false);
                    return;
                }
            }

            // --- INSERT REQUEST ---
            const { error: insertError } = await supabase.from("invite_requests").insert([{
                email,
                zip_code: zipCode,
                message: intro,
                community_id: communityId || null
            }]);
            if (insertError) throw insertError;

            if (requiresPassword) {
                // Because they are now logged in, they will be instantly redirected by App.jsx
                // An alert ensures they know their request succeeded before the visual context changes.
                alert("Your request has been successfully submitted! An admin will review it.");
            } else {
                setSuccess("Your request has been sent! An admin will review it and follow up via email.");
                setTimeout(() => setView("login"), 3000);
            }
        } catch (err) {
            setError(err.message || "Failed to send request.");
        } finally {
            setLoading(false);
        }
    };

    // ---- RENDER ----
    return (
        <div className="auth-page">
            
            {/* Left Box: Image */}
            <div className="auth-left">
                <img 
                  src="/Images/Background Image Detail.jpg" 
                  alt="Decorative Mandala Detail" 
                  className="auth-sidebar-img"
                />
            </div>

            {/* Right Box: Form */}
            <div className="auth-right">
                <div className="auth-card">
                    {/* -------- LOGIN -------- */}
                    {view === "login" && (
                        <>
                            <h1 className="auth-title-cursive">Welcome to</h1>
                            <h2 className="auth-title-serif">The Columbus Baha’i<br/>Resource App</h2>
                            
                            <h3 className="auth-subtitle">LOGIN</h3>
                            
                            <form onSubmit={handleLogin} style={{ display: "flex", flexDirection: "column", margin: 0 }}>
                                <Field label="Email" type="email" value={email} onChange={setEmail} />
                                <Field label="Password" type="password" value={password} onChange={setPassword} />

                                <button type="submit" disabled={loading} className="auth-btn-green">
                                    {loading ? "Logging in..." : "Login"}
                                </button>
                            </form>
                            
                            <button type="button" onClick={() => reset("forgot")} className="auth-link">
                                Forgot your Password?
                            </button>

                            <MessageBox msg={message} />
                            
                            <button type="button" onClick={() => reset("signup")} className="auth-btn-blue">
                                Are you new? Create an account here.
                            </button>
                        </>
                    )}

                    {/* -------- SIGN UP -------- */}
                    {view === "signup" && (
                        <>
                            <h1 className="auth-title-cursive">Welcome to</h1>
                            <h2 className="auth-title-serif">The Columbus Baha’i<br/>Resource App</h2>
                            
                            <h3 className="auth-subtitle">CREATE ACCOUNT</h3>
                            
                            <form onSubmit={handleSignup} style={{ display: "flex", flexDirection: "column", margin: 0 }}>
                                <Field label="Invite Code" type="text" value={inviteCode} onChange={setInviteCode} />
                                <Field label="Email" type="email" value={email} onChange={setEmail} />
                                <Field label="Password" type="password" value={password} onChange={setPassword} />
                                <Field label="Confirm Password" type="password" value={confirmPassword} onChange={setConfirmPassword} />

                                <button type="submit" disabled={loading} className="auth-btn-green">
                                    {loading ? "Creating..." : "Sign Up"}
                                </button>
                            </form>
                            <MessageBox msg={message} />
                            
                            <div className="auth-toggle-text">
                                Don't have an invite code?
                                <button type="button" onClick={() => reset("request_invite")}>
                                    Request an Invite
                                </button>
                            </div>
                            
                            <button type="button" onClick={() => reset("login")} className="auth-btn-blue">
                                Already have an account? Log In
                            </button>
                        </>
                    )}

                    {/* -------- REQUEST INVITE -------- */}
                    {view === "request_invite" && (
                        <>
                            <h1 className="auth-title-cursive">Welcome to</h1>
                            <h2 className="auth-title-serif">The Columbus Baha’i<br/>Resource App</h2>
                            
                            <h3 className="auth-subtitle">REQUEST INVITE</h3>
                            
                            <p className="auth-instructions">Tell us where you are located and why you'd like to join one of our communities.</p>
                            
                            <form onSubmit={handleRequestInvite} style={{ display: "flex", flexDirection: "column", margin: 0 }}>
                                <Field label="Email" type="email" value={email} onChange={setEmail} />
                                <Field label="Zip Code" type="text" value={zipCode} onChange={setZipCode} />

                                <div className="auth-input-wrapper">
                                    <label id="community-label">Community</label>
                                    <CustomSelect
                                        value={communityId}
                                        onChange={e => setCommunityId(e.target.value)}
                                        labelId="community-label"
                                        placeholder="Not Sure / General Request"
                                        options={[
                                            ...(matchedCommunities.length > 0
                                                ? matchedCommunities.map(c => ({ value: c.id, label: `📍 ${c.name}` }))
                                                : []
                                            ),
                                            ...allCommunities
                                                .filter(c => !matchedCommunities.find(m => m.id === c.id))
                                                .map(c => ({ value: c.id, label: c.name }))
                                        ]}
                                    />
                                </div>

                                <div className="auth-input-wrapper">
                                    <label htmlFor="field-about-yourself">Tell us about yourself <span style={{ color: intro?.length > 200 ? '#d9534f' : 'inherit', fontWeight: 'normal', fontSize: '0.75rem', marginLeft: '8px' }}>{intro?.length || 0}/250</span></label>
                                    <textarea
                                        id="field-about-yourself"
                                        value={intro}
                                        onChange={e => setIntro(e.target.value)}
                                        maxLength={250}
                                        rows={3}
                                    />
                                </div>

                                {requiresPassword && (
                                    <Field label="Verify Password" type="password" value={password} onChange={setPassword} />
                                )}

                                <button type="submit" disabled={loading} className="auth-btn-green">
                                    {loading ? "Sending..." : requiresPassword ? "Verify" : "Request Invite"}
                                </button>
                            </form>
                            <MessageBox msg={message} />
                            
                            <button type="button" onClick={() => reset("login")} className="auth-btn-blue">
                                Changed your mind? Back to Log In
                            </button>
                        </>
                    )}

                    {/* -------- FORGOT PASSWORD -------- */}
                    {view === "forgot" && (
                        <>
                            <h1 className="auth-title-cursive">Welcome to</h1>
                            <h2 className="auth-title-serif">The Columbus Baha’i<br/>Resource App</h2>
                            
                            <h3 className="auth-subtitle">RESET</h3>
                            
                            <p className="auth-instructions">Enter the email address for your account and we will send you a password reset link.</p>
                            
                            <form onSubmit={handleForgotPassword} style={{ display: "flex", flexDirection: "column", margin: 0 }}>
                                <Field label="Email" type="email" value={email} onChange={setEmail} />
                                <button type="submit" disabled={loading} className="auth-btn-green">
                                    {loading ? "Sending..." : "Send Reset Link"}
                                </button>
                            </form>
                            <MessageBox msg={message} />
                            
                            <button type="button" onClick={() => reset("login")} className="auth-btn-blue">
                                Remembered your password? Log In
                            </button>
                        </>
                    )}

                    {/* -------- FORGOT SENT CONFIRMATION -------- */}
                    {view === "forgot_sent" && (
                        <>
                            <h1 className="auth-title-cursive">Welcome to</h1>
                            <h2 className="auth-title-serif">The Columbus Baha’i<br/>Resource App</h2>
                            
                            <h3 className="auth-subtitle">CHECK EMAIL</h3>
                            
                            <p className="auth-instructions">
                                If an account exists for <strong>{email}</strong>, you will receive a password reset link shortly.
                            </p>
                            
                            <button type="button" onClick={() => reset("login")} className="auth-btn-blue">
                                Back to Log In
                            </button>
                        </>
                    )}
                </div>
            </div>
        </div>
    );
}

// --- Small reusable components ---
function Field({ label, type, value, onChange }) {
    const [show, setShow] = useState(false);
    const isPassword = type === "password";
    const actualType = isPassword ? (show ? "text" : "password") : type;
    const id = `field-${label.toLowerCase().replace(/\s+/g, "-")}`;

    return (
        <div className="auth-input-wrapper">
            <label htmlFor={id}>{label}</label>
            <input
                id={id}
                type={actualType}
                value={value}
                onChange={(e) => onChange(e.target.value)}
                required
                style={{ paddingRight: isPassword ? "2.5rem" : "1rem" }}
                autoComplete={type === "email" ? "email" : type === "password" ? "current-password" : "off"}
            />
            {isPassword && (
                <button
                    type="button"
                    onClick={() => setShow(!show)}
                    className="auth-eye-btn"
                    aria-label={show ? "Hide password" : "Show password"}
                    title={show ? "Hide password" : "Show password"}
                    style={{ display: "flex", alignItems: "center", justifyContent: "center" }}
                >
                    {show ? (
                        <img src="/Images/Dark Design Open Eye.png" alt="" aria-hidden="true" style={{ width: "24px", height: "auto" }} />
                    ) : (
                        <img src="/Images/Dark Design Closed Eye.png" alt="" aria-hidden="true" style={{ width: "24px", height: "auto" }} />
                    )}
                </button>
            )}
        </div>
    );
}

function MessageBox({ msg }) {
    if (!msg.text) return null;
    return (
        <p
            role="alert"
            aria-live="assertive"
            style={{ textAlign: "center", fontSize: "0.9rem", color: msg.isError ? "#d9534f" : "#27ae60", marginTop: "-0.5rem", marginBottom: "1rem" }}
        >
            {msg.text}
        </p>
    );
}


