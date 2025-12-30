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

/**
 * Centralized registry of all API route configurations.
 * Used by both OpenAPI generator and directory page.
 *
 * Add new routes here as they're created with routeConfig exports.
 */
export const routeConfigs: RouteConfig[] = [
  // Health & Registry
  healthRoute,
  lookupRoute,
  subscribeRoute,
  onSubscribeRoute,
  // Gateway (outbound)
  searchRoute,
  selectRoute,
  // Callbacks (inbound from BPPs)
  onSearchRoute,
  onSelectRoute,
  // Polling endpoints
  searchResultsRoute,
  selectResultsRoute,
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
