import React, { useState, useEffect } from 'react';
import { useNavigate } from 'react-router-dom';
import supabase from './supabaseClient';
import { useCommunity } from './context/CommunityContext';
import CustomSelect from './components/CustomSelect';

const STATUS_COLORS = {
    active:    { bg: 'rgba(85,196,111,0.18)',   text: '#55c46f', border: 'rgba(85,196,111,0.4)'   },
    completed: { bg: 'rgba(9,209,214,0.18)',     text: '#09d1d6', border: 'rgba(9,209,214,0.4)'    },
    archived:  { bg: 'rgba(255,255,255,0.08)',   text: 'rgba(255,255,255,0.45)', border: 'rgba(255,255,255,0.2)' },
};

function StatusBadge({ status }) {
    const c = STATUS_COLORS[status] || STATUS_COLORS.active;
    return (
        <span style={{
            background: c.bg, color: c.text, border: `1px solid ${c.border}`,
            borderRadius: '9999px', padding: '2px 10px', fontSize: '0.75rem',
            fontWeight: 600, textTransform: 'capitalize', whiteSpace: 'nowrap'
        }}>
            {status}
        </span>
    );
}

function formatDateRange(start, end) {
    if (!start && !end) return null;
    const fmt = (d) => new Date(d).toLocaleDateString('en-US', { month: 'short', day: 'numeric', year: 'numeric' });
    if (start && end) return `${fmt(start)} – ${fmt(end)}`;
    if (start) return `Starts ${fmt(start)}`;
    return `Ends ${fmt(end)}`;
}

function daysLeft(endsAt) {
    if (!endsAt) return null;
    return Math.ceil((new Date(endsAt) - new Date()) / 86400000);
}

export default function PlanningSessionsPage({ session, isAdmin }) {
    const navigate = useNavigate();
    const { activeCommunityId } = useCommunity();

    const [sessions,     setSessions]    = useState([]);
    const [loading,      setLoading]     = useState(true);
    const [fetchError,   setFetchError]  = useState('');
    const [search,       setSearch]      = useState('');
    const [statusFilter, setStatusFilter] = useState('all');
    const [creating,     setCreating]    = useState(false);
    const [draftSaved,   setDraftSaved]  = useState(false);

    const blankForm = { title: '', description: '', starts_at: '', ends_at: '', status: 'active', is_hidden: false, links: [] };
    const DRAFT_KEY = `planning_new_draft_${session.user.id}`;

    // ── Restore draft from localStorage on first mount ────────────────────
    const readDraft = () => {
        try {
            const raw = localStorage.getItem(DRAFT_KEY);
            if (!raw) return { form: blankForm, showCreate: false };
            const saved = JSON.parse(raw);
            return { form: saved.form || blankForm, showCreate: saved.showCreate || false };
        } catch { return { form: blankForm, showCreate: false }; }
    };
    const initial = readDraft();
    const [form,       setForm]       = useState(initial.form);
    const [showCreate, setShowCreate] = useState(initial.showCreate);
    const [linkLabel,  setLinkLabel]  = useState('');
    const [linkUrl,    setLinkUrl]    = useState('');

    // ── Persist draft whenever form or showCreate changes ─────────────────
    useEffect(() => {
        try {
            localStorage.setItem(DRAFT_KEY, JSON.stringify({ form, showCreate }));
            if (showCreate) {
                setDraftSaved(true);
                const t = setTimeout(() => setDraftSaved(false), 1500);
                return () => clearTimeout(t);
            }
        } catch { /* ignore quota errors */ }
    }, [form, showCreate]);

    const clearDraft = () => { try { localStorage.removeItem(DRAFT_KEY); } catch {} };

    useEffect(() => {
        if (activeCommunityId) fetchSessions();
    }, [activeCommunityId]);

    const fetchSessions = async () => {
        if (sessions.length === 0) setLoading(true);
        setFetchError('');
        try {
            // 1. Fetch sessions (no embedded joins — avoids auth-schema traversal issues)
            const { data: sessionRows, error: sessionErr } = await supabase
                .from('planning_sessions')
                .select('*')
                .eq('community_id', activeCommunityId)
                .order('created_at', { ascending: false });
            if (sessionErr) throw sessionErr;
            if (!sessionRows || sessionRows.length === 0) { setSessions([]); return; }

            // 2. Fetch creator display names
            const creatorIds = [...new Set(sessionRows.map(s => s.created_by).filter(Boolean))];
            const { data: profileRows } = await supabase
                .from('profiles')
                .select('user_id, display_name')
                .in('user_id', creatorIds);
            const profileMap = (profileRows || []).reduce((acc, p) => { acc[p.user_id] = p; return acc; }, {});

            // 3. Fetch task counts (status only — minimal data)
            const sessionIds = sessionRows.map(s => s.id);
            const { data: taskRows } = await supabase
                .from('session_tasks')
                .select('session_id, status')
                .in('session_id', sessionIds);
            const taskMap = (taskRows || []).reduce((acc, t) => {
                if (!acc[t.session_id]) acc[t.session_id] = [];
                acc[t.session_id].push(t);
                return acc;
            }, {});

            // 4. Merge
            setSessions(sessionRows.map(s => ({
                ...s,
                creator: profileMap[s.created_by] || null,
                tasks: taskMap[s.id] || [],
            })));
        } catch (err) {
            console.error('Error fetching sessions:', err);
            setFetchError('Could not load sessions: ' + err.message);
        } finally {
            setLoading(false);
        }
    };

    const filtered = sessions.filter(s => {
        const matchSearch = !search ||
            s.title.toLowerCase().includes(search.toLowerCase()) ||
            s.description?.toLowerCase().includes(search.toLowerCase());
        const matchStatus = statusFilter === 'all' || s.status === statusFilter;
        return matchSearch && matchStatus;
    });

    const getStats = (tasks = []) => {
        const total = tasks.length;
        const done  = tasks.filter(t => t.status === 'done').length;
        return { total, done, pct: total ? Math.round((done / total) * 100) : 0 };
    };

    const handleCreate = async (e) => {
        e.preventDefault();
        if (!form.title.trim()) return;
        setCreating(true);
        try {
            const { error } = await supabase.from('planning_sessions').insert({
                community_id: activeCommunityId,
                title:        form.title.trim(),
                description:  form.description.trim() || null,
                status:       form.status,
                starts_at:    form.starts_at || null,
                ends_at:      form.ends_at   || null,
                is_hidden:    form.is_hidden,
                links:        form.links,
                created_by:   session.user.id,
            });
            if (error) throw error;
            clearDraft();
            setShowCreate(false);
            setForm(blankForm);
            await fetchSessions();
        } catch (err) {
            alert('Error creating session: ' + err.message);
        } finally {
            setCreating(false);
        }
    };

    const addLink = () => {
        if (!linkUrl.trim()) return;
        setForm(f => ({ ...f, links: [...f.links, { label: linkLabel.trim() || linkUrl.trim(), url: linkUrl.trim() }] }));
        setLinkLabel(''); setLinkUrl('');
    };

    const removeLink = (idx) => setForm(f => ({ ...f, links: f.links.filter((_, i) => i !== idx) }));

    return (
        <div className="member-mgmt-container" style={{ maxWidth: '900px', margin: '0 auto' }}>

            {/* ── Page Header ─────────────────────────────────────────────── */}
            <div className="admin-header-container" style={{ width: '100%', maxWidth: '900px' }}>
                <h1 className="admin-title">Planning Sessions</h1>

                {/* Search + filter row */}
                <div style={{ display: 'flex', gap: '0.75rem', flexWrap: 'wrap', alignItems: 'center', marginBottom: '1rem' }}>
                    <input
                        type="text"
                        placeholder="Search sessions…"
                        value={search}
                        onChange={e => setSearch(e.target.value)}
                        className="admin-input"
                        style={{ flex: 1, minWidth: '200px' }}
                    />
                    <div style={{ display: 'flex', gap: '0.5rem', flexWrap: 'wrap' }}>
                        {['all', 'active', 'completed', 'archived'].map(s => (
                            <button
                                key={s}
                                onClick={() => setStatusFilter(s)}
                                className={`admin-pill-btn${statusFilter === s ? '' : ' secondary'}`}
                                style={{ padding: '0.35rem 0.9rem', fontSize: '0.82rem', margin: 0,
                                    ...(statusFilter === s ? {} : { background: 'rgba(255,255,255,0.08)', border: '1px solid rgba(255,255,255,0.2)' })
                                }}
                            >
                                {s.charAt(0).toUpperCase() + s.slice(1)}
                            </button>
                        ))}
                    </div>
                </div>

                {/* Create button */}
                {(() => {
                    const hasDraft = form.title.trim() || form.description.trim() || form.starts_at || form.ends_at || form.links.length > 0;
                    return (
                        <div style={{ display: 'flex', flexDirection: 'column', alignItems: 'center', gap: '0.4rem', marginTop: '2.5rem', marginBottom: showCreate ? '0' : '1.5rem' }}>
                            <button
                                className={showCreate ? 'admin-pill-btn secondary' : 'admin-pill-btn'}
                                style={{ padding: '0.8rem 2rem', fontSize: '1rem', margin: 0 }}
                                onClick={() => setShowCreate(v => !v)}
                            >
                                {showCreate
                                    ? '▲ Hide Form'
                                    : hasDraft
                                        ? '✏ Resume Draft'
                                        : '+ New Planning Session'}
                            </button>
                            {/* Draft indicator — visible when form is collapsed and has content */}
                            {!showCreate && hasDraft && (
                                <span style={{ fontSize: '0.72rem', color: '#fcd34d', display: 'flex', alignItems: 'center', gap: '0.3rem' }}>
                                    <span style={{ width: '6px', height: '6px', borderRadius: '50%', background: '#fcd34d', display: 'inline-block' }} />
                                    Unsaved draft in progress
                                </span>
                            )}
                        </div>
                    );
                })()}

            </div>

            {/* ── Create Form ──────────────────────────────────────────────── */}
            {showCreate && (
                <div className="glass-panel" style={{ width: '100%', maxWidth: '900px', padding: '2rem', marginBottom: '2rem', boxSizing: 'border-box' }}>
                    <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '1.5rem' }}>
                        <h3 style={{ margin: 0, fontFamily: "'Fredoka', sans-serif", fontSize: '1.4rem', color: 'var(--auth-text-light-blue)' }}>
                            New Planning Session
                        </h3>
                        <span style={{ fontSize: '0.72rem', color: draftSaved ? '#55c46f' : 'rgba(255,255,255,0.25)', transition: 'color 0.4s ease', userSelect: 'none' }}>
                            {draftSaved ? '✓ Draft saved' : 'Draft auto-saved'}
                        </span>
                    </div>
                    <form onSubmit={handleCreate}>
                        <div style={{ display: 'grid', gap: '1rem' }}>

                            <div className="admin-input-group">
                                <label>Title <span style={{ color: '#ef4444' }}>*</span></label>
                                <input
                                    className="admin-input"
                                    placeholder="Session title"
                                    value={form.title}
                                    onChange={e => setForm(f => ({ ...f, title: e.target.value }))}
                                    required
                                />
                            </div>

                            <div className="admin-input-group">
                                <label>Description</label>
                                <textarea
                                    className="admin-input"
                                    rows={3}
                                    placeholder="What is this session about?"
                                    value={form.description}
                                    onChange={e => setForm(f => ({ ...f, description: e.target.value }))}
                                    style={{ resize: 'vertical' }}
                                />
                            </div>

                            <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr 1fr', gap: '1rem' }}>
                                <div className="admin-input-group">
                                    <label>Start Date</label>
                                    <input type="date" className="admin-input"
                                        value={form.starts_at} onChange={e => setForm(f => ({ ...f, starts_at: e.target.value }))} />
                                </div>
                                <div className="admin-input-group">
                                    <label>End Date</label>
                                    <input type="date" className="admin-input"
                                        value={form.ends_at} onChange={e => setForm(f => ({ ...f, ends_at: e.target.value }))} />
                                </div>
                                <div className="admin-input-group">
                                    <label>Status</label>
                                    <CustomSelect
                                        value={form.status}
                                        onChange={e => setForm(f => ({ ...f, status: e.target.value }))}
                                        options={[
                                            { value: 'active',    label: 'Active'    },
                                            { value: 'completed', label: 'Completed' },
                                            { value: 'archived',  label: 'Archived'  },
                                        ]}
                                    />
                                </div>
                            </div>

                            {/* Links section */}
                            <div className="admin-input-group">
                                <label>Links</label>
                                {form.links.length > 0 && (
                                    <div style={{ display: 'flex', flexWrap: 'wrap', gap: '0.5rem', marginBottom: '0.75rem' }}>
                                        {form.links.map((lk, i) => (
                                            <span key={i} style={{
                                                display: 'inline-flex', alignItems: 'center', gap: '0.4rem',
                                                background: 'rgba(151,247,233,0.1)', border: '1px solid rgba(151,247,233,0.25)',
                                                padding: '3px 10px', borderRadius: '9999px', fontSize: '0.82rem'
                                            }}>
                                                🔗 {lk.label}
                                                <button type="button" onClick={() => removeLink(i)}
                                                    style={{ background: 'none', border: 'none', color: '#ef4444', cursor: 'pointer', padding: 0, fontSize: '0.9rem', lineHeight: 1 }}>✕</button>
                                            </span>
                                        ))}
                                    </div>
                                )}
                                <div style={{ display: 'grid', gridTemplateColumns: '1fr 2fr auto', gap: '0.5rem', alignItems: 'center' }}>
                                    <input className="admin-input" placeholder="Label (e.g. Zoom)" value={linkLabel}
                                        onChange={e => setLinkLabel(e.target.value)} />
                                    <input className="admin-input" placeholder="URL" value={linkUrl}
                                        onChange={e => setLinkUrl(e.target.value)}
                                        onKeyDown={e => { if (e.key === 'Enter') { e.preventDefault(); addLink(); } }} />
                                    <button type="button" className="admin-pill-btn" onClick={addLink}
                                        style={{ padding: '0.5rem 1rem', margin: 0, whiteSpace: 'nowrap' }}>+ Add</button>
                                </div>
                            </div>

                            {/* Hidden toggle */}
                            <label style={{ display: 'flex', alignItems: 'center', gap: '0.6rem', cursor: 'pointer', userSelect: 'none' }}>
                                <input type="checkbox" checked={form.is_hidden}
                                    onChange={e => setForm(f => ({ ...f, is_hidden: e.target.checked }))}
                                    style={{ width: '16px', height: '16px', accentColor: 'var(--auth-text-light-blue)' }} />
                                <span style={{ color: 'white', fontSize: '0.9rem' }}>
                                    🔒 Hidden — only invited members can see this session
                                </span>
                            </label>

                            <div style={{ display: 'flex', gap: '0.75rem', justifyContent: 'flex-end', marginTop: '0.5rem' }}>
                                <button type="button" className="admin-pill-btn secondary"
                                    style={{ margin: 0 }}
                                    onClick={() => {
                                        if (window.confirm('Discard this draft?')) {
                                            clearDraft();
                                            setForm(blankForm);
                                            setShowCreate(false);
                                        }
                                    }}>Discard Draft</button>
                                <button type="submit" className="admin-pill-btn" disabled={creating}
                                    style={{ margin: 0 }}>{creating ? 'Creating…' : 'Create Session'}</button>
                            </div>
                        </div>
                    </form>
                </div>
            )}

            {/* ── Session List ─────────────────────────────────────────────── */}
            {loading ? (
                <div style={{ textAlign: 'center', color: '#97f7e9', padding: '3rem' }}>Loading sessions…</div>
            ) : fetchError ? (
                <div className="glass-panel" style={{ padding: '2rem', color: '#ef4444', width: '100%', maxWidth: '900px', boxSizing: 'border-box', textAlign: 'center' }}>
                    ⚠️ {fetchError}
                    <button className="admin-pill-btn secondary" style={{ marginTop: '1rem', display: 'block', marginLeft: 'auto', marginRight: 'auto' }} onClick={fetchSessions}>Retry</button>
                </div>
            ) : filtered.length === 0 ? (
                <div className="glass-panel" style={{ textAlign: 'center', padding: '3rem', color: 'rgba(255,255,255,0.5)', width: '100%', maxWidth: '900px', boxSizing: 'border-box' }}>
                    {sessions.length === 0
                        ? 'No planning sessions yet. Create the first one!'
                        : 'No sessions match your search or filter.'}
                </div>
            ) : (
                <div style={{ display: 'flex', flexDirection: 'column', gap: '1rem', width: '100%', maxWidth: '900px' }}>
                    {filtered.map(s => {
                        const stats  = getStats(s.tasks);
                        const days   = daysLeft(s.ends_at);
                        const range  = formatDateRange(s.starts_at, s.ends_at);

                        return (
                            <div
                                key={s.id}
                                className="session-card"
                                onClick={() => navigate(`/planning/${s.id}`)}
                                role="button"
                                tabIndex={0}
                                onKeyDown={e => { if (e.key === 'Enter' || e.key === ' ') navigate(`/planning/${s.id}`); }}
                            >
                                <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'flex-start', gap: '1rem' }}>
                                    <div style={{ flex: 1, minWidth: 0 }}>
                                        <div style={{ display: 'flex', alignItems: 'center', gap: '0.6rem', flexWrap: 'wrap', marginBottom: '0.5rem' }}>
                                            <h3 style={{ margin: 0, fontSize: '1.15rem', fontWeight: 600, color: 'white' }}>{s.title}</h3>
                                            <StatusBadge status={s.status} />
                                            {s.is_hidden && (
                                                <span style={{ fontSize: '0.72rem', background: 'rgba(255,255,255,0.1)', border: '1px solid rgba(255,255,255,0.2)', borderRadius: '9999px', padding: '1px 8px', color: 'rgba(255,255,255,0.5)' }}>
                                                    🔒 Private
                                                </span>
                                            )}
                                        </div>
                                        {range && <p style={{ margin: '0 0 0.4rem', fontSize: '0.8rem', color: 'rgba(255,255,255,0.5)' }}>{range}</p>}
                                        {s.description && (
                                            <p style={{ margin: 0, fontSize: '0.88rem', color: 'rgba(255,255,255,0.7)', overflow: 'hidden', display: '-webkit-box', WebkitLineClamp: 2, WebkitBoxOrient: 'vertical' }}>
                                                {s.description}
                                            </p>
                                        )}
                                    </div>

                                    {/* Stats */}
                                    <div style={{ display: 'flex', gap: '1.25rem', flexShrink: 0, flexWrap: 'wrap', alignItems: 'flex-start' }}>
                                        {stats.total > 0 && (
                                            <div style={{ textAlign: 'center' }}>
                                                <div style={{ fontSize: '1.3rem', fontWeight: 700 }}>{stats.done}/{stats.total}</div>
                                                <div style={{ fontSize: '0.7rem', color: 'rgba(255,255,255,0.5)', textTransform: 'uppercase', letterSpacing: '0.05em' }}>Tasks</div>
                                            </div>
                                        )}
                                        {days !== null && (
                                            <div style={{ textAlign: 'center' }}>
                                                <div style={{ fontSize: '1.3rem', fontWeight: 700, color: days < 0 ? '#ef4444' : days < 7 ? '#fcd34d' : 'white' }}>
                                                    {days < 0 ? `${Math.abs(days)}d ago` : `${days}d`}
                                                </div>
                                                <div style={{ fontSize: '0.7rem', color: 'rgba(255,255,255,0.5)', textTransform: 'uppercase', letterSpacing: '0.05em' }}>
                                                    {days < 0 ? 'Ended' : 'Left'}
                                                </div>
                                            </div>
                                        )}
                                    </div>
                                </div>

                                {/* Footer: creator + links strip */}
                                <div style={{ marginTop: '0.75rem', paddingTop: '0.65rem', borderTop: '1px solid rgba(255,255,255,0.08)', display: 'flex', alignItems: 'center', gap: '0.75rem', flexWrap: 'wrap' }}>
                                    <span style={{ fontSize: '0.75rem', color: 'rgba(255,255,255,0.4)' }}>
                                        By {s.creator?.display_name || 'Unknown'}
                                    </span>
                                    {(s.links || []).slice(0, 3).map((lk, i) => (
                                        <a key={i} href={lk.url} target="_blank" rel="noopener noreferrer"
                                            onClick={e => e.stopPropagation()}
                                            style={{ fontSize: '0.75rem', color: 'var(--auth-text-light-blue)', textDecoration: 'none',
                                                background: 'rgba(151,247,233,0.1)', border: '1px solid rgba(151,247,233,0.25)',
                                                padding: '2px 8px', borderRadius: '9999px' }}>
                                            🔗 {lk.label}
                                        </a>
                                    ))}
                                </div>
                            </div>
                        );
                    })}
                </div>
            )}
        </div>
    );
}
