import { CheckCircle2, Code2, Lock, Server, Shield, Zap } from "lucide-react";
import { Header } from "@/components/header";
import RotatingText from "@/components/RotatingText";
import SearchTrigger from "@/components/SearchTrigger";
import SubscriptionTrigger from "@/components/SubscriptionTrigger";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import {
  Card,
  CardContent,
  CardDescription,
  CardHeader,
  CardTitle,
} from "@/components/ui/card";
import { Separator } from "@/components/ui/separator";

export default function Home() {
  return (
    <div className="min-h-screen bg-background">
      <Header />

      {/* Hero Section */}
      <section className="container mx-auto px-4 py-16 md:py-24">
        <div className="mx-auto max-w-4xl text-center">
          <Badge
            variant="secondary"
            className="mb-4 border-2 border-foreground px-4 py-1"
          >
            ONDC Network Integration
          </Badge>
          <h1 className="mb-6 text-5xl font-bold tracking-tight md:text-7xl">
            ONDC Vaatun
          </h1>
          <p className="mb-4 text-xl text-muted-foreground md:text-2xl">
            A Next.js service for integrating with the{" "}
            <a
              href="https://ondc.org/"
              target="_blank"
              rel="noopener noreferrer"
              className="font-semibold text-foreground underline decoration-2 underline-offset-4"
            >
              Open Network for Digital Commerce
            </a>
            . Handle subscription verification, domain ownership, and
            cryptographic operations with ease.
          </p>
          <p className="mb-8 text-base text-muted-foreground md:text-lg">
            Built by{" "}
            <a
              href="https://www.vaatun.com"
              target="_blank"
              rel="noopener noreferrer"
              className="font-semibold text-foreground underline decoration-2 underline-offset-4"
            >
              Vaatun
            </a>
          </p>
          <div className="flex flex-col gap-4 sm:flex-row sm:justify-center">
            <Button
              size="lg"
              className="border-2 border-foreground shadow-[4px_4px_0px_0px_rgba(0,0,0,1)] dark:shadow-[4px_4px_0px_0px_rgba(255,255,255,1)] transition-all hover:shadow-[2px_2px_0px_0px_rgba(0,0,0,1)] dark:hover:shadow-[2px_2px_0px_0px_rgba(255,255,255,1)] hover:translate-x-[2px] hover:translate-y-[2px]"
            >
              <a href="#api-endpoints" className="flex items-center gap-2">
                <Zap className="h-5 w-5" />
                View API Endpoints
              </a>
            </Button>
            <Button
              size="lg"
              variant="outline"
              className="border-2 border-foreground shadow-[4px_4px_0px_0px_rgba(0,0,0,1)] dark:shadow-[4px_4px_0px_0px_rgba(255,255,255,1)] transition-all hover:shadow-[2px_2px_0px_0px_rgba(0,0,0,1)] dark:hover:shadow-[2px_2px_0px_0px_rgba(255,255,255,1)] hover:translate-x-[2px] hover:translate-y-[2px]"
            >
              <a
                href="https://www.vaatun.com"
                target="_blank"
                rel="noopener noreferrer"
                className="flex items-center gap-2"
              >
                <Code2 className="h-5 w-5" />
                Learn about Vaatun
              </a>
            </Button>
          </div>
        </div>
      </section>

      <Separator className="my-8 border-2 border-foreground" />

      {/* What is ONDC Section */}
      <section className="container mx-auto px-4 py-16">
        <div className="mx-auto max-w-3xl">
          <h2 className="mb-4 text-3xl font-bold">What is ONDC?</h2>
          <p className="text-lg text-muted-foreground">
            The{" "}
            <a
              href="https://ondc.org/"
              target="_blank"
              rel="noopener noreferrer"
              className="font-semibold text-primary underline decoration-2 underline-offset-4"
            >
              Open Network for Digital Commerce (ONDC)
            </a>{" "}
            is a Government of India initiative to democratize e-commerce by
            creating an open, interoperable network. It enables buyers and
            sellers to transact regardless of the platform they use, breaking
            down digital commerce silos.
          </p>
        </div>
      </section>

      <Separator className="my-8 border-2 border-foreground" />

      {/* Features Section */}
      <section id="features" className="container mx-auto px-4 py-16">
        <div className="mx-auto max-w-6xl">
          <h2 className="mb-12 text-center text-4xl font-bold">Features</h2>
          <div className="grid gap-6 md:grid-cols-2 lg:grid-cols-3">
            <Card className="border-2 border-foreground shadow-[4px_4px_0px_0px_rgba(0,0,0,1)] dark:shadow-[4px_4px_0px_0px_rgba(255,255,255,1)]">
              <CardHeader>
                <Shield className="mb-2 h-10 w-10" />
                <CardTitle>Subscription Verification</CardTitle>
                <CardDescription>
                  Handle ONDC challenge-response verification using AES-256-ECB
                  encryption
                </CardDescription>
              </CardHeader>
            </Card>

            <Card className="border-2 border-foreground shadow-[4px_4px_0px_0px_rgba(0,0,0,1)] dark:shadow-[4px_4px_0px_0px_rgba(255,255,255,1)]">
              <CardHeader>
                <CheckCircle2 className="mb-2 h-10 w-10" />
                <CardTitle>Domain Verification</CardTitle>
                <CardDescription>
                  Serve signed verification pages to prove domain ownership with
                  Ed25519 signatures
                </CardDescription>
              </CardHeader>
            </Card>

            <Card className="border-2 border-foreground shadow-[4px_4px_0px_0px_rgba(0,0,0,1)] dark:shadow-[4px_4px_0px_0px_rgba(255,255,255,1)]">
              <CardHeader>
                <Lock className="mb-2 h-10 w-10" />
                <CardTitle>Secure Key Management</CardTitle>
                <CardDescription>
                  Environment-based configuration for X25519 and Ed25519 private
                  keys
                </CardDescription>
              </CardHeader>
            </Card>

            <Card className="border-2 border-foreground shadow-[4px_4px_0px_0px_rgba(0,0,0,1)] dark:shadow-[4px_4px_0px_0px_rgba(255,255,255,1)]">
              <CardHeader>
                <Server className="mb-2 h-10 w-10" />
                <CardTitle>Health Monitoring</CardTitle>
                <CardDescription>
                  Built-in health check endpoints for monitoring service
                  availability
                </CardDescription>
              </CardHeader>
            </Card>

            <Card className="border-2 border-foreground shadow-[4px_4px_0px_0px_rgba(0,0,0,1)] dark:shadow-[4px_4px_0px_0px_rgba(255,255,255,1)]">
              <CardHeader>
                <Code2 className="mb-2 h-10 w-10" />
                <CardTitle>TypeScript</CardTitle>
                <CardDescription>
                  Full type safety throughout the application with modern
                  Next.js 16
                </CardDescription>
              </CardHeader>
            </Card>

            <Card className="border-2 border-foreground shadow-[4px_4px_0px_0px_rgba(0,0,0,1)] dark:shadow-[4px_4px_0px_0px_rgba(255,255,255,1)]">
              <CardHeader>
                <Zap className="mb-2 h-10 w-10" />
                <CardTitle>High Performance</CardTitle>
                <CardDescription>
                  Pre-computed Diffie-Hellman shared secrets for fast
                  cryptographic operations
                </CardDescription>
              </CardHeader>
            </Card>
          </div>
        </div>
      </section>

      <Separator className="my-8 border-2 border-foreground" />

      {/* API Endpoints Section */}
      <section id="api-endpoints" className="container mx-auto px-4 py-16">
        <div className="mx-auto max-w-5xl">
          <h2 className="mb-12 text-center text-4xl font-bold">
            API Endpoints
          </h2>

          <div className="space-y-6">
            {/* On Subscribe Endpoint */}
            <Card className="border-2 border-foreground shadow-[4px_4px_0px_0px_rgba(0,0,0,1)] dark:shadow-[4px_4px_0px_0px_rgba(255,255,255,1)]">
              <CardHeader>
                <div className="flex items-center gap-3">
                  <Badge className="border-2 border-foreground font-mono">
                    POST
                  </Badge>
                  <code className="text-lg font-semibold">
                    /api/ondc/on_subscribe
                  </code>
                </div>
                <CardTitle className="mt-4">
                  ONDC Subscription Endpoint
                </CardTitle>
                <CardDescription>
                  Handles ONDC subscription challenge-response verification
                </CardDescription>
              </CardHeader>
              <CardContent>
                <div className="space-y-4">
                  <div>
                    <h4 className="mb-2 font-semibold">How it works:</h4>
                    <ol className="list-decimal space-y-1 pl-5 text-sm text-muted-foreground">
                      <li>
                        ONDC sends an encrypted challenge using AES-256-ECB
                      </li>
                      <li>
                        The endpoint decrypts it using the Diffie-Hellman shared
                        secret
                      </li>
                      <li>
                        Returns the decrypted answer to verify successful
                        subscription
                      </li>
                    </ol>
                  </div>
                  <div>
                    <h4 className="mb-2 font-semibold">Request Body:</h4>
                    <pre className="overflow-x-auto rounded border-2 border-foreground bg-muted p-3 text-xs">
                      {`{
                        "subscriber_id": "ondc-staging.vaatun.com",
                        "challenge": "encrypted_challenge_string"
                      }`}
                    </pre>
                  </div>
                  <div>
                    <h4 className="mb-2 font-semibold">Response:</h4>
                    <pre className="overflow-x-auto rounded border-2 border-foreground bg-muted p-3 text-xs">
                      {`{
                        "answer": "decrypted_challenge_string"
                      }`}
                    </pre>
                  </div>
                </div>
              </CardContent>
            </Card>

            {/* Site Verification Endpoint */}
            <Card className="border-2 border-foreground shadow-[4px_4px_0px_0px_rgba(0,0,0,1)] dark:shadow-[4px_4px_0px_0px_rgba(255,255,255,1)]">
              <CardHeader>
                <div className="flex items-center gap-3">
                  <Badge
                    variant="secondary"
                    className="border-2 border-foreground font-mono"
                  >
                    GET
                  </Badge>
                  <code className="text-lg font-semibold">
                    /ondc-site-verification.html
                  </code>
                </div>
                <CardTitle className="mt-4">Site Verification</CardTitle>
                <CardDescription>
                  Serves HTML page with signed meta tag for domain verification
                </CardDescription>
              </CardHeader>
              <CardContent>
                <div>
                  <h4 className="mb-2 font-semibold">Response:</h4>
                  <pre className="overflow-x-auto rounded border-2 border-foreground bg-muted p-3 text-xs">
                    {`<html>
  <head>
    <meta name="ondc-site-verification"
          content="SIGNED_REQUEST_ID" />
  </head>
  <body>ONDC Site Verification Page</body>
</html>`}
                  </pre>
                </div>
              </CardContent>
            </Card>

            {/* Health Check Endpoint */}
            <Card className="border-2 border-foreground shadow-[4px_4px_0px_0px_rgba(0,0,0,1)] dark:shadow-[4px_4px_0px_0px_rgba(255,255,255,1)]">
              <CardHeader>
                <div className="flex items-center gap-3">
                  <Badge
                    variant="secondary"
                    className="border-2 border-foreground font-mono"
                  >
                    GET
                  </Badge>
                  <code className="text-lg font-semibold">
                    /api/ondc/health
                  </code>
                </div>
                <CardTitle className="mt-4">Health Check</CardTitle>
                <CardDescription>
                  Monitor service availability and status
                </CardDescription>
              </CardHeader>
              <CardContent>
                <div>
                  <h4 className="mb-2 font-semibold">Response:</h4>
                  <pre className="overflow-x-auto rounded border-2 border-foreground bg-muted p-3 text-xs">
                    {`{
  "status": "Health OK!!"
}`}
                  </pre>
                </div>
              </CardContent>
            </Card>
          </div>
        </div>
      </section>

      <Separator className="my-8 border-2 border-foreground" />

      {/* Tech Stack Section */}
      <section id="tech-stack" className="container mx-auto px-4 py-16">
        <div className="mx-auto max-w-4xl">
          <div className="flex items-center justify-center gap-3 text-3xl md:text-5xl font-bold">
            <span>made with</span>
            <Badge
              variant="default"
              className="border-2 border-foreground px-6 py-3 text-2xl md:text-4xl shadow-[4px_4px_0px_0px_rgba(0,0,0,1)] dark:shadow-[4px_4px_0px_0px_rgba(255,255,255,1)]"
            >
              <RotatingText
                texts={[
                  "Next.js 16",
                  "React 19",
                  "TypeScript",
                  "shadcn/ui",
                  "Tailwind CSS",
                  "libsodium",
                  "Node.js Crypto",
                  "Biome",
                  "Lucide Icons",
                ]}
                rotationInterval={3000}
                staggerDuration={0.02}
              />
            </Badge>
          </div>
        </div>
      </section>

      {/* Footer */}
      <footer className="container mx-auto px-4 py-8">
        <Separator className="mb-8 border-2 border-foreground" />
        <div className="flex flex-col items-center justify-between gap-4 text-center text-sm text-muted-foreground sm:flex-row sm:text-left">
          <div className="flex flex-col gap-2">
            <p>
              Built by{" "}
              <a
                href="https://www.vaatun.com"
                target="_blank"
                rel="noopener noreferrer"
                className="font-semibold underline underline-offset-4"
              >
                Vaatun
              </a>{" "}
              on the{" "}
              <a
                href="https://ondc.org/"
                target="_blank"
                rel="noopener noreferrer"
                className="font-semibold underline underline-offset-4"
              >
                Open Network for Digital Commerce
              </a>
            </p>
            <div className="mt-2 flex gap-2 flex-wrap">
              <SubscriptionTrigger />
              <SearchTrigger />
            </div>
          </div>
          <div className="flex gap-4">
            <a
              href="https://ondc.org/"
              target="_blank"
              rel="noopener noreferrer"
              className="hover:text-foreground"
            >
              ONDC Site
            </a>
            <a
              href="https://nextjs.org/docs"
              target="_blank"
              rel="noopener noreferrer"
              className="hover:text-foreground"
            >
              Next.js Docs
            </a>
            <a
              href="https://github.com/ONDC-Official/developer-docs"
              target="_blank"
              rel="noopener noreferrer"
              className="hover:text-foreground"
            >
              Developer Guide
            </a>
          </div>
        </div>
      </footer>
    </div>
  );
}
