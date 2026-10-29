/** @type {import('next').NextConfig} */
const nextConfig = {
  outputFileTracingIncludes: {
    "/api/chats/[id]/messages": ["./data/**/*"],
  },
};

export default nextConfig;
