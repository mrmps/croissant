import { getAllUserRatings } from "@/actions/ratings";
import React from "react";

const PLACES: Record<string, string> = {
  "1": "Arsicault Bakery",
  "2": "Tartine Bakery",
  "3": "b. patisserie",
  "4": "Neighbor Bakehouse",
  "5": "Jane the Bakery",
  "6": "Thorough Bread",
  "7": "Craftsman and Wolves",
  "8": "Le Marais Bakery",
  "9": "Vive La Tarte",
};

export default async function DashboardPage() {
  const allRatings = await getAllUserRatings();

  // Group by userId
  const grouped = allRatings.reduce((acc: Record<string, any[]>, row) => {
    if (!row.userId) return acc;
    if (!acc[row.userId]) acc[row.userId] = [];
    if (row.placeId) acc[row.userId].push(row);
    return acc;
  }, {});

  return (
    <div className="mx-auto max-w-3xl px-4 py-12">
      <h1 className="text-2xl font-bold mb-8">User Ratings Dashboard</h1>
      <div className="overflow-x-auto rounded-lg border border-gray-200 bg-white shadow-sm">
        <table className="min-w-full text-sm">
          <thead className="bg-gray-50">
            <tr>
              <th className="px-4 py-2 text-left font-semibold text-gray-700">User ID</th>
              <th className="px-4 py-2 text-left font-semibold text-gray-700">Place</th>
              <th className="px-4 py-2 text-left font-semibold text-gray-700">Rating</th>
              <th className="px-4 py-2 text-left font-semibold text-gray-700">Voted At</th>
            </tr>
          </thead>
          <tbody>
            {Object.entries(grouped).map(([userId, ratings]) =>
              ratings.length > 0 ? (
                ratings.map((row, i) => (
                  <tr key={userId + row.placeId + i} className="border-t last:border-b">
                    <td className="px-4 py-2 font-mono text-xs text-gray-500 align-top">
                      {i === 0 ? userId : ""}
                    </td>
                    <td className="px-4 py-2 text-gray-900">{PLACES[row.placeId] || row.placeId}</td>
                    <td className="px-4 py-2 text-center">{row.rating}</td>
                    <td className="px-4 py-2 text-xs text-gray-500 whitespace-nowrap">{row.createdAt ? new Date(row.createdAt).toLocaleString() : ""}</td>
                  </tr>
                ))
              ) : (
                <tr key={userId} className="border-t last:border-b">
                  <td className="px-4 py-2 font-mono text-xs text-gray-500">{userId}</td>
                  <td className="px-4 py-2 text-gray-400 italic" colSpan={3}>No ratings</td>
                </tr>
              )
            )}
          </tbody>
        </table>
      </div>
    </div>
  );
} 