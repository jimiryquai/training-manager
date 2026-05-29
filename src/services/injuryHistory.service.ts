import type { Kysely } from 'kysely';
import type { Database, InjuryHistoryTable, BodyRegion, InjurySeverity, InjuryStatus } from '../db/schema';
import { wrapDatabaseError } from './errors';
import { createId, nowISO } from './helpers';

export interface CreateInjuryRecordInput {
  id?: string;
  tenant_id: string;
  user_id: string;
  body_region: BodyRegion;
  injury_type: string;
  severity: InjurySeverity;
  status: InjuryStatus;
  date_occurred?: string | null;
  contraindicated_movements?: string | null;
  notes?: string | null;
}

export type InjuryRecord = {
  id: string;
  tenant_id: string;
  user_id: string;
  body_region: BodyRegion;
  injury_type: string;
  severity: InjurySeverity;
  status: InjuryStatus;
  date_occurred: string | null;
  contraindicated_movements: string | null;
  notes: string | null;
  created_at: string;
  updated_at: string;
};

export async function createInjuryRecord(
  db: Kysely<Database>,
  input: CreateInjuryRecordInput
): Promise<InjuryRecord | undefined> {
  return wrapDatabaseError('createInjuryRecord', async () => {
    const id = input.id ?? createId();
    const now = nowISO();

    const result = await db
      .insertInto('injury_history')
      .values({
        id,
        tenant_id: input.tenant_id,
        user_id: input.user_id,
        body_region: input.body_region,
        injury_type: input.injury_type,
        severity: input.severity,
        status: input.status,
        date_occurred: input.date_occurred ?? null,
        contraindicated_movements: input.contraindicated_movements ?? null,
        notes: input.notes ?? null,
        created_at: now,
        updated_at: now,
      })
      .returningAll()
      .executeTakeFirst();

    return result;
  });
}

export interface GetInjuryRecordInput {
  id: string;
  tenant_id?: string;
}

export async function getInjuryRecordById(
  db: Kysely<Database>,
  input: GetInjuryRecordInput
): Promise<InjuryRecord | undefined> {
  return wrapDatabaseError('getInjuryRecordById', async () => {
    let query = db.selectFrom('injury_history').where('id', '=', input.id);

    if (input.tenant_id !== undefined) {
      query = query.where('tenant_id', '=', input.tenant_id);
    }

    return query.selectAll().executeTakeFirst();
  });
}

export interface GetInjuriesByUserIdInput {
  user_id: string;
  tenant_id?: string;
}

export async function getInjuriesByUserId(
  db: Kysely<Database>,
  input: GetInjuriesByUserIdInput
): Promise<InjuryRecord[]> {
  return wrapDatabaseError('getInjuriesByUserId', async () => {
    let query = db.selectFrom('injury_history').where('user_id', '=', input.user_id);

    if (input.tenant_id !== undefined) {
      query = query.where('tenant_id', '=', input.tenant_id);
    }

    return query.orderBy('date_occurred', 'desc').selectAll().execute();
  });
}

export interface UpdateInjuryRecordInput {
  id: string;
  tenant_id: string;
  body_region?: BodyRegion;
  injury_type?: string;
  severity?: InjurySeverity;
  status?: InjuryStatus;
  date_occurred?: string | null;
  contraindicated_movements?: string | null;
  notes?: string | null;
}

export async function updateInjuryRecord(
  db: Kysely<Database>,
  input: UpdateInjuryRecordInput
): Promise<InjuryRecord | undefined> {
  return wrapDatabaseError('updateInjuryRecord', async () => {
    const now = nowISO();
    const updates: Record<string, unknown> = { updated_at: now };

    if (input.body_region !== undefined) updates.body_region = input.body_region;
    if (input.injury_type !== undefined) updates.injury_type = input.injury_type;
    if (input.severity !== undefined) updates.severity = input.severity;
    if (input.status !== undefined) updates.status = input.status;
    if (input.date_occurred !== undefined) updates.date_occurred = input.date_occurred;
    if (input.contraindicated_movements !== undefined) updates.contraindicated_movements = input.contraindicated_movements;
    if (input.notes !== undefined) updates.notes = input.notes;

    return db
      .updateTable('injury_history')
      .set(updates)
      .where('id', '=', input.id)
      .where('tenant_id', '=', input.tenant_id)
      .returningAll()
      .executeTakeFirst();
  });
}

export interface DeleteInjuryRecordInput {
  id: string;
  tenant_id: string;
}

export async function deleteInjuryRecord(
  db: Kysely<Database>,
  input: DeleteInjuryRecordInput
): Promise<boolean> {
  return wrapDatabaseError('deleteInjuryRecord', async () => {
    const result = await db
      .deleteFrom('injury_history')
      .where('id', '=', input.id)
      .where('tenant_id', '=', input.tenant_id)
      .executeTakeFirst();

    return result.numDeletedRows > 0;
  });
}
