"use server"

import { cookies, headers } from "next/headers"
import { createHash } from "crypto"
import { neon } from "@neondatabase/serverless"

// Database connection using Neon's serverless driver
const sql = neon(
   process.env.DATABASE_URL!,
)

// Initialize database tables if they don't exist
async function initializeDatabase() {
  try {
    await sql`
      CREATE TABLE IF NOT EXISTS users (
        id TEXT PRIMARY KEY,
        created_at TIMESTAMP WITH TIME ZONE DEFAULT CURRENT_TIMESTAMP
      )
    `

    await sql`
      CREATE TABLE IF NOT EXISTS ratings (
        id SERIAL PRIMARY KEY,
        user_id TEXT REFERENCES users(id),
        place_id TEXT NOT NULL,
        rating INTEGER NOT NULL CHECK (rating BETWEEN 1 AND 5),
        created_at TIMESTAMP WITH TIME ZONE DEFAULT CURRENT_TIMESTAMP,
        updated_at TIMESTAMP WITH TIME ZONE DEFAULT CURRENT_TIMESTAMP,
        UNIQUE(user_id, place_id)
      )
    `
  } catch (error) {
    console.error("Error initializing database:", error)
  }
}

// Get a unique user ID based on IP address
async function getUserId(): Promise<string> {
  // Get IP from headers
  const headersList = await headers()
  const forwardedFor = headersList.get("x-forwarded-for")
  const ip = forwardedFor ? forwardedFor.split(",")[0] : "127.0.0.1"

  // Create a hash of the IP for anonymity
  const hash = createHash("sha256")
  hash.update(ip)

  // Get a unique identifier from cookies or create one
  const cookieStore = await cookies()
  let userId = cookieStore.get("croissant_user_id")?.value

  if (!userId) {
    // Create a unique ID combining the IP hash and a random value
    userId = `${hash.digest("hex").substring(0, 16)}-${Math.random().toString(36).substring(2, 10)}`
    // Store in a cookie for future visits
    cookieStore.set("croissant_user_id", userId, {
      maxAge: 60 * 60 * 24 * 365, // 1 year
      path: "/",
      sameSite: "strict",
      secure: process.env.NODE_ENV === "production",
    })
  }

  return userId
}

// Interface for rating data
interface RatingData {
  placeId: string
  rating: number
}

// Upsert ratings for a user
export async function upsertRatings(ratings: RatingData[]) {
  if (!ratings.length) return

  try {
    await initializeDatabase()
    const userId = await getUserId()

    // Ensure user exists
    await sql`
      INSERT INTO users (id) 
      VALUES (${userId}) 
      ON CONFLICT (id) DO NOTHING
    `

    // Upsert each rating
    for (const { placeId, rating } of ratings) {
      await sql`
        INSERT INTO ratings (user_id, place_id, rating) 
        VALUES (${userId}, ${placeId}, ${rating})
        ON CONFLICT (user_id, place_id) 
        DO UPDATE SET 
          rating = ${rating},
          updated_at = CURRENT_TIMESTAMP
      `
    }
  } catch (error) {
    console.error("Error upserting ratings:", error)
    throw error
  }
}

// Delete a rating for a user
export async function deleteRating(placeId: string) {
  try {
    await initializeDatabase()
    const userId = await getUserId()

    await sql`
      DELETE FROM ratings 
      WHERE user_id = ${userId} AND place_id = ${placeId}
    `
  } catch (error) {
    console.error("Error deleting rating:", error)
    throw error
  }
}

// Get all ratings for the current user
export async function getUserRatings() {
  try {
    await initializeDatabase()
    const userId = await getUserId()

    const result = await sql`
      SELECT place_id, rating 
      FROM ratings
      WHERE user_id = ${userId}
    `

    // Assuming the result rows have place_id and rating properties
    return result.map((row: any) => ({
      placeId: row.place_id,
      rating: row.rating,
    }))
  } catch (error) {
    console.error("Error getting user ratings:", error)
    return [] // Return empty array on error
  }
}

// Delete all ratings for the current user
export async function deleteAllUserRatings() {
  try {
    await initializeDatabase()
    const userId = await getUserId()

    await sql`
      DELETE FROM ratings 
      WHERE user_id = ${userId}
    `
  } catch (error) {
    console.error("Error deleting all user ratings:", error)
    throw error // Re-throw to allow caller to handle
  }
}

// Get global stats for all places
export async function getGlobalStats() {
  try {
    await initializeDatabase()

    const result = await sql`
      SELECT 
        place_id as "placeId",
        AVG(rating) as "avgRating",
        COUNT(*) as "totalRatings"
      FROM ratings
      GROUP BY place_id
      ORDER BY AVG(rating) DESC
    `

    return result.map((row) => ({
      placeId: row.placeId,
      avgRating: Number.parseFloat(row.avgRating),
      totalRatings: Number.parseInt(row.totalRatings),
    }))
  } catch (error) {
    console.error("Error getting global stats:", error)
    return []
  }
}

// Fetch all users and their ratings (for dashboard)
export async function getAllUserRatings() {
  try {
    await initializeDatabase();
    const result = await sql`
      SELECT users.id as user_id, ratings.place_id, ratings.rating, ratings.created_at
      FROM users
      LEFT JOIN ratings ON users.id = ratings.user_id
      ORDER BY users.id, ratings.created_at
    `;
    return result.map((row: any) => ({
      userId: row.user_id,
      placeId: row.place_id,
      rating: row.rating,
      createdAt: row.created_at,
    }));
  } catch (error) {
    console.error("Error fetching all user ratings:", error);
    return [];
  }
}
