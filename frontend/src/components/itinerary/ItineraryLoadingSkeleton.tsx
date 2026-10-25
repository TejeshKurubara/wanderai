import React from 'react';
import { Compass, Sparkles } from 'lucide-react';

export const ItineraryLoadingSkeleton: React.FC = () => {
  return (
    <div className="flex-grow flex flex-col bg-background pb-20 animate-pulse-subtle">
      {/* Hero Header Skeleton */}
      <div className="relative h-72 md:h-96 w-full bg-surface-alt/70 overflow-hidden">
        <div className="absolute inset-0 bg-gradient-to-t from-background via-surface-alt/40 to-transparent" />

        {/* Top bar pills skeleton */}
        <div className="absolute top-5 left-4 right-4 max-w-7xl mx-auto flex justify-between items-center">
          <div className="w-10 h-10 rounded-full bg-surface/80 border border-border/60" />
          <div className="flex gap-2">
            <div className="w-24 h-8 rounded-xl bg-surface/80 border border-border/60" />
            <div className="w-24 h-8 rounded-xl bg-surface/80 border border-border/60" />
            <div className="w-24 h-8 rounded-xl bg-surface/80 border border-border/60" />
          </div>
        </div>

        {/* Hero title & details skeleton */}
        <div className="absolute bottom-6 left-0 right-0 px-6">
          <div className="max-w-7xl mx-auto space-y-3">
            <div className="w-36 h-4 bg-primary/20 rounded-md" />
            <div className="w-80 md:w-96 h-9 md:h-12 bg-surface rounded-2xl border border-border" />
            <div className="flex gap-3">
              <div className="w-28 h-7 bg-surface/80 rounded-xl border border-border" />
              <div className="w-24 h-7 bg-surface/80 rounded-xl border border-border" />
              <div className="w-32 h-7 bg-surface/80 rounded-xl border border-border" />
            </div>
          </div>
        </div>
      </div>

      {/* Tab bar skeleton */}
      <div className="bg-surface/80 border-b border-border py-3 px-6">
        <div className="max-w-7xl mx-auto flex gap-3 overflow-x-hidden">
          <div className="w-36 h-9 bg-primary/20 rounded-xl shrink-0" />
          <div className="w-32 h-9 bg-surface-alt rounded-xl shrink-0 border border-border/60" />
          <div className="w-28 h-9 bg-surface-alt rounded-xl shrink-0 border border-border/60" />
          <div className="w-28 h-9 bg-surface-alt rounded-xl shrink-0 border border-border/60" />
          <div className="w-32 h-9 bg-surface-alt rounded-xl shrink-0 border border-border/60" />
        </div>
      </div>

      {/* Main content day skeletons */}
      <div className="max-w-4xl mx-auto w-full px-4 sm:px-6 mt-8 space-y-10">
        {/* Status banner */}
        <div className="flex items-center justify-between p-4 bg-surface border border-border rounded-2xl">
          <div className="flex items-center gap-3">
            <div className="w-5 h-5 rounded-full border-2 border-primary border-t-transparent animate-spin" />
            <span className="text-xs sm:text-sm font-semibold text-text">
              Retrieving verified itinerary days & route coordinates...
            </span>
          </div>
          <div className="flex items-center gap-1.5 text-primary text-xs font-semibold">
            <Sparkles className="w-4 h-4 animate-pulse" />
            <span>AI Verified</span>
          </div>
        </div>

        {/* Day 1 Skeleton */}
        {[1, 2, 3].map((d) => (
          <div key={d} className="space-y-4">
            <div className="flex items-center gap-4">
              <div className="w-12 h-12 bg-surface-alt border border-border rounded-2xl flex items-center justify-center font-bold text-muted text-sm">
                D{d}
              </div>
              <div className="space-y-1.5">
                <div className="w-56 h-6 bg-surface-alt rounded-lg" />
                <div className="w-32 h-3 bg-surface-alt/70 rounded" />
              </div>
            </div>

            <div className="space-y-4 pl-14 sm:pl-16">
              {[1, 2].map((a) => (
                <div
                  key={a}
                  className="bg-surface border border-border p-5 rounded-2xl space-y-3"
                >
                  <div className="flex justify-between items-start">
                    <div className="w-48 h-5 bg-surface-alt rounded-md" />
                    <div className="w-20 h-4 bg-surface-alt/70 rounded-md" />
                  </div>
                  <div className="w-full h-3.5 bg-surface-alt/60 rounded" />
                  <div className="w-3/4 h-3.5 bg-surface-alt/60 rounded" />
                  <div className="flex gap-2 pt-1">
                    <div className="w-24 h-6 bg-surface-alt rounded-md" />
                    <div className="w-24 h-6 bg-surface-alt rounded-md" />
                  </div>
                </div>
              ))}
            </div>
          </div>
        ))}
      </div>
    </div>
  );
};

export default ItineraryLoadingSkeleton;
