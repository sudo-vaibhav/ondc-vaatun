"use client";

import { ArrowRightLeft, Globe2, Lock, Receipt } from "lucide-react";

const features = [
  {
    icon: Globe2,
    title: "Truly Open Marketplace",
    description:
      "Unlike closed platforms, ONDC connects you directly with insurers. No platform lock-in, no preferential treatment—just fair competition.",
    color: "primary",
  },
  {
    icon: Receipt,
    title: "What You See Is What You Pay",
    description:
      "No hidden commissions inflating your premium. Insurers quote their actual rates, and you pay exactly that.",
    color: "blue",
  },
  {
    icon: Lock,
    title: "Privacy by Design",
    description:
      "Your data stays yours. ONDC's protocol ensures your information is shared only with insurers you choose to engage with.",
    color: "purple",
  },
  {
    icon: ArrowRightLeft,
    title: "Freedom to Switch",
    description:
      "Policies bought on ONDC are recognized across the network. Renew with any platform, compare anywhere.",
    color: "orange",
  },
];

const colorClasses = {
  primary: {
    bg: "bg-primary/10",
    border: "border-primary/20 hover:border-primary/40",
    icon: "text-primary",
    glow: "from-primary/10",
  },
  blue: {
    bg: "bg-blue-500/10",
    border: "border-blue-500/20 hover:border-blue-500/40",
    icon: "text-blue-500",
    glow: "from-blue-500/10",
  },
  purple: {
    bg: "bg-purple-500/10",
    border: "border-purple-500/20 hover:border-purple-500/40",
    icon: "text-purple-500",
    glow: "from-purple-500/10",
  },
  orange: {
    bg: "bg-orange-500/10",
    border: "border-orange-500/20 hover:border-orange-500/40",
    icon: "text-orange-500",
    glow: "from-orange-500/10",
  },
};

export function WhyONDC() {
  return (
    <section className="py-16 md:py-24 relative">
      {/* Background gradient */}
      <div className="absolute inset-0 bg-gradient-to-b from-background via-foreground/[0.02] to-background" />

      <div className="container mx-auto px-4 relative">
        {/* Section Header */}
        <div className="text-center mb-12">
          <h2 className="text-3xl md:text-4xl font-black tracking-tight mb-4">
            The ONDC Advantage
          </h2>
          <p className="text-lg text-muted-foreground max-w-2xl mx-auto">
            A Government of India initiative transforming how India buys and
            sells
          </p>
        </div>

        {/* Features Grid */}
        <div className="grid md:grid-cols-2 gap-6 max-w-4xl mx-auto">
          {features.map((feature, index) => {
            const colors =
              colorClasses[feature.color as keyof typeof colorClasses];
            return (
              <div
                key={feature.title}
                className={`
                  group relative
                  p-6 rounded-xl
                  bg-background
                  border ${colors.border}
                  transition-all duration-300
                  hover:shadow-lg
                  animate-in opacity-0
                `}
                style={{
                  animationDelay: `${index * 100}ms`,
                  animationFillMode: "forwards",
                }}
              >
                {/* Glow effect on hover */}
                <div
                  className={`
                  absolute inset-0 rounded-xl
                  bg-gradient-to-br ${colors.glow} to-transparent
                  opacity-0 group-hover:opacity-100
                  transition-opacity duration-300
                `}
                />

                <div className="relative">
                  {/* Icon */}
                  <div
                    className={`
                    w-12 h-12 rounded-lg ${colors.bg}
                    flex items-center justify-center
                    mb-4
                  `}
                  >
                    <feature.icon className={`w-6 h-6 ${colors.icon}`} />
                  </div>

                  {/* Content */}
                  <h3 className="text-lg font-bold mb-2">{feature.title}</h3>
                  <p className="text-sm text-muted-foreground leading-relaxed">
                    {feature.description}
                  </p>
                </div>
              </div>
            );
          })}
        </div>
      </div>
    </section>
  );
}
