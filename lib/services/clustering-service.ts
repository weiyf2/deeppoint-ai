// 聚类分析服务
export interface ClusterResult {
  id: string;
  size: number;
  analysis: {
    one_line_pain: string;
    paid_interest: "High" | "Medium" | "Low";
    rationale: string;
    potential_product: string;
  };
  representative_texts: string[];
}

export class ClusteringService {
  // 改进的文本相似度计算
  private calculateSimilarity(text1: string, text2: string): number {
    const words1 = new Set(this.tokenize(text1));
    const words2 = new Set(this.tokenize(text2));

    if (words1.size === 0 || words2.size === 0) return 0;

    const intersection = new Set([...words1].filter(x => words2.has(x)));
    const union = new Set([...words1, ...words2]);

    // Jaccard相似度
    const jaccardSimilarity = intersection.size / union.size;

    // 加权考虑文本长度相似性
    const lengthSimilarity = 1 - Math.abs(text1.length - text2.length) / Math.max(text1.length, text2.length);

    // 综合相似度（Jaccard占70%，长度相似性占30%）
    return jaccardSimilarity * 0.7 + lengthSimilarity * 0.3;
  }

  private tokenize(text: string): string[] {
    // 改进的中文分词
    const cleaned = text
      .replace(/[^\u4e00-\u9fa5a-zA-Z0-9]/g, ' ')
      .toLowerCase()
      .trim();

    // 分词并过滤
    const words = cleaned.split(/\s+/).filter(word => {
      // 过滤太短的词和常见停用词
      if (word.length <= 1) return false;

      const stopWords = ['的', '了', '是', '在', '有', '和', '就', '不', '人', '都', '一', '一个', '这个', '那个', '什么', '怎么', '可以', '没有', '知道', '觉得', '感觉'];
      return !stopWords.includes(word);
    });

    return words;
  }

  // 使用改进的聚类算法
  public clusterTexts(texts: string[], minClusterSize: number = 2): string[][] {
    if (texts.length === 0) {
      return [];
    }

    if (texts.length < minClusterSize) {
      return [texts];
    }

    // 计算相似度矩阵
    const similarities: number[][] = [];
    for (let i = 0; i < texts.length; i++) {
      similarities[i] = [];
      for (let j = 0; j < texts.length; j++) {
        if (i === j) {
          similarities[i][j] = 1.0;
        } else {
          similarities[i][j] = this.calculateSimilarity(texts[i], texts[j]);
        }
      }
    }

    // 动态调整相似度阈值
    const allSimilarities = [];
    for (let i = 0; i < texts.length; i++) {
      for (let j = i + 1; j < texts.length; j++) {
        allSimilarities.push(similarities[i][j]);
      }
    }

    // 使用中位数作为基准，动态调整阈值
    allSimilarities.sort((a, b) => a - b);
    const median = allSimilarities[Math.floor(allSimilarities.length / 2)] || 0.1;
    const dynamicThreshold = Math.max(0.15, Math.min(0.4, median * 1.2));

    // 执行聚类
    const clusters: Set<number>[] = [];
    const assigned = new Set<number>();

    for (let i = 0; i < texts.length; i++) {
      if (assigned.has(i)) continue;

      const cluster = new Set<number>([i]);
      assigned.add(i);

      // 寻找相似的文本（使用动态阈值）
      for (let j = i + 1; j < texts.length; j++) {
        if (!assigned.has(j) && similarities[i][j] > dynamicThreshold) {
          cluster.add(j);
          assigned.add(j);
        }
      }

      clusters.push(cluster);
    }

    // 过滤和合并小聚类
    const validClusters: Set<number>[] = [];
    const orphanedIndices: number[] = [];

    for (const cluster of clusters) {
      if (cluster.size >= minClusterSize) {
        validClusters.push(cluster);
      } else {
        // 小聚类的文本变成孤立点
        orphanedIndices.push(...Array.from(cluster));
      }
    }

    // 如果有孤立点，尝试将它们分配到最相似的现有聚类
    for (const orphanIndex of orphanedIndices) {
      let bestCluster: Set<number> | null = null;
      let bestSimilarity = 0;

      for (const cluster of validClusters) {
        // 计算与聚类的平均相似度
        let avgSimilarity = 0;
        for (const clusterIndex of cluster) {
          avgSimilarity += similarities[orphanIndex][clusterIndex];
        }
        avgSimilarity /= cluster.size;

        if (avgSimilarity > bestSimilarity && avgSimilarity > dynamicThreshold * 0.8) {
          bestSimilarity = avgSimilarity;
          bestCluster = cluster;
        }
      }

      if (bestCluster) {
        bestCluster.add(orphanIndex);
      } else {
        // 创建新的单文本聚类（如果允许的话）
        validClusters.push(new Set([orphanIndex]));
      }
    }

    // 如果没有找到任何有效聚类，创建更宽松的聚类
    if (validClusters.length === 0) {
      // 使用更宽松的标准
      const relaxedThreshold = Math.max(0.1, dynamicThreshold * 0.6);
      const relaxedMinSize = Math.max(1, Math.floor(minClusterSize * 0.7));

      return this.clusterWithRelaxedCriteria(texts, similarities, relaxedThreshold, relaxedMinSize);
    }

    const result = validClusters.map(cluster =>
      Array.from(cluster).map(index => texts[index])
    );

    return result;
  }

  private clusterWithRelaxedCriteria(
    texts: string[],
    similarities: number[][],
    threshold: number,
    minSize: number
  ): string[][] {
    const clusters: Set<number>[] = [];
    const assigned = new Set<number>();

    for (let i = 0; i < texts.length; i++) {
      if (assigned.has(i)) continue;

      const cluster = new Set<number>([i]);
      assigned.add(i);

      for (let j = i + 1; j < texts.length; j++) {
        if (!assigned.has(j) && similarities[i][j] > threshold) {
          cluster.add(j);
          assigned.add(j);
        }
      }

      if (cluster.size >= minSize) {
        clusters.push(cluster);
      }
    }

    // 如果还是没有聚类，至少返回一个包含所有文本的聚类
    if (clusters.length === 0) {
      return [texts];
    }

    return clusters.map(cluster =>
      Array.from(cluster).map(index => texts[index])
    );
  }

  // 为每个聚类选择代表性文本
  public getRepresentativeTexts(cluster: string[], maxCount: number = 5): string[] {
    if (cluster.length <= maxCount) {
      return cluster;
    }

    // 选择长度适中且具有代表性的文本
    const scored = cluster.map(text => ({
      text,
      score: this.calculateRepresentativeness(text, cluster)
    }));

    scored.sort((a, b) => b.score - a.score);
    return scored.slice(0, maxCount).map(item => item.text);
  }

  private calculateRepresentativeness(text: string, cluster: string[]): number {
    const textLength = text.length;

    // 惩罚过短或过长的文本
    let lengthScore = 1.0;
    if (textLength < 10) lengthScore = 0.5;
    if (textLength > 200) lengthScore = 0.7;

    // 计算与聚类中其他文本的平均相似度
    let avgSimilarity = 0;
    for (const otherText of cluster) {
      if (otherText !== text) {
        avgSimilarity += this.calculateSimilarity(text, otherText);
      }
    }
    avgSimilarity /= Math.max(1, cluster.length - 1);

    return lengthScore * avgSimilarity;
  }

  // 生成聚类ID
  public generateClusterId(index: number): string {
    return `cluster-${index + 1}`;
  }
}