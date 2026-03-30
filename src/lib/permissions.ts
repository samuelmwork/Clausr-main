/**
 * Role-based Access Control (RBAC) utilities for Clausr
 * 
 * Three roles:
 * - admin: Full access to org settings, members, contracts, billing
 * - editor: Can add/edit contracts, view all, but cannot delete or manage team
 * - viewer: Read-only access to contracts and activity logs
 */

import type { SupabaseClient } from '@supabase/supabase-js'

export type Role = 'admin' | 'editor' | 'viewer'

/**
 * Get the current user's role in an organization
 */
export async function getUserRole(
  supabase: SupabaseClient,
  orgId: string
): Promise<Role | null> {
  try {
    const { data: { user } } = await supabase.auth.getUser()
    if (!user) return null

    const { data, error } = await supabase
      .from('members')
      .select('role')
      .eq('org_id', orgId)
      .eq('user_id', user.id)
      .single()

    if (error || !data) return null
    return (data.role || 'viewer') as Role
  } catch {
    return null
  }
}

/**
 * Check if user has a specific role or higher
 * Usage: isRoleOrHigher('editor', 'admin') returns true
 */
export function isRoleOrHigher(
  userRole: Role | null,
  requiredRole: Role
): boolean {
  if (!userRole) return false

  const roleHierarchy: Record<Role, number> = {
    admin: 3,
    editor: 2,
    viewer: 1,
  }

  return roleHierarchy[userRole] >= roleHierarchy[requiredRole]
}

/**
 * Permission checks for specific actions
 */
export const Permissions = {
  // Contract operations
  canViewContracts: (role: Role | null) => role !== null,
  canAddContract: (role: Role | null) => isRoleOrHigher(role, 'editor'),
  canEditContract: (role: Role | null) => isRoleOrHigher(role, 'editor'),
  canDeleteContract: (role: Role | null) => isRoleOrHigher(role, 'editor'),

  // Member/team operations
  canViewMembers: (role: Role | null) => role !== null,
  canInviteMembers: (role: Role | null) => isRoleOrHigher(role, 'admin'),
  canRemoveMembers: (role: Role | null) => isRoleOrHigher(role, 'admin'),
  canChangeRoles: (role: Role | null) => isRoleOrHigher(role, 'admin'),

  // Organization operations
  canManageOrg: (role: Role | null) => isRoleOrHigher(role, 'admin'),
  canManageBilling: (role: Role | null) => isRoleOrHigher(role, 'editor'),

  // Activity and viewing
  canViewActivityLog: (role: Role | null) => role !== null,
}

/**
 * Check if user has permission to perform an action
 */
export type PermissionAction =
  | 'view_contracts'
  | 'add_contract'
  | 'edit_contract'
  | 'delete_contract'
  | 'view_members'
  | 'invite_members'
  | 'remove_members'
  | 'change_member_roles'
  | 'manage_org'
  | 'manage_billing'
  | 'view_activity'

export async function checkPermission(
  supabase: SupabaseClient,
  orgId: string,
  action: PermissionAction
): Promise<boolean> {
  const role = await getUserRole(supabase, orgId)

  const permissionMap: Record<PermissionAction, (role: Role | null) => boolean> = {
    view_contracts: Permissions.canViewContracts,
    add_contract: Permissions.canAddContract,
    edit_contract: Permissions.canEditContract,
    delete_contract: Permissions.canDeleteContract,
    view_members: Permissions.canViewMembers,
    invite_members: Permissions.canInviteMembers,
    remove_members: Permissions.canRemoveMembers,
    change_member_roles: Permissions.canChangeRoles,
    manage_org: Permissions.canManageOrg,
    manage_billing: Permissions.canManageBilling,
    view_activity: Permissions.canViewActivityLog,
  }

  const checker = permissionMap[action]
  return checker ? checker(role) : false
}

/**
 * Get user info for context
 */
export async function getUserInfo(supabase: SupabaseClient, orgId: string) {
  const { data: { user } } = await supabase.auth.getUser()
  if (!user) return null

  const { data: profile } = await supabase
    .from('profiles')
    .select('*')
    .eq('id', user.id)
    .single()

  const role = await getUserRole(supabase, orgId)

  return {
    userId: user.id,
    email: user.email,
    fullName: profile?.full_name || '',
    role,
  }
}
