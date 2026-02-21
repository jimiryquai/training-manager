import { router } from './trpc';
import { wellnessRouter } from './routers/wellnessRouter';
import { trainingRouter } from './routers/trainingRouter';

export const appRouter = router({
  wellness: wellnessRouter,
  training: trainingRouter,
});

export type AppRouter = typeof appRouter;
