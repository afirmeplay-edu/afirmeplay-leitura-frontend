import { NextRequest, NextResponse } from "next/server";
import { createMockUser, isMockAuthToken, MOCK_AUTH_TOKEN } from "@/lib/mock/auth";
import { serverEnv } from "@/lib/env";

function isMockAuthEnabled() {
  return process.env.MOCK_AUTH === "true";
}

async function proxyToBackend(request: NextRequest) {
  const url = `${serverEnv.apiBaseUrl}/persist-user/`;

  try {
    const response = await fetch(url, {
      method: "GET",
      headers: {
        Accept: "application/json",
        Authorization: request.headers.get("authorization") ?? "",
        Origin: request.headers.get("origin") ?? "",
      },
    });

    const data = await response.text();
    return new NextResponse(data, {
      status: response.status,
      headers: { "Content-Type": "application/json" },
    });
  } catch {
    return NextResponse.json({ erro: "Backend indisponivel." }, { status: 503 });
  }
}

export async function GET(request: NextRequest) {
  const authHeader = request.headers.get("authorization") ?? "";
  const token = authHeader.replace(/^Bearer\s+/i, "");

  if (!isMockAuthEnabled()) {
    return proxyToBackend(request);
  }

  if (!isMockAuthToken(token)) {
    return NextResponse.json({ erro: "Nao autenticado." }, { status: 401 });
  }

  const slug = request.headers.get("x-city-slug") ?? localStorageSlugFromOrigin(request);
  const user = createMockUser("usuario", slug);

  return NextResponse.json({
    user,
    token: MOCK_AUTH_TOKEN,
  });
}

function localStorageSlugFromOrigin(request: NextRequest) {
  const origin = request.headers.get("origin") ?? "";
  try {
    const hostname = new URL(origin).hostname;
    if (hostname.endsWith(".localhost")) {
      return hostname.split(".")[0];
    }
  } catch {
    return undefined;
  }
  return undefined;
}
