import type { NextConfig } from "next";

/**
 * Cabeçalhos de segurança aplicados a todas as respostas.
 * São a defesa que o navegador aplica sozinho, além das checagens do servidor.
 */
const securityHeaders = [
  // Impede que o sistema seja embutido num iframe de outro site (clickjacking).
  { key: "X-Frame-Options", value: "DENY" },
  // Bloqueia o navegador de "adivinhar" o tipo de um arquivo servido.
  { key: "X-Content-Type-Options", value: "nosniff" },
  // Não vaza a URL interna (que pode conter ids) ao sair para outro site.
  { key: "Referrer-Policy", value: "strict-origin-when-cross-origin" },
  // O sistema não usa câmera, microfone nem localização.
  {
    key: "Permissions-Policy",
    value: "camera=(), microphone=(), geolocation=(), interest-cohort=()",
  },
  // Em produção (HTTPS), obriga o navegador a nunca mais usar HTTP neste domínio.
  ...(process.env.NODE_ENV === "production"
    ? [
        {
          key: "Strict-Transport-Security",
          value: "max-age=63072000; includeSubDomains; preload",
        },
      ]
    : []),
];

const nextConfig: NextConfig = {
  /**
   * Pacotes que precisam rodar em Node puro, sem passar pelo bundler.
   * bcryptjs e o driver do Postgres quebram quando empacotados dentro
   * de uma server action.
   */
  serverExternalPackages: ["bcryptjs", "pg", "@prisma/adapter-pg"],

  // Não anuncia a versão do Next para quem estiver sondando o servidor.
  poweredByHeader: false,

  async headers() {
    return [{ source: "/:path*", headers: securityHeaders }];
  },
};

export default nextConfig;
