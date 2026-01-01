"use client";

export function PrismSphere() {
  return (
    <div className="absolute inset-0 flex items-center justify-center">
      <div className="relative w-64 h-64 md:w-80 md:h-80 lg:w-96 lg:h-96 animate-float">
        <div className="absolute -inset-8 bg-gradient-to-br from-primary/20 via-accent/10 to-primary/20 rounded-full blur-3xl" />
        <div className="absolute inset-0 rounded-full border-2 border-primary/20 animate-spin-slow" />
        <div className="absolute inset-4 rounded-full border border-accent/15 animate-spin-reverse" />
        <div className="absolute inset-12 rounded-full overflow-hidden shadow-2xl shadow-primary/30">
          <div className="absolute inset-0 bg-primary" />
          <div
            className="absolute inset-0 opacity-40"
            style={{
              background:
                "repeating-linear-gradient(-45deg, transparent, transparent 6px, rgba(255,255,255,0.15) 6px, rgba(255,255,255,0.15) 12px)",
            }}
          />
          <div className="absolute inset-0 bg-gradient-to-t from-transparent via-white/5 to-white/20" />
          <div className="absolute top-2 left-1/4 w-1/3 h-1/4 bg-white/40 rounded-full blur-2xl" />
        </div>
      </div>
    </div>
  );
}
