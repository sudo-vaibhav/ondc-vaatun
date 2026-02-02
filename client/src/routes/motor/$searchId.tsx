import { createFileRoute } from "@tanstack/react-router";

export const Route = createFileRoute("/motor/$searchId")({
  component: MotorSearchPage,
});

function MotorSearchPage() {
  const { searchId } = Route.useParams();

  return (
    <div className="min-h-screen bg-background">
      <main className="container mx-auto px-4 py-8">
        <h1 className="text-3xl font-bold mb-4">Motor Insurance Search</h1>
        <p className="text-muted-foreground mb-8">Search ID: {searchId}</p>
        {/* Motor insurance search results will be rendered here */}
        <div className="text-center text-muted-foreground">
          Loading motor insurance options...
        </div>
      </main>
    </div>
  );
}
