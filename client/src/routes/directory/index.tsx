import { createFileRoute } from "@tanstack/react-router";

export const Route = createFileRoute("/directory/")({
  component: DirectoryPage,
});

function DirectoryPage() {
  return (
    <div className="min-h-screen bg-background">
      <main className="container mx-auto px-4 py-8">
        <h1 className="text-3xl font-bold mb-4">Insurance Directory</h1>
        <p className="text-muted-foreground mb-8">
          Browse available insurance providers on ONDC
        </p>
        {/* Directory listing will be rendered here */}
        <div className="text-center text-muted-foreground">
          Directory listing coming soon...
        </div>
      </main>
    </div>
  );
}
