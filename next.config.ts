import type { NextConfig } from "next";

const apiBaseUrl = (process.env.NEXT_PUBLIC_API_BASE_URL ?? "http://localhost:5000").replace(/\/+$/, "");

/** Rotas da Leitura que moraram em `/app/<segmento>` antes de `/app/leitura`. Manter em sincronia com `ROUTES.leitura` (src/config/routes.ts). */
const LEGACY_LEITURA_SEGMENTS = [
  "avaliacao-fluencia",
  "avaliacao-leitura-guiada",
  "avaliacoes",
  "cadastros",
  "configuracao-avaliacao",
  "relatorios",
  "relatorios-fluencia",
  "revisao-leitura-guiada",
];

const nextConfig: NextConfig = {
  reactStrictMode: true,
  // Gera .next/standalone — servidor Node mínimo para Docker (sem node_modules completo)
  output: "standalone",
  // pptxgenjs/xlsx usam APIs Node; no browser o Webpack precisa ignorá-las.
  serverExternalPackages: ["pptxgenjs", "xlsx"],
  webpack: (config, { isServer, webpack }) => {
    config.output = {
      ...config.output,
      chunkLoadTimeout: 300000,
    };
    config.plugins.push(
      new webpack.NormalModuleReplacementPlugin(/^node:/, (resource: { request: string }) => {
        resource.request = resource.request.replace(/^node:/, "");
      })
    );
    if (!isServer) {
      config.resolve.fallback = {
        ...config.resolve.fallback,
        fs: false,
        https: false,
        http: false,
        path: false,
        os: false,
        crypto: false,
        stream: false,
        net: false,
        tls: false,
        child_process: false,
      };
    }
    return config;
  },
  async redirects() {
    return LEGACY_LEITURA_SEGMENTS.map((segment) => ({
      source: `/app/${segment}/:path*`,
      destination: `/app/leitura/${segment}/:path*`,
      permanent: true,
    }));
  },
  async rewrites() {
    return [
      {
        source: "/api/:path*",
        destination: `${apiBaseUrl}/:path*`,
      },
    ];
  },
};

export default nextConfig;
