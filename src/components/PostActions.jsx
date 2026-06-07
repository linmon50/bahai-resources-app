import React, { useState, useEffect, useRef } from 'react';
import { useNavigate } from 'react-router-dom';
import supabase from '../supabaseClient';
import { getAvatarColor, getInitials } from '../utils/avatarUtils';

const HeartIcon = ({ filled, size = 16 }) => (
  <svg width={size} height={size} viewBox="0 0 24 24" fill={filled ? "currentColor" : "none"} stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" style={{ verticalAlign: 'middle' }}>
    <path d="M20.84 4.61a5.5 5.5 0 0 0-7.78 0L12 5.67l-1.06-1.06a5.5 5.5 0 0 0-7.78 7.78l1.06 1.06L12 21.23l7.78-7.78 1.06-1.06a5.5 5.5 0 0 0 0-7.78z"/>
  </svg>
);

const CommentIcon = ({ size = 16 }) => (
  <svg width={size} height={size} viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" style={{ verticalAlign: 'middle' }}>
    <path d="M21 15a2 2 0 0 1-2 2H7l-4 4V5a2 2 0 0 1 2-2h14a2 2 0 0 1 2 2z"/>
  </svg>
);

/**
 * PostActions — Likes & Comments bar for a single bulletin board post.
 *
 * Props:
 *   post      — the full post object (needs post.id)
 *   session   — the current Supabase session
 *   isAdmin   — boolean: is the current user a community admin?
 */
export default function PostActions({ post, session, isCommunityAdmin }) {
  const navigate = useNavigate();
  const currentUserId = session?.user?.id;

  // ── Likes state ─────────────────────────────────────────────────────────
  const [likeCount, setLikeCount]     = useState(0);
  const [hasLiked, setHasLiked]       = useState(false);
  const [likeLoading, setLikeLoading] = useState(false);

  // ── Comments state ───────────────────────────────────────────────────────
  const [comments, setComments]             = useState([]);
  const [commentCount, setCommentCount]     = useState(0);
  const [showComments, setShowComments]     = useState(false);
  const [commentText, setCommentText]       = useState('');
  const [commentLoading, setCommentLoading] = useState(false);
  const [commentsLoaded, setCommentsLoaded] = useState(false);
  
  // ── Comment Editing state ───────────────────────────────────────────────
  const [editingCommentId, setEditingCommentId] = useState(null);
  const [editCommentText, setEditCommentText]   = useState('');
  const [updateLoading, setUpdateLoading]     = useState(false);

  const inputRef = useRef(null);

  // ── Fetch like count + current user's like status on mount ───────────────
  useEffect(() => {
    if (!post?.id || !currentUserId) return;
    fetchLikeSummary();
    fetchCommentCount();
  }, [post?.id, currentUserId]);

  // ── Auto-focus input when comment section opens ──────────────────────────
  useEffect(() => {
    if (showComments && inputRef.current) {
      setTimeout(() => inputRef.current?.focus(), 150);
    }
  }, [showComments]);

  const fetchLikeSummary = async () => {
    try {
      // Get total like count for this post
      const { count } = await supabase
        .from('bulletin_post_likes')
        .select('id', { count: 'exact', head: true })
        .eq('post_id', post.id);

      // Check if the current user has liked this post
      const { data: myLike } = await supabase
        .from('bulletin_post_likes')
        .select('id')
        .eq('post_id', post.id)
        .eq('user_id', currentUserId)
        .maybeSingle();

      setLikeCount(count ?? 0);
      setHasLiked(!!myLike);
    } catch (err) {
      console.error('Error fetching likes:', err);
    }
  };

  const fetchCommentCount = async () => {
    try {
      const { count } = await supabase
        .from('bulletin_post_comments')
        .select('id', { count: 'exact', head: true })
        .eq('post_id', post.id);
      setCommentCount(count ?? 0);
    } catch (err) {
      console.error('Error fetching comment count:', err);
    }
  };

  const fetchComments = async () => {
    try {
      const { data, error } = await supabase
        .from('bulletin_post_comments')
        .select(`
          *,
          author:profiles(display_name, avatar_url),
          likes:bulletin_comment_likes(user_id)
        `)
        .eq('post_id', post.id)
        .order('created_at', { ascending: true });
      if (error) throw error;

      const enrichedData = (data || []).map(comment => {
        const likesArr = comment.likes || [];
        return {
          ...comment,
          likeCount: likesArr.length,
          hasLiked: likesArr.some(l => l.user_id === currentUserId)
        };
      });

      setComments(enrichedData);
      setCommentsLoaded(true);
    } catch (err) {
      console.error('Error fetching comments:', err);
    }
  };

  // ── Toggle like ──────────────────────────────────────────────────────────
  const handleToggleLike = async () => {
    if (!currentUserId || likeLoading) return;
    setLikeLoading(true);

    // Optimistic update
    const wasLiked = hasLiked;
    setHasLiked(!wasLiked);
    setLikeCount(prev => wasLiked ? prev - 1 : prev + 1);

    try {
      if (wasLiked) {
        const { error } = await supabase
          .from('bulletin_post_likes')
          .delete()
          .eq('post_id', post.id)
          .eq('user_id', currentUserId);
        if (error) throw error;
      } else {
        const { error } = await supabase
          .from('bulletin_post_likes')
          .insert({ post_id: post.id, user_id: currentUserId });
        if (error) throw error;
      }
    } catch (err) {
      // Roll back optimistic update on failure
      console.error('Error toggling like:', err?.message || err);
      setHasLiked(wasLiked);
      setLikeCount(prev => wasLiked ? prev + 1 : prev - 1);
    } finally {
      setLikeLoading(false);
    }
  };

  // ── Toggle comment section ───────────────────────────────────────────────
  const handleToggleComments = () => {
    const nextOpen = !showComments;
    setShowComments(nextOpen);
    if (nextOpen && !commentsLoaded) {
      fetchComments();
    }
  };

  // ── Submit new comment ───────────────────────────────────────────────────
  const handleSubmitComment = async (e) => {
    e.preventDefault();
    const trimmed = commentText.trim();
    if (!trimmed || !currentUserId || commentLoading || trimmed.length > 1000) return;
    setCommentLoading(true);

    try {
      // Step 1: insert the comment
      const { data: inserted, error: insertError } = await supabase
        .from('bulletin_post_comments')
        .insert({ post_id: post.id, author_id: currentUserId, content: trimmed })
        .select('id, post_id, author_id, content, created_at')
        .single();

      if (insertError) throw insertError;

      // Step 2: fetch the full comment row with author profile
      const { data: full, error: fetchError } = await supabase
        .from('bulletin_post_comments')
        .select(`*, author:profiles(display_name, avatar_url)`)
        .eq('id', inserted.id)
        .single();

      // Use full data if available, otherwise fall back to the inserted row
      const newComment = full ?? inserted;
      const enrichedComment = {
        ...newComment,
        likeCount: 0,
        hasLiked: false
      };

      setComments(prev => [...prev, enrichedComment]);
      setCommentCount(prev => prev + 1);
      setCommentText('');
    } catch (err) {
      console.error('Error posting comment:', err?.message || err);
    } finally {
      setCommentLoading(false);
    }
  };

  // ── Update comment ───────────────────────────────────────────────────────
  const handleUpdateComment = async (commentId) => {
    const trimmed = editCommentText.trim();
    if (!trimmed || updateLoading || trimmed.length > 1000) return;
    setUpdateLoading(true);

    try {
      const { data, error } = await supabase
        .from('bulletin_post_comments')
        .update({ content: trimmed })
        .eq('id', commentId)
        .select(`*, author:profiles(display_name, avatar_url)`)
        .single();

      if (error) throw error;

      setComments(prev => prev.map(c => c.id === commentId ? { ...c, ...data } : c));
      setEditingCommentId(null);
      setEditCommentText('');
    } catch (err) {
      console.error('Error updating comment:', err?.message || err);
    } finally {
      setUpdateLoading(false);
    }
  };

  const startEditingComment = (comment) => {
    setEditingCommentId(comment.id);
    setEditCommentText(comment.content);
  };

  // ── Delete comment ───────────────────────────────────────────────────────
  const handleDeleteComment = async (commentId) => {
    try {
      const { error } = await supabase
        .from('bulletin_post_comments')
        .delete()
        .eq('id', commentId);
      if (error) throw error;

      setComments(prev => prev.filter(c => c.id !== commentId));
      setCommentCount(prev => prev - 1);
    } catch (err) {
      console.error('Error deleting comment:', err);
    }
  };

  // ── Toggle comment like ───────────────────────────────────────────────────
  const handleToggleCommentLike = async (commentId, currentlyLiked) => {
    if (!currentUserId) return;
    
    // Optimistic update
    setComments(prev => prev.map(c => {
      if (c.id === commentId) {
        return {
          ...c,
          hasLiked: !currentlyLiked,
          likeCount: currentlyLiked ? c.likeCount - 1 : c.likeCount + 1
        };
      }
      return c;
    }));

    try {
      if (currentlyLiked) {
        const { error } = await supabase
          .from('bulletin_comment_likes')
          .delete()
          .eq('comment_id', commentId)
          .eq('user_id', currentUserId);
        if (error) throw error;
      } else {
        const { error } = await supabase
          .from('bulletin_comment_likes')
          .insert({ comment_id: commentId, user_id: currentUserId });
        if (error) throw error;
      }
    } catch (err) {
      console.error('Error toggling comment like:', err);
      // Roll back optimistic update
      setComments(prev => prev.map(c => {
        if (c.id === commentId) {
          return {
            ...c,
            hasLiked: currentlyLiked,
            likeCount: currentlyLiked ? c.likeCount + 1 : c.likeCount - 1
          };
        }
        return c;
      }));
    }
  };

  // ── Helpers ──────────────────────────────────────────────────────────────
  const formatRelativeTime = (dateStr) => {
    const diff = Date.now() - new Date(dateStr).getTime();
    const mins  = Math.floor(diff / 60000);
    const hours = Math.floor(diff / 3600000);
    const days  = Math.floor(diff / 86400000);
    if (mins  < 1)  return 'just now';
    if (mins  < 60) return `${mins}m ago`;
    if (hours < 24) return `${hours}h ago`;
    if (days  < 7)  return `${days}d ago`;
    return new Date(dateStr).toLocaleDateString();
  };

  // ── Render ───────────────────────────────────────────────────────────────
  return (
    <div className="post-actions-wrapper">
      {/* ── Action bar ── */}
      <div className="post-actions-bar">
        {/* Like button */}
        <button
          className={`post-action-btn${hasLiked ? ' liked' : ''}`}
          onClick={handleToggleLike}
          disabled={likeLoading || !currentUserId}
          aria-label={hasLiked ? 'Unlike this post' : 'Like this post'}
          aria-pressed={hasLiked}
        >
          <HeartIcon filled={hasLiked} size={18} />
          <span>{likeCount} {likeCount === 1 ? 'Like' : 'Likes'}</span>
        </button>

        {/* Comment toggle button */}
        <button
          className={`post-action-btn${showComments ? ' active' : ''}`}
          onClick={handleToggleComments}
          aria-label="Toggle comments"
          aria-expanded={showComments}
        >
          <CommentIcon size={18} />
          <span>{commentCount} {commentCount === 1 ? 'Comment' : 'Comments'}</span>
          <span className="action-chevron">{showComments ? '▴' : '▾'}</span>
        </button>
      </div>

      {/* ── Comment section (collapsible) ── */}
      {showComments && (
        <div className="comment-section">
          {/* Comment list */}
          {!commentsLoaded ? (
            <div className="comment-loading">Loading comments…</div>
          ) : comments.length === 0 ? (
            <div className="comment-empty">No comments yet — be the first!</div>
          ) : (
            <div className="comment-list">
              {comments.map(comment => (
                <div key={comment.id} className="comment-item">
                  {/* Avatar */}
                  <div
                    className="comment-avatar"
                    onClick={() => navigate(`/profile/${comment.author_id}`)}
                    title={comment.author?.display_name || 'Anonymous'}
                  >
                    {comment.author?.avatar_url ? (
                      <img
                        src={comment.author.avatar_url}
                        alt=""
                        style={{ width: '100%', height: '100%', objectFit: 'cover', borderRadius: '50%' }}
                      />
                    ) : (
                      <div
                        className="comment-avatar-fallback"
                        style={{
                          background: getAvatarColor(comment.author?.display_name),
                          color: '#fff',
                          display: 'flex',
                          alignItems: 'center',
                          justifyContent: 'center',
                          width: '100%',
                          height: '100%',
                          borderRadius: '50%',
                          fontWeight: 'bold',
                          fontSize: '0.8rem'
                        }}
                      >
                        {getInitials(comment.author?.display_name)}
                      </div>
                    )}
                  </div>

                  {/* Body */}
                  <div className="comment-body">
                    <div className="comment-meta">
                      <span
                        className="comment-author"
                        onClick={() => navigate(`/profile/${comment.author_id}`)}
                      >
                        {comment.author?.display_name || 'Anonymous'}
                      </span>
                      <span className="comment-time">
                        {formatRelativeTime(comment.created_at)}
                      </span>
                    </div>
                    {editingCommentId === comment.id ? (
                      <div className="comment-edit-form">
                        <textarea
                          className="comment-edit-input"
                          value={editCommentText}
                          onChange={e => setEditCommentText(e.target.value)}
                          autoFocus
                          rows={2}
                        />
                        {editCommentText.length > 1000 && (
                          <div style={{ color: 'black', fontSize: '0.8rem', marginBottom: '0.5rem', fontWeight: '600' }}>
                            Over limit by {editCommentText.length - 1000} character(s)
                          </div>
                        )}
                        <div className="comment-edit-actions">
                          <button 
                            className="comment-edit-save"
                            onClick={() => handleUpdateComment(comment.id)}
                            disabled={updateLoading || !editCommentText.trim() || editCommentText.length > 1000}
                          >
                            {updateLoading ? '…' : 'Save'}
                          </button>
                          <button 
                            className="comment-edit-cancel"
                            onClick={() => setEditingCommentId(null)}
                            disabled={updateLoading}
                          >
                            Cancel
                          </button>
                        </div>
                      </div>
                    ) : (
                      <>
                        <p className="comment-text">{comment.content}</p>
                        <div style={{ display: 'flex', alignItems: 'center', marginTop: '0.4rem' }}>
                          <button
                            className={`comment-like-btn${comment.hasLiked ? ' liked' : ''}`}
                            onClick={() => handleToggleCommentLike(comment.id, comment.hasLiked)}
                            disabled={!currentUserId}
                            aria-label={comment.hasLiked ? 'Unlike this comment' : 'Like this comment'}
                          >
                            <HeartIcon filled={comment.hasLiked} size={14} />
                            {comment.likeCount > 0 && <span className="like-count" style={{ fontSize: '0.75rem', marginLeft: '0.2rem', color: comment.hasLiked ? '#97f7e9' : 'rgba(255,255,255,0.7)' }}>{comment.likeCount}</span>}
                          </button>
                        </div>
                      </>
                    )}
                  </div>

                  {/* Actions — visible to comment author or admin */}
                  {(isCommunityAdmin || comment.author_id === currentUserId) && (
                    <div className="comment-actions">
                      {comment.author_id === currentUserId && editingCommentId !== comment.id && (
                        <button
                          className="comment-action-btn-small"
                          onClick={() => startEditingComment(comment)}
                          aria-label="Edit comment"
                          title="Edit comment"
                        >
                          ✎
                        </button>
                      )}
                      <button
                        className="comment-delete-btn"
                        onClick={() => handleDeleteComment(comment.id)}
                        aria-label="Delete comment"
                        title="Delete comment"
                      >
                        ✕
                      </button>
                    </div>
                  )}
                </div>
              ))}
            </div>
          )}

          {/* Comment input */}
          {currentUserId && (
            <form className="comment-input-row" onSubmit={handleSubmitComment} style={{ flexDirection: 'column', alignItems: 'stretch' }}>
              {commentText.length > 1000 && (
                <div style={{ color: 'black', fontSize: '0.8rem', marginBottom: '0.4rem', marginLeft: '0.5rem', fontWeight: '600' }}>
                  Over limit by {commentText.length - 1000} character(s)
                </div>
              )}
              <div style={{ display: 'flex', gap: '0.5rem' }}>
                <input
                  ref={inputRef}
                  type="text"
                  className="comment-input"
                  placeholder="Add a comment…"
                  value={commentText}
                  onChange={e => setCommentText(e.target.value)}
                  disabled={commentLoading}
                />
                <button
                  type="submit"
                  className="comment-submit-btn"
                  disabled={!commentText.trim() || commentLoading || commentText.length > 1000}
                  aria-label="Post comment"
                >
                  {commentLoading ? '…' : '➤'}
                </button>
              </div>
            </form>
          )}
        </div>
      )}
    </div>
  );
}
