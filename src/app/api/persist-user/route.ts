import { NextRequest, NextResponse } from "next/server";
import { serverEnv } from "@/lib/env";

async function proxyToBackend(request: NextRequest) {
  const url = `${serverEnv.apiBaseUrl}/persist-user/`;

  try {
    const response = await fetch(url, {
      method: "GET",
      headers: {
        Accept: "application/json",
        Authorization: request.headers.get("authorization") ?? "",
        Origin: request.headers.get("origin") ?? "",
        "X-City-ID": request.headers.get("x-city-id") ?? "",
        "X-City-Slug": request.headers.get("x-city-slug") ?? "",
      },
    });

    const data = await response.text();
    return new NextResponse(data, {
      status: response.status,
      headers: { "Content-Type": "application/json" },
    });
  } catch {
    return NextResponse.json({ erro: "Backend indisponível." }, { status: 503 });
  }
}

export async function GET(request: NextRequest) {
  return proxyToBackend(request);
}
