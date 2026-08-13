import type { NextConfig } from "next";

const nextConfig: NextConfig = {
  // Buendelt Server und noetige Abhaengigkeiten nach .next/standalone.
  // Das Docker-Laufzeitabbild kommt dadurch ohne node_modules aus.
  output: "standalone",
};

export default nextConfig;
