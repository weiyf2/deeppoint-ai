import { getRequestConfig } from 'next-intl/server';
import { locales, defaultLocale, Locale } from './config';

export default getRequestConfig(async ({ requestLocale }) => {
  // 获取请求的语言
  let locale = await requestLocale;

  // 验证语言是否有效
  if (!locale || !locales.includes(locale as Locale)) {
    locale = defaultLocale;
  }

  return {
    locale,
    messages: (await import(`../messages/${locale}.json`)).default
  };
});
