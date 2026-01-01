"use client";

import Spline from "@splinetool/react-spline";
import { ArrowRight, ChevronDown, Sparkles } from "lucide-react";
import { Suspense, useState } from "react";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";

function SplineLoader() {
  return (
    <div className="absolute inset-0 flex items-center justify-center">
      <div className="w-16 h-16 rounded-full border-4 border-primary/20 border-t-primary animate-spin" />
    </div>
  );
}

interface HeroSectionProps {
  onGetQuoteClick?: () => void;
  onLearnMoreClick?: () => void;
}

export function HeroSection({
  onGetQuoteClick,
  onLearnMoreClick,
}: HeroSectionProps) {
  const [splineLoaded, setSplineLoaded] = useState(false);

  return (
    <section className="relative min-h-[90vh] overflow-hidden">
      {/* Spline 3D - positioned right and scaled up */}
      <div className="absolute top-0 right-0 bottom-0 w-[70%] z-0 overflow-hidden">
        <div className="absolute inset-0 scale-[3.1] origin-center translate-x-[10%]">
          <Suspense fallback={<SplineLoader />}>
            <Spline
              scene="https://prod.spline.design/dzIB-QyTBgg0GsRl/scene.splinecode"
              onLoad={() => setSplineLoaded(true)}
              className="w-full h-full"
            />
          </Suspense>
        </div>

        {/* Left edge fade to blend with background */}
        <div className="absolute inset-0 pointer-events-none bg-linear-to-r from-background via-background/50 to-transparent" />

        {/* Loading overlay that fades out */}
        <div
          className={`
            absolute inset-0 pointer-events-none
            bg-background
            transition-opacity duration-1000
            ${splineLoaded ? "opacity-0" : "opacity-100"}
          `}
        />
      </div>

      {/* Gradient overlay for text readability */}
      <div className="absolute inset-0 z-1 bg-linear-to-r from-background/95 via-background/70 to-transparent" />
      <div className="absolute inset-0 z-1 bg-linear-to-t from-background via-transparent to-background/50" />

      {/* Foreground Content */}
      <div className="container relative z-10 mx-auto px-4 pt-12 pb-24">
        <div className="flex items-center min-h-[80vh]">
          {/* Content - Left aligned */}
          <div className="relative space-y-8 max-w-xl">
            {/* Badge */}
            <div
              className="animate-in opacity-0"
              style={{ animationDelay: "0ms", animationFillMode: "forwards" }}
            >
              <Badge
                variant="outline"
                className="
                  inline-flex items-center gap-2 px-4 py-2
                  text-xs font-semibold tracking-widest uppercase
                  border-2 border-primary/30
                  bg-background/80 backdrop-blur-sm
                  text-primary
                  rounded-full
                "
              >
                <span className="w-2 h-2 rounded-full bg-primary animate-pulse" />
                Powered by ONDC
              </Badge>
            </div>

            {/* Headline */}
            <div className="space-y-4">
              <h1
                className="
                  animate-in opacity-0
                  text-5xl sm:text-6xl lg:text-7xl
                  font-black tracking-tight
                  leading-[0.95]
                "
                style={{
                  animationDelay: "100ms",
                  animationFillMode: "forwards",
                }}
              >
                <span className="block">Insurance,</span>
                <span className="block text-primary drop-shadow-sm">
                  Unchained.
                </span>
              </h1>

              <p
                className="
                  animate-in opacity-0
                  text-lg sm:text-xl lg:text-2xl
                  font-light tracking-wide
                  text-muted-foreground
                  max-w-lg
                  leading-relaxed
                "
                style={{
                  animationDelay: "200ms",
                  animationFillMode: "forwards",
                }}
              >
                Compare real-time quotes from India's leading insurers on the
                Open Network.
                <span className="font-medium text-foreground">
                  {" "}
                  No middlemen. No hidden fees.
                </span>
              </p>
            </div>

            {/* Supporting text */}
            <p
              className="
                animate-in opacity-0
                text-sm text-muted-foreground/80
                flex items-center gap-2
              "
              style={{ animationDelay: "300ms", animationFillMode: "forwards" }}
            >
              <Sparkles className="w-4 h-4 text-primary" />
              Backed by the Government of India initiative
            </p>

            {/* CTAs */}
            <div
              className="
                animate-in opacity-0
                flex flex-col sm:flex-row gap-4 pt-4
              "
              style={{ animationDelay: "400ms", animationFillMode: "forwards" }}
            >
              <Button size="lg" onClick={onGetQuoteClick}>
                Get Instant Quotes
                <ArrowRight className="ml-2 w-5 h-5 transition-transform group-hover:translate-x-1" />
              </Button>

              <Button
                variant="outline"
                size="lg"
                onClick={onLearnMoreClick}
                className="bg-background/80 backdrop-blur-sm"
              >
                See How It Works
                <ChevronDown className="ml-2 w-5 h-5" />
              </Button>
            </div>

            {/* Trust indicators mini */}
            <div
              className="
                animate-in opacity-0
                flex items-center gap-6 pt-8
                text-sm text-muted-foreground
              "
              style={{ animationDelay: "500ms", animationFillMode: "forwards" }}
            >
              <div className="flex items-center gap-2">
                <span className="w-1.5 h-1.5 rounded-full bg-primary" />
                No spam
              </div>
              <div className="flex items-center gap-2">
                <span className="w-1.5 h-1.5 rounded-full bg-primary" />
                No obligations
              </div>
              <div className="flex items-center gap-2">
                <span className="w-1.5 h-1.5 rounded-full bg-primary" />
                Instant results
              </div>
            </div>
          </div>
        </div>
      </div>

      {/* Bottom fade */}
      <div className="absolute bottom-0 left-0 right-0 h-32 z-2 bg-linear-to-t from-background to-transparent" />

      {/* CSS for animations */}
      <style jsx global>{`
        @keyframes fade-up {
          from {
            opacity: 0;
            transform: translateY(12px);
          }
          to {
            opacity: 1;
            transform: translateY(0);
          }
        }

        .animate-in {
          animation: fade-up 0.6s ease-out forwards;
        }
      `}</style>
    </section>
  );
}
