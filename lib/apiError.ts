import { NextResponse } from "next/server";
import { Prisma } from "@/app/generated/prisma/client";

/**
 * Converts an error thrown by a route handler into a safe JSON response.
 * Known, expected database conditions (a unique-constraint race, a missing
 * row) map to 4xx with a human-readable message; anything else is logged
 * server-side and returned as a generic 500 so internal details and stack
 * traces never reach the client.
 */
export function handleApiError(error: unknown): NextResponse {
  if (error instanceof Prisma.PrismaClientKnownRequestError) {
    if (error.code === "P2002") {
      return NextResponse.json(
        { error: "A record with the same unique reference already exists" },
        { status: 409 }
      );
    }
    if (error.code === "P2025") {
      return NextResponse.json({ error: "Record not found" }, { status: 404 });
    }
  }

  console.error("Unhandled API error:", error);
  return NextResponse.json(
    { error: "An unexpected server error occurred. Please try again." },
    { status: 500 }
  );
}
