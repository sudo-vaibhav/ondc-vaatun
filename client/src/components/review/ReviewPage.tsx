import { Loader2 } from "lucide-react";
import { Button } from "@/components/ui/button";
import {
  Card,
  CardContent,
  CardFooter,
  CardHeader,
  CardTitle,
} from "@/components/ui/card";
import { Checkbox } from "@/components/ui/checkbox";
import { Separator } from "@/components/ui/separator";
import { ReviewSection } from "./ReviewSection";
import QuoteBreakdown from "@/components/quote/QuoteBreakdown";

interface Nominee {
  firstName: string;
  lastName: string;
  dateOfBirth: string;
  relationship: string;
}

interface Quote {
  id?: string;
  price: {
    currency: string;
    value: string;
  };
  breakup?: Array<{
    title: string;
    price: {
      currency: string;
      value: string;
    };
    item?: {
      id: string;
      add_ons?: Array<{ id: string }>;
    };
  }>;
  ttl?: string;
}

interface FormData {
  firstName: string;
  lastName: string;
  email: string;
  phone: string;
  address: string;
  pincode: string;
  city: string;
  state: string;
  panNumber: string;
  dateOfBirth: string;
  hasPED: boolean;
  conditions?: string[];
  otherDescription?: string;
  nominees?: Nominee[];
}

interface ReviewPageProps {
  formData: FormData;
  quote: Quote;
  selectedAddOns?: string[];
  onEdit: (section: "personal" | "identity" | "health" | "nominee") => void;
  onSubmit: () => void;
  termsAccepted: boolean;
  onTermsChange: (accepted: boolean) => void;
  isSubmitting?: boolean;
}

function maskPAN(pan: string): string {
  if (pan.length <= 4) return pan;
  return "XXXXXX" + pan.slice(-4);
}

function formatDate(date: string): string {
  if (!date) return "";
  try {
    const d = new Date(date);
    return d.toLocaleDateString("en-IN", {
      day: "2-digit",
      month: "short",
      year: "numeric",
    });
  } catch {
    return date;
  }
}

function formatRelationship(relationship: string): string {
  const map: Record<string, string> = {
    spouse: "Spouse",
    son: "Son",
    daughter: "Daughter",
    father: "Father",
    mother: "Mother",
    other: "Other",
  };
  return map[relationship] || relationship;
}

function formatCurrency(value: string, currency: string = "INR"): string {
  const num = Number.parseFloat(value);
  return new Intl.NumberFormat("en-IN", {
    style: "currency",
    currency: currency,
    minimumFractionDigits: 0,
    maximumFractionDigits: 2,
  }).format(num);
}

export function ReviewPage({
  formData,
  quote,
  onEdit,
  onSubmit,
  termsAccepted,
  onTermsChange,
  isSubmitting = false,
}: ReviewPageProps) {
  const hasNominees = formData.nominees && formData.nominees.length > 0;

  return (
    <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
      {/* Main content - 2/3 width on desktop */}
      <div className="lg:col-span-2 space-y-6">
        {/* Personal Information Section */}
        <ReviewSection title="Personal Information" onEdit={() => onEdit("personal")}>
          <dl className="grid grid-cols-1 sm:grid-cols-2 gap-4">
            <div>
              <dt className="text-sm text-muted-foreground">Name</dt>
              <dd className="font-medium">
                {formData.firstName} {formData.lastName}
              </dd>
            </div>
            <div>
              <dt className="text-sm text-muted-foreground">Email</dt>
              <dd className="font-medium">{formData.email}</dd>
            </div>
            <div>
              <dt className="text-sm text-muted-foreground">Phone</dt>
              <dd className="font-medium">{formData.phone}</dd>
            </div>
            <div className="sm:col-span-2">
              <dt className="text-sm text-muted-foreground">Address</dt>
              <dd className="font-medium">{formData.address}</dd>
            </div>
            <div>
              <dt className="text-sm text-muted-foreground">City</dt>
              <dd className="font-medium">{formData.city}</dd>
            </div>
            <div>
              <dt className="text-sm text-muted-foreground">State</dt>
              <dd className="font-medium">{formData.state}</dd>
            </div>
            <div>
              <dt className="text-sm text-muted-foreground">Pincode</dt>
              <dd className="font-medium">{formData.pincode}</dd>
            </div>
          </dl>
        </ReviewSection>

        {/* Identity Verification Section */}
        <ReviewSection title="Identity Verification" onEdit={() => onEdit("identity")}>
          <dl className="grid grid-cols-1 sm:grid-cols-2 gap-4">
            <div>
              <dt className="text-sm text-muted-foreground">PAN</dt>
              <dd className="font-medium font-mono">{maskPAN(formData.panNumber)}</dd>
            </div>
            <div>
              <dt className="text-sm text-muted-foreground">Date of Birth</dt>
              <dd className="font-medium">{formatDate(formData.dateOfBirth)}</dd>
            </div>
          </dl>
        </ReviewSection>

        {/* Health Information Section */}
        <ReviewSection title="Health Information" onEdit={() => onEdit("health")}>
          <dl>
            <dt className="text-sm text-muted-foreground">Pre-existing Conditions</dt>
            <dd className="font-medium">
              {formData.hasPED && formData.conditions && formData.conditions.length > 0 ? (
                <ul className="list-disc list-inside">
                  {formData.conditions.map((condition) => (
                    <li key={condition}>
                      {condition === "other" && formData.otherDescription
                        ? `Other: ${formData.otherDescription}`
                        : condition.replace(/_/g, " ")}
                    </li>
                  ))}
                </ul>
              ) : (
                <span className="text-muted-foreground">None declared</span>
              )}
            </dd>
          </dl>
        </ReviewSection>

        {/* Nominee Details Section - only render if nominees exist */}
        {hasNominees && (
          <ReviewSection title="Nominee Details" onEdit={() => onEdit("nominee")}>
            <div className="space-y-4">
              {formData.nominees!.map((nominee, index) => (
                <div
                  key={index}
                  className={index > 0 ? "pt-4 border-t" : ""}
                >
                  <p className="text-sm text-muted-foreground mb-2">
                    Nominee {index + 1}
                  </p>
                  <dl className="grid grid-cols-1 sm:grid-cols-3 gap-4">
                    <div>
                      <dt className="text-sm text-muted-foreground">Name</dt>
                      <dd className="font-medium">
                        {nominee.firstName} {nominee.lastName}
                      </dd>
                    </div>
                    <div>
                      <dt className="text-sm text-muted-foreground">Date of Birth</dt>
                      <dd className="font-medium">{formatDate(nominee.dateOfBirth)}</dd>
                    </div>
                    <div>
                      <dt className="text-sm text-muted-foreground">Relationship</dt>
                      <dd className="font-medium">
                        {formatRelationship(nominee.relationship)}
                      </dd>
                    </div>
                  </dl>
                </div>
              ))}
            </div>
          </ReviewSection>
        )}

        {/* Terms & Conditions Card */}
        <Card>
          <CardContent className="pt-6">
            <div className="flex items-start gap-3">
              <Checkbox
                id="terms"
                checked={termsAccepted}
                onCheckedChange={(checked) => onTermsChange(checked === true)}
              />
              <label
                htmlFor="terms"
                className="text-sm leading-relaxed cursor-pointer"
              >
                I have read and agree to the{" "}
                <a href="#" className="underline hover:no-underline">
                  Terms & Conditions
                </a>{" "}
                and{" "}
                <a href="#" className="underline hover:no-underline">
                  Privacy Policy
                </a>
              </label>
            </div>
          </CardContent>
        </Card>
      </div>

      {/* Sidebar - 1/3 width on desktop */}
      <div className="lg:col-span-1">
        <Card className="sticky top-4">
          <CardHeader>
            <CardTitle>Quote Summary</CardTitle>
          </CardHeader>
          <CardContent>
            <QuoteBreakdown quote={quote} />
            <Separator className="my-4" />
            <div className="flex justify-between items-center font-bold text-lg">
              <span>Total Premium</span>
              <span>{formatCurrency(quote.price.value, quote.price.currency)}</span>
            </div>
          </CardContent>
          <CardFooter>
            <Button
              size="lg"
              className="w-full"
              onClick={onSubmit}
              disabled={!termsAccepted || isSubmitting}
            >
              {isSubmitting ? (
                <>
                  <Loader2 className="mr-2 h-4 w-4 animate-spin" />
                  Processing...
                </>
              ) : (
                "Proceed to Payment"
              )}
            </Button>
          </CardFooter>
        </Card>
      </div>
    </div>
  );
}
