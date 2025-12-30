"use client";

import Link from "next/link";
import SearchTrigger from "@/components/SearchTrigger";
import StreamedSearchTrigger from "@/components/StreamedSearchTrigger";
import SubscriptionTrigger from "@/components/SubscriptionTrigger";
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
          <div className="mt-2 flex gap-2 flex-wrap">
            <SubscriptionTrigger />
            <SearchTrigger />
            <StreamedSearchTrigger />
          </div>
        </div>
        <div className="flex gap-4">
          <Link href="/api/reference" className="hover:text-foreground">
            API Docs
          </Link>
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
  );
}
