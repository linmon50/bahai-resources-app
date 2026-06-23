import React, { useState, useEffect, useRef, useCallback } from 'react';
import { createPortal } from 'react-dom';
import { useParams, useNavigate } from 'react-router-dom';
import supabase from './supabaseClient';
import { useCommunity } from './context/CommunityContext';
import ComboBox from './components/ComboBox';
import CustomSelect from './components/CustomSelect';
import CustomDatePicker from './components/CustomDatePicker';

// ─── Constants ────────────────────────────────────────────────────────────────

const TABS = ['Tasks', 'Notes', 'Access'];
const STATUS_ORDER  = { not_started: 0, in_progress: 1, done: 2 };
const STATUS_LABELS = { not_started: 'Not Started', in_progress: 'In Progress', done: 'Done' };

// ── Icons ──────────────────────────────────────────────────────────────────
const CalendarIcon = () => (
    <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" style={{ verticalAlign: 'middle' }}>
        <rect x="3" y="4" width="18" height="18" rx="2" ry="2" />
        <line x1="16" y1="2" x2="16" y2="6" />
        <line x1="8" y1="2" x2="8" y2="6" />
        <line x1="3" y1="10" x2="21" y2="10" />
    </svg>
);
const LinkIcon = () => (
    <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.5" strokeLinecap="round" strokeLinejoin="round" style={{ verticalAlign: 'middle' }}>
        <path d="M10 13a5 5 0 0 0 7.54.54l3-3a5 5 0 0 0-7.07-7.07l-1.72 1.71" />
        <path d="M14 11a5 5 0 0 0-7.54-.54l-3 3a5 5 0 0 0 7.07 7.07l1.71-1.71" />
    </svg>
);
const PencilIcon = ({ size = 14 }) => (
    <svg width={size} height={size} viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" style={{ verticalAlign: 'middle' }}>
        <path d="M11 4H4a2 2 0 0 0-2 2v14a2 2 0 0 0 2 2h14a2 2 0 0 0 2-2v-7" />
        <path d="M18.5 2.5a2.121 2.121 0 0 1 3 3L12 15l-4 1 1-4 9.5-9.5z" />
    </svg>
);
const TrashIcon = () => (
    <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" style={{ verticalAlign: 'middle' }}>
        <polyline points="3 6 5 6 21 6" /><path d="M19 6v14a2 2 0 0 1-2 2H7a2 2 0 0 1-2-2V6m3 0V4a2 2 0 0 1 2-2h4a2 2 0 0 1 2 2v2" /><line x1="10" y1="11" x2="10" y2="17" /><line x1="14" y1="11" x2="14" y2="17" />
    </svg>
);
const LockIcon = () => (
    <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" style={{ verticalAlign: 'middle' }}>
        <rect x="3" y="11" width="18" height="11" rx="2" ry="2" /><path d="M7 11V7a5 5 0 0 1 10 0v4" />
    </svg>
);
const PlusIcon = ({ size = 14, color = 'currentColor' }) => (
    <svg width={size} height={size} viewBox="0 0 24 24" fill="none" stroke={color} strokeWidth="2.5" strokeLinecap="round" strokeLinejoin="round" style={{ verticalAlign: 'middle' }}>
        <line x1="12" y1="5" x2="12" y2="19" />
        <line x1="5" y1="12" x2="19" y2="12" />
    </svg>
);
const TasksIcon = () => (
    <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" style={{ verticalAlign: 'middle' }}>
        <path d="M16 4h2a2 2 0 0 1 2 2v14a2 2 0 0 1-2 2H6a2 2 0 0 1-2-2V6a2 2 0 0 1 2-2h2"/><rect x="8" y="2" width="8" height="4" rx="1" ry="1"/><path d="m9 14 2 2 4-4"/>
    </svg>
);
const NotesIcon = () => (
    <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" style={{ verticalAlign: 'middle' }}>
        <path d="M14 2H6a2 2 0 0 0-2 2v16a2 2 0 0 0 2 2h12a2 2 0 0 0 2-2V8z"/><polyline points="14 2 14 8 20 8"/><line x1="16" y1="13" x2="8" y2="13"/><line x1="16" y1="17" x2="8" y2="17"/><polyline points="10 9 9 9 8 9"/>
    </svg>
);
const AccessIcon = () => (
    <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" style={{ verticalAlign: 'middle' }}>
        <path d="M17 21v-2a4 4 0 0 0-4-4H5a4 4 0 0 0-4 4v2"/><circle cx="9" cy="7" r="4"/><path d="M23 21v-2a4 4 0 0 0-3-3.87"/><path d="M16 3.13a4 4 0 0 1 0 7.75"/>
    </svg>
);
const STATUS_COLORS = {
    not_started: { bg: 'rgba(255,255,255,0.12)', text: 'rgba(255,255,255,0.6)', border: 'rgba(255,255,255,0.2)' },
    in_progress:  { bg: 'rgba(252,211,77,0.18)',  text: '#fcd34d',              border: 'rgba(252,211,77,0.4)' },
    done:         { bg: 'rgba(85,196,111,0.18)',  text: '#55c46f',              border: 'rgba(85,196,111,0.4)' },
};
const SESSION_STATUS_COLORS = {
    active:    { bg: 'rgba(85,196,111,0.18)',   text: '#55c46f', border: 'rgba(85,196,111,0.4)'    },
    completed: { bg: 'rgba(9,209,214,0.18)',     text: '#09d1d6', border: 'rgba(9,209,214,0.4)'    },
    archived:  { bg: 'rgba(255,255,255,0.08)',   text: 'rgba(255,255,255,0.45)', border: 'rgba(255,255,255,0.2)' },
};

// ─── Helper components ────────────────────────────────────────────────────────

function StatusBadge({ status }) {
    const c = STATUS_COLORS[status] || STATUS_COLORS.not_started;
    return (
        <span style={{ background: c.bg, color: c.text, border: `1px solid ${c.border}`,
            borderRadius: '9999px', padding: '2px 10px', fontSize: '0.75rem',
            fontWeight: 600, whiteSpace: 'nowrap' }}>
            {STATUS_LABELS[status]}
        </span>
    );
}

function SessionStatusBadge({ status }) {
    const c = SESSION_STATUS_COLORS[status] || SESSION_STATUS_COLORS.active;
    return (
        <span style={{ background: c.bg, color: c.text, border: `1px solid ${c.border}`,
            borderRadius: '9999px', padding: '3px 12px', fontSize: '0.8rem',
            fontWeight: 600, textTransform: 'capitalize' }}>
            {status}
        </span>
    );
}

function formatDate(d) {
    if (!d) return '';
    const parts = d.split('-');
    if (parts.length === 3) {
        const [year, month, day] = parts;
        const monthNames = ['Jan', 'Feb', 'Mar', 'Apr', 'May', 'Jun', 'Jul', 'Aug', 'Sep', 'Oct', 'Nov', 'Dec'];
        const mIdx = parseInt(month, 10) - 1;
        if (mIdx >= 0 && mIdx < 12) {
            return `${monthNames[mIdx]} ${parseInt(day, 10)}, ${year}`;
        }
    }
    return d;
}

function daysLeft(endsAt) {
    if (!endsAt) return null;
    return Math.ceil((new Date(endsAt) - new Date()) / 86400000);
}

function sortTasks(tasks) {
    return [...tasks].sort((a, b) => {
        const so = STATUS_ORDER[a.status] - STATUS_ORDER[b.status];
        if (so !== 0) return so;
        if (!a.due_date && !b.due_date) return 0;
        if (!a.due_date) return 1;
        if (!b.due_date) return -1;
        return new Date(a.due_date) - new Date(b.due_date);
    });
}

// ─── TaskRow ─────────────────────────────────────────────────────────────────

function TaskRow({ task, isSubtask, isEditor, assigneeGroups, onSave, onDelete, onAddSubtask, invitedIds, onInvitePrompt, sessionId, onShowContact, currentUserId, hasAnyEditableTasks }) {
    const [editing, setEditing] = useState(false);
    const canEdit = isEditor || (task.assigned_to === currentUserId);
    const [form, setForm] = useState({
        title: task.title,
        assigned_to: task.assigned_to || null,
        assigned_to_name: task.assigned_to_name || '',
        status: task.status,
        due_date: task.due_date || '',
    });
    const formRef = useRef(form);
    useEffect(() => { formRef.current = form; }, [form]);

    const [saving, setSaving] = useState(false);

    const displayName = task.assigned_to_name || task.assignee?.display_name || '—';

    const handleSave = async () => {
        const currentForm = formRef.current;
        if (!currentForm.title.trim()) return;
        setSaving(true);
        try {
            await onSave(task.id, {
                title: currentForm.title.trim(),
                assigned_to: currentForm.assigned_to,
                assigned_to_name: currentForm.assigned_to ? null : (currentForm.assigned_to_name || null),
                status: currentForm.status,
                due_date: currentForm.due_date || null,
            });
            setEditing(false);
        } catch (err) {
            alert('Error saving task: ' + err.message);
        } finally {
            setSaving(false);
        }
    };

    const handleAssigneeChange = (uid, name) => {
        const isNone = !uid && (!name || name === 'Unassigned');
        setForm(f => ({ 
            ...f, 
            assigned_to: uid, 
            assigned_to_name: isNone ? null : name 
        }));
    };

    const handleDelete = async () => {
        const msg = isSubtask
            ? 'Delete this sub-task?'
            : 'Delete this task and all its sub-tasks?';
        if (!window.confirm(msg)) return;
        await onDelete(task.id);
    };

    const indent = isSubtask ? { paddingLeft: '2.5rem', background: 'rgba(0,0,0,0.15)' } : {};

    if (editing) {
        return (
            <>
                <tr style={{ ...indent, background: 'rgba(151,247,233,0.06)' }}>
                    <td colSpan={4} style={{ padding: '0.75rem 1rem' }}>
                        <div style={{ display: 'grid', gap: '0.6rem' }}>
                            {isSubtask && <span style={{ fontSize: '0.75rem', color: 'rgba(255,255,255,0.4)', marginBottom: '-0.3rem' }}>↳ Sub-task</span>}
                            <input
                                className="task-inline-input"
                                value={form.title}
                                onChange={e => setForm(f => ({ ...f, title: e.target.value }))}
                                placeholder="Task title"
                                autoFocus
                                onKeyDown={e => { if (e.key === 'Enter') handleSave(); if (e.key === 'Escape') setEditing(false); }}
                                disabled={!isEditor}
                            />
                            <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr 1fr', gap: '0.5rem' }}>
                                <ComboBox
                                    userId={form.assigned_to}
                                    userName={form.assigned_to_name || (task.assignee?.display_name || '')}
                                    onChange={handleAssigneeChange}
                                    groups={assigneeGroups}
                                    placeholder="Assign to…"
                                    disabled={!isEditor}
                                />
                                <CustomDatePicker className="task-inline-input"
                                    value={form.due_date}
                                    onChange={e => setForm(f => ({ ...f, due_date: e.target.value }))}
                                    disabled={!isEditor}
                                    placeholder="Due date…"
                                />
                                <CustomSelect
                                    value={form.status}
                                    onChange={e => setForm(f => ({ ...f, status: e.target.value }))}
                                    options={[
                                        { value: 'not_started', label: 'Not Started' },
                                        { value: 'in_progress', label: 'In Progress' },
                                        { value: 'done',        label: 'Done'        },
                                    ]}
                                    variant="dense"
                                />
                            </div>

                            {/* Invite prompt */}
                            {isEditor && form.assigned_to && !invitedIds.includes(form.assigned_to) && (
                                <div style={{ background: 'rgba(252,211,77,0.1)', border: '1px solid rgba(252,211,77,0.3)', borderRadius: '8px', padding: '0.6rem 0.9rem', fontSize: '0.82rem', color: '#fcd34d' }}>
                                    <strong>{form.assigned_to_name || 'Selected user'}</strong> isn't invited to this session yet.
                                    <div style={{ display: 'flex', gap: '0.5rem', marginTop: '0.4rem', flexWrap: 'wrap' }}>
                                        <button className="admin-pill-btn" style={{ padding: '0.25rem 0.7rem', fontSize: '0.78rem', margin: 0 }}
                                            onClick={() => onInvitePrompt(form.assigned_to, 'editor')}>
                                            Invite as Editor
                                        </button>
                                        <button className="admin-pill-btn secondary" style={{ padding: '0.25rem 0.7rem', fontSize: '0.78rem', margin: 0 }}
                                            onClick={() => onInvitePrompt(form.assigned_to, 'viewer')}>
                                            Invite as Viewer
                                        </button>
                                        <button className="admin-pill-btn secondary" style={{ padding: '0.25rem 0.7rem', fontSize: '0.78rem', margin: 0, opacity: 0.6 }}
                                            onClick={() => handleAssigneeChange(null, 'Unassigned')}>
                                            Skip / Unassign
                                        </button>
                                    </div>
                                </div>
                            )}

                            <div style={{ display: 'flex', gap: '0.5rem', justifyContent: 'flex-end' }}>
                                <button className="admin-pill-btn secondary" style={{ padding: '0.3rem 0.8rem', fontSize: '0.8rem', margin: 0 }}
                                    onClick={() => setEditing(false)}>Cancel</button>
                                <button className="admin-pill-btn" style={{ padding: '0.3rem 0.8rem', fontSize: '0.8rem', margin: 0 }}
                                    disabled={saving} onClick={handleSave}>
                                    {saving ? 'Saving…' : '✓ Save'}
                                </button>
                            </div>
                        </div>
                    </td>
                </tr>
            </>
        );
    }

    return (
        <tr className="task-row" style={indent}>
            <td style={{ width: '100%' }}>
                <div style={{ display: 'flex', alignItems: 'center', gap: '0.5rem' }}>
                    {isSubtask && <span style={{ color: 'rgba(255,255,255,0.3)', fontSize: '0.9rem' }}>↳</span>}
                    <span
                        style={{ cursor: canEdit ? 'pointer' : 'default', flex: 1 }}
                        onClick={() => canEdit && setEditing(true)}
                        title={canEdit ? 'Click to edit' : undefined}
                    >
                        {task.title}
                    </span>
                </div>
                {task.description && (
                    <p style={{ margin: isSubtask ? '0.2rem 0 0 1.3rem' : '0.2rem 0 0 0', fontSize: '0.8rem', color: 'rgba(255,255,255,0.45)' }}>
                        {task.description}
                    </p>
                )}
            </td>
            <td style={{ whiteSpace: 'nowrap', fontSize: '0.85rem', color: 'rgba(255,255,255,0.65)' }}>
                {task.assigned_to ? (
                    <button 
                        onClick={() => onShowContact(task.assignee)}
                        style={{ 
                            background: 'none', border: 'none', padding: 0, color: 'inherit', 
                            fontSize: 'inherit', cursor: 'pointer', textDecoration: 'underline',
                            textAlign: 'left'
                        }}
                    >
                        {displayName}
                    </button>
                ) : (
                    displayName
                )}
            </td>
            <td style={{ whiteSpace: 'nowrap', fontSize: '0.82rem', color: 'rgba(255,255,255,0.5)' }}>
                {task.due_date ? formatDate(task.due_date) : '—'}
            </td>
            <td style={{ whiteSpace: 'nowrap' }}>
                <StatusBadge status={task.status} />
            </td>
            {hasAnyEditableTasks && (
                <td style={{ whiteSpace: 'nowrap' }}>
                    <div style={{ display: 'flex', gap: '0.3rem' }}>
                        {isEditor && !isSubtask && (
                            <button className="admin-pill-btn"
                                style={{ padding: '0.2rem 0.55rem', fontSize: '0.75rem', margin: 0 }}
                                onClick={() => onAddSubtask(task.id)} 
                                title="Add Sub-task"
                            >
                                <PlusIcon size={12} color="white" />
                            </button>
                        )}
                        {canEdit && (
                            <button className="admin-pill-btn secondary"
                                style={{ padding: '0.2rem 0.55rem', fontSize: '0.75rem', margin: 0 }}
                                onClick={() => setEditing(true)} title="Edit"><PencilIcon size={12} /></button>
                        )}
                        {isEditor && (
                            <button className="admin-pill-btn danger"
                                style={{ padding: '0.2rem 0.55rem', fontSize: '0.75rem', margin: 0 }}
                                onClick={handleDelete} title="Delete"><TrashIcon /></button>
                        )}
                    </div>
                </td>
            )}
        </tr>
    );
}

// ─── New task inline row ──────────────────────────────────────────────────────

function NewTaskRow({ parentTaskId, assigneeGroups, sessionId, onCreated, onCancel, invitedIds, onInvitePrompt }) {
    const [form, setForm] = useState({ title: '', assigned_to: null, assigned_to_name: '', status: 'not_started', due_date: '' });
    const [saving, setSaving] = useState(false);
    const formRef = useRef(form);
    useEffect(() => { formRef.current = form; }, [form]);

    const handleAssigneeChange = (uid, name) => {
        const isNone = !uid && (!name || name === 'Unassigned');
        setForm(f => ({ ...f, assigned_to: uid, assigned_to_name: isNone ? null : name }));
    };

    const handleSave = async () => {
        const currentForm = formRef.current;
        if (!currentForm.title.trim()) return;
        setSaving(true);
        try {
            const payload = {
                session_id: sessionId,
                parent_task_id: parentTaskId || null,
                title: currentForm.title.trim(),
                assigned_to: currentForm.assigned_to,
                assigned_to_name: currentForm.assigned_to ? null : (currentForm.assigned_to_name || null),
                status: currentForm.status,
                due_date: currentForm.due_date || null,
            };
            const { error } = await supabase.from('session_tasks').insert(payload);
            if (error) throw error;
            onCreated();
        } catch (err) {
            alert('Error creating task: ' + err.message);
        } finally {
            setSaving(false);
        }
    };

    return (
        <tr style={{ background: 'rgba(151,247,233,0.05)', ...(parentTaskId ? { paddingLeft: '2.5rem' } : {}) }}>
            <td colSpan={5} style={{ padding: '0.75rem 1rem' }}>
                <div style={{ display: 'grid', gap: '0.6rem', paddingLeft: parentTaskId ? '2.5rem' : 0 }}>
                    {parentTaskId && <span style={{ fontSize: '0.75rem', color: 'rgba(255,255,255,0.4)', marginBottom: '-0.3rem' }}>↳ New Sub-task</span>}
                    <input className="task-inline-input" value={form.title} autoFocus
                        onChange={e => setForm(f => ({ ...f, title: e.target.value }))}
                        placeholder={parentTaskId ? 'Sub-task title…' : 'Task title…'}
                        onKeyDown={e => { if (e.key === 'Enter') handleSave(); if (e.key === 'Escape') onCancel(); }} />
                    <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr 1fr', gap: '0.5rem' }}>
                        <ComboBox userId={form.assigned_to} userName={form.assigned_to_name || ''}
                            onChange={handleAssigneeChange} groups={assigneeGroups} placeholder="Assign to…" />
                        <CustomDatePicker className="task-inline-input" value={form.due_date}
                            onChange={e => setForm(f => ({ ...f, due_date: e.target.value }))}
                            placeholder="Due date…"
                        />
                        <CustomSelect
                            value={form.status}
                            onChange={e => setForm(f => ({ ...f, status: e.target.value }))}
                            options={[
                                { value: 'not_started', label: 'Not Started' },
                                { value: 'in_progress', label: 'In Progress' },
                                { value: 'done',        label: 'Done'        },
                            ]}
                            variant="dense"
                        />
                    </div>
                    {form.assigned_to && !invitedIds.includes(form.assigned_to) && (
                        <div style={{ background: 'rgba(252,211,77,0.1)', border: '1px solid rgba(252,211,77,0.3)', borderRadius: '8px', padding: '0.6rem 0.9rem', fontSize: '0.82rem', color: '#fcd34d' }}>
                            <strong>{form.assigned_to_name || 'Selected user'}</strong> isn't invited to this session yet.
                            <div style={{ display: 'flex', gap: '0.5rem', marginTop: '0.4rem', flexWrap: 'wrap' }}>
                                <button className="admin-pill-btn" style={{ padding: '0.25rem 0.7rem', fontSize: '0.78rem', margin: 0 }}
                                    onClick={() => onInvitePrompt(form.assigned_to, 'editor')}>Invite as Editor</button>
                                <button className="admin-pill-btn secondary" style={{ padding: '0.25rem 0.7rem', fontSize: '0.78rem', margin: 0 }}
                                    onClick={() => onInvitePrompt(form.assigned_to, 'viewer')}>Invite as Viewer</button>
                                <button className="admin-pill-btn secondary" style={{ padding: '0.25rem 0.7rem', fontSize: '0.78rem', margin: 0, opacity: 0.6 }}
                                    onClick={() => handleAssigneeChange(null, 'Unassigned')}>Skip</button>
                            </div>
                        </div>
                    )}
                    <div style={{ display: 'flex', gap: '0.5rem', justifyContent: 'flex-end' }}>
                        <button className="admin-pill-btn secondary" style={{ padding: '0.3rem 0.8rem', fontSize: '0.8rem', margin: 0 }} onClick={onCancel}>Cancel</button>
                        <button className="admin-pill-btn" style={{ padding: '0.3rem 0.8rem', fontSize: '0.8rem', margin: 0 }} disabled={saving} onClick={handleSave}>
                            {saving ? 'Adding…' : '✓ Add'}
                        </button>
                    </div>
                </div>
            </td>
        </tr>
    );
}

// ─── Main Component ───────────────────────────────────────────────────────────

export default function PlanningSessionDetail({ session, isAdmin }) {
    const { sessionId } = useParams();
    const navigate = useNavigate();
    const { activeCommunityId } = useCommunity();
    const tabRefs = useRef([]);
    const contactCloseBtnRef = useRef(null);

    const [sessionData,  setSessionData]  = useState(null);
    const [tasks,        setTasks]        = useState([]);
    const [members,      setMembers]      = useState([]); // community members
    const [accessList,   setAccessList]   = useState([]); // session_access rows
    const [loading,      setLoading]      = useState(true);
    const [accessDenied, setAccessDenied] = useState(false);
    const [activeTab,    setActiveTab]    = useState(0);
    const [accordionOpen, setAccordionOpen] = useState(0);
    const [contactPopup, setContactPopup] = useState(null); // profile object

    // Permissions
    const [isEditor,          setIsEditor]          = useState(false);
    const [isCreatorOrAdmin,  setIsCreatorOrAdmin]  = useState(false);

    // Header edit state
    const [editingHeader, setEditingHeader]   = useState(false);
    const [headerForm,    setHeaderForm]      = useState({});
    const [headerLinkLabel, setHeaderLinkLabel] = useState('');
    const [headerLinkUrl,   setHeaderLinkUrl]   = useState('');
    const [savingHeader,  setSavingHeader]    = useState(false);

    // Task UI state
    const [addingTask,    setAddingTask]    = useState(false);
    const [addingSubFor,  setAddingSubFor]  = useState(null); // parent task id
    const [taskSearch,    setTaskSearch]    = useState('');

    // Notes
    const [notes,         setNotes]         = useState('');
    const [editingNotes,  setEditingNotes]  = useState(false);
    const [savingNotes,   setSavingNotes]   = useState(false);
    const notesTimer = useRef(null);
    const lastPushedNotes = useRef(''); // Track what we last sent to DB to avoid cyclic updates

    // Access tab
    const [inviteUserId,   setInviteUserId]   = useState('');
    const [inviteRole,     setInviteRole]     = useState('viewer');
    const [inviting,       setInviting]       = useState(false);

    // ── Data fetching ───────────────────────────────────────────────────────

    const fetchAll = useCallback(async () => {
        try {
            // 1. Session (no embedded joins — avoids auth-schema traversal issues)
            const { data: sd, error: se } = await supabase
                .from('planning_sessions')
                .select('*')
                .eq('id', sessionId)
                .single();

            if (se) {
                if (se.code === 'PGRST116') { setAccessDenied(true); setLoading(false); return; }
                throw se;
            }
            if (!sd) { setAccessDenied(true); setLoading(false); return; }

            // 2. Creator profile
            const { data: creatorProfile } = await supabase
                .from('profiles').select('user_id, display_name, avatar_url, contact_email, phone, show_contact_info').eq('user_id', sd.created_by).maybeSingle();

            setSessionData({ ...sd, creator: creatorProfile || null });
            setNotes(sd.notes || '');
            lastPushedNotes.current = sd.notes || '';
            setHeaderForm({
                title: sd.title, description: sd.description || '',
                starts_at: sd.starts_at ? sd.starts_at.split('T')[0] : '',
                ends_at:   sd.ends_at   ? sd.ends_at.split('T')[0]   : '',
                status: sd.status, is_hidden: sd.is_hidden, links: sd.links || [],
            });

            // Permissions
            const myId = session.user.id;
            const myIsCreator = sd.created_by === myId;
            setIsCreatorOrAdmin(myIsCreator || isAdmin);

            // 3. Tasks (flat, no join)
            const { data: taskRows } = await supabase
                .from('session_tasks')
                .select('*')
                .eq('session_id', sessionId)
                .order('sort_order');
            const taskList = taskRows || [];

            // 4. Fetch assignee profiles for tasks that have assigned_to
            const assigneeIds = [...new Set(taskList.map(t => t.assigned_to).filter(Boolean))];
            const assigneeMap = {};
            if (assigneeIds.length > 0) {
                const { data: ap } = await supabase.from('profiles').select('user_id, display_name, contact_email, phone, show_contact_info').in('user_id', assigneeIds);
                (ap || []).forEach(p => { assigneeMap[p.user_id] = p; });
            }
            setTasks(taskList.map(t => ({ ...t, assignee: assigneeMap[t.assigned_to] || null })));

            // 5. Community members (memberships + profiles separately)
            const { data: memberRows } = await supabase
                .from('memberships')
                .select('user_id, role')
                .eq('community_id', sd.community_id)
                .eq('approved', true);
            const memberIds = (memberRows || []).map(m => m.user_id);
            const memberProfileMap = {};
            if (memberIds.length > 0) {
                const { data: mp } = await supabase.from('profiles').select('user_id, display_name, contact_email, phone, show_contact_info').in('user_id', memberIds);
                (mp || []).forEach(p => { memberProfileMap[p.user_id] = p; });
            }
            setMembers((memberRows || []).map(m => ({ ...m, profiles: memberProfileMap[m.user_id] || null })));

            // 6. Access list + user profiles
            const { data: accessRows } = await supabase
                .from('session_access')
                .select('*')
                .eq('session_id', sessionId);
            const accessList = accessRows || [];
            const accessUserIds = accessList.map(a => a.user_id).filter(Boolean);
            const accessProfileMap = {};
            if (accessUserIds.length > 0) {
                const { data: aup } = await supabase.from('profiles').select('user_id, display_name, contact_email, phone, show_contact_info').in('user_id', accessUserIds);
                (aup || []).forEach(p => { accessProfileMap[p.user_id] = p; });
            }
            setAccessList(accessList.map(a => ({ ...a, user: accessProfileMap[a.user_id] || null })));

            // My access role
            if (!myIsCreator && !isAdmin) {
                const myAccess = accessList.find(a => a.user_id === myId);
                setIsEditor(myAccess?.role === 'editor');
            } else {
                setIsEditor(true);
            }

        } catch (err) {
            console.error('Error loading session:', err);
            setAccessDenied(true);
        } finally {
            setLoading(false);
        }
    }, [sessionId, session.user.id, isAdmin]);

    useEffect(() => { fetchAll(); }, [fetchAll]);

    // Escape listener and focus management for Contact Info Popup modal
    useEffect(() => {
        if (!contactPopup) return;
        
        const previousActiveElement = document.activeElement;

        // Focus the close button when opened
        const focusTimeout = setTimeout(() => {
            if (contactCloseBtnRef.current) {
                contactCloseBtnRef.current.focus();
            }
        }, 50);

        const handleKeyDown = (e) => {
            if (e.key === 'Escape') {
                setContactPopup(null);
            }
        };

        window.addEventListener('keydown', handleKeyDown);
        return () => {
            clearTimeout(focusTimeout);
            window.removeEventListener('keydown', handleKeyDown);
            if (previousActiveElement) {
                previousActiveElement.focus();
            }
        };
    }, [contactPopup]);

    // ── Realtime Subscription ───────────────────────────────────────────────

    useEffect(() => {
        if (!sessionId) return;

        // Channel for session notes
        const notesChannel = supabase
            .channel(`session_notes_${sessionId}`)
            .on('postgres_changes', {
                event: 'UPDATE',
                schema: 'public',
                table: 'planning_sessions',
                filter: `id=eq.${sessionId}`
            }, (payload) => {
                const remoteNotes = payload.new.notes;
                if (remoteNotes !== undefined && remoteNotes !== lastPushedNotes.current) {
                    setNotes(remoteNotes || '');
                    lastPushedNotes.current = remoteNotes || '';
                }
            })
            .subscribe();

        // Channel for task changes
        const tasksChannel = supabase
            .channel(`session_tasks_${sessionId}`)
            .on('postgres_changes', {
                event: '*',
                schema: 'public',
                table: 'session_tasks',
                filter: `session_id=eq.${sessionId}`
            }, (payload) => {
                console.log('Task update received via Realtime:', payload.event);
                fetchAll();
            })
            .subscribe();

        return () => { 
            supabase.removeChannel(notesChannel); 
            supabase.removeChannel(tasksChannel);
        };
    }, [sessionId, fetchAll]);

    // ── Task helpers ────────────────────────────────────────────────────────

    const parentTasks = sortTasks(tasks.filter(t => !t.parent_task_id));
    const hasAnyEditableTasks = isEditor || tasks.some(t => t.assigned_to === session.user.id);
    const subTaskMap  = tasks.reduce((acc, t) => {
        if (t.parent_task_id) {
            if (!acc[t.parent_task_id]) acc[t.parent_task_id] = [];
            acc[t.parent_task_id].push(t);
        }
        return acc;
    }, {});

    const filteredParents = parentTasks.filter(t =>
        !taskSearch || t.title.toLowerCase().includes(taskSearch.toLowerCase())
    );

    const handleSaveTask = async (id, updates) => {
        const { error } = await supabase.from('session_tasks').update(updates).eq('id', id);
        if (error) throw error;
        
        // If we changed assignment, we need to update the assignee object in state too
        let newAssignee = undefined;
        if ('assigned_to' in updates) {
            const newId = updates.assigned_to;
            if (!newId) newAssignee = null;
            else {
                // Find member in our pre-fetched list
                const m = members.find(m => m.user_id === newId);
                newAssignee = m ? m.profiles : null;
            }
        }

        setTasks(prev => prev.map(t => {
            if (t.id !== id) return t;
            const updated = { ...t, ...updates };
            if (newAssignee !== undefined) updated.assignee = newAssignee;
            return updated;
        }));
    };

    const handleDeleteTask = async (id) => {
        const { error } = await supabase.from('session_tasks').delete().eq('id', id);
        if (error) { alert('Error deleting: ' + error.message); return; }
        setTasks(prev => prev.filter(t => t.id !== id && t.parent_task_id !== id));
    };

    // ── Assignee groups for ComboBox ────────────────────────────────────────

    const invitedIds    = accessList.map(a => a.user_id)
        .concat(sessionData?.created_by ? [sessionData.created_by] : []);
    const invitedMembers = members.filter(m => invitedIds.includes(m.user_id));
    const otherMembers   = members.filter(m => !invitedIds.includes(m.user_id));

    const assigneeGroups = [
        { label: 'None', options: [{ value: null, label: 'Unassigned' }] },
        ...(invitedMembers.length > 0 ? [{ label: 'Invited to this session', options: invitedMembers.map(m => ({ value: m.user_id, label: m.profiles?.display_name || m.user_id })) }] : []),
        ...(otherMembers.length > 0   ? [{ label: 'Other Community Members',   options: otherMembers.map(m => ({ value: m.user_id, label: m.profiles?.display_name || m.user_id })) }] : []),
    ];

    // ── Invite prompt from task assignment ──────────────────────────────────

    const handleInviteFromTask = async (userId, role) => {
        try {
            const { error } = await supabase.from('session_access').insert({
                session_id: sessionId, user_id: userId, role,
                granted_by: session.user.id,
            });
            if (error && error.code !== '23505') throw error; // ignore unique violations
            await fetchAll();
        } catch (err) {
            console.error('Error inviting from task:', err);
        }
    };

    // ── Header save ─────────────────────────────────────────────────────────

    const handleSaveHeader = async () => {
        if (!headerForm.title?.trim()) return;
        setSavingHeader(true);
        try {
            // Auto-add last link from inputs if not empty
            let finalLinks = [...(headerForm.links || [])];
            if (headerLinkUrl.trim()) {
                const newLink = { 
                    label: headerLinkLabel.trim() || headerLinkUrl.trim(), 
                    url: headerLinkUrl.trim() 
                };
                // Only add if not already in finalLinks
                if (!finalLinks.find(l => l.url === newLink.url)) {
                    finalLinks.push(newLink);
                }
                setHeaderLinkLabel('');
                setHeaderLinkUrl('');
            }

            const { error } = await supabase.from('planning_sessions').update({
                title: headerForm.title.trim(),
                description: headerForm.description || null,
                starts_at: headerForm.starts_at || null,
                ends_at:   headerForm.ends_at   || null,
                status:    headerForm.status,
                is_hidden: headerForm.is_hidden,
                links:     finalLinks,
            }).eq('id', sessionId);
            if (error) throw error;
            setSessionData(prev => ({ ...prev, ...headerForm, links: finalLinks }));
            setEditingHeader(false);
        } catch (err) {
            alert('Error saving: ' + err.message);
        } finally {
            setSavingHeader(false);
        }
    };

    const handleDeleteSession = async () => {
        if (!window.confirm('Permanently delete this planning session and all its tasks?')) return;
        const { error } = await supabase.from('planning_sessions').delete().eq('id', sessionId);
        if (error) { alert('Error: ' + error.message); return; }
        navigate('/planning');
    };

    // ── Notes auto-save ─────────────────────────────────────────────────────

    const handleNotesChange = (val) => {
        setNotes(val);
        if (notesTimer.current) clearTimeout(notesTimer.current);
        notesTimer.current = setTimeout(async () => {
            setSavingNotes(true);
            lastPushedNotes.current = val; // Mark this as our local state
            await supabase.from('planning_sessions').update({ notes: val }).eq('id', sessionId);
            setSavingNotes(false);
        }, 600);
    };

    // ── Access tab ──────────────────────────────────────────────────────────

    const handleGrantAccess = async () => {
        if (!inviteUserId) return;
        setInviting(true);
        try {
            const { error } = await supabase.from('session_access').upsert({
                session_id: sessionId, user_id: inviteUserId, role: inviteRole,
                granted_by: session.user.id,
            }, { onConflict: 'session_id,user_id' });
            if (error) throw error;
            setInviteUserId('');
            await fetchAll();
        } catch (err) {
            alert('Error granting access: ' + err.message);
        } finally {
            setInviting(false);
        }
    };

    const handleUpdateRole = async (accessId, role) => {
        const { error } = await supabase.from('session_access').update({ role }).eq('id', accessId);
        if (error) { alert('Error: ' + error.message); return; }
        setAccessList(prev => prev.map(a => a.id === accessId ? { ...a, role } : a));
    };

    const handleRevokeAccess = async (accessId) => {
        if (!window.confirm('Revoke access for this user?')) return;
        const { error } = await supabase.from('session_access').delete().eq('id', accessId);
        if (error) { alert('Error: ' + error.message); return; }
        await fetchAll();
    };

    // ── Tab keyboard nav ────────────────────────────────────────────────────

    const switchTab = (i) => { setActiveTab(i); setAccordionOpen(i); };
    const handleTabKeyDown = (e, index) => {
        let ni = index;
        if (e.key === 'ArrowRight') { e.preventDefault(); ni = (index + 1) % TABS.length; }
        else if (e.key === 'ArrowLeft') { e.preventDefault(); ni = (index - 1 + TABS.length) % TABS.length; }
        else if (e.key === 'Home') { e.preventDefault(); ni = 0; }
        else if (e.key === 'End')  { e.preventDefault(); ni = TABS.length - 1; }
        if (ni !== index) { switchTab(ni); setTimeout(() => tabRefs.current[ni]?.focus(), 0); }
    };

    // ── Early returns ───────────────────────────────────────────────────────

    if (loading) return <div style={{ padding: '3rem', textAlign: 'center', color: '#97f7e9' }}>Loading session…</div>;

    if (accessDenied || !sessionData) {
        return (
            <div className="member-mgmt-container">
                <div className="glass-panel" style={{ maxWidth: '500px', margin: '4rem auto', padding: '2.5rem', textAlign: 'center' }}>
                    <div style={{ fontSize: '2.5rem', marginBottom: '1rem', color: 'white' }}><LockIcon /></div>
                    <h2 style={{ color: 'var(--auth-text-light-blue)', marginBottom: '1rem' }}>Access Required</h2>
                    <p style={{ color: 'rgba(255,255,255,0.7)', marginBottom: '2rem' }}>
                        You don't have access to this planning session. Contact the session creator to request access.
                    </p>
                    <button className="admin-pill-btn" onClick={() => navigate('/planning')} style={{ margin: 0 }}>
                        ← Back to Planning Sessions
                    </button>
                </div>
            </div>
        );
    }

    // ── Stats ───────────────────────────────────────────────────────────────

    const allTaskCount = tasks.length;
    const doneCount    = tasks.filter(t => t.status === 'done').length;
    const pct          = allTaskCount ? Math.round((doneCount / allTaskCount) * 100) : 0;
    const days         = daysLeft(sessionData.ends_at);

    // ── Tab content renderer ────────────────────────────────────────────────

    const renderTabContent = (i) => {
        // ── TASKS TAB ──────────────────────────────────────────────────────
        if (i === 0) return (
            <div>
                <div style={{ display: 'flex', gap: '0.75rem', alignItems: 'center', marginBottom: '1.25rem', flexWrap: 'wrap' }}>
                    <input
                        type="text"
                        placeholder="Search tasks…"
                        value={taskSearch}
                        onChange={e => setTaskSearch(e.target.value)}
                        className="admin-input"
                        style={{ flex: 1, minWidth: '180px', maxWidth: '300px' }}
                    />
                    {isEditor && (
                        <button className="admin-pill-btn" style={{ padding: '0.45rem 1rem', fontSize: '0.88rem', margin: 0 }}
                            onClick={() => { setAddingTask(true); setAddingSubFor(null); }}>
                            + Add Task
                        </button>
                    )}
                </div>

                <div className="admin-table-wrapper" style={{ borderRadius: '10px' }}>
                    <table className="task-table">
                        <thead>
                            <tr>
                                <th style={{ width: '40%' }}>Task</th>
                                <th style={{ width: '15%' }}>Assigned To</th>
                                <th style={{ width: '12%' }}>Due Date</th>
                                <th style={{ width: '13%' }}>Status</th>
                                {hasAnyEditableTasks && <th style={{ width: '10%' }}></th>}
                            </tr>
                        </thead>
                        <tbody>
                            {filteredParents.length === 0 && !addingTask && (
                                <tr><td colSpan={hasAnyEditableTasks ? 5 : 4} style={{ textAlign: 'center', padding: '2.5rem', color: 'rgba(255,255,255,0.35)', fontSize: '0.9rem' }}>
                                    {taskSearch ? 'No tasks match your search.' : 'No tasks yet. Add one to get started.'}
                                </td></tr>
                            )}

                            {filteredParents.map(task => (
                                <React.Fragment key={task.id}>
                                    <TaskRow
                                        task={task} isSubtask={false} isEditor={isEditor}
                                        assigneeGroups={assigneeGroups}
                                        onSave={handleSaveTask} onDelete={handleDeleteTask}
                                        onAddSubtask={pid => { setAddingSubFor(pid); setAddingTask(false); }}
                                        invitedIds={invitedIds}
                                        onInvitePrompt={handleInviteFromTask}
                                        sessionId={sessionId}
                                        onShowContact={setContactPopup}
                                        currentUserId={session.user.id}
                                        hasAnyEditableTasks={hasAnyEditableTasks}
                                    />

                                    {/* Sub-tasks */}
                                    {sortTasks(subTaskMap[task.id] || []).map(sub => (
                                        <TaskRow key={sub.id}
                                            task={sub} isSubtask={true} isEditor={isEditor}
                                            assigneeGroups={assigneeGroups}
                                            onSave={handleSaveTask} onDelete={handleDeleteTask}
                                            onAddSubtask={() => {}}
                                            invitedIds={invitedIds}
                                            onInvitePrompt={handleInviteFromTask}
                                            sessionId={sessionId}
                                            onShowContact={setContactPopup}
                                            currentUserId={session.user.id}
                                            hasAnyEditableTasks={hasAnyEditableTasks}
                                        />
                                    ))}

                                    {/* Add sub-task row */}
                                    {isEditor && addingSubFor === task.id && (
                                        <NewTaskRow
                                            parentTaskId={task.id} assigneeGroups={assigneeGroups}
                                            sessionId={sessionId}
                                            onCreated={() => { setAddingSubFor(null); fetchAll(); }}
                                            onCancel={() => setAddingSubFor(null)}
                                            invitedIds={invitedIds}
                                            onInvitePrompt={handleInviteFromTask}
                                        />
                                    )}

                                    {/* Add sub-task button removed (now inline green plus icon) */}
                                </React.Fragment>
                            ))}

                            {/* New top-level task row */}
                            {isEditor && addingTask && (
                                <NewTaskRow
                                    parentTaskId={null} assigneeGroups={assigneeGroups}
                                    sessionId={sessionId}
                                    onCreated={() => { setAddingTask(false); fetchAll(); }}
                                    onCancel={() => setAddingTask(false)}
                                    invitedIds={invitedIds}
                                    onInvitePrompt={handleInviteFromTask}
                                />
                            )}
                        </tbody>
                    </table>
                </div>

                {/* Footer legend */}
                <div style={{ marginTop: '0.9rem', display: 'flex', gap: '1.25rem', fontSize: '0.78rem', color: 'rgba(255,255,255,0.4)', flexWrap: 'wrap' }}>
                    <span>Showing {filteredParents.length} task{filteredParents.length !== 1 ? 's' : ''}</span>
                    <span>● Not Started</span>
                    <span style={{ color: '#fcd34d' }}>● In Progress</span>
                    <span style={{ color: '#55c46f' }}>● Done</span>
                </div>
            </div>
        );

        // ── NOTES TAB ──────────────────────────────────────────────────────
        if (i === 1) {
            const Linkify = ({ text }) => {
                if (!text) return null;
                const urlRegex = /(https?:\/\/[^\s]+)/g;
                const parts = text.split(urlRegex);
                return parts.map((part, index) => {
                    if (part.match(urlRegex)) {
                        return <a key={index} href={part} target="_blank" rel="noopener noreferrer" style={{ color: 'var(--auth-text-light-blue)', textDecoration: 'underline' }}>{part}</a>;
                    }
                    return part;
                });
            };

            return (
                <div>
                    <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '1rem', flexWrap: 'wrap', gap: '0.5rem' }}>
                        <div style={{ display: 'flex', alignItems: 'center', gap: '1rem' }}>
                            <h3 style={{ margin: 0, color: 'var(--auth-text-light-blue)', fontSize: '1.1rem' }}>Shared Notes</h3>
                            {isEditor && (
                                <div style={{ display: 'flex', background: 'rgba(255,255,255,0.08)', borderRadius: '9999px', padding: '2px' }}>
                                    <button
                                        onClick={() => setEditingNotes(true)}
                                        style={{
                                            background: editingNotes ? 'var(--auth-text-light-blue)' : 'transparent',
                                            color: editingNotes ? '#000' : 'rgba(255,255,255,0.5)',
                                            border: 'none', borderRadius: '9999px', padding: '3px 12px', fontSize: '0.75rem', fontWeight: 600, cursor: 'pointer', transition: 'all 0.2s'
                                        }}>Edit</button>
                                    <button
                                        onClick={() => setEditingNotes(false)}
                                        style={{
                                            background: !editingNotes ? 'var(--auth-text-light-blue)' : 'transparent',
                                            color: !editingNotes ? '#000' : 'rgba(255,255,255,0.5)',
                                            border: 'none', borderRadius: '9999px', padding: '3px 12px', fontSize: '0.75rem', fontWeight: 600, cursor: 'pointer', transition: 'all 0.2s'
                                        }}>View</button>
                                </div>
                            )}
                        </div>
                        <span style={{ fontSize: '0.75rem', color: 'rgba(255,255,255,0.3)' }}>
                            {savingNotes ? 'Saving…' : 'Changes auto-saved'}
                        </span>
                    </div>

                    {isEditor && editingNotes ? (
                        <textarea
                            value={notes}
                            onChange={e => handleNotesChange(e.target.value)}
                            placeholder="Use this space for shared notes, links, ideas, and context visible to everyone with access…"
                            style={{
                                width: '100%', minHeight: '320px', boxSizing: 'border-box',
                                background: 'rgba(0,0,0,0.2)', border: '1px solid rgba(151,247,233,0.2)',
                                borderRadius: '10px', color: 'white', fontSize: '0.95rem',
                                padding: '1rem', fontFamily: 'inherit', lineHeight: 1.6, resize: 'vertical', outline: 'none',
                                wordBreak: 'break-word', overflowWrap: 'break-word',
                            }}
                        />
                    ) : (
                        <div style={{
                            minHeight: '200px', background: 'rgba(0,0,0,0.2)', border: '1px solid rgba(255,255,255,0.1)',
                            borderRadius: '10px', padding: '1rem', whiteSpace: 'pre-wrap',
                            color: notes ? 'rgba(255,255,255,0.8)' : 'rgba(255,255,255,0.3)', fontSize: '0.95rem', lineHeight: 1.6,
                            wordBreak: 'break-word', overflowWrap: 'break-word',
                        }}>
                            {notes ? <Linkify text={notes} /> : 'No notes yet.'}
                        </div>
                    )}
                </div>
            );
        }

        // ── ACCESS TAB ─────────────────────────────────────────────────────
        if (i === 2) {
            const uninvitedMembers = members.filter(m => !invitedIds.includes(m.user_id) && m.user_id !== sessionData?.created_by);

            return (
                <div>
                    <h3 style={{ margin: '0 0 1.5rem', color: 'var(--auth-text-light-blue)', fontSize: '1.1rem' }}>
                        {isCreatorOrAdmin ? 'Manage Access' : 'Session Access'}
                    </h3>

                    {/* Invite section */}
                    {isCreatorOrAdmin && (
                        <div style={{ display: 'flex', flexWrap: 'wrap', gap: '0.6rem', alignItems: 'flex-end', marginBottom: '2rem' }}>
                            <div style={{ flex: '1 1 200px' }}>
                                <label style={{ fontSize: '0.8rem', color: 'rgba(255,255,255,0.5)', display: 'block', marginBottom: '0.3rem' }}>Member</label>
                                <CustomSelect
                                    value={inviteUserId}
                                    onChange={e => setInviteUserId(e.target.value)}
                                    options={uninvitedMembers.map(m => ({ value: m.user_id, label: m.profiles?.display_name || m.user_id }))}
                                    placeholder="+ Invite a community member…"
                                />
                            </div>
                            <div style={{ width: '130px' }}>
                                <label style={{ fontSize: '0.8rem', color: 'rgba(255,255,255,0.5)', display: 'block', marginBottom: '0.3rem' }}>Role</label>
                                <CustomSelect
                                    value={inviteRole}
                                    onChange={e => setInviteRole(e.target.value)}
                                    options={[
                                        { value: 'viewer', label: 'Viewer' },
                                        { value: 'editor', label: 'Editor' },
                                    ]}
                                />
                            </div>
                            <button className="admin-pill-btn" style={{ margin: 0 }} onClick={handleGrantAccess} disabled={!inviteUserId || inviting}>
                                {inviting ? 'Inviting…' : 'Invite'}
                            </button>
                        </div>
                    )}

                    {/* Current access list */}
                    {accessList.length === 0 ? (
                        <p style={{ color: 'rgba(255,255,255,0.35)', fontSize: '0.9rem' }}>No one has been invited yet.</p>
                    ) : (
                        <div className="admin-table-wrapper" style={{ borderRadius: '10px' }}>
                            <table className="task-table">
                                <thead>
                                    <tr>
                                        <th style={{ width: '35%' }} className="access-name-cell">Member</th>
                                        <th style={{ width: '25%' }} className="align-to-input">Role</th>
                                        <th style={{ width: '20%' }}>Invited</th>
                                        {isCreatorOrAdmin && <th style={{ width: '10%' }}></th>}
                                    </tr>
                                </thead>
                                <tbody>
                                    {accessList.map(a => (
                                        <tr key={a.id} className="task-row">
                                            <td className="access-name-cell">
                                                <button 
                                                    onClick={() => setContactPopup(a.user)}
                                                    style={{ 
                                                        background: 'none', border: 'none', padding: 0, color: 'inherit', 
                                                        fontSize: 'inherit', cursor: 'pointer', textDecoration: 'underline',
                                                        textAlign: 'left'
                                                    }}
                                                >
                                                    {a.user?.display_name || a.user_id}
                                                </button>
                                            </td>
                                            <td>
                                                {isCreatorOrAdmin ? (
                                                    <CustomSelect
                                                        value={a.role}
                                                        onChange={e => handleUpdateRole(a.id, e.target.value)}
                                                        options={[
                                                            { value: 'viewer', label: 'Viewer' },
                                                            { value: 'editor', label: 'Editor' },
                                                        ]}
                                                        variant="dense"
                                                        style={{ maxWidth: '130px' }}
                                                    />
                                                ) : (
                                                    <span style={{ textTransform: 'capitalize', fontSize: '0.9rem' }}>
                                                        {a.role}
                                                    </span>
                                                )}
                                            </td>
                                            <td style={{ fontSize: '0.8rem', color: 'rgba(255,255,255,0.5)' }}>
                                                {new Date(a.granted_at).toLocaleDateString()}
                                            </td>
                                            {isCreatorOrAdmin && (
                                                <td style={{ padding: '0.7rem 1rem' }}>
                                                    <button className="admin-pill-btn danger"
                                                        style={{ padding: '0.2rem 0.65rem', fontSize: '0.75rem', margin: 0 }}
                                                        onClick={() => handleRevokeAccess(a.id)}>
                                                        Revoke
                                                    </button>
                                                </td>
                                            )}
                                        </tr>
                                    ))}
                                </tbody>
                            </table>
                        </div>
                    )}
                </div>
            );
        }
        return null;
    };

    // ── Render ──────────────────────────────────────────────────────────────

    return (
        <div className="member-mgmt-container">

            {/* ── Breadcrumb ───────────────────────────────────────────────── */}
            <div style={{ width: '100%', maxWidth: '1152px', marginBottom: '0.75rem' }}>
                <button className="back-link" onClick={() => navigate('/planning')}>
                    ← Planning Sessions
                </button>
            </div>

            {/* ── Session Header ────────────────────────────────────────────── */}
            <div className="admin-header-container" style={{ width: '100%', maxWidth: '1152px' }}>
                <div className="glass-panel" style={{ padding: '1.75rem 2rem', marginBottom: '0.5rem' }}>
                    {editingHeader ? (
                        // ── Edit mode ──────────────────────────────────────
                        <div style={{ display: 'grid', gap: '1rem' }}>
                            <div style={{ display: 'flex', gap: '1rem', alignItems: 'flex-start' }}>
                                <input className="admin-input" style={{ flex: 1, fontSize: '1.2rem', fontWeight: 600 }}
                                    value={headerForm.title}
                                    onChange={e => setHeaderForm(f => ({ ...f, title: e.target.value }))}
                                    placeholder="Session title" />
                                <CustomSelect
                                    value={headerForm.status}
                                    onChange={e => setHeaderForm(f => ({ ...f, status: e.target.value }))}
                                    options={[
                                        { value: 'active',    label: 'Active'    },
                                        { value: 'completed', label: 'Completed' },
                                        { value: 'archived',  label: 'Archived'  },
                                    ]}
                                    style={{ maxWidth: '150px' }}
                                />
                            </div>
                            <textarea className="admin-input" rows={2} placeholder="Description"
                                value={headerForm.description}
                                onChange={e => setHeaderForm(f => ({ ...f, description: e.target.value }))}
                                style={{ resize: 'vertical' }} />
                            <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: '1rem' }}>
                                <div><label style={{ fontSize: '0.8rem', color: 'rgba(255,255,255,0.5)', display: 'flex', alignItems: 'center', gap: '0.4rem', marginBottom: '0.3rem' }}><CalendarIcon /> Start Date</label>
                                    <CustomDatePicker className="admin-input" value={headerForm.starts_at}
                                        onChange={e => setHeaderForm(f => ({ ...f, starts_at: e.target.value }))}
                                        placeholder="Start date…"
                                    /></div>
                                <div><label style={{ fontSize: '0.8rem', color: 'rgba(255,255,255,0.5)', display: 'flex', alignItems: 'center', gap: '0.4rem', marginBottom: '0.3rem' }}><CalendarIcon /> End Date</label>
                                    <CustomDatePicker className="admin-input" value={headerForm.ends_at}
                                        onChange={e => setHeaderForm(f => ({ ...f, ends_at: e.target.value }))}
                                        placeholder="End date…"
                                    /></div>
                            </div>

                            {/* Links editor */}
                            <div>
                                <label style={{ fontSize: '0.8rem', color: 'rgba(255,255,255,0.5)', display: 'block', marginBottom: '0.5rem' }}>Links</label>
                                <div style={{ display: 'flex', flexWrap: 'wrap', gap: '0.4rem', marginBottom: '0.5rem' }}>
                                    {(headerForm.links || []).map((lk, i) => (
                                        <span key={i} style={{ display: 'inline-flex', alignItems: 'center', gap: '0.45rem', background: 'rgba(151,247,233,0.1)', border: '1px solid rgba(151, 247, 233, 0.25)', padding: '2px 10px', borderRadius: '9999px', fontSize: '0.8rem' }}>
                                            <LinkIcon /> {lk.label}
                                            <button type="button" onClick={() => setHeaderForm(f => ({ ...f, links: f.links.filter((_, li) => li !== i) }))}
                                                style={{ background: 'none', border: 'none', color: '#ef4444', cursor: 'pointer', padding: 0, fontSize: '0.85rem', lineHeight: 1 }}>✕</button>
                                        </span>
                                    ))}
                                </div>
                                <div style={{ display: 'grid', gridTemplateColumns: '1fr 2fr auto', gap: '0.5rem' }}>
                                    <input className="admin-input" placeholder="Label" value={headerLinkLabel} onChange={e => setHeaderLinkLabel(e.target.value)} />
                                    <input className="admin-input" placeholder="URL" value={headerLinkUrl} onChange={e => setHeaderLinkUrl(e.target.value)}
                                        onKeyDown={e => { if (e.key === 'Enter') { e.preventDefault(); if (headerLinkUrl.trim()) { setHeaderForm(f => ({ ...f, links: [...(f.links||[]), { label: headerLinkLabel.trim() || headerLinkUrl.trim(), url: headerLinkUrl.trim() }] })); setHeaderLinkLabel(''); setHeaderLinkUrl(''); } } }} />
                                    <button type="button" className="admin-pill-btn" style={{ margin: 0 }}
                                        onClick={() => { if (headerLinkUrl.trim()) { setHeaderForm(f => ({ ...f, links: [...(f.links||[]), { label: headerLinkLabel.trim() || headerLinkUrl.trim(), url: headerLinkUrl.trim() }] })); setHeaderLinkLabel(''); setHeaderLinkUrl(''); } }}>+ Add</button>
                                </div>
                            </div>

                            <label style={{ display: 'flex', alignItems: 'center', gap: '0.5rem', cursor: 'pointer', userSelect: 'none' }}>
                                <input type="checkbox" checked={headerForm.is_hidden}
                                    onChange={e => setHeaderForm(f => ({ ...f, is_hidden: e.target.checked }))}
                                    style={{ width: '15px', height: '15px', accentColor: 'var(--auth-text-light-blue)' }} />
                                <span style={{ fontSize: '0.88rem', display: 'flex', alignItems: 'center', gap: '0.4rem' }}><LockIcon /> Hidden session</span>
                            </label>

                            <div style={{ display: 'flex', gap: '0.6rem', justifyContent: 'flex-end' }}>
                                <button className="admin-pill-btn secondary" style={{ margin: 0 }} onClick={() => setEditingHeader(false)}>Cancel</button>
                                <button className="admin-pill-btn" style={{ margin: 0 }} disabled={savingHeader} onClick={handleSaveHeader}>
                                    {savingHeader ? 'Saving…' : '✓ Save'}
                                </button>
                            </div>
                        </div>
                    ) : (
                        // ── View mode ──────────────────────────────────────
                        <>
                            <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'flex-start', gap: '1.5rem', flexWrap: 'wrap', marginBottom: '1.5rem' }}>
                                <div style={{ flex: '1 1 300px' }}>
                                    <div style={{ display: 'flex', alignItems: 'center', gap: '0.75rem', flexWrap: 'wrap', marginBottom: '0.35rem' }}>
                                        <h1 style={{ margin: 0, fontFamily: "'Fredoka', sans-serif", fontSize: '2.2rem', color: 'white', lineHeight: 1.1 }}>
                                            {sessionData.title}
                                        </h1>
                                        <SessionStatusBadge status={sessionData.status} />
                                        {sessionData.is_hidden && (
                                            <span style={{ fontSize: '0.75rem', background: 'rgba(255,255,255,0.08)', border: '1px solid rgba(255,255,255,0.15)', borderRadius: '9999px', padding: '2px 10px', color: 'rgba(255,255,255,0.4)', display: 'inline-flex', alignItems: 'center', gap: '0.35rem' }}>
                                                <LockIcon /> Private
                                            </span>
                                        )}
                                    </div>
                                </div>

                                {/* Stats */}
                                <div style={{ display: 'flex', gap: '1.5rem', alignItems: 'flex-start', flexWrap: 'wrap' }}>
                                    <div className="planning-stat">
                                        <div className="planning-stat-number">{allTaskCount}</div>
                                        <div className="planning-stat-label">Tasks</div>
                                    </div>
                                    <div className="planning-stat">
                                        <div className="planning-stat-number">{doneCount} <span style={{ fontSize: '0.7rem', color: 'rgba(255,255,255,0.4)' }}>({pct}%)</span></div>
                                        <div className="planning-stat-label">Completed</div>
                                    </div>
                                    {days !== null && (
                                        <div className="planning-stat">
                                            <div className="planning-stat-number" style={{ color: days < 0 ? '#ef4444' : days < 7 ? '#fcd34d' : 'white' }}>
                                                {days < 0 ? `${Math.abs(days)}d ago` : `${days}d`}
                                            </div>
                                            <div className="planning-stat-label">{days < 0 ? 'Ended' : 'Time Left'}</div>
                                        </div>
                                    )}
                                </div>
                            </div>

                            {/* Info + Links Section */}
                            <div style={{ borderTop: '1px solid rgba(255,255,255,0.1)', paddingTop: '1.25rem' }}>
                                {(sessionData.starts_at || sessionData.ends_at) && (
                                    <p style={{ margin: '0 0 0.5rem', fontSize: '0.9rem', color: 'rgba(255,255,255,0.5)', display: 'flex', alignItems: 'center', gap: '0.5rem' }}>
                                        <span style={{ opacity: 0.8, color: 'white' }}><CalendarIcon /></span>
                                        {[sessionData.starts_at && formatDate(sessionData.starts_at), sessionData.ends_at && formatDate(sessionData.ends_at)].filter(Boolean).join(' – ')}
                                    </p>
                                )}
                                {sessionData.description && (
                                    <p style={{ margin: '0 0 1rem', color: 'rgba(255,255,255,0.7)', fontSize: '0.95rem', lineHeight: 1.6, maxWidth: '800px', wordBreak: 'break-word', overflowWrap: 'break-word' }}>{sessionData.description}</p>
                                )}


                                {(sessionData.links || []).length > 0 && (
                                    <div style={{ display: 'flex', flexWrap: 'wrap', gap: '0.5rem' }}>
                                        {sessionData.links.map((lk, i) => (
                                            <a key={i} href={lk.url} target="_blank" rel="noopener noreferrer"
                                                className="session-link-pill"
                                                style={{ display: 'inline-flex', alignItems: 'center', gap: '0.4rem', fontSize: '0.85rem', color: 'var(--auth-text-light-blue)', textDecoration: 'none', background: 'rgba(151,247,233,0.1)', border: '1px solid rgba(151,247,233,0.25)', padding: '5px 12px', borderRadius: '9999px', transition: 'all 0.2s' }}>
                                                <span style={{ color: 'white' }}><LinkIcon /></span> {lk.label}
                                            </a>
                                        ))}
                                    </div>
                                )}
                            </div>

                            {/* Action buttons & Creator */}
                            <div style={{ display: 'flex', gap: '1rem', marginTop: '1.25rem', justifyContent: 'space-between', alignItems: 'center', flexWrap: 'wrap' }}>
                                <div>
                                    {sessionData.creator && (
                                        <p style={{ margin: 0, fontSize: '0.85rem', color: 'rgba(255,255,255,0.5)' }}>
                                            Created by:{' '}
                                            <button 
                                                onClick={() => setContactPopup(sessionData.creator)}
                                                style={{ 
                                                    background: 'none', border: 'none', padding: 0, color: 'inherit', 
                                                    fontSize: 'inherit', cursor: 'pointer', textDecoration: 'underline'
                                                }}
                                            >
                                                {sessionData.creator.display_name || sessionData.creator.user_id}
                                            </button>
                                        </p>
                                    )}
                                </div>
                                {isCreatorOrAdmin && (
                                    <div style={{ display: 'flex', gap: '0.5rem' }}>
                                        <button className="admin-pill-btn secondary" style={{ padding: '0.4rem 1rem', fontSize: '0.85rem', margin: 0, display: 'inline-flex', alignItems: 'center', gap: '0.4rem' }}
                                            onClick={() => setEditingHeader(true)}><PencilIcon /> Edit Session</button>
                                        <button className="admin-pill-btn danger" style={{ padding: '0.4rem 1rem', fontSize: '0.85rem', margin: 0, display: 'inline-flex', alignItems: 'center', gap: '0.4rem' }}
                                            onClick={handleDeleteSession}><TrashIcon /> Delete</button>
                                    </div>
                                )}
                            </div>
                        </>
                    )}
                </div>
            </div>

            {/* ── Tabs + Panel ─────────────────────────────────────────────── */}
            <div className="admin-panel-wrapper">
                {/* Desktop tab bar */}
                <div className="admin-tabs" role="tablist" aria-label="Planning session sections">
                    {TABS.map((tab, i) => (
                        <button key={tab} id={`ps-tab-${i}`} role="tab" aria-selected={activeTab === i}
                            aria-controls={`ps-panel-${i}`} onClick={() => switchTab(i)}
                            onKeyDown={(e) => handleTabKeyDown(e, i)} ref={el => tabRefs.current[i] = el}
                            className={`admin-tab-btn ${activeTab === i ? 'active' : ''}`}
                            tabIndex={activeTab === i ? 0 : -1}>
                            <span style={{ display: 'flex', alignItems: 'center', gap: '0.5rem' }}>
                                {tab === 'Tasks' && <TasksIcon />}
                                {tab === 'Notes' && <NotesIcon />}
                                {tab === 'Access' && <AccessIcon />}
                                {tab}
                                {tab === 'Tasks' && (
                                    <span className="admin-tab-badge">{allTaskCount}</span>
                                )}
                                {tab === 'Access' && (
                                    <span className="admin-tab-badge">{accessList.length}</span>
                                )}
                            </span>
                        </button>
                    ))}
                </div>

                {/* Desktop panel */}
                <div id={`ps-panel-${activeTab}`} role="tabpanel" aria-labelledby={`ps-tab-${activeTab}`}
                    className="admin-panel admin-desktop-only" tabIndex={0}>
                    {renderTabContent(activeTab)}
                </div>

                {/* Mobile accordion */}
                <div className="admin-accordion" aria-label="Planning session sections">
                    {TABS.map((tab, i) => {
                        const isOpen = accordionOpen === i;
                        return (
                            <div key={tab} className="admin-accordion-item">
                                <button className="admin-accordion-btn" aria-expanded={isOpen} aria-controls={`ps-acc-${i}`}
                                    id={`ps-acc-hdr-${i}`}
                                    onClick={() => { setAccordionOpen(isOpen ? null : i); setActiveTab(i); }}>
                                    <span style={{ display: 'flex', alignItems: 'center', gap: '0.5rem' }}>
                                        {tab === 'Tasks' && <TasksIcon />}
                                        {tab === 'Notes' && <NotesIcon />}
                                        {tab === 'Access' && <AccessIcon />}
                                        {tab}
                                    </span>
                                    <span className="admin-accordion-icon" aria-hidden="true">▼</span>
                                </button>
                                {isOpen && (
                                    <div id={`ps-acc-${i}`} role="region" aria-labelledby={`ps-acc-hdr-${i}`} className="admin-accordion-panel">
                                        {renderTabContent(i)}
                                    </div>
                                )}
                            </div>
                        );
                    })}
                </div>
            </div>
            {/* Contact Info Modal */}
            {contactPopup && createPortal(
                <div 
                    style={{ position: 'fixed', top: 0, left: 0, right: 0, bottom: 0, 
                             background: 'rgba(0,0,0,0.6)', backdropFilter: 'blur(8px)', 
                             display: 'flex', justifyContent: 'center', alignItems: 'center', zIndex: 100000 }}
                    onClick={() => setContactPopup(null)}
                >
                    <div 
                        className="admin-panel" 
                        role="dialog"
                        aria-modal="true"
                        aria-labelledby="contact-modal-title"
                        style={{ padding: '2rem', maxWidth: '400px', width: '90%', borderRadius: '16px', border: '1px solid rgba(151, 247, 233, 0.35)', position: 'relative', backgroundColor: 'rgba(36, 43, 179, 0.5)' }}
                        onClick={e => e.stopPropagation()}
                    >
                        <button 
                            ref={contactCloseBtnRef}
                            onClick={() => setContactPopup(null)}
                            aria-label="Close contact details"
                            style={{ position: 'absolute', top: '1rem', right: '1.2rem', background: 'none', border: 'none', color: 'white', fontSize: '1.2rem', cursor: 'pointer', lineHeight: 1 }}
                        >×</button>
                        <h3 id="contact-modal-title" style={{ margin: '0 0 1rem', color: 'var(--auth-text-light-blue)', fontFamily: "'Fredoka', sans-serif" }}>Contact Information</h3>
                        <div style={{ display: 'grid', gap: '1rem' }}>
                            <div>
                                <label style={{ fontSize: '0.75rem', color: 'rgba(255,255,255,0.5)', display: 'block', textTransform: 'uppercase', letterSpacing: '0.05em' }}>Name</label>
                                <div style={{ fontSize: '1.1rem', fontWeight: 600, color: 'white' }}>{contactPopup.display_name}</div>
                            </div>
                            
                            {!contactPopup.show_contact_info ? (
                                <div style={{ fontSize: '0.9rem', color: 'rgba(255,255,255,0.5)', fontStyle: 'italic', background: 'rgba(255,255,255,0.05)', padding: '0.75rem', borderRadius: '8px', border: '1px solid rgba(255,255,255,0.1)' }}>
                                    This member has chosen to keep their contact information private.
                                </div>
                            ) : (
                                <>
                                    {contactPopup.contact_email && (
                                        <div>
                                            <label style={{ fontSize: '0.75rem', color: 'rgba(255,255,255,0.5)', display: 'block', textTransform: 'uppercase', letterSpacing: '0.05em' }}>Email</label>
                                            <a href={`mailto:${contactPopup.contact_email}`} style={{ color: '#97f7e9', textDecoration: 'none', fontSize: '1rem', fontWeight: 500 }}>
                                                {contactPopup.contact_email}
                                            </a>
                                        </div>
                                    )}
                                    {contactPopup.phone && (
                                        <div>
                                            <label style={{ fontSize: '0.75rem', color: 'rgba(255,255,255,0.5)', display: 'block', textTransform: 'uppercase', letterSpacing: '0.05em' }}>Phone</label>
                                            <a href={`tel:${contactPopup.phone}`} style={{ color: '#97f7e9', textDecoration: 'none', fontSize: '1rem', fontWeight: 500 }}>
                                                {contactPopup.phone}
                                            </a>
                                        </div>
                                    )}
                                    {!contactPopup.contact_email && !contactPopup.phone && (
                                        <div style={{ fontSize: '0.9rem', color: 'rgba(255,255,255,0.4)' }}>No contact details provided.</div>
                                    )}
                                    <div style={{ marginTop: '0.5rem', borderTop: '1px solid rgba(255,255,255,0.1)', paddingTop: '1rem' }}>
                                        <button 
                                            onClick={() => navigate(`/profile/${contactPopup.user_id}`)}
                                            style={{ 
                                                background: 'none', border: 'none', padding: 0, 
                                                color: 'var(--auth-text-light-blue)', fontSize: '0.9rem', 
                                                cursor: 'pointer', textDecoration: 'underline', fontWeight: 500
                                            }}
                                        >
                                            View Full Profile ➔
                                        </button>
                                    </div>
                                </>
                            )}
                        </div>
                        <button className="admin-pill-btn secondary" style={{ marginTop: '1.5rem', width: '100%', margin: '1.5rem 0 0', justifyContent: 'center' }} onClick={() => setContactPopup(null)}>Close</button>
                    </div>
                </div>,
                document.body
            )}
        </div>
    );
}
