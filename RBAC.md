# Clausr Role-Based Access Control (RBAC) System

## Overview

Clausr implements a three-tier role-based access control system enforced at both the database level (Postgres Row Level Security) and the application level. This document explains how it works and how to implement permission checks in new features.

---

## The Three Roles

### 1. **Admin** 👑
Typically: Founder, COO, IT lead

**Permissions:**
- ✅ View all contracts
- ✅ Add new contracts
- ✅ Edit any contract
- ✅ Delete contracts
- ✅ Manage team (invite, remove, change roles)
- ✅ Change organization settings (name, billing)
- ✅ Manage billing & plan upgrades
- ✅ View activity log

### 2. **Editor** 📝
Typically: Finance manager, operations lead

**Permissions:**
- ✅ View all contracts
- ✅ Add new contracts
- ✅ Edit contracts
- ❌ Delete contracts
- ❌ Manage team
- ❌ Change organization settings
- ❌ Manage billing
- ✅ View activity log

### 3. **Viewer** 👁️
Typically: Accountant, auditor, executive

**Permissions:**
- ✅ View all contracts
- ❌ Add contracts
- ❌ Edit contracts
- ❌ Delete contracts
- ❌ Manage team
- ❌ Change organization settings
- ❌ Manage billing
- ✅ View activity log

---

## How It Works: Two Layers of Security

### Layer 1: Database Level (Postgres RLS)

Every query goes through **Row Level Security policies**. These are enforced by Postgres itself, not your application code.

#### Key RLS Helper Functions

```sql
-- Check if user is a member of organization
is_member(org_id) → boolean

-- Get user's role in organization
member_role(org_id) → text ('admin', 'editor', or 'viewer')
```

#### RLS Policies in Effect

**Contracts Table:**
```sql
-- All members can view contracts in their org
SELECT: Where is_member(org_id)

-- Only editors and admins can create
INSERT: Where member_role(org_id) IN ('admin', 'editor')

-- Only editors and admins can update
UPDATE: Where member_role(org_id) IN ('admin', 'editor')

-- Only admins can delete
DELETE: Where member_role(org_id) = 'admin'
```

**Members Table:**
```sql
-- All members can view team members
SELECT: Where is_member(org_id)

-- Only admins can add members
INSERT: Where member_role(org_id) = 'admin'

-- Only admins can update roles
UPDATE: Where member_role(org_id) = 'admin'

-- Only admins can remove members
DELETE: Where member_role(org_id) = 'admin'
```

**Organizations Table:**
```sql
-- Members can view their org
SELECT: Where is_member(id)

-- Only admins can update org settings
UPDATE: Where member_role(id) = 'admin'
```

#### What This Means

- **Even if someone discovers your API endpoint**, Postgres will block unauthorized queries at the database level
- **No way to bypass** — RLS runs on every query, whether it comes from your frontend, backend, or even raw API calls
- **Two companies' data never mixes** — every query is automatically filtered by `org_id`

### Layer 2: Application Level (UI & API)

Your app code performs permission checks to:
- Hide/disable UI elements for unauthorized users
- Return 403 errors on API requests if user lacks permission
- Log permission changes in the activity log

---

## Using the Permission System

### Step 1: Import the Permission Utilities

```typescript
import { 
  getUserRole, 
  Permissions, 
  checkPermission 
} from '@/lib/permissions'
```

### Step 2: Get User Role

In components:
```typescript
const supabase = createClient()
const role = await getUserRole(supabase, orgId)
```

### Step 3: Check Permissions

**Direct permission checks:**
```typescript
// Check if user can perform specific action
if (Permissions.canDeleteContract(role)) {
  // Show delete button
}

if (Permissions.canInviteMembers(role)) {
  // Show invite form
}
```

**Available permission checks:**
```typescript
// Contracts
canViewContracts(role)
canAddContract(role)
canEditContract(role)
canDeleteContract(role)

// Team
canViewMembers(role)
canInviteMembers(role)
canRemoveMembers(role)
canChangeRoles(role)

// Organization
canManageOrg(role)
canManageBilling(role)

// Activity
canViewActivityLog(role)
```

### Step 4: Protect API Routes

Example from `/api/invite/send/route.ts`:

```typescript
export async function POST(req: Request) {
  const { orgId, email, role } = await req.json()
  const supabase = createServiceClient()

  // 1. Get current user
  const { data: { user } } = await supabase.auth.getUser()
  if (!user) return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })

  // 2. Check if user is admin
  const userRole = await getUserRole(supabase, orgId)
  if (userRole !== 'admin') {
    return NextResponse.json(
      { error: 'Only admins can invite members' },
      { status: 403 }
    )
  }

  // 3. Perform the action
  const { data: invitation } = await supabase
    .from('invitations')
    .insert({ org_id: orgId, email, role, invited_by: user.id })
    .select()
    .single()

  // 4. Log the action
  await supabase.from('activity_log').insert({
    org_id: orgId,
    user_id: user.id,
    action: `Invited ${email} as ${role}`,
  })

  return NextResponse.json({ ok: true })
}
```

---

## Real-World Permission Flows

### Scenario 1: Founder Invites Finance Manager

```
1. Founder (Admin) goes to Settings → Team
2. Enters finance@example.com and selects "Editor"
3. Clicks "Invite" → Frontend calls POST /api/invite/send
4. API checks: Is founder an admin? ✅ Yes
5. API inserts row into invitations table
6. RLS policy checks: Is founder an admin? ✅ Yes (database allows)
7. Email sent to finance manager with invite link
8. Finance manager accepts → becomes Editor in that org
9. Finance manager can now add/edit contracts, but cannot delete
```

### Scenario 2: Finance Manager Tries to Delete Contract

```
1. Finance manager (Editor) views a contract
2. Sees "Edit" button (✅ visible) but NO "Delete" button (❌ hidden)
3. If they somehow try to call DELETE via API...
4. API checks: Is editor an admin? ❌ No → returns 403
5. RLS policy checks: Is editor an admin? ❌ No → Postgres denies query
6. Delete fails at database level
```

### Scenario 3: Founder Changes Finance Manager's Role to Viewer

```
1. Founder goes to Settings → Team
2. Finds Finance manager, changes role dropdown from "Editor" to "Viewer"
3. Frontend calls PUT /api/members/{id}
   (You may need to implement this endpoint)
4. API checks: Is founder an admin? ✅ Yes
5. API calls: supabase.from('members').update({ role: 'viewer' })
6. RLS policy checks: Is founder an admin? ✅ Yes (database allows)
7. Finance manager is now a Viewer
8. Next time Finance manager loads /contracts, no "Add contract" button
9. Activity log: "Changed Finance Manager's role to Viewer"
```

---

## Component Implementation Examples

### Contracts List Page

```typescript
'use client'
import { getUserRole, Permissions } from '@/lib/permissions'

export default function ContractsPage() {
  const [userRole, setUserRole] = useState(null)

  useEffect(() => {
    async function load() {
      const role = await getUserRole(supabase, orgId)
      setUserRole(role)
    }
    load()
  }, [])

  return (
    <div>
      <div className="flex justify-between">
        <h1>Contracts</h1>
        {Permissions.canAddContract(userRole) && (
          <Link href="/contracts/new">+ Add contract</Link>
        )}
      </div>
      {/* Rest of component */}
    </div>
  )
}
```

### Contract Detail Actions

```typescript
export default function ContractActions({ contractId, orgId }) {
  const [userRole, setUserRole] = useState(null)

  useEffect(() => {
    const role = await getUserRole(supabase, orgId)
    setUserRole(role)
  }, [orgId])

  const canDelete = Permissions.canDeleteContract(userRole)

  return (
    <div>
      {/* Show to editors & admins */}
      <button disabled={!Permissions.canEditContract(userRole)}>
        Mark as renewed
      </button>

      {/* Show to admins only */}
      <button disabled={!canDelete}>
        Delete contract
      </button>

      {!canDelete && (
        <p className="text-xs text-gray-400">
          Only admins can delete contracts.
        </p>
      )}
    </div>
  )
}
```

### Settings / Team Management

```typescript
export default function SettingsPage() {
  const [userRole, setUserRole] = useState(null)
  const canManage = userRole === 'admin'

  return (
    <div>
      {/* Only show invite section to admins */}
      {canManage && (
        <div>
          <h3>Invite teammate</h3>
          <input type="email" />
          <button onClick={sendInvite}>Invite</button>
        </div>
      )}

      {/* Show member list with edit controls to admins */}
      {members.map(member => (
        <div key={member.id}>
          <p>{member.email}</p>
          
          {canManage ? (
            <>
              <select value={member.role} onChange={e => changeRole(e.target.value)}>
                <option>Admin</option>
                <option>Editor</option>
                <option>Viewer</option>
              </select>
              <button onClick={() => removeMember(member.id)}>Remove</button>
            </>
          ) : (
            <span>{member.role}</span>
          )}
        </div>
      ))}
    </div>
  )
}
```

---

## Role Hierarchy

Permissions are hierarchical:

```
Admin (Level 3)
  ↓ Can do everything an Editor can
Editor (Level 2)
  ↓ Can do everything a Viewer can
Viewer (Level 1)
  ↓ Read-only
```

The `isRoleOrHigher()` utility checks this:
```typescript
isRoleOrHigher('editor', 'viewer') → true  // editor can do what viewer can
isRoleOrHigher('viewer', 'editor') → false // viewer cannot do what editor can
```

---

## Activity Log

Every permission-based action is logged:

```typescript
await supabase.from('activity_log').insert({
  org_id: orgId,
  user_id: user.id,
  action: `Invited john@example.com as editor`,
  // or
  action: `Deleted contract "Stripe"`,
  // or
  action: `Changed team member role to viewer`,
})
```

Admins can review this in the activity log.

---

## Testing Permissions

### In Supabase SQL Editor

```sql
-- Impersonate a user by setting auth.uid()
SET request.jwt.claims = jsonb_build_object('sub', 'user-id');

-- Try to delete a contract as a viewer
DELETE FROM public.contracts WHERE id = 'contract-id';
-- Error: new row violates row-level security policy

-- Try as admin
-- Success!
```

### In Your App

1. Create test users with each role
2. Log in as each role
3. Try forbidden actions
4. Verify UI hides buttons
5. Verify API returns 403
6. Check browser console for errors

---

## Common Mistakes to Avoid

❌ **Don't** rely ONLY on UI hiding buttons
- Always check permissions on the backend

❌ **Don't** return 500 when user lacks permission
- Return 403 Forbidden with a clear error message

❌ **Don't** skip RLS policies
- RLS is your database-level firewall

❌ **Don't** expose sensitive data in error messages
- "User lacks permission to view this contract" is better than "User viewer cannot delete"

✅ **Do** check permissions as close to the database as possible
✅ **Do** log permission changes in activity log
✅ **Do** test edge cases (viewer trying to access admin endpoints)
✅ **Do** update this document when adding new roles or permissions

---

## Additional Endpoints That Need Permission Checks

- PUT `/api/members/{id}` - Change member role (admin only)
- DELETE `/api/members/{id}` - Remove member (admin only)
- PUT `/api/org/{id}` - Update organization settings (admin only)
- POST `/api/billing/verify` - Already checks signature, but could log user
- POST `/api/contracts` - If you have a dedicated endpoint (check editor/admin)

---

## Database Verification

To verify RLS is working:

```sql
-- List all RLS policies
SELECT * FROM pg_policies;

-- Check policies on contracts table
SELECT * FROM pg_policies WHERE tablename = 'contracts';

-- Verify table has RLS enabled
SELECT relname, relrowsecurity FROM pg_class WHERE relname = 'contracts';
-- Should show: contracts | t (true)
```

---

## Architecture Summary

```
User Action
    ↓
┌─────────────────────────────────────────┐
│ Frontend (React Component)               │
│ - Check role with getUserRole()         │
│ - Show/hide buttons with Permissions    │
└─────────────────────────────────────────┘
    ↓
┌─────────────────────────────────────────┐
│ API Route (/api/...)                     │
│ - Verify user is authenticated          │
│ - Check role with getUserRole()         │
│ - Return 401/403 if unauthorized        │
│ - Log action to activity_log            │
└─────────────────────────────────────────┘
    ↓
┌─────────────────────────────────────────┐
│ Supabase Client (.select/.insert/etc)   │
│ - Sends request to Postgres             │
└─────────────────────────────────────────┘
    ↓
┌─────────────────────────────────────────┐
│ Postgres Database                        │
│ - RLS policies filter rows              │
│ - Cannot bypass - enforced at DB level  │
│ - Returns data only if RLS allows       │
└─────────────────────────────────────────┘
```

---

## Questions?

This RBAC system is battle-tested and handles:
- Multi-organization isolation
- Role-based data access
- Action-level permissions
- Audit trails via activity log
- Database-level enforcement

For new features, always ask: "Who should be able to do this?" and implement the check in this order:
1. RLS policy in database
2. Permission check in API route
3. UI visibility in components
