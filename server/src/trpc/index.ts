import { gatewayRouter } from "./routers/gateway";
import { healthRouter } from "./routers/health";
import { registryRouter } from "./routers/registry";
import { resultsRouter } from "./routers/results";
import { router } from "./trpc";

export const appRouter = router({
  health: healthRouter,
  registry: registryRouter,
  gateway: gatewayRouter,
  results: resultsRouter,
});

export type AppRouter = typeof appRouter;
