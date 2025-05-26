import React from "react";

export default function CroissantTourSkeleton() {
  return (
    <div className="space-y-8 animate-pulse">
      {/* Places Skeleton */}
      <section>
        <div className="mb-3 h-4 w-20 rounded bg-gray-100" />
        <div className="space-y-2">
          {[...Array(4)].map((_, i) => (
            <div key={i} className="flex items-center gap-2 py-1">
              <div className="h-4 w-4 rounded-full bg-gray-100" />
              <div className="flex-1">
                <div className="h-3 w-32 rounded bg-gray-100 mb-1" />
                <div className="h-2 w-20 rounded bg-gray-50" />
              </div>
              <div className="flex gap-0.5">
                {[...Array(5)].map((_, j) => (
                  <div key={j} className="h-4 w-4 rounded bg-gray-50" />
                ))}
              </div>
            </div>
          ))}
        </div>
      </section>

      {/* Progress Skeleton */}
      <section>
        <div className="mb-3 h-4 w-20 rounded bg-gray-100" />
        <div className="space-y-1">
          <div className="h-2 w-16 rounded bg-gray-50" />
          <div className="h-2 w-20 rounded bg-gray-50" />
        </div>
      </section>

      {/* Global Stats Skeleton */}
      <section>
        <div className="mb-3 h-4 w-20 rounded bg-gray-100" />
        <div className="space-y-1">
          {[...Array(2)].map((_, i) => (
            <div key={i} className="h-2 w-24 rounded bg-gray-50" />
          ))}
        </div>
      </section>

      {/* About Skeleton */}
      <section>
        <div className="mb-3 h-4 w-20 rounded bg-gray-100" />
        <div className="space-y-1">
          <div className="h-2 w-40 rounded bg-gray-50" />
          <div className="h-2 w-28 rounded bg-gray-50" />
        </div>
      </section>

      {/* Reset Button Skeleton */}
      <div className="flex justify-center">
        <div className="h-6 w-20 rounded bg-gray-50" />
      </div>
    </div>
  );
} 