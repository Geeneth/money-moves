/** @type {import('next').NextConfig} */
const nextConfig = {
  reactStrictMode: true,
  // standalone output is used for Electron production builds (ELECTRON_BUILD=true next build)
  ...(process.env.ELECTRON_BUILD ? { output: "standalone" } : {}),
  experimental: {
    serverComponentsExternalPackages: ["better-sqlite3"],
  },
};

export default nextConfig;
