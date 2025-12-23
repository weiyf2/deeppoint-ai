import type { NextConfig } from "next";

const nextConfig: NextConfig = {
  /* config options here */

  // 隐藏左下角的 Next.js 开发指示器
  devIndicators: false,

  // 添加下面这个 typescript 配置块
  typescript: {
    // !! WARN !!
    // Dangerously allow production builds to successfully complete even if
    // your project has type errors.
    // !! WARN !!
    ignoreBuildErrors: true,
  },

  eslint: {
    // Warning: This allows production builds to successfully complete even if
    // your project has ESLint errors.
    ignoreDuringBuilds: true,
  },
};

export default nextConfig;
