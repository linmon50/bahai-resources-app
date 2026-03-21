# Supabase Live Schema & RLS Policies

*Generated at: 2026-03-07T19:59:45.720Z*

## Tables

### `communities`
- `id` (uuid) - *required* (default: gen_random_uuid())
- `name` (text) - *required* 
- `slug` (text) - *required* 
- `description` (text) - *optional* 
- `created_at` (timestamp with time zone) - *required* (default: now())
- `zip_codes` (ARRAY) - *optional* 

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

### `profiles`
- `user_id` (uuid) - *required* 
- `display_name` (text) - *required* 
- `bio` (text) - *optional* 
- `accessibility_needs` (text) - *optional* 
- `avatar_url` (text) - *optional* 
- `created_at` (timestamp with time zone) - *required* (default: now())

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

## RLS Policies

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
  (is_global_admin(auth.uid()) OR (user_id = auth.uid()) OR is_community_admin(auth.uid(), community_id))
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
  ((auth.uid() = user_id) OR is_global_admin(auth.uid()) OR (EXISTS ( SELECT 1
   FROM (memberships m1
     JOIN memberships m2 ON ((m1.community_id = m2.community_id)))
  WHERE ((m1.user_id = auth.uid()) AND (m1.approved = true) AND (m2.user_id = profiles.user_id) AND (m2.approved = true)))))
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

