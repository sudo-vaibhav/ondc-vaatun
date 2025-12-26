import { routeConfig as healthRoute } from "@/app/api/ondc/health/route";
import { routeConfig as lookupRoute } from "@/app/api/ondc/lookup/route";
import type { DirectoryConfig, RouteConfig } from "./openapi";

/**
 * Centralized registry of all API route configurations.
 * Used by both OpenAPI generator and directory page.
 *
 * Add new routes here as they're created with routeConfig exports.
 */
export const routeConfigs: RouteConfig[] = [
  healthRoute,
  lookupRoute,
  // Add more routes here as they're created
  // subscribeRoute,
  // searchRoute,
];

/**
 * Route config with directoryConfig guaranteed to be present.
 */
export type DirectoryRouteConfig = RouteConfig & {
  directoryConfig: DirectoryConfig;
};

/**
 * Get routes that should be displayed in the API Directory,
 * grouped by their OpenAPI tag.
 *
 * Only routes with `directoryConfig` defined will be included.
 */
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
