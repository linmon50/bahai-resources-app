import React, { useState, useEffect } from 'react';
import supabase from './supabaseClient';
import { useCommunity } from "./context/CommunityContext";
import CreatePost from './components/CreatePost';

export default function BulletinBoard({ session, isAdmin }) {
  const [loading, setLoading] = useState(true);
  const [posts, setPosts] = useState([]);
  const [mySubmissions, setMySubmissions] = useState([]);
  const [error, setError] = useState(null);
  const [selectedGallery, setSelectedGallery] = useState({ index: 0, images: [] });
  const [showCreatePost, setShowCreatePost] = useState(false);
  const { activeCommunityId, communityDetails } = useCommunity();

  useEffect(() => {
    if (activeCommunityId) {
      setLoading(true);
      fetchPosts();
      fetchMySubmissions();
    } else {
      setLoading(false);
    }
  }, [activeCommunityId, session]);

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
    <div style={{ maxWidth: '800px', margin: '2rem auto', padding: '0 1rem', color: 'white' }}>
      <div style={{ marginBottom: '2rem', textAlign: 'center' }}>
        <h2 style={{ fontFamily: "'Fredoka', sans-serif", fontSize: '2.5rem', marginBottom: '0.5rem', color: 'var(--auth-text-light-blue)' }}>
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
          isAdmin={isAdmin} 
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
                background: 'rgba(255, 255, 255, 0.03)', 
                borderRadius: '12px', 
                padding: '1rem',
                border: `1px solid ${sub.status === 'pending' ? 'rgba(252, 211, 77, 0.3)' : 'rgba(239, 68, 68, 0.3)'}`,
                display: 'flex',
                justifyContent: 'space-between',
                alignItems: 'center'
              }}>
                <div style={{ flex: 1 }}>
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
                  <button 
                  onClick={() => handleDelete(sub.id)}
                  className="admin-pill-btn danger"
                  style={{ padding: '0.4rem 0.8rem', fontSize: '0.8rem' }}
                >
                  Remove
                </button>
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
              background: 'rgba(255, 255, 255, 0.08)', 
              borderRadius: '16px', 
              padding: '1.5rem',
              border: post.is_pinned ? '2px solid #fcd34d' : '1px solid rgba(255,255,255,0.1)',
              position: 'relative'
            }}>
              {post.is_pinned && (
                <div style={{ position: 'absolute', top: '-12px', left: '20px', background: '#fcd34d', color: '#000', padding: '2px 10px', borderRadius: '20px', fontSize: '0.75rem', fontWeight: 'bold' }}>
                  PINNED ANNOUNCEMENT
                </div>
              )}

              <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'flex-start', marginBottom: '1rem' }}>
                <div style={{ display: 'flex', alignItems: 'center', gap: '0.8rem' }}>
                  <div style={{ width: '45px', height: '45px', borderRadius: '50%', overflow: 'hidden', background: '#333' }}>
                    {post.author?.avatar_url ? (
                      <img src={post.author.avatar_url} alt="" style={{ width: '100%', height: '100%', objectFit: 'cover' }} />
                    ) : (
                    <div style={{ width: '100%', height: '100%', display: 'flex', alignItems: 'center', justifyContent: 'center', fontSize: '0.7rem' }}></div>
                    )}
                  </div>
                  <div>
                    <p style={{ margin: 0, fontWeight: 'bold' }}>{post.author?.display_name || 'Anonymous'}</p>
                    <p style={{ margin: 0, fontSize: '0.75rem', color: '#ffffff', opacity: 0.7 }}>{new Date(post.created_at).toLocaleDateString()} at {new Date(post.created_at).toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' })}</p>
                  </div>
                </div>

                {(isAdmin || post.author_id === session.user.id) && (
                  <button 
                    onClick={() => handleDelete(post.id)}
                    className="admin-pill-btn danger"
                    style={{ padding: '0.4rem 0.8rem', fontSize: '0.8rem' }}
                  >
                    Delete
                  </button>
                )}
              </div>

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
                      style={{ width: '100%', height: post.image_urls.length > 1 ? '200px' : 'auto', objectFit: 'cover', display: 'block', cursor: 'pointer' }} 
                      onClick={() => setSelectedGallery({ index: idx, images: post.image_urls })}
                    />
                  ))}
                </div>
              )}

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
