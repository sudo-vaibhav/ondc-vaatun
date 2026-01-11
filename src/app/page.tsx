"use client";

import { useRouter } from "next/navigation";
import { useRef, useState } from "react";

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
  const router = useRouter();
  const howItWorksRef = useRef<HTMLDivElement>(null);
  const [isNavigating, setIsNavigating] = useState<"health" | "motor" | null>(null);

  const scrollToHowItWorks = () => {
    howItWorksRef.current?.scrollIntoView({ behavior: "smooth" });
  };

  const scrollToTop = () => {
    window.scrollTo({ top: 0, behavior: "smooth" });
  };

  const handleHealthClick = async () => {
    if (isNavigating) return;
    setIsNavigating("health");
    try {
      const response = await fetch("/api/ondc/search", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ categoryCode: "HEALTH_INSURANCE" }),
      });
      if (!response.ok) throw new Error("Search failed");
      const { transactionId } = await response.json();
      router.push(`/health/${transactionId}`);
    } catch (error) {
      console.error("Failed to initiate health search:", error);
      setIsNavigating(null);
    }
  };

  const handleMotorClick = async () => {
    if (isNavigating) return;
    setIsNavigating("motor");
    try {
      const response = await fetch("/api/ondc/search", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ categoryCode: "MOTOR_INSURANCE" }),
      });
      if (!response.ok) throw new Error("Search failed");
      const { transactionId } = await response.json();
      router.push(`/motor/${transactionId}`);
    } catch (error) {
      console.error("Failed to initiate motor search:", error);
      setIsNavigating(null);
    }
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
        <InsuranceCards
          onHealthClick={handleHealthClick}
          onMotorClick={handleMotorClick}
        />

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
