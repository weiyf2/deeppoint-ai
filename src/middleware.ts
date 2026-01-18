import createMiddleware from 'next-intl/middleware';
import { locales, defaultLocale } from './i18n/config';

export default createMiddleware({
  // 支持的语言列表
  locales,

  // 默认语言
  defaultLocale,

  // 语言检测策略
  localeDetection: true,

  // 始终在 URL 中显示语言前缀
  localePrefix: 'always'
});

export const config = {
  // 匹配所有路径，排除 API 路由、静态文件等
  matcher: [
    // 匹配所有路径
    '/((?!api|_next|_vercel|.*\\..*).*)',
    // 也匹配根路径
    '/'
  ]
};
