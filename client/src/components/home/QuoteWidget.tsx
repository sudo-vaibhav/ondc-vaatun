
import {
  ArrowRight,
  Calendar,
  Car,
  Check,
  HeartPulse,
  Shield,
  Users,
} from "lucide-react";
import { useState } from "react";
import { Button } from "@/components/ui/button";

type InsuranceType = "health" | "motor";

interface QuoteWidgetProps {
  onSubmit?: (type: InsuranceType, data: Record<string, string>) => void;
}

export function QuoteWidget({ onSubmit }: QuoteWidgetProps) {
  const [activeTab, setActiveTab] = useState<InsuranceType>("health");
  const [isSubmitting, setIsSubmitting] = useState(false);

  // Health form state
  const [healthAge, setHealthAge] = useState("");
  const [healthCity, setHealthCity] = useState("");
  const [healthMembers, setHealthMembers] = useState<string[]>(["self"]);
  const [healthCoverage, setHealthCoverage] = useState("5L");

  // Motor form state
  const [vehicleType, setVehicleType] = useState<"car" | "bike">("car");
  const [registrationYear, setRegistrationYear] = useState("");

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setIsSubmitting(true);

    const data: Record<string, string> =
      activeTab === "health"
        ? {
            age: healthAge,
            city: healthCity,
            members: healthMembers.join(","),
            coverage: healthCoverage,
          }
        : { vehicleType, registrationYear };

    onSubmit?.(activeTab, data);

    // Simulate delay
    await new Promise((r) => setTimeout(r, 1000));
    setIsSubmitting(false);
  };

  const toggleMember = (member: string) => {
    setHealthMembers((prev) =>
      prev.includes(member)
        ? prev.filter((m) => m !== member)
        : [...prev, member],
    );
  };

  return (
    <div
      className="
        relative w-full max-w-md
        bg-background/80 backdrop-blur-xl
        border-2 border-foreground/10
        rounded-2xl
        shadow-2xl shadow-primary/5
        overflow-hidden
      "
    >
      {/* Glow effect */}
      <div className="absolute -top-24 -right-24 w-48 h-48 bg-primary/10 rounded-full blur-3xl" />
      <div className="absolute -bottom-24 -left-24 w-48 h-48 bg-accent/10 rounded-full blur-3xl" />

      {/* Tab Header */}
      <div className="relative flex border-b border-foreground/10">
        <button
          type="button"
          onClick={() => setActiveTab("health")}
          className={`
            flex-1 flex items-center justify-center gap-2 py-4 px-6
            text-sm font-semibold
            transition-all duration-200
            ${
              activeTab === "health"
                ? "text-primary bg-primary/5"
                : "text-muted-foreground hover:text-foreground hover:bg-foreground/5"
            }
          `}
        >
          <HeartPulse className="w-4 h-4" />
          Health
          {activeTab === "health" && (
            <span className="absolute bottom-0 left-0 w-1/2 h-0.5 bg-primary" />
          )}
        </button>
        <button
          type="button"
          onClick={() => setActiveTab("motor")}
          className={`
            flex-1 flex items-center justify-center gap-2 py-4 px-6
            text-sm font-semibold
            transition-all duration-200
            ${
              activeTab === "motor"
                ? "text-primary bg-primary/5"
                : "text-muted-foreground hover:text-foreground hover:bg-foreground/5"
            }
          `}
        >
          <Car className="w-4 h-4" />
          Motor
          {activeTab === "motor" && (
            <span className="absolute bottom-0 right-0 w-1/2 h-0.5 bg-primary" />
          )}
        </button>
      </div>

      {/* Form Content */}
      <form onSubmit={handleSubmit} className="relative p-6 space-y-5">
        {activeTab === "health" ? (
          <>
            {/* Age Input */}
            <div className="space-y-2">
              <label
                htmlFor="health-age"
                className="flex items-center gap-2 text-sm font-medium text-muted-foreground"
              >
                <Calendar className="w-4 h-4" />
                Your Age
              </label>
              <input
                id="health-age"
                type="number"
                min="18"
                max="99"
                value={healthAge}
                onChange={(e) => setHealthAge(e.target.value)}
                placeholder="Enter your age"
                required
                className="
                  w-full px-4 py-3
                  bg-foreground/5
                  border border-foreground/10 rounded-xl
                  text-foreground placeholder:text-muted-foreground/50
                  focus:outline-none focus:ring-2 focus:ring-primary/30 focus:border-primary/50
                  transition-all
                "
              />
            </div>

            {/* City Input */}
            <div className="space-y-2">
              <label
                htmlFor="health-city"
                className="flex items-center gap-2 text-sm font-medium text-muted-foreground"
              >
                <Shield className="w-4 h-4" />
                City
              </label>
              <input
                id="health-city"
                type="text"
                value={healthCity}
                onChange={(e) => setHealthCity(e.target.value)}
                placeholder="Enter your city"
                required
                className="
                  w-full px-4 py-3
                  bg-foreground/5
                  border border-foreground/10 rounded-xl
                  text-foreground placeholder:text-muted-foreground/50
                  focus:outline-none focus:ring-2 focus:ring-primary/30 focus:border-primary/50
                  transition-all
                "
              />
            </div>

            {/* Members Selection */}
            <fieldset className="space-y-2">
              <legend className="flex items-center gap-2 text-sm font-medium text-muted-foreground">
                <Users className="w-4 h-4" />
                Members to Cover
              </legend>
              <div className="flex flex-wrap gap-2">
                {["self", "spouse", "children", "parents"].map((member) => (
                  <button
                    key={member}
                    type="button"
                    onClick={() => toggleMember(member)}
                    className={`
                      px-3 py-2 rounded-lg text-sm font-medium
                      border transition-all duration-150
                      ${
                        healthMembers.includes(member)
                          ? "bg-primary/10 border-primary/50 text-primary"
                          : "bg-foreground/5 border-foreground/10 text-muted-foreground hover:border-foreground/20"
                      }
                    `}
                  >
                    {healthMembers.includes(member) && (
                      <Check className="w-3 h-3 inline mr-1" />
                    )}
                    {member.charAt(0).toUpperCase() + member.slice(1)}
                  </button>
                ))}
              </div>
            </fieldset>

            {/* Coverage Selection */}
            <fieldset className="space-y-2">
              <legend className="text-sm font-medium text-muted-foreground">
                Coverage Amount
              </legend>
              <div className="grid grid-cols-3 gap-2">
                {["3L", "5L", "10L", "25L", "50L", "1Cr"].map((amount) => (
                  <button
                    key={amount}
                    type="button"
                    onClick={() => setHealthCoverage(amount)}
                    className={`
                      py-2 rounded-lg text-sm font-medium
                      border transition-all duration-150
                      ${
                        healthCoverage === amount
                          ? "bg-primary/10 border-primary/50 text-primary"
                          : "bg-foreground/5 border-foreground/10 text-muted-foreground hover:border-foreground/20"
                      }
                    `}
                  >
                    ₹{amount}
                  </button>
                ))}
              </div>
            </fieldset>
          </>
        ) : (
          <>
            {/* Vehicle Type */}
            <fieldset className="space-y-2">
              <legend className="text-sm font-medium text-muted-foreground">
                Vehicle Type
              </legend>
              <div className="grid grid-cols-2 gap-3">
                {(["car", "bike"] as const).map((type) => (
                  <button
                    key={type}
                    type="button"
                    onClick={() => setVehicleType(type)}
                    className={`
                      flex items-center justify-center gap-2 py-4 rounded-xl
                      border-2 transition-all duration-150
                      ${
                        vehicleType === type
                          ? "bg-primary/10 border-primary/50 text-primary"
                          : "bg-foreground/5 border-foreground/10 text-muted-foreground hover:border-foreground/20"
                      }
                    `}
                  >
                    <Car
                      className={`w-5 h-5 ${type === "bike" ? "rotate-45" : ""}`}
                    />
                    <span className="font-semibold">
                      {type.charAt(0).toUpperCase() + type.slice(1)}
                    </span>
                  </button>
                ))}
              </div>
            </fieldset>

            {/* Registration Year */}
            <div className="space-y-2">
              <label
                htmlFor="registration-year"
                className="flex items-center gap-2 text-sm font-medium text-muted-foreground"
              >
                <Calendar className="w-4 h-4" />
                Registration Year
              </label>
              <select
                id="registration-year"
                value={registrationYear}
                onChange={(e) => setRegistrationYear(e.target.value)}
                required
                className="
                  w-full px-4 py-3
                  bg-foreground/5
                  border border-foreground/10 rounded-xl
                  text-foreground
                  focus:outline-none focus:ring-2 focus:ring-primary/30 focus:border-primary/50
                  transition-all
                "
              >
                <option value="">Select year</option>
                {Array.from({ length: 15 }, (_, i) => 2024 - i).map((year) => (
                  <option key={year} value={year}>
                    {year}
                  </option>
                ))}
              </select>
            </div>

            {/* Quick info */}
            <div className="p-3 bg-foreground/5 rounded-xl">
              <p className="text-xs text-muted-foreground">
                For comprehensive coverage details, you'll be able to add your
                vehicle brand and model in the next step.
              </p>
            </div>
          </>
        )}

        {/* Submit Button */}
        <Button
          type="submit"
          disabled={isSubmitting}
          className="
            w-full h-12
            text-base font-semibold
            disabled:opacity-50 disabled:cursor-not-allowed
          "
        >
          {isSubmitting ? (
            <span className="flex items-center gap-2">
              <span className="w-4 h-4 border-2 border-white/30 border-t-white rounded-full animate-spin" />
              Getting quotes...
            </span>
          ) : (
            <span className="flex items-center gap-2">
              View Quotes
              <ArrowRight className="w-4 h-4" />
            </span>
          )}
        </Button>

        {/* Trust line */}
        <div className="flex items-center justify-center gap-4 text-xs text-muted-foreground pt-2">
          <span className="flex items-center gap-1">
            <Check className="w-3 h-3 text-primary" />
            No spam
          </span>
          <span className="flex items-center gap-1">
            <Check className="w-3 h-3 text-primary" />
            No obligations
          </span>
          <span className="flex items-center gap-1">
            <Check className="w-3 h-3 text-primary" />
            Instant
          </span>
        </div>
      </form>
    </div>
  );
}
