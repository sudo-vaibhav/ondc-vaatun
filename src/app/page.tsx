"use client";

import { useRef } from "react";

import { Header } from "@/components/header";
import {
  CTABanner,
  HeroSection,
  HowItWorks,
  InsuranceCards,
  LiveSearchProvider,
  TrustStrip,
  WhyONDC,
} from "@/components/home";

export default function Home() {
  const howItWorksRef = useRef<HTMLDivElement>(null);

  const scrollToHowItWorks = () => {
    howItWorksRef.current?.scrollIntoView({ behavior: "smooth" });
  };

  const scrollToTop = () => {
    window.scrollTo({ top: 0, behavior: "smooth" });
  };

  return (
    <LiveSearchProvider>
      <div className="min-h-screen bg-background">
        <Header />

        {/* Hero Section with Spline 3D */}
        <HeroSection
          onGetQuoteClick={scrollToTop}
          onLearnMoreClick={scrollToHowItWorks}
        />

        {/* Trust Indicators - uses live data from context */}
        <TrustStrip />

        {/* Insurance Vertical Cards */}
        <InsuranceCards />

        {/* How It Works */}
        <div ref={howItWorksRef}>
          <HowItWorks />
        </div>

        {/* Why ONDC */}
        <WhyONDC />

        {/* Final CTA */}
        <CTABanner onGetQuoteClick={scrollToTop} />
      </div>
    </LiveSearchProvider>
  );
}
