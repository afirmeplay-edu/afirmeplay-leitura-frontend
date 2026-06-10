import { NextRequest, NextResponse } from "next/server";
import { createMockUser, MOCK_AUTH_TOKEN } from "@/lib/mock/auth";
import { serverEnv } from "@/lib/env";

function isMockAuthEnabled() {
  return process.env.MOCK_AUTH === "true";
}

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
      { erro: "Backend indisponivel. Inicie o afirmeplay_backend ou ative MOCK_AUTH=true no .env." },
      { status: 503 }
    );
  }
}

export async function POST(request: NextRequest) {
  if (!isMockAuthEnabled()) {
    return proxyToBackend(request);
  }

  let registration = "";
  try {
    const body = await request.json();
    registration = String(body.registration ?? body.email ?? "").trim();
  } catch {
    return NextResponse.json({ erro: "Corpo da requisicao invalido." }, { status: 400 });
  }

  if (!registration) {
    return NextResponse.json({ erro: "Informe usuario e senha." }, { status: 400 });
  }

  const slug = request.headers.get("x-city-slug") ?? undefined;
  const user = createMockUser(registration, slug);

  return NextResponse.json({
    mensagem: "Login mock bem-sucedido.",
    token: MOCK_AUTH_TOKEN,
    user,
  });
}

export async function OPTIONS() {
  return new NextResponse(null, { status: 204 });
}
