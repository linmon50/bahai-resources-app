import React, { useState, useEffect } from 'react';
import supabase from './supabaseClient';
import { useNavigate } from 'react-router-dom';

const EXPERIENCE_ROLES = [
  "Devotional host", "Children's class teacher", "Junior youth animator",
  "Ruhi book 1 tutor", "Ruhi book 2 tutor", "Ruhi book 3 tutor", "Ruhi book 4 tutor",
  "Ruhi book 5 tutor", "Ruhi book 6 tutor", "Ruhi book 7 tutor", "Ruhi book 8 tutor",
  "Ruhi book 9 tutor", "Ruhi book 10 tutor", "Ruhi book 11 tutor", "Ruhi book 12 tutor",
  "Local spiritual assembly member", "Huqúqu'lláh representative", "Councellor",
  "Auxiliary board member", "Auxiliary board member assistant", "Statisics officer",
  "Area teaching committee", "Task forces and special committees", "Other"
];

const TALENTS = [
  "Musical instrument", "Singing", "Dancing", "Acting", "Directing", "Art",
  "Cooking/ Food prep", "Photography", "Videography", "Graphic design",
  "Copy/ printing", "Audio/ visual equipment", "Speaking", "Other"
];

const MATERIALS = [
  "Art supplies", "Hospitality supplies", "Cooking supplies", "Decorations",
  "Furniture", "Baha'i books", "Unused Ruhi books", "Pamphlets and teaching materials",
  "Space for events", "Space for out of town visitors", "Audio/ visual equipment", "Other"
];

function CheckboxGroupWithDetails({ title, options, values, onChange }) {
  // values is an array of objects: { name: string, details: string }
  
  const handleCheck = (optionName, checked) => {
    if (checked) {
      onChange([...values, { name: optionName, details: '' }]);
    } else {
      onChange(values.filter(v => v.name !== optionName));
    }
  };

  const handleDetailsChange = (optionName, newDetails) => {
    onChange(values.map(v => v.name === optionName ? { ...v, details: newDetails } : v));
  };

  return (
    <div style={{ marginBottom: '2rem' }}>
      <h4 style={{ color: 'var(--auth-text-light-blue)', marginBottom: '1rem', borderBottom: '1px solid rgba(255,255,255,0.1)', paddingBottom: '0.5rem' }}>{title}</h4>
      <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fill, minmax(300px, 1fr))', gap: '1rem' }}>
        {options.map(opt => {
          const selectedItem = values.find(v => v.name === opt);
          const isChecked = !!selectedItem;

          return (
            <div key={opt} style={{ background: 'rgba(255,255,255,0.05)', padding: '1rem', borderRadius: '8px', border: '1px solid rgba(255,255,255,0.1)' }}>
              <label style={{ display: 'flex', alignItems: 'center', gap: '0.5rem', cursor: 'pointer', fontWeight: isChecked ? 'bold' : 'normal', color: isChecked ? '#fff' : 'white' }}>
                <input 
                  type="checkbox" 
                  checked={isChecked} 
                  onChange={(e) => handleCheck(opt, e.target.checked)} 
                  style={{ width: '1.2rem', height: '1.2rem', cursor: 'pointer' }}
                />
                {opt}
              </label>
              {isChecked && (
                <div style={{ marginTop: '0.75rem' }}>
                  <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '0.2rem' }}>
                    <span style={{ fontSize: '0.75rem', opacity: 0.8 }}>Details</span>
                    {selectedItem.details.length > 1500 && (
                      <span style={{ color: 'black', fontSize: '0.7rem', fontWeight: 'bold' }}>
                        Over limit by {selectedItem.details.length - 1500} character(s)
                      </span>
                    )}
                  </div>
                  <input
                    type="text"
                    placeholder="Details (optional)"
                    value={selectedItem.details}
                    onChange={(e) => handleDetailsChange(opt, e.target.value)}
                    style={{
                      width: '100%',
                      padding: '0.5rem',
                      borderRadius: '4px',
                      border: selectedItem.details.length > 1500 ? '1px solid #ef4444' : '1px solid rgba(151, 247, 233, 0.3)',
                      background: 'rgba(0,0,0,0.2)',
                      color: '#fff',
                      fontSize: '0.9rem'
                    }}
                  />
                </div>
              )}
            </div>
          );
        })}
      </div>
    </div>
  );
}

export default function EditProfilePage({ session }) {
  const navigate = useNavigate();
  const [loading, setLoading] = useState(true);
  const [saving, setSaving] = useState(false);
  const [msg, setMsg] = useState({ text: '', type: '' });
  const [uploadingAvatar, setUploadingAvatar] = useState(false);
  
  const DRAFT_KEY = session?.user?.id ? `profile_edit_draft_${session.user.id}` : null;

  // Profile Form State
  const [profile, setProfile] = useState({
    display_name: '',
    bio: '',
    avatar_url: '',
    phone: '',
    contact_email: '',
    contact_preferences: '',
    show_contact_info: true,
    show_bio: true,
    show_skills: true,
    show_experiences: true,
    experience_roles: [],
    talents_and_abilities: [],
    materials: [],
    is_private: false
  });

  useEffect(() => {
    fetchProfile();
  }, [session]);

  const fetchProfile = async () => {
    if (!session?.user?.id) return;
    try {
      const { data, error } = await supabase
        .from('profiles')
        .select('*')
        .eq('user_id', session.user.id)
        .single();
        
      if (error && error.code !== 'PGRST116') {
        throw error;
      }

      if (data) {
        const dbProfile = {
          display_name: data.display_name || '',
          bio: data.bio || '',
          avatar_url: data.avatar_url || '',
          phone: data.phone || '',
          contact_email: data.contact_email || '',
          contact_preferences: data.contact_preferences || '',
          show_contact_info: data.show_contact_info ?? true,
          show_bio: data.show_bio ?? true,
          show_skills: data.show_skills ?? true,
          show_experiences: data.show_experiences ?? true,
          experience_roles: data.experience_roles || [],
          talents_and_abilities: data.talents_and_abilities || [],
          materials: data.materials || [],
          is_private: data.is_private || false
        };

        // Check for local draft
        if (DRAFT_KEY) {
          const savedDraft = localStorage.getItem(DRAFT_KEY);
          if (savedDraft) {
            try {
              const draft = JSON.parse(savedDraft);
              // Merge draft into DB profile (prefer draft for user-provided fields)
              setProfile({ ...dbProfile, ...draft });
            } catch (e) {
              setProfile(dbProfile);
            }
          } else {
            setProfile(dbProfile);
          }
        } else {
          setProfile(dbProfile);
        }
      }
    } catch (err) {
      console.error("Error fetching profile", err);
      setMsg({ text: 'Failed to load profile.', type: 'error' });
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    if (DRAFT_KEY && !loading) {
      localStorage.setItem(DRAFT_KEY, JSON.stringify(profile));
    }
  }, [profile, DRAFT_KEY, loading]);

  const handleChange = (e) => {
    const { name, value, type, checked } = e.target;
    if (name === 'phone') {
      const digits = value.replace(/\D/g, '');
      let formatted = digits;
      if (digits.length > 0) {
        if (digits.length <= 3) formatted = `(${digits}`;
        else if (digits.length <= 6) formatted = `(${digits.slice(0, 3)}) ${digits.slice(3)}`;
        else formatted = `(${digits.slice(0, 3)}) ${digits.slice(3, 6)}-${digits.slice(6, 10)}`;
      }
      setProfile(prev => ({ ...prev, phone: formatted }));
      return;
    }
    setProfile(prev => ({
      ...prev,
      [name]: type === 'checkbox' ? checked : value
    }));
  };

  const handleJSONChange = (field, newArray) => {
    setProfile(prev => ({ ...prev, [field]: newArray }));
  };

  const handleAvatarUpload = async (e) => {
    try {
      setUploadingAvatar(true);
      setMsg({ text: '', type: '' });
      
      const file = e.target.files[0];
      if (!file) return;

      const fileExt = file.name.split('.').pop();
      const fileName = `${session.user.id}-${Math.random()}.${fileExt}`;
      const filePath = `${session.user.id}/${fileName}`;

      const { error: uploadError } = await supabase.storage
        .from('avatars')
        .upload(filePath, file);

      if (uploadError) throw uploadError;

      const { data: publicUrlData } = supabase.storage
        .from('avatars')
        .getPublicUrl(filePath);

      const avatarUrl = publicUrlData.publicUrl;

      // Immediately update profiles DB record
      const { error: updateError } = await supabase
        .from('profiles')
        .update({ avatar_url: avatarUrl })
        .eq('user_id', session.user.id);

      if (updateError) throw updateError;
      
      setProfile(prev => ({ ...prev, avatar_url: avatarUrl }));
      setMsg({ text: 'Profile picture updated successfully!', type: 'success' });
    } catch (err) {
      setMsg({ text: 'Error uploading image: ' + err.message, type: 'error' });
    } finally {
      setUploadingAvatar(false);
    }
  };

  const handleSubmit = async (e) => {
    if (e && e.preventDefault) e.preventDefault();
    
    if (profile.phone) {
      const digits = profile.phone.replace(/\D/g, '');
      if (digits.length > 0 && digits.length !== 10) {
        setMsg({ text: 'Please enter a valid 10-digit phone number, or leave it blank.', type: 'error' });
        window.scrollTo({ top: 0, behavior: 'smooth' });
        return;
      }
    }

    // New Character Limit Validations
    const isOverLimit = 
      profile.display_name.length > 100 ||
      profile.bio.length > 10000 ||
      profile.contact_preferences.length > 500 ||
      profile.experience_roles.some(r => r.details.length > 1500) ||
      profile.talents_and_abilities.some(t => t.details.length > 1500) ||
      profile.materials.some(m => m.details.length > 1500);

    if (isOverLimit) {
      setMsg({ text: 'Please fix the fields that are over their character limits.', type: 'error' });
      window.scrollTo({ top: 0, behavior: 'smooth' });
      return;
    }

    setSaving(true);
    setMsg({ text: '', type: '' });

    try {
      const { error } = await supabase
        .from('profiles')
        .upsert({
          user_id: session.user.id,
          ...profile
        }, { onConflict: 'user_id' });

      if (error) throw error;
      
      if (DRAFT_KEY) {
        localStorage.removeItem(DRAFT_KEY);
      }

      // Notify other components (like ProfileDropdown) that the profile has updated
      window.dispatchEvent(new CustomEvent('profileUpdated', { detail: profile }));

      setMsg({ text: 'Profile saved successfully!', type: 'success' });
      
      // Optionally navigate to view profile page
      setTimeout(() => navigate('/profile'), 1500);
      
    } catch (err) {
      setMsg({ text: 'Error saving profile: ' + err.message, type: 'error' });
    } finally {
      setSaving(false);
    }
  };

  if (loading) return <div style={{ padding: '2rem', textAlign: 'center' }}>Loading profile...</div>;

  return (
    <div style={{ maxWidth: '900px', width: '100%', boxSizing: 'border-box', margin: '2rem auto', padding: '0 1.5rem', color: 'white' }}>
      
      <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '2rem', flexWrap: 'wrap', gap: '1rem' }}>
        <h2 className="admin-title" style={{ margin: '0 0 1rem 0' }}>Edit Your Profile</h2>
        <div style={{ display: 'flex', gap: '1rem', flexWrap: 'wrap' }}>
          <button 
            type="button"
            onClick={handleSubmit}
            disabled={saving}
            className="admin-pill-btn"
            style={{ margin: 0, background: '#47b260', border: 'none', color: '#fff' }}
          >
            {saving ? 'Saving...' : 'Save Profile Changes'}
          </button>
          <button 
            type="button"
            onClick={() => navigate('/profile')} 
            className="admin-pill-btn danger"
            style={{ margin: 0 }}
          >
            Cancel
          </button>
        </div>
      </div>

      {msg.text && (
        <div style={{ 
          padding: '1rem', 
          marginBottom: '2rem', 
          borderRadius: '8px', 
          backgroundColor: msg.type === 'error' ? 'var(--error-bg)' : 'var(--success-bg)',
          border: '1px solid ' + (msg.type === 'error' ? 'var(--error-border)' : 'var(--success-border)')
        }}>
          {msg.text}
        </div>
      )}

      <form onSubmit={handleSubmit} style={{ 
        background: 'rgba(255, 255, 255, 0.1)', 
        backdropFilter: 'blur(18px)', 
        padding: '2rem', 
        borderRadius: '16px', 
        border: '1px solid rgba(151, 247, 233, 0.3)' 
      }}>
        
        {/* AVATAR SECTION */}
        <div style={{ display: 'flex', alignItems: 'center', gap: '2rem', marginBottom: '3rem' }}>
          <div style={{ width: '120px', height: '120px', borderRadius: '50%', overflow: 'hidden', background: '#333', border: '3px solid var(--auth-text-light-blue)', flexShrink: 0 }}>
            {profile.avatar_url ? (
              <img src={profile.avatar_url} alt="Profile" style={{ width: '100%', height: '100%', objectFit: 'cover' }} />
            ) : (
              <div style={{ width: '100%', height: '100%', display: 'flex', alignItems: 'center', justifyContent: 'center', color: '#ffffff' }}>No Image</div>
            )}
          </div>
          <div>
            <h3 style={{ margin: '0 0 0.5rem 0' }}>Profile Picture</h3>
            <label 
              className="admin-pill-btn blue" 
              role="button"
              tabIndex="0"
              onKeyDown={(e) => {
                if (e.key === 'Enter' || e.key === ' ') {
                  e.preventDefault();
                  document.getElementById('avatar-upload').click();
                }
              }}
              style={{ 
                cursor: uploadingAvatar ? 'wait' : 'pointer',
                marginTop: 0
              }}
            >
              {uploadingAvatar ? 'Uploading...' : 'Upload New Picture'}
              <input id="avatar-upload" type="file" accept="image/*" onChange={handleAvatarUpload} disabled={uploadingAvatar} style={{ display: 'none' }} />
            </label>
          </div>
        </div>

        {/* BASIC INFO */}
        <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'end', borderBottom: '1px solid rgba(255,255,255,0.2)', paddingBottom: '0.5rem', marginBottom: '1.5rem', color: 'var(--auth-text-light-blue)' }}>
          <h3 style={{ margin: 0 }}>Basic Information</h3>
          <label style={{ display: 'flex', alignItems: 'center', gap: '0.5rem', cursor: 'pointer', fontSize: '0.9rem', color: 'white' }}>
            <input type="checkbox" name="is_private" checked={profile.is_private} onChange={handleChange} />
            Keep my profile private (hide from directory)
          </label>
        </div>
        <div className="edit-profile-grid" style={{ marginBottom: '1.5rem' }}>
          <div style={{ display: 'flex', flexDirection: 'column' }}>
            <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '0.5rem' }}>
              <label style={{ fontWeight: 'bold' }}>Display Name</label>
              {profile.display_name.length > 100 && (
                <span style={{ color: 'black', fontSize: '0.85rem', fontWeight: 'bold' }}>
                  Over limit by {profile.display_name.length - 100} character(s)
                </span>
              )}
            </div>
            <input 
              name="display_name" 
              value={profile.display_name} 
              onChange={handleChange} 
              required 
              className="admin-input" 
              style={{ border: profile.display_name.length > 100 ? '1px solid #ef4444' : undefined }}
            />
          </div>
        </div>

        <div style={{ display: 'flex', flexDirection: 'column', gap: '0.5rem', marginBottom: '1.5rem' }}>
           <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
             <div style={{ display: 'flex', gap: '1rem', alignItems: 'center' }}>
               <label style={{ fontWeight: 'bold' }}>About Me (Bio)</label>
               {profile.bio.length > 10000 && (
                 <span style={{ color: 'black', fontSize: '0.85rem', fontWeight: 'bold' }}>
                   Over limit by {profile.bio.length - 10000} character(s)
                 </span>
               )}
             </div>
             <label style={{ display: 'flex', alignItems: 'center', gap: '0.5rem', cursor: 'pointer', fontSize: '0.9rem' }}>
               <input type="checkbox" name="show_bio" checked={profile.show_bio} onChange={handleChange} />
               Visible to Community
             </label>
           </div>
           <textarea 
             name="bio" 
             value={profile.bio} 
             onChange={handleChange} 
             className="admin-input" 
             rows={4} 
             style={{ 
               resize: 'vertical', 
               fontFamily: 'inherit',
               border: profile.bio.length > 10000 ? '1px solid #ef4444' : undefined
             }} 
           />
        </div>

        {/* CONTACT INFO */}
        <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'end', borderBottom: '1px solid rgba(255,255,255,0.2)', paddingBottom: '0.5rem', marginBottom: '1.5rem', marginTop: '3rem' }}>
           <h3 style={{ margin: 0, color: 'var(--auth-text-light-blue)' }}>Contact Information</h3>
           <label style={{ display: 'flex', alignItems: 'center', gap: '0.5rem', cursor: 'pointer', fontSize: '0.9rem' }}>
             <input type="checkbox" name="show_contact_info" checked={profile.show_contact_info} onChange={handleChange} />
             Visible to Community
           </label>
        </div>
        
        <div className="edit-profile-grid" style={{ marginBottom: '1.5rem' }}>
          <div style={{ display: 'flex', flexDirection: 'column' }}>
            <label style={{ marginBottom: '0.5rem', fontWeight: 'bold' }}>Contact Email (Optional)</label>
            <input name="contact_email" type="email" value={profile.contact_email} onChange={handleChange} className="admin-input" placeholder="Different from login email if desired" />
          </div>
          <div style={{ display: 'flex', flexDirection: 'column' }}>
            <label style={{ marginBottom: '0.5rem', fontWeight: 'bold' }}>Phone (Optional)</label>
            <input name="phone" type="tel" value={profile.phone} onChange={handleChange} className="admin-input" />
          </div>
          <div style={{ display: 'flex', flexDirection: 'column', gridColumn: '1 / -1' }}>
            <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '0.5rem' }}>
              <label style={{ fontWeight: 'bold' }}>Contact Preferences</label>
              {profile.contact_preferences.length > 500 && (
                <span style={{ color: 'black', fontSize: '0.85rem', fontWeight: 'bold' }}>
                  Over limit by {profile.contact_preferences.length - 500} character(s)
                </span>
              )}
            </div>
            <input 
              name="contact_preferences" 
              value={profile.contact_preferences} 
              onChange={handleChange} 
              className="admin-input" 
              placeholder="e.g. Text messages preferred, Do not call after 8PM" 
              style={{ border: profile.contact_preferences.length > 500 ? '1px solid #ef4444' : undefined }}
            />
          </div>
        </div>

        {/* SKILLS AND ROLES (JSONB) */}
        <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'end', borderBottom: '1px solid rgba(255,255,255,0.2)', paddingBottom: '0.5rem', marginBottom: '2rem', marginTop: '3rem' }}>
           <h3 style={{ margin: 0, color: 'var(--auth-text-light-blue)' }}>Directory Listings</h3>
           <label style={{ display: 'flex', alignItems: 'center', gap: '0.5rem', cursor: 'pointer', fontSize: '0.9rem' }}>
             <input type="checkbox" name="show_skills" checked={profile.show_skills} onChange={handleChange} />
             Visible to Community
           </label>
        </div>

        <p style={{ marginBottom: '2rem', color: 'white' }}>Check all that apply. Add optional details for each selection. These will act as searchable tags in the directory.</p>

        <CheckboxGroupWithDetails 
          title="Experience Roles" 
          options={EXPERIENCE_ROLES} 
          values={profile.experience_roles} 
          onChange={(newVal) => handleJSONChange('experience_roles', newVal)} 
        />
        
        <CheckboxGroupWithDetails 
          title="Talents and Abilities" 
          options={TALENTS} 
          values={profile.talents_and_abilities} 
          onChange={(newVal) => handleJSONChange('talents_and_abilities', newVal)} 
        />
        
        <CheckboxGroupWithDetails 
          title="Materials" 
          options={MATERIALS} 
          values={profile.materials} 
          onChange={(newVal) => handleJSONChange('materials', newVal)} 
        />

        {/* SUBMIT */}
        <div style={{ display: 'flex', justifyContent: 'center', gap: '1rem', marginTop: '3rem', paddingTop: '2rem', borderTop: '1px solid rgba(255,255,255,0.2)', flexWrap: 'wrap' }}>
          <button 
            type="submit" 
            disabled={saving} 
            className="admin-pill-btn"
            style={{ margin: 0, background: '#47b260', border: 'none', color: '#fff' }}
          >
            {saving ? 'Saving...' : 'Save Profile Changes'}
          </button>
          <button 
            type="button"
            onClick={() => navigate('/profile')} 
            className="admin-pill-btn danger"
            style={{ margin: 0 }}
          >
            Cancel
          </button>
        </div>


      </form>
    </div>
  );
}
