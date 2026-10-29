import { NextResponse } from "next/server";

export const DB_ERROR = "Andmebaasiga ei saanud ühendust. Proovi mõne hetke pärast uuesti.";
export const MAX_MESSAGE_LENGTH = 2000;

export function jsonError(message: string, status: number) {
  return NextResponse.json({ error: message }, { status });
}

// Wraps a route handler so a database failure returns a readable Estonian error instead of a 500 page.
export function withDb<A extends unknown[]>(handler: (...args: A) => Promise<Response>) {
  return async (...args: A) => {
    try {
      return await handler(...args);
    } catch (err) {
      console.error(err);
      return jsonError(DB_ERROR, 503);
    }
  };
}

export function validateMessage(content: unknown): string | null {
  if (typeof content !== "string" || content.trim() === "") return "Sõnum on tühi.";
  if (content.length > MAX_MESSAGE_LENGTH) return "Sõnum on liiga pikk (kuni 2000 tähemärki).";
  return null;
}
