import React, { useState, useEffect } from "react";
import supabase from "./supabaseClient";
import { useNavigate } from "react-router-dom";

// We created a generic Field component in Auth.jsx, but since it's not exported,
// we'll inline a minimal version here or just use the same auth-input-wrapper styling.

export default function ResetPassword() {
    const [password, setPassword] = useState("");
    const [confirmPassword, setConfirmPassword] = useState("");
    const [message, setMessage] = useState({ text: "", isError: true });
    const [loading, setLoading] = useState(false);
    const [showPass, setShowPass] = useState(false);
    const [showConfirm, setShowConfirm] = useState(false);
    const navigate = useNavigate();

    useEffect(() => {
        async function checkSession() {
            const { data } = await supabase.auth.getSession();
            if (!data?.session) {
                setMessage({
                    text: 'Authorized session missing. Go back to log in page and click "Forgot your Password" if you still don\'t know your password. Be sure to use the most recent password recovery link sent to your email.',
                    isError: true
                });
            }
        }
        checkSession();
    }, []);

    const handleReset = async (e) => {
        e.preventDefault();

        if (password !== confirmPassword) {
            setMessage({ text: "Passwords do not match.", isError: true });
            return;
        }
        if (password.length < 8) {
            setMessage({ text: "Password must be at least 8 characters.", isError: true });
            return;
        }

        setLoading(true);
        setMessage({ text: "", isError: true });

        try {
            const { data: updateData, error } = await supabase.auth.updateUser({ password });
            if (error) throw error;

            // Reset lockout counters in login_attempts upon successful password recovery
            const { data: sessionData } = await supabase.auth.getSession();
            const currentUser = updateData?.user || sessionData?.session?.user;
            const resetEmail = currentUser?.email || email; // fallback to state email if present
            const userId = currentUser?.id;

            if (resetEmail || userId) {
                const { error: rpcErr } = await supabase.rpc('record_successful_login', { 
                    p_email: resetEmail || null, 
                    p_user_id: userId || null 
                });
                if (rpcErr) console.error("Lockout reset RPC error:", rpcErr);
            }

            setMessage({ text: "Password updated successfully!", isError: false });
            
            // For security, explicitly sign the user out after setting the new password.
            // Clear the recovery state flag and do a hard reload to clean the React tree.
            sessionStorage.removeItem("isRecoveringPassword");
            await supabase.auth.signOut();
            
            setTimeout(() => {
                window.location.href = "/";
            }, 1500);

        } catch (err) {
            let errMsg = err.message || "Failed to update password.";
            if (errMsg.toLowerCase().includes("auth session missing") || errMsg.toLowerCase().includes("session missing")) {
                errMsg = 'Authorized session missing. Go back to log in page and click "Forgot your Password" if you still don\'t know your password. Be sure to use the most recent password recovery link sent to your email.';
            }
            setMessage({ text: errMsg, isError: true });
        } finally {
            setLoading(false);
        }
    };

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
                    <h1 className="auth-title-cursive">Welcome to</h1>
                    <h2 className="auth-title-serif">The Baha’i<br/>Resource App</h2>
                    <h3 className="auth-subtitle">SET NEW PASSWORD</h3>
                    <p className="auth-instructions">Choose a strong password for your account.</p>

                    <form onSubmit={handleReset} style={{ display: "flex", flexDirection: "column", margin: 0 }}>
                        <div className="auth-input-wrapper">
                            <label>New Password <span style={{ color: "#ef4444", marginLeft: "4px" }}>*</span></label>
                            <input
                                type={showPass ? "text" : "password"}
                                value={password}
                                onChange={(e) => setPassword(e.target.value)}
                                required
                                placeholder="At least 8 characters"
                                style={{ paddingRight: "2.5rem" }}
                            />
                            <button
                                type="button"
                                onClick={() => setShowPass(!showPass)}
                                className="auth-eye-btn"
                                title={showPass ? "Hide password" : "Show password"}
                            >
                                {showPass ? (
                                    <img src="/Images/Dark Design Open Eye.png" alt="" aria-hidden="true" style={{ width: "24px", height: "auto" }} />
                                ) : (
                                    <img src="/Images/Dark Design Closed Eye.png" alt="" aria-hidden="true" style={{ width: "24px", height: "auto" }} />
                                )}
                            </button>
                        </div>
                        
                        <div className="auth-input-wrapper">
                            <label>Confirm New Password <span style={{ color: "#ef4444", marginLeft: "4px" }}>*</span></label>
                            <input
                                type={showConfirm ? "text" : "password"}
                                value={confirmPassword}
                                onChange={(e) => setConfirmPassword(e.target.value)}
                                required
                                placeholder="Re-enter your new password"
                                style={{ paddingRight: "2.5rem" }}
                            />
                            <button
                                type="button"
                                onClick={() => setShowConfirm(!showConfirm)}
                                className="auth-eye-btn"
                                title={showConfirm ? "Hide password" : "Show password"}
                            >
                                {showConfirm ? (
                                    <img src="/Images/Dark Design Open Eye.png" alt="" aria-hidden="true" style={{ width: "24px", height: "auto" }} />
                                ) : (
                                    <img src="/Images/Dark Design Closed Eye.png" alt="" aria-hidden="true" style={{ width: "24px", height: "auto" }} />
                                )}
                            </button>
                        </div>

                        <button type="submit" disabled={loading} className="auth-btn-green">
                            {loading ? "Updating..." : "Update Password"}
                        </button>
                    </form>

                    {message.text && (
                        <div style={{
                            padding: '1rem',
                            marginBottom: '1rem',
                            borderRadius: '8px',
                            textAlign: 'center',
                            backgroundColor: message.isError ? 'var(--error-bg)' : 'var(--success-bg)',
                            border: '1px solid ' + (message.isError ? 'var(--error-border)' : 'var(--success-border)'),
                            color: message.isError ? 'var(--error-text)' : 'var(--success-text)'
                        }}>
                            {message.text}
                        </div>
                    )}

                    <button 
                        type="button" 
                        onClick={async () => {
                            sessionStorage.removeItem("isRecoveringPassword");
                            await supabase.auth.signOut();
                            window.location.href = "/";
                        }} 
                        className="auth-btn-blue"
                    >
                        Back to Log In
                    </button>
                </div>
            </div>
        </div>
    );
}
