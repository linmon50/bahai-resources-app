# Supabase Live Schema & RLS Policies

*Generated at: 2026-06-18T21:54:28.050Z*

## Tables

### `bulletin_comment_likes`
- `id` (uuid) - *required* (default: gen_random_uuid())
- `comment_id` (uuid) - *required* 
- `user_id` (uuid) - *required* 
- `created_at` (timestamp with time zone) - *optional* (default: now())

### `bulletin_post_comments`
- `id` (uuid) - *required* (default: gen_random_uuid())
- `post_id` (uuid) - *required* 
- `author_id` (uuid) - *required* 
- `content` (text) - *required* 
- `created_at` (timestamp with time zone) - *optional* (default: now())

### `bulletin_post_likes`
- `id` (uuid) - *required* (default: gen_random_uuid())
- `post_id` (uuid) - *required* 
- `user_id` (uuid) - *required* 
- `created_at` (timestamp with time zone) - *optional* (default: now())

### `bulletin_posts`
- `id` (uuid) - *required* (default: gen_random_uuid())
- `community_id` (uuid) - *required* 
- `author_id` (uuid) - *required* 
- `content` (text) - *required* 
- `link_url` (text) - *optional* 
- `status` (text) - *optional* (default: 'pending'::text)
- `rejection_reason` (text) - *optional* 
- `is_pinned` (boolean) - *optional* (default: false)
- `created_at` (timestamp with time zone) - *optional* (default: now())
- `image_urls` (jsonb) - *optional* (default: '[]'::jsonb)

### `communities`
- `id` (uuid) - *required* (default: gen_random_uuid())
- `name` (text) - *required* 
- `slug` (text) - *required* 
- `description` (text) - *optional* 
- `created_at` (timestamp with time zone) - *required* (default: now())
- `zip_codes` (ARRAY) - *optional* 

### `directory_view`
- `user_id` (uuid) - *optional* 
- `display_name` (text) - *optional* 
- `avatar_url` (text) - *optional* 
- `is_private` (boolean) - *optional* 
- `bio` (text) - *optional* 
- `phone` (text) - *optional* 
- `contact_email` (text) - *optional* 
- `contact_preferences` (text) - *optional* 
- `show_bio` (boolean) - *optional* 
- `show_contact_info` (boolean) - *optional* 
- `show_skills` (boolean) - *optional* 
- `show_experiences` (boolean) - *optional* 
- `experience_roles` (jsonb) - *optional* 
- `talents_and_abilities` (jsonb) - *optional* 
- `materials` (jsonb) - *optional* 
- `memberships` (jsonb) - *optional* 

### `events`
- `id` (uuid) - *required* (default: gen_random_uuid())
- `community_id` (uuid) - *required* 
- `created_by` (uuid) - *required* 
- `title` (text) - *required* 
- `description` (text) - *optional* 
- `start_time` (timestamp with time zone) - *required* 
- `end_time` (timestamp with time zone) - *optional* 
- `location` (text) - *optional* 
- `created_at` (timestamp with time zone) - *optional* (default: now())

### `global_admins`
- `user_id` (uuid) - *required* 

### `invite_requests`
- `id` (uuid) - *required* (default: gen_random_uuid())
- `email` (text) - *required* 
- `zip_code` (text) - *required* 
- `message` (text) - *optional* 
- `community_id` (uuid) - *optional* 
- `status` (text) - *optional* (default: 'pending'::text)
- `created_at` (timestamp with time zone) - *optional* (default: now())

### `invites`
- `id` (uuid) - *required* (default: gen_random_uuid())
- `code` (text) - *required* 
- `community_id` (uuid) - *required* 
- `role` (text) - *required* 
- `admin_level` (integer) - *required* (default: 0)
- `used_at` (timestamp with time zone) - *optional* 
- `used_by` (uuid) - *optional* 
- `expires_at` (timestamp with time zone) - *optional* 
- `created_by` (uuid) - *optional* 
- `active` (boolean) - *optional* (default: true)
- `created_at` (timestamp with time zone) - *optional* (default: now())
- `email` (text) - *required* 

### `memberships`
- `id` (uuid) - *required* (default: gen_random_uuid())
- `user_id` (uuid) - *required* 
- `community_id` (uuid) - *required* 
- `role` (text) - *required* 
- `approved` (boolean) - *required* (default: false)
- `joined_at` (timestamp with time zone) - *required* (default: now())
- `admin_level` (smallint) - *required* (default: 0)
- `email` (text) - *optional* 

### `notifications`
- `id` (uuid) - *required* (default: gen_random_uuid())
- `user_id` (uuid) - *optional* 
- `actor_id` (uuid) - *optional* 
- `type` (text) - *required* 
- `reference_id` (uuid) - *optional* 
- `is_read` (boolean) - *optional* (default: false)
- `created_at` (timestamp with time zone) - *optional* (default: now())
- `metadata` (jsonb) - *optional* (default: '{}'::jsonb)

### `planning_sessions`
- `id` (uuid) - *required* (default: gen_random_uuid())
- `community_id` (uuid) - *required* 
- `title` (text) - *required* 
- `description` (text) - *optional* 
- `status` (text) - *required* (default: 'active'::text)
- `starts_at` (timestamp with time zone) - *optional* 
- `ends_at` (timestamp with time zone) - *optional* 
- `is_hidden` (boolean) - *required* (default: false)
- `notes` (text) - *optional* 
- `links` (jsonb) - *required* (default: '[]'::jsonb)
- `created_by` (uuid) - *required* 
- `created_at` (timestamp with time zone) - *required* (default: now())
- `archived_at` (timestamp with time zone) - *optional* 

### `profile_experiences`
- `id` (uuid) - *required* (default: gen_random_uuid())
- `user_id` (uuid) - *required* 
- `title` (text) - *required* 
- `description` (text) - *optional* 
- `related_event_id` (uuid) - *optional* 
- `start_date` (date) - *optional* 
- `end_date` (date) - *optional* 
- `is_visible` (boolean) - *optional* (default: true)
- `created_at` (timestamp with time zone) - *optional* (default: now())

### `profiles`
- `user_id` (uuid) - *required* 
- `display_name` (text) - *required* 
- `bio` (text) - *optional* 
- `avatar_url` (text) - *optional* 
- `created_at` (timestamp with time zone) - *required* (default: now())
- `contact_email` (text) - *optional* 
- `phone` (text) - *optional* 
- `contact_preferences` (text) - *optional* 
- `show_contact_info` (boolean) - *optional* (default: true)
- `show_bio` (boolean) - *optional* (default: true)
- `show_skills` (boolean) - *optional* (default: true)
- `show_experiences` (boolean) - *optional* (default: true)
- `experience_roles` (jsonb) - *optional* (default: '[]'::jsonb)
- `talents_and_abilities` (jsonb) - *optional* (default: '[]'::jsonb)
- `materials` (jsonb) - *optional* (default: '[]'::jsonb)
- `is_private` (boolean) - *optional* (default: false)

### `resources`
- `id` (uuid) - *required* (default: gen_random_uuid())
- `community_id` (uuid) - *required* 
- `created_by` (uuid) - *required* 
- `title` (text) - *required* 
- `description` (text) - *optional* 
- `resource_type` (text) - *required* 
- `status` (text) - *required* (default: 'active'::text)
- `created_at` (timestamp with time zone) - *required* (default: now())
- `updated_at` (timestamp with time zone) - *required* (default: now())
- `resource_category` (text) - *required* (default: 'human'::text)

### `session_access`
- `id` (uuid) - *required* (default: gen_random_uuid())
- `session_id` (uuid) - *required* 
- `user_id` (uuid) - *required* 
- `role` (text) - *required* (default: 'viewer'::text)
- `granted_by` (uuid) - *optional* 
- `granted_at` (timestamp with time zone) - *required* (default: now())

### `session_tasks`
- `id` (uuid) - *required* (default: gen_random_uuid())
- `session_id` (uuid) - *required* 
- `parent_task_id` (uuid) - *optional* 
- `title` (text) - *required* 
- `description` (text) - *optional* 
- `assigned_to` (uuid) - *optional* 
- `assigned_to_name` (text) - *optional* 
- `status` (text) - *required* (default: 'not_started'::text)
- `due_date` (date) - *optional* 
- `sort_order` (integer) - *required* (default: 0)
- `created_at` (timestamp with time zone) - *required* (default: now())

## RLS Policies

### Table: `bulletin_comment_likes` | Policy: "Members can like comments"
- **Command:** `INSERT`
- **Roles:** `{public}`
- **WITH CHECK expression:**
  ```sql
  ((user_id = auth.uid()) AND (is_global_admin(auth.uid()) OR (EXISTS ( SELECT 1
   FROM ((bulletin_post_comments c
     JOIN bulletin_posts bp ON ((bp.id = c.post_id)))
     JOIN memberships m ON ((m.community_id = bp.community_id)))
  WHERE ((c.id = bulletin_comment_likes.comment_id) AND (m.user_id = auth.uid()) AND (m.approved = true))))))
  ```

### Table: `bulletin_comment_likes` | Policy: "Members can view comment likes"
- **Command:** `SELECT`
- **Roles:** `{public}`
- **USING expression:**
  ```sql
  (is_global_admin(auth.uid()) OR (EXISTS ( SELECT 1
   FROM ((bulletin_post_comments c
     JOIN bulletin_posts bp ON ((bp.id = c.post_id)))
     JOIN memberships m ON ((m.community_id = bp.community_id)))
  WHERE ((c.id = bulletin_comment_likes.comment_id) AND (m.user_id = auth.uid()) AND (m.approved = true)))))
  ```

### Table: `bulletin_comment_likes` | Policy: "Users can remove their own comment likes"
- **Command:** `DELETE`
- **Roles:** `{public}`
- **USING expression:**
  ```sql
  (user_id = auth.uid())
  ```

### Table: `bulletin_post_comments` | Policy: "Authors and admins can delete comments"
- **Command:** `DELETE`
- **Roles:** `{public}`
- **USING expression:**
  ```sql
  ((author_id = auth.uid()) OR is_global_admin(auth.uid()) OR (EXISTS ( SELECT 1
   FROM (bulletin_posts bp
     JOIN memberships m ON (((m.community_id = bp.community_id) AND (m.user_id = auth.uid()) AND (m.approved = true) AND (m.role = 'admin'::text))))
  WHERE (bp.id = bulletin_post_comments.post_id))))
  ```

### Table: `bulletin_post_comments` | Policy: "Authors can update their own comments"
- **Command:** `UPDATE`
- **Roles:** `{public}`
- **USING expression:**
  ```sql
  ((auth.uid() = author_id) OR is_global_admin(auth.uid()))
  ```
- **WITH CHECK expression:**
  ```sql
  ((auth.uid() = author_id) OR is_global_admin(auth.uid()))
  ```

### Table: `bulletin_post_comments` | Policy: "Members can add comments"
- **Command:** `INSERT`
- **Roles:** `{public}`
- **WITH CHECK expression:**
  ```sql
  ((author_id = auth.uid()) AND (is_global_admin(auth.uid()) OR (EXISTS ( SELECT 1
   FROM (bulletin_posts bp
     JOIN memberships m ON ((m.community_id = bp.community_id)))
  WHERE ((bp.id = bulletin_post_comments.post_id) AND (m.user_id = auth.uid()) AND (m.approved = true))))))
  ```

### Table: `bulletin_post_comments` | Policy: "Members can view comments"
- **Command:** `SELECT`
- **Roles:** `{public}`
- **USING expression:**
  ```sql
  (is_global_admin(auth.uid()) OR ((auth.uid() IS NOT NULL) AND (EXISTS ( SELECT 1
   FROM (bulletin_posts bp
     JOIN memberships m ON ((m.community_id = bp.community_id)))
  WHERE ((bp.id = bulletin_post_comments.post_id) AND (m.user_id = auth.uid()) AND (m.approved = true))))))
  ```

### Table: `bulletin_post_likes` | Policy: "Members can like posts"
- **Command:** `INSERT`
- **Roles:** `{public}`
- **WITH CHECK expression:**
  ```sql
  ((user_id = auth.uid()) AND (is_global_admin(auth.uid()) OR (EXISTS ( SELECT 1
   FROM (bulletin_posts bp
     JOIN memberships m ON ((m.community_id = bp.community_id)))
  WHERE ((bp.id = bulletin_post_likes.post_id) AND (m.user_id = auth.uid()) AND (m.approved = true))))))
  ```

### Table: `bulletin_post_likes` | Policy: "Members can view likes"
- **Command:** `SELECT`
- **Roles:** `{public}`
- **USING expression:**
  ```sql
  (is_global_admin(auth.uid()) OR ((auth.uid() IS NOT NULL) AND (EXISTS ( SELECT 1
   FROM (bulletin_posts bp
     JOIN memberships m ON ((m.community_id = bp.community_id)))
  WHERE ((bp.id = bulletin_post_likes.post_id) AND (m.user_id = auth.uid()) AND (m.approved = true))))))
  ```

### Table: `bulletin_post_likes` | Policy: "Users can remove their own likes"
- **Command:** `DELETE`
- **Roles:** `{public}`
- **USING expression:**
  ```sql
  (user_id = auth.uid())
  ```

### Table: `bulletin_posts` | Policy: "Admins can update posts"
- **Command:** `UPDATE`
- **Roles:** `{public}`
- **USING expression:**
  ```sql
  (is_global_admin(auth.uid()) OR is_community_admin(auth.uid(), community_id))
  ```

### Table: `bulletin_posts` | Policy: "Authors and Admins can delete posts"
- **Command:** `DELETE`
- **Roles:** `{public}`
- **USING expression:**
  ```sql
  ((author_id = auth.uid()) OR is_global_admin(auth.uid()) OR is_community_admin(auth.uid(), community_id))
  ```

### Table: `bulletin_posts` | Policy: "Authors can update their own posts"
- **Command:** `UPDATE`
- **Roles:** `{public}`
- **USING expression:**
  ```sql
  ((auth.uid() = author_id) OR is_global_admin(auth.uid()))
  ```
- **WITH CHECK expression:**
  ```sql
  ((auth.uid() = author_id) OR is_global_admin(auth.uid()))
  ```

### Table: `bulletin_posts` | Policy: "Users can create posts in their communities"
- **Command:** `INSERT`
- **Roles:** `{public}`
- **WITH CHECK expression:**
  ```sql
  ((author_id = auth.uid()) AND (is_global_admin(auth.uid()) OR (EXISTS ( SELECT 1
   FROM memberships m
  WHERE ((m.user_id = auth.uid()) AND (m.community_id = bulletin_posts.community_id) AND (m.approved = true) AND ((m.role = 'admin'::text) OR (bulletin_posts.status = 'pending'::text)))))))
  ```

### Table: `bulletin_posts` | Policy: "Users can view approved posts and their own posts"
- **Command:** `SELECT`
- **Roles:** `{public}`
- **USING expression:**
  ```sql
  (is_global_admin(auth.uid()) OR (author_id = auth.uid()) OR is_community_admin(auth.uid(), community_id) OR ((status = 'approved'::text) AND (EXISTS ( SELECT 1
   FROM memberships m
  WHERE ((m.user_id = auth.uid()) AND (m.community_id = bulletin_posts.community_id) AND (m.approved = true))))))
  ```

### Table: `communities` | Policy: "Admins can update their communities"
- **Command:** `UPDATE`
- **Roles:** `{public}`
- **USING expression:**
  ```sql
  (is_global_admin(auth.uid()) OR is_community_admin(auth.uid(), id))
  ```

### Table: `communities` | Policy: "Global admins can create communities"
- **Command:** `INSERT`
- **Roles:** `{public}`
- **WITH CHECK expression:**
  ```sql
  is_global_admin(auth.uid())
  ```

### Table: `communities` | Policy: "Global admins can delete communities"
- **Command:** `DELETE`
- **Roles:** `{public}`
- **USING expression:**
  ```sql
  is_global_admin(auth.uid())
  ```

### Table: `communities` | Policy: "Members can view their communities"
- **Command:** `SELECT`
- **Roles:** `{public}`
- **USING expression:**
  ```sql
  (is_global_admin(auth.uid()) OR (EXISTS ( SELECT 1
   FROM memberships m
  WHERE ((m.community_id = communities.id) AND (m.user_id = auth.uid()) AND (m.approved = true)))))
  ```

### Table: `communities` | Policy: "Public can view basic community info"
- **Command:** `SELECT`
- **Roles:** `{public}`
- **USING expression:**
  ```sql
  true
  ```

### Table: `events` | Policy: "Community members can create events"
- **Command:** `INSERT`
- **Roles:** `{public}`
- **WITH CHECK expression:**
  ```sql
  (community_id IN ( SELECT memberships.community_id
   FROM memberships
  WHERE ((memberships.user_id = auth.uid()) AND memberships.approved)))
  ```

### Table: `events` | Policy: "Event owners or admins can delete"
- **Command:** `DELETE`
- **Roles:** `{public}`
- **USING expression:**
  ```sql
  ((created_by = auth.uid()) OR is_community_admin(auth.uid(), community_id))
  ```

### Table: `events` | Policy: "Event owners or admins can update"
- **Command:** `UPDATE`
- **Roles:** `{public}`
- **USING expression:**
  ```sql
  ((created_by = auth.uid()) OR is_community_admin(auth.uid(), community_id))
  ```

### Table: `events` | Policy: "Users can view events (member or global admin)"
- **Command:** `SELECT`
- **Roles:** `{public}`
- **USING expression:**
  ```sql
  (is_global_admin(auth.uid()) OR (community_id IN ( SELECT memberships.community_id
   FROM memberships
  WHERE ((memberships.user_id = auth.uid()) AND memberships.approved))))
  ```

### Table: `global_admins` | Policy: "No direct access to global_admins"
- **Command:** `ALL`
- **Roles:** `{public}`
- **USING expression:**
  ```sql
  false
  ```
- **WITH CHECK expression:**
  ```sql
  false
  ```

### Table: `invite_requests` | Policy: "Anyone can insert invite requests"
- **Command:** `INSERT`
- **Roles:** `{public}`
- **WITH CHECK expression:**
  ```sql
  true
  ```

### Table: `invite_requests` | Policy: "Only relevant admins can view/manage requests"
- **Command:** `ALL`
- **Roles:** `{public}`
- **USING expression:**
  ```sql
  (is_global_admin(auth.uid()) OR is_community_admin(auth.uid(), community_id))
  ```

### Table: `invites` | Policy: "Admins can insert invites"
- **Command:** `INSERT`
- **Roles:** `{public}`
- **WITH CHECK expression:**
  ```sql
  (is_global_admin(auth.uid()) OR (EXISTS ( SELECT 1
   FROM memberships m
  WHERE ((m.user_id = auth.uid()) AND (m.community_id = invites.community_id) AND (m.admin_level > 0)))))
  ```

### Table: `invites` | Policy: "Admins can manage invites"
- **Command:** `ALL`
- **Roles:** `{public}`
- **USING expression:**
  ```sql
  (is_global_admin(auth.uid()) OR (EXISTS ( SELECT 1
   FROM memberships m
  WHERE ((m.user_id = auth.uid()) AND (m.community_id = invites.community_id) AND (m.admin_level > 0)))))
  ```

### Table: `invites` | Policy: "RPC can consume invite"
- **Command:** `UPDATE`
- **Roles:** `{authenticated}`
- **USING expression:**
  ```sql
  false
  ```
- **WITH CHECK expression:**
  ```sql
  false
  ```

### Table: `memberships` | Policy: "Admins update memberships"
- **Command:** `UPDATE`
- **Roles:** `{public}`
- **USING expression:**
  ```sql
  is_community_admin(auth.uid(), community_id)
  ```

### Table: `memberships` | Policy: "Users can insert own membership"
- **Command:** `INSERT`
- **Roles:** `{public}`
- **WITH CHECK expression:**
  ```sql
  (user_id = auth.uid())
  ```

### Table: `memberships` | Policy: "View memberships"
- **Command:** `SELECT`
- **Roles:** `{public}`
- **USING expression:**
  ```sql
  (is_global_admin(auth.uid()) OR (user_id = auth.uid()) OR is_approved_member_of_community(auth.uid(), community_id))
  ```

### Table: `notifications` | Policy: "System can insert notifications"
- **Command:** `INSERT`
- **Roles:** `{public}`
- **WITH CHECK expression:**
  ```sql
  true
  ```

### Table: `notifications` | Policy: "Users can delete their own notifications"
- **Command:** `DELETE`
- **Roles:** `{public}`
- **USING expression:**
  ```sql
  (auth.uid() = user_id)
  ```

### Table: `notifications` | Policy: "Users can update their own notifications"
- **Command:** `UPDATE`
- **Roles:** `{public}`
- **USING expression:**
  ```sql
  (auth.uid() = user_id)
  ```

### Table: `notifications` | Policy: "Users can view their own notifications"
- **Command:** `SELECT`
- **Roles:** `{public}`
- **USING expression:**
  ```sql
  (auth.uid() = user_id)
  ```

### Table: `planning_sessions` | Policy: "Creator or admin can delete session"
- **Command:** `DELETE`
- **Roles:** `{public}`
- **USING expression:**
  ```sql
  ((created_by = auth.uid()) OR is_community_admin(auth.uid(), community_id) OR is_global_admin(auth.uid()))
  ```

### Table: `planning_sessions` | Policy: "Editors can update session"
- **Command:** `UPDATE`
- **Roles:** `{public}`
- **USING expression:**
  ```sql
  ((created_by = auth.uid()) OR is_community_admin(auth.uid(), community_id) OR is_global_admin(auth.uid()) OR (EXISTS ( SELECT 1
   FROM session_access sa
  WHERE ((sa.session_id = sa.id) AND (sa.user_id = auth.uid()) AND (sa.role = 'editor'::text)))))
  ```

### Table: `planning_sessions` | Policy: "Members can create sessions"
- **Command:** `INSERT`
- **Roles:** `{public}`
- **WITH CHECK expression:**
  ```sql
  (is_global_admin(auth.uid()) OR ((community_id IN ( SELECT memberships.community_id
   FROM memberships
  WHERE ((memberships.user_id = auth.uid()) AND (memberships.approved = true)))) AND (created_by = auth.uid())))
  ```

### Table: `planning_sessions` | Policy: "Members can view sessions"
- **Command:** `SELECT`
- **Roles:** `{public}`
- **USING expression:**
  ```sql
  (is_global_admin(auth.uid()) OR ((community_id IN ( SELECT memberships.community_id
   FROM memberships
  WHERE ((memberships.user_id = auth.uid()) AND (memberships.approved = true)))) AND ((is_hidden = false) OR (created_by = auth.uid()) OR is_community_admin(auth.uid(), community_id) OR user_has_session_access(id, auth.uid()))))
  ```

### Table: `profile_experiences` | Policy: "Users can manage their own experiences"
- **Command:** `ALL`
- **Roles:** `{public}`
- **USING expression:**
  ```sql
  (auth.uid() = user_id)
  ```
- **WITH CHECK expression:**
  ```sql
  (auth.uid() = user_id)
  ```

### Table: `profile_experiences` | Policy: "Users can view community experiences"
- **Command:** `SELECT`
- **Roles:** `{public}`
- **USING expression:**
  ```sql
  ((auth.uid() = user_id) OR is_global_admin(auth.uid()) OR ((is_visible = true) AND (EXISTS ( SELECT 1
   FROM (memberships m1
     JOIN memberships m2 ON ((m1.community_id = m2.community_id)))
  WHERE ((m1.user_id = auth.uid()) AND (m1.approved = true) AND (m2.user_id = profile_experiences.user_id) AND (m2.approved = true))))))
  ```

### Table: `profiles` | Policy: "Users can create their own profile"
- **Command:** `INSERT`
- **Roles:** `{public}`
- **WITH CHECK expression:**
  ```sql
  (auth.uid() = user_id)
  ```

### Table: `profiles` | Policy: "Users can update own profile (self only)"
- **Command:** `UPDATE`
- **Roles:** `{public}`
- **USING expression:**
  ```sql
  (user_id = auth.uid())
  ```

### Table: `profiles` | Policy: "View profiles"
- **Command:** `SELECT`
- **Roles:** `{public}`
- **USING expression:**
  ```sql
  ((auth.uid() = user_id) OR is_global_admin(auth.uid()) OR is_admin_of_user(auth.uid(), user_id) OR ((is_private = false) AND (EXISTS ( SELECT 1
   FROM memberships m1
  WHERE ((m1.user_id = auth.uid()) AND (m1.approved = true) AND is_approved_member_of_community(profiles.user_id, m1.community_id))))))
  ```

### Table: `resources` | Policy: "Admins can delete resources in their community"
- **Command:** `DELETE`
- **Roles:** `{public}`
- **USING expression:**
  ```sql
  (EXISTS ( SELECT 1
   FROM memberships m
  WHERE ((m.user_id = auth.uid()) AND (m.community_id = resources.community_id) AND (m.approved = true) AND (m.admin_level >= 1))))
  ```

### Table: `resources` | Policy: "Members can create resources in their community"
- **Command:** `INSERT`
- **Roles:** `{public}`
- **WITH CHECK expression:**
  ```sql
  (EXISTS ( SELECT 1
   FROM memberships m
  WHERE ((m.user_id = auth.uid()) AND (m.community_id = resources.community_id) AND (m.approved = true))))
  ```

### Table: `resources` | Policy: "Members can view resources in their community"
- **Command:** `SELECT`
- **Roles:** `{public}`
- **USING expression:**
  ```sql
  (EXISTS ( SELECT 1
   FROM memberships m
  WHERE ((m.user_id = auth.uid()) AND (m.community_id = resources.community_id) AND (m.approved = true))))
  ```

### Table: `resources` | Policy: "Update resources"
- **Command:** `UPDATE`
- **Roles:** `{public}`
- **USING expression:**
  ```sql
  ((created_by = auth.uid()) OR (EXISTS ( SELECT 1
   FROM memberships m
  WHERE ((m.user_id = auth.uid()) AND (m.community_id = resources.community_id) AND (m.approved = true) AND (m.admin_level >= 1)))))
  ```
- **WITH CHECK expression:**
  ```sql
  ((created_by = auth.uid()) OR (EXISTS ( SELECT 1
   FROM memberships m
  WHERE ((m.user_id = auth.uid()) AND (m.community_id = resources.community_id) AND (m.approved = true) AND (m.admin_level >= 1)))))
  ```

### Table: `session_access` | Policy: "Creator or admin can manage access"
- **Command:** `ALL`
- **Roles:** `{public}`
- **USING expression:**
  ```sql
  user_can_manage_session(session_id, auth.uid())
  ```
- **WITH CHECK expression:**
  ```sql
  user_can_manage_session(session_id, auth.uid())
  ```

### Table: `session_access` | Policy: "Creator or admin can view access list"
- **Command:** `SELECT`
- **Roles:** `{public}`
- **USING expression:**
  ```sql
  ((user_id = auth.uid()) OR user_can_manage_session(session_id, auth.uid()))
  ```

### Table: `session_access` | Policy: "Enable read access for all authenticated users"
- **Command:** `SELECT`
- **Roles:** `{authenticated}`
- **USING expression:**
  ```sql
  true
  ```

### Table: `session_tasks` | Policy: "Editors can manage tasks"
- **Command:** `ALL`
- **Roles:** `{public}`
- **USING expression:**
  ```sql
  user_can_edit_session(session_id, auth.uid())
  ```
- **WITH CHECK expression:**
  ```sql
  user_can_edit_session(session_id, auth.uid())
  ```

### Table: `session_tasks` | Policy: "Session members can view tasks"
- **Command:** `SELECT`
- **Roles:** `{public}`
- **USING expression:**
  ```sql
  user_can_view_session(session_id, auth.uid())
  ```

### Table: `session_tasks` | Policy: "Users can update tasks assigned to them"
- **Command:** `UPDATE`
- **Roles:** `{authenticated}`
- **USING expression:**
  ```sql
  ((assigned_to = auth.uid()) AND user_can_view_session(session_id, auth.uid()))
  ```
- **WITH CHECK expression:**
  ```sql
  ((assigned_to = auth.uid()) AND user_can_view_session(session_id, auth.uid()))
  ```

