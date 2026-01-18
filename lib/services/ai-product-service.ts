// AI产品分析服务
import axios from 'axios';

export interface AIProductAnalysis {
  product_name: string;
  product_category: string;
  target_users: string;
  core_features: string[];
  ai_capabilities: string[];
  value_proposition: string;
  implementation_difficulty: "High" | "Medium" | "Low";
  market_potential: "High" | "Medium" | "Low";
  technical_stack: string[];
  development_roadmap: string[];
}

export interface AIProductResult {
  id: string;
  size: number;
  analysis: AIProductAnalysis;
  representative_texts: string[];
}

export class AIProductService {
  private apiKey: string;
  private modelName: string;
  private baseUrl: string = 'https://open.bigmodel.cn/api/paas/v4/chat/completions';

  constructor() {
    this.apiKey = process.env.GLM_API_KEY || '';
    this.modelName = process.env.GLM_MODEL_NAME || 'glm-4-flash';
  }

  async analyzeForAIProduct(texts: string[], locale: string = 'zh'): Promise<AIProductAnalysis> {
    if (!this.apiKey) {
      throw new Error('GLM API Key未配置');
    }

    const prompt = this.buildAIProductPrompt(texts, locale);

    try {
      const response = await axios.post(
        this.baseUrl,
        {
          model: this.modelName,
          messages: [
            {
              role: 'user',
              content: prompt
            }
          ],
          temperature: 0.7,
          top_p: 0.8,
        },
        {
          headers: {
            'Authorization': `Bearer ${this.apiKey}`,
            'Content-Type': 'application/json',
          },
          timeout: 60000,
        }
      );

      const content = response.data.choices[0].message.content;

      // 解析JSON响应
      const analysis = this.parseAIProductResponse(content);
      return analysis;

    } catch {
      // 返回默认分析结果
      return this.getDefaultAnalysis(texts);
    }
  }

  private buildAIProductPrompt(texts: string[], locale: string = 'zh'): string {
    const textsContent = texts.slice(0, 20).join('\n---\n');
    const languageInstruction = locale === 'en'
      ? '\n\n【输出语言】\n请使用英文输出所有内容（JSON字段名保持英文不变）。'
      : '';

    return `你是一位资深的AI产品经理，精通人工智能技术和产品设计。

请基于以下用户评论和内容，设计一个AI应用产品。

用户内容：
${textsContent}

请严格返回一个JSON对象，包含以下字段：
{
  "product_name": "产品名称（简短、有吸引力）",
  "product_category": "产品类别（如：AI助手、内容生成、数据分析等）",
  "target_users": "目标用户群体描述",
  "core_features": ["核心功能1", "核心功能2", "核心功能3"],
  "ai_capabilities": ["AI能力1", "AI能力2", "AI能力3"],
  "value_proposition": "核心价值主张（一句话说明为什么用户需要这个产品）",
  "implementation_difficulty": "实现难度（High/Medium/Low）",
  "market_potential": "市场潜力（High/Medium/Low）",
  "technical_stack": ["推荐技术栈1", "推荐技术栈2"],
  "development_roadmap": ["第一阶段", "第二阶段", "第三阶段"]
}

要求：
1. 必须返回严格的JSON格式
2. 产品设计要切实可行，基于现有AI技术
3. 核心功能要具体、可实现
4. AI能力要明确（如：自然语言处理、图像识别、推荐算法等）
5. 技术栈要实用（如：OpenAI API、LangChain、Vector DB等）
6. 开发路线要清晰分阶段

只返回JSON，不要其他内容。${languageInstruction}`;
  }

  private parseAIProductResponse(content: string): AIProductAnalysis {
    try {
      // 尝试提取JSON
      const jsonMatch = content.match(/\{[\s\S]*\}/);
      if (jsonMatch) {
        const jsonStr = jsonMatch[0];
        const parsed = JSON.parse(jsonStr);
        
        // 验证必需字段
        return {
          product_name: parsed.product_name || '未命名产品',
          product_category: parsed.product_category || 'AI应用',
          target_users: parsed.target_users || '目标用户',
          core_features: Array.isArray(parsed.core_features) ? parsed.core_features : [],
          ai_capabilities: Array.isArray(parsed.ai_capabilities) ? parsed.ai_capabilities : [],
          value_proposition: parsed.value_proposition || '价值主张',
          implementation_difficulty: this.validateDifficulty(parsed.implementation_difficulty),
          market_potential: this.validateDifficulty(parsed.market_potential),
          technical_stack: Array.isArray(parsed.technical_stack) ? parsed.technical_stack : [],
          development_roadmap: Array.isArray(parsed.development_roadmap) ? parsed.development_roadmap : []
        };
      }
      
      throw new Error('未找到有效的JSON');
    } catch (error) {
      throw error;
    }
  }

  private validateDifficulty(value: any): "High" | "Medium" | "Low" {
    if (value === 'High' || value === 'Medium' || value === 'Low') {
      return value;
    }
    return 'Medium';
  }

  private getDefaultAnalysis(texts: string[]): AIProductAnalysis {
    return {
      product_name: '基于用户需求的AI助手',
      product_category: 'AI智能助手',
      target_users: '基于用户评论分析的目标群体',
      core_features: [
        '智能问答',
        '内容推荐',
        '数据分析'
      ],
      ai_capabilities: [
        '自然语言处理',
        '机器学习推荐',
        '情感分析'
      ],
      value_proposition: '通过AI技术解决用户核心需求，提升效率和体验',
      implementation_difficulty: 'Medium',
      market_potential: 'Medium',
      technical_stack: [
        'OpenAI API / 本地LLM',
        'Vector Database',
        'Python/TypeScript'
      ],
      development_roadmap: [
        'MVP版本：核心功能实现',
        '优化版本：用户体验提升',
        '扩展版本：功能丰富和商业化'
      ]
    };
  }
}


