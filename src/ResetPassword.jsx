import React, { useState } from "react";
import supabase from "./supabaseClient";
import { useNavigate } from "react-router-dom";

export default function ResetPassword() {
    const [password, setPassword] = useState("");
    const [confirmPassword, setConfirmPassword] = useState("");
    const [message, setMessage] = useState({ text: "", isError: true });
    const [loading, setLoading] = useState(false);
    const navigate = useNavigate();

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
            // Supabase automatically restores the session from the URL hash
            // when the user clicks the reset link in their email.
            const { error } = await supabase.auth.updateUser({ password });
            if (error) throw error;

            setMessage({ text: "Password updated successfully! Redirecting...", isError: false });
            setTimeout(() => navigate("/"), 2000);
        } catch (err) {
            setMessage({ text: err.message || "Failed to update password.", isError: true });
        } finally {
            setLoading(false);
        }
    };

    const [showPass, setShowPass] = useState(false);
    const [showConfirm, setShowConfirm] = useState(false);

    return (
        <div style={styles.container}>
            <h2 style={styles.heading}>Set New Password</h2>
            <p style={styles.subtext}>Choose a strong password for your account.</p>

            <form onSubmit={handleReset} style={styles.form}>
                <div style={styles.inputGroup}>
                    <label style={styles.label}>New Password</label>
                    <div style={{ position: "relative" }}>
                        <input
                            type={showPass ? "text" : "password"}
                            value={password}
                            onChange={(e) => setPassword(e.target.value)}
                            required
                            placeholder="At least 8 characters"
                            style={{ ...styles.input, width: "100%", boxSizing: "border-box", paddingRight: "2.5rem" }}
                        />
                        <button
                            type="button"
                            onClick={() => setShowPass(!showPass)}
                            style={styles.eyeButton}
                            title={showPass ? "Hide password" : "Show password"}
                        >
                            {showPass ? "🔒" : "👁️"}
                        </button>
                    </div>
                </div>
                <div style={styles.inputGroup}>
                    <label style={styles.label}>Confirm New Password</label>
                    <div style={{ position: "relative" }}>
                        <input
                            type={showConfirm ? "text" : "password"}
                            value={confirmPassword}
                            onChange={(e) => setConfirmPassword(e.target.value)}
                            required
                            placeholder="Re-enter your new password"
                            style={{ ...styles.input, width: "100%", boxSizing: "border-box", paddingRight: "2.5rem" }}
                        />
                        <button
                            type="button"
                            onClick={() => setShowConfirm(!showConfirm)}
                            style={styles.eyeButton}
                            title={showConfirm ? "Hide password" : "Show password"}
                        >
                            {showConfirm ? "🔒" : "👁️"}
                        </button>
                    </div>
                </div>
                <button type="submit" disabled={loading} style={styles.button}>
                    {loading ? "Updating..." : "Update Password"}
                </button>
            </form>

            {message.text && (
                <p style={{ ...styles.message, color: message.isError ? "#d9534f" : "#27ae60" }}>
                    {message.text}
                </p>
            )}
        </div>
    );
}

const styles = {
    container: {
        maxWidth: "400px",
        margin: "4rem auto",
        padding: "2rem",
        boxShadow: "0 4px 12px rgba(0,0,0,0.5)",
        borderRadius: "8px",
        fontFamily: "system-ui, sans-serif",
        backgroundColor: "var(--bg-card)"
    },
    heading: { textAlign: "center", marginTop: 0, marginBottom: "0.5rem" },
    subtext: { color: "var(--text-muted)", fontSize: "0.9rem", textAlign: "center", marginBottom: "1.5rem" },
    form: { display: "flex", flexDirection: "column", gap: "1rem" },
    inputGroup: { display: "flex", flexDirection: "column", gap: "0.4rem" },
    label: { fontSize: "0.9rem", fontWeight: "600", color: "var(--text-main)" },
    input: { padding: "0.6rem 0.75rem", fontSize: "1rem", borderRadius: "4px", border: "1px solid var(--border-color)", backgroundColor: "var(--bg-input)", color: "var(--text-main)" },
    button: {
        padding: "0.75rem",
        fontSize: "1rem",
        backgroundColor: "var(--primary)",
        color: "white",
        border: "none",
        borderRadius: "4px",
        cursor: "pointer",
        fontWeight: "bold",
        marginTop: "0.5rem"
    },
    message: { marginTop: "1rem", textAlign: "center", fontSize: "0.9rem" },
    eyeButton: {
        position: "absolute",
        right: "0.5rem",
        top: "50%",
        transform: "translateY(-50%)",
        background: "none",
        border: "none",
        cursor: "pointer",
        fontSize: "1.1rem",
        padding: "0.2rem",
        display: "flex",
        alignItems: "center",
        justifyContent: "center",
        color: "var(--text-muted)"
    }
};
