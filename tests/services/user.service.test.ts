import { describe, it, expect, beforeEach } from 'vitest';
import { vitestInvoke } from 'rwsdk-community/test';

const TENANT_A = 'tenant-user-a';
const TENANT_B = 'tenant-user-b';

describe('User Service - Integration Tests', () => {
  beforeEach(async () => {
    await vitestInvoke('test_cleanDatabase', TENANT_A);
    await vitestInvoke('test_cleanDatabase', TENANT_B);
  });

  // ==========================================================================
  // createUser
  // ==========================================================================
  describe('createUser', () => {
    it('should create user with all fields', async () => {
      const user = await vitestInvoke<any>('test_createUser', {
        id: 'user-1',
        email: 'alice@example.com',
        tenant_id: TENANT_A,
        role: 'admin',
      });

      expect(user).toBeDefined();
      expect(user.id).toBe('user-1');
      expect(user.email).toBe('alice@example.com');
      expect(user.tenant_id).toBe(TENANT_A);
      expect(user.role).toBe('admin');
      expect(user.is_active).toBe(1);
    });

    it('should default role to athlete', async () => {
      const user = await vitestInvoke<any>('test_createUser', {
        id: 'user-2',
        email: 'bob@example.com',
        tenant_id: TENANT_A,
      });

      expect(user.role).toBe('athlete');
    });

    it('should default is_active to 1', async () => {
      const user = await vitestInvoke<any>('test_createUser', {
        id: 'user-3',
        email: 'charlie@example.com',
        tenant_id: TENANT_A,
      });

      expect(user.is_active).toBe(1);
    });

    it('should store display_name when provided', async () => {
      const user = await vitestInvoke<any>('test_createUser', {
        id: 'user-4',
        email: 'dave@example.com',
        tenant_id: TENANT_A,
      });

      // test_createUser doesn't have display_name param, so we use updateUser
      const updated = await vitestInvoke<any>('test_updateUser', {
        id: 'user-4',
        tenant_id: TENANT_A,
        display_name: 'Dave Smith',
      });

      expect(updated).toBeDefined();
      expect(updated.display_name).toBe('Dave Smith');
    });

    it('should store external_auth_id when provided via createUser service', async () => {
      // test_createUser doesn't have external_auth_id; we create then link
      const user = await vitestInvoke<any>('test_createUser', {
        id: 'user-5',
        email: 'eve@example.com',
        tenant_id: TENANT_A,
      });

      const linked = await vitestInvoke<any>('test_linkExternalAuth', {
        user_id: user.id,
        external_auth_id: 'ext-auth-123',
        tenant_id: TENANT_A,
      });

      expect(linked).toBeDefined();
      expect(linked.external_auth_id).toBe('ext-auth-123');
    });
  });

  // ==========================================================================
  // getUserById
  // ==========================================================================
  describe('getUserById', () => {
    it('should find user by id', async () => {
      await vitestInvoke('test_createUser', {
        id: 'user-get-1',
        email: 'findme@example.com',
        tenant_id: TENANT_A,
      });

      const found = await vitestInvoke<any>('test_getUserById', {
        id: 'user-get-1',
      });

      expect(found).toBeDefined();
      expect(found.id).toBe('user-get-1');
      expect(found.email).toBe('findme@example.com');
    });

    it('should return undefined for non-existent id', async () => {
      const result = await vitestInvoke<any>('test_getUserById', {
        id: 'non-existent-id',
      });

      expect(result).toBeUndefined();
    });

    it('should filter by tenant_id when provided', async () => {
      await vitestInvoke('test_createUser', {
        id: 'user-tenant-filter',
        email: 'tenantfilter@example.com',
        tenant_id: TENANT_A,
      });

      // Correct tenant — should find
      const found = await vitestInvoke<any>('test_getUserById', {
        id: 'user-tenant-filter',
        tenant_id: TENANT_A,
      });
      expect(found).toBeDefined();

      // Wrong tenant — should NOT find
      const notFound = await vitestInvoke<any>('test_getUserById', {
        id: 'user-tenant-filter',
        tenant_id: TENANT_B,
      });
      expect(notFound).toBeUndefined();
    });

    it('should return user regardless of tenant without filter', async () => {
      await vitestInvoke('test_createUser', {
        id: 'user-no-filter',
        email: 'nofilter@example.com',
        tenant_id: TENANT_A,
      });

      // No tenant_id filter — should still find the user
      const found = await vitestInvoke<any>('test_getUserById', {
        id: 'user-no-filter',
      });
      expect(found).toBeDefined();
      expect(found.tenant_id).toBe(TENANT_A);
    });
  });

  // ==========================================================================
  // getUserByExternalAuthId
  // ==========================================================================
  describe('getUserByExternalAuthId', () => {
    it('should find user by external_auth_id', async () => {
      await vitestInvoke('test_createUser', {
        id: 'user-ext-1',
        email: 'extauth@example.com',
        tenant_id: TENANT_A,
      });

      // Link external auth
      await vitestInvoke('test_linkExternalAuth', {
        user_id: 'user-ext-1',
        external_auth_id: 'ext-auth-abc',
        tenant_id: TENANT_A,
      });

      const found = await vitestInvoke<any>('test_getUserByExternalAuthId', {
        external_auth_id: 'ext-auth-abc',
      });

      expect(found).toBeDefined();
      expect(found.id).toBe('user-ext-1');
    });

    it('should return undefined for non-existent auth id', async () => {
      const result = await vitestInvoke<any>('test_getUserByExternalAuthId', {
        external_auth_id: 'non-existent-auth-id',
      });

      expect(result).toBeUndefined();
    });
  });

  // ==========================================================================
  // getUserByEmail
  // ==========================================================================
  describe('getUserByEmail', () => {
    it('should find user by email', async () => {
      await vitestInvoke('test_createUser', {
        id: 'user-email-1',
        email: 'findbyemail@example.com',
        tenant_id: TENANT_A,
      });

      const found = await vitestInvoke<any>('test_getUserByEmail', {
        email: 'findbyemail@example.com',
      });

      expect(found).toBeDefined();
      expect(found.id).toBe('user-email-1');
    });

    it('should filter by tenant_id when provided', async () => {
      await vitestInvoke('test_createUser', {
        id: 'user-email-tenant',
        email: 'emailtenant@example.com',
        tenant_id: TENANT_A,
      });

      // Correct tenant
      const found = await vitestInvoke<any>('test_getUserByEmail', {
        email: 'emailtenant@example.com',
        tenant_id: TENANT_A,
      });
      expect(found).toBeDefined();

      // Wrong tenant
      const notFound = await vitestInvoke<any>('test_getUserByEmail', {
        email: 'emailtenant@example.com',
        tenant_id: TENANT_B,
      });
      expect(notFound).toBeUndefined();
    });

    it('should return undefined for non-existent email', async () => {
      const result = await vitestInvoke<any>('test_getUserByEmail', {
        email: 'nobody@example.com',
      });

      expect(result).toBeUndefined();
    });
  });

  // ==========================================================================
  // getUsersByTenant
  // ==========================================================================
  describe('getUsersByTenant', () => {
    it('should return all users for a tenant', async () => {
      await vitestInvoke('test_createUser', {
        id: 'user-list-1',
        email: 'list1@example.com',
        tenant_id: TENANT_A,
      });
      await vitestInvoke('test_createUser', {
        id: 'user-list-2',
        email: 'list2@example.com',
        tenant_id: TENANT_A,
      });

      const users = await vitestInvoke<any[]>('test_getUsersByTenant', {
        tenant_id: TENANT_A,
      });

      expect(users).toHaveLength(2);
      const ids = users.map((u: any) => u.id);
      expect(ids).toContain('user-list-1');
      expect(ids).toContain('user-list-2');
    });

    it('should filter by is_active when provided', async () => {
      await vitestInvoke('test_createUser', {
        id: 'user-active',
        email: 'active@example.com',
        tenant_id: TENANT_A,
      });
      await vitestInvoke('test_createUser', {
        id: 'user-inactive',
        email: 'inactive@example.com',
        tenant_id: TENANT_A,
      });

      // Deactivate one user
      await vitestInvoke('test_deactivateUser', {
        id: 'user-inactive',
        tenant_id: TENANT_A,
      });

      const activeUsers = await vitestInvoke<any[]>('test_getUsersByTenant', {
        tenant_id: TENANT_A,
        is_active: 1,
      });
      expect(activeUsers).toHaveLength(1);
      expect(activeUsers[0].id).toBe('user-active');

      const inactiveUsers = await vitestInvoke<any[]>('test_getUsersByTenant', {
        tenant_id: TENANT_A,
        is_active: 0,
      });
      expect(inactiveUsers).toHaveLength(1);
      expect(inactiveUsers[0].id).toBe('user-inactive');
    });

    it('should not return users from other tenants', async () => {
      await vitestInvoke('test_createUser', {
        id: 'user-a-only',
        email: 'aonly@example.com',
        tenant_id: TENANT_A,
      });
      await vitestInvoke('test_createUser', {
        id: 'user-b-only',
        email: 'bonly@example.com',
        tenant_id: TENANT_B,
      });

      const usersA = await vitestInvoke<any[]>('test_getUsersByTenant', {
        tenant_id: TENANT_A,
      });
      const idsA = usersA.map((u: any) => u.id);
      expect(idsA).toContain('user-a-only');
      expect(idsA).not.toContain('user-b-only');

      const usersB = await vitestInvoke<any[]>('test_getUsersByTenant', {
        tenant_id: TENANT_B,
      });
      const idsB = usersB.map((u: any) => u.id);
      expect(idsB).toContain('user-b-only');
      expect(idsB).not.toContain('user-a-only');
    });
  });

  // ==========================================================================
  // updateUser
  // ==========================================================================
  describe('updateUser', () => {
    it('should update email', async () => {
      await vitestInvoke('test_createUser', {
        id: 'user-update-email',
        email: 'oldemail@example.com',
        tenant_id: TENANT_A,
      });

      const updated = await vitestInvoke<any>('test_updateUser', {
        id: 'user-update-email',
        tenant_id: TENANT_A,
        email: 'newemail@example.com',
      });

      expect(updated).toBeDefined();
      expect(updated.email).toBe('newemail@example.com');
    });

    it('should update role', async () => {
      await vitestInvoke('test_createUser', {
        id: 'user-update-role',
        email: 'updaterole@example.com',
        tenant_id: TENANT_A,
      });

      const updated = await vitestInvoke<any>('test_updateUser', {
        id: 'user-update-role',
        tenant_id: TENANT_A,
        role: 'admin',
      });

      expect(updated).toBeDefined();
      expect(updated.role).toBe('admin');
    });

    it('should update display_name', async () => {
      await vitestInvoke('test_createUser', {
        id: 'user-update-display',
        email: 'updatedisplay@example.com',
        tenant_id: TENANT_A,
      });

      const updated = await vitestInvoke<any>('test_updateUser', {
        id: 'user-update-display',
        tenant_id: TENANT_A,
        display_name: 'John Doe',
      });

      expect(updated).toBeDefined();
      expect(updated.display_name).toBe('John Doe');
    });

    it('should not update user from different tenant', async () => {
      await vitestInvoke('test_createUser', {
        id: 'user-cross-tenant',
        email: 'crosstenant@example.com',
        tenant_id: TENANT_A,
      });

      const result = await vitestInvoke<any>('test_updateUser', {
        id: 'user-cross-tenant',
        tenant_id: TENANT_B,
        email: 'hacked@example.com',
      });

      expect(result).toBeUndefined();

      // Verify original is unchanged
      const original = await vitestInvoke<any>('test_getUserById', {
        id: 'user-cross-tenant',
        tenant_id: TENANT_A,
      });
      expect(original.email).toBe('crosstenant@example.com');
    });
  });

  // ==========================================================================
  // deleteUser
  // ==========================================================================
  describe('deleteUser', () => {
    it('should delete user and return true', async () => {
      await vitestInvoke('test_createUser', {
        id: 'user-delete-1',
        email: 'delete@example.com',
        tenant_id: TENANT_A,
      });

      const deleted = await vitestInvoke<boolean>('test_deleteUser', {
        id: 'user-delete-1',
        tenant_id: TENANT_A,
      });

      expect(deleted).toBe(true);

      const found = await vitestInvoke<any>('test_getUserById', { id: 'user-delete-1' });
      expect(found).toBeUndefined();
    });

    it('should return false for non-existent user', async () => {
      const deleted = await vitestInvoke<boolean>('test_deleteUser', {
        id: 'non-existent-user',
        tenant_id: TENANT_A,
      });

      expect(deleted).toBe(false);
    });

    it('should filter by tenant_id when provided', async () => {
      await vitestInvoke('test_createUser', {
        id: 'user-delete-tenant',
        email: 'deletetenant@example.com',
        tenant_id: TENANT_A,
      });

      // Try to delete from wrong tenant
      const result = await vitestInvoke<boolean>('test_deleteUser', {
        id: 'user-delete-tenant',
        tenant_id: TENANT_B,
      });
      expect(result).toBe(false);

      // Verify user still exists
      const stillHere = await vitestInvoke<any>('test_getUserById', {
        id: 'user-delete-tenant',
        tenant_id: TENANT_A,
      });
      expect(stillHere).toBeDefined();
    });
  });

  // ==========================================================================
  // deactivateUser / reactivateUser
  // ==========================================================================
  describe('deactivateUser', () => {
    it('should set is_active to 0', async () => {
      await vitestInvoke('test_createUser', {
        id: 'user-deactivate',
        email: 'deactivate@example.com',
        tenant_id: TENANT_A,
      });

      const result = await vitestInvoke<any>('test_deactivateUser', {
        id: 'user-deactivate',
        tenant_id: TENANT_A,
      });

      expect(result).toBeDefined();
      expect(result.is_active).toBe(0);
    });

    it('should preserve other fields', async () => {
      await vitestInvoke('test_createUser', {
        id: 'user-deactivate-preserve',
        email: 'preserve@example.com',
        tenant_id: TENANT_A,
        role: 'admin',
      });

      await vitestInvoke('test_updateUser', {
        id: 'user-deactivate-preserve',
        tenant_id: TENANT_A,
        display_name: 'Before Deactivate',
      });

      const result = await vitestInvoke<any>('test_deactivateUser', {
        id: 'user-deactivate-preserve',
        tenant_id: TENANT_A,
      });

      expect(result.is_active).toBe(0);
      expect(result.email).toBe('preserve@example.com');
      expect(result.role).toBe('admin');
      expect(result.display_name).toBe('Before Deactivate');
    });
  });

  describe('reactivateUser', () => {
    it('should set is_active to 1', async () => {
      await vitestInvoke('test_createUser', {
        id: 'user-reactivate',
        email: 'reactivate@example.com',
        tenant_id: TENANT_A,
      });

      // Deactivate first
      await vitestInvoke('test_deactivateUser', {
        id: 'user-reactivate',
        tenant_id: TENANT_A,
      });

      // Reactivate
      const result = await vitestInvoke<any>('test_reactivateUser', {
        id: 'user-reactivate',
        tenant_id: TENANT_A,
      });

      expect(result).toBeDefined();
      expect(result.is_active).toBe(1);
    });
  });

  // ==========================================================================
  // linkExternalAuth
  // ==========================================================================
  describe('linkExternalAuth', () => {
    it('should set external_auth_id on user', async () => {
      await vitestInvoke('test_createUser', {
        id: 'user-link-auth',
        email: 'linkauth@example.com',
        tenant_id: TENANT_A,
      });

      const result = await vitestInvoke<any>('test_linkExternalAuth', {
        user_id: 'user-link-auth',
        external_auth_id: 'ext-auth-new-123',
        tenant_id: TENANT_A,
      });

      expect(result).toBeDefined();
      expect(result.external_auth_id).toBe('ext-auth-new-123');
    });

    it('should filter by tenant_id when provided', async () => {
      await vitestInvoke('test_createUser', {
        id: 'user-link-cross',
        email: 'linkcross@example.com',
        tenant_id: TENANT_A,
      });

      // Try to link from wrong tenant
      const result = await vitestInvoke<any>('test_linkExternalAuth', {
        user_id: 'user-link-cross',
        external_auth_id: 'ext-auth-hack',
        tenant_id: TENANT_B,
      });

      expect(result).toBeUndefined();

      // Verify original has no external_auth_id
      const original = await vitestInvoke<any>('test_getUserById', {
        id: 'user-link-cross',
        tenant_id: TENANT_A,
      });
      expect(original.external_auth_id).toBeNull();
    });
  });

  // ==========================================================================
  // Multi-tenant isolation suite
  // ==========================================================================
  describe('Multi-tenant isolation', () => {
    it('should not find user from another tenant via getUserById', async () => {
      await vitestInvoke('test_createUser', {
        id: 'user-isolate-1',
        email: 'isolate1@example.com',
        tenant_id: TENANT_A,
      });

      const result = await vitestInvoke<any>('test_getUserById', {
        id: 'user-isolate-1',
        tenant_id: TENANT_B,
      });

      expect(result).toBeUndefined();
    });

    it('should not update user from another tenant', async () => {
      await vitestInvoke('test_createUser', {
        id: 'user-isolate-2',
        email: 'isolate2@example.com',
        tenant_id: TENANT_A,
      });

      const result = await vitestInvoke<any>('test_updateUser', {
        id: 'user-isolate-2',
        tenant_id: TENANT_B,
        display_name: 'Hacked Name',
      });

      expect(result).toBeUndefined();

      // Confirm original is unchanged
      const original = await vitestInvoke<any>('test_getUserById', {
        id: 'user-isolate-2',
        tenant_id: TENANT_A,
      });
      expect(original.display_name).toBeNull();
    });

    it('should not delete user from another tenant', async () => {
      await vitestInvoke('test_createUser', {
        id: 'user-isolate-3',
        email: 'isolate3@example.com',
        tenant_id: TENANT_A,
      });

      const result = await vitestInvoke<boolean>('test_deleteUser', {
        id: 'user-isolate-3',
        tenant_id: TENANT_B,
      });

      expect(result).toBe(false);

      // Confirm still exists
      const stillHere = await vitestInvoke<any>('test_getUserById', {
        id: 'user-isolate-3',
        tenant_id: TENANT_A,
      });
      expect(stillHere).toBeDefined();
    });
  });
});
