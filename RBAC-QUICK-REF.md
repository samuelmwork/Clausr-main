# Clausr RBAC Quick Reference

## Permission Matrix

| Action | Admin | Editor | Viewer |
|--------|-------|--------|--------|
| **Contracts** | | | |
| View all contracts | ✅ | ✅ | ✅ |
| Add new contract | ✅ | ✅ | ❌ |
| Edit contract | ✅ | ✅ | ❌ |
| Delete contract | ✅ | ❌ | ❌ |
| Mark as renewed | ✅ | ✅ | ❌ |
| Cancel contract | ✅ | ✅ | ❌ |
| Upload PDF | ✅ | ✅ | ❌ |
| **Team Management** | | | |
| View team members | ✅ | ❌ | ❌ |
| Invite members | ✅ | ❌ | ❌ |
| Remove members | ✅ | ❌ | ❌ |
| Change member role | ✅ | ❌ | ❌ |
| **Organization** | | | |
| Change org name | ✅ | ❌ | ❌ |
| Manage billing | ✅ | ❌ | ❌ |
| View activity log | ✅ | ✅ | ✅ |

## Code Snippets

### Get user role
```typescript
import { getUserRole } from '@/lib/permissions'

const role = await getUserRole(supabase, orgId)
// Returns: 'admin', 'editor', 'viewer', or null
```

### Check permission
```typescript
import { Permissions } from '@/lib/permissions'

if (Permissions.canDeleteContract(role)) {
  // Show delete button
}
```

### Protect API route
```typescript
import { getUserRole } from '@/lib/permissions'

export async function POST(req: Request) {
  const supabase = createServiceClient()
  const { data: { user } } = await supabase.auth.getUser()
  if (!user) return new Response('Unauthorized', { status: 401 })

  const role = await getUserRole(supabase, orgId)
  if (role !== 'admin') {
    return new Response('Forbidden', { status: 403 })
  }

  // ... do the thing
}
```

### Hide UI from unauthorized users
```tsx
{Permissions.canAddContract(userRole) && (
  <button onClick={addContract}>Add Contract</button>
)}

{userRole === 'admin' && (
  <section>Invite Team Members</section>
)}
```

### Log permission-based action
```typescript
await supabase.from('activity_log').insert({
  org_id: orgId,
  user_id: user.id,
  action: `Deleted contract`,
})
```

## Permission Utilities

### Direct checks
```typescript
Permissions.canViewContracts(role)
Permissions.canAddContract(role)
Permissions.canEditContract(role)
Permissions.canDeleteContract(role)
Permissions.canViewMembers(role)
Permissions.canInviteMembers(role)
Permissions.canRemoveMembers(role)
Permissions.canChangeRoles(role)
Permissions.canManageOrg(role)
Permissions.canManageBilling(role)
Permissions.canViewActivityLog(role)
```

### Role hierarchy
```typescript
import { isRoleOrHigher } from '@/lib/permissions'

isRoleOrHigher('admin', 'editor')    // true
isRoleOrHigher('editor', 'viewer')   // true
isRoleOrHigher('viewer', 'editor')   // false
```

## RLS Policies

The database enforces these rules. You cannot bypass them.

### Contracts
- **SELECT**: All org members
- **INSERT**: Editors + Admins only
- **UPDATE**: Editors + Admins only
- **DELETE**: Admins only

### Members
- **SELECT**: All org members
- **INSERT**: Admins only
- **UPDATE**: Admins only (for changing roles)
- **DELETE**: Admins only

### Organizations
- **SELECT**: Members of the org
- **UPDATE**: Admins only

### Invitations
- **INSERT**: Admins only
- **SELECT**: Admins (or anyone with the token for acceptance)
- **UPDATE**: Admins only
- **DELETE**: Admins only

## Files to Update When Adding New Features

1. **Database Schema** (`supabase/schema.sql`)
   - Add RLS policies for new tables/operations

2. **Permission Utilities** (`src/lib/permissions.ts`)
   - Add new permission check function

3. **API Routes** (`src/app/api/...`)
   - Verify user role before performing action
   - Return 401/403 on unauthorized access

4. **Components** (`src/app/...`)
   - Import `Permissions` and check before showing UI
   - Disable buttons/inputs for unauthorized users

5. **This File** (`RBAC.md`)
   - Update permission matrix
   - Add examples if needed

## Debugging Permission Issues

### User can't see data
1. Check RLS policy has correct `org_id` filter
2. Verify `is_member(org_id)` returns true
3. Check if user is in `members` table

### User can perform unauthorized action
1. Check RLS policy has correct role check
2. Verify `member_role(org_id)` returns correct role
3. Check if API route validates role

### Activity log not being populated
1. Verify `org_id` is being passed to activity_log insert
2. Check Supabase RLS allows your app to write to activity_log
3. Look at Supabase logs for errors

## Testing Roles

### Create test users
```sql
-- In Supabase SQL editor, after enabling RLS

-- Add your test users to members table
INSERT INTO members (org_id, user_id, role)
VALUES
  ('org-123', auth.uid(), 'admin'),
  ('org-123', 'viewer-user-id', 'viewer');
```

### Test API route
```bash
# As admin
curl -H "Bearer $ADMIN_TOKEN" https://yourapp.com/api/invite/send

# As viewer (should fail with 403)
curl -H "Bearer $VIEWER_TOKEN" https://yourapp.com/api/invite/send
```

### Test RLS directly
In Supabase SQL editor, try deleting as different roles - only admin should succeed.

## Common Endpoints

| Endpoint | Method | Who | What |
|----------|--------|-----|------|
| `/api/invite/send` | POST | Admin | Send team invite |
| `/api/onboard` | POST | Anyone | Create org (first signup) |
| `/api/billing/create-order` | POST | Admin/Editor | Create Razorpay subscription |
| `/api/billing/verify` | POST | Admin/Editor | Verify checkout signature |
| `/api/billing/webhook` | POST | Razorpay | Sync recurring lifecycle |

## Environment Setup

Ensure these vars are set in `.env.local`:

```
NEXT_PUBLIC_SUPABASE_URL=...
NEXT_PUBLIC_SUPABASE_ANON_KEY=...
SUPABASE_SERVICE_ROLE_KEY=... (server-side only!)
APP_URL=http://localhost:3000
RAZORPAY_KEY_ID=...
RAZORPAY_KEY_SECRET=...
RAZORPAY_WEBHOOK_SECRET=...
RAZORPAY_PLAN_ID_STARTER=...
RAZORPAY_PLAN_ID_PRO=...
RAZORPAY_PLAN_ID_TEAM=...
```

Remember: `SUPABASE_SERVICE_ROLE_KEY` should **NEVER** be exposed to clients!
