import { ChevronRight, ExternalLink, FileText } from "lucide-react";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import {
  Card,
  CardContent,
  CardDescription,
  CardHeader,
  CardTitle,
} from "@/components/ui/card";

interface XInputHead {
  descriptor?: { name?: string };
  index?: { min: number; cur: number; max: number };
  headings?: string[];
}

interface XInputForm {
  id?: string;
  url?: string;
  mime_type?: string;
  resubmit?: boolean;
  multiple_sumbissions?: boolean;
}

interface XInputFormProps {
  head?: XInputHead;
  form?: XInputForm;
  required?: boolean;
}

export default function XInputForm({ head, form, required }: XInputFormProps) {
  if (!form?.url) {
    return null;
  }

  const currentStep = (head?.index?.cur ?? 0) + 1;
  const totalSteps = (head?.index?.max ?? 0) + 1;
  const formName = head?.descriptor?.name || "Required Information";
  const headings = head?.headings || [];

  return (
    <Card className="border-2 border-foreground shadow-[4px_4px_0px_0px_rgba(0,0,0,1)] dark:shadow-[4px_4px_0px_0px_rgba(255,255,255,1)]">
      <CardHeader className="pb-2">
        <div className="flex items-center justify-between">
          <div className="flex items-center gap-2">
            <FileText className="h-5 w-5" />
            <CardTitle className="text-lg">{formName}</CardTitle>
          </div>
          {totalSteps > 1 && (
            <Badge variant="secondary" className="border-2 border-foreground">
              Step {currentStep} of {totalSteps}
            </Badge>
          )}
        </div>

        {headings.length > 1 && (
          <CardDescription className="mt-2">
            <div className="flex items-center gap-1 text-xs">
              {headings.map((heading, index) => (
                <div
                  key={heading}
                  className={`flex items-center gap-1 ${
                    index === head?.index?.cur
                      ? "font-semibold text-foreground"
                      : "text-muted-foreground"
                  }`}
                >
                  {index > 0 && <ChevronRight className="h-3 w-3" />}
                  <span>{heading}</span>
                </div>
              ))}
            </div>
          </CardDescription>
        )}

        {required && (
          <Badge
            variant="destructive"
            className="border-2 border-foreground w-fit mt-2"
          >
            Required
          </Badge>
        )}
      </CardHeader>

      <CardContent>
        {/* Form Iframe Container */}
        <div className="border-2 border-foreground rounded-lg overflow-hidden bg-white">
          <iframe
            src={form.url}
            className="w-full min-h-[500px] border-0"
            title={formName}
            sandbox="allow-same-origin allow-scripts allow-forms allow-popups"
          />
        </div>

        {/* External Link Option */}
        <div className="mt-4 flex justify-center">
          <Button
            variant="outline"
            size="sm"
            className="border-2 border-foreground text-xs"
            asChild
          >
            <a href={form.url} target="_blank" rel="noopener noreferrer">
              <ExternalLink className="mr-1 h-3 w-3" />
              Open in new tab
            </a>
          </Button>
        </div>

        {form.resubmit && (
          <p className="text-xs text-muted-foreground text-center mt-2">
            You can resubmit this form if needed
          </p>
        )}
      </CardContent>
    </Card>
  );
}
