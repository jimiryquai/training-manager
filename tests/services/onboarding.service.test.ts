import { describe, it, expect, beforeEach } from 'vitest';
import { vitestInvoke } from 'rwsdk-community/test';

const TEST_TENANT = 'tenant-onboarding-test';
const TEST_USER = 'user-onboarding-test';

describe('Athlete Onboarding & Equipment Services - Integration Tests', () => {
  beforeEach(async () => {
    await vitestInvoke('test_cleanDatabase', TEST_TENANT);
    await vitestInvoke('test_cleanTrainingPlanData', TEST_TENANT);

    // Create standard test user
    await vitestInvoke('test_createUser', {
      id: TEST_USER,
      tenant_id: TEST_TENANT,
      email: 'onboarding-james@test.com',
      role: 'athlete',
    });
  });

  describe('User Demographics (Static Profile Data)', () => {
    it('should allow setting static demographics on User table', async () => {
      const updated = await vitestInvoke<any>('test_updateUser', {
        id: TEST_USER,
        tenant_id: TEST_TENANT,
        date_of_birth: '1995-04-12',
        gender: 'male',
        height_cm: 182.5,
        display_name: 'James'
      });

      expect(updated).toBeDefined();
      expect(updated.date_of_birth).toBe('1995-04-12');
      expect(updated.gender).toBe('male');
      expect(updated.height_cm).toBe(182.5);
      expect(updated.display_name).toBe('James');

      const fetched = await vitestInvoke<any>('test_getUserById', {
        id: TEST_USER,
        tenant_id: TEST_TENANT,
      });

      expect(fetched).toBeDefined();
      expect(fetched.date_of_birth).toBe('1995-04-12');
      expect(fetched.gender).toBe('male');
      expect(fetched.height_cm).toBe(182.5);
    });
  });

  describe('Athlete Profile Service', () => {
    it('should create and retrieve athlete profile training preferences', async () => {
      const profile = await vitestInvoke<any>('test_createAthleteProfile', {
        tenant_id: TEST_TENANT,
        user_id: TEST_USER,
        training_status: 'trained',
        training_age_years: 4,
        primary_goal: 'strength',
        training_days_per_week: 4,
        max_session_duration_minutes: 75,
        weekend_session_duration_minutes: 90,
        bioenergetic_limiter: 'Respiratory',
        sport_context: 'BJJ competitor',
      });

      expect(profile).toBeDefined();
      expect(profile.id).toBeDefined();
      expect(profile.user_id).toBe(TEST_USER);
      expect(profile.training_status).toBe('trained');
      expect(profile.training_age_years).toBe(4);
      expect(profile.primary_goal).toBe('strength');
      expect(profile.training_days_per_week).toBe(4);
      expect(profile.max_session_duration_minutes).toBe(75);
      expect(profile.weekend_session_duration_minutes).toBe(90);
      expect(profile.bioenergetic_limiter).toBe('Respiratory');
      expect(profile.sport_context).toBe('BJJ competitor');

      const fetched = await vitestInvoke<any>('test_getAthleteProfileByUserId', {
        user_id: TEST_USER,
        tenant_id: TEST_TENANT,
      });

      expect(fetched).toBeDefined();
      expect(fetched.id).toBe(profile.id);
      expect(fetched.primary_goal).toBe('strength');
    });

    it('should update athlete profile details', async () => {
      const created = await vitestInvoke<any>('test_createAthleteProfile', {
        tenant_id: TEST_TENANT,
        user_id: TEST_USER,
        training_status: 'untrained',
      });

      const updated = await vitestInvoke<any>('test_updateAthleteProfile', {
        id: created.id,
        tenant_id: TEST_TENANT,
        training_status: 'trained',
        training_age_years: 1,
        sport_context: 'Recreational lifter',
      });

      expect(updated).toBeDefined();
      expect(updated.training_status).toBe('trained');
      expect(updated.training_age_years).toBe(1);
      expect(updated.sport_context).toBe('Recreational lifter');
    });
  });

  describe('Injury History Service', () => {
    it('should log and retrieve injuries for a user', async () => {
      const injury = await vitestInvoke<any>('test_createInjuryRecord', {
        tenant_id: TEST_TENANT,
        user_id: TEST_USER,
        body_region: 'shoulder',
        injury_type: 'impingement',
        severity: 'moderate',
        status: 'active',
        date_occurred: '2026-01-10',
        contraindicated_movements: 'overhead pressing, behind-the-neck pull downs',
        notes: 'Flares up during high velocity push workouts',
      });

      expect(injury).toBeDefined();
      expect(injury.id).toBeDefined();
      expect(injury.body_region).toBe('shoulder');
      expect(injury.injury_type).toBe('impingement');
      expect(injury.severity).toBe('moderate');
      expect(injury.status).toBe('active');
      expect(injury.contraindicated_movements).toBe('overhead pressing, behind-the-neck pull downs');

      const injuries = await vitestInvoke<any[]>('test_getInjuriesByUserId', {
        user_id: TEST_USER,
        tenant_id: TEST_TENANT,
      });

      expect(injuries).toHaveLength(1);
      expect(injuries[0].id).toBe(injury.id);
      expect(injuries[0].injury_type).toBe('impingement');
    });

    it('should update injury recovery status', async () => {
      const created = await vitestInvoke<any>('test_createInjuryRecord', {
        tenant_id: TEST_TENANT,
        user_id: TEST_USER,
        body_region: 'knee',
        injury_type: 'patellar tendonitis',
        severity: 'mild',
        status: 'active',
      });

      const updated = await vitestInvoke<any>('test_updateInjuryRecord', {
        id: created.id,
        tenant_id: TEST_TENANT,
        status: 'recovered',
        notes: 'Fully resolved after eccentric squat program',
      });

      expect(updated).toBeDefined();
      expect(updated.status).toBe('recovered');
      expect(updated.notes).toBe('Fully resolved after eccentric squat program');
    });
  });

  describe('Equipment Reference & Junction Services', () => {
    it('should support creating and deleting reference equipment', async () => {
      const equip = await vitestInvoke<any>('test_createEquipment', {
        tenant_id: null, // global system template
        name: 'test_kettlebell_16kg',
        notes: 'A standard 16kg kettlebell',
      });

      expect(equip).toBeDefined();
      expect(equip.name).toBe('test_kettlebell_16kg');
      expect(equip.tenant_id).toBeNull();

      const found = await vitestInvoke<any>('test_getEquipmentById', {
        id: equip.id,
        tenant_id: null,
      });
      expect(found).toBeDefined();
      expect(found.name).toBe('test_kettlebell_16kg');

      // Clean up reference equipment
      const deleted = await vitestInvoke<boolean>('test_deleteEquipment', {
        id: equip.id,
        tenant_id: null,
      });
      expect(deleted).toBe(true);
    });

    it('should allow assigning and retrieving athlete-specific equipment access', async () => {
      // Find standard barbell (seeded in migration 0009) or create a test equipment
      const equip = await vitestInvoke<any>('test_createEquipment', {
        tenant_id: TEST_TENANT,
        name: 'Bumper Plates 150kg',
      });

      // Link athlete to this equipment
      const assigned = await vitestInvoke<any>('test_assignAthleteEquipment', {
        tenant_id: TEST_TENANT,
        user_id: TEST_USER,
        equipment_id: equip.id,
      });

      expect(assigned).toBeDefined();
      expect(assigned.equipment_id).toBe(equip.id);

      // Get equipment athlete has access to
      const list = await vitestInvoke<any[]>('test_getAthleteEquipment', {
        tenant_id: TEST_TENANT,
        user_id: TEST_USER,
      });

      // Should contain the assigned plates
      expect(list.some(e => e.id === equip.id)).toBe(true);

      // Clean up assignment
      const removed = await vitestInvoke<boolean>('test_removeAthleteEquipment', {
        tenant_id: TEST_TENANT,
        user_id: TEST_USER,
        equipment_id: equip.id,
      });
      expect(removed).toBe(true);
    });

    it('should allow linking exercise template to required equipment', async () => {
      // 1. Create exercise dictionary entry
      const exercise = await vitestInvoke<any>('test_createExercise', {
        tenant_id: null,
        name: 'Rings Muscle Up',
        movement_category: 'gymnastic_pull',
        exercise_type: 'dynamic',
      });

      // 2. Create equipment entry
      const equip = await vitestInvoke<any>('test_createEquipment', {
        tenant_id: null,
        name: 'Gymnastic Rings',
      });

      // 3. Link exercise to equipment requirement
      const linked = await vitestInvoke<any>('test_assignExerciseEquipment', {
        tenant_id: null,
        exercise_dictionary_id: exercise.id,
        equipment_id: equip.id,
      });

      expect(linked).toBeDefined();
      expect(linked.exercise_dictionary_id).toBe(exercise.id);
      expect(linked.equipment_id).toBe(equip.id);

      // 4. Retrieve required equipment for exercise
      const required = await vitestInvoke<any[]>('test_getExerciseEquipment', {
        tenant_id: null,
        exercise_dictionary_id: exercise.id,
      });

      expect(required).toHaveLength(1);
      expect(required[0].name).toBe('Gymnastic Rings');

      // 5. Clean up link
      const unlinked = await vitestInvoke<boolean>('test_removeExerciseEquipment', {
        tenant_id: null,
        exercise_dictionary_id: exercise.id,
        equipment_id: equip.id,
      });
      expect(unlinked).toBe(true);
    });
  });
});
