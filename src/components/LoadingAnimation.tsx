"use client";

import { useEffect, useRef, useState } from "react";
import { useTranslations } from 'next-intl';

interface LoadingAnimationProps {
  progressText: string;
  status: string;
}

type AnimationType = "data-stream" | "fluid" | "crystal" | "neural";

// 根据进度文本判断当前阶段
function getAnimationType(progressText: string): AnimationType {
  if (
    progressText.includes("初始化") ||
    progressText.includes("验证") ||
    progressText.includes("抓取")
  ) {
    return "data-stream";
  }
  if (progressText.includes("语义聚类分析")) {
    return "fluid";
  }
  if (progressText.includes("条视频") || progressText.includes("条评论")) {
    return "crystal";
  }
  if (progressText.includes("LLM") || progressText.includes("分析聚类")) {
    return "neural";
  }
  return "data-stream";
}

// 获取阶段信息
function getStageInfo(animationType: AnimationType): { title: string; badge: string; step: string } {
  switch (animationType) {
    case "data-stream":
      return { title: "数据采集中", badge: "抓取内容", step: "Step 1/4" };
    case "fluid":
      return { title: "语义处理中", badge: "特征提取", step: "Step 2/4" };
    case "crystal":
      return { title: "智能聚类中", badge: "AI 运算", step: "Step 3/4" };
    case "neural":
      return { title: "深度分析中", badge: "LLM 推理", step: "Step 4/4" };
  }
}

// 计算进度百分比
function getProgressPercent(progressText: string): number {
  if (progressText.includes("初始化")) return 5;
  if (progressText.includes("验证")) return 10;
  if (progressText.includes("抓取")) return 20;
  if (progressText.includes("语义聚类分析")) return 35;
  if (progressText.includes("条视频")) return 45;
  if (progressText.includes("条评论")) return 55;
  if (progressText.includes("LLM")) return 70;
  if (progressText.includes("分析聚类")) {
    const match = progressText.match(/(\d+)\/(\d+)/);
    if (match) {
      const current = parseInt(match[1]);
      const total = parseInt(match[2]);
      return 70 + (current / total) * 25;
    }
    return 80;
  }
  return 10;
}

// 获取详细日志文本
function getLogDetail(progressText: string): string {
  if (progressText.includes("初始化")) return "正在准备分析环境...";
  if (progressText.includes("验证")) return "正在验证数据源连接...";
  if (progressText.includes("抓取")) {
    const match = progressText.match(/"([^"]+)"/);
    return match ? `正在抓取「${match[1]}」相关内容...` : "正在抓取相关内容...";
  }
  if (progressText.includes("语义聚类")) return "正在分析文本语义特征...";
  if (progressText.includes("条视频")) {
    const match = progressText.match(/(\d+)/);
    return match ? `正在处理 ${match[1]} 条视频内容...` : "正在处理视频内容...";
  }
  if (progressText.includes("条评论")) {
    const match = progressText.match(/(\d+)/);
    return match ? `正在处理 ${match[1]} 条评论内容...` : "正在处理评论内容...";
  }
  if (progressText.includes("LLM")) return "AI 正在深度理解用户痛点...";
  if (progressText.includes("分析聚类")) {
    const match = progressText.match(/(\d+)\/(\d+)/);
    return match ? `正在分析第 ${match[1]} 个痛点聚类...` : "正在分析痛点聚类...";
  }
  return "正在处理中...";
}

export default function LoadingAnimation({ progressText, status }: LoadingAnimationProps) {
  const t = useTranslations('loading');
  const [currentAnimation, setCurrentAnimation] = useState<AnimationType>("data-stream");
  const [isTransitioning, setIsTransitioning] = useState(false);
  const blobRef = useRef<SVGPathElement>(null);
  const animationRef = useRef<number | undefined>(undefined);

  // 获取阶段信息（使用翻译）
  const getStageInfoTranslated = (animationType: AnimationType) => {
    switch (animationType) {
      case "data-stream":
        return { title: t('stages.dataStream.title'), badge: t('stages.dataStream.badge'), step: t('stages.dataStream.step') };
      case "fluid":
        return { title: t('stages.fluid.title'), badge: t('stages.fluid.badge'), step: t('stages.fluid.step') };
      case "crystal":
        return { title: t('stages.crystal.title'), badge: t('stages.crystal.badge'), step: t('stages.crystal.step') };
      case "neural":
        return { title: t('stages.neural.title'), badge: t('stages.neural.badge'), step: t('stages.neural.step') };
    }
  };

  // 获取详细日志文本（使用翻译）
  const getLogDetailTranslated = (progressText: string) => {
    if (progressText.includes("初始化")) return t('logs.initializing');
    if (progressText.includes("验证")) return t('logs.validating');
    if (progressText.includes("抓取")) {
      const match = progressText.match(/"([^"]+)"/);
      return match ? t('logs.crawling', { keyword: match[1] }) : t('logs.crawlingDefault');
    }
    if (progressText.includes("语义聚类")) return t('logs.semanticAnalysis');
    if (progressText.includes("条视频")) {
      const match = progressText.match(/(\d+)/);
      return match ? t('logs.processingVideos', { count: match[1] }) : t('logs.processingVideos', { count: '0' });
    }
    if (progressText.includes("条评论")) {
      const match = progressText.match(/(\d+)/);
      return match ? t('logs.processingComments', { count: match[1] }) : t('logs.processingComments', { count: '0' });
    }
    if (progressText.includes("LLM")) return t('logs.llmAnalysis');
    if (progressText.includes("分析聚类")) {
      const match = progressText.match(/(\d+)\/(\d+)/);
      return match ? t('logs.analyzingCluster', { current: match[1] }) : t('logs.analyzingCluster', { current: '1' });
    }
    return t('logs.processing');
  };

  useEffect(() => {
    const newAnimation = getAnimationType(progressText);
    if (newAnimation !== currentAnimation) {
      setIsTransitioning(true);
      setTimeout(() => {
        setCurrentAnimation(newAnimation);
        setIsTransitioning(false);
      }, 300);
    }
  }, [progressText, currentAnimation]);

  // 流体动画
  useEffect(() => {
    if (currentAnimation !== "fluid" || !blobRef.current) return;

    let time = 0;
    const animate = () => {
      if (!blobRef.current) return;
      time += 0.03;
      const center = 100;
      const radius = 70;
      const points: { x: number; y: number }[] = [];

      for (let angle = 0; angle < Math.PI * 2; angle += 0.1) {
        const r =
          radius +
          12 * Math.sin(angle * 3 + time) +
          6 * Math.sin(angle * 7 - time * 2) +
          3 * Math.cos(angle * 5 + time);
        const x = center + r * Math.cos(angle);
        const y = center + r * Math.sin(angle);
        points.push({ x, y });
      }

      let d = `M ${points[0].x} ${points[0].y}`;
      for (let i = 1; i < points.length; i++) {
        d += ` L ${points[i].x} ${points[i].y}`;
      }
      d += " Z";
      blobRef.current.setAttribute("d", d);
      animationRef.current = requestAnimationFrame(animate);
    };

    animate();
    return () => {
      if (animationRef.current) {
        cancelAnimationFrame(animationRef.current);
      }
    };
  }, [currentAnimation]);

  const stageInfo = getStageInfoTranslated(currentAnimation);
  const progress = getProgressPercent(progressText);
  const logDetail = getLogDetailTranslated(progressText);

  return (
    <div className="flex flex-col items-center justify-center h-full w-full p-8">
      {/* 动画容器 */}
      <div
        className={`relative w-[200px] h-[200px] flex items-center justify-center mb-10 transition-opacity duration-300 ${
          isTransitioning ? "opacity-0" : "opacity-100"
        }`}
      >
        <div className="absolute inset-0 bg-gradient-radial from-amber-100/50 via-transparent to-transparent rounded-full" />
        {currentAnimation === "neural" && <NeuralNetwork />}
        {currentAnimation === "crystal" && <CrystalCube />}
        {currentAnimation === "fluid" && <FluidBlob blobRef={blobRef} />}
        {currentAnimation === "data-stream" && <DataStream />}
      </div>

      {/* 信息状态区 */}
      <div className="w-full max-w-sm space-y-4">
        {/* Header：标题 + 百分比 */}
        <div className="flex justify-between items-end">
          <div className="flex flex-col gap-1">
            <div className="text-lg font-bold text-neutral-800 tracking-tight">
              {stageInfo.title}
            </div>
            <div className="inline-flex items-center gap-1.5 text-xs font-semibold text-amber-600 bg-amber-50 px-2.5 py-1 rounded-md w-fit">
              <span className="w-1.5 h-1.5 bg-amber-500 rounded-full animate-pulse" />
              {stageInfo.badge}
            </div>
          </div>
          <div className="text-4xl font-extrabold bg-gradient-to-br from-amber-500 to-amber-400 bg-clip-text text-transparent tabular-nums">
            {Math.round(progress)}
            <span className="text-base font-semibold text-amber-400">%</span>
          </div>
        </div>

        {/* 进度条 */}
        <div className="w-full h-3 bg-neutral-100 rounded-full overflow-hidden">
          <div
            className="h-full bg-gradient-to-r from-amber-400 to-amber-500 rounded-full relative transition-all duration-500 ease-out"
            style={{ width: `${progress}%` }}
          >
            <div className="absolute inset-0 bg-gradient-to-r from-transparent via-white/40 to-transparent animate-shimmer" />
          </div>
        </div>

        {/* 底部详细日志 */}
        <div className="flex justify-between items-center bg-neutral-50 border border-neutral-100 rounded-xl px-4 py-3">
          <div className="text-sm text-neutral-500">
            {logDetail}
          </div>
          <div className="text-xs text-neutral-400 uppercase tracking-wide font-medium">
            {stageInfo.step}
          </div>
        </div>
      </div>

      {/* 流光动画样式 */}
      <style jsx global>{`
        @keyframes shimmer {
          0% { transform: translateX(-100%); }
          100% { transform: translateX(100%); }
        }
        .animate-shimmer {
          animation: shimmer 1.5s linear infinite;
        }
      `}</style>
    </div>
  );
}

// ============================================
// 动画组件 1: 神经突触网络
// ============================================
function NeuralNetwork() {
  return (
    <div className="neural-network">
      <div className="neural-node" />
      <div className="neural-orbit orbit-1"><span className="orbit-dot" /></div>
      <div className="neural-orbit orbit-2"><span className="orbit-dot" /></div>
      <div className="neural-orbit orbit-3"><span className="orbit-dot" /></div>
      <div className="synapse-flash" />

      <style jsx>{`
        .neural-network {
          position: relative;
          width: 120px;
          height: 120px;
        }
        .neural-node {
          position: absolute;
          width: 12px;
          height: 12px;
          background: #f59e0b;
          border-radius: 50%;
          top: 50%;
          left: 50%;
          transform: translate(-50%, -50%);
          box-shadow: 0 0 20px #f59e0b;
          animation: pulseNode 2s infinite ease-in-out;
          z-index: 2;
        }
        @keyframes pulseNode {
          0%, 100% {
            transform: translate(-50%, -50%) scale(1);
            opacity: 1;
          }
          50% {
            transform: translate(-50%, -50%) scale(1.3);
            opacity: 0.8;
          }
        }
        .neural-orbit {
          position: absolute;
          top: 0;
          left: 0;
          right: 0;
          bottom: 0;
          margin: auto;
          border: 1px solid rgba(245, 158, 11, 0.3);
          border-radius: 50%;
        }
        .orbit-1 {
          width: 100%;
          height: 100%;
          animation: spin 8s linear infinite;
        }
        .orbit-2 {
          width: 70%;
          height: 70%;
          animation: spin 6s linear infinite reverse;
        }
        .orbit-3 {
          width: 40%;
          height: 40%;
          animation: spin 4s linear infinite;
        }
        .orbit-dot {
          position: absolute;
          top: -3px;
          left: 50%;
          transform: translateX(-50%);
          width: 6px;
          height: 6px;
          background: #fbbf24;
          border-radius: 50%;
          box-shadow: 0 0 10px #f59e0b;
        }
        .synapse-flash {
          position: absolute;
          top: 0;
          left: 0;
          right: 0;
          bottom: 0;
          margin: auto;
          width: 10%;
          height: 10%;
          border-radius: 50%;
          border: 2px solid #f59e0b;
          opacity: 0;
          animation: synapseWave 3s infinite cubic-bezier(0, 0.2, 0.8, 1);
        }
        @keyframes synapseWave {
          0% {
            width: 10%;
            height: 10%;
            opacity: 0.8;
            border-width: 2px;
          }
          100% {
            width: 120%;
            height: 120%;
            opacity: 0;
            border-width: 0px;
          }
        }
        @keyframes spin {
          from { transform: rotate(0deg); }
          to { transform: rotate(360deg); }
        }
      `}</style>
    </div>
  );
}

// ============================================
// 动画组件 2: 晶体重组
// ============================================
function CrystalCube() {
  return (
    <div className="crystal-scene">
      <div className="cube">
        <div className="face front" />
        <div className="face back" />
        <div className="face right" />
        <div className="face left" />
        <div className="face top" />
        <div className="face bottom" />
      </div>

      <style jsx>{`
        .crystal-scene {
          width: 80px;
          height: 80px;
          perspective: 600px;
        }
        .cube {
          width: 100%;
          height: 100%;
          position: relative;
          transform-style: preserve-3d;
          animation: shatter 4s infinite cubic-bezier(0.68, -0.55, 0.27, 1.55);
        }
        .face {
          position: absolute;
          width: 80px;
          height: 80px;
          background: rgba(245, 158, 11, 0.1);
          border: 1px solid #fbbf24;
          box-shadow: 0 0 15px rgba(251, 191, 36, 0.2);
          backdrop-filter: blur(2px);
          opacity: 0.9;
        }
        .front {
          transform: rotateY(0deg) translateZ(40px);
        }
        .back {
          transform: rotateY(180deg) translateZ(40px);
        }
        .right {
          transform: rotateY(90deg) translateZ(40px);
        }
        .left {
          transform: rotateY(-90deg) translateZ(40px);
        }
        .top {
          transform: rotateX(90deg) translateZ(40px);
        }
        .bottom {
          transform: rotateX(-90deg) translateZ(40px);
        }
        @keyframes shatter {
          0%,
          100% {
            transform: rotateX(0deg) rotateY(0deg);
          }
          25% {
            transform: rotateX(45deg) rotateY(45deg);
          }
          50% {
            transform: rotateX(180deg) rotateY(180deg);
          }
          75% {
            transform: rotateX(225deg) rotateY(225deg);
          }
        }
      `}</style>
    </div>
  );
}

// ============================================
// 动画组件 3: 流体智力
// ============================================
function FluidBlob({ blobRef }: { blobRef: React.RefObject<SVGPathElement | null> }) {
  return (
    <svg
      width="180"
      height="180"
      viewBox="0 0 200 200"
      style={{ filter: "drop-shadow(0px 10px 15px rgba(251, 191, 36, 0.4))" }}
    >
      <defs>
        <linearGradient id="fluidGradient" x1="0%" y1="0%" x2="100%" y2="100%">
          <stop offset="0%" style={{ stopColor: "#f59e0b", stopOpacity: 1 }} />
          <stop offset="100%" style={{ stopColor: "#fbbf24", stopOpacity: 1 }} />
        </linearGradient>
      </defs>
      <path ref={blobRef} d="" fill="url(#fluidGradient)" />
    </svg>
  );
}

// ============================================
// 动画组件 4: 数据解码流
// ============================================
function DataStream() {
  return (
    <div className="data-stream-box">
      <div className="stream-bg" />
      <div className="decode-line" />
      <div className="data-chars" />

      <style jsx>{`
        .data-stream-box {
          width: 200px;
          height: 40px;
          position: relative;
          overflow: hidden;
          background: rgba(255, 255, 255, 0.6);
          border: 1px solid rgba(251, 191, 36, 0.4);
          border-radius: 8px;
          display: flex;
          align-items: center;
          padding: 0 10px;
          box-shadow: inset 0 0 10px rgba(245, 158, 11, 0.1);
        }
        .data-chars {
          font-family: "Courier New", monospace;
          font-size: 14px;
          color: #f59e0b;
          white-space: nowrap;
          letter-spacing: 3px;
          text-shadow: 0 0 5px rgba(245, 158, 11, 0.5);
        }
        .data-chars::before {
          content: "XY90-AF32-L0G1";
          display: block;
          animation: codeChange 0.8s infinite;
        }
        @keyframes codeChange {
          0% {
            content: "XY90-AF32-L0G1";
          }
          20% {
            content: "AF32-L0G1-XY90";
          }
          40% {
            content: "L0G1-XY90-AF32";
          }
          60% {
            content: "0101-1100-0011";
          }
          80% {
            content: "DATX-GENR-AT0R";
          }
          100% {
            content: "XY90-AF32-L0G1";
          }
        }
        .decode-line {
          position: absolute;
          left: 0;
          top: 0;
          height: 100%;
          width: 4px;
          background: #f59e0b;
          box-shadow: 0 0 15px #f59e0b;
          animation: scanline 2s ease-in-out infinite alternate;
          z-index: 2;
        }
        @keyframes scanline {
          0% {
            left: 0%;
            opacity: 0;
          }
          10% {
            opacity: 1;
          }
          90% {
            opacity: 1;
          }
          100% {
            left: 100%;
            opacity: 0;
          }
        }
        .stream-bg {
          position: absolute;
          top: 0;
          left: 0;
          right: 0;
          bottom: 0;
          background: linear-gradient(
            90deg,
            transparent 0%,
            rgba(251, 191, 36, 0.15) 50%,
            transparent 100%
          );
        }
      `}</style>
    </div>
  );
}
