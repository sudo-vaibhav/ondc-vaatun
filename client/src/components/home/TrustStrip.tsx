import { Building2, IndianRupee, Network, Shield } from "lucide-react";
import { useEffect, useRef, useState } from "react";
import { Badge } from "@/components/ui/badge";

import { useLiveSearch } from "./LiveSearchContext";

// Animated counter hook
function useAnimatedCounter(target: number, duration = 1000) {
  const [count, setCount] = useState(0);
  const startTime = useRef<number | null>(null);
  const prevTarget = useRef(target);

  useEffect(() => {
    if (target === 0) return;

    // Reset animation when target changes
    if (target !== prevTarget.current) {
      startTime.current = null;
      prevTarget.current = target;
    }

    const animate = (timestamp: number) => {
      if (!startTime.current) startTime.current = timestamp;
      const progress = Math.min((timestamp - startTime.current) / duration, 1);

      setCount(Math.floor(progress * target));

      if (progress < 1) {
        requestAnimationFrame(animate);
      }
    };

    requestAnimationFrame(animate);

    return () => {
      startTime.current = null;
    };
  }, [target, duration]);

  return count;
}

export function TrustStrip() {
  // Get live data from context
  const { insurers, insurerCount, isLive, status } = useLiveSearch();

  // Only show live insurers - no fallback
  const hasLiveInsurers = insurers.length > 0;

  // Animated count - only animate actual count
  const animatedCount = useAnimatedCounter(insurerCount, 1500);

  const stats = [
    {
      icon: Building2,
      value: `${animatedCount}+`,
      label: isLive ? "Insurers Responding" : "Insurers on Network",
      highlight: isLive || status === "streaming",
    },
    {
      icon: IndianRupee,
      value: "₹0",
      label: "Platform Fees",
      highlight: false,
    },
    {
      icon: Shield,
      value: "IRDAI",
      label: "Regulated Insurers",
      highlight: false,
    },
    {
      icon: Network,
      value: "ONDC",
      label: "Powered By",
      highlight: false,
    },
  ];

  // Create duplicated list for seamless marquee (only if we have live data)
  const marqueeInsurers = hasLiveInsurers
    ? [...insurers, ...insurers.slice(0, Math.min(5, insurers.length))]
    : [];

  return (
    <section className="relative py-8 overflow-hidden">
      {/* Subtle background */}
      <div className="absolute inset-0 bg-gradient-to-r from-primary/5 via-transparent to-accent/10" />

      <div className="container mx-auto px-4">
        {/* Stats Grid */}
        <div className="grid grid-cols-2 md:grid-cols-4 gap-4 md:gap-8">
          {stats.map((stat, index) => (
            <div
              key={stat.label}
              className={`
                relative flex flex-col items-center justify-center
                p-4 md:p-6 rounded-xl
                bg-background/50 backdrop-blur-sm
                border border-foreground/5
                transition-all duration-300
                hover:border-primary/20 hover:bg-primary/5
                animate-in opacity-0
              `}
              style={{
                animationDelay: `${index * 100}ms`,
                animationFillMode: "forwards",
              }}
            >
              {/* Live indicator */}
              {stat.highlight && (
                <Badge
                  variant="outline"
                  className="
                    absolute -top-2 -right-2
                    px-2 py-0.5
                    text-[10px] font-bold
                    bg-primary/10 border-primary/30
                    text-primary
                  "
                >
                  <span className="w-1.5 h-1.5 rounded-full bg-primary animate-pulse mr-1 inline-block" />
                  LIVE
                </Badge>
              )}

              <stat.icon
                className={`
                  w-6 h-6 mb-2
                  ${stat.highlight ? "text-primary" : "text-muted-foreground"}
                `}
              />

              <span
                className={`
                  text-2xl md:text-3xl font-black tracking-tight
                  ${stat.highlight ? "text-primary" : "text-foreground"}
                `}
              >
                {stat.value}
              </span>

              <span className="text-xs md:text-sm text-muted-foreground text-center mt-1">
                {stat.label}
              </span>
            </div>
          ))}
        </div>

        {/* Insurer Logo Marquee - only show if we have live data */}
        {hasLiveInsurers && (
          <div className="mt-8 relative">
            <div className="absolute left-0 top-0 bottom-0 w-16 bg-linear-to-r from-background to-transparent z-10" />
            <div className="absolute right-0 top-0 bottom-0 w-16 bg-linear-to-l from-background to-transparent z-10" />

            <div className="overflow-hidden">
              <div className="flex items-center gap-6 animate-marquee">
                {marqueeInsurers.map((insurer, idx) => (
                  <div
                    key={`${insurer.id}-${idx}`}
                    className="
                      flex-shrink-0 flex items-center gap-4
                      px-5 py-4
                      bg-background/80 backdrop-blur-sm
                      border-2 border-primary/20
                      rounded-xl
                      shadow-sm
                      text-sm font-medium whitespace-nowrap
                      hover:border-primary/40 hover:shadow-md
                      transition-all duration-200
                    "
                  >
                    {/* Logo or placeholder */}
                    {insurer.logoUrl ? (
                      <img
                        src={insurer.logoUrl}
                        alt={`${insurer.name} logo`}
                        width={40}
                        height={40}
                        className="w-10 h-10 rounded-lg object-contain bg-white p-1 border border-primary/30"
                        onError={(e) => {
                          // Hide broken image, show placeholder
                          e.currentTarget.style.display = "none";
                          e.currentTarget.nextElementSibling?.classList.remove(
                            "hidden",
                          );
                        }}
                      />
                    ) : null}
                    <div
                      className={`w-10 h-10 rounded-lg flex items-center justify-center bg-linear-to-br from-primary/20 to-accent/20 text-primary text-base font-bold border border-primary/30 ${insurer.logoUrl ? "hidden" : ""}`}
                    >
                      {insurer.name.charAt(0)}
                    </div>
                    <div className="flex flex-col">
                      <span className="text-foreground font-semibold">
                        {insurer.name}
                      </span>
                      <span className="text-xs text-muted-foreground flex items-center gap-1">
                        <span className="w-1.5 h-1.5 rounded-full bg-primary animate-pulse" />
                        Live on ONDC
                      </span>
                    </div>
                  </div>
                ))}
              </div>
            </div>
          </div>
        )}

        {/* Status text */}
        <p className="text-center text-xs text-muted-foreground mt-4">
          {isLive
            ? `${insurerCount} insurer${insurerCount !== 1 ? "s" : ""} responding in real-time...`
            : hasLiveInsurers
              ? `${insurerCount} insurers found on the network`
              : "Searching for insurers on the network..."}
        </p>
      </div>
    </section>
  );
}
