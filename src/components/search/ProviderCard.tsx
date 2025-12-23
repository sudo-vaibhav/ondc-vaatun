"use client";
import { AlertCircle, Building2, Package } from "lucide-react";
import Image from "next/image";
import { Badge } from "@/components/ui/badge";
import {
  Card,
  CardContent,
  CardDescription,
  CardHeader,
  CardTitle,
} from "@/components/ui/card";
import { Separator } from "@/components/ui/separator";
import type { OnSearchResponse } from "@/lib/search-store";
import ItemCard, { type SelectionData } from "./ItemCard";

interface ProviderCardProps {
  response: OnSearchResponse;
  onItemSelect?: (data: SelectionData) => void;
  selectingItemId?: string | null;
}

export default function ProviderCard({
  response,
  onItemSelect,
  selectingItemId,
}: ProviderCardProps) {
  const { context, message, error } = response;
  const catalog = message?.catalog;
  const catalogDescriptor = catalog?.descriptor;
  const providers = catalog?.providers || [];

  const bppId = context.bpp_id || "Unknown Provider";
  const bppUri = context.bpp_uri || "";
  const bppName =
    catalogDescriptor?.name || providers[0]?.descriptor?.name || bppId;
  const bppLogo =
    catalogDescriptor?.images?.[0]?.url ||
    providers[0]?.descriptor?.images?.[0]?.url;

  // Count total items across all providers
  const totalItems = providers.reduce(
    (sum, p) => sum + (p.items?.length || 0),
    0,
  );

  // If this is an error response
  if (error) {
    return (
      <Card className="border-2 border-destructive shadow-[4px_4px_0px_0px_rgba(0,0,0,1)] dark:shadow-[4px_4px_0px_0px_rgba(255,255,255,1)]">
        <CardHeader>
          <div className="flex items-center gap-3">
            <div className="h-10 w-10 rounded border-2 border-foreground flex items-center justify-center bg-destructive/10">
              <AlertCircle className="h-5 w-5 text-destructive" />
            </div>
            <div className="flex-1">
              <CardTitle className="text-lg">{bppName}</CardTitle>
              <CardDescription className="text-xs font-mono">
                {bppId}
              </CardDescription>
            </div>
            <Badge variant="destructive" className="border-2 border-foreground">
              Error {error.code}
            </Badge>
          </div>
        </CardHeader>
        <CardContent>
          <p className="text-sm text-muted-foreground">
            {error.message || "This provider returned an error response"}
          </p>
        </CardContent>
      </Card>
    );
  }

  return (
    <Card className="border-2 border-foreground shadow-[4px_4px_0px_0px_rgba(0,0,0,1)] dark:shadow-[4px_4px_0px_0px_rgba(255,255,255,1)]">
      <CardHeader>
        <div className="flex items-center gap-3">
          {/* Provider Logo */}
          {bppLogo ? (
            <Image
              width={40}
              height={40}
              // height={40}
              src={bppLogo}
              alt={bppName}
              className="h-10 w-10 rounded object-contain bg-white"
            />
          ) : (
            <div className="h-10 w-10 rounded border-2 border-foreground flex items-center justify-center bg-muted">
              <Building2 className="h-5 w-5" />
            </div>
          )}

          <div className="flex-1">
            <CardTitle className="text-lg">{bppName}</CardTitle>
            <CardDescription className="text-xs font-mono truncate max-w-[300px]">
              {bppId}
            </CardDescription>
          </div>

          <Badge
            variant="secondary"
            className="border-2 border-foreground flex items-center gap-1"
          >
            <Package className="h-3 w-3" />
            {totalItems} product{totalItems !== 1 ? "s" : ""}
          </Badge>
        </div>

        {catalogDescriptor?.short_desc && (
          <p className="text-sm text-muted-foreground mt-2">
            {catalogDescriptor.short_desc}
          </p>
        )}
      </CardHeader>

      <Separator className="border border-foreground" />

      <CardContent className="pt-4">
        {providers.map((provider) => (
          <div key={provider.id} className="mb-4 last:mb-0">
            {/* Show provider name if different from catalog name */}
            {providers.length > 1 && provider.descriptor?.name && (
              <h4 className="font-semibold text-sm mb-2">
                {provider.descriptor.name}
              </h4>
            )}

            {/* Items Grid */}
            <div className="grid grid-cols-1 md:grid-cols-2 gap-3">
              {provider.items?.map((item) => (
                <ItemCard
                  key={item.id}
                  item={item}
                  providerId={provider.id}
                  bppId={bppId}
                  bppUri={bppUri}
                  onSelect={onItemSelect}
                  isSelecting={selectingItemId === item.id}
                />
              ))}
            </div>
          </div>
        ))}

        {totalItems === 0 && (
          <p className="text-sm text-muted-foreground text-center py-4">
            No products available from this provider
          </p>
        )}
      </CardContent>
    </Card>
  );
}
