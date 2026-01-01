"use client";

import {
  ArrowRight,
  Building2,
  Car,
  Check,
  Clock,
  HeartPulse,
  Sparkles,
  Wrench,
} from "lucide-react";
import { Button } from "@/components/ui/button";

interface InsuranceCardsProps {
  onHealthClick?: () => void;
  onMotorClick?: () => void;
}

export function InsuranceCards({
  onHealthClick,
  onMotorClick,
}: InsuranceCardsProps) {
  return (
    <section className="py-16 md:py-24">
      <div className="container mx-auto px-4">
        {/* Section Header */}
        <div className="text-center mb-12">
          <h2 className="text-3xl md:text-4xl font-black tracking-tight mb-4">
            Choose Your Coverage
          </h2>
          <p className="text-lg text-muted-foreground max-w-2xl mx-auto">
            Whether it's protecting your health or your vehicle, find the right
            insurance on India's open network.
          </p>
        </div>

        {/* Cards Grid */}
        <div className="grid md:grid-cols-2 gap-6 lg:gap-8 max-w-5xl mx-auto">
          {/* Health Insurance Card */}
          <div
            className="
              group relative
              p-8 rounded-2xl
              bg-linear-to-br from-primary/5 via-background to-accent/5
              border-2 border-foreground/10
              hover:border-primary/30
              shadow-lg hover:shadow-xl
              transition-all duration-300
            "
          >
            {/* Accent gradient */}
            <div className="absolute top-0 left-0 right-0 h-1 bg-primary rounded-t-2xl opacity-0 group-hover:opacity-100 transition-opacity" />

            {/* Icon */}
            <div
              className="
              w-14 h-14 rounded-xl
              bg-primary/10
              flex items-center justify-center
              mb-6
            "
            >
              <HeartPulse className="w-7 h-7 text-primary" />
            </div>

            {/* Content */}
            <h3 className="text-2xl font-bold mb-2">Health Insurance</h3>
            <p className="text-muted-foreground mb-6">
              Protect what matters most. From individual coverage to
              comprehensive family floaters, find health insurance that fits
              your life.
            </p>

            {/* Benefits */}
            <ul className="space-y-3 mb-8">
              {[
                { icon: Building2, text: "Cashless at 10,000+ hospitals" },
                { icon: Clock, text: "No waiting period for accidents" },
                { icon: Sparkles, text: "Free annual health checkups" },
                { icon: Check, text: "Coverage from ₹3L to ₹1Cr+" },
              ].map((benefit) => (
                <li
                  key={benefit.text}
                  className="flex items-center gap-3 text-sm"
                >
                  <benefit.icon className="w-4 h-4 text-primary shrink-0" />
                  <span>{benefit.text}</span>
                </li>
              ))}
            </ul>

            {/* CTA */}
            <Button
              onClick={onHealthClick}
              className="w-full h-12 font-semibold"
            >
              Explore Health Plans
              <ArrowRight className="ml-2 w-4 h-4" />
            </Button>

            {/* Price hint */}
            <p className="text-center text-sm text-muted-foreground mt-4">
              Starting{" "}
              <span className="font-semibold text-foreground">₹400/month</span>
            </p>
          </div>

          {/* Motor Insurance Card */}
          <div
            className="
              group relative
              p-8 rounded-2xl
              bg-gradient-to-br from-blue-500/5 via-background to-cyan-500/5
              border-2 border-foreground/10
              hover:border-blue-500/30
              shadow-lg hover:shadow-xl
              transition-all duration-300
            "
          >
            {/* Accent gradient */}
            <div className="absolute top-0 left-0 right-0 h-1 bg-gradient-to-r from-blue-500 to-cyan-500 rounded-t-2xl opacity-0 group-hover:opacity-100 transition-opacity" />

            {/* Icon */}
            <div
              className="
              w-14 h-14 rounded-xl
              bg-blue-500/10
              flex items-center justify-center
              mb-6
            "
            >
              <Car className="w-7 h-7 text-blue-500" />
            </div>

            {/* Content */}
            <h3 className="text-2xl font-bold mb-2">Motor Insurance</h3>
            <p className="text-muted-foreground mb-6">
              Drive with confidence. Whether it's your car, bike, or commercial
              vehicle—get the best rates from trusted insurers.
            </p>

            {/* Benefits */}
            <ul className="space-y-3 mb-8">
              {[
                { icon: Clock, text: "Instant policy issuance" },
                { icon: Wrench, text: "5,000+ cashless garages" },
                { icon: Sparkles, text: "24/7 roadside assistance" },
                { icon: Check, text: "Zero depreciation add-ons" },
              ].map((benefit) => (
                <li
                  key={benefit.text}
                  className="flex items-center gap-3 text-sm"
                >
                  <benefit.icon className="w-4 h-4 text-blue-500 flex-shrink-0" />
                  <span>{benefit.text}</span>
                </li>
              ))}
            </ul>

            {/* CTA */}
            <Button
              onClick={onMotorClick}
              className="
                w-full h-12
                bg-blue-600 hover:bg-blue-500
                dark:bg-blue-500 dark:hover:bg-blue-400
                text-white font-semibold
                border-2 border-blue-700 dark:border-blue-600
                shadow-[4px_4px_0px_0px_rgba(0,0,0,0.15)]
                hover:shadow-[2px_2px_0px_0px_rgba(0,0,0,0.15)]
                hover:translate-x-0.5 hover:translate-y-0.5
                transition-all duration-150
              "
            >
              Explore Motor Plans
              <ArrowRight className="ml-2 w-4 h-4" />
            </Button>

            {/* Price hint */}
            <p className="text-center text-sm text-muted-foreground mt-4">
              Starting{" "}
              <span className="font-semibold text-foreground">₹2,000/year</span>
            </p>
          </div>
        </div>
      </div>
    </section>
  );
}
