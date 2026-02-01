import { router } from "./trpc";
import { healthRouter } from "./routers/health";
import { registryRouter } from "./routers/registry";
import { gatewayRouter } from "./routers/gateway";
import { resultsRouter } from "./routers/results";

export const appRouter = router({
  health: healthRouter,
  registry: registryRouter,
  gateway: gatewayRouter,
  results: resultsRouter,
});

export type AppRouter = typeof appRouter;
