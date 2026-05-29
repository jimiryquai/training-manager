import type { Kysely } from 'kysely';
import type { Database, EquipmentTable, AthleteEquipmentTable, ExerciseEquipmentTable } from '../db/schema';
import { wrapDatabaseError } from './errors';
import { createId, nowISO } from './helpers';

// ============================================================================
// Types
// ============================================================================

export interface CreateEquipmentInput {
  id?: string;
  tenant_id?: string | null;
  name: string;
  notes?: string | null;
}

export type EquipmentRecord = {
  id: string;
  tenant_id: string | null;
  name: string;
  notes: string | null;
  created_at: string;
  updated_at: string;
};

export type AthleteEquipmentRecord = {
  id: string;
  tenant_id: string;
  user_id: string;
  equipment_id: string;
  created_at: string;
  updated_at: string;
};

export type ExerciseEquipmentRecord = {
  id: string;
  tenant_id: string | null;
  exercise_dictionary_id: string;
  equipment_id: string;
  created_at: string;
  updated_at: string;
};

// ============================================================================
// 1. Reference Equipment CRUD
// ============================================================================

export async function createEquipment(
  db: Kysely<Database>,
  input: CreateEquipmentInput
): Promise<EquipmentRecord | undefined> {
  return wrapDatabaseError('createEquipment', async () => {
    const id = input.id ?? createId();
    const now = nowISO();

    const result = await db
      .insertInto('equipment')
      .values({
        id,
        tenant_id: input.tenant_id ?? null,
        name: input.name,
        notes: input.notes ?? null,
        created_at: now,
        updated_at: now,
      })
      .returningAll()
      .executeTakeFirst();

    return result;
  });
}

export async function getEquipmentById(
  db: Kysely<Database>,
  input: { id: string; tenant_id?: string | null }
): Promise<EquipmentRecord | undefined> {
  return wrapDatabaseError('getEquipmentById', async () => {
    let query = db.selectFrom('equipment').where('id', '=', input.id);

    if (input.tenant_id !== undefined) {
      if (input.tenant_id === null) {
        query = query.where('tenant_id', 'is', null);
      } else {
        query = query.where(q => q.where('tenant_id', '=', input.tenant_id).orWhere('tenant_id', 'is', null));
      }
    }

    return query.selectAll().executeTakeFirst();
  });
}

export async function getAllReferenceEquipment(
  db: Kysely<Database>,
  input?: { tenant_id?: string | null }
): Promise<EquipmentRecord[]> {
  return wrapDatabaseError('getAllReferenceEquipment', async () => {
    let query = db.selectFrom('equipment');

    if (input?.tenant_id !== undefined) {
      if (input.tenant_id === null) {
        query = query.where('tenant_id', 'is', null);
      } else {
        query = query.where(q => q.where('tenant_id', '=', input.tenant_id).orWhere('tenant_id', 'is', null));
      }
    }

    return query.orderBy('name', 'asc').selectAll().execute();
  });
}

export async function deleteEquipment(
  db: Kysely<Database>,
  input: { id: string; tenant_id?: string | null }
): Promise<boolean> {
  return wrapDatabaseError('deleteEquipment', async () => {
    let query = db.deleteFrom('equipment').where('id', '=', input.id);

    if (input.tenant_id !== undefined) {
      if (input.tenant_id === null) {
        query = query.where('tenant_id', 'is', null);
      } else {
        query = query.where('tenant_id', '=', input.tenant_id);
      }
    }

    const result = await query.executeTakeFirst();
    return result.numDeletedRows > 0;
  });
}

// ============================================================================
// 2. Athlete Equipment Assignment
// ============================================================================

export interface AssignAthleteEquipmentInput {
  id?: string;
  tenant_id: string;
  user_id: string;
  equipment_id: string;
}

export async function assignAthleteEquipment(
  db: Kysely<Database>,
  input: AssignAthleteEquipmentInput
): Promise<AthleteEquipmentRecord | undefined> {
  return wrapDatabaseError('assignAthleteEquipment', async () => {
    const id = input.id ?? createId();
    const now = nowISO();

    const result = await db
      .insertInto('athlete_equipment')
      .values({
        id,
        tenant_id: input.tenant_id,
        user_id: input.user_id,
        equipment_id: input.equipment_id,
        created_at: now,
        updated_at: now,
      })
      .returningAll()
      .executeTakeFirst();

    return result;
  });
}

export interface RemoveAthleteEquipmentInput {
  tenant_id: string;
  user_id: string;
  equipment_id: string;
}

export async function removeAthleteEquipment(
  db: Kysely<Database>,
  input: RemoveAthleteEquipmentInput
): Promise<boolean> {
  return wrapDatabaseError('removeAthleteEquipment', async () => {
    const result = await db
      .deleteFrom('athlete_equipment')
      .where('tenant_id', '=', input.tenant_id)
      .where('user_id', '=', input.user_id)
      .where('equipment_id', '=', input.equipment_id)
      .executeTakeFirst();

    return result.numDeletedRows > 0;
  });
}

export interface GetAthleteEquipmentInput {
  tenant_id: string;
  user_id: string;
}

export async function getAthleteEquipment(
  db: Kysely<Database>,
  input: GetAthleteEquipmentInput
): Promise<EquipmentRecord[]> {
  return wrapDatabaseError('getAthleteEquipment', async () => {
    return db
      .selectFrom('athlete_equipment')
      .innerJoin('equipment', 'equipment.id', 'athlete_equipment.equipment_id')
      .where('athlete_equipment.tenant_id', '=', input.tenant_id)
      .where('athlete_equipment.user_id', '=', input.user_id)
      .select([
        'equipment.id',
        'equipment.tenant_id',
        'equipment.name',
        'equipment.notes',
        'equipment.created_at',
        'equipment.updated_at'
      ])
      .orderBy('equipment.name', 'asc')
      .execute();
  });
}

// ============================================================================
// 3. Exercise Required Equipment
// ============================================================================

export interface AssignExerciseEquipmentInput {
  id?: string;
  tenant_id?: string | null;
  exercise_dictionary_id: string;
  equipment_id: string;
}

export async function assignExerciseEquipment(
  db: Kysely<Database>,
  input: AssignExerciseEquipmentInput
): Promise<ExerciseEquipmentRecord | undefined> {
  return wrapDatabaseError('assignExerciseEquipment', async () => {
    const id = input.id ?? createId();
    const now = nowISO();

    const result = await db
      .insertInto('exercise_equipment')
      .values({
        id,
        tenant_id: input.tenant_id ?? null,
        exercise_dictionary_id: input.exercise_dictionary_id,
        equipment_id: input.equipment_id,
        created_at: now,
        updated_at: now,
      })
      .returningAll()
      .executeTakeFirst();

    return result;
  });
}

export interface RemoveExerciseEquipmentInput {
  tenant_id?: string | null;
  exercise_dictionary_id: string;
  equipment_id: string;
}

export async function removeExerciseEquipment(
  db: Kysely<Database>,
  input: RemoveExerciseEquipmentInput
): Promise<boolean> {
  return wrapDatabaseError('removeExerciseEquipment', async () => {
    let query = db
      .deleteFrom('exercise_equipment')
      .where('exercise_dictionary_id', '=', input.exercise_dictionary_id)
      .where('equipment_id', '=', input.equipment_id);

    if (input.tenant_id !== undefined) {
      if (input.tenant_id === null) {
        query = query.where('tenant_id', 'is', null);
      } else {
        query = query.where('tenant_id', '=', input.tenant_id);
      }
    }

    const result = await query.executeTakeFirst();
    return result.numDeletedRows > 0;
  });
}

export interface GetExerciseEquipmentInput {
  tenant_id?: string | null;
  exercise_dictionary_id: string;
}

export async function getExerciseEquipment(
  db: Kysely<Database>,
  input: GetExerciseEquipmentInput
): Promise<EquipmentRecord[]> {
  return wrapDatabaseError('getExerciseEquipment', async () => {
    let query = db
      .selectFrom('exercise_equipment')
      .innerJoin('equipment', 'equipment.id', 'exercise_equipment.equipment_id')
      .where('exercise_equipment.exercise_dictionary_id', '=', input.exercise_dictionary_id);

    if (input.tenant_id !== undefined) {
      if (input.tenant_id === null) {
        query = query.where('exercise_equipment.tenant_id', 'is', null);
      } else {
        query = query.where(q => q.where('exercise_equipment.tenant_id', '=', input.tenant_id).orWhere('exercise_equipment.tenant_id', 'is', null));
      }
    }

    return query
      .select([
        'equipment.id',
        'equipment.tenant_id',
        'equipment.name',
        'equipment.notes',
        'equipment.created_at',
        'equipment.updated_at'
      ])
      .orderBy('equipment.name', 'asc')
      .execute();
  });
}
