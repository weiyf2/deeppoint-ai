import type { DouyinNewCrawlOptions } from './data-source-interface';

export const REQUEST_LIMITS = {
  maxKeywords: 5,
  maxKeywordLength: 80,
  analysisLimit: { min: 1, max: 300, defaultValue: 200 },
  aiProductLimit: { min: 1, max: 100, defaultValue: 50 },
  legacyDeepCrawlVideos: { min: 3, max: 15, defaultValue: 10 },
  douyinNewVideos: { min: 5, max: 30, defaultValue: 15 },
  douyinNewCommentsPerVideo: { min: 10, max: 50, defaultValue: 20 }
} as const;

export type ValidationResult<T> =
  | { ok: true; value: T }
  | { ok: false; error: string };

export async function parseJsonObject(
  request: { json(): Promise<unknown> }
): Promise<ValidationResult<Record<string, unknown>>> {
  try {
    const body = await request.json();
    if (!isObjectRecord(body)) {
      return { ok: false, error: '请求体必须是 JSON 对象' };
    }

    return { ok: true, value: body };
  } catch {
    return { ok: false, error: '请求体必须是有效的 JSON' };
  }
}

export function normalizeKeywords(value: unknown): ValidationResult<string[]> {
  if (!Array.isArray(value) || value.length === 0) {
    return { ok: false, error: '关键词是必需的，且必须是非空数组' };
  }

  const keywords = value
    .filter((keyword): keyword is string => typeof keyword === 'string')
    .map(keyword => keyword.trim())
    .filter(Boolean);

  const uniqueKeywords = [...new Set(keywords)];

  if (uniqueKeywords.length === 0) {
    return { ok: false, error: '请提供有效的关键词' };
  }

  if (uniqueKeywords.length > REQUEST_LIMITS.maxKeywords) {
    return { ok: false, error: `最多支持 ${REQUEST_LIMITS.maxKeywords} 个关键词` };
  }

  const oversizedKeyword = uniqueKeywords.find(
    keyword => keyword.length > REQUEST_LIMITS.maxKeywordLength
  );
  if (oversizedKeyword) {
    return {
      ok: false,
      error: `关键词长度不能超过 ${REQUEST_LIMITS.maxKeywordLength} 个字符`
    };
  }

  return { ok: true, value: uniqueKeywords };
}

export function normalizeInteger(
  value: unknown,
  limits: { min: number; max: number; defaultValue: number }
): number {
  const numericValue = typeof value === 'number' ? value : Number(value);
  if (!Number.isFinite(numericValue)) {
    return limits.defaultValue;
  }

  const integerValue = Math.trunc(numericValue);
  return Math.min(limits.max, Math.max(limits.min, integerValue));
}

export function normalizeBoolean(value: unknown, defaultValue: boolean): boolean {
  if (typeof value === 'boolean') {
    return value;
  }
  return defaultValue;
}

export function normalizeLocale(value: unknown): string {
  return value === 'en' ? 'en' : 'zh';
}

export function normalizeDouyinNewOptions(value: unknown): DouyinNewCrawlOptions {
  const config = isObjectRecord(value) ? value : {};
  return {
    enableComments: normalizeBoolean(config.enableComments, true),
    maxVideos: normalizeInteger(config.maxVideos, REQUEST_LIMITS.douyinNewVideos),
    maxCommentsPerVideo: normalizeInteger(
      config.maxCommentsPerVideo,
      REQUEST_LIMITS.douyinNewCommentsPerVideo
    ),
    enableSubComments: normalizeBoolean(config.enableSubComments, false)
  };
}

function isObjectRecord(value: unknown): value is Record<string, unknown> {
  return typeof value === 'object' && value !== null && !Array.isArray(value);
}
