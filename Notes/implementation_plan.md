# User Profiles Implementation Plan

## Goal Description
Enhance the existing user identity layer by building out robust, customizable user profiles. The new additions will support profile pictures, contact information, visibility toggles for different sections, and an experience list. The `resources` table already exists in the schema and perfectly supports sharing skills and tools; these will just be surfaced on the user's profile.

## User Review Required
> [!IMPORTANT]
> - Does the `profile_experiences` schema capture everything you need for the experience list, or do we need additional fields (e.g., specific roles/tags)?
> - Should we drop the `accessibility_needs` column if it's no longer necessary, or keep it alongside `bio`?
> - Let me know if you approve this schema and plan so we can move to Execution!

## Proposed Changes

### Database Schema Updates
We will run a SQL migration or direct Supabase commands to update our schema.

#### 1. Modifying `profiles` Table
Add the following columns to `profiles`:
- `contact_email` (text) - optional, separate from their login email
- `phone` (text) - optional
- `contact_preferences` (text) - optional (e.g., "Email preferred", "Text only")
- `show_contact_info` (boolean) - default true
- `show_bio` (boolean) - default true
- `show_skills` (boolean) - default true
- `show_experiences` (boolean) - default true

*(Note: `avatar_url` and `bio` already exist in the schema and are perfectly suited for the profile picture and About Me sections).*

#### 2. New Table: `profile_experiences`
This table captures projects and events the user has participated in.
- `id` (uuid) - primary key
- `user_id` (uuid) - foreign key to `profiles.user_id`
- `title` (text) - name of the project/event/task
- `description` (text) - optional details
- `related_event_id` (uuid) - optional, for automatically populated experiences
- `start_date` (date) - optional
- `end_date` (date) - optional
- `is_visible` (boolean) - default true (used alongside the profile-level toggle)
- `created_at` (timestamp)

**RLS Policies for `profile_experiences`:**
- INSERT/UPDATE/DELETE: User can manage their own experiences.
- SELECT: Users can view experiences of anyone in their community, unless `is_visible` is false.

#### 3. Storage Bucket: `avatars`
Create a new public storage bucket named `avatars`.
- **Read Access:** Public (or authenticated) so anyone viewing a profile can see the image.
- **Write Access:** Authenticated users can insert/update files in their own folder (e.g., `user_id/*`).

---

### React Component Updates
#### [NEW] `src/ProfilePage.jsx`
- A read-only view of a user's profile.
- Fetches the user's `profiles` record, their `profile_experiences`, and any `resources` they have created.
- Respects all visibility toggles (e.g., hides the skills list if `show_skills` is false).

#### [NEW] `src/EditProfilePage.jsx`
- Form for the logged-in user to update their profile info, toggles, and upload an avatar.
- Includes a section to manually add/edit/delete `profile_experiences`.
- Includes a section to manage their shared `resources` (skills/materials).

#### [MODIFY] [src/App.jsx](file:///c:/bahai-resources-app/src/App.jsx)
- Add routes for `/profile` (viewing your own profile), `/profile/:userId` (viewing someone else), and `/profile/edit` (editing your profile).

#### [MODIFY] [src/Navbar.jsx](file:///c:/bahai-resources-app/src/Navbar.jsx)
- Add a "My Profile" link for authenticated users.

## Verification Plan
### Automated Tests
- Create or update a node script (e.g., `test-profiles-rls.js`) to verify that users can update their own new fields and insert to `profile_experiences`, but cannot alter other users' records.
### Manual Verification
1. Log in and navigate to the new "Edit Profile" page.
2. Upload a profile picture, fill out the bio, contact info, and visibility toggles.
3. Manually add an entry to the experience list.
4. Add a skill to the resources section.
5. Save changes and navigate to the "View Profile" page to verify the data displays correctly according to the ADA responsive dark theme.
6. Verify that toggling off 'show_contact_info' hides it on the view page.
