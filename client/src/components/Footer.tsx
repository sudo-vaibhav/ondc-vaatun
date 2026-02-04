import { Separator } from "@/components/ui/separator";

export function Footer() {
  return (
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
  );
}
