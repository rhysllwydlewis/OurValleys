import { toNextJsHandler } from "better-auth/next-js";
import { NextResponse } from "next/server";
import { getAuth } from "@/lib/auth";

function unavailableResponse() {
  return NextResponse.json(
    { error: "Authentication is not configured." },
    { status: 503 },
  );
}

export async function GET(request: Request) {
  try {
    return await toNextJsHandler(getAuth()).GET(request);
  } catch {
    return unavailableResponse();
  }
}

export async function POST(request: Request) {
  try {
    return await toNextJsHandler(getAuth()).POST(request);
  } catch {
    return unavailableResponse();
  }
}
