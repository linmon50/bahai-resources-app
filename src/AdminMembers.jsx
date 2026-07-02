import React, { useState, useEffect, useRef } from "react";
import { createPortal } from "react-dom";
import supabase from "./supabaseClient";
import CustomSelect from "./components/CustomSelect";

import { useCommunity } from "./context/CommunityContext";

const ROLES = ["member", "admin"];
const ROLE_OPTIONS = ROLES.map(r => ({ value: r, label: r.charAt(0).toUpperCase() + r.slice(1) }));

const ADMIN_LEVELS = [
    { value: 0, label: "No Admin Access" },
    { value: 1, label: "Level 1: Local Admin" },
    { value: 2, label: "Level 2: Multi-Community Admin" },
    { value: 3, label: "Level 3: Global Admin" }
];

const ADMIN_LEVEL_OPTIONS = ADMIN_LEVELS.sort((a, b) => a.value - b.value);

const TABS = ["Invite New Users", "Grant Access", "Manage Members", "Invite Requests", "Pending Posts"];

const levelLabel = (lv) => ADMIN_LEVELS.find(a => a.value === lv)?.label || "Unknown";

// ─── Shared Components ────────────────────────────────────────────────────────

// ─── Shared Components moved to separate files ────────────────────────


function CommunitySelect({ communities, value, onChange }) {
    return (
        <div className="admin-input-group">
            <label>Community</label>
            <CustomSelect
                value={value}
                onChange={e => onChange(e.target.value)}
                options={communities.map(c => ({ value: c.id, label: c.name }))}
            />
        </div>
    );
}

function RoleAndLevel({ role, adminLevel, onRoleChange, onLevelChange, isGlobalAdmin }) {
    const levelOptions = ADMIN_LEVEL_OPTIONS.filter(opt => {
        if (opt.value === 0) return role !== "admin";
        if (opt.value === 3) return isGlobalAdmin;
        return true;
    });

    return (
        <div className="admin-row">
            <div className="admin-input-group">
                <label>Role</label>
                <CustomSelect
                    value={role}
                    onChange={e => {
                        onRoleChange(e.target.value);
                        if (e.target.value === "admin") onLevelChange(1);
                        else onLevelChange(0);
                    }}
                    options={ROLE_OPTIONS}
                />
            </div>

            <div className="admin-input-group">
                <label>Admin Level</label>
                <CustomSelect
                    value={adminLevel}
                    onChange={e => onLevelChange(parseInt(e.target.value, 10))}
                    disabled={role !== "admin"}
                    options={levelOptions}
                />
            </div>
        </div>
    );
}

// ─── Tab 1: Invite New Users ──────────────────────────────────────────────────

function InviteTab({ communities, selectedCommunity, isGlobalAdmin, emailsRaw, setEmailsRaw, onSuccess, onMoveToGrantAccess }) {
    const [role, setRole] = useState("member");
    const [adminLevel, setAdminLevel] = useState(0);
    const [loading, setLoading] = useState(false);
    const [results, setResults] = useState([]);
    const [errorMsg, setErrorMsg] = useState("");
    const [statusMsg, setStatusMsg] = useState("");
    const [cleaning, setCleaning] = useState(false);
    const [duplicateEmails, setDuplicateEmails] = useState([]);
    const [registeredEmails, setRegisteredEmails] = useState([]);
    const [checkedEmails, setCheckedEmails] = useState([]);
    const [pendingInvites, setPendingInvites] = useState([]);
    const [copiedStates, setCopiedStates] = useState({});

    const fetchPendingInvites = async () => {
        if (!selectedCommunity) return;
        try {
            const { data, error } = await supabase
                .from("invites")
                .select("*")
                .eq("community_id", selectedCommunity)
                .eq("dismissed", false)
                .order("created_at", { ascending: false })
                .order("id", { ascending: true });
            if (error) throw error;
            setPendingInvites(data || []);
        } catch (err) {
            console.error("Error fetching pending invites:", err.message);
        }
    };

    useEffect(() => {
        fetchPendingInvites();
    }, [selectedCommunity]);

    const handleCopyCode = (code) => {
        navigator.clipboard.writeText(code);
        setCopiedStates(prev => ({ ...prev, [code]: true }));
        setTimeout(() => {
            setCopiedStates(prev => ({ ...prev, [code]: false }));
        }, 2000);
    };

    const handleToggleEmailSent = async (inviteId, currentVal) => {
        try {
            const { error } = await supabase
                .from("invites")
                .update({ email_sent: !currentVal })
                .eq("id", inviteId);
            if (error) throw error;
            fetchPendingInvites();
        } catch (err) {
            setErrorMsg(`❌ Failed to update invite status: ${err.message}`);
        }
    };

    const handleDismissInvite = async (inviteId) => {
        if (!window.confirm("Are you sure you want to dismiss this invite? This will hide it from the dashboard but keep the record in the database for auditing.")) return;
        try {
            const { error } = await supabase
                .from("invites")
                .update({ dismissed: true })
                .eq("id", inviteId);
            if (error) throw error;
            fetchPendingInvites();
        } catch (err) {
            setErrorMsg(`❌ Failed to dismiss invite: ${err.message}`);
        }
    };

    const handleContinueWithoutDuplicates = () => {
        setEmailsRaw(checkedEmails.join("\n"));
        setDuplicateEmails([]);
        setRegisteredEmails([]);
        setCheckedEmails([]);
    };

    const handleCleanup = async () => {
        if (!window.confirm("Delete all expired and legacy invites (with no expiration) from the database? This cannot be undone.")) return;
        setCleaning(true);
        setStatusMsg("");
        setErrorMsg("");
        
        try {
            // 1. Standard cleanup via RPC (for truly expired ones)
            const { data: rpcCount, error: rpcError } = await supabase.rpc("cleanup_expired_invites");
            if (rpcError) throw rpcError;

            // 2. Manual cleanup of legacy NULL expiration invites
            const { count: nullCount, error: nullError } = await supabase
                .from("invites")
                .delete({ count: 'exact' })
                .is("expires_at", null);
            
            if (nullError) throw nullError;

            const totalDeleted = (rpcCount || 0) + (nullCount || 0);
            setStatusMsg(`✅ Cleanup successful. ${totalDeleted} invites removed (${rpcCount || 0} expired, ${nullCount || 0} legacy NULL).`);
            fetchPendingInvites();
            if (onSuccess) onSuccess();
        } catch (err) {
            setErrorMsg(`❌ Cleanup failed: ${err.message}`);
        } finally {
            setCleaning(false);
        }
    };

    const handleGenerate = async (e) => {
        e.preventDefault();
        setLoading(true);
        setErrorMsg("");
        setStatusMsg("");
        setResults([]);
        setDuplicateEmails([]);
        setRegisteredEmails([]);

        if (!selectedCommunity) {
            setErrorMsg("Please select a community first.");
            setLoading(false);
            return;
        }

        const emailArray = Array.from(new Set(emailsRaw
            .split(/[\n, ]+/)
            .map(e => e.trim())
            .filter(e => e.includes("@"))
        ));

        if (emailArray.length === 0) {
            setErrorMsg("Please enter at least one valid email address.");
            setLoading(false);
            return;
        }

        let finalAdminLevel = parseInt(adminLevel, 10) || 0;

        try {
            const { data: existingEmails, error: rpcError } = await supabase.rpc(
                "check_existing_members",
                { p_emails: emailArray, p_community_id: selectedCommunity }
            );

            const { data: activeInvites, error: activeError } = await supabase.rpc(
                "check_active_invites_bulk",
                { p_emails: emailArray, p_community_id: selectedCommunity }
            );

            const { data: regUsers, error: regError } = await supabase.rpc(
                "check_registered_users_bulk",
                { p_emails: emailArray }
            );

            const activeEmails = activeInvites ? activeInvites.map(r => r.email) : [];
            const allDuplicates = Array.from(new Set([...(existingEmails || []), ...activeEmails]));
            const registered = regUsers || [];

            const overlapReg = registered.filter(e => !allDuplicates.includes(e));

            if (allDuplicates.length > 0 || overlapReg.length > 0) {
                setDuplicateEmails(allDuplicates);
                setRegisteredEmails(overlapReg);
                setCheckedEmails(emailArray.filter(e => !allDuplicates.includes(e) && !overlapReg.includes(e)));
                setLoading(false);
                return;
            }
        } catch (err) {
            console.warn("duplicate checks error:", err.message);
        }

        try {
            const { data: { user } } = await supabase.auth.getUser();

            let upgradeEmails = [];
            if (finalAdminLevel === 1) {
                const { data: elsewhere } = await supabase.rpc("check_admin_elsewhere", { p_emails: emailArray });
                if (elsewhere && elsewhere.length > 0) {
                    const proceed = window.confirm(
                        `These users are already admins in another community:\n\n${elsewhere.join("\n")}\n\nThey will be upgraded to Level 2 (Multi-Community Admin). Continue?`
                    );
                    if (!proceed) { setLoading(false); return; }
                    upgradeEmails = elsewhere;
                }
            }

            const expiresAt = new Date();
            expiresAt.setDate(expiresAt.getDate() + 3);

            const newInvites = emailArray.map(email => {
                const isUpgrade = upgradeEmails.some(e => e.toLowerCase() === email.toLowerCase());
                return {
                    code: Math.random().toString(36).substring(2, 10).toUpperCase(),
                    community_id: selectedCommunity,
                    role,
                    admin_level: isUpgrade ? 2 : finalAdminLevel,
                    email,
                    created_by: user.id,
                    expires_at: expiresAt.toISOString(),
                };
            });

            const { error: insertError } = await supabase.from("invites").insert(newInvites);
            if (insertError) throw insertError;

            // --- AUTO-REMOVE MATCHING INVITE REQUESTS ---
            try {
                await supabase
                    .from("invite_requests")
                    .delete()
                    .in("email", emailArray)
                    .or(`community_id.eq.${selectedCommunity},community_id.is.null`);
            } catch (err) {
                console.warn("Auto-removal of invite requests failed:", err.message);
            }

            for (const email of upgradeEmails) {
                await supabase.rpc("sync_multi_community_admin_levels", { p_email: email });
            }

            setResults(newInvites);
            setStatusMsg(`✅ Successfully generated ${newInvites.length} invite code(s).`);
            setEmailsRaw("");
            fetchPendingInvites();
            if (onSuccess) onSuccess();
        } catch (err) {
            setErrorMsg(err.message || "Failed to generate invites.");
        } finally {
            setLoading(false);
        }
    };

    return (
        <div>
            {isGlobalAdmin && (
                <div className="invite-tab-header">
                    <h3 style={{
                        color: "#ffffff",
                        fontFamily: "'Fredoka', sans-serif",
                        fontWeight: 600,
                        fontSize: "1.35rem",
                        margin: 0
                    }}>
                        New Users Invite Form
                    </h3>
                    <button
                        onClick={handleCleanup}
                        disabled={cleaning}
                        className="admin-pill-btn blue" style={{ marginTop: 0, flexShrink: 0 }}
                        aria-label="Delete all expired and unused invite codes permanently"
                        title="Delete all expired and unused invites permanently"
                    >
                        {cleaning ? "Processing..." : "Cleanup Expired Invites"}
                    </button>
                </div>
            )}

            {errorMsg && <div role="alert" className="admin-error-box">{errorMsg}</div>}
            {statusMsg && (
                <div role="status" aria-live="polite" className="admin-warning-box" style={{ backgroundColor: "#55c46f", border: "none", color: "#ffffff" }}>
                    {statusMsg}
                </div>
            )}

            {duplicateEmails.length > 0 && (
                <div role="alert" className="admin-warning-box">
                    <strong>⚠️ Already members or have an active invite:</strong>
                    <ul style={{ margin: "0.5rem 0", paddingLeft: "1.25rem", color: "inherit" }}>
                        {duplicateEmails.map(e => <li key={e} style={{ marginBottom: "0.2rem" }}>{e}</li>)}
                    </ul>
                    <p style={{ margin: "0.75rem 0 0" }}>
                        {checkedEmails.length > 0
                            ? "Remove them and continue with the remaining emails, or cancel."
                            : "All entered emails are already members or have active invites. Please update your list."}
                    </p>
                    <div style={{ display: "flex", gap: "0.75rem", marginTop: "1rem", flexWrap: "wrap" }}>
                        {checkedEmails.length > 0 && (
                            <button type="button" onClick={handleContinueWithoutDuplicates} className="admin-pill-btn">
                                Remove &amp; Continue ({checkedEmails.length} remaining)
                            </button>
                        )}
                        <button type="button" onClick={() => { setDuplicateEmails([]); setCheckedEmails([]); }} className="admin-pill-btn secondary">
                            Cancel
                        </button>
                    </div>
                </div>
            )}

            {registeredEmails.length > 0 && (
                <div role="alert" className="admin-warning-box" style={{ backgroundColor: "rgba(120, 100, 15, 0.85)", border: "1px solid #b49009", color: "#fcd34d" }}>
                    <strong>ℹ️ Already have accounts (but not in this community):</strong>
                    <ul style={{ margin: "0.5rem 0", paddingLeft: "1.25rem", color: "inherit" }}>
                        {registeredEmails.map(e => <li key={e} style={{ marginBottom: "0.2rem" }}>{e}</li>)}
                    </ul>
                    <p style={{ margin: "0.75rem 0 0" }}>
                        These users are already registered. Generating an invite code for them is unnecessary. You can grant them access directly instead.
                    </p>
                    <div style={{ display: "flex", gap: "0.75rem", marginTop: "1rem", flexWrap: "wrap" }}>
                        <button
                            onClick={() => {
                                handleContinueWithoutDuplicates();
                                onMoveToGrantAccess(registeredEmails);
                            }}
                            className="admin-pill-btn" style={{ padding: "0.5rem 1rem" }}>
                            Move to Grant Access Tab ➔
                        </button>
                        {checkedEmails.length > 0 && duplicateEmails.length === 0 && (
                            <button type="button" onClick={handleContinueWithoutDuplicates} className="admin-pill-btn secondary" style={{ padding: "0.5rem 1rem" }}>
                                Ignore & Continue
                            </button>
                        )}
                        {duplicateEmails.length === 0 && (
                            <button type="button" onClick={() => { setDuplicateEmails([]); setRegisteredEmails([]); }} className="admin-pill-btn secondary">
                                Cancel
                            </button>
                        )}
                    </div>
                </div>
            )}

            <form onSubmit={handleGenerate} className="admin-form">
                <RoleAndLevel role={role} adminLevel={adminLevel} onRoleChange={setRole} onLevelChange={setAdminLevel} isGlobalAdmin={isGlobalAdmin} />

                <div className="admin-input-group">
                    <label>Target Emails (separate by comma or new line)</label>
                    <textarea
                        value={emailsRaw}
                        onChange={e => setEmailsRaw(e.target.value)}
                        className="admin-input"
                        placeholder={"john@example.com, jane@example.com\nadmin@test.com"}
                        rows={5}
                    />
                </div>

                <div style={{ display: "flex", gap: "1rem", justifyContent: "center", marginTop: "0.5rem", width: "100%" }}>
                    <button type="submit" disabled={loading} className="admin-pill-btn full-width" style={{ margin: 0 }}>
                        {loading ? "Generating..." : "Generate Invites"}
                    </button>
                    <button type="button" onClick={() => setEmailsRaw("")} disabled={loading || !emailsRaw} className="admin-pill-btn danger full-width" style={{ margin: 0 }}>
                        Clear Emails
                    </button>
                </div>
            </form>

            {pendingInvites.length > 0 && (
                <div style={{ marginTop: "2rem" }}>
                    <h3 style={{
                        color: "#ffffff",
                        fontFamily: "'Fredoka', sans-serif",
                        fontWeight: 600,
                        fontSize: "1.35rem",
                        marginBottom: "0.5rem"
                    }}>
                        Pending Invites
                    </h3>
                    <p style={{ color: "rgba(255, 255, 255, 0.7)", fontSize: "0.9rem", marginBottom: "1rem", lineHeight: "1.4" }}>
                        Copy the invite code below and paste in an email to the new user. Remember, it's only one invite code per user email. Once sent, mark as sent in the below table. When a user successfully logs in with their invite code (you will know if the status says "Used"), dismiss the table row for that user.
                    </p>
                    <div className="admin-table-wrapper">
                        <table className="task-table">
                            <thead>
                                <tr>
                                    <th>Email</th>
                                    <th>Invite Code</th>
                                    <th>Role</th>
                                    <th>Level</th>
                                    <th>Status</th>
                                    <th>Email Sent?</th>
                                    <th>Actions</th>
                                </tr>
                            </thead>
                            <tbody>
                                {pendingInvites.map((inv) => {
                                    const isExpired = inv.expires_at && new Date(inv.expires_at) < new Date();
                                    return (
                                        <tr key={inv.id} className="task-row">
                                            <td>{inv.email}</td>
                                            <td className="admin-table-code" style={{ display: 'flex', alignItems: 'center', gap: '0.5rem', justifyContent: 'flex-start' }}>
                                                <strong>{inv.code}</strong>
                                                <button
                                                    onClick={() => handleCopyCode(inv.code)}
                                                    className="admin-pill-btn"
                                                    style={{
                                                        margin: 0,
                                                        padding: "0.2rem 0.4rem",
                                                        fontSize: "0.75rem",
                                                        background: copiedStates[inv.code] ? "#55c46f" : "rgba(255,255,255,0.1)",
                                                        border: "1px solid rgba(255,255,255,0.2)",
                                                        color: "#ffffff",
                                                        display: "inline-flex",
                                                        alignItems: "center",
                                                        gap: "4px",
                                                        minWidth: "65px",
                                                        justifyContent: "center"
                                                    }}
                                                    title="Copy invite code"
                                                >
                                                    {copiedStates[inv.code] ? (
                                                        "Copied!"
                                                    ) : (
                                                        <>
                                                            <svg width="12" height="12" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.5" strokeLinecap="round" strokeLinejoin="round">
                                                                <rect x="9" y="9" width="13" height="13" rx="2" ry="2"/>
                                                                <path d="M5 15H4a2 2 0 0 1-2-2V4a2 2 0 0 1 2-2h9a2 2 0 0 1 2 2v1"/>
                                                            </svg>
                                                            Copy
                                                        </>
                                                    )}
                                                </button>
                                            </td>
                                            <td>{inv.role}</td>
                                            <td>{levelLabel(inv.admin_level)}</td>
                                            <td>
                                                {inv.used_at ? (
                                                    <span style={{ color: "var(--warning-text)", fontWeight: 600 }}>Used</span>
                                                ) : isExpired ? (
                                                    <span style={{ color: "#ef4444", fontWeight: 600 }}>Expired</span>
                                                ) : (
                                                    <span style={{ color: "#10b981", fontWeight: 600 }}>Active</span>
                                                )}
                                            </td>
                                            <td>
                                                <button
                                                    onClick={() => handleToggleEmailSent(inv.id, inv.email_sent)}
                                                    className={`admin-pill-btn ${inv.email_sent ? "success" : "secondary"}`}
                                                    style={{ 
                                                        margin: 0, 
                                                        padding: "0.25rem 0.5rem", 
                                                        fontSize: "0.8rem"
                                                    }}
                                                >
                                                    {inv.email_sent ? "Yes" : "No (Mark Sent)"}
                                                </button>
                                            </td>
                                            <td>
                                                <button
                                                    onClick={() => handleDismissInvite(inv.id)}
                                                    className="admin-pill-btn danger"
                                                    style={{ margin: 0, padding: "0.25rem 0.5rem", fontSize: "0.8rem" }}
                                                >
                                                    Dismiss
                                                </button>
                                            </td>
                                        </tr>
                                    );
                                })}
                            </tbody>
                        </table>
                    </div>
                </div>
            )}
        </div>
    );
}

// ─── Tab 2: Grant Access ──────────────────────────────────────────────────────

function GrantAccessTab({ communities, selectedCommunity, isGlobalAdmin, emailsRaw, setEmailsRaw, onSuccess }) {
    const [role, setRole] = useState("member");
    const [adminLevel, setAdminLevel] = useState(0);
    const [loading, setLoading] = useState(false);
    const [results, setResults] = useState([]);
    const [errorMsg, setErrorMsg] = useState("");
    const [duplicateEmails, setDuplicateEmails] = useState([]);
    const [checkedEmails, setCheckedEmails] = useState([]);

    const handleContinueWithoutDuplicates = () => {
        setEmailsRaw(checkedEmails.join("\n"));
        setDuplicateEmails([]);
        setCheckedEmails([]);
    };

    const handleGrant = async (e) => {
        e.preventDefault();
        setLoading(true);
        setErrorMsg("");
        setResults([]);
        setDuplicateEmails([]);

        if (!selectedCommunity) {
            setErrorMsg("Please select a community first.");
            setLoading(false);
            return;
        }

        const emailArray = Array.from(new Set(emailsRaw
            .split(/[\n, ]+/)
            .map(e => e.trim())
            .filter(e => e.includes("@"))
        ));

        if (emailArray.length === 0) {
            setErrorMsg("Please enter at least one valid email address.");
            setLoading(false);
            return;
        }

        try {
            const { data: existingEmails, error: rpcError } = await supabase.rpc(
                "check_existing_members",
                { p_emails: emailArray, p_community_id: selectedCommunity }
            );

            if (!rpcError && existingEmails && existingEmails.length > 0) {
                setDuplicateEmails(existingEmails);
                setCheckedEmails(emailArray.filter(e => !existingEmails.includes(e)));
                setLoading(false);
                return;
            }
        } catch (err) {
            console.warn("check_existing_members error:", err.message);
        }

        const grantResults = [];

        let upgradeEmails = [];
        if (parseInt(adminLevel, 10) === 1) {
            try {
                const { data: elsewhere } = await supabase.rpc("check_admin_elsewhere", { p_emails: emailArray });
                if (elsewhere && elsewhere.length > 0) {
                    const proceed = window.confirm(
                        `These users are already admins in another community:\n\n${elsewhere.join("\n")}\n\nThey will be upgraded to Level 2 (Multi-Community Admin). Continue?`
                    );
                    if (!proceed) { setLoading(false); return; }
                    upgradeEmails = elsewhere;
                }
            } catch (err) {
                console.warn("check_admin_elsewhere error:", err.message);
            }
        }

        for (const email of emailArray) {
            try {
                const isUpgrade = upgradeEmails.some(e => e.toLowerCase() === email.toLowerCase());
                const targetLevel = isUpgrade ? 2 : (parseInt(adminLevel, 10) || 0);

                const { data, error } = await supabase.rpc("grant_community_access", {
                    p_email: email,
                    p_community_id: selectedCommunity,
                    p_role: role,
                    p_admin_level: targetLevel,
                });

                if (error) {
                    grantResults.push({ email, status: "error", message: error.message });
                } else if (data === "not_found") {
                    grantResults.push({ email, status: "not_found", message: "No registered user with this email" });
                } else {
                    if (isUpgrade) {
                        await supabase.rpc("sync_multi_community_admin_levels", { p_email: email });
                    }
                    grantResults.push({ email, status: "ok", message: isUpgrade ? "Access granted (Global Upgrade to Level 2) ✓" : "Access granted ✓" });
                }
            } catch (err) {
                grantResults.push({ email, status: "error", message: err.message });
            }
        }

        // --- AUTO-REMOVE MATCHING INVITE REQUESTS ---
        try {
            await supabase
                .from("invite_requests")
                .delete()
                .in("email", emailArray)
                .or(`community_id.eq.${selectedCommunity},community_id.is.null`);
        } catch (err) {
            console.warn("Auto-removal of invite requests failed:", err.message);
        }

        setResults(grantResults);
        setEmailsRaw("");
        if (onSuccess) onSuccess();
        setLoading(false);
    };

    return (
        <div>
            <div style={{ marginBottom: "1.5rem" }}>
                <h3 style={{
                    color: "#ffffff",
                    fontFamily: "'Fredoka', sans-serif",
                    fontWeight: 600,
                    fontSize: "1.35rem",
                    margin: 0
                }}>
                    Grant an Existing User Access to Selected Community
                </h3>
            </div>

            {errorMsg && <div className="admin-error-box">{errorMsg}</div>}

            {duplicateEmails.length > 0 && (
                <div className="admin-warning-box">
                    <strong>⚠️ Already a member of this community:</strong>
                    <ul style={{ margin: "0.5rem 0", paddingLeft: "1.25rem", color: "inherit" }}>
                        {duplicateEmails.map(e => <li key={e} style={{ marginBottom: "0.2rem" }}>{e}</li>)}
                    </ul>
                    <p style={{ margin: "0.75rem 0 0" }}>
                        {checkedEmails.length > 0
                            ? "Remove them and continue with the remaining emails, or cancel."
                            : "All entered emails are already members. Please update your list."}
                    </p>
                    <div style={{ display: "flex", gap: "0.75rem", marginTop: "1rem", flexWrap: "wrap" }}>
                        {checkedEmails.length > 0 && (
                            <button type="button" onClick={handleContinueWithoutDuplicates} className="admin-pill-btn">
                                Remove &amp; Continue ({checkedEmails.length} remaining)
                            </button>
                        )}
                        <button type="button" onClick={() => { setDuplicateEmails([]); setCheckedEmails([]); }} className="admin-pill-btn secondary">
                            Cancel
                        </button>
                    </div>
                </div>
            )}

            <form onSubmit={handleGrant} className="admin-form">
                <RoleAndLevel role={role} adminLevel={adminLevel} onRoleChange={setRole} onLevelChange={setAdminLevel} isGlobalAdmin={isGlobalAdmin} />

                <div className="admin-input-group">
                    <label>User Emails (separate by comma or new line)</label>
                    <textarea
                        value={emailsRaw}
                        onChange={e => setEmailsRaw(e.target.value)}
                        className="admin-input"
                        placeholder={"john@example.com, jane@example.com"}
                        rows={5}
                    />
                </div>

                <div style={{ display: "flex", gap: "1rem", justifyContent: "center", marginTop: "0.5rem", width: "100%" }}>
                    <button type="submit" disabled={loading} className="admin-pill-btn full-width" style={{ margin: 0 }}>
                        {loading ? "Granting..." : "Grant Access"}
                    </button>
                    <button type="button" onClick={() => setEmailsRaw("")} disabled={loading || !emailsRaw} className="admin-pill-btn danger full-width" style={{ margin: 0 }}>
                        Clear Emails
                    </button>
                </div>
            </form>

            {results.length > 0 && (
                <div className="admin-success-box">
                    <h3 style={{ marginTop: 0 }}>Results</h3>
                    <div className="admin-table-wrapper">
                        <table className="task-table">
                            <thead>
                                <tr>
                                    <th>Email</th>
                                    <th>Status</th>
                                </tr>
                            </thead>
                            <tbody>
                                {results.map((r, i) => (
                                    <tr key={i} className="task-row">
                                        <td>{r.email}</td>
                                        <td style={{ color: "#ffffff" }}>
                                            {r.message}
                                        </td>
                                    </tr>
                                ))}
                            </tbody>
                        </table>
                    </div>
                    <p style={{ marginTop: "1rem", fontSize: "0.9rem", color: "#ffffff", lineHeight: "1.4" }}>
                        💡 <strong>Note:</strong> Since access was granted directly to existing accounts, no invite code was generated.
                        Please notify these users manually that they can now log in to access the community resources.
                    </p>
                </div>
            )}
        </div>
    );
}

// ─── Tab 3: Manage Members ────────────────────────────────────────────────────

function ManageMembersTab({ selectedCommunity, isGlobalAdmin, members, refreshMembers }) {
    const [loading, setLoading] = useState(false);
    const [error, setError] = useState("");
    const [editingId, setEditingId] = useState(null);
    const [editRole, setEditRole] = useState("member");
    const [editLevel, setEditLevel] = useState(0);
    const [saving, setSaving] = useState(false);
    const [statusMsg, setStatusMsg] = useState("");

    function startEdit(member) {
        setEditingId(member.user_id);
        setEditRole(member.role);
        setEditLevel(member.admin_level);
        setStatusMsg("");
    }

    async function saveEdit(member) {
        setSaving(true);
        setStatusMsg("");

        let finalLevel = editLevel;

        if (finalLevel === 1) {
            try {
                const { data: elsewhere } = await supabase.rpc("check_admin_elsewhere", { p_emails: [member.email] });
                if (elsewhere && elsewhere.length > 0) {
                    const proceed = window.confirm(
                        `${member.email} is already an admin in another community.\n\nThey will be upgraded to Level 2 (Multi-Community Admin) across all communities. Continue?`
                    );
                    if (!proceed) { setSaving(false); return; }
                    finalLevel = 2;
                }
            } catch (err) {
                console.warn("check_admin_elsewhere error:", err.message);
            }
        }

        const { error } = await supabase.rpc("update_community_membership", {
            p_user_id: member.user_id,
            p_community_id: selectedCommunity,
            p_role: editRole,
            p_admin_level: finalLevel
        });

        if (error) {
            setStatusMsg(`❌ Failed to update ${member.email}: ${error.message}`);
        } else {
            setStatusMsg(`✅ Updated ${member.email}. Admin levels have been synchronized.`);
            setEditingId(null);
            refreshMembers();
        }
        setSaving(false);
    }

    async function revokeAccess(member) {
        const confirmed = window.confirm(`Are you sure you want to revoke ${member.email}'s access?`);
        if (!confirmed) return;

        const { error } = await supabase.rpc("revoke_community_access", {
            p_user_id: member.user_id,
            p_community_id: selectedCommunity
        });

        if (error) {
            setStatusMsg(`❌ Failed to revoke access for ${member.email}: ${error.message}`);
        } else {
            setStatusMsg(`✅ Access revoked for ${member.email}.`);
            refreshMembers();
        }
    }

    const levelOptions = ADMIN_LEVEL_OPTIONS.filter(opt => {
        if (opt.value === 0) return editRole !== "admin";
        if (opt.value === 3) return isGlobalAdmin;
        return true;
    });

    return (
        <div>
            <div style={{ marginBottom: "1.5rem" }}>
                <h3 style={{
                    color: "#ffffff",
                    fontFamily: "'Fredoka', sans-serif",
                    fontWeight: 600,
                    fontSize: "1.35rem",
                    margin: 0
                }}>
                    Manage Existing Member's Roles Here
                </h3>
            </div>

            {error && <div className="admin-error-box">{error}</div>}
            {statusMsg && (
                <div className="admin-warning-box" style={{ backgroundColor: statusMsg.startsWith("✅") ? "#55c46f" : "#d14678", border: "none", color: "#ffffff" }}>
                    {statusMsg}
                </div>
            )}

            {loading ? (
                <p style={{ color: "#a0a0a0" }}>Loading members...</p>
            ) : (
                <>
                    {members.length === 0 ? (
                        <p style={{ color: "#97f7e9" }}>No members found for this community.</p>
                    ) : (
                        <div className="admin-table-wrapper">
                            <table className="task-table">
                                <thead>
                                    <tr>
                                        <th>Email</th>
                                        <th>Display Name</th>
                                        <th>Joined At</th>
                                        <th>Role</th>
                                        <th>Level</th>
                                        <th>Actions</th>
                                    </tr>
                                </thead>
                                <tbody>
                                    {members.map(m => (
                                        <tr key={m.user_id} className="task-row">
                                            <td>{m.email}</td>
                                            <td>{m.display_name || <em style={{ color: "#97f7e9" }}>No profile</em>}</td>
                                            <td>{m.joined_at ? new Date(m.joined_at).toLocaleDateString() : 'N/A'}</td>
                                            {editingId === m.user_id ? (
                                                <>
                                                    <td style={{ minWidth: "150px" }}>
                                                        <CustomSelect 
                                                            value={editRole} 
                                                            onChange={e => { setEditRole(e.target.value); setEditLevel(e.target.value === "admin" ? 1 : 0); }} 
                                                            options={ROLE_OPTIONS} 
                                                            variant="dense"
                                                        />
                                                    </td>
                                                    <td style={{ minWidth: "220px" }}>
                                                        <CustomSelect 
                                                            value={editLevel} 
                                                            onChange={e => setEditLevel(parseInt(e.target.value, 10))} 
                                                            options={levelOptions} 
                                                            variant="dense"
                                                        />
                                                    </td>
                                                    <td>
                                                        <button onClick={() => saveEdit(m)} disabled={saving} className="admin-pill-btn" style={{ padding: "0.4rem 0.8rem", marginRight: "0.5rem" }}>
                                                            {saving ? "Saving..." : "Save"}
                                                        </button>
                                                        <button onClick={() => setEditingId(null)} className="admin-pill-btn secondary" style={{ padding: "0.4rem 0.8rem" }}>Cancel</button>
                                                    </td>
                                                </>
                                            ) : (
                                                <>
                                                    <td>{m.role}</td>
                                                    <td>{levelLabel(m.admin_level)}</td>
                                                    <td>
                                                        <button onClick={() => startEdit(m)} className="admin-pill-btn" style={{ padding: "0.4rem 0.8rem", marginRight: "0.5rem" }}>Edit</button>
                                                        <button onClick={() => revokeAccess(m)} className="admin-pill-btn danger" style={{ padding: "0.4rem 0.8rem" }}>Revoke</button>
                                                    </td>
                                                </>
                                            )}
                                        </tr>
                                    ))}
                                </tbody>
                            </table>
                        </div>
                    )}
                </>
            )}
        </div>
    );
}

// ─── Tab 4: Invite Requests ───────────────────────────────────────────────────

function InviteRequestsTab({ onApprove, onDeny, isGlobalAdmin, selectedCommunity, requests, refreshRequests }) {
    const [loading, setLoading] = useState(false);
    const [error, setError] = useState("");
    const [selectedIds, setSelectedIds] = useState([]);
    const [processing, setProcessing] = useState(false);
    const [statusMsg, setStatusMsg] = useState("");
    const [viewingRequest, setViewingRequest] = useState(null);

    const modalRef = useRef(null);
    const triggerRef = useRef(null);

    useEffect(() => {
        if (viewingRequest && modalRef.current) {
            const focusableElements = modalRef.current.querySelectorAll(
                'button, [href], input, select, textarea, [tabIndex]:not([tabIndex="-1"])'
            );
            const firstElement = focusableElements[0];
            const lastElement = focusableElements[focusableElements.length - 1];

            const handleKeyDown = (e) => {
                if (e.key === 'Tab') {
                    if (e.shiftKey) { // Shift + Tab
                        if (document.activeElement === firstElement) {
                            lastElement.focus();
                            e.preventDefault();
                        }
                    } else { // Tab
                        if (document.activeElement === lastElement) {
                            firstElement.focus();
                            e.preventDefault();
                        }
                    }
                } else if (e.key === 'Escape') {
                    setViewingRequest(null);
                }
            };

            if (firstElement) firstElement.focus();

            modalRef.current.addEventListener('keydown', handleKeyDown);
            return () => {
                if (modalRef.current) modalRef.current.removeEventListener('keydown', handleKeyDown);
            };
        } else if (!viewingRequest && triggerRef.current) {
            triggerRef.current.focus();
        }
    }, [viewingRequest]);

    const toggleSelect = (id) => {
        setSelectedIds(prev => prev.includes(id) ? prev.filter(x => x !== id) : [...prev, id]);
    };

    const handleBatchApprove = () => {
        const emails = requests
            .filter(r => selectedIds.includes(r.id))
            .map(r => r.email)
            .join(", ");
        if (!emails) return;
        onApprove(emails);
    };

    const handleDeny = async (ids) => {
        if (!window.confirm(`Are you sure you want to deny ${ids.length} request(s)?`)) return;
        setProcessing(true);
        const { error } = await supabase
            .from("invite_requests")
            .delete()
            .in("id", ids);

        if (error) {
            setStatusMsg(`❌ Failed to deny requests: ${error.message}`);
        } else {
            setStatusMsg(`✅ Denied ${ids.length} request(s).`);
            // Sync with parent form state
            const deniedEmails = requests.filter(r => ids.includes(r.id)).map(r => r.email);
            onDeny(deniedEmails);

            refreshRequests();
            setSelectedIds([]);
            if (viewingRequest && ids.includes(viewingRequest.id)) {
                setViewingRequest(null);
            }
        }
        setProcessing(false);
    };

    if (loading) return <p style={{ color: "#97f7e9", padding: "1rem" }}>Loading requests...</p>;

    return (
        <div>
            <div style={{ marginBottom: "1.5rem" }}>
                <h3 style={{
                    color: "#ffffff",
                    fontFamily: "'Fredoka', sans-serif",
                    fontWeight: 600,
                    fontSize: "1.35rem",
                    margin: 0
                }}>
                    Accept or Deny Invite Requests for Those Wanting to Join Your Community
                </h3>
            </div>

            {error && <div className="admin-error-box">{error}</div>}
            {statusMsg && (
                <div className="admin-warning-box" style={{ backgroundColor: statusMsg.startsWith("✅") ? "#55c46f" : "#d14678", border: "none", color: "#ffffff" }}>
                    {statusMsg}
                </div>
            )}

            <div style={{ marginBottom: "1rem", display: "flex", gap: "0.5rem" }}>
                <button
                    disabled={selectedIds.length === 0}
                    onClick={handleBatchApprove}
                    className="admin-pill-btn" style={{ padding: "0.5rem 1rem" }}
                >
                    Invite Selected ({selectedIds.length})
                </button>
                <button
                    disabled={selectedIds.length === 0 || processing}
                    onClick={() => handleDeny(selectedIds)}
                    className="admin-pill-btn danger" style={{ padding: "0.5rem 1rem" }}
                >
                    Deny Selected
                </button>
            </div>

            {requests.length === 0 ? (
                <p style={{ color: "#97f7e9" }}>No pending invite requests.</p>
            ) : (
                <div className="admin-table-wrapper">
                    <table className="task-table">
                        <thead>
                            <tr>
                                <th style={{ width: "40px" }}>
                                    <input
                                        type="checkbox"
                                        aria-label="Select all invite requests"
                                        checked={selectedIds.length === requests.length && requests.length > 0}
                                        onChange={() => setSelectedIds(selectedIds.length === requests.length ? [] : requests.map(r => r.id))}
                                    />
                                </th>
                                <th>Name</th>
                                <th>Email</th>
                                <th>Zip Code</th>
                                <th>Community</th>
                                <th>Requested At</th>
                                <th>Message</th>
                                <th>Actions</th>
                             </tr>
                        </thead>
                        <tbody>
                            {requests.map(r => (
                                <tr key={r.id} className="task-row">
                                    <td>
                                        <input
                                            type="checkbox"
                                            aria-label={`Select request from ${r.email}`}
                                            checked={selectedIds.includes(r.id)}
                                            onChange={() => toggleSelect(r.id)}
                                        />
                                    </td>
                                    <td>{r.first_name || r.last_name ? `${r.first_name || ''} ${r.last_name || ''}`.trim() : <em style={{ color: "rgba(255,255,255,0.4)" }}>N/A</em>}</td>
                                    <td>{r.email}</td>
                                    <td>{r.zip_code}</td>
                                    <td>{r.community_name || <em style={{ color: "#97f7e9" }}>General Request</em>}</td>
                                    <td>{r.created_at ? new Date(r.created_at).toLocaleDateString() : 'N/A'}</td>
                                    <td>
                                        <button
                                            onClick={(e) => {
                                                triggerRef.current = e.currentTarget;
                                                setViewingRequest(r);
                                            }}
                                            className="admin-pill-btn secondary" style={{ margin: 0, fontSize: "0.75rem", padding: "0.3rem 0.6rem" }}
                                        >
                                            View Message
                                        </button>
                                    </td>
                                    <td>
                                        <button
                                            onClick={() => onApprove(r.email)}
                                            className="admin-pill-btn" style={{ margin: 0, padding: "0.3rem 0.6rem", marginRight: "0.4rem", fontSize: "0.85rem" }}
                                        >
                                            Invite
                                        </button>
                                        <button
                                            onClick={() => handleDeny([r.id])}
                                            disabled={processing}
                                            className="admin-pill-btn danger" style={{ margin: 0, padding: "0.3rem 0.6rem", fontSize: "0.85rem" }}
                                        >
                                            Deny
                                        </button>
                                    </td>
                                </tr>
                            ))}
                        </tbody>
                    </table>
                </div>
            )}

            {/* Request Detail Modal */}
            {viewingRequest && createPortal(
                <div 
                    style={{ position: 'fixed', top: 0, left: 0, right: 0, bottom: 0, background: 'rgba(0,0,0,0.6)', backdropFilter: 'blur(8px)', display: 'flex', justifyContent: 'center', alignItems: 'center', zIndex: 100000 }}
                    onClick={() => setViewingRequest(null)}
                >
                    <div 
                        ref={modalRef}
                        role="dialog"
                        aria-modal="true"
                        aria-labelledby="modal-title"
                        tabIndex="-1"
                        className="admin-panel" style={{ padding: '2rem', maxWidth: '550px', width: '90%', maxHeight: '90vh', overflowY: 'auto', borderRadius: '16px', border: '1px solid rgba(151, 247, 233, 0.35)', position: 'relative', backgroundColor: 'rgba(36, 43, 179, 0.5)' }}
                        onClick={e => e.stopPropagation()}
                    >
                        <button 
                            onClick={() => setViewingRequest(null)} 
                            aria-label="Close modal"
                            style={{ position: 'absolute', top: '1rem', right: '1.2rem', background: 'none', border: 'none', color: 'white', fontSize: '1.2rem', cursor: 'pointer', lineHeight: 1 }}
                        >×</button>
                        <h3 id="modal-title" style={{ margin: '0 0 1rem', color: 'var(--auth-text-light-blue)', fontFamily: "'Fredoka', sans-serif" }}>Invite Request Detail</h3>
                        <div style={{ marginBottom: '2rem', color: '#ffffff', fontSize: '1.05rem', lineHeight: '1.6' }}>
                            <p style={{ margin: '0.5rem 0' }}><strong>Name:</strong> {viewingRequest.first_name || viewingRequest.last_name ? `${viewingRequest.first_name || ''} ${viewingRequest.last_name || ''}`.trim() : 'N/A'}</p>
                            <p style={{ margin: '0.5rem 0' }}><strong>Email:</strong> {viewingRequest.email}</p>
                            <p style={{ margin: '0.5rem 0' }}><strong>Zip Code:</strong> {viewingRequest.zip_code}</p>
                            <p style={{ margin: '0.5rem 0' }}><strong>Community:</strong> {viewingRequest.community_name || <em style={{ color: "#97f7e9" }}>General Request</em>}</p>
                            <div className="glass-panel" style={{ marginTop: '1.5rem', padding: '1.5rem', border: '1px solid rgba(151, 247, 233, 0.2)' }}>
                                <strong style={{ color: '#ffffff' }}>Message:</strong>
                                <p style={{ whiteSpace: 'pre-wrap', marginTop: '0.75rem', maxHeight: '200px', overflowY: 'auto', color: '#ffffff', fontSize: '0.95rem' }}>
                                    {viewingRequest.message || <em style={{ color: "#97f7e9" }}>No introductory message provided.</em>}
                                </p>
                            </div>
                        </div>
                        <div style={{ display: 'flex', gap: '0.75rem', justifyContent: 'flex-end', flexWrap: 'wrap' }}>
                            <button
                                onClick={() => { onApprove(viewingRequest.email); setViewingRequest(null); }}
                                className="admin-pill-btn"
                            >
                                Invite User
                            </button>
                            <button
                                onClick={() => handleDeny([viewingRequest.id])}
                                disabled={processing}
                                className="admin-pill-btn danger"
                            >
                                Deny Request
                            </button>
                            <button
                                onClick={() => setViewingRequest(null)}
                                className="admin-pill-btn secondary"
                            >
                                Close
                            </button>
                        </div>
                    </div>
                </div>,
                document.body
            )}
        </div>
    );
}

function PendingPostsTab({ selectedCommunity, refreshCounts }) {
    const [posts, setPosts] = useState([]);
    const [loading, setLoading] = useState(true);
    const [actioningId, setActioningId] = useState(null);
    const [showRejectModal, setShowRejectModal] = useState(false);
    const [rejectingPost, setRejectingPost] = useState(null);
    const [rejectionReason, setRejectionReason] = useState("");
    const [fetchError, setFetchError] = useState(null);
    const modalRef = useRef(null);

    const fetchPending = async () => {
        setLoading(true);
        setFetchError(null);
        console.log("Fetching pending posts for community:", selectedCommunity);
        
        try {
            const { data, error } = await supabase
                .from('bulletin_posts')
                .select(`
                    *,
                    author:profiles(display_name, contact_email)
                `)
                .eq('community_id', selectedCommunity)
                .eq('status', 'pending')
                .order('created_at', { ascending: true });
            
            if (error) {
                console.error("Supabase Error fetching pending posts:", error);
                setFetchError(error.message);
            } else {
                console.log("Successfully fetched pending posts:", data?.length || 0);
                setPosts(data || []);
                if (refreshCounts) refreshCounts(data ? data.length : 0);
            }
        } catch (err) {
            console.error("Unexpected error in fetchPending:", err);
            setFetchError(err.message);
        } finally {
            setLoading(false);
        }
    };

    useEffect(() => {
        if (!selectedCommunity) return;
        
        fetchPending();

        const channel = supabase.channel(`bulletin_changes_${selectedCommunity}`)
            .on(
                'postgres_changes',
                {
                    event: '*',
                    schema: 'public',
                    table: 'bulletin_posts',
                    filter: `community_id=eq.${selectedCommunity}`
                },
                (payload) => {
                    console.log('Realtime update received:', payload);
                    fetchPending();
                }
            )
            .subscribe();

        return () => {
            supabase.removeChannel(channel);
        };
    }, [selectedCommunity]);

    const handleApprove = async (id) => {
        setActioningId(id);
        const post = posts.find(p => p.id === id);
        const { error } = await supabase
            .from('bulletin_posts')
            .update({ status: 'approved' })
            .eq('id', id);
        
        if (!error) {
            try {
                const { data: { user } } = await supabase.auth.getUser();
                if (post && post.author_id !== user?.id) {
                    await supabase
                        .from('notifications')
                        .insert({
                            user_id: post.author_id,
                            actor_id: user?.id,
                            type: 'post_approved',
                            reference_id: id,
                            metadata: { post_snippet: post.content.substring(0, 50) }
                        });
                }
            } catch (err) {
                console.error("Error creating post_approved notification:", err);
            }
            fetchPending();
        }
        setActioningId(null);
    };

    const handleRejectSubmit = async () => {
        if (!rejectionReason.trim()) return;
        const post = rejectingPost;
        setActioningId(post.id);
        const { error } = await supabase
            .from('bulletin_posts')
            .update({ 
                status: 'rejected',
                rejection_reason: rejectionReason
            })
            .eq('id', post.id);
        
        if (!error) {
            try {
                const { data: { user } } = await supabase.auth.getUser();
                if (post && post.author_id !== user?.id) {
                    await supabase
                        .from('notifications')
                        .insert({
                            user_id: post.author_id,
                            actor_id: user?.id,
                            type: 'post_rejected',
                            reference_id: post.id,
                            metadata: { 
                                post_snippet: post.content.substring(0, 50),
                                rejection_reason: rejectionReason
                            }
                        });
                }
            } catch (err) {
                console.error("Error creating post_rejected notification:", err);
            }
            setShowRejectModal(false);
            setRejectingPost(null);
            setRejectionReason("");
            fetchPending();
        }
        setActioningId(null);
    };

    if (loading) return <p style={{ color: "#97f7e9", padding: "1rem" }}>Loading pending posts...</p>;

    return (
        <div className="admin-tab-container">
            <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: "1.5rem" }}>
                <h3 style={{ 
                    color: "#ffffff", 
                    margin: 0, 
                    fontWeight: 600, 
                    fontSize: "1.35rem" 
                }}>Bulletin Board Moderation Queue</h3>
            </div>
            
            {fetchError && (
                <div className="glass-panel danger" style={{ padding: '1rem', marginBottom: '1.5rem', background: 'rgba(255, 71, 87, 0.1)', border: '1px solid #ff4757' }}>
                    <p style={{ color: '#ff4757', margin: 0 }}><strong>Query Error:</strong> {fetchError}</p>
                    <p style={{ color: '#ff4757', fontSize: '0.8rem', marginTop: '0.5rem' }}>Check your browser console for more details.</p>
                </div>
            )}
            
            {posts.length === 0 ? (
                <p style={{ color: "#97f7e9" }}>No pending posts for this community.</p>
            ) : (
                <div style={{ display: 'flex', flexDirection: 'column', gap: '1.5rem' }}>
                    {posts.map(post => (
                        <div key={post.id} className="glass-panel" style={{ 
                            padding: '1.5rem', 
                            background: 'rgba(255, 255, 255, 0.08)'
                        }}>
                            <div style={{ display: 'flex', justifyContent: 'space-between', marginBottom: '1rem', borderBottom: '1px solid rgba(255,255,255,0.05)', paddingBottom: '0.8rem' }}>
                                <div>
                                    <strong style={{ display: 'block', fontSize: '1.1rem' }}>{post.author?.display_name || 'No Display Name'}</strong>
                                    <span style={{ fontSize: '0.85rem', color: '#97f7e9' }}>{post.author?.contact_email}</span>
                                </div>
                                <span style={{ fontSize: '0.8rem', color: '#ffffff' }}>{new Date(post.created_at).toLocaleString()}</span>
                            </div>
                            
                            <p style={{ whiteSpace: 'pre-wrap', marginBottom: '1rem', fontSize: '1rem', lineHeight: '1.5' }}>{post.content}</p>
                            
                            {post.image_urls && post.image_urls.length > 0 && (
                                <div style={{ 
                                    display: 'flex', 
                                    gap: '0.8rem', 
                                    marginBottom: '1.5rem', 
                                    overflowX: 'auto',
                                    paddingBottom: '0.5rem'
                                }}>
                                    {post.image_urls.map((url, idx) => (
                                        <img key={idx} src={url} alt="Submission" style={{ height: '120px', borderRadius: '8px', border: '1px solid var(--glass-border)', flexShrink: 0 }} />
                                    ))}
                                </div>
                            )}

                            {post.link_url && (
                                <div style={{ marginBottom: '1.5rem', fontSize: '0.85rem', color: '#97f7e9' }}>
                                    <span style={{ color: '#ffffff' }}>Link: </span>
                                    <a href={post.link_url} target="_blank" rel="noopener noreferrer" style={{ color: 'inherit' }}>{post.link_url}</a>
                                </div>
                            )}
                            
                            <div style={{ display: 'flex', gap: '1rem' }}>
                                <button 
                                    onClick={() => handleApprove(post.id)}
                                    disabled={actioningId === post.id}
                                    className="admin-pill-btn" 
                                    style={{ background: '#55c46f', border: 'none', color: '#fff' }}
                                >
                                    {actioningId === post.id ? 'Approving...' : 'Approve & Publish'}
                                </button>
                                <button 
                                    onClick={() => { setRejectingPost(post); setShowRejectModal(true); }}
                                    disabled={actioningId === post.id}
                                    className="admin-pill-btn danger"
                                >
                                    Reject With Reason
                                </button>
                            </div>
                        </div>
                    ))}
                </div>
            )}

            {showRejectModal && createPortal(
                <div style={{ position: 'fixed', top: 0, left: 0, right: 0, bottom: 0, background: 'linear-gradient(180deg, rgba(112, 212, 219, 1) 0%, rgba(49, 101, 168, 1) 52%, rgba(84, 0, 140, 0.95) 100%)', display: 'flex', justifyContent: 'center', alignItems: 'center', zIndex: 100000 }}>
                    <div 
                        ref={modalRef}
                        role="dialog"
                        aria-modal="true"
                        aria-labelledby="reject-modal-title"
                        tabIndex="-1"
                        className="admin-panel" 
                        style={{ padding: '2.5rem', maxWidth: '550px', width: '90%', maxHeight: '90vh', overflowY: 'auto', borderRadius: '16px', position: 'relative' }}
                    >
                        <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '1.5rem' }}>
                            <h3 id="reject-modal-title" style={{ margin: 0, color: "#ffffff", fontFamily: "'Fredoka', sans-serif", fontWeight: 600, fontSize: "1.35rem" }}>Reject Submission</h3>
                            <button onClick={() => setShowRejectModal(false)} style={{ background: 'none', border: 'none', fontSize: '2rem', cursor: 'pointer', color: 'white', lineHeight: 1 }}>×</button>
                        </div>
                        
                        <p style={{ color: '#ffffff', marginBottom: '1.5rem', fontSize: '1.05rem', lineHeight: '1.6' }}>
                            Explain why this post doesn't align with the community guidelines. The author will see this reason.
                        </p>
                        
                        <textarea 
                            className="admin-input"
                            value={rejectionReason}
                            onChange={(e) => setRejectionReason(e.target.value)}
                            placeholder="e.g. This post contains content that doesn't align with our community guidelines on Baha'i principles..."
                            rows={5}
                            style={{ 
                                width: '100%', 
                                marginBottom: '2rem', 
                                resize: 'none',
                                background: 'rgba(0, 0, 0, 0.2)',
                                border: '1px solid rgba(151, 247, 233, 0.2)',
                                padding: '1rem',
                                color: '#ffffff',
                                fontSize: '0.95rem'
                            }}
                            autoFocus
                        />
                        
                        <div style={{ display: 'flex', gap: '1rem', justifyContent: 'flex-end', borderTop: '1px solid rgba(255,255,255,0.05)', paddingTop: '1.5rem' }}>
                            <button className="admin-pill-btn secondary" onClick={() => setShowRejectModal(false)}>Cancel</button>
                            <button className="admin-pill-btn danger" onClick={handleRejectSubmit}>Confirm Rejection</button>
                        </div>
                    </div>
                </div>,
                document.body
            )}
        </div>
    );
}

// ─── Main Page Component ──────────────────────────────────────────────────────
export default function AdminMembers({ isGlobalAdmin: propIsGlobalAdmin }) {
    const { communities, activeCommunityId, setActiveCommunityId } = useCommunity();
    const [isGlobalAdmin, setIsGlobalAdmin] = useState(propIsGlobalAdmin || false);
    const [isCommunityAdmin, setIsCommunityAdmin] = useState(false);
    const [authLoading, setAuthLoading] = useState(true);

    useEffect(() => {
        setIsGlobalAdmin(propIsGlobalAdmin);
    }, [propIsGlobalAdmin]);

    useEffect(() => {
        const checkAuth = async () => {
            if (!activeCommunityId) {
                setAuthLoading(false);
                return;
            }
            setAuthLoading(true);
            try {
                // Global admin check
                const { data: globalCheck } = await supabase.rpc('is_global_admin', { uid: (await supabase.auth.getUser()).data.user.id });
                if (globalCheck) {
                    setIsCommunityAdmin(true);
                    setAuthLoading(false);
                    return;
                }

                // Community admin check
                const { data, error } = await supabase
                    .from('memberships')
                    .select('role, admin_level')
                    .eq('user_id', (await supabase.auth.getUser()).data.user.id)
                    .eq('community_id', activeCommunityId)
                    .eq('approved', true)
                    .single();

                setIsCommunityAdmin(data && (data.role === 'admin' || data.admin_level > 0));
            } catch (err) {
                console.error("Auth check error:", err);
                setIsCommunityAdmin(false);
            } finally {
                setAuthLoading(false);
            }
        };
        checkAuth();
    }, [activeCommunityId, propIsGlobalAdmin]);

    const [activeTab, setActiveTab] = useState(0);
    // Accordion: which tab is expanded on mobile (can be same as activeTab or null)
    const [accordionOpen, setAccordionOpen] = useState(0);
    const [inviteEmailsRaw, setInviteEmailsRaw] = useState("");
    const [grantEmailsRaw, setGrantEmailsRaw] = useState("");

    // Lifted Data States
    const [members, setMembers] = useState([]);
    const [requests, setRequests] = useState([]);
    const [pendingPostsCount, setPendingPostsCount] = useState(0);
    const [loadingData, setLoadingData] = useState(false);

    const getEmailCount = (raw) => {
        if (!raw) return 0;
        return raw.split(/[\n, ]+/).map(e => e.trim()).filter(e => e.includes("@")).length;
    };

    const tabRefs = useRef([]);

    const switchTab = (i) => {
        setActiveTab(i);
        setAccordionOpen(i);
    };

    const handleTabKeyDown = (e, index) => {
        let newIndex = index;
        if (e.key === "ArrowRight") {
            e.preventDefault();
            newIndex = (index + 1) % TABS.length;
        } else if (e.key === "ArrowLeft") {
            e.preventDefault();
            newIndex = (index - 1 + TABS.length) % TABS.length;
        } else if (e.key === "Home") {
            e.preventDefault();
            newIndex = 0;
        } else if (e.key === "End") {
            e.preventDefault();
            newIndex = TABS.length - 1;
        }

        if (newIndex !== index) {
            switchTab(newIndex);
            setTimeout(() => {
                if (tabRefs.current[newIndex]) {
                    tabRefs.current[newIndex].focus();
                }
            }, 0);
        }
    };

    const cleanupOldPosts = async () => {
        try {
            const threeMonthsAgo = new Date();
            threeMonthsAgo.setMonth(threeMonthsAgo.getMonth() - 3);
            const cutoff = threeMonthsAgo.toISOString();

            // 1. Get old posts with their image_urls
            const { data: oldPosts, error: fetchError } = await supabase
                .from('bulletin_posts')
                .select('id, image_urls')
                .lt('created_at', cutoff);

            if (fetchError) throw fetchError;
            if (!oldPosts || oldPosts.length === 0) return;

            console.log(`Cleaning up ${oldPosts.length} old posts...`);

            // 2. Delete images from storage
            const allFilesToRemove = [];
            for (const post of oldPosts) {
                if (post.image_urls && post.image_urls.length > 0) {
                    post.image_urls.forEach(url => {
                        const parts = url.split('/');
                        const filename = parts[parts.length - 1];
                        if (filename) allFilesToRemove.push(filename);
                    });
                }
            }

            if (allFilesToRemove.length > 0) {
                const { error: storageError } = await supabase.storage
                    .from('bulletin_images')
                    .remove(allFilesToRemove);
                if (storageError) console.error('Error deleting storage files:', storageError);
            }

            // 3. Delete database records
            const { error: deleteError } = await supabase
                .from('bulletin_posts')
                .delete()
                .lt('created_at', cutoff);

            if (deleteError) throw deleteError;
        } catch (err) {
            console.error('Cleanup failed:', err);
        }
    };

    const fetchMembers = async (cid) => {
        const targetCid = cid || activeCommunityId;
        if (!targetCid) return;
        const { data } = await supabase.rpc("get_community_members", { p_community_id: targetCid });
        setMembers(data || []);
    };

    const fetchRequests = async (cid) => {
        const targetCid = cid || activeCommunityId;
        if (!targetCid) return;
        const { data } = await supabase.rpc("get_invite_requests", { p_community_id: targetCid });
        setRequests(data || []);
    };

    const fetchPendingCount = async (cid) => {
        const targetCid = cid || activeCommunityId;
        if (!targetCid) return;
        const { count } = await supabase
            .from('bulletin_posts')
            .select('*', { count: 'exact', head: true })
            .eq('community_id', targetCid)
            .eq('status', 'pending');
        setPendingPostsCount(count || 0);
    };

    const handleDenySync = (deniedEmails) => {
        const filterFn = (raw) => {
            if (!raw) return "";
            return raw.split(/[\n, ]+/)
                .map(e => e.trim())
                .filter(e => e && !deniedEmails.some(de => de.toLowerCase() === e.toLowerCase()))
                .join("\n");
        };
        setInviteEmailsRaw(prev => filterFn(prev));
        setGrantEmailsRaw(prev => filterFn(prev));
    };

    const handleApprove = async (emailsRawInput) => {
        const emails = emailsRawInput.split(/[\n, ]+/).map(e => e.trim()).filter(e => e.includes("@"));
        if (emails.length === 0) return;

        if (emails.length > 1) {
            setInviteEmailsRaw(prev => prev ? prev + "\n" + emails.join("\n") : emails.join("\n"));
            switchTab(0);
            return;
        }

        const email = emails[0];
        try {
            // Refined check: user must have an account AND at least one community membership
            // to be routed to "Grant Access". Otherwise, they get an invite code.
            const { data: isActive } = await supabase.rpc("check_user_active", { p_email: email });
            if (isActive) {
                setGrantEmailsRaw(prev => prev ? prev + "\n" + email : email);
                switchTab(1);
            } else {
                setInviteEmailsRaw(prev => prev ? prev + "\n" + email : email);
                switchTab(0);
            }
        } catch (err) {
            console.warn("check_user_active failed:", err.message);
            setInviteEmailsRaw(prev => prev ? prev + "\n" + email : email);
            switchTab(0);
        }
    };

    const handleMoveToGrantAccess = (emails) => {
        setGrantEmailsRaw(prev => prev ? prev + "\n" + emails.join("\n") : emails.join("\n"));
        switchTab(1);
    };

    useEffect(() => {
        cleanupOldPosts();
    }, []);

    useEffect(() => {
        if (activeCommunityId) {
            fetchMembers(activeCommunityId);
            fetchRequests(activeCommunityId);
            fetchPendingCount(activeCommunityId);
        }
    }, [activeCommunityId]);

    // Renders the content for a given tab index
    const renderTabContent = (i) => {
        if (i === 0) return (
            <InviteTab
                communities={communities}
                selectedCommunity={activeCommunityId}
                isGlobalAdmin={isGlobalAdmin}
                emailsRaw={inviteEmailsRaw}
                setEmailsRaw={setInviteEmailsRaw}
                onSuccess={() => { fetchMembers(); fetchRequests(); }}
                onMoveToGrantAccess={handleMoveToGrantAccess}
            />
        );
        if (i === 1) return (
            <GrantAccessTab
                communities={communities}
                selectedCommunity={activeCommunityId}
                isGlobalAdmin={isGlobalAdmin}
                emailsRaw={grantEmailsRaw}
                setEmailsRaw={setGrantEmailsRaw}
                onSuccess={() => fetchRequests(activeCommunityId)}
            />
        );
        if (i === 2) return (
            <ManageMembersTab
                selectedCommunity={activeCommunityId}
                isGlobalAdmin={isGlobalAdmin}
                members={members}
                refreshMembers={() => fetchMembers()}
            />
        );
        if (i === 3) return (
            <InviteRequestsTab
                onApprove={handleApprove}
                onDeny={handleDenySync}
                isGlobalAdmin={isGlobalAdmin}
                selectedCommunity={activeCommunityId}
                requests={requests}
                refreshRequests={() => fetchRequests()}
            />
        );
        if (i === 4) return (
            <PendingPostsTab 
                selectedCommunity={activeCommunityId} 
                refreshCounts={setPendingPostsCount}
            />
        );
        return null;
    };

    return (
        <div className="member-mgmt-container">
            <div className="admin-header-container">
                <h1 className="admin-title">Member Management</h1>
                <div className="admin-community-select-wrapper">
                    <CommunitySelect communities={communities} value={activeCommunityId} onChange={setActiveCommunityId} />
                </div>
            </div>

            <div className="admin-panel-wrapper">
                {/* ── Desktop: horizontal tab bar ── */}
                <div
                    className="admin-tabs"
                    role="tablist"
                    aria-label="Member management sections"
                >
                    {TABS.map((tab, i) => {
                        let count = 0;
                        if (i === 0) count = getEmailCount(inviteEmailsRaw);
                        else if (i === 1) count = getEmailCount(grantEmailsRaw);
                        else if (i === 2) count = members.length;
                        else if (i === 3) count = requests.length;
                        else if (i === 4) count = pendingPostsCount;

                        const panelId = `tab-panel-${i}`;
                        const tabId = `tab-btn-${i}`;

                        return (
                            <button
                                key={tab}
                                id={tabId}
                                role="tab"
                                aria-selected={activeTab === i}
                                aria-controls={panelId}
                                onClick={() => switchTab(i)}
                                onKeyDown={(e) => handleTabKeyDown(e, i)}
                                ref={el => tabRefs.current[i] = el}
                                className={`admin-tab-btn ${activeTab === i ? 'active' : ''}`}
                                tabIndex={activeTab === i ? 0 : -1}
                            >
                                {tab}
                                <span
                                    className="admin-tab-badge"
                                    aria-label={`${count} ${count === 1 ? 'item' : 'items'}`}
                                >{count}</span>
                            </button>
                        );
                    })}
                </div>

                {/* Desktop tab panel */}
                <div
                    id={`tab-panel-${activeTab}`}
                    role="tabpanel"
                    aria-labelledby={`tab-btn-${activeTab}`}
                    className="admin-panel admin-desktop-only"
                    tabIndex={0}
                >
                    {renderTabContent(activeTab)}
                </div>

                {/* ── Mobile: accordion ── */}
                <div
                    className="admin-accordion"
                    aria-label="Member management sections"
                >
                    {TABS.map((tab, i) => {
                        let count = 0;
                        if (i === 0) count = getEmailCount(inviteEmailsRaw);
                        else if (i === 1) count = getEmailCount(grantEmailsRaw);
                        else if (i === 2) count = members.length;
                        else if (i === 3) count = requests.length;
                        else if (i === 4) count = pendingPostsCount;

                        const isOpen = accordionOpen === i;
                        const regionId = `accordion-panel-${i}`;
                        const headerId = `accordion-header-${i}`;

                        return (
                            <div key={tab} className="admin-accordion-item">
                                <button
                                    id={headerId}
                                    className="admin-accordion-btn"
                                    aria-expanded={isOpen}
                                    aria-controls={regionId}
                                    onClick={() => {
                                        setAccordionOpen(isOpen ? null : i);
                                        setActiveTab(i);
                                    }}
                                >
                                    <span>
                                        {tab}
                                        <span
                                            className="admin-tab-badge"
                                            aria-label={`${count} ${count === 1 ? 'item' : 'items'}`}
                                            style={{ marginLeft: '0.5rem' }}
                                        >{count}</span>
                                    </span>
                                    <span className="admin-accordion-icon" aria-hidden="true">▼</span>
                                </button>
                                {isOpen && (
                                    <div
                                        id={regionId}
                                        role="region"
                                        aria-labelledby={headerId}
                                        className="admin-accordion-panel"
                                    >
                                        {renderTabContent(i)}
                                    </div>
                                )}
                            </div>
                        );
                    })}
                </div>
            </div>
        </div>
    );
}


