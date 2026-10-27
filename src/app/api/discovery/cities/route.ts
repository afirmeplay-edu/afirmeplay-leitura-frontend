import { NextResponse } from "next/server";
import { discoverCities } from "@/lib/server/cities-discovery";

export async function GET() {
  try {
    const { cities, source } = await discoverCities();
    return NextResponse.json({ cities, source });
  } catch (error) {
    console.error("[discovery/cities] Falha ao carregar municipios:", error);
    return NextResponse.json(
      { cities: [], source: "none", error: "Não foi possível carregar os municípios." },
      { status: 503 }
    );
  }
}
