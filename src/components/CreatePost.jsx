import React, { useState, useRef } from 'react';
import supabase from '../supabaseClient';
import { compressImage } from '../utils/imageUtils';

export default function CreatePost({ session, communityId, onPostCreated, isAdmin }) {
  const [content, setContent] = useState('');
  const [linkUrl, setLinkUrl] = useState('');
  const [images, setImages] = useState([]); // Array of { file, previewUrl }
  const [uploading, setUploading] = useState(false);
  const [msg, setMsg] = useState(null);
  const fileInputRef = useRef(null);

  const handleFileChange = async (e) => {
    const files = Array.from(e.target.files);
    if (!files.length) return;

    if (images.length + files.length > 8) {
      alert('You can only upload a maximum of 8 pictures per post.');
      return;
    }

    setUploading(true);
    setMsg({ text: 'Compressing images...', type: 'info' });

    try {
      const newImages = await Promise.all(
        files.map(async (file) => {
          const compressed = await compressImage(file);
          return {
            file: compressed,
            previewUrl: URL.createObjectURL(compressed)
          };
        })
      );
      setImages(prev => [...prev, ...newImages]);
      setMsg(null);
    } catch (err) {
      setMsg({ text: 'Error processing images: ' + err.message, type: 'error' });
    } finally {
      setUploading(false);
      if (fileInputRef.current) fileInputRef.current.value = '';
    }
  };

  const removeImage = (index) => {
    setImages(prev => {
      const updated = [...prev];
      URL.revokeObjectURL(updated[index].previewUrl);
      updated.splice(index, 1);
      return updated;
    });
  };

  const handleSubmit = async (e) => {
    e.preventDefault();
    if (!content.trim() && images.length === 0) {
      setMsg({ text: 'Please add some text or an image.', type: 'error' });
      return;
    }

    setUploading(true);
    setMsg({ text: 'Uploading your post...', type: 'info' });

    try {
      const imageUrls = [];
      
      // Upload all images
      for (const imgObj of images) {
        const fileExt = imgObj.file.name.split('.').pop();
        const fileName = `${session.user.id}-${Math.random()}.${fileExt}`;
        const filePath = `${communityId}/${fileName}`;

        const { error: uploadError } = await supabase.storage
          .from('bulletin_images')
          .upload(filePath, imgObj.file);

        if (uploadError) throw uploadError;

        const { data: publicUrlData } = supabase.storage
          .from('bulletin_images')
          .getPublicUrl(filePath);

        imageUrls.push(publicUrlData.publicUrl);
      }

      const { error } = await supabase
        .from('bulletin_posts')
        .insert({
          community_id: communityId,
          author_id: session.user.id,
          content,
          image_urls: imageUrls,
          link_url: linkUrl,
          status: isAdmin ? 'approved' : 'pending'
        });

      if (error) throw error;

      // Reset
      setContent('');
      setLinkUrl('');
      images.forEach(img => URL.revokeObjectURL(img.previewUrl));
      setImages([]);
      setMsg({ 
        text: isAdmin ? 'Post published!' : 'Post submitted for review! An admin will check it soon.', 
        type: 'success' 
      });
      if (onPostCreated) onPostCreated();
      
      // Clear success message after 5 seconds
      setTimeout(() => setMsg(null), 5000);
    } catch (err) {
      setMsg({ text: err.message, type: 'error' });
    } finally {
      setUploading(false);
    }
  };

  return (
    <div className="glass-panel" style={{ 
      padding: '2rem', 
      marginBottom: '3rem',
      position: 'relative'
    }}>
      {/* Guidelines Header */}
      <div style={{ 
        marginBottom: '1.5rem', 
        padding: '1rem', 
        background: 'var(--dark-panel-bg)', 
        borderRadius: '8px', 
        border: '1px solid rgba(151, 247, 233, 0.2)' 
      }}>
        <div style={{ display: 'flex', alignItems: 'center', gap: '0.6rem', marginBottom: '0.4rem' }}>
          <p style={{ margin: 0, fontSize: '0.95rem', color: '#97f7e9', fontWeight: 'bold' }}>Community Spirit & Guidelines</p>
        </div>
        <p style={{ margin: 0, fontSize: '0.88rem', color: '#ffffff', lineHeight: '1.4' }}>
          This is a space for service, community news, and uplifting moments. 
          Please refrain from personal grievances or partisan topics. All posts are reviewed by admins.
          <span style={{ display: 'block', marginTop: '0.5rem', color: '#97f7e9', fontWeight: '600' }}>
            Note: Posts older than 3 months are automatically deleted to manage data costs.
          </span>
        </p>
      </div>

      <form onSubmit={handleSubmit}>
        <textarea 
          className="admin-input"
          placeholder="Share something with the community..."
          value={content}
          onChange={(e) => setContent(e.target.value)}
          rows={3}
          style={{ 
            width: '100%', 
            marginBottom: '1rem', 
            resize: 'none', 
            fontSize: '1.1rem',
            padding: '1rem'
          }}
        />

        {/* Image Preview Tray */}
        {images.length > 0 && (
          <div style={{ 
            display: 'flex', 
            gap: '0.8rem', 
            overflowX: 'auto', 
            paddingTop: '12px',
            paddingBottom: '1rem', 
            marginBottom: '1rem',
            scrollbarWidth: 'thin'
          }}>
            {images.map((img, idx) => (
              <div key={idx} style={{ position: 'relative', flexShrink: 0 }}>
                <img 
                  src={img.previewUrl} 
                  alt="Preview" 
                  style={{ width: '100px', height: '100px', objectFit: 'cover', borderRadius: '10px', border: '2px solid rgba(151, 247, 233, 0.3)' }} 
                />
                <button 
                  type="button"
                  onClick={() => removeImage(idx)}
                  style={{
                    position: 'absolute',
                    top: '-8px',
                    right: '-8px',
                    background: '#ef4444',
                    color: 'white',
                    border: 'none',
                    borderRadius: '50%',
                    width: '22px',
                    height: '22px',
                    cursor: 'pointer',
                    fontSize: '12px',
                    display: 'flex',
                    alignItems: 'center',
                    justifyContent: 'center',
                    boxShadow: '0 2px 4px rgba(0,0,0,0.3)'
                  }}
                >
                  ✕
                </button>
              </div>
            ))}
          </div>
        )}

        <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: '1.5rem', marginBottom: '1.5rem' }}>
          <div style={{ position: 'relative' }}>
            <label style={{ display: 'block', marginBottom: '0.4rem', fontSize: '0.85rem', color: '#ffffff', fontWeight: '600' }}>
              Share Pictures
            </label>
            <input 
              type="file" 
              multiple
              accept="image/*" 
              ref={fileInputRef}
              onChange={handleFileChange}
              style={{ display: 'none' }}
              id="multi-image-input"
            />
            <label 
              htmlFor="multi-image-input"
              className="admin-input-btn"
              tabIndex="0"
              onKeyDown={(e) => {
                if (e.key === 'Enter' || e.key === ' ') {
                  e.preventDefault();
                  fileInputRef.current?.click();
                }
              }}
              style={{ margin: 0 }}
            >
              Select Photos (Max 8)
            </label>
          </div>
          <div>
            <label style={{ display: 'block', marginBottom: '0.4rem', fontSize: '0.85rem', color: '#ffffff', fontWeight: '600' }}>
              Add Link
            </label>
            <input 
              className="admin-input"
              type="url" 
              placeholder="https://community-event.com"
              value={linkUrl}
              onChange={(e) => setLinkUrl(e.target.value)}
              style={{ width: '100%', padding: '0.6rem' }}
            />
          </div>
        </div>

        <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', gap: '1rem', borderTop: '1px solid rgba(255,255,255,0.05)', paddingTop: '1rem' }}>
          <div style={{ flex: 1 }}>
            {msg && (
              <span style={{ 
                fontSize: '0.9rem', 
                color: msg.type === 'error' ? '#ef4444' : (msg.type === 'info' ? '#97f7e9' : '#55c46f'),
                fontWeight: '500'
              }}>
                {msg.text}
              </span>
            )}
          </div>
          <button 
            type="submit" 
            className="admin-pill-btn blue" 
            disabled={uploading}
            style={{ 
              margin: 0, 
              padding: '0.8rem 1.5rem', 
              fontSize: '1rem',
              boxShadow: '0 4px 12px rgba(50, 150, 255, 0.2)'
            }}
          >
            {uploading ? 'Processing...' : (isAdmin ? 'Share with Community' : 'Submit for Review')}
          </button>
        </div>
      </form>
    </div>
  );
}
