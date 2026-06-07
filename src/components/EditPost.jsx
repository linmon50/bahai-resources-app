import React, { useState, useRef, useEffect } from 'react';
import supabase from '../supabaseClient';
import { compressImage } from '../utils/imageUtils';

export default function EditPost({ post, session, onSave, onCancel, isAdmin }) {
  const [content, setContent] = useState(post.content || '');
  const [linkUrl, setLinkUrl] = useState(post.link_url || '');
  
  // existingImages: array of strings (URLs)
  // newImages: array of { file, previewUrl }
  const [existingImages, setExistingImages] = useState(post.image_urls || []);
  const [newImages, setNewImages] = useState([]);
  
  const [saving, setSaving] = useState(false);
  const [msg, setMsg] = useState(null);
  const fileInputRef = useRef(null);

  const handleFileChange = async (e) => {
    const files = Array.from(e.target.files);
    if (!files.length) return;

    if (existingImages.length + newImages.length + files.length > 8) {
      alert('You can only have a maximum of 8 pictures per post.');
      return;
    }

    setSaving(true);
    setMsg({ text: 'Compressing images...', type: 'info' });

    try {
      const processed = await Promise.all(
        files.map(async (file) => {
          const compressed = await compressImage(file);
          return {
            file: compressed,
            previewUrl: URL.createObjectURL(compressed)
          };
        })
      );
      setNewImages(prev => [...prev, ...processed]);
      setMsg(null);
    } catch (err) {
      setMsg({ text: 'Error processing images: ' + err.message, type: 'error' });
    } finally {
      setSaving(false);
      if (fileInputRef.current) fileInputRef.current.value = '';
    }
  };

  const removeExistingImage = (idx) => {
    setExistingImages(prev => prev.filter((_, i) => i !== idx));
  };

  const removeNewImage = (idx) => {
    setNewImages(prev => {
      const updated = [...prev];
      URL.revokeObjectURL(updated[idx].previewUrl);
      updated.splice(idx, 1);
      return updated;
    });
  };

  const handleSubmit = async (e) => {
    e.preventDefault();
    if (!content.trim() && existingImages.length === 0 && newImages.length === 0) {
      setMsg({ text: 'Please add some text or an image.', type: 'error' });
      return;
    }
    if (content.length > 10000) {
      setMsg({ text: 'Post content is too long.', type: 'error' });
      return;
    }

    setSaving(true);
    setMsg({ text: 'Saving changes...', type: 'info' });

    try {
      const updatedImageUrls = [...existingImages];
      
      // Upload new images
      for (const imgObj of newImages) {
        const fileExt = imgObj.file.name.split('.').pop();
        const fileName = `${session.user.id}-${Math.random()}.${fileExt}`;
        const filePath = `${post.community_id}/${fileName}`;

        const { error: uploadError } = await supabase.storage
          .from('bulletin_images')
          .upload(filePath, imgObj.file);

        if (uploadError) throw uploadError;

        const { data: publicUrlData } = supabase.storage
          .from('bulletin_images')
          .getPublicUrl(filePath);

        updatedImageUrls.push(publicUrlData.publicUrl);
      }

      // Determine new status
      let newStatus = post.status;
      if (post.status === 'rejected') {
        newStatus = 'pending';
      }

      const { data, error } = await supabase
        .from('bulletin_posts')
        .update({
          content,
          link_url: linkUrl,
          image_urls: updatedImageUrls,
          status: newStatus,
          rejection_reason: newStatus === 'pending' ? null : post.rejection_reason
        })
        .eq('id', post.id)
        .select()
        .single();

      if (error) throw error;

      // Clean up previews
      newImages.forEach(img => URL.revokeObjectURL(img.previewUrl));
      
      if (onSave) onSave(data);
    } catch (err) {
      setMsg({ text: err.message, type: 'error' });
    } finally {
      setSaving(false);
    }
  };

  return (
    <div className="edit-post-form" style={{ 
      background: 'rgba(255, 255, 255, 0.05)', 
      borderRadius: '12px', 
      padding: '1.5rem',
      border: '1px solid rgba(255,255,255,0.1)',
      marginTop: '1rem'
    }}>
      <h4 style={{ margin: '0 0 1rem 0', color: 'var(--auth-text-light-blue)' }}>Edit Post</h4>
      
      <form onSubmit={handleSubmit}>
        {content.length > 10000 && (
          <div style={{ color: 'black', fontSize: '0.9rem', marginBottom: '0.5rem', fontWeight: 'bold' }}>
            Post content is over limit by {content.length - 10000} character(s)
          </div>
        )}
        <textarea 
          className="admin-input"
          value={content}
          onChange={(e) => setContent(e.target.value)}
          rows={4}
          style={{ 
            width: '100%', 
            marginBottom: '1rem', 
            padding: '0.8rem',
            border: content.length > 10000 ? '2px solid #ef4444' : undefined
          }}
          placeholder="What's on your mind?"
        />

        {/* Image Management */}
        <div style={{ marginBottom: '1rem' }}>
          <label style={{ display: 'block', marginBottom: '0.5rem', fontSize: '0.85rem', opacity: 0.8 }}>Images (Max 8 total)</label>
          <div style={{ display: 'flex', gap: '0.6rem', flexWrap: 'wrap' }}>
            {/* Existing */}
            {existingImages.map((url, idx) => (
              <div key={`existing-${idx}`} style={{ position: 'relative' }}>
                <img src={url} alt="" style={{ width: '80px', height: '80px', objectFit: 'cover', borderRadius: '8px', border: '1px solid rgba(255,255,255,0.1)' }} />
                <button 
                  type="button" 
                  onClick={() => removeExistingImage(idx)}
                  className="edit-img-remove"
                >✕</button>
              </div>
            ))}
            {/* New */}
            {newImages.map((img, idx) => (
              <div key={`new-${idx}`} style={{ position: 'relative' }}>
                <img src={img.previewUrl} alt="" style={{ width: '80px', height: '80px', objectFit: 'cover', borderRadius: '8px', border: '2px solid var(--auth-text-light-blue)' }} />
                <button 
                  type="button" 
                  onClick={() => removeNewImage(idx)}
                  className="edit-img-remove"
                >✕</button>
                <div style={{ position: 'absolute', bottom: 2, left: 2, background: 'var(--auth-text-light-blue)', color: 'black', fontSize: '8px', padding: '1px 3px', borderRadius: '2px', fontWeight: 'bold' }}>NEW</div>
              </div>
            ))}
            
            {existingImages.length + newImages.length < 8 && (
              <label 
                tabIndex="0"
                onKeyDown={(e) => {
                  if (e.key === 'Enter' || e.key === ' ') {
                    e.preventDefault();
                    fileInputRef.current?.click();
                  }
                }}
                style={{ 
                  width: '80px', 
                  height: '80px', 
                  border: '2px dashed rgba(255,255,255,0.2)', 
                  borderRadius: '8px', 
                  display: 'flex', 
                  alignItems: 'center', 
                  justifyContent: 'center', 
                  cursor: 'pointer',
                  fontSize: '1.5rem',
                  color: 'rgba(255,255,255,0.3)'
                }}
              >
                +
                <input 
                  type="file" 
                  multiple 
                  accept="image/*" 
                  ref={fileInputRef}
                  onChange={handleFileChange} 
                  style={{ display: 'none' }} 
                />
              </label>
            )}
          </div>
        </div>

        <div style={{ marginBottom: '1.5rem' }}>
          <label style={{ display: 'block', marginBottom: '0.4rem', fontSize: '0.85rem', opacity: 0.8 }}>Link (Optional)</label>
          <input 
            className="admin-input"
            type="url"
            value={linkUrl}
            onChange={(e) => setLinkUrl(e.target.value)}
            style={{ width: '100%', padding: '0.6rem' }}
            placeholder="https://..."
          />
        </div>

        <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
          <div>
            {msg && <span style={{ fontSize: '0.85rem', color: msg.type === 'error' ? '#ef4444' : '#97f7e9' }}>{msg.text}</span>}
          </div>
          <div style={{ display: 'flex', gap: '0.8rem' }}>
            <button type="submit" disabled={saving || content.length > 10000} className="admin-pill-btn" style={{ margin: 0, padding: '0.5rem 1.2rem' }}>
              {saving ? 'Saving...' : (post.status === 'rejected' ? 'Update & Resubmit' : 'Save Changes')}
            </button>
            <button type="button" onClick={onCancel} className="admin-pill-btn secondary" style={{ margin: 0, padding: '0.5rem 1rem' }}>Cancel</button>
          </div>
        </div>
      </form>
    </div>
  );
}
