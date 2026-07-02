import type { NextConfig } from "next";
import createNextIntlPlugin from 'next-intl/plugin';

const withNextIntl = createNextIntlPlugin('./src/i18n/request.ts');

const nextConfig: NextConfig = {
  // 隐藏左下角的 Next.js 开发指示器
  devIndicators: false,
};

export default withNextIntl(nextConfig);
