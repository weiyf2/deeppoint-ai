import axios from 'axios';

export type AIProviderName = 'glm' | 'openai' | 'ollama' | 'lmstudio';

export interface AIMessage {
  role: 'system' | 'user' | 'assistant';
  content: string;
}

export interface ChatCompletionOptions {
  temperature?: number;
  topP?: number;
  maxTokens?: number;
  stream?: boolean;
  timeoutMs?: number;
  extraBody?: Record<string, unknown>;
}

interface ChatCompletionResponse {
  choices?: Array<{
    message?: {
      content?: string;
    };
  }>;
}

interface ProviderConfig {
  provider: AIProviderName;
  apiKey: string;
  baseUrl: string;
  model: string;
}

export interface AIChatProvider {
  provider: AIProviderName;
  model: string;
  complete(messages: AIMessage[], options?: ChatCompletionOptions): Promise<string>;
}

const DEFAULT_MODELS: Record<AIProviderName, string> = {
  glm: 'glm-4.6',
  openai: 'gpt-4o-mini',
  ollama: 'llama3.1',
  lmstudio: 'local-model'
};

function normalizeProviderName(value: string | undefined): AIProviderName {
  const normalizedValue = value?.trim().toLowerCase();
  if (
    normalizedValue === 'glm' ||
    normalizedValue === 'openai' ||
    normalizedValue === 'ollama' ||
    normalizedValue === 'lmstudio'
  ) {
    return normalizedValue;
  }

  return 'glm';
}

export function getAIProviderName(): AIProviderName {
  return normalizeProviderName(process.env.AI_PROVIDER);
}

function joinChatCompletionsUrl(baseUrl: string): string {
  const trimmedUrl = baseUrl.replace(/\/+$/, '');
  if (trimmedUrl.endsWith('/chat/completions')) {
    return trimmedUrl;
  }

  return `${trimmedUrl}/chat/completions`;
}

function getProviderConfig(modelOverride?: string): ProviderConfig {
  const provider = getAIProviderName();

  if (provider === 'openai') {
    return {
      provider,
      apiKey: process.env.OPENAI_API_KEY || '',
      baseUrl: process.env.OPENAI_BASE_URL || 'https://api.openai.com/v1',
      model: modelOverride || process.env.OPENAI_MODEL || DEFAULT_MODELS.openai
    };
  }

  if (provider === 'ollama') {
    return {
      provider,
      apiKey: process.env.OLLAMA_API_KEY || '',
      baseUrl: process.env.OLLAMA_BASE_URL || 'http://localhost:11434/v1',
      model: modelOverride || process.env.OLLAMA_MODEL || DEFAULT_MODELS.ollama
    };
  }

  if (provider === 'lmstudio') {
    return {
      provider,
      apiKey: process.env.LM_STUDIO_API_KEY || '',
      baseUrl: process.env.LM_STUDIO_BASE_URL || 'http://localhost:1234/v1',
      model: modelOverride || process.env.LM_STUDIO_MODEL || DEFAULT_MODELS.lmstudio
    };
  }

  return {
    provider,
    apiKey: process.env.GLM_API_KEY || '',
    baseUrl: process.env.GLM_BASE_URL || 'https://open.bigmodel.cn/api/paas/v4',
    model: modelOverride || process.env.GLM_MODEL_NAME || DEFAULT_MODELS.glm
  };
}

function getMissingCredentialMessage(config: ProviderConfig): string {
  if (config.provider === 'glm') {
    return 'GLM_API_KEY 环境变量未设置';
  }

  if (config.provider === 'openai') {
    return 'OPENAI_API_KEY 环境变量未设置';
  }

  return '';
}

export function createAIChatProvider(modelOverride?: string): AIChatProvider {
  const config = getProviderConfig(modelOverride);

  return {
    provider: config.provider,
    model: config.model,

    async complete(messages: AIMessage[], options: ChatCompletionOptions = {}): Promise<string> {
      const missingCredentialMessage = getMissingCredentialMessage(config);
      if (missingCredentialMessage) {
        throw new Error(missingCredentialMessage);
      }

      const headers: Record<string, string> = {
        'Content-Type': 'application/json'
      };

      if (config.apiKey) {
        headers.Authorization = `Bearer ${config.apiKey}`;
      }

      const response = await axios.post<ChatCompletionResponse>(
        joinChatCompletionsUrl(config.baseUrl),
        {
          model: config.model,
          messages,
          stream: options.stream ?? false,
          ...(typeof options.temperature === 'number' ? { temperature: options.temperature } : {}),
          ...(typeof options.topP === 'number' ? { top_p: options.topP } : {}),
          ...(typeof options.maxTokens === 'number' ? { max_tokens: options.maxTokens } : {}),
          ...(options.extraBody || {})
        },
        {
          headers,
          timeout: options.timeoutMs || 60000
        }
      );

      const content = response.data.choices?.[0]?.message?.content;
      if (!content) {
        throw new Error(`${config.provider} API 返回空响应`);
      }

      return content;
    }
  };
}
