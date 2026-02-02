import { createRootRoute, Outlet } from "@tanstack/react-router";
import { Toaster } from "sonner";
import { ThemeProvider } from "@/components/theme-provider";
import { PurchaserProvider } from "@/lib/purchaser-context";

export const Route = createRootRoute({
  component: RootComponent,
});

function RootComponent() {
  return (
    <ThemeProvider attribute="class" defaultTheme="system" enableSystem>
      <PurchaserProvider>
        <Outlet />
        <Toaster />
      </PurchaserProvider>
    </ThemeProvider>
  );
}
