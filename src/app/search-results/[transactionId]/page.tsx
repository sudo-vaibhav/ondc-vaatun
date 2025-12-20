"use client";

import { useEffect, useState, useCallback } from "react";
import { useParams, useRouter } from "next/navigation";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Separator } from "@/components/ui/separator";
import {
    ArrowLeft,
    RefreshCw,
    Radio,
    CheckCircle2,
    Clock,
    AlertCircle,
    Search
} from "lucide-react";
import ProviderCard from "@/components/search/ProviderCard";
import type { OnSearchResponse } from "@/lib/searchStore";

interface SearchResultsData {
    found: boolean;
    transactionId: string;
    messageId?: string;
    searchTimestamp?: string;
    categoryCode?: string;
    responseCount: number;
    providers: Array<{
        bppId: string;
        bppUri?: string;
        name?: string;
        itemCount: number;
        hasError: boolean;
    }>;
    responses: OnSearchResponse[];
    message?: string;
}

// Polling interval in milliseconds
const POLL_INTERVAL = 2000;
// Auto-stop polling after this many seconds
const MAX_POLL_DURATION = 60;

export default function SearchResultsPage() {
    const params = useParams();
    const router = useRouter();
    const transactionId = params.transactionId as string;

    const [data, setData] = useState<SearchResultsData | null>(null);
    const [loading, setLoading] = useState(true);
    const [error, setError] = useState<string | null>(null);
    const [isPolling, setIsPolling] = useState(true);
    const [pollStartTime] = useState(Date.now());
    const [lastResponseCount, setLastResponseCount] = useState(0);

    const fetchResults = useCallback(async () => {
        try {
            const response = await fetch(`/api/ondc/search-results?transaction_id=${transactionId}`);
            const result: SearchResultsData = await response.json();

            setData(result);
            setError(null);

            // Check if we got new responses
            if (result.responseCount > lastResponseCount) {
                setLastResponseCount(result.responseCount);
            }
        } catch (err) {
            console.error('[SearchResults] Fetch error:', err);
            setError('Failed to fetch results');
        } finally {
            setLoading(false);
        }
    }, [transactionId, lastResponseCount]);

    // Initial fetch and polling
    useEffect(() => {
        fetchResults();

        let pollInterval: NodeJS.Timeout | null = null;

        if (isPolling) {
            pollInterval = setInterval(() => {
                // Auto-stop polling after MAX_POLL_DURATION
                const elapsed = (Date.now() - pollStartTime) / 1000;
                if (elapsed > MAX_POLL_DURATION) {
                    setIsPolling(false);
                    if (pollInterval) clearInterval(pollInterval);
                    return;
                }

                fetchResults();
            }, POLL_INTERVAL);
        }

        return () => {
            if (pollInterval) clearInterval(pollInterval);
        };
    }, [fetchResults, isPolling, pollStartTime]);

    const togglePolling = () => {
        setIsPolling(!isPolling);
    };

    const formatTimestamp = (timestamp?: string) => {
        if (!timestamp) return 'N/A';
        return new Date(timestamp).toLocaleString('en-IN', {
            dateStyle: 'medium',
            timeStyle: 'short'
        });
    };

    const getElapsedTime = () => {
        if (!data?.searchTimestamp) return null;
        const elapsed = Math.floor((Date.now() - new Date(data.searchTimestamp).getTime()) / 1000);
        if (elapsed < 60) return `${elapsed}s ago`;
        return `${Math.floor(elapsed / 60)}m ${elapsed % 60}s ago`;
    };

    return (
        <div className="min-h-screen bg-background">
            {/* Header */}
            <header className="border-b-2 border-foreground bg-background sticky top-0 z-10">
                <div className="container mx-auto px-4 py-4">
                    <div className="flex items-center justify-between gap-4">
                        <div className="flex items-center gap-3">
                            <Button
                                variant="outline"
                                size="sm"
                                onClick={() => router.push('/')}
                                className="border-2 border-foreground"
                            >
                                <ArrowLeft className="h-4 w-4 mr-1" />
                                Back
                            </Button>
                            <div>
                                <h1 className="text-xl font-bold flex items-center gap-2">
                                    <Search className="h-5 w-5" />
                                    Search Results
                                </h1>
                                <p className="text-xs text-muted-foreground font-mono">
                                    {transactionId}
                                </p>
                            </div>
                        </div>

                        <div className="flex items-center gap-2">
                            {/* Polling Status */}
                            <Button
                                variant={isPolling ? "default" : "outline"}
                                size="sm"
                                onClick={togglePolling}
                                className="border-2 border-foreground"
                            >
                                {isPolling ? (
                                    <>
                                        <Radio className="h-4 w-4 mr-1 animate-pulse" />
                                        Listening...
                                    </>
                                ) : (
                                    <>
                                        <RefreshCw className="h-4 w-4 mr-1" />
                                        Resume
                                    </>
                                )}
                            </Button>
                        </div>
                    </div>
                </div>
            </header>

            <main className="container mx-auto px-4 py-8">
                {/* Stats Bar */}
                {data && (
                    <div className="mb-6 flex flex-wrap items-center gap-3">
                        <Badge
                            variant="secondary"
                            className="border-2 border-foreground px-3 py-1 text-sm"
                        >
                            <CheckCircle2 className="h-4 w-4 mr-1" />
                            {data.responseCount} response{data.responseCount !== 1 ? 's' : ''}
                        </Badge>

                        <Badge
                            variant="outline"
                            className="border-2 border-foreground px-3 py-1 text-sm"
                        >
                            {data.providers.length} provider{data.providers.length !== 1 ? 's' : ''}
                        </Badge>

                        {data.categoryCode && (
                            <Badge
                                variant="outline"
                                className="border-2 border-foreground px-3 py-1 text-sm"
                            >
                                {data.categoryCode.replace(/_/g, ' ')}
                            </Badge>
                        )}

                        {getElapsedTime() && (
                            <span className="text-sm text-muted-foreground flex items-center gap-1">
                                <Clock className="h-3 w-3" />
                                {getElapsedTime()}
                            </span>
                        )}
                    </div>
                )}

                <Separator className="mb-6 border border-foreground" />

                {/* Loading State */}
                {loading && !data && (
                    <Card className="border-2 border-foreground shadow-[4px_4px_0px_0px_rgba(0,0,0,1)]">
                        <CardContent className="py-12 text-center">
                            <RefreshCw className="h-8 w-8 mx-auto mb-4 animate-spin" />
                            <p className="text-muted-foreground">Loading search results...</p>
                        </CardContent>
                    </Card>
                )}

                {/* Error State */}
                {error && (
                    <Card className="border-2 border-destructive shadow-[4px_4px_0px_0px_rgba(0,0,0,1)]">
                        <CardContent className="py-12 text-center">
                            <AlertCircle className="h-8 w-8 mx-auto mb-4 text-destructive" />
                            <p className="text-destructive font-medium">{error}</p>
                            <Button
                                variant="outline"
                                className="mt-4 border-2 border-foreground"
                                onClick={fetchResults}
                            >
                                <RefreshCw className="h-4 w-4 mr-2" />
                                Retry
                            </Button>
                        </CardContent>
                    </Card>
                )}

                {/* Empty State */}
                {data && data.responseCount === 0 && (
                    <Card className="border-2 border-foreground shadow-[4px_4px_0px_0px_rgba(0,0,0,1)]">
                        <CardContent className="py-12 text-center">
                            {isPolling ? (
                                <>
                                    <Radio className="h-8 w-8 mx-auto mb-4 animate-pulse text-primary" />
                                    <p className="text-lg font-medium mb-2">Waiting for responses...</p>
                                    <p className="text-sm text-muted-foreground">
                                        Insurance providers are processing your search request.
                                    </p>
                                    <p className="text-xs text-muted-foreground mt-2">
                                        Results will appear automatically as providers respond.
                                    </p>
                                </>
                            ) : (
                                <>
                                    <Search className="h-8 w-8 mx-auto mb-4 text-muted-foreground" />
                                    <p className="text-lg font-medium mb-2">No responses yet</p>
                                    <p className="text-sm text-muted-foreground">
                                        No providers have responded to this search.
                                    </p>
                                    <Button
                                        variant="default"
                                        className="mt-4 border-2 border-foreground"
                                        onClick={() => setIsPolling(true)}
                                    >
                                        <Radio className="h-4 w-4 mr-2" />
                                        Resume Listening
                                    </Button>
                                </>
                            )}
                        </CardContent>
                    </Card>
                )}

                {/* Results List */}
                {data && data.responses.length > 0 && (
                    <div className="space-y-6">
                        {data.responses.map((response, index) => (
                            <ProviderCard
                                key={`${response.context.bpp_id || index}-${response._receivedAt}`}
                                response={response}
                            />
                        ))}
                    </div>
                )}

                {/* Polling indicator at bottom */}
                {isPolling && data && data.responseCount > 0 && (
                    <div className="mt-8 text-center">
                        <Badge variant="outline" className="border-2 border-foreground animate-pulse">
                            <Radio className="h-3 w-3 mr-1" />
                            Still listening for more responses...
                        </Badge>
                    </div>
                )}
            </main>
        </div>
    );
}
