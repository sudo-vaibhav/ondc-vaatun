
import { ClipboardList, Globe, Scale, ShieldCheck } from "lucide-react";
import { cn } from "@/lib/utils";

const steps = [
  {
    number: 1,
    icon: ClipboardList,
    title: "Tell Us What You Need",
    description:
      "Share basic details about yourself and what you want covered. No lengthy forms—just the essentials.",
  },
  {
    number: 2,
    icon: Globe,
    title: "We Search the Network",
    description:
      "Your request goes out to all insurers on ONDC. They compete to offer you their best rates in real-time.",
  },
  {
    number: 3,
    icon: Scale,
    title: "Compare & Choose",
    description:
      "See all offers side-by-side. Compare premiums, coverage, claim settlement ratios. No hidden fees.",
  },
  {
    number: 4,
    icon: ShieldCheck,
    title: "Get Covered Instantly",
    description:
      "Complete your purchase digitally. Your policy is issued immediately—no paperwork, no waiting.",
  },
];

export function HowItWorks() {
  return (
    <section className="py-16 md:py-24 relative overflow-hidden">
      {/* Background */}
      <div className="absolute inset-0 bg-linear-to-b from-primary/5 via-transparent to-transparent" />

      <div className="container mx-auto px-4 relative">
        {/* Section Header */}
        <div className="text-center mb-16">
          <h2 className="text-3xl md:text-4xl font-black tracking-tight mb-4">
            How Buying Insurance on ONDC Works
          </h2>
          <p className="text-lg text-muted-foreground max-w-2xl mx-auto">
            A transparent, open marketplace where you're always in control
          </p>
        </div>

        {/* Steps - Desktop Timeline */}
        <div className="hidden md:block max-w-5xl mx-auto">
          {/* Connecting line */}
          <div className="absolute top-[50%] left-[10%] right-[10%] h-0.5 bg-linear-to-r from-primary/20 via-primary/40 to-primary/20 -translate-y-1/2" />

          <div className="grid grid-cols-4 gap-6 relative">
            {steps.map((step, index) => (
              <div
                key={step.number}
                className={cn(
                  "relative flex flex-col items-center text-center",
                  "animate-in opacity-0",
                )}
                style={{
                  animationDelay: `${index * 150}ms`,
                  animationFillMode: "forwards",
                }}
              >
                {/* Step number circle */}
                <div
                  className={cn(
                    "relative z-10",
                    "w-16 h-16 rounded-full",
                    "bg-background",
                    "border-2 border-primary/30",
                    "flex items-center justify-center",
                    "mb-6",
                    "shadow-lg shadow-primary/10",
                  )}
                >
                  <div
                    className={cn(
                      "w-12 h-12 rounded-full",
                      "bg-primary",
                      "flex items-center justify-center",
                    )}
                  >
                    <step.icon className="w-6 h-6 text-white" />
                  </div>
                </div>

                {/* Step number badge */}
                {/* <div className="
                  absolute top-0 right-1/2 translate-x-10 -translate-y-1
                  w-6 h-6 rounded-full
                  bg-primary text-white
                  text-xs font-bold
                  flex items-center justify-center
                  shadow-md
                ">
                  {step.number}
                </div> */}

                {/* Content */}
                <h3 className="text-lg font-bold mb-2">{step.title}</h3>
                <p className="text-sm text-muted-foreground leading-relaxed">
                  {step.description}
                </p>
              </div>
            ))}
          </div>
        </div>

        {/* Steps - Mobile Vertical */}
        <div className="md:hidden space-y-8">
          {steps.map((step, index) => (
            <div key={step.number} className="relative flex gap-4">
              {/* Connecting line */}
              {index < steps.length - 1 && (
                <div className="absolute left-7 top-16 bottom-0 w-0.5 bg-primary/20" />
              )}

              {/* Step circle */}
              <div
                className={cn(
                  "relative z-10 shrink-0",
                  "w-14 h-14 rounded-full",
                  "bg-primary",
                  "flex items-center justify-center",
                  "shadow-lg shadow-primary/20",
                )}
              >
                <step.icon className="w-6 h-6 text-white" />
              </div>

              {/* Content */}
              <div className="flex-1 pt-1">
                <div className="flex items-center gap-2 mb-1">
                  <span className="text-xs font-bold text-primary">
                    STEP {step.number}
                  </span>
                </div>
                <h3 className="text-lg font-bold mb-1">{step.title}</h3>
                <p className="text-sm text-muted-foreground">
                  {step.description}
                </p>
              </div>
            </div>
          ))}
        </div>
      </div>
    </section>
  );
}
