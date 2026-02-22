import { describe, it, expect, vi } from 'vitest';
import { libraryRouter } from '../../../src/trpc/routers/libraryRouter';
import type { Kysely } from 'kysely';
import type { Database } from '../../../src/db/schema';

const mockMasterExercise = {
  id: 'master-squat-id',
  tenant_id: 'tenant-1',
  name: 'Back Squat',
  movement_category: 'squat',
  progression_level: 5,
  exercise_type: 'dynamic',
  benchmark_target: null,
  master_exercise_id: null,
  conversion_factor: null,
};

const mockChildExercise = {
  id: 'child-goblet-id',
  tenant_id: 'tenant-1',
  name: 'Goblet Squat',
  movement_category: 'squat',
  progression_level: 2,
  exercise_type: 'dynamic',
  benchmark_target: null,
  master_exercise_id: 'master-squat-id',
  conversion_factor: 0.7,
};

const mockBenchmark = {
  id: 'benchmark-1',
  tenant_id: 'tenant-1',
  user_id: 'user-1',
  benchmark_name: 'Back Squat',
  benchmark_value: 100,
  benchmark_unit: 'kg',
  master_exercise_id: 'master-squat-id',
  one_rep_max_weight: 100,
};

const createCaller = (ctx: any) => libraryRouter.createCaller(ctx);

describe('libraryRouter', () => {
  describe('addExercise', () => {
    it('should create a master exercise', async () => {
      const mockDb = {
        insertInto: vi.fn(() => ({
          values: vi.fn(() => ({
            returningAll: vi.fn(() => ({
              executeTakeFirst: vi.fn(async () => mockMasterExercise),
            })),
          })),
        })),
      } as unknown as Kysely<Database>;

      const ctx = {
        session: { userId: 'user-1', tenantId: 'tenant-1' },
        tenantId: 'tenant-1',
        userId: 'user-1',
        db: mockDb,
      };

      const caller = createCaller(ctx);
      const result = await caller.addExercise({
        name: 'Back Squat',
        movement_category: 'squat',
        progression_level: 5,
        exercise_type: 'dynamic',
      });

      expect(result).toBeDefined();
      expect(result!.name).toBe('Back Squat');
      expect(result!.master_exercise_id).toBeNull();
    });

    it('should create a child exercise with master reference', async () => {
      const mockDb = {
        insertInto: vi.fn(() => ({
          values: vi.fn(() => ({
            returningAll: vi.fn(() => ({
              executeTakeFirst: vi.fn(async () => mockChildExercise),
            })),
          })),
        })),
      } as unknown as Kysely<Database>;

      const ctx = {
        session: { userId: 'user-1', tenantId: 'tenant-1' },
        tenantId: 'tenant-1',
        userId: 'user-1',
        db: mockDb,
      };

      const caller = createCaller(ctx);
      const result = await caller.addExercise({
        name: 'Goblet Squat',
        movement_category: 'squat',
        progression_level: 2,
        exercise_type: 'dynamic',
        master_exercise_id: 'master-squat-id',
        conversion_factor: 0.7,
      });

      expect(result).toBeDefined();
      expect(result!.name).toBe('Goblet Squat');
      expect(result!.master_exercise_id).toBe('master-squat-id');
      expect(result!.conversion_factor).toBe(0.7);
    });
  });

  describe('getExercisesByCategory', () => {
    it('should fetch exercises by movement category', async () => {
      const mockDb = {
        selectFrom: vi.fn(() => ({
          where: vi.fn(() => ({
            where: vi.fn(() => ({
              selectAll: vi.fn(() => ({
                execute: vi.fn(async () => [mockMasterExercise, mockChildExercise]),
              })),
            })),
          })),
        })),
      } as unknown as Kysely<Database>;

      const ctx = {
        session: { userId: 'user-1', tenantId: 'tenant-1' },
        tenantId: 'tenant-1',
        userId: 'user-1',
        db: mockDb,
      };

      const caller = createCaller(ctx);
      const result = await caller.getExercisesByCategory({
        movement_category: 'squat',
      });

      expect(result).toBeDefined();
      expect(result).toHaveLength(2);
      expect(result[0].movement_category).toBe('squat');
    });
  });

  describe('getExerciseWithMaster', () => {
    it('should fetch exercise with master relationship', async () => {
      const mockDb = {
        selectFrom: vi.fn(() => ({
          where: vi.fn(() => ({
            where: vi.fn(() => ({
              selectAll: vi.fn(() => ({
                executeTakeFirst: vi.fn(async () => mockChildExercise),
              })),
            })),
          })),
        })),
      } as unknown as Kysely<Database>;

      const ctx = {
        session: { userId: 'user-1', tenantId: 'tenant-1' },
        tenantId: 'tenant-1',
        userId: 'user-1',
        db: mockDb,
      };

      const caller = createCaller(ctx);
      const result = await caller.getExerciseWithMaster({
        id: 'child-goblet-id',
      });

      expect(result).toBeDefined();
      expect(result!.name).toBe('Goblet Squat');
      expect(result!.master_exercise_id).toBe('master-squat-id');
      expect(result!.conversion_factor).toBe(0.7);
    });
  });

  describe('saveUserBenchmark', () => {
    it('should create a user benchmark', async () => {
      const mockDb = {
        selectFrom: vi.fn(() => ({
          where: vi.fn(() => ({
            where: vi.fn(() => ({
              where: vi.fn(() => ({
                selectAll: vi.fn(() => ({
                  executeTakeFirst: vi.fn(async () => undefined),
                })),
              })),
            })),
          })),
        })),
        insertInto: vi.fn(() => ({
          values: vi.fn(() => ({
            returningAll: vi.fn(() => ({
              executeTakeFirst: vi.fn(async () => mockBenchmark),
            })),
          })),
        })),
      } as unknown as Kysely<Database>;

      const ctx = {
        session: { userId: 'user-1', tenantId: 'tenant-1' },
        tenantId: 'tenant-1',
        userId: 'user-1',
        db: mockDb,
      };

      const caller = createCaller(ctx);
      const result = await caller.saveUserBenchmark({
        benchmark_name: 'Back Squat',
        benchmark_value: 100,
        benchmark_unit: 'kg',
      });

      expect(result).toBeDefined();
      expect(result!.benchmark_name).toBe('Back Squat');
      expect(result!.benchmark_value).toBe(100);
    });

    it('should update existing benchmark', async () => {
      const existingBenchmark = { ...mockBenchmark, one_rep_max_weight: 80 };
      
      const mockDb = {
        selectFrom: vi.fn(() => ({
          where: vi.fn(() => ({
            where: vi.fn(() => ({
              where: vi.fn(() => ({
                selectAll: vi.fn(() => ({
                  executeTakeFirst: vi.fn(async () => existingBenchmark),
                })),
              })),
            })),
          })),
        })),
        updateTable: vi.fn(() => ({
          set: vi.fn(() => ({
            where: vi.fn(() => ({
              returningAll: vi.fn(() => ({
                executeTakeFirst: vi.fn(async () => mockBenchmark),
              })),
            })),
          })),
        })),
      } as unknown as Kysely<Database>;

      const ctx = {
        session: { userId: 'user-1', tenantId: 'tenant-1' },
        tenantId: 'tenant-1',
        userId: 'user-1',
        db: mockDb,
      };

      const caller = createCaller(ctx);
      const result = await caller.saveUserBenchmark({
        benchmark_name: 'Back Squat',
        benchmark_value: 100,
        benchmark_unit: 'kg',
      });

      expect(result).toBeDefined();
      expect(result!.benchmark_value).toBe(100);
    });
  });

  describe('Master/Child relationship verification', () => {
    it('should verify conversion factor calculation logic', async () => {
      const masterSquat = { ...mockMasterExercise, conversion_factor: null };
      const gobletSquat = { ...mockChildExercise, conversion_factor: 0.7 };

      expect(gobletSquat.master_exercise_id).toBe(masterSquat.id);
      expect(gobletSquat.conversion_factor).toBe(0.7);

      const estimatedMasterMax = 100;
      const estimatedGobletMax = estimatedMasterMax * gobletSquat.conversion_factor;
      
      expect(estimatedGobletMax).toBe(70);
    });
  });

  describe('Hybrid benchmarks (weighted + isometric)', () => {
    it('should save isometric benchmark with seconds unit', async () => {
      const mockBenchmark = {
        id: 'benchmark-isometric-1',
        tenant_id: 'tenant-1',
        user_id: 'user-1',
        benchmark_name: 'Planche',
        benchmark_value: 15,
        benchmark_unit: 'seconds' as const,
        master_exercise_id: null,
        one_rep_max_weight: null,
      };

      const mockDb = {
        selectFrom: vi.fn(() => ({
          where: vi.fn(() => ({
            where: vi.fn(() => ({
              where: vi.fn(() => ({
                selectAll: vi.fn(() => ({
                  executeTakeFirst: vi.fn(async () => undefined),
                })),
              })),
            })),
          })),
        })),
        insertInto: vi.fn(() => ({
          values: vi.fn(() => ({
            returningAll: vi.fn(() => ({
              executeTakeFirst: vi.fn(async () => mockBenchmark),
            })),
          })),
        })),
      } as unknown as Kysely<Database>;

      const ctx = {
        session: { userId: 'user-1', tenantId: 'tenant-1' },
        tenantId: 'tenant-1',
        userId: 'user-1',
        db: mockDb,
      };

      const caller = createCaller(ctx);
      const result = await caller.saveUserBenchmark({
        benchmark_name: 'Planche',
        benchmark_value: 15,
        benchmark_unit: 'seconds',
      });

      expect(result).toBeDefined();
      expect(result!.benchmark_name).toBe('Planche');
      expect(result!.benchmark_value).toBe(15);
      expect(result!.benchmark_unit).toBe('seconds');
    });

    it('should create isometric exercise with correct exercise_type', async () => {
      const mockIsometricExercise = {
        id: 'tuck-planche-id',
        tenant_id: 'tenant-1',
        name: 'Tuck Planche',
        movement_category: 'push' as const,
        progression_level: 3,
        exercise_type: 'isometric' as const,
        benchmark_target: 'Planche',
        conversion_factor: 1.0,
        master_exercise_id: null,
      };

      const mockDb = {
        insertInto: vi.fn(() => ({
          values: vi.fn(() => ({
            returningAll: vi.fn(() => ({
              executeTakeFirst: vi.fn(async () => mockIsometricExercise),
            })),
          })),
        })),
      } as unknown as Kysely<Database>;

      const ctx = {
        session: { userId: 'user-1', tenantId: 'tenant-1' },
        tenantId: 'tenant-1',
        userId: 'user-1',
        db: mockDb,
      };

      const caller = createCaller(ctx);
      const result = await caller.addExercise({
        name: 'Tuck Planche',
        movement_category: 'push',
        progression_level: 3,
        exercise_type: 'isometric',
        benchmark_target: 'Planche',
        conversion_factor: 1.0,
      });

      expect(result).toBeDefined();
      expect(result!.exercise_type).toBe('isometric');
      expect(result!.benchmark_target).toBe('Planche');
    });
  });
});
