import type { NextConfig } from "next";

// Business photos live in Supabase Storage; next/image resizes them per device.
const supabase = new URL(process.env.NEXT_PUBLIC_SUPABASE_URL ?? "http://127.0.0.1:54321");
const localSupabase = ["127.0.0.1", "localhost"].includes(supabase.hostname);

const nextConfig: NextConfig = {
  images: {
    remotePatterns: [
      {
        protocol: supabase.protocol.replace(":", "") as "http" | "https",
        hostname: supabase.hostname,
        port: supabase.port,
        pathname: "/storage/v1/object/public/**",
      },
    ],
    formats: ["image/avif", "image/webp"],
    // Only for local development against the Supabase CLI stack.
    dangerouslyAllowLocalIP: localSupabase,
  },
  experimental: {
    // Keep visited pages in the client router cache briefly, so going back to a
    // category (or between categories) is instant instead of refetching.
    staleTimes: { dynamic: 30, static: 180 },
  },
};

export default nextConfig;
