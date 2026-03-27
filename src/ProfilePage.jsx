import React, { useState, useEffect } from 'react';
import { useParams, useNavigate, Link } from 'react-router-dom';
import supabase from './supabaseClient';

export default function ProfilePage({ session }) {
  const { userId } = useParams();
  const navigate = useNavigate();
  const [loading, setLoading] = useState(true);
  const [profile, setProfile] = useState(null);
  const [experiences, setExperiences] = useState([]);
  const [msg, setMsg] = useState({ text: '', type: '' });

  // If no userId is in param, assume viewing own profile
  const targetUserId = userId || session?.user?.id;
  const isOwnProfile = targetUserId === session?.user?.id;

  useEffect(() => {
    if (!targetUserId) {
      setMsg({ text: 'No user specified.', type: 'error' });
      setLoading(false);
      return;
    }
    fetchProfileData();
  }, [targetUserId]);

  const fetchProfileData = async () => {
    setLoading(true);
    setMsg({ text: '', type: '' });
    try {
      const { data: profileData, error: profileError } = await supabase
        .from('directory_view')
        .select('*')
        .eq('user_id', targetUserId)
        .single();

      if (profileError) {
         if (profileError.code === 'PGRST116') throw new Error("Profile not found or access denied.");
         throw profileError;
      }
      setProfile(profileData);

      // Fetch experiences if visible
      if (isOwnProfile || profileData.show_experiences) {
        const { data: expData, error: expError } = await supabase
          .from('profile_experiences')
          .select('*')
          .eq('user_id', targetUserId)
          .order('created_at', { ascending: false });
        
        if (!expError && expData) {
           setExperiences(expData);
        }
      }

    } catch (err) {
      console.error(err);
      setMsg({ text: err.message, type: 'error' });
    } finally {
      setLoading(false);
    }
  };

  if (loading) return <div style={{ padding: '2rem', textAlign: 'center', color: 'white' }}>Loading profile...</div>;

  if (msg.type === 'error' || !profile) {
     return (
       <div style={{ padding: '2rem', textAlign: 'center', color: 'white' }}>
         <div style={{ background: 'var(--error-bg)', color: 'var(--error-text)', border: '1px solid var(--error-border)', padding: '1rem', borderRadius: '8px', maxWidth: '600px', margin: '0 auto' }}>
           {msg.text || "Unable to load profile."}
         </div>
         <button onClick={() => navigate('/')} style={{ marginTop: '1.5rem', background: 'transparent', border: '1px solid white', color: 'white', padding: '0.5rem 1rem', borderRadius: '8px', cursor: 'pointer' }}>Return Home</button>
       </div>
     );
  }

  const renderSectionLabel = (isVisible, labelText) => {
    if (isVisible) return null;
    if (isOwnProfile) return <span style={{ fontSize: '0.8rem', backgroundColor: 'rgba(255,255,255,0.1)', padding: '0.2rem 0.5rem', borderRadius: '4px', marginLeft: '1rem', color: 'white' }}>Hidden from public</span>;
    return null; // For others, we just hide the content entirely.
  };

  const hasDirectoryInfo = (profile.experience_roles?.length > 0) || (profile.talents_and_abilities?.length > 0) || (profile.materials?.length > 0);

  return (
    <div style={{ maxWidth: '900px', margin: '2rem auto', padding: '0 1rem', color: 'white' }}>
      
      {/* HEADER: Avatar & Name */}
      <div style={{ 
        display: 'flex', alignItems: 'center', gap: '2rem', marginBottom: '2rem', 
        background: 'rgba(255, 255, 255, 0.1)', backdropFilter: 'blur(18px)', 
        padding: '2rem', borderRadius: '16px', border: '1px solid rgba(151, 247, 233, 0.3)' 
      }}>
        <div style={{ width: '120px', height: '120px', borderRadius: '50%', overflow: 'hidden', background: '#333', border: '3px solid var(--auth-text-light-blue)', flexShrink: 0 }}>
          {profile.avatar_url ? (
            <img src={profile.avatar_url} alt={profile.display_name} style={{ width: '100%', height: '100%', objectFit: 'cover' }} />
          ) : (
            <div style={{ width: '100%', height: '100%', display: 'flex', alignItems: 'center', justifyContent: 'center', color: '#ffffff' }}>No Image</div>
          )}
        </div>
        <div style={{ flex: 1 }}>
          <h2 style={{ fontFamily: "'Fredoka', sans-serif", fontSize: '2.5rem', margin: '0 0 0.5rem 0' }}>{profile.display_name}</h2>
          {profile.memberships?.length > 0 && (
             <div style={{ display: 'flex', flexWrap: 'wrap', gap: '0.5rem', marginBottom: '1rem' }}>
               {profile.memberships.map((cm, idx) => cm.communities?.name && (
                 <span key={idx} style={{ background: 'rgba(255,255,255,0.15)', color: 'white', padding: '4px 10px', borderRadius: '6px', fontSize: '0.85rem', fontWeight: 'bold' }}>
                   {cm.communities.name}
                 </span>
               ))}
             </div>
          )}
          {isOwnProfile && (
             <button onClick={() => navigate('/profile/edit')} className="admin-pill-btn blue" style={{ marginTop: '0.5rem' }}>
               Edit Profile
             </button>
          )}
        </div>
      </div>

      <div className="profile-grid">
        
        {/* LEFT COLUMN: Bio, Contact Info */}
        <div style={{ display: 'flex', flexDirection: 'column', gap: '2rem' }}>
          
          {/* About Me */}
          {(isOwnProfile || profile.show_bio) && profile.bio && (
            <div style={{ background: 'rgba(255, 255, 255, 0.05)', padding: '1.5rem', borderRadius: '16px', border: '1px solid rgba(255, 255, 255, 0.1)' }}>
              <div style={{ display: 'flex', alignItems: 'center', marginBottom: '1rem', borderBottom: '1px solid rgba(255,255,255,0.1)', paddingBottom: '0.5rem' }}>
                <h3 style={{ margin: 0, color: 'var(--auth-text-light-blue)' }}>About Me</h3>
                {renderSectionLabel(profile.show_bio)}
              </div>
              <p style={{ whiteSpace: 'pre-wrap', margin: 0, lineHeight: '1.6', color: 'var(--text-main)' }}>{profile.bio}</p>
            </div>
          )}

          {/* Contact Info */}
          {(isOwnProfile || profile.show_contact_info) && (profile.phone || profile.contact_email || profile.contact_preferences) && (
            <div style={{ background: 'rgba(255, 255, 255, 0.05)', padding: '1.5rem', borderRadius: '16px', border: '1px solid rgba(255, 255, 255, 0.1)' }}>
              <div style={{ display: 'flex', alignItems: 'center', marginBottom: '1rem', borderBottom: '1px solid rgba(255,255,255,0.1)', paddingBottom: '0.5rem' }}>
                <h3 style={{ margin: 0, color: 'var(--auth-text-light-blue)' }}>Contact Info</h3>
                {renderSectionLabel(profile.show_contact_info)}
              </div>
              
              <ul style={{ listStyle: 'none', padding: 0, margin: 0, display: 'flex', flexDirection: 'column', gap: '1rem' }}>
                {profile.contact_email && (
                  <li>
                    <strong style={{ display: 'block', color: 'white', fontSize: '0.85rem', marginBottom: '0.2rem' }}>Email</strong>
                    <a href={`mailto:${profile.contact_email}`} style={{ color: 'var(--auth-text-light-blue)', textDecoration: 'none' }}>{profile.contact_email}</a>
                  </li>
                )}
                {profile.phone && (
                  <li>
                    <strong style={{ display: 'block', color: 'white', fontSize: '0.85rem', marginBottom: '0.2rem' }}>Phone</strong>
                    <a href={`tel:${profile.phone}`} style={{ color: 'var(--auth-text-light-blue)', textDecoration: 'none' }}>{profile.phone}</a>
                  </li>
                )}
                {profile.contact_preferences && (
                  <li>
                    <strong style={{ display: 'block', color: 'white', fontSize: '0.85rem', marginBottom: '0.2rem' }}>Preferences</strong>
                    <span style={{ color: 'var(--auth-text-light-blue)' }}>{profile.contact_preferences}</span>
                  </li>
                )}
              </ul>
            </div>
          )}

        </div>

        {/* RIGHT COLUMN: Directory Listings, Experiences */}
        <div style={{ display: 'flex', flexDirection: 'column', gap: '2rem' }}>
        
          {/* Directory Listings */}
          {(isOwnProfile || profile.show_skills) && hasDirectoryInfo && (
            <div style={{ background: 'rgba(255, 255, 255, 0.05)', padding: '1.5rem', borderRadius: '16px', border: '1px solid rgba(255, 255, 255, 0.1)' }}>
              <div style={{ display: 'flex', alignItems: 'center', marginBottom: '1.5rem', borderBottom: '1px solid rgba(255,255,255,0.1)', paddingBottom: '0.5rem' }}>
                <h3 style={{ margin: 0, color: 'var(--auth-text-light-blue)' }}>Directory Listings</h3>
                {renderSectionLabel(profile.show_skills)}
              </div>
              
              {['experience_roles', 'talents_and_abilities', 'materials'].map(category => {
                 const items = profile[category];
                 if (!items || items.length === 0) return null;
                 const titles = {
                    experience_roles: "Experience Roles",
                    talents_and_abilities: "Talents & Abilities",
                    materials: "Materials"
                 };
                 return (
                   <div key={category} style={{ marginBottom: '1.5rem' }}>
                     <h4 style={{ margin: '0 0 0.5rem 0', color: '#fff' }}>{titles[category]}</h4>
                     <ul style={{ listStyle: 'none', padding: 0, margin: 0, display: 'flex', flexDirection: 'column', gap: '0.5rem' }}>
                       {items.map((item, i) => (
                         <li key={i} style={{ background: 'rgba(0,0,0,0.2)', padding: '0.75rem 1rem', borderRadius: '8px', border: '1px solid rgba(151, 247, 233, 0.2)' }}>
                           <strong style={{ color: 'var(--auth-text-light-blue)' }}>{item.name || item.role || item.talent || item.material}</strong>
                           {item.details && <p style={{ margin: '0.25rem 0 0 0', fontSize: '0.9rem', color: 'white' }}>{item.details}</p>}
                         </li>
                       ))}
                     </ul>
                   </div>
                 );
              })}
            </div>
          )}

          {/* Projects & Events (profile_experiences) */}
          {(isOwnProfile || profile.show_experiences) && experiences.length > 0 && (
            <div style={{ background: 'rgba(255, 255, 255, 0.05)', padding: '1.5rem', borderRadius: '16px', border: '1px solid rgba(255, 255, 255, 0.1)' }}>
              <div style={{ display: 'flex', alignItems: 'center', marginBottom: '1.5rem', borderBottom: '1px solid rgba(255,255,255,0.1)', paddingBottom: '0.5rem' }}>
                <h3 style={{ margin: 0, color: 'var(--auth-text-light-blue)' }}>Projects & Events</h3>
                {renderSectionLabel(profile.show_experiences)}
              </div>
              
              <ul style={{ listStyle: 'none', padding: 0, margin: 0, display: 'flex', flexDirection: 'column', gap: '1rem' }}>
                {experiences.map((exp) => (
                   <li key={exp.id} style={{ background: 'rgba(0,0,0,0.2)', padding: '1rem', borderRadius: '8px', border: '1px solid rgba(255,255,255,0.1)' }}>
                     <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'flex-start' }}>
                       <h4 style={{ margin: '0 0 0.5rem 0', color: '#fff', fontSize: '1.1rem' }}>{exp.title}</h4>
                       {isOwnProfile && !exp.is_visible && <span style={{ fontSize: '0.75rem', color: 'var(--warning-text)', background: 'var(--warning-bg)', padding: '2px 6px', borderRadius: '4px' }}>Hidden</span>}
                     </div>
                     {exp.description && <p style={{ margin: '0 0 0.5rem 0', fontSize: '0.95rem', color: 'var(--text-main)' }}>{exp.description}</p>}
                     {(exp.start_date || exp.end_date) && (
                       <p style={{ margin: 0, fontSize: '0.85rem', color: 'white' }}>
                         {exp.start_date && new Date(exp.start_date).toLocaleDateString()} {exp.end_date && `- ${new Date(exp.end_date).toLocaleDateString()}`}
                       </p>
                     )}
                   </li>
                ))}
              </ul>
            </div>
          )}

        </div>

      </div>
    </div>
  );
}
