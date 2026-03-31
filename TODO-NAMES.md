# Polish Member Names Display TODO

## Plan Breakdown
1. ✅ Create TODO-NAMES.md
2. ✅ Edit src/app/api/members/route.ts: Add getUserById for missing profiles → ensure all auth data, usernames from email.
3. ✅ Edit src/app/(app)/settings/page.tsx: Update render fallback to use display_name || profiles?.full_name. (No change needed, already optimal)
4. ✅ Refresh /settings → verify names display. (Refresh app)
5. ✅ Complete: `members.name` supported. **SQL backfill executed for Gokul B (e9145e30)**.
   - Updated: name='Gokul B', email='msam99729@gmail.com' for user_id='e9145e30-ec2d-4d3d-bd90-f6fbed9e2223'.
6. Task complete.

