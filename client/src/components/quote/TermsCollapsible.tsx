import { ChevronDown, FileText } from "lucide-react";
import { useState } from "react";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import {
  Collapsible,
  CollapsibleContent,
  CollapsibleTrigger,
} from "@/components/ui/collapsible";

interface TermsCollapsibleProps {
  terms?: string; // Long description from provider if available
}

const DEFAULT_TERMS_PLACEHOLDER =
  "Terms and conditions apply. Full policy terms will be provided after application submission.";

/**
 * TermsCollapsible displays a collapsible terms & conditions section.
 * Default state: collapsed (closed).
 */
export function TermsCollapsible({ terms }: TermsCollapsibleProps) {
  const [isOpen, setIsOpen] = useState(false);

  const displayTerms = terms || DEFAULT_TERMS_PLACEHOLDER;

  return (
    <Card className="border-2 border-primary/20">
      <Collapsible open={isOpen} onOpenChange={setIsOpen}>
        <CardHeader className="pb-0">
          <CollapsibleTrigger asChild>
            <button
              type="button"
              className="flex w-full items-center justify-between rounded-lg p-1 -m-1 hover:bg-primary/5 transition-colors cursor-pointer"
            >
              <CardTitle className="flex items-center gap-2 text-base font-semibold">
                <FileText className="h-5 w-5 text-primary" />
                Terms & Conditions
              </CardTitle>
              <ChevronDown
                className={`h-5 w-5 text-muted-foreground transition-transform duration-200 ${
                  isOpen ? "rotate-180" : ""
                }`}
              />
            </button>
          </CollapsibleTrigger>
        </CardHeader>

        <CollapsibleContent>
          <CardContent className="pt-3">
            <p className="text-sm text-muted-foreground leading-relaxed whitespace-pre-line">
              {displayTerms}
            </p>
          </CardContent>
        </CollapsibleContent>
      </Collapsible>
    </Card>
  );
}
