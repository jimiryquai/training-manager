import { router } from './trpc';
import { wellnessRouter } from './routers/wellnessRouter';
import { trainingRouter } from './routers/trainingRouter';
import { trainingPlanRouter } from './routers/trainingPlanRouter';
import { trainingSessionRouter } from './routers/trainingSessionRouter';
import { dashboardRouter } from '../fate/dashboardRouter';
import { libraryRouter } from './routers/libraryRouter';

export const appRouter = router({
  wellness: wellnessRouter,
  training: trainingRouter,
  trainingPlan: trainingPlanRouter,
  trainingSession: trainingSessionRouter,
  dashboard: dashboardRouter,
  library: libraryRouter,
});

export type AppRouter = typeof appRouter;
