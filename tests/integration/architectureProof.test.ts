import { env } from 'cloudflare:test';
import { describe, it, expect, beforeEach } from 'vitest';
import { Kysely } from 'kysely';
import { D1Dialect } from 'kysely-d1';
import type { Database } from '../../src/db/schema';
import { 
  createTrainingPlan, 
  cloneTrainingPlanToTenant,
  getFullTrainingPlan
} from '../../src/services/trainingPlan.service';
import {
  createTrainingSession,
} from '../../src/services/trainingSession.service';
import { 
  createSessionExercise, 
  updateSessionExercise
} from '../../src/services/sessionExercise.service';

describe('Architecture Proof: Multi-Tenant Cloning & Flattened Surgical Updates', () => {
  let db: Kysely<Database>;

  beforeEach(() => {
    db = new Kysely<Database>({
      // @ts-expect-error
      dialect: new D1Dialect({ database: env.DB }),
    });
  });

  const TENANT_A = 'tenant-alpha';
  const TENANT_B = 'tenant-beta';

  it('proves multi-tenant cloning from system template to tenant works reliably', async () => {
    // 1. Setup: Create a System Template Plan
    const templatePlan = await createTrainingPlan(db, {
      tenant_id: null,
      name: 'Global Strength Template',
      is_system_template: 1
    });
    expect(templatePlan).toBeDefined();

    // Create a dummy exercise dictionary entry
    const exerciseId = crypto.randomUUID();
    await db.insertInto('exercise_dictionary').values({
      id: exerciseId,
      tenant_id: null,
      name: 'Back Squat',
      movement_category: 'squat',
      exercise_type: 'dynamic',
      percent_bodyweight_used: 100,
      rounding_increment: 2.5
    }).execute();

    // Add a session and exercise to the template
    const templateSession = await createTrainingSession(db, {
      tenant_id: null,
      plan_id: templatePlan!.id,
      session_name: 'Heavy Leg Day'
    });

    await createSessionExercise(db, {
      tenant_id: null,
      session_id: templateSession!.id,
      exercise_dictionary_id: exerciseId,
      order_in_session: 1,
      target_sets: 3,
      target_reps: '5'
    });

    // 2. Execution: Clone template to Tenant A
    const clonedPlan = await cloneTrainingPlanToTenant(db, {
      plan_id: templatePlan!.id,
      tenant_id: TENANT_A,
      new_name: 'My Personal Strength Plan'
    });

    expect(clonedPlan).toBeDefined();
    expect(clonedPlan?.tenant_id).toBe(TENANT_A);
    expect(clonedPlan?.id).not.toBe(templatePlan?.id);

    // 3. Verification: Deep clone integrity
    const fullClonedPlan = await getFullTrainingPlan(db, { 
      id: clonedPlan!.id, 
      tenant_id: TENANT_A 
    });

    expect(fullClonedPlan?.sessions).toHaveLength(1);
    expect(fullClonedPlan?.sessions[0].tenant_id).toBe(TENANT_A);
    expect(fullClonedPlan?.sessions[0].exercises).toHaveLength(1);
    expect(fullClonedPlan?.sessions[0].exercises[0].tenant_id).toBe(TENANT_A);
    expect(fullClonedPlan?.sessions[0].exercises[0].target_sets).toBe(3);
    expect(fullClonedPlan?.sessions[0].exercises[0].target_reps).toBe('5');

    // 4. Side Effect Check: Verify template remains untouched and Tenant B sees nothing
    const systemPlans = await db.selectFrom('training_plan')
      .where('tenant_id', 'is', null)
      .selectAll()
      .execute();
    expect(systemPlans).toHaveLength(1);
    expect(systemPlans[0].id).toBe(templatePlan!.id);

    const tenantBPlans = await db.selectFrom('training_plan')
      .where('tenant_id', '=', TENANT_B)
      .selectAll()
      .execute();
    expect(tenantBPlans).toHaveLength(0);
  });

  it('proves flattened surgical updates work without side effects', async () => {
    // 1. Setup: Create a session with multiple exercises in Tenant A
    const plan = await createTrainingPlan(db, {
      tenant_id: TENANT_A,
      name: 'Surgical Update Test'
    });

    const session = await createTrainingSession(db, {
      tenant_id: TENANT_A,
      plan_id: plan!.id,
      session_name: 'Test Session'
    });

    // Create 3 exercises in the dictionary first
    const exerciseIds = [];
    for (let i = 1; i <= 3; i++) {
      const dictId = crypto.randomUUID();
      await db.insertInto('exercise_dictionary').values({
        id: dictId,
        tenant_id: TENANT_A,
        name: `Exercise ${i}`,
        movement_category: 'core',
        exercise_type: 'dynamic',
        percent_bodyweight_used: 0,
        rounding_increment: 2.5
      }).execute();

      const ex = await createSessionExercise(db, {
        tenant_id: TENANT_A,
        session_id: session!.id,
        exercise_dictionary_id: dictId,
        order_in_session: i,
        target_sets: 3,
        target_reps: '10'
      });
      expect(ex).toBeDefined();
      exerciseIds.push(ex!.id);
    }

    // 2. Execution: Surgically update ONLY the second exercise
    const targetExerciseId = exerciseIds[1];
    const updateResult = await updateSessionExercise(db, {
      id: targetExerciseId,
      tenant_id: TENANT_A,
      target_sets: 5,         // Change sets
      target_reps: '3,3,3,3,3', // Change reps string (Agent-Native style)
      target_rpe: 9.5         // New flattened metric
    });

    expect(updateResult).toBeDefined();
    expect(updateResult?.target_sets).toBe(5);
    expect(updateResult?.target_reps).toBe('3,3,3,3,3');
    expect(updateResult?.target_rpe).toBe(9.5);

    // 3. Verification: No side effects on other exercises
    const allExercises = await db.selectFrom('session_exercise')
      .where('session_id', '=', session!.id)
      .orderBy('order_in_session', 'asc')
      .selectAll()
      .execute();

    expect(allExercises).toHaveLength(3);
    
    // First exercise should be unchanged
    expect(allExercises[0].id).toBe(exerciseIds[0]);
    expect(allExercises[0].target_sets).toBe(3);
    expect(allExercises[0].target_reps).toBe('10');
    expect(allExercises[0].target_rpe).toBeNull();

    // Second exercise should be updated
    expect(allExercises[1].id).toBe(targetExerciseId);
    expect(allExercises[1].target_sets).toBe(5);

    // Third exercise should be unchanged
    expect(allExercises[2].id).toBe(exerciseIds[2]);
    expect(allExercises[2].target_sets).toBe(3);
  });

  it('strictly enforces multi-tenant isolation during updates', async () => {
    // 1. Setup: Record in Tenant B
    const planB = await createTrainingPlan(db, {
      tenant_id: TENANT_B,
      name: 'Tenant B Secret Plan'
    });

    const sessionB = await createTrainingSession(db, {
      tenant_id: TENANT_B,
      plan_id: planB!.id
    });

    // Create an exercise in the dictionary for Tenant B
    const dictIdB = crypto.randomUUID();
    await db.insertInto('exercise_dictionary').values({
      id: dictIdB,
      tenant_id: TENANT_B,
      name: 'Secret Exercise',
      movement_category: 'core',
      exercise_type: 'dynamic',
      percent_bodyweight_used: 0,
      rounding_increment: 2.5
    }).execute();

    const exerciseB = await createSessionExercise(db, {
      tenant_id: TENANT_B,
      session_id: sessionB!.id,
      exercise_dictionary_id: dictIdB,
      order_in_session: 1,
      target_sets: 1
    });
    expect(exerciseB).toBeDefined();

    // 2. Execution: Attempt to update Tenant B record using Tenant A context
    const maliciousUpdate = await updateSessionExercise(db, {
      id: exerciseB!.id,
      tenant_id: TENANT_A, // Maliciously using different tenant_id
      target_sets: 999
    });

    // 3. Verification: Update should fail (return undefined) and record remain untouched
    expect(maliciousUpdate).toBeUndefined();

    const verifiedB = await db.selectFrom('session_exercise')
      .where('id', '=', exerciseB!.id)
      .selectAll()
      .executeTakeFirst();
    
    expect(verifiedB?.target_sets).toBe(1);
    expect(verifiedB?.tenant_id).toBe(TENANT_B);
  });
});
