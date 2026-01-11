"use client";

import { AlertTriangle, Building2, HeartPulse, Package, Search } from "lucide-react";
import Image from "next/image";
import { useParams, useRouter } from "next/navigation";
import { useCallback, useEffect, useMemo, useState } from "react";
import { Badge } from "@/components/ui/badge";
import {
  Card,
  CardContent,
  CardDescription,
  CardHeader,
  CardTitle,
} from "@/components/ui/card";
import {
  HoverCard,
  HoverCardContent,
  HoverCardTrigger,
} from "@/components/ui/hover-card";
import { Separator } from "@/components/ui/separator";
import { HealthItemCard } from "@/components/product/HealthItemCard";
import { ProductHeader } from "@/components/product/ProductHeader";
import { useProductSearch } from "@/components/product/useProductSearch";
import type { SelectionData } from "@/components/search/ItemCard";
import type { OnSearchResponse } from "@/lib/search-store";

export default function HealthSearchPage() {
  const params = useParams();
  const router = useRouter();
  const searchId = params.searchId as string;
  const [selectingItemId, setSelectingItemId] = useState<string | null>(null);

  const { status, responses, responseCount, reconnect } = useProductSearch({
    transactionId: searchId,
  });

  const handleItemSelect = useCallback(
    async (data: SelectionData) => {
      setSelectingItemId(data.itemId);
      try {
        const response = await fetch("/api/ondc/select", {
          method: "POST",
          headers: { "Content-Type": "application/json" },
          body: JSON.stringify({
            transactionId: searchId,
            bppId: data.bppId,
            bppUri: data.bppUri,
            providerId: data.providerId,
            itemId: data.itemId,
            parentItemId: data.parentItemId,
          }),
        });

        if (!response.ok) {
          throw new Error("Failed to select item");
        }

        const result = await response.json();
        router.push(`/quote/${result.transactionId}/${result.messageId}`);
      } catch (error) {
        console.error("Selection error:", error);
        setSelectingItemId(null);
      }
    },
    [searchId, router],
  );

  // Filter out responses with errors
  const { validResponses, errorResponses } = useMemo(() => {
    return {
      validResponses: responses.filter((response) => !response.error),
      errorResponses: responses.filter((response) => response.error),
    };
  }, [responses]);

  // Log errors to console for debugging
  useEffect(() => {
    for (const response of errorResponses) {
      console.error(
        `[Health Search] Provider ${response.context.bpp_id} returned error:`,
        response.error,
      );
    }
  }, [errorResponses]);

  // Count total items across valid responses only
  const totalItems = validResponses.reduce((sum, response) => {
    const providers = response.message?.catalog?.providers || [];
    return sum + providers.reduce((pSum, p) => pSum + (p.items?.length || 0), 0);
  }, 0);

  return (
    <div className="min-h-screen bg-background">
      <ProductHeader
        productType="health"
        transactionId={searchId}
        status={status}
        responseCount={responseCount}
        onReconnect={reconnect}
      />

      <main className="container mx-auto px-4 py-8">
        {/* Stats Bar */}
        <div className="flex items-center gap-4 mb-8 p-4 rounded-xl bg-primary/5 border-2 border-primary/10">
          <div className="flex items-center gap-2">
            <Building2 className="h-5 w-5 text-primary" />
            <span className="text-lg font-bold">{validResponses.length}</span>
            <span className="text-muted-foreground">
              provider{validResponses.length !== 1 ? "s" : ""}
            </span>
          </div>
          <Separator orientation="vertical" className="h-6" />
          <div className="flex items-center gap-2">
            <Package className="h-5 w-5 text-primary" />
            <span className="text-lg font-bold">{totalItems}</span>
            <span className="text-muted-foreground">
              plan{totalItems !== 1 ? "s" : ""}
            </span>
          </div>
          {status === "streaming" && (
            <>
              <Separator orientation="vertical" className="h-6" />
              <span className="text-sm text-muted-foreground animate-pulse">
                Searching for more plans...
              </span>
            </>
          )}
          {errorResponses.length > 0 && (
            <>
              <Separator orientation="vertical" className="h-6" />
              <HoverCard>
                <HoverCardTrigger asChild>
                  <button className="flex items-center gap-2 text-destructive hover:underline cursor-pointer">
                    <AlertTriangle className="h-4 w-4" />
                    <span className="text-sm">
                      {errorResponses.length} provider{errorResponses.length !== 1 ? "s" : ""} failed
                    </span>
                  </button>
                </HoverCardTrigger>
                <HoverCardContent className="w-80">
                  <div className="space-y-3">
                    <h4 className="text-sm font-semibold text-destructive flex items-center gap-2">
                      <AlertTriangle className="h-4 w-4" />
                      Failed Providers
                    </h4>
                    <div className="space-y-2">
                      {errorResponses.map((response) => (
                        <div
                          key={response.context.message_id}
                          className="text-sm border-l-2 border-destructive/30 pl-2"
                        >
                          <p className="font-medium truncate">
                            {response.context.bpp_id}
                          </p>
                          <p className="text-xs text-muted-foreground">
                            Error {response.error?.code}: {response.error?.message || "Unknown error"}
                          </p>
                        </div>
                      ))}
                    </div>
                  </div>
                </HoverCardContent>
              </HoverCard>
            </>
          )}
        </div>

        {/* Results */}
        {status === "connecting" && (
          <div className="flex flex-col items-center justify-center py-20">
            <div className="relative">
              <HeartPulse className="h-16 w-16 text-primary animate-pulse" />
              <div className="absolute inset-0 h-16 w-16 rounded-full border-2 border-primary/30 animate-ping" />
            </div>
            <h2 className="mt-6 text-xl font-bold">
              Connecting to Health Insurers
            </h2>
            <p className="mt-2 text-muted-foreground">
              Please wait while we establish a live connection...
            </p>
          </div>
        )}

        {status === "streaming" && validResponses.length === 0 && (
          <div className="flex flex-col items-center justify-center py-20">
            <Search className="h-16 w-16 text-primary animate-bounce" />
            <h2 className="mt-6 text-xl font-bold">
              Searching Health Insurance Network
            </h2>
            <p className="mt-2 text-muted-foreground">
              Waiting for insurers to respond with their plans...
            </p>
          </div>
        )}

        {status === "error" && (
          <div className="flex flex-col items-center justify-center py-20">
            <div className="p-4 rounded-full bg-destructive/10">
              <HeartPulse className="h-16 w-16 text-destructive" />
            </div>
            <h2 className="mt-6 text-xl font-bold">Connection Error</h2>
            <p className="mt-2 text-muted-foreground">
              Failed to connect to the insurance network. Please try again.
            </p>
          </div>
        )}

        {validResponses.length > 0 && (
          <div className="space-y-6">
            {validResponses.map((response) => (
              <HealthProviderCard
                key={`${response.context.bpp_id}-${response.context.message_id}`}
                response={response}
                onItemSelect={handleItemSelect}
                selectingItemId={selectingItemId}
              />
            ))}
          </div>
        )}

        {status === "complete" && validResponses.length === 0 && (
          <div className="flex flex-col items-center justify-center py-20">
            <div className="p-4 rounded-full bg-muted">
              <HeartPulse className="h-16 w-16 text-muted-foreground" />
            </div>
            <h2 className="mt-6 text-xl font-bold">No Health Plans Found</h2>
            <p className="mt-2 text-muted-foreground">
              No health insurers responded to this search. Please try again
              later.
            </p>
          </div>
        )}
      </main>
    </div>
  );
}

// Health-specific provider card with green/teal theming
function HealthProviderCard({
  response,
  onItemSelect,
  selectingItemId,
}: {
  response: OnSearchResponse;
  onItemSelect?: (data: SelectionData) => void;
  selectingItemId?: string | null;
}) {
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

  const totalItems = providers.reduce(
    (sum, p) => sum + (p.items?.length || 0),
    0,
  );

  if (error) {
    return (
      <Card className="border-2 border-destructive shadow-[4px_4px_0px_0px] shadow-destructive/20">
        <CardHeader>
          <div className="flex items-center gap-3">
            <div className="h-10 w-10 rounded-lg border-2 border-foreground flex items-center justify-center bg-destructive/10">
              <HeartPulse className="h-5 w-5 text-destructive" />
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
    <Card className="border-2 border-primary/20 shadow-[4px_4px_0px_0px] shadow-primary/10">
      <CardHeader className="bg-gradient-to-r from-primary/5 to-transparent">
        <div className="flex items-center gap-3">
          {bppLogo ? (
            <Image
              width={48}
              height={48}
              src={bppLogo}
              alt={bppName}
              className="h-12 w-12 rounded-lg object-contain bg-white border-2 border-primary/20"
            />
          ) : (
            <div className="h-12 w-12 rounded-lg border-2 border-primary/30 flex items-center justify-center bg-primary/10">
              <HeartPulse className="h-6 w-6 text-primary" />
            </div>
          )}

          <div className="flex-1">
            <CardTitle className="text-lg">{bppName}</CardTitle>
            <CardDescription className="text-xs font-mono truncate max-w-[300px]">
              {bppId}
            </CardDescription>
          </div>

          <Badge className="bg-primary/10 text-primary border-2 border-primary/30 flex items-center gap-1">
            <Package className="h-3 w-3" />
            {totalItems} plan{totalItems !== 1 ? "s" : ""}
          </Badge>
        </div>

        {catalogDescriptor?.short_desc && (
          <p className="text-sm text-muted-foreground mt-2">
            {catalogDescriptor.short_desc}
          </p>
        )}
      </CardHeader>

      <Separator className="border border-primary/10" />

      <CardContent className="pt-4">
        {providers.map((provider) => (
          <div key={provider.id} className="mb-4 last:mb-0">
            {providers.length > 1 && provider.descriptor?.name && (
              <h4 className="font-semibold text-sm mb-2 text-primary">
                {provider.descriptor.name}
              </h4>
            )}

            <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
              {provider.items?.map((item) => (
                <HealthItemCard
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
            No health plans available from this provider
          </p>
        )}
      </CardContent>
    </Card>
  );
}
