"use client";

import React, { useState, useEffect, useRef, useTransition } from "react";
import { Checkbox } from "@/components/ui/checkbox";
import { motion, AnimatePresence } from "framer-motion";
import HandDrawnStrikethrough from "@/components/hand-drawn-strikethrough";
import { useRouter } from "next/navigation"; // For potential refresh or navigation

// Define types within the client component file or import if available globally
export interface CroissantPlace {
  id: string;
  name: string;
  known_for: string;
  visited: boolean;
  score: number | null;
}

export interface GlobalStats {
  placeId: string;
  avgRating: number;
  totalRatings: number;
}

// Type for the server actions passed as props
type UpsertRatingsAction = (ratings: { placeId: string; rating: number }[]) => Promise<void>;
type DeleteRatingAction = (placeId: string) => Promise<void>;
type GetGlobalStatsAction = () => Promise<GlobalStats[]>;
type DeleteAllUserRatingsAction = () => Promise<void>;


interface CroissantTourClientContentProps {
  initialPlaces: CroissantPlace[];
  initialGlobalStats: GlobalStats[];
  upsertRatingsAction: UpsertRatingsAction;
  deleteRatingAction: DeleteRatingAction;
  getGlobalStatsAction: GetGlobalStatsAction;
  deleteAllUserRatingsAction: DeleteAllUserRatingsAction;
}

export default function CroissantTourClientContent({
  initialPlaces,
  initialGlobalStats,
  upsertRatingsAction,
  deleteRatingAction,
  getGlobalStatsAction,
  deleteAllUserRatingsAction,
}: CroissantTourClientContentProps) {
  const [places, setPlaces] = useState<CroissantPlace[]>(initialPlaces);
  const [globalStats, setGlobalStats] = useState<GlobalStats[]>(initialGlobalStats);
  const [isInitialLoad, setIsInitialLoad] = useState(true); // For initial animation control
  const router = useRouter();
  const [isPending, startTransition] = useTransition();

  useEffect(() => {
    // Mark initial load as complete after a short delay to allow animations
    const timer = setTimeout(() => setIsInitialLoad(false), 500);
    return () => clearTimeout(timer);
  }, []);

  const refreshGlobalStats = async () => {
    const stats = await getGlobalStatsAction();
    setGlobalStats(stats);
  };

  const toggleVisited = async (id: string) => {
    const placeToUpdate = places.find((place) => place.id === id);
    if (!placeToUpdate) return;

    const newVisitedState = !placeToUpdate.visited;
    const originalPlaces = [...places]; // Store original for potential revert

    // Optimistically update local state
    setPlaces(
      places.map((place) =>
        place.id === id ? { ...place, visited: newVisitedState, score: newVisitedState ? place.score : null } : place,
      ),
    );

    startTransition(async () => {
      try {
        if (!newVisitedState) {
          await deleteRatingAction(id);
        } else if (newVisitedState && placeToUpdate.score !== null) {
          await upsertRatingsAction([{ placeId: id, rating: placeToUpdate.score }]);
        }
        await refreshGlobalStats();
      } catch (error) {
        console.error("Failed to update visited status in DB:", error);
        setPlaces(originalPlaces); // Revert optimistic update
      }
    });
  };

  const setScore = async (id: string, score: number) => {
    const placeToUpdate = places.find((place) => place.id === id);
    if (!placeToUpdate) return;

    const newScore = placeToUpdate.score === score ? null : score;
    const originalPlaces = [...places]; // Store original for potential revert

    // Optimistically update local state
    setPlaces(
      places.map((place) =>
        place.id === id ? { ...place, score: newScore, visited: newScore !== null ? true : place.visited } : place,
      ),
    );

    startTransition(async () => {
      try {
        if (newScore === null) {
          await deleteRatingAction(id);
        } else {
          await upsertRatingsAction([{ placeId: id, rating: newScore }]);
        }
        await refreshGlobalStats();
      } catch (error) {
        console.error("Failed to update score in DB:", error);
        setPlaces(originalPlaces); // Revert optimistic update
      }
    });
  };
  
  const handleClearAllData = async () => {
    if (confirm("Are you sure you want to reset all your progress? This cannot be undone.")) {
      const originalPlaces = [...places];
      const originalGlobalStats = [...globalStats];

      // Optimistically update UI
      setPlaces(prevPlaces => prevPlaces.map(p => ({ ...p, visited: false, score: null })));
      // Potentially clear global stats or refetch them empty if appropriate
      // For now, we'll just refetch after action

      startTransition(async () => {
        try {
          await deleteAllUserRatingsAction();
          // Refetch initial state for places from scratch (or server-side initialCroissantPlaces if accessible)
          // For now, resetting to a transformed version of initialPlaces prop or a hardcoded one.
          // This part might need adjustment based on how initialCroissantPlaces is structured
          // and if it's available/passed to the client component for full reset.
          // The most robust way is to make the server component re-fetch and re-pass.
          // A simple client-side reset:
          const resetPlaces = initialPlaces.map(p => ({...p, visited: false, score: null}));
          setPlaces(resetPlaces);

          await refreshGlobalStats(); // Refresh global stats, which should now reflect the deletion
          router.refresh(); //Force a server-side re-render to get fresh data for initialPlaces and initialGlobalStats
        } catch (error) {
          console.error("Failed to reset progress:", error);
          // Revert optimistic update
          setPlaces(originalPlaces);
          setGlobalStats(originalGlobalStats);
          alert("Failed to reset data. Please try again.");
        }
      });
    }
  };


  const visitedPlaces = places.filter((place) => place.visited);
  const sortedPlaces = [...places].sort((a, b) => {
    if (a.visited && !b.visited) return -1;
    if (!a.visited && b.visited) return 1;
    if (a.visited && b.visited) {
      if ((b.score || 0) !== (a.score || 0)) return (b.score || 0) - (a.score || 0);
    }
    return a.name.localeCompare(b.name);
  });

  const containerVariants = {
    hidden: { opacity: 0 },
    show: { opacity: 1, transition: { staggerChildren: 0.05, delayChildren: 0.1 } },
  };

  const itemVariants = {
    hidden: { opacity: 0, y: 10 },
    show: { opacity: 1, y: 0, transition: { type: "spring", stiffness: 500, damping: 30, mass: 1 } },
  };

  const sectionVariants = {
    hidden: { opacity: 0, y: 15 },
    show: { opacity: 1, y: 0, transition: { type: "spring", stiffness: 300, damping: 30, mass: 1, delay: 0.1 } },
  };

  return (
    <div className="mx-auto max-w-[692px] overflow-x-hidden px-6 py-12 text-gray-1200 antialiased sm:py-32 md:overflow-x-visible md:py-16">
      <motion.header
        className="mb-12 flex flex-col items-start"
        initial={{ opacity: 0, y: -10 }}
        animate={{ opacity: 1, y: 0 }}
        transition={{ duration: 0.3, delay: 0.1 }}
      >
        <span className="text-medium inline-block font-medium no-underline">SF Croissant Tour</span>
        <span className="text-medium font-medium leading-none text-gray-600">Track your croissant adventures</span>
      </motion.header>

      <main>
        <motion.div
          className="mb-16 sm:mb-32"
          variants={sectionVariants}
          initial="hidden"
          animate="show" // Simplified, always show once loaded
        >
          <span className="mb-5 block font-medium sm:mb-6">Places</span>
          <motion.div
            className="flex flex-col gap-7 sm:gap-4"
            variants={containerVariants}
            initial="hidden"
            animate="show" // Simplified
          >
            <AnimatePresence mode="popLayout">
              {sortedPlaces.map((place) => (
                <PlaceItem
                  key={place.id}
                  place={place}
                  toggleVisited={toggleVisited}
                  setScore={setScore}
                  variants={itemVariants}
                  isInitialLoad={isInitialLoad} // Pass this down
                  globalStats={globalStats.find((stat) => stat.placeId === place.id)}
                />
              ))}
            </AnimatePresence>
          </motion.div>
        </motion.div>

        {visitedPlaces.length > 0 && (
          <motion.div
            className="mb-16 sm:mb-32"
            variants={sectionVariants}
            initial="hidden"
            animate="show"
          >
            <span className="mb-5 block font-medium sm:mb-6">Your Progress</span>
            <motion.div
              className="flex flex-col gap-7 sm:gap-4"
              variants={containerVariants}
              initial="hidden"
              animate="show"
            >
              <motion.div className="-mx-3 flex flex-col rounded-md px-3 sm:py-3" variants={itemVariants}>
                <span>Visited</span>
                <span className="text-gray-600">
                  {visitedPlaces.length} of {places.length} places
                </span>
              </motion.div>
              {visitedPlaces.filter((p) => p.score !== null).length > 0 && (
                <>
                  <motion.div className="-mx-3 flex flex-col rounded-md px-3 sm:py-3" variants={itemVariants}>
                    <span>Average Score</span>
                    <span className="text-gray-600">
                      {(
                        visitedPlaces.reduce((sum, place) => sum + (place.score || 0), 0) /
                        visitedPlaces.filter((p) => p.score !== null).length
                      ).toFixed(1)}{" "}
                      out of 5
                    </span>
                  </motion.div>
                  <motion.div className="-mx-3 flex flex-col rounded-md px-3 sm:py-3" variants={itemVariants}>
                    <span>Top Rated</span>
                    <span className="text-gray-600">
                      {
                        visitedPlaces.reduce((best, place) => ((place.score || 0) > (best.score || 0) ? place : best))
                          .name
                      }{" "}
                      (
                      {
                        visitedPlaces.reduce((best, place) => ((place.score || 0) > (best.score || 0) ? place : best))
                          .score
                      }
                      /5)
                    </span>
                  </motion.div>
                </>
              )}
            </motion.div>
          </motion.div>
        )}

        <motion.div
          className="mb-16 sm:mb-32"
          variants={sectionVariants}
          initial="hidden"
          animate="show"
        >
          <span className="mb-5 block font-medium sm:mb-6">Global Stats</span>
          <motion.div
            className="flex flex-col gap-7 sm:gap-4"
            variants={containerVariants}
            initial="hidden"
            animate="show"
          >
            {globalStats.length > 0 ? (
              globalStats
                .sort((a, b) => b.avgRating - a.avgRating) // ensure sorting is applied
                .map((stat) => {
                  const place = places.find((p) => p.id === stat.placeId);
                  return (
                    <motion.div
                      key={stat.placeId}
                      className="-mx-3 flex flex-col rounded-md px-3 sm:py-3"
                      variants={itemVariants}
                    >
                      <span>{place?.name || "Unknown Place"}</span>
                      <span className="text-gray-600">
                        {stat.avgRating.toFixed(1)} / 5 ({stat.totalRatings}{" "}
                        {stat.totalRatings === 1 ? "rating" : "ratings"})
                      </span>
                    </motion.div>
                  );
                })
            ) : (
              <motion.div className="-mx-3 flex flex-col rounded-md px-3 sm:py-3" variants={itemVariants}>
                <span className="text-gray-600">No global ratings yet. Be the first to rate!</span>
              </motion.div>
            )}
          </motion.div>
        </motion.div>

        <motion.div
          className="mb-16 sm:mb-32"
          variants={sectionVariants}
          initial="hidden"
          animate="show"
        >
          <span className="mb-5 block font-medium sm:mb-6">About</span>
          <p className="text-gray-600">
            This is a simple app to track your journey through San Francisco's best croissant spots. Check off places as
            you visit them and rate your experience from 1 to 5.
          </p>
          <p className="mt-4 text-gray-600">
            Your progress is automatically saved. Ratings are shared anonymously to contribute to global statistics.
          </p>
        </motion.div>

        <motion.div className="pb-1" variants={sectionVariants} initial="hidden" animate="show">
          <span className="mb-5 block font-medium sm:mb-6">Reset</span>
          <motion.button
            whileHover={{ scale: 1.02 }}
            whileTap={{ scale: 0.98 }}
            onClick={handleClearAllData}
            disabled={isPending}
            className="hover:bg-gray-1200/90 h-[30px] w-auto min-w-[80px] rounded-[4px] bg-gray-1200 px-3.5 text-sm font-medium text-gray-100 outline-none focus:shadow-focus-ring md:w-auto md:px-3.5 disabled:opacity-50"
          >
            <span className="block">{isPending ? "Resetting..." : "Reset All Data"}</span>
          </motion.button>
        </motion.div>
      </main>
    </div>
  );
}

// PlaceItem sub-component
function PlaceItem({
  place,
  toggleVisited,
  setScore,
  variants,
  isInitialLoad,
  globalStats,
}: {
  place: CroissantPlace;
  toggleVisited: (id: string) => void;
  setScore: (id: string, score: number) => void;
  variants: any;
  isInitialLoad: boolean;
  globalStats?: GlobalStats;
}) {
  const textRef = useRef<HTMLElement>(null);
  const [isPending, startTransition] = useTransition(); // For individual item actions

  const handleToggleVisited = () => {
    startTransition(() => {
      toggleVisited(place.id);
    });
  };

  const handleSetScore = (score: number) => {
    startTransition(() => {
      setScore(place.id, score);
    });
  };

  return (
    <motion.div
      layout
      variants={variants}
      className={`-mx-3 flex flex-col rounded-md px-3 hover:bg-[#F5F4F4] dark:hover:bg-gray-200 sm:py-3 ${
        place.visited ? "opacity-100" : "opacity-60"
      } ${isPending ? "opacity-50 cursor-not-allowed" : ""}`}
      transition={{ type: "spring", stiffness: 500, damping: 30 }}
    >
      <div className="flex items-start justify-between">
        <div className="flex items-start gap-2">
          <motion.div whileTap={{ scale: 0.9 }} transition={{ duration: 0.1 }}>
            <Checkbox
              id={`visited-${place.id}`}
              checked={place.visited}
              onCheckedChange={handleToggleVisited}
              disabled={isPending}
              className="mt-1 h-4 w-4 rounded-sm border-zinc-600 data-[state=checked]:bg-zinc-600 data-[state=checked]:text-white data-[state=checked]:border-zinc-600"
            />
          </motion.div>
          <div>
            <motion.span ref={textRef} layout className="relative inline-block" transition={{ duration: 0.2 }}>
              {place.name}
              {place.visited && textRef.current && (
                <HandDrawnStrikethrough parentRef={textRef as React.RefObject<HTMLElement>} placeId={place.id} isInitialLoad={isInitialLoad} />
              )}
            </motion.span>
            <motion.span layout className="block text-gray-600" transition={{ duration: 0.2 }}>
              {place.known_for}
              {globalStats && (
                <span className="ml-2 text-xs text-gray-500">
                  (Global: {globalStats.avgRating.toFixed(1)}/5 from {globalStats.totalRatings}{" "}
                  {globalStats.totalRatings === 1 ? "user" : "users"})
                </span>
              )}
            </motion.span>
          </div>
        </div>

        <AnimatePresence mode="popLayout">
          {place.visited && (
            <motion.div
              className="flex items-center gap-1"
              initial={{ opacity: 0, scale: 0.8 }}
              animate={{ opacity: 1, scale: 1 }}
              exit={{ opacity: 0, scale: 0.8 }}
              transition={{ duration: 0.15 }}
            >
              {[1, 2, 3, 4, 5].map((scoreValue) => (
                <motion.button
                  key={scoreValue}
                  whileHover={{ scale: 1.1 }}
                  whileTap={{ scale: 0.9 }}
                  className={`flex h-6 w-6 items-center justify-center rounded-md text-sm ${
                    place.score === scoreValue ? "bg-gray-1200 text-white" : "text-gray-600 hover:bg-gray-100"
                  } ${isPending ? "cursor-not-allowed" : ""}`}
                  onClick={() => handleSetScore(scoreValue)}
                  disabled={isPending}
                  transition={{ type: "spring", stiffness: 400, damping: 17 }}
                >
                  {scoreValue}
                </motion.button>
              ))}
            </motion.div>
          )}
        </AnimatePresence>
      </div>
    </motion.div>
  );
} 