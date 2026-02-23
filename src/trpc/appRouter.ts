import { router } from './trpc';
import { wellnessRouter } from './routers/wellnessRouter';
import { trainingRouter } from './routers/trainingRouter';
import { dashboardRouter } from '../fate/dashboardRouter';
import { libraryRouter } from './routers/libraryRouter';

export const appRouter = router({
  wellness: wellnessRouter,
  training: trainingRouter,
  dashboard: dashboardRouter,
  library: libraryRouter,
});

export type AppRouter = typeof appRouter;
