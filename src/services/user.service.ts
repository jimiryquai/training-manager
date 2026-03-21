import type { Kysely } from 'kysely';
import type { Database, UserTable, UserRole } from '../db/schema';

export interface CreateUserInput {
  id?: string;
  tenant_id: string;
  email: string;
  external_auth_id?: string | null;
  role?: UserRole;
  is_active?: number;
}

export type UserRecord = {
  id: string;
  tenant_id: string;
  external_auth_id: string | null;
  email: string;
  role: UserRole;
  is_active: number;
};

export async function createUser(
  db: Kysely<Database>,
  input: CreateUserInput
): Promise<UserRecord | undefined> {
  const id = input.id ?? crypto.randomUUID();
  const now = new Date().toISOString();

  const result = await db
    .insertInto('user')
    .values({
      id,
      tenant_id: input.tenant_id,
      email: input.email,
      external_auth_id: input.external_auth_id ?? null,
      role: input.role ?? 'athlete',
      is_active: input.is_active ?? 1,
      created_at: now,
      updated_at: now,
    })
    .returningAll()
    .executeTakeFirst();

  return result;
}

export interface GetUserInput {
  id: string;
  tenant_id?: string;
}

export async function getUserById(
  db: Kysely<Database>,
  input: GetUserInput
): Promise<UserRecord | undefined> {
  let query = db
    .selectFrom('user')
    .where('id', '=', input.id);

  if (input.tenant_id !== undefined) {
    query = query.where('tenant_id', '=', input.tenant_id);
  }

  return query.selectAll().executeTakeFirst();
}

export interface GetUserByExternalAuthInput {
  external_auth_id: string;
}

export async function getUserByExternalAuthId(
  db: Kysely<Database>,
  input: GetUserByExternalAuthInput
): Promise<UserRecord | undefined> {
  return db
    .selectFrom('user')
    .where('external_auth_id', '=', input.external_auth_id)
    .selectAll()
    .executeTakeFirst();
}

export interface GetUserByEmailInput {
  email: string;
  tenant_id?: string;
}

export async function getUserByEmail(
  db: Kysely<Database>,
  input: GetUserByEmailInput
): Promise<UserRecord | undefined> {
  let query = db
    .selectFrom('user')
    .where('email', '=', input.email);

  if (input.tenant_id !== undefined) {
    query = query.where('tenant_id', '=', input.tenant_id);
  }

  return query.selectAll().executeTakeFirst();
}

export interface GetUsersByTenantInput {
  tenant_id: string;
  is_active?: number;
}

export async function getUsersByTenant(
  db: Kysely<Database>,
  input: GetUsersByTenantInput
): Promise<UserRecord[]> {
  let query = db
    .selectFrom('user')
    .where('tenant_id', '=', input.tenant_id);

  if (input.is_active !== undefined) {
    query = query.where('is_active', '=', input.is_active);
  }

  return query.selectAll().execute();
}

export interface UpdateUserInput {
  id: string;
  tenant_id?: string;
  email?: string;
  external_auth_id?: string | null;
  role?: UserRole;
  is_active?: number;
}

export async function updateUser(
  db: Kysely<Database>,
  input: UpdateUserInput
): Promise<UserRecord | undefined> {
  const now = new Date().toISOString();
  const updates: Record<string, unknown> = { updated_at: now };

  if (input.email !== undefined) updates.email = input.email;
  if (input.external_auth_id !== undefined) updates.external_auth_id = input.external_auth_id;
  if (input.role !== undefined) updates.role = input.role;
  if (input.is_active !== undefined) updates.is_active = input.is_active;

  let query = db
    .updateTable('user')
    .set(updates)
    .where('id', '=', input.id);

  if (input.tenant_id !== undefined) {
    query = query.where('tenant_id', '=', input.tenant_id);
  }

  const result = await query.returningAll().executeTakeFirst();

  return result;
}

export interface DeleteUserInput {
  id: string;
  tenant_id?: string;
}

export async function deleteUser(
  db: Kysely<Database>,
  input: DeleteUserInput
): Promise<boolean> {
  let query = db
    .deleteFrom('user')
    .where('id', '=', input.id);

  if (input.tenant_id !== undefined) {
    query = query.where('tenant_id', '=', input.tenant_id);
  }

  const result = await query.executeTakeFirst();

  return result.numDeletedRows > 0;
}

/**
 * Deactivate a user (soft delete)
 * Sets is_active to 0
 */
export async function deactivateUser(
  db: Kysely<Database>,
  input: { id: string; tenant_id?: string }
): Promise<UserRecord | undefined> {
  return updateUser(db, { ...input, is_active: 0 });
}

/**
 * Reactivate a user
 * Sets is_active to 1
 */
export async function reactivateUser(
  db: Kysely<Database>,
  input: { id: string; tenant_id?: string }
): Promise<UserRecord | undefined> {
  return updateUser(db, { ...input, is_active: 1 });
}

/**
 * Link external auth ID to user (for Passkey setup)
 */
export async function linkExternalAuth(
  db: Kysely<Database>,
  input: {
    user_id: string;
    external_auth_id: string;
    tenant_id?: string;
  }
): Promise<UserRecord | undefined> {
  return updateUser(db, {
    id: input.user_id,
    tenant_id: input.tenant_id,
    external_auth_id: input.external_auth_id,
  });
}
