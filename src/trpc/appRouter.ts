import { router } from './trpc';
import { wellnessRouter } from './routers/wellnessRouter';
import { trainingRouter } from './routers/trainingRouter';
import { dashboardRouter } from '../fate/dashboardRouter';

export const appRouter = router({
  wellness: wellnessRouter,
  training: trainingRouter,
  dashboard: dashboardRouter,
});

export type AppRouter = typeof appRouter;
