/**
 * Routes Registry - DISABLED
 *
 * NOTE: OpenAPI spec generation has been disabled.
 * The zod-to-openapi integration was not working in a type-safe way with Zod v4,
 * and the technical benefit of generating OpenAPI specs from Zod schemas
 * did not justify the complexity and type gymnastics required.
 *
 * This file was used to collect route configurations for OpenAPI generation.
 * It is no longer needed since we're not generating OpenAPI specs from code.
 */

/*
import { routeConfig as healthRoute } from "@/app/api/ondc/health/route";
import { routeConfig as lookupRoute } from "@/app/api/ondc/lookup/route";
import { routeConfig as onSearchRoute } from "@/app/api/ondc/on_search/route";
import { routeConfig as onSelectRoute } from "@/app/api/ondc/on_select/route";
import { routeConfig as onSubscribeRoute } from "@/app/api/ondc/on_subscribe/route";
import { routeConfig as searchRoute } from "@/app/api/ondc/search/route";
import { routeConfig as searchResultsRoute } from "@/app/api/ondc/search-results/route";
import { routeConfig as selectRoute } from "@/app/api/ondc/select/route";
import { routeConfig as selectResultsRoute } from "@/app/api/ondc/select-results/route";
import { routeConfig as subscribeRoute } from "@/app/api/ondc/subscribe/route";
import type { DirectoryConfig, RouteConfig } from "./openapi";

export const routeConfigs: RouteConfig[] = [
  healthRoute,
  lookupRoute,
  subscribeRoute,
  onSubscribeRoute,
  searchRoute,
  selectRoute,
  onSearchRoute,
  onSelectRoute,
  searchResultsRoute,
  selectResultsRoute,
];

export type DirectoryRouteConfig = RouteConfig & {
  directoryConfig: DirectoryConfig;
};

export function getDirectoryRoutes(): Record<string, DirectoryRouteConfig[]> {
  return routeConfigs
    .filter(
      (route): route is DirectoryRouteConfig =>
        route.directoryConfig !== undefined,
    )
    .reduce(
      (acc, route) => {
        const tag = route.tags?.[0] ?? "Other";
        if (!acc[tag]) acc[tag] = [];
        acc[tag].push(route);
        return acc;
      },
      {} as Record<string, DirectoryRouteConfig[]>,
    );
}
*/

// Stub exports for compatibility
// export const routeConfigs: unknown[] = [];
// export const getDirectoryRoutes = () => ({});
