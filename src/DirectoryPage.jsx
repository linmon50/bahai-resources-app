import React, { useState, useEffect } from 'react';
import { useNavigate } from 'react-router-dom';
import supabase from './supabaseClient';
import { useCommunity } from './context/CommunityContext';
import { getAvatarColor, getInitials } from './utils/avatarUtils';

export default function DirectoryPage({ session }) {
  const navigate = useNavigate();
  const [loading, setLoading] = useState(true);
  const [profiles, setProfiles] = useState([]);
  const [searchTerm, setSearchTerm] = useState('');
  const { activeCommunityId, communityDetails } = useCommunity();

  useEffect(() => {
    if (activeCommunityId) {
      setLoading(true);
      fetchDirectory();
    } else {
      setProfiles([]);
      setLoading(false);
    }
  }, [activeCommunityId]);

  const fetchDirectory = async () => {
    try {
      // 1. Get approved memberships for the active community
      const { data: memberRows, error: memberErr } = await supabase
        .from('memberships')
        .select('user_id')
        .eq('community_id', activeCommunityId)
        .eq('approved', true);

      if (memberErr) throw memberErr;
      const userIds = memberRows.map(m => m.user_id);

      if (userIds.length === 0) {
        setProfiles([]);
        return;
      }

      // 2. Fetch profiles from directory_view for those user IDs
      const { data, error } = await supabase
        .from('directory_view')
        .select('*')
        .in('user_id', userIds);

      if (error) throw error;
      setProfiles(data || []);
    } catch (err) {
      console.error("Error fetching directory:", err);
    } finally {
      setLoading(false);
    }
  };

  const filteredProfiles = profiles.filter(p => {
    if (!searchTerm) return true;
    
    const s = searchTerm.toLowerCase();

    // Always search display name
    if (p.display_name?.toLowerCase().includes(s)) return true;

    // Contact info (only if visible)
    if (p.show_contact_info) {
      if (p.contact_email?.toLowerCase().includes(s)) return true;
      if (p.phone?.toLowerCase().includes(s)) return true;
    }

    // Skills & Resources (only if visible)
    if (p.show_skills) {
      const searchJSON = (arr) => {
        if (!arr || !Array.isArray(arr)) return false;
        return arr.some(item => 
          (item.name || item.role || item.talent || item.material || '').toLowerCase().includes(s) || 
          (item.details || '').toLowerCase().includes(s)
        );
      };

      if (searchJSON(p.experience_roles)) return true;
      if (searchJSON(p.talents_and_abilities)) return true;
      if (searchJSON(p.materials)) return true;
    }

    // Experiences (only if visible)
    if (p.show_experiences) {
      // NOTE: We aren't fetching the profile_experiences table for every user here 
      // as it would require a complex join or multiple fetches, 
      // but the JSONB 'experience_roles' are searched above.
    }

    return false;
  });

  return (
    <div style={{ maxWidth: '1000px', margin: '2rem auto', padding: '0 1rem', color: 'white' }}>
      <div style={{ marginBottom: '2rem', textAlign: 'center' }}>
        <h2 style={{ fontFamily: "'Fredoka', sans-serif", fontSize: '2.5rem', marginBottom: '1rem', color: 'var(--auth-text-light-blue)' }}>
          {communityDetails?.name ? `${communityDetails.name} Directory` : 'Community Directory'}
        </h2>
        <p style={{ color: 'white' }}>Search for members by name, contact info, skills, or available resources.</p>
      </div>

      <div style={{ marginBottom: '3rem', display: 'flex', justifyContent: 'center' }}>
        <input 
          type="text" 
          className="directory-search-input"
          placeholder="Search members (e.g. 'Jane', 'Piano', 'Ruhi book 1')..."
          value={searchTerm}
          onChange={e => setSearchTerm(e.target.value)}
          style={{ 
            width: '100%', 
            maxWidth: '600px', 
            padding: '1rem 1.5rem', 
            borderRadius: '9999px', 
            background: 'rgba(255, 255, 255, 0.1)', 
            color: 'white', 
            fontSize: '1.1rem',
            outline: 'none'
          }}
        />
      </div>

      {loading ? (
        <div style={{ textAlign: 'center', padding: '2rem' }}>Loading directory...</div>
      ) : (
        <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fill, minmax(300px, 1fr))', gap: '1.5rem' }}>
          {filteredProfiles.length > 0 ? (
            filteredProfiles.map(p => {
              
 

              return (
                <div 
                  key={p.user_id} 
                  className="directory-card"
                  role="button"
                  tabIndex="0"
                  onClick={() => navigate(`/profile/${p.user_id}`)}
                  onKeyDown={(e) => {
                    if (e.key === 'Enter' || e.key === ' ') {
                      e.preventDefault();
                      navigate(`/profile/${p.user_id}`);
                    }
                  }}
                >
                  <div style={{ width: '80px', height: '80px', borderRadius: '50%', overflow: 'hidden', border: '2px solid var(--auth-text-light-blue)', marginBottom: '1rem' }}>
                    {p.avatar_url ? (
                      <img src={p.avatar_url} alt={p.display_name} style={{ width: '100%', height: '100%', objectFit: 'cover' }} />
                    ) : (
                      <div style={{
                        width: '100%',
                        height: '100%',
                        display: 'flex',
                        alignItems: 'center',
                        justifyContent: 'center',
                        background: getAvatarColor(p.display_name),
                        color: '#fff',
                        fontWeight: 'bold',
                        fontSize: '1.5rem',
                        borderRadius: '50%'
                      }}>
                        {getInitials(p.display_name)}
                      </div>
                    )}
                  </div>
                  <h3 style={{ margin: '0 0 0.5rem 0', color: 'white' }}>{p.display_name}</h3>
                  
                  {p.memberships?.length > 0 && (
                     <div style={{ display: 'flex', flexWrap: 'wrap', gap: '0.4rem', justifyContent: 'center', marginBottom: '0.8rem' }}>
                       {[...p.memberships]
                         .sort((a, b) => (a.communities?.name || "").localeCompare(b.communities?.name || ""))
                         .map((cm, idx) => cm.communities?.name && (
                           <span key={idx} style={{ background: 'rgba(255,255,255,0.15)', color: 'white', padding: '2px 8px', borderRadius: '4px', fontSize: '0.75rem', fontWeight: 'bold' }}>
                             {cm.communities.name}
                           </span>
                         ))}
                     </div>
                  )}
                  
                  {p.show_contact_info && (p.contact_email || p.phone) && (
                     <div style={{ color: 'var(--auth-text-light-blue)', fontSize: '0.85rem', marginBottom: '0.5rem' }}>
                       {p.phone && <div>{p.phone}</div>}
                       {p.contact_email && <div>{p.contact_email}</div>}
                     </div>
                  )}

 
                </div>
              );
            })
          ) : (
            <div style={{ gridColumn: '1 / -1', textAlign: 'center', padding: '3rem', color: 'white' }}>
              No members found matching your search.
            </div>
          )}
        </div>
      )}
    </div>
  );
}
