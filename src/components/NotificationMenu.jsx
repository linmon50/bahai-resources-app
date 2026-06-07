import React, { useState, useEffect, useRef } from 'react';
import { useNavigate } from 'react-router-dom';
import supabase from '../supabaseClient';
import { getInitials, getAvatarColor } from '../utils/avatarUtils';

const BellIcon = () => (
    <svg width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
        <path d="M18 8A6 6 0 0 0 6 8c0 7-3 9-3 9h18s-3-2-3-9" /><path d="M13.73 21a2 2 0 0 1-3.46 0" />
    </svg>
);

const CheckIcon = () => (
    <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
        <polyline points="20 6 9 17 4 12" />
    </svg>
);

const CloseIcon = () => (
    <svg width="12" height="12" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
        <line x1="18" y1="6" x2="6" y2="18" />
        <line x1="6" y1="6" x2="18" y2="18" />
    </svg>
);

export default function NotificationMenu({ session }) {
    const navigate = useNavigate();
    const [notifications, setNotifications] = useState([]);
    const [isOpen, setIsOpen] = useState(false);
    const dropdownRef = useRef(null);

    const unreadCount = notifications.filter(n => !n.is_read).length;

    useEffect(() => {
        if (!session?.user?.id) return;
        
        fetchNotifications();

        const channel = supabase
            .channel('notifications_changes')
            .on(
                'postgres_changes',
                {
                    event: 'INSERT',
                    schema: 'public',
                    table: 'notifications',
                    filter: `user_id=eq.${session.user.id}`
                },
                (payload) => {
                    // Fetch the actor's profile manually since the trigger only gives actor_id
                    fetchSingleNotification(payload.new.id);
                }
            )
            .subscribe();

        return () => {
            supabase.removeChannel(channel);
        };
    }, [session?.user?.id]);

    useEffect(() => {
        function handleClickOutside(event) {
            if (dropdownRef.current && !dropdownRef.current.contains(event.target)) {
                setIsOpen(false);
            }
        }
        document.addEventListener('mousedown', handleClickOutside);
        return () => document.removeEventListener('mousedown', handleClickOutside);
    }, []);

    const fetchNotifications = async () => {
        const { data, error } = await supabase
            .from('notifications')
            .select(`
                *,
                actor:profiles!actor_id(display_name, avatar_url)
            `)
            .eq('user_id', session.user.id)
            .order('created_at', { ascending: false })
            .limit(20);

        if (!error && data) {
            setNotifications(data);
        }
    };

    const fetchSingleNotification = async (id) => {
        const { data, error } = await supabase
            .from('notifications')
            .select(`
                *,
                actor:profiles!actor_id(display_name, avatar_url)
            `)
            .eq('id', id)
            .single();

        if (!error && data) {
            setNotifications(prev => [data, ...prev].slice(0, 20));
        }
    };

    const markAsRead = async (id) => {
        setNotifications(prev => prev.map(n => n.id === id ? { ...n, is_read: true } : n));
        await supabase.from('notifications').update({ is_read: true }).eq('id', id);
    };

    const markAllAsRead = async () => {
        setNotifications(prev => prev.map(n => ({ ...n, is_read: true })));
        await supabase.from('notifications').update({ is_read: true }).eq('user_id', session.user.id);
    };

    const deleteNotification = async (id) => {
        // Optimistically remove from state
        setNotifications(prev => prev.filter(n => n.id !== id));
        // Delete in Supabase
        const { error } = await supabase.from('notifications').delete().eq('id', id);
        if (error) {
            console.error('Error deleting notification:', error);
            fetchNotifications();
        }
    };

    const handleNotificationClick = async (notification) => {
        if (!notification.is_read) {
            await markAsRead(notification.id);
        }
        setIsOpen(false);

        switch (notification.type) {
            case 'task_assigned':
            case 'session_access':
                if (notification.reference_id) {
                    navigate(`/planning/${notification.reference_id}`);
                } else {
                    navigate('/planning');
                }
                break;
            case 'post_like':
            case 'post_comment':
            case 'comment_like':
            case 'membership_approved':
                navigate('/');
                break;
            default:
                break;
        }
    };

    const getNotificationText = (notification) => {
        const actorName = notification.actor?.display_name || 'Someone';
        const meta = notification.metadata || {};

        switch (notification.type) {
            case 'task_assigned':
                if (meta.session_title) {
                    return (
                        <span>
                            <strong>{actorName}</strong> assigned you a task in Planning Session: <strong>"{meta.session_title}"</strong>.
                        </span>
                    );
                }
                return <span><strong>{actorName}</strong> assigned you a task in Planning Sessions.</span>;
            case 'session_access':
                if (meta.session_title) {
                    return (
                        <span>
                            <strong>{actorName}</strong> granted you access to Planning Session: <strong>"{meta.session_title}"</strong>.
                        </span>
                    );
                }
                return <span><strong>{actorName}</strong> granted you access to a Planning Session.</span>;
            case 'post_like':
                if (meta.post_snippet) {
                    return (
                        <span>
                            <strong>{actorName}</strong> liked your post: <em>"{meta.post_snippet}..."</em>
                        </span>
                    );
                }
                return <span><strong>{actorName}</strong> liked your post.</span>;
            case 'post_comment':
                if (meta.post_snippet) {
                    return (
                        <span>
                            <strong>{actorName}</strong> commented on your post: <em>"{meta.post_snippet}..."</em>
                        </span>
                    );
                }
                return <span><strong>{actorName}</strong> commented on your post.</span>;
            case 'comment_like':
                if (meta.post_author_name && meta.post_snippet) {
                    return (
                        <span>
                            <strong>{actorName}</strong> liked your comment on <strong>{meta.post_author_name}</strong>'s post: <em>"{meta.post_snippet}..."</em>
                        </span>
                    );
                }
                return <span><strong>{actorName}</strong> liked your comment.</span>;
            case 'membership_approved':
                return <span><strong>{actorName}</strong> approved your membership!</span>;
            default:
                return <span>You have a new notification from <strong>{actorName}</strong>.</span>;
        }
    };

    return (
        <div className="notification-menu-container" ref={dropdownRef}>
            <button 
                className="nav-icon-btn notification-trigger" 
                aria-label="Notifications"
                onClick={() => setIsOpen(!isOpen)}
            >
                <BellIcon />
                {unreadCount > 0 && (
                    <span className="notification-badge">{unreadCount > 9 ? '9+' : unreadCount}</span>
                )}
            </button>

            {isOpen && (
                <div className="notification-dropdown">
                    <div className="notification-header">
                        <h3 className="notification-title">Notifications</h3>
                        {unreadCount > 0 && (
                            <button className="notification-mark-all" onClick={markAllAsRead}>
                                <CheckIcon /> Mark all as read
                            </button>
                        )}
                    </div>
                    
                    <div className="notification-list">
                        {notifications.length === 0 ? (
                            <div className="notification-empty">No notifications yet.</div>
                        ) : (
                            notifications.map(n => (
                                <div 
                                    key={n.id} 
                                    className={`notification-item ${n.is_read ? 'read' : 'unread'}`}
                                    onClick={() => handleNotificationClick(n)}
                                >
                                    <div 
                                        className="notification-avatar"
                                        style={!n.actor?.avatar_url ? { background: getAvatarColor(n.actor?.display_name) } : {}}
                                    >
                                        {n.actor?.avatar_url ? (
                                            <img src={n.actor.avatar_url} alt="" />
                                        ) : (
                                            <span>{getInitials(n.actor?.display_name)}</span>
                                        )}
                                    </div>
                                    <div className="notification-content">
                                        <p className="notification-text">{getNotificationText(n)}</p>
                                        <span className="notification-time">
                                            {new Date(n.created_at).toLocaleDateString()} at {new Date(n.created_at).toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' })}
                                        </span>
                                    </div>
                                    {!n.is_read && <div className="notification-dot" />}
                                    <button 
                                        className="notification-delete-btn"
                                        onClick={(e) => {
                                            e.stopPropagation();
                                            deleteNotification(n.id);
                                        }}
                                        title="Delete notification"
                                    >
                                        <CloseIcon />
                                    </button>
                                </div>
                            ))
                        )}
                    </div>
                </div>
            )}
        </div>
    );
}
