"use client"

import { useState, useEffect, useRef } from "react"
import { Checkbox } from "@/components/ui/checkbox"
import { motion, AnimatePresence } from "framer-motion"
import HandDrawnStrikethrough from "@/components/hand-drawn-strikethrough"
import { upsertRatings, getGlobalStats, deleteRating, getUserRatings, deleteAllUserRatings } from "@/actions/ratings"
import { useRouter } from "next/navigation"

interface CroissantPlace {
  id: string
  name: string
  known_for: string
  visited: boolean
  score: number | null
}

interface GlobalStats {
  placeId: string
  avgRating: number
  totalRatings: number
}

// Define the initial state for places outside the component to avoid re-declaration on re-renders
// and to make it easily accessible for resetting.
const initialCroissantPlaces: CroissantPlace[] = [
  {
    id: "1",
    name: "Arsicault Bakery",
    known_for: "Buttery croissants, kouign amann",
    visited: false,
    score: null,
  },
  {
    id: "2",
    name: "Tartine Bakery",
    known_for: "Morning buns, chocolate croissants",
    visited: false,
    score: null,
  },
  {
    id: "3",
    name: "b. patisserie",
    known_for: "Kouign amann, almond croissants",
    visited: false,
    score: null,
  },
  {
    id: "4",
    name: "Neighbor Bakehouse",
    known_for: "Savory croissants, twice-baked croissants",
    visited: false,
    score: null,
  },
  {
    id: "5",
    name: "Jane the Bakery",
    known_for: "Seasonal fruit croissants, artisan breads",
    visited: false,
    score: null,
  },
  {
    id: "6",
    name: "Thorough Bread",
    known_for: "Almond croissants, fruit tarts",
    visited: false,
    score: null,
  },
  {
    id: "7",
    name: "Craftsman and Wolves",
    known_for: "Rebel Within muffin, innovative pastries",
    visited: false,
    score: null,
  },
  {
    id: "8",
    name: "Le Marais Bakery",
    known_for: "Organic French pastries, giant croissant",
    visited: false,
    score: null,
  },
  {
    id: "9",
    name: "Vive La Tarte",
    known_for: "Tacro®, Belgian-inspired croissants",
    visited: false,
    score: null,
  },
]

export default function CroissantTour() {
  // Initialize places state with a deep copy of the initial data to prevent direct mutation.
  // The actual data will be populated from DB in useEffect.
  const [places, setPlaces] = useState<CroissantPlace[]>(() => 
    initialCroissantPlaces.map(p => ({ ...p }))
  );
  const [isLoaded, setIsLoaded] = useState(false)
  const [isInitialLoad, setIsInitialLoad] = useState(true)
  const [globalStats, setGlobalStats] = useState<GlobalStats[]>([])
  const router = useRouter()

  // Load data from DB on initial render
  useEffect(() => {
    async function loadData() {
      const userRatings = await getUserRatings()
      const stats = await getGlobalStats()
      setGlobalStats(stats)

      setPlaces(prevPlaces => 
        initialCroissantPlaces.map(p => {
          const userRating = userRatings.find(ur => ur.placeId === p.id)
          return {
            ...p,
            visited: userRating ? true : false,
            score: userRating ? userRating.rating : null,
          }
        })
      )
      
      // Slight delay to ensure smooth initial animation and proper text rendering
      setTimeout(() => {
        setIsLoaded(true)
        // Mark initial load as complete after a longer delay to ensure text is rendered
        setTimeout(() => setIsInitialLoad(false), 500)
      }, 100)
    }

    loadData()
    // Fetch global stats is now part of loadData
  }, [])

  const toggleVisited = async (id: string) => {
    let placeToUpdate = places.find((place) => place.id === id)
    if (!placeToUpdate) return

    const newVisitedState = !placeToUpdate.visited

    // Optimistically update local state
    setPlaces(
      places.map((place) =>
        place.id === id ? { ...place, visited: newVisitedState, score: newVisitedState ? place.score : null } : place,
      ),
    )

    try {
      if (!newVisitedState) {
        // If unchecking (marking as not visited), delete the rating
        await deleteRating(id)
      } else if (newVisitedState && placeToUpdate.score !== null) {
        // If checking (marking as visited) AND a score already exists (e.g. data inconsistency or pre-filled), upsert it.
        // Normally, score is set via setScore, but this handles edge cases.
        await upsertRatings([{ placeId: id, rating: placeToUpdate.score }])
      }
      // If newVisitedState is true but score is null, user needs to click a score to create a rating.
      // No DB action here, setScore will handle it.
      const stats = await getGlobalStats() // Refresh global stats
      setGlobalStats(stats)
    } catch (error) {
      console.error("Failed to update visited status in DB:", error)
      // Optionally, revert optimistic update here if needed
      setPlaces(
        places.map((place) =>
          place.id === id ? { ...place, visited: placeToUpdate!.visited, score: placeToUpdate!.score } : place,
        ),
      )
    }
  }

  const setScore = async (id: string, score: number) => {
    const placeToUpdate = places.find((place) => place.id === id)
    if (!placeToUpdate) return

    const newScore = placeToUpdate.score === score ? null : score

    // Optimistically update local state
    setPlaces(
      places.map((place) =>
        place.id === id ? { ...place, score: newScore, visited: newScore !== null ? true : place.visited } : place,
      ),
    )

    try {
      if (newScore === null) {
        // If score is removed, delete the rating
        await deleteRating(id)
      } else {
        // If score is set or changed, upsert the rating
        await upsertRatings([{ placeId: id, rating: newScore }])
      }
      const stats = await getGlobalStats() // Refresh global stats
      setGlobalStats(stats)
    } catch (error) {
      console.error("Failed to update score in DB:", error)
      // Optionally, revert optimistic update here
      setPlaces(
        places.map((place) => (place.id === id ? { ...placeToUpdate, score: placeToUpdate!.score } : place)),
      )
    }
  }

  const visitedPlaces = places.filter((place) => place.visited)
  const sortedPlaces = [...places].sort((a, b) => {
    // Visited places first, then by score (highest first), then by name
    if (a.visited && !b.visited) return -1
    if (!a.visited && b.visited) return 1
    if (a.visited && b.visited) {
      if ((b.score || 0) !== (a.score || 0)) return (b.score || 0) - (a.score || 0)
    }
    return a.name.localeCompare(b.name)
  })

  // Animation variants
  const containerVariants = {
    hidden: { opacity: 0 },
    show: {
      opacity: 1,
      transition: {
        staggerChildren: 0.05,
        delayChildren: 0.1,
      },
    },
  }

  const itemVariants = {
    hidden: { opacity: 0, y: 10 },
    show: {
      opacity: 1,
      y: 0,
      transition: {
        type: "spring",
        stiffness: 500,
        damping: 30,
        mass: 1,
      },
    },
  }

  const sectionVariants = {
    hidden: { opacity: 0, y: 15 },
    show: {
      opacity: 1,
      y: 0,
      transition: {
        type: "spring",
        stiffness: 300,
        damping: 30,
        mass: 1,
        delay: 0.1,
      },
    },
  }

  return (
    <div className="mx-auto max-w-[692px] overflow-x-hidden px-6 py-12 text-gray-1200 antialiased sm:py-32 md:overflow-x-visible md:py-16">
      <motion.header
        className="mb-32 flex flex-col items-start"
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
          animate={isLoaded ? "show" : "hidden"}
        >
          <span className="mb-5 block font-medium sm:mb-6">Places</span>
          <motion.div
            className="flex flex-col gap-7 sm:gap-4"
            variants={containerVariants}
            initial="hidden"
            animate={isLoaded ? "show" : "hidden"}
          >
            <AnimatePresence mode="popLayout">
              {sortedPlaces.map((place) => (
                <PlaceItem
                  key={place.id}
                  place={place}
                  toggleVisited={toggleVisited}
                  setScore={setScore}
                  variants={itemVariants}
                  isInitialLoad={isInitialLoad}
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
            animate={isLoaded ? "show" : "hidden"}
          >
            <span className="mb-5 block font-medium sm:mb-6">Your Progress</span>
            <motion.div
              className="flex flex-col gap-7 sm:gap-4"
              variants={containerVariants}
              initial="hidden"
              animate={isLoaded ? "show" : "hidden"}
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
          animate={isLoaded ? "show" : "hidden"}
        >
          <span className="mb-5 block font-medium sm:mb-6">Global Stats</span>
          <motion.div
            className="flex flex-col gap-7 sm:gap-4"
            variants={containerVariants}
            initial="hidden"
            animate={isLoaded ? "show" : "hidden"}
          >
            {globalStats.length > 0 ? (
              globalStats
                .sort((a, b) => b.avgRating - a.avgRating)
                .map((stat) => {
                  const place = places.find((p) => p.id === stat.placeId)
                  return (
                    <motion.div
                      key={stat.placeId}
                      className="-mx-3 flex flex-col rounded-md px-3 sm:py-3"
                      variants={itemVariants}
                    >
                      <span>{place?.name}</span>
                      <span className="text-gray-600">
                        {stat.avgRating.toFixed(1)} / 5 ({stat.totalRatings}{" "}
                        {stat.totalRatings === 1 ? "rating" : "ratings"})
                      </span>
                    </motion.div>
                  )
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
          animate={isLoaded ? "show" : "hidden"}
        >
          <span className="mb-5 block font-medium sm:mb-6">About</span>
          <p className="text-gray-600">
            This is a simple app to track your journey through San Francisco's best croissant spots. Check off places as
            you visit them and rate your experience from 1 to 5.
          </p>
          <p className="mt-4 text-gray-600">
            Your progress is automatically saved in your browser and anonymously shared to show global ratings. Visited
            places appear at the top, sorted by rating.
          </p>
        </motion.div>

        <motion.div className="pb-1" variants={sectionVariants} initial="hidden" animate={isLoaded ? "show" : "hidden"}>
          <span className="mb-5 block font-medium sm:mb-6">Reset</span>
          <motion.button
            whileHover={{ scale: 1.02 }}
            whileTap={{ scale: 0.98 }}
            onClick={async () => {
              if (confirm("Are you sure you want to reset all your progress?")) {
                try {
                  await deleteAllUserRatings()
                  setPlaces(initialCroissantPlaces.map(p => ({...p}))) // Reset to initial state
                  const stats = await getGlobalStats() // Refresh global stats
                  setGlobalStats(stats)
                  // router.refresh() // May not be needed if state correctly resets UI
                } catch (error) {
                  console.error("Failed to reset progress:", error)
                  // Handle error (e.g., show a notification to the user)
                }
              }
            }}
            className="hover:bg-gray-1200/90 h-[30px] w-[80px] rounded-[4px] bg-gray-1200 px-1.5 text-sm font-medium text-gray-100 outline-none focus:shadow-focus-ring md:w-[104px] md:px-3.5"
          >
            <span className="block">Reset</span>
          </motion.button>
        </motion.div>
      </main>
    </div>
  )
}

function PlaceItem({
  place,
  toggleVisited,
  setScore,
  variants,
  isInitialLoad,
  globalStats,
}: {
  place: CroissantPlace
  toggleVisited: (id: string) => void
  setScore: (id: string, score: number) => void
  variants: any
  isInitialLoad: boolean
  globalStats?: GlobalStats
}) {
  const textRef = useRef<HTMLElement>(null)

  return (
    <motion.div
      layout
      variants={variants}
      className={`-mx-3 flex flex-col rounded-md px-3 hover:bg-[#F5F4F4] dark:hover:bg-gray-200 sm:py-3 ${
        place.visited ? "opacity-100" : "opacity-60"
      }`}
      transition={{ type: "spring", stiffness: 500, damping: 30 }}
    >
      <div className="flex items-start justify-between">
        <div className="flex items-start gap-2">
          <motion.div whileTap={{ scale: 0.9 }} transition={{ duration: 0.1 }}>
            <Checkbox
              id={`visited-${place.id}`}
              checked={place.visited}
              onCheckedChange={() => toggleVisited(place.id)}
              className="mt-1 h-4 w-4 rounded-sm"
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
              {[1, 2, 3, 4, 5].map((score) => (
                <motion.button
                  key={score}
                  whileHover={{ scale: 1.1 }}
                  whileTap={{ scale: 0.9 }}
                  className={`flex h-6 w-6 items-center justify-center rounded-md text-sm ${
                    place.score === score ? "bg-gray-1200 text-white" : "text-gray-600 hover:bg-gray-100"
                  }`}
                  onClick={() => setScore(place.id, score)}
                  transition={{ type: "spring", stiffness: 400, damping: 17 }}
                >
                  {score}
                </motion.button>
              ))}
            </motion.div>
          )}
        </AnimatePresence>
      </div>
    </motion.div>
  )
}
