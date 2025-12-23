// GLM API服务类
import axios from 'axios';

interface GLMMessage {
  role: 'system' | 'user' | 'assistant';
  content: string;
}

interface GLMRequest {
  model: string;
  messages: GLMMessage[];
  temperature?: number;
  stream?: boolean;
}

interface GLMResponse {
  choices: Array<{
    message: {
      content: string;
    };
  }>;
}

export class GLMService {
  private apiKey: string;
  private baseURL: string;
  private model: string;

  constructor() {
    const apiKey = process.env.GLM_API_KEY;
    if (!apiKey) {
      throw new Error('GLM_API_KEY 环境变量未设置');
    }
    this.apiKey = apiKey;
    this.baseURL = 'https://open.bigmodel.cn/api/paas/v4/chat/completions';
    this.model = process.env.GLM_MODEL_NAME || 'glm-4-flash';
  }

  async analyzeCluster(texts: string[]): Promise<{
    one_line_pain: string;
    paid_interest: 'High' | 'Medium' | 'Low';
    rationale: string;
    potential_product: string;
  }> {
    const prompt = `你是一个顶级的市场分析师。基于以下用户评论，请严格返回一个 JSON 对象，包含以下字段：
- "one_line_pain": (string) 用一句话精准概括用户的核心痛点。
- "paid_interest": (string) 用户的付费意愿，必须是 "High", "Medium", "Low" 其中之一。
- "rationale": (string) 简述你做出该判断的理由，引用原文。
- "potential_product": (string) 基于此痛点，一句话构思一个极简的产品概念。

现在，请分析以下文本：
${texts.join('\n\n')}

请确保返回的是纯JSON格式，不要包含任何其他文字说明。`;

    const request: GLMRequest = {
      model: this.model,
      messages: [
        {
          role: 'system',
          content: '你是一个专业的市场分析师，擅长从用户评论中提取痛点并评估商业价值。请严格按照JSON格式返回结果。'
        },
        {
          role: 'user',
          content: prompt
        }
      ],
      temperature: 0.6,
      stream: false
    };

    try {
      const response = await axios.post<GLMResponse>(this.baseURL, request, {
        headers: {
          'Content-Type': 'application/json',
          'Authorization': `Bearer ${this.apiKey}`
        }
      });

      const content = response.data.choices[0]?.message?.content;
      if (!content) {
        throw new Error('GLM API 返回空响应');
      }

      // 尝试解析JSON响应
      try {
        // 清理可能的markdown格式
        let cleanContent = content.trim();
        if (cleanContent.startsWith('```json')) {
          cleanContent = cleanContent.replace(/```json\s*/, '').replace(/```\s*$/, '');
        } else if (cleanContent.startsWith('```')) {
          cleanContent = cleanContent.replace(/```\s*/, '').replace(/```\s*$/, '');
        }

        const parsed = JSON.parse(cleanContent);

        // 验证必需字段
        const result = {
          one_line_pain: parsed.one_line_pain || '用户存在某种需求痛点',
          paid_interest: (['High', 'Medium', 'Low'].includes(parsed.paid_interest) ? parsed.paid_interest : 'Medium') as 'High' | 'Medium' | 'Low',
          rationale: parsed.rationale || '基于用户评论内容分析',
          potential_product: parsed.potential_product || '针对用户需求的解决方案'
        };

        return result;

      } catch {

        // 如果无法解析为JSON，尝试从文本中提取信息
        const lines = content.split('\n').map(line => line.trim()).filter(line => line);

        return {
          one_line_pain: this.extractFromText(content, '痛点') || content.substring(0, 50) + '...',
          paid_interest: 'Medium',
          rationale: '基于GLM文本分析结果',
          potential_product: this.extractFromText(content, '产品') || '需要进一步分析的产品概念'
        };
      }
    } catch {

      // 返回基于文本内容的默认分析
      const sampleText = texts[0] || '';
      return {
        one_line_pain: this.generateDefaultPain(texts),
        paid_interest: 'Medium',
        rationale: 'GLM API调用失败，基于文本内容推断',
        potential_product: '基于用户需求的数字化解决方案'
      };
    }
  }

  private extractFromText(text: string, keyword: string): string | null {
    const lines = text.split('\n');
    for (const line of lines) {
      if (line.includes(keyword)) {
        return line.replace(/["""]/g, '').trim();
      }
    }
    return null;
  }

  private generateDefaultPain(texts: string[]): string {
    // 基于文本内容生成默认痛点描述
    if (texts.length === 0) return '用户需求待分析';

    const commonKeywords = ['问题', '困难', '不知道', '怎么办', '求助', '请教'];
    const hasProblems = texts.some(text =>
      commonKeywords.some(keyword => text.includes(keyword))
    );

    if (hasProblems) {
      return '用户在相关领域遇到问题，寻求解决方案和指导';
    }

    return '用户对相关主题有兴趣和需求，期待更好的体验';
  }
}