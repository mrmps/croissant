import {
  upsertRatings,
  getGlobalStats,
  deleteRating,
  getUserRatings,
  deleteAllUserRatings,
} from "@/actions/ratings";
import CroissantTourClientContent, { CroissantPlace } from "@/app/CroissantTourClientContent";
import type { Metadata } from "next";

export const metadata: Metadata = {
  title: "SF Croissant Tour",
  description: "Track your journey through San Francisco's best croissant spots | Find the best croissants in San Francisco and track your culinary journey.",
  openGraph: {
    title: "SF Croissant Tour",
    description: "Find the best croissants in San Francisco and track your culinary journey.",
    images: [
      {
        url: "/og.jpg", // Make sure this path is correct and the image exists in /public
        width: 1200,
        height: 630,
        alt: "A delicious croissant from SF Croissant Tour",
      },
    ],
    type: 'website',
  },
  twitter: {
    card: "summary_large_image",
    title: "SF Croissant Tour",
    description: "Find the best croissants in San Francisco and track your culinary journey.",
    images: ["/og.jpg"],
  },
};

const initialCroissantPlacesData: Omit<CroissantPlace, 'visited' | 'score'>[] = [
  {
    id: "1",
    name: "Arsicault Bakery",
    known_for: "Buttery croissants, kouign amann",
  },
  {
    id: "2",
    name: "Tartine Bakery",
    known_for: "Morning buns, chocolate croissants",
  },
  {
    id: "3",
    name: "b. patisserie",
    known_for: "Kouign amann, almond croissants",
  },
  {
    id: "4",
    name: "Neighbor Bakehouse",
    known_for: "Savory croissants, twice-baked croissants",
  },
  {
    id: "5",
    name: "Jane the Bakery",
    known_for: "Seasonal fruit croissants, artisan breads",
  },
  {
    id: "6",
    name: "Thorough Bread",
    known_for: "Almond croissants, fruit tarts",
  },
  {
    id: "7",
    name: "Craftsman and Wolves",
    known_for: "Rebel Within muffin, innovative pastries",
  },
  {
    id: "8",
    name: "Le Marais Bakery",
    known_for: "Organic French pastries, giant croissant",
  },
  {
    id: "9",
    name: "Vive La Tarte",
    known_for: "Tacro®, Belgian-inspired croissants",
  },
];

async function getInitialPlacesWithUserData(): Promise<CroissantPlace[]> {
  const userRatings = await getUserRatings();
  return initialCroissantPlacesData.map(p => {
    const userRating = userRatings.find(ur => ur.placeId === p.id);
          return {
            ...p,
            visited: userRating ? true : false,
            score: userRating ? userRating.rating : null,
    };
  });
}

export default async function CroissantTourPage() {
  // Fetch data directly as this is a Server Component
  const initialPlaces = await getInitialPlacesWithUserData();
  const initialGlobalStats = await getGlobalStats();

  return (
    <CroissantTourClientContent
      initialPlaces={initialPlaces}
      initialGlobalStats={initialGlobalStats}
      // Pass server actions down to the client component
      upsertRatingsAction={upsertRatings}
      deleteRatingAction={deleteRating}
      getGlobalStatsAction={getGlobalStats} // To refresh stats after an action
      deleteAllUserRatingsAction={deleteAllUserRatings}
    />
  );
}
