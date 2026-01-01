"use client";

import { ArrowRight, MessageCircle } from "lucide-react";
import { Button } from "@/components/ui/button";

interface CTABannerProps {
  onGetQuoteClick?: () => void;
  onTalkToExpertClick?: () => void;
}

export function CTABanner({
  onGetQuoteClick,
  onTalkToExpertClick,
}: CTABannerProps) {
  return (
    <section className="py-16 md:py-24 relative overflow-hidden">
      {/* Background gradient */}
      <div className="absolute inset-0 bg-primary" />

      {/* Pattern overlay */}
      <div
        className="absolute inset-0 opacity-10"
        style={{
          backgroundImage: `
            linear-gradient(45deg, rgba(255,255,255,0.1) 25%, transparent 25%),
            linear-gradient(-45deg, rgba(255,255,255,0.1) 25%, transparent 25%),
            linear-gradient(45deg, transparent 75%, rgba(255,255,255,0.1) 75%),
            linear-gradient(-45deg, transparent 75%, rgba(255,255,255,0.1) 75%)
          `,
          backgroundSize: "20px 20px",
          backgroundPosition: "0 0, 0 10px, 10px -10px, -10px 0px",
        }}
      />

      {/* Ambient glow */}
      <div className="absolute top-0 left-1/4 w-96 h-96 bg-white/10 rounded-full blur-3xl" />
      <div className="absolute bottom-0 right-1/4 w-96 h-96 bg-accent/20 rounded-full blur-3xl" />

      <div className="container mx-auto px-4 relative">
        <div className="max-w-3xl mx-auto text-center">
          {/* Headline */}
          <h2 className="text-3xl md:text-5xl font-black tracking-tight text-white mb-4">
            Ready to Find Your Perfect Policy?
          </h2>

          {/* Subline */}
          <p className="text-lg md:text-xl text-white/80 mb-8 max-w-xl mx-auto">
            Join thousands of Indians saving money with transparent,
            open-network insurance.
          </p>

          {/* CTAs */}
          <div className="flex flex-col sm:flex-row items-center justify-center gap-4">
            <Button
              size="lg"
              onClick={onGetQuoteClick}
              className="
                h-14 px-8
                text-base font-semibold
                bg-white hover:bg-white/90
                text-primary
                border-2 border-white
                shadow-[4px_4px_0px_0px_rgba(0,0,0,0.2)]
                hover:shadow-[2px_2px_0px_0px_rgba(0,0,0,0.2)]
                hover:translate-x-0.5 hover:translate-y-0.5
                transition-all duration-150
              "
            >
              Get Your Free Quote
              <ArrowRight className="ml-2 w-5 h-5" />
            </Button>

            <Button
              variant="ghost"
              size="lg"
              onClick={onTalkToExpertClick}
              className="
                h-14 px-6
                text-base font-medium
                text-white hover:text-white
                hover:bg-white/10
                border-2 border-transparent hover:border-white/20
                transition-all duration-150
              "
            >
              <MessageCircle className="mr-2 w-5 h-5" />
              Talk to an Expert
            </Button>
          </div>

          {/* Trust line */}
          <p className="text-white/60 text-sm mt-8">
            No spam. No obligations. Just honest quotes.
          </p>
        </div>
      </div>
    </section>
  );
}
