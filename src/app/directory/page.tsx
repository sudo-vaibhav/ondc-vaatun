import { ArrowLeft } from "lucide-react";
import Link from "next/link";
import { ApiTrigger } from "@/components/ApiTrigger";
import { Header } from "@/components/header";
import { Button } from "@/components/ui/button";

export default function DirectoryPage() {
  return (
    <div className="min-h-screen bg-background">
      <Header />

      <section className="container mx-auto px-4 py-8">
        <div className="mb-8">
          <Button variant="ghost" asChild className="mb-4">
            <Link href="/">
              <ArrowLeft className="mr-2 h-4 w-4" />
              Back to Home
            </Link>
          </Button>
          <h1 className="text-4xl font-bold">API Directory</h1>
          <p className="mt-2 text-lg text-muted-foreground">
            Test ONDC API endpoints with preset payloads
          </p>
        </div>

        {/* Registry Section */}
        <div className="mb-10">
          <h2 className="mb-4 text-2xl font-semibold">Registry</h2>
          <p className="mb-6 text-muted-foreground">
            Endpoints for ONDC Registry operations - subscriber management,
            lookup, and verification.
          </p>
          <div className="grid gap-6 md:grid-cols-2">
            <ApiTrigger
              title="Registry Lookup"
              description="Look up subscribers in the ONDC registry"
              endpoint="/api/ondc/lookup"
              method="POST"
              payload={{}}
            />

            <ApiTrigger
              title="Subscribe"
              description="Send subscription request to ONDC registry"
              endpoint="/api/ondc/subscribe"
              method="POST"
              payload={{}}
            />
          </div>
        </div>

        {/* Gateway Section */}
        <div className="mb-10">
          <h2 className="mb-4 text-2xl font-semibold">Gateway</h2>
          <p className="mb-6 text-muted-foreground">
            Endpoints for ONDC Gateway operations - transaction flows like
            search, select, init, and confirm.
          </p>
          <div className="grid gap-6 md:grid-cols-2">
            <ApiTrigger
              title="Search"
              description="Trigger an insurance search on the ONDC network"
              endpoint="/api/ondc/search"
              method="POST"
              payload={{}}
            />
          </div>
        </div>

        {/* Internal Section */}
        <div className="mb-10">
          <h2 className="mb-4 text-2xl font-semibold">Internal</h2>
          <p className="mb-6 text-muted-foreground">
            Utility endpoints for health checks and internal operations.
          </p>
          <div className="grid gap-6 md:grid-cols-2">
            <ApiTrigger
              title="Health Check"
              description="Check if the service is running"
              endpoint="/api/ondc/health"
              method="GET"
            />
          </div>
        </div>
      </section>
    </div>
  );
}
