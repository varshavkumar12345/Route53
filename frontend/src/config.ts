/**
 * Centralized API configuration.
 * Uses the NEXT_PUBLIC_API_URL environment variable when deployed,
 * and falls back to localhost for local development.
 */
export const API_URL = process.env.NEXT_PUBLIC_API_URL || "http://localhost:8000";
