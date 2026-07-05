import React, { useState, useEffect } from 'react';
import { useNavigate } from 'react-router-dom';
import supabase from './supabaseClient';
import { useCommunity } from "./context/CommunityContext";
import CreatePost from './components/CreatePost';
import EditPost from './components/EditPost';
import PostActions from './components/PostActions';
import { getAvatarColor, getInitials } from './utils/avatarUtils';

const PinIcon = ({ filled }) => (
  <svg width="14" height="14" viewBox="0 0 24 24" fill={filled ? "currentColor" : "none"} stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" style={{ verticalAlign: 'middle' }}>
    <path d="M12 22v-5"/><path d="M9 8V2h6v6"/><path d="M17 17H7l1-9h8l1 9z"/>
  </svg>
);

export default function BulletinBoard({ session, isAdmin }) {
  const navigate = useNavigate();
  const [loading, setLoading] = useState(true);
  const [posts, setPosts] = useState([]);
  const [mySubmissions, setMySubmissions] = useState([]);
  const [error, setError] = useState(null);
  const [selectedGallery, setSelectedGallery] = useState({ index: 0, images: [] });
  const [showCreatePost, setShowCreatePost] = useState(false);
  const [editingPostId, setEditingPostId] = useState(null);
  const [isCommunityAdmin, setIsCommunityAdmin] = useState(false);
  const { activeCommunityId, communityDetails } = useCommunity();

  useEffect(() => {
    if (activeCommunityId) {
      setLoading(true);
      fetchPosts();
      fetchMySubmissions();
      checkCurrentCommunityAdmin();
    } else {
      setLoading(false);
    }
  }, [activeCommunityId, session]);

  const checkCurrentCommunityAdmin = async () => {
    if (!session?.user?.id || !activeCommunityId) {
      setIsCommunityAdmin(false);
      return;
    }
    try {
      const { data, error } = await supabase
        .from('memberships')
        .select('role, admin_level')
        .eq('user_id', session.user.id)
        .eq('community_id', activeCommunityId)
        .eq('approved', true)
        .single();
      
      if (error && error.code !== 'PGRST116') throw error;
      
      const isGlobalAdmin = await supabase.rpc('is_global_admin', { uid: session.user.id });
      
      setIsCommunityAdmin(
        isGlobalAdmin.data === true || 
        (data && (data.role === 'admin' || data.admin_level > 0))
      );
    } catch (err) {
      console.error("Error checking community admin status:", err);
      setIsCommunityAdmin(false);
    }
  };

  const fetchMySubmissions = async () => {
    if (!session?.user?.id) return;
    try {
      const { data } = await supabase
        .from('bulletin_posts')
        .select('*')
        .eq('author_id', session.user.id)
        .neq('status', 'approved')
        .order('created_at', { ascending: false });
      setMySubmissions(data || []);
    } catch (err) {
      console.error("Error fetching my submissions:", err);
    }
  };

  const fetchPosts = async () => {
    if (!activeCommunityId) return;
    try {
      const { data, error } = await supabase
        .from('bulletin_posts')
        .select(`
          *,
          author:profiles(display_name, avatar_url)
        `)
        .eq('community_id', activeCommunityId)
        .eq('status', 'approved')
        .order('is_pinned', { ascending: false })
        .order('created_at', { ascending: false });

      if (error) throw error;
      setPosts(data || []);
    } catch (err) {
      console.error("Error fetching posts:", err);
    } finally {
      setLoading(false);
    }
  };

  const handlePostCreated = () => {
    fetchPosts();
    fetchMySubmissions();
  };

  const handlePostUpdated = (updatedPost) => {
    // If it was in the main feed
    setPosts(prev => prev.map(p => p.id === updatedPost.id ? { ...p, ...updatedPost } : p));
    // Re-fetch submissions in case it shifted status (e.g. rejected -> pending)
    fetchMySubmissions();
    setEditingPostId(null);
  };

  const handleDelete = async (postId) => {
    if (!window.confirm("Are you sure you want to delete this post?")) return;
    try {
      const { error } = await supabase
        .from('bulletin_posts')
        .delete()
        .eq('id', postId);
      if (error) throw error;
      setPosts(prev => prev.filter(p => p.id !== postId));
      fetchMySubmissions();
    } catch (err) {
      alert("Error deleting post: " + err.message);
    }
  };

  const handleTogglePin = async (post) => {
    try {
      const { error } = await supabase
        .from('bulletin_posts')
        .update({ is_pinned: !post.is_pinned })
        .eq('id', post.id);

      if (error) throw error;
      
      // Optimistic/Local update
      setPosts(prev => prev.map(p => p.id === post.id ? { ...p, is_pinned: !post.is_pinned } : p)
        .sort((a, b) => {
          // Re-sort locally to preserve order
          if (a.is_pinned !== b.is_pinned) return b.is_pinned ? 1 : -1;
          return new Date(b.created_at) - new Date(a.created_at);
        })
      );
    } catch (err) {
      console.error("Error toggling pin:", err);
      alert("Permission denied or server error. You must be an admin of this community to pin posts.");
      // Refresh to sync with server
      fetchPosts();
    }
  };

  useEffect(() => {
    const handleKeyDown = (e) => {
      if (selectedGallery.images.length === 0) return;
      if (e.key === 'ArrowRight') {
        setSelectedGallery(prev => ({ ...prev, index: (prev.index + 1) % prev.images.length }));
      } else if (e.key === 'ArrowLeft') {
        setSelectedGallery(prev => ({ ...prev, index: (prev.index - 1 + prev.images.length) % prev.images.length }));
      } else if (e.key === 'Escape') {
        setSelectedGallery({ index: 0, images: [] });
      }
    };
    window.addEventListener('keydown', handleKeyDown);
    return () => window.removeEventListener('keydown', handleKeyDown);
  }, [selectedGallery]);

  if (loading) return <div style={{ padding: '2rem', textAlign: 'center', color: 'white' }}>Loading Bulletin Board...</div>;
  if (error) return <div style={{ padding: '2rem', textAlign: 'center', color: '#ff4444' }}>{error}</div>;

  return (
    <div style={{ maxWidth: '800px', width: '100%', boxSizing: 'border-box', margin: '2rem auto', padding: '0 1.5rem', color: 'white' }}>
      <div style={{ marginBottom: '2rem', textAlign: 'center' }}>
        <h2 className="admin-title" style={{ marginBottom: '0.5rem' }}>
          {communityDetails?.name} Bulletin Board
        </h2>
        <p style={{ color: '#ffffff' }}>Community announcements, news, and shared moments.</p>
      </div>

      <div style={{ display: 'flex', justifyContent: 'center', marginBottom: '2rem' }}>
        <button 
          className={showCreatePost ? "admin-pill-btn danger" : "admin-pill-btn"}
          onClick={() => setShowCreatePost(!showCreatePost)}
          style={{ margin: 0, padding: '0.8rem 2rem', fontSize: '1rem' }}
        >
          {showCreatePost ? '✕ Close Post Maker' : 'Create New Post'}
        </button>
      </div>

      {showCreatePost && (
        <CreatePost 
          session={session} 
          communityId={activeCommunityId} 
          isAdmin={isCommunityAdmin} 
          onPostCreated={() => {
            handlePostCreated();
            setShowCreatePost(false);
          }} 
        />
      )}

      {mySubmissions.length > 0 && (
        <div style={{ marginBottom: '2rem' }}>
          <h4 style={{ color: '#ffffff', fontSize: '0.9rem', marginBottom: '1rem', textTransform: 'uppercase', letterSpacing: '1px' }}>My Submissions</h4>
          <div style={{ display: 'flex', flexDirection: 'column', gap: '1rem' }}>
            {mySubmissions.map(sub => (
              <div key={sub.id} style={{ 
                background: 'rgba(255, 255, 255, 0.1)', 
                borderRadius: '12px', 
                padding: '1rem',
                border: `1px solid ${sub.status === 'pending' ? 'rgba(252, 211, 77, 0.3)' : 'rgba(239, 68, 68, 0.3)'}`,
                display: 'flex',
                flexDirection: editingPostId === sub.id ? 'column' : 'row',
                justifyContent: editingPostId === sub.id ? 'flex-start' : 'space-between',
                alignItems: editingPostId === sub.id ? 'flex-start' : 'center',
                gap: editingPostId === sub.id ? '1rem' : '0'
              }}>
                <div style={editingPostId === sub.id ? { width: '100%' } : { flex: 1 }}>
                  <div style={{ display: 'flex', alignItems: 'center', gap: '0.5rem', marginBottom: '0.5rem' }}>
                    <span style={{ 
                      fontSize: '0.7rem', 
                      padding: '2px 8px', 
                      borderRadius: '10px', 
                      background: sub.status === 'pending' ? '#fcd34d' : '#ef4444',
                      color: '#000',
                      fontWeight: 'bold'
                    }}>
                      {sub.status.toUpperCase()}
                    </span>
                    <span style={{ fontSize: '0.8rem', color: '#ffffff' }}>{new Date(sub.created_at).toLocaleDateString()}</span>
                  </div>
                  <p style={{ margin: 0, fontSize: '0.95rem', color: '#ffffff', fontStyle: 'italic' }}>
                    "{sub.content.substring(0, 60)}{sub.content.length > 60 ? '...' : ''}"
                    {sub.link_url && (
                      <span style={{ 
                        marginLeft: '0.5rem', 
                        fontSize: '0.8rem', 
                        color: 'var(--auth-text-light-blue)',
                        background: 'rgba(151, 247, 233, 0.1)',
                        padding: '2px 6px',
                        borderRadius: '4px',
                        border: '1px solid rgba(151, 247, 233, 0.2)',
                        fontStyle: 'normal'
                      }}>
                        {sub.link_url.replace(/^https?:\/\/(www\.)?/, '').split('/')[0]}
                      </span>
                    )}
                  </p>
                  
                  {sub.status === 'rejected' && sub.rejection_reason && (
                    <div style={{ marginTop: '0.8rem', padding: '0.6rem', background: 'rgba(239, 68, 68, 0.1)', borderRadius: '6px', borderLeft: '3px solid #ef4444' }}>
                      <p style={{ margin: 0, fontSize: '0.8rem', color: '#ef4444', fontWeight: 'bold' }}>Admin Feedback:</p>
                      <p style={{ margin: 0, fontSize: '0.85rem', color: '#ffffff' }}>{sub.rejection_reason}</p>
                    </div>
                  )}
                </div>
                <div style={{ display: 'flex', gap: '0.5rem' }}>
                  <button 
                    onClick={() => setEditingPostId(editingPostId === sub.id ? null : sub.id)}
                    className={`admin-pill-btn ${editingPostId === sub.id ? 'secondary' : 'blue'}`}
                    style={{ padding: '0.4rem 0.8rem', fontSize: '0.8rem', margin: 0 }}
                  >
                    {editingPostId === sub.id ? 'Cancel' : 'Edit'}
                  </button>
                  <button 
                    onClick={() => handleDelete(sub.id)}
                    className="admin-pill-btn danger"
                    style={{ padding: '0.4rem 0.8rem', fontSize: '0.8rem', margin: 0 }}
                  >
                    Remove
                  </button>
                </div>
                {editingPostId === sub.id && (
                  <div style={{ width: '100%', marginTop: '1rem' }}>
                    <EditPost 
                      post={sub} 
                      session={session} 
                      isAdmin={isCommunityAdmin} 
                      onSave={handlePostUpdated}
                      onCancel={() => setEditingPostId(null)}
                    />
                  </div>
                )}
              </div>
            ))}
          </div>
        </div>
      )}

      <div style={{ display: 'flex', flexDirection: 'column', gap: '2rem' }}>
        {posts.length === 0 ? (
          <div style={{ textAlign: 'center', padding: '3rem', background: 'rgba(255,255,255,0.05)', borderRadius: '16px', color: '#ffffff' }}>
            No posts yet. Why not be the first to share something?
          </div>
        ) : (
          posts.map(post => (
            <div key={post.id} style={{ 
              background: 'rgba(255, 255, 255, 0.1)', 
              borderRadius: '16px', 
              padding: '1.5rem',
              border: post.is_pinned ? '2px solid #fcd34d' : '1px solid rgba(255,255,255,0.1)',
              position: 'relative'
            }}>
              {post.is_pinned && (
                <div style={{ position: 'absolute', top: '-12px', left: '20px', background: '#fcd34d', color: '#000', padding: '2px 10px', borderRadius: '20px', fontSize: '0.75rem', fontWeight: 'bold', zIndex: 5 }}>
                  PINNED ANNOUNCEMENT
                </div>
              )}

              <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'flex-start', marginBottom: '1rem' }}>
                <div 
                  style={{ display: 'flex', alignItems: 'center', gap: '0.8rem', cursor: 'pointer' }}
                  onClick={() => navigate(`/profile/${post.author_id}`)}
                >
                  <div style={{ width: '45px', height: '45px', borderRadius: '50%', overflow: 'hidden', background: '#333' }}>
                    {post.author?.avatar_url ? (
                      <img src={post.author.avatar_url} alt="" style={{ width: '100%', height: '100%', objectFit: 'cover' }} />
                    ) : (
                      <div style={{
                        width: '100%',
                        height: '100%',
                        display: 'flex',
                        alignItems: 'center',
                        justifyContent: 'center',
                        background: getAvatarColor(post.author?.display_name),
                        color: '#fff',
                        fontWeight: 'bold',
                        fontSize: '1rem',
                        borderRadius: '50%'
                      }}>
                        {getInitials(post.author?.display_name)}
                      </div>
                    )}
                  </div>
                  <div>
                    <p style={{ margin: 0, fontWeight: 'bold' }}>{post.author?.display_name || 'Anonymous'}</p>
                    <p style={{ margin: 0, fontSize: '0.75rem', color: '#ffffff', opacity: 0.7 }}>{new Date(post.created_at).toLocaleDateString()} at {new Date(post.created_at).toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' })}</p>
                  </div>
                </div>

                {(isCommunityAdmin || post.author_id === session.user.id) && (
                  <div style={{ display: 'flex', gap: '0.5rem' }}>
                    {post.author_id === session.user.id && (
                      <button 
                        onClick={() => setEditingPostId(editingPostId === post.id ? null : post.id)}
                        className={`admin-pill-btn ${editingPostId === post.id ? 'secondary' : 'blue'}`}
                        style={{ padding: '0.4rem 0.8rem', fontSize: '0.8rem', margin: 0 }}
                      >
                        {editingPostId === post.id ? 'Cancel' : 'Edit'}
                      </button>
                    )}
                    <button 
                      onClick={() => handleDelete(post.id)}
                      className="admin-pill-btn danger"
                      style={{ padding: '0.4rem 0.8rem', fontSize: '0.8rem', margin: 0 }}
                    >
                      Delete
                    </button>
                    {isCommunityAdmin && (
                      <button 
                        onClick={() => handleTogglePin(post)}
                        className="admin-pill-btn"
                        style={{ 
                          padding: '0.4rem 0.8rem', 
                          fontSize: '0.8rem', 
                          margin: 0,
                          background: post.is_pinned ? 'rgba(252, 211, 77, 0.2)' : 'var(--auth-button-green)',
                          border: post.is_pinned ? '1px solid #fcd34d' : 'none',
                          color: post.is_pinned ? '#fcd34d' : 'white'
                        }}
                      >
                        <PinIcon filled={post.is_pinned} /> {post.is_pinned ? 'Unpin' : 'Pin'}
                      </button>
                    )}
                  </div>
                )}
              </div>

              {editingPostId === post.id && (
                <div style={{ marginBottom: '1.5rem' }}>
                  <EditPost 
                    post={post} 
                    session={session} 
                    isAdmin={isAdmin} 
                    onSave={handlePostUpdated}
                    onCancel={() => setEditingPostId(null)}
                  />
                </div>
              )}

              <div style={{ fontSize: '1.05rem', lineHeight: '1.6', whiteSpace: 'pre-wrap', marginBottom: '1.5rem' }}>
                {post.content}
                {post.link_url && (
                  <a 
                    href={post.link_url} 
                    target="_blank" 
                    rel="noopener noreferrer"
                    style={{ 
                      display: 'inline-block', 
                      color: 'var(--auth-text-light-blue)', 
                      textDecoration: 'none',
                      fontSize: '0.9rem',
                      background: 'rgba(151, 247, 233, 0.1)',
                      padding: '2px 8px',
                      borderRadius: '4px',
                      border: '1px solid rgba(151, 247, 233, 0.2)',
                      marginLeft: '0.6rem',
                      verticalAlign: 'middle'
                    }}
                  >
                    {post.link_url.replace(/^https?:\/\/(www\.)?/, '').split('/')[0]}
                  </a>
                )}
              </div>

              {post.image_urls && post.image_urls.length > 0 && (
                <div style={{ 
                  display: 'grid', 
                  gridTemplateColumns: post.image_urls.length === 1 ? '1fr' : 'repeat(auto-fit, minmax(200px, 1fr))', 
                  gap: '0.5rem',
                  borderRadius: '12px', 
                  overflow: 'hidden', 
                  border: '1px solid rgba(255,255,255,0.1)', 
                  marginBottom: '1rem' 
                }}>
                  {post.image_urls.map((url, idx) => (
                    <img 
                      key={idx} 
                      src={url} 
                      alt="" 
                      style={{ 
                        width: '100%', 
                        height: post.image_urls.length > 1 ? '200px' : 'auto', 
                        maxHeight: post.image_urls.length === 1 ? '500px' : 'none',
                        objectFit: 'cover', 
                        objectPosition: 'center',
                        display: 'block', 
                        cursor: 'pointer' 
                      }} 
                      onClick={() => setSelectedGallery({ index: idx, images: post.image_urls })}
                    />
                  ))}
                </div>
              )}

              {/* Likes & Comments */}
              <PostActions post={post} session={session} isCommunityAdmin={isCommunityAdmin} />

            </div>
          ))
        )}
      </div>

      {/* Lightbox / Shadow Box */}
      {selectedGallery.images.length > 0 && (
        <div 
          style={{
            position: 'fixed',
            top: 0,
            left: 0,
            width: '100vw',
            height: '100vh',
            backgroundColor: 'rgba(0, 0, 0, 0.9)',
            backdropFilter: 'blur(8px)',
            webkitBackdropFilter: 'blur(8px)',
            display: 'flex',
            alignItems: 'center',
            justifyContent: 'center',
            zIndex: 1000,
            cursor: 'zoom-out'
          }}
          onClick={() => setSelectedGallery({ index: 0, images: [] })}
        >
          {/* Navigation Overlay */}
          <div style={{ position: 'relative', width: '90%', height: '90%', display: 'flex', alignItems: 'center', justifyContent: 'center' }}>
            {selectedGallery.images.length > 1 && (
              <>
                <button 
                  style={{
                    position: 'absolute',
                    left: '10px',
                    background: 'rgba(255,255,255,0.1)',
                    border: '1px solid rgba(255,255,255,0.2)',
                    color: 'white',
                    fontSize: '1.5rem',
                    width: '50px',
                    height: '50px',
                    borderRadius: '50%',
                    cursor: 'pointer',
                    display: 'flex',
                    alignItems: 'center',
                    justifyContent: 'center',
                    zIndex: 1001
                  }}
                  onClick={(e) => {
                    e.stopPropagation();
                    setSelectedGallery(prev => ({
                      ...prev,
                      index: (prev.index - 1 + prev.images.length) % prev.images.length
                    }));
                  }}
                >
                  ❮
                </button>
                <button 
                  style={{
                    position: 'absolute',
                    right: '10px',
                    background: 'rgba(255,255,255,0.1)',
                    border: '1px solid rgba(255,255,255,0.2)',
                    color: 'white',
                    fontSize: '1.5rem',
                    width: '50px',
                    height: '50px',
                    borderRadius: '50%',
                    cursor: 'pointer',
                    display: 'flex',
                    alignItems: 'center',
                    justifyContent: 'center',
                    zIndex: 1001
                  }}
                  onClick={(e) => {
                    e.stopPropagation();
                    setSelectedGallery(prev => ({
                      ...prev,
                      index: (prev.index + 1) % prev.images.length
                    }));
                  }}
                >
                  ❯
                </button>
              </>
            )}

            <img 
              src={selectedGallery.images[selectedGallery.index]} 
              alt="Full view" 
              style={{ 
                maxWidth: '100%', 
                maxHeight: '100%', 
                objectFit: 'contain', 
                borderRadius: '8px',
                boxShadow: '0 0 40px rgba(0,0,0,0.5)',
                border: '1px solid rgba(255,255,255,0.1)',
                cursor: 'default'
              }} 
              onClick={(e) => e.stopPropagation()}
            />

            {/* Image Counter */}
            {selectedGallery.images.length > 1 && (
              <div style={{
                position: 'absolute',
                bottom: '-40px',
                color: 'white',
                fontSize: '0.9rem',
                background: 'rgba(0,0,0,0.5)',
                padding: '4px 12px',
                borderRadius: '20px'
              }}>
                {selectedGallery.index + 1} / {selectedGallery.images.length}
              </div>
            )}
          </div>

          <button 
            style={{
              position: 'absolute',
              top: '20px',
              right: '25px',
              background: 'rgba(255,255,255,0.1)',
              border: '1px solid rgba(255,255,255,0.2)',
              color: 'white',
              fontSize: '1.5rem',
              width: '45px',
              height: '45px',
              borderRadius: '50%',
              cursor: 'pointer',
              display: 'flex',
              alignItems: 'center',
              justifyContent: 'center',
              zIndex: 1002
            }}
            onClick={() => setSelectedGallery({ index: 0, images: [] })}
          >
            ✕
          </button>
        </div>
      )}
    </div>
  );
}
