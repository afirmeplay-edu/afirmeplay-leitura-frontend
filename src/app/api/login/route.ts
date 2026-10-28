import { NextRequest, NextResponse } from "next/server";
import { serverEnv } from "@/lib/env";

async function proxyToBackend(request: NextRequest) {
  const body = await request.text();
  const url = `${serverEnv.apiBaseUrl}/login/`;

  try {
    const response = await fetch(url, {
      method: "POST",
      headers: {
        "Content-Type": "application/json",
        Accept: "application/json",
        Origin: request.headers.get("origin") ?? "",
        "X-City-Slug": request.headers.get("x-city-slug") ?? "",
      },
      body,
    });

    const data = await response.text();
    return new NextResponse(data, {
      status: response.status,
      headers: { "Content-Type": "application/json" },
    });
  } catch {
    return NextResponse.json(
      { erro: "Backend indisponível. Inicie o afirmeplay_backend." },
      { status: 503 }
    );
  }
}

export async function POST(request: NextRequest) {
  return proxyToBackend(request);
}

export async function OPTIONS() {
  return new NextResponse(null, { status: 204 });
}
