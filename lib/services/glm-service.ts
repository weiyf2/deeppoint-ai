// GLM API服务类 - 支持 glm-4.6 思考模型
import axios from 'axios';

interface GLMMessage {
  role: 'system' | 'user' | 'assistant';
  content: string;
}

interface GLMRequest {
  model: string;
  messages: GLMMessage[];
  temperature?: number;
  max_tokens?: number;
  stream?: boolean;
  thinking?: {
    type: 'enabled' | 'disabled';
  };
}

interface GLMResponse {
  choices: Array<{
    message: {
      content: string;
    };
  }>;
}

// 深度分析结果接口
export interface DeepAnalysisResult {
  // 原有字段
  one_line_pain: string;
  paid_interest: 'High' | 'Medium' | 'Low';
  rationale: string;
  potential_product: string;

  // 维度1: 痛点验证度
  pain_depth: {
    surface_pain: string;
    root_causes: string[];
    user_scenarios: string[];
    emotional_intensity: number;
  };

  // 维度2: 竞品与机会
  market_landscape: {
    existing_solutions: Array<{
      name: string;
      limitation: string;
    }>;
    unmet_needs: string[];
    opportunity: string;
  };

  // 维度3: 可执行性
  mvp_plan: {
    core_features: string[];
    validation_hypotheses: Array<{
      hypothesis: string;
      test_method: string;
    }>;
    first_users: string;
    timeline: string;
    estimated_cost: string;
  };

  // 维度4: 优先级相关
  keyword_relevance: number;
  market_size_score: number;  // GLM评估的市场规模 0-5
}

export class GLMService {
  private apiKey: string;
  private baseURL: string;
  private model: string;
  private useThinking: boolean;

  constructor() {
    const apiKey = process.env.GLM_API_KEY;
    if (!apiKey) {
      throw new Error('GLM_API_KEY 环境变量未设置');
    }
    this.apiKey = apiKey;
    this.baseURL = 'https://open.bigmodel.cn/api/paas/v4/chat/completions';
    this.model = process.env.GLM_MODEL_NAME || 'glm-4.6';
    // glm-4.6 默认启用思考模式
    this.useThinking = this.model.includes('4.6') || process.env.GLM_USE_THINKING === 'true';
  }

  async analyzeCluster(
    texts: string[],
    keywords: string[],
    dataSize: number,
    locale: string = 'zh'
  ): Promise<DeepAnalysisResult> {
    // 数据质量评估
    const qualityLevel = dataSize < 50 ? '小样本探索' :
                        dataSize < 200 ? '初步验证' : '可靠样本';

    const prompt = `你是顶级的创业导师和市场分析师。你的任务是帮助创业者/产品经理判断这个方向是否值得做。

【分析背景】
• 用户搜索关键词：「${keywords.join('、')}」
• 数据来源：该关键词相关的社交媒体内容和评论
• 数据规模：${dataSize}条（${qualityLevel}）

【核心任务】
从"需求验证"角度深度分析该聚类，帮助创业者做出"做/不做"的决策。

【分析维度】

1️⃣ 痛点深度挖掘（pain_depth）
- surface_pain: 表面痛点是什么？（一句话）
- root_causes: 连问3个"为什么"，找到根本原因（数组，3个字符串）
- user_scenarios: 这是什么场景下的痛点？（数组，1-3个场景）
- emotional_intensity: 用户情绪强度评分（0-5，0=无感，5=极度强烈）

2️⃣ 市场与竞品分析（market_landscape）
- existing_solutions: 现有解决方案（数组，2-3个，格式：{name, limitation}）
  注意：基于你的知识库分析，如果不确定请说明"需要进一步调研"
- unmet_needs: 哪些需求尚未被满足？（数组，2-3个字符串）
- opportunity: 市场机会在哪里？（一句话）

3️⃣ MVP执行方案（mvp_plan）
- core_features: 核心功能（数组，3-5个，一句话说清）
- validation_hypotheses: 需要验证的假设（数组，2-3个，格式：{hypothesis, test_method}）
- first_users: 第一批用户从哪来？（一句话）
- timeline: 预估开发时间（如"2周开发+1周测试"）
- estimated_cost: 预估成本（如"1000元广告投放"）

4️⃣ 市场规模评估（market_size_score）
- 该痛点的潜在市场规模有多大？（0-5分）
  0=极小众（几千人）、1=小众（几万人）、2=中等（几十万人）、3=较大（百万级）、4=大众（千万级）、5=超大众（亿级）
- 基于你的知识判断受众人群大小，考虑：目标用户群体规模、需求频次、地域覆盖

5️⃣ 相关度评估（keyword_relevance）
- 该聚类与「${keywords.join('、')}」的相关度？（0-100分）
- 如果<50分，说明为什么相关度低

【分析原则】
✓ 只分析与「${keywords.join('、')}」相关的内容，过滤无关话题
✓ 不要停留在表面，深挖底层需求（时间、信任、能力、成本）
✓ 产品方案要具体可执行，不要空洞概念
✓ 竞品分析基于你的知识，不确定的标注"需进一步调研"
✓ 如果数据量小（${dataSize}<50），在相关字段中提醒"需要更多数据验证"
✓ MVP方案要接地气，不要假大空

【待分析文本】
${texts.join('\n\n')}

【输出格式】
严格返回JSON格式，包含以下所有字段：
{
  "one_line_pain": "核心痛点一句话总结",
  "paid_interest": "High/Medium/Low",
  "rationale": "判断理由，引用原文",
  "potential_product": "产品概念一句话",
  "pain_depth": {
    "surface_pain": "表面痛点",
    "root_causes": ["为什么1", "为什么2", "为什么3"],
    "user_scenarios": ["场景1", "场景2"],
    "emotional_intensity": 3
  },
  "market_landscape": {
    "existing_solutions": [
      {"name": "产品A", "limitation": "局限性"},
      {"name": "产品B", "limitation": "局限性"}
    ],
    "unmet_needs": ["未满足需求1", "未满足需求2"],
    "opportunity": "市场机会描述"
  },
  "mvp_plan": {
    "core_features": ["功能1", "功能2", "功能3"],
    "validation_hypotheses": [
      {"hypothesis": "假设1", "test_method": "测试方法1"},
      {"hypothesis": "假设2", "test_method": "测试方法2"}
    ],
    "first_users": "用户获取渠道",
    "timeline": "时间预估",
    "estimated_cost": "成本预估"
  },
  "market_size_score": 3,
  "keyword_relevance": 85
}

请确保返回的是纯JSON格式，不要包含markdown代码块标记。

【输出语言】
请使用${locale === 'en' ? '英文' : '中文'}输出所有分析内容（JSON字段名保持英文不变，只翻译字段值）。`;

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
      stream: false,
      // glm-4.6 思考模型参数配置
      ...(this.useThinking ? {
        thinking: { type: 'enabled' as const },
        max_tokens: 65536,
        temperature: 1.0  // 思考模型要求 temperature 为 1.0
      } : {
        temperature: 0.6
      })
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
        // 验证并填充默认值
        const result: DeepAnalysisResult = {
          one_line_pain: parsed.one_line_pain || '用户存在某种需求痛点',
          paid_interest: (['High', 'Medium', 'Low'].includes(parsed.paid_interest) ? parsed.paid_interest : 'Medium') as 'High' | 'Medium' | 'Low',
          rationale: parsed.rationale || '基于用户评论内容分析',
          potential_product: parsed.potential_product || '针对用户需求的解决方案',

          pain_depth: {
            surface_pain: parsed.pain_depth?.surface_pain || parsed.one_line_pain || '痛点待分析',
            root_causes: parsed.pain_depth?.root_causes || ['根因待深挖'],
            user_scenarios: parsed.pain_depth?.user_scenarios || ['使用场景待明确'],
            emotional_intensity: typeof parsed.pain_depth?.emotional_intensity === 'number'
              ? parsed.pain_depth.emotional_intensity
              : 2
          },

          market_landscape: {
            existing_solutions: parsed.market_landscape?.existing_solutions || [
              { name: '待调研', limitation: '竞品信息需进一步收集' }
            ],
            unmet_needs: parsed.market_landscape?.unmet_needs || ['待识别未满足需求'],
            opportunity: parsed.market_landscape?.opportunity || '市场机会待评估'
          },

          mvp_plan: {
            core_features: parsed.mvp_plan?.core_features || ['核心功能待设计'],
            validation_hypotheses: parsed.mvp_plan?.validation_hypotheses || [
              { hypothesis: '用户需求假设', test_method: '测试方法待定' }
            ],
            first_users: parsed.mvp_plan?.first_users || '用户获取渠道待规划',
            timeline: parsed.mvp_plan?.timeline || '时间待评估',
            estimated_cost: parsed.mvp_plan?.estimated_cost || '成本待评估'
          },

          keyword_relevance: typeof parsed.keyword_relevance === 'number'
            ? parsed.keyword_relevance
            : 50,

          market_size_score: typeof parsed.market_size_score === 'number'
            ? Math.min(5, Math.max(0, parsed.market_size_score))
            : 2.5  // 默认中等规模
        };

        return result;

      } catch (parseError) {
        console.error('JSON解析失败:', parseError);
        console.log('原始响应:', content);

        // 如果无法解析为JSON，返回基础结构
        return {
          one_line_pain: this.extractFromText(content, '痛点') || content.substring(0, 50) + '...',
          paid_interest: 'Medium' as const,
          rationale: '基于GLM文本分析结果（JSON解析失败）',
          potential_product: this.extractFromText(content, '产品') || '需要进一步分析的产品概念',

          pain_depth: {
            surface_pain: '解析失败，请查看原文',
            root_causes: ['JSON格式错误'],
            user_scenarios: ['无法提取'],
            emotional_intensity: 2
          },

          market_landscape: {
            existing_solutions: [{ name: '解析失败', limitation: '无法提取' }],
            unmet_needs: ['解析失败'],
            opportunity: '解析失败'
          },

          mvp_plan: {
            core_features: ['解析失败'],
            validation_hypotheses: [{ hypothesis: '解析失败', test_method: '解析失败' }],
            first_users: '解析失败',
            timeline: '解析失败',
            estimated_cost: '解析失败'
          },

          keyword_relevance: 50,
          market_size_score: 2.5
        };
      }
    } catch (apiError) {
      console.error('GLM API调用失败:', apiError);

      // 返回基于文本内容的默认分析
      return {
        one_line_pain: this.generateDefaultPain(texts),
        paid_interest: 'Medium' as const,
        rationale: 'GLM API调用失败，基于文本内容推断',
        potential_product: '基于用户需求的数字化解决方案',

        pain_depth: {
          surface_pain: this.generateDefaultPain(texts),
          root_causes: ['API调用失败，无法深度分析'],
          user_scenarios: ['相关领域用户使用场景'],
          emotional_intensity: 2
        },

        market_landscape: {
          existing_solutions: [{ name: 'API调用失败', limitation: '无法获取竞品信息' }],
          unmet_needs: ['需要进一步调研'],
          opportunity: 'API调用失败，无法评估'
        },

        mvp_plan: {
          core_features: ['API调用失败'],
          validation_hypotheses: [{ hypothesis: 'API调用失败', test_method: '无法提供' }],
          first_users: 'API调用失败',
          timeline: 'API调用失败',
          estimated_cost: 'API调用失败'
        },

        keyword_relevance: 50,
        market_size_score: 2.5
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