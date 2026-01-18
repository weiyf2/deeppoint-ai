export const locales = ['zh', 'en'] as const;
export type Locale = (typeof locales)[number];

export const defaultLocale: Locale = 'zh';

// 语言显示名称
export const localeNames: Record<Locale, string> = {
  zh: '中文',
  en: 'English'
};
