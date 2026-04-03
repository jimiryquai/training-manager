import type { Kysely } from 'kysely';
import type { Database, TenantSettingsTable } from '../db/schema';
import { wrapDatabaseError } from './errors';

export interface CreateTenantSettingsInput {
  tenant_id: string;
  organization_name: string;
  timezone?: string;
  default_barbell_rounding?: number;
}

export type TenantSettingsRecord = TenantSettingsTable;

export async function createTenantSettings(
  db: Kysely<Database>,
  input: CreateTenantSettingsInput
): Promise<TenantSettingsRecord | undefined> {
  return wrapDatabaseError('createTenantSettings', async () => {
    const result = await db
      .insertInto('tenant_settings')
      .values({
        tenant_id: input.tenant_id,
        organization_name: input.organization_name,
        timezone: input.timezone ?? 'UTC',
        default_barbell_rounding: input.default_barbell_rounding ?? 2.5,
      })
      .returningAll()
      .executeTakeFirst();

    return result;
  });
}

export interface GetTenantSettingsInput {
  tenant_id: string;
}

export async function getTenantSettings(
  db: Kysely<Database>,
  input: GetTenantSettingsInput
): Promise<TenantSettingsRecord | undefined> {
  return wrapDatabaseError('getTenantSettings', async () => {
    return db
      .selectFrom('tenant_settings')
      .where('tenant_id', '=', input.tenant_id)
      .selectAll()
      .executeTakeFirst();
  });
}

export interface UpdateTenantSettingsInput {
  tenant_id: string;
  organization_name?: string;
  timezone?: string;
  default_barbell_rounding?: number;
}

export async function updateTenantSettings(
  db: Kysely<Database>,
  input: UpdateTenantSettingsInput
): Promise<TenantSettingsRecord | undefined> {
  return wrapDatabaseError('updateTenantSettings', async () => {
    const updates: Record<string, unknown> = {};

    if (input.organization_name !== undefined) updates.organization_name = input.organization_name;
    if (input.timezone !== undefined) updates.timezone = input.timezone;
    if (input.default_barbell_rounding !== undefined) {
      updates.default_barbell_rounding = input.default_barbell_rounding;
    }

    if (Object.keys(updates).length === 0) {
      return getTenantSettings(db, { tenant_id: input.tenant_id });
    }

    const result = await db
      .updateTable('tenant_settings')
      .set(updates)
      .where('tenant_id', '=', input.tenant_id)
      .returningAll()
      .executeTakeFirst();

    return result;
  });
}

export interface DeleteTenantSettingsInput {
  tenant_id: string;
}

export async function deleteTenantSettings(
  db: Kysely<Database>,
  input: DeleteTenantSettingsInput
): Promise<boolean> {
  return wrapDatabaseError('deleteTenantSettings', async () => {
    const result = await db
      .deleteFrom('tenant_settings')
      .where('tenant_id', '=', input.tenant_id)
      .executeTakeFirst();

    return result.numDeletedRows > 0;
  });
}

/**
 * Get or create tenant settings with defaults
 * Useful for ensuring tenant settings exist
 */
export async function getOrCreateTenantSettings(
  db: Kysely<Database>,
  tenant_id: string
): Promise<TenantSettingsRecord> {
  return wrapDatabaseError('getOrCreateTenantSettings', async () => {
    let settings = await getTenantSettings(db, { tenant_id });

    if (!settings) {
      settings = await createTenantSettings(db, {
        tenant_id,
        organization_name: 'Default Organization',
      });
    }

    return settings!;
  });
}
