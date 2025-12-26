import { ArrowLeft } from "lucide-react";
import Link from "next/link";
import { ApiTrigger } from "@/components/ApiTrigger";
import { Header } from "@/components/header";
import { Button } from "@/components/ui/button";
import { getDirectoryRoutes } from "@/lib/routes-registry";
import { tags } from "@/openapi/tags";

export default function DirectoryPage() {
  const routesByTag = getDirectoryRoutes();

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

        {tags.map((tag) => {
          const routes = routesByTag[tag.name];
          if (!routes?.length) return null;

          return (
            <div key={tag.name} className="mb-10">
              <h2 className="mb-4 text-2xl font-semibold">{tag.name}</h2>
              <p className="mb-6 text-muted-foreground">{tag.description}</p>
              <div className="grid gap-6 md:grid-cols-2">
                {routes.map((route) => (
                  <ApiTrigger
                    key={route.path}
                    title={route.directoryConfig.title}
                    description={route.directoryConfig.description}
                    endpoint={route.path}
                    method={route.method.toUpperCase() as "GET" | "POST"}
                    payload={route.directoryConfig.payload}
                  />
                ))}
              </div>
            </div>
          );
        })}
      </section>
    </div>
  );
}
