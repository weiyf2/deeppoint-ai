import { useEffect } from "react";

interface ClusterResult {
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

interface DetailModalProps {
  isOpen: boolean;
  onClose: () => void;
  result: ClusterResult | null;
}

export default function DetailModal({ isOpen, onClose, result }: DetailModalProps) {
  useEffect(() => {
    const handleEscape = (e: KeyboardEvent) => {
      if (e.key === "Escape") {
        onClose();
      }
    };

    if (isOpen) {
      document.addEventListener("keydown", handleEscape);
      document.body.style.overflow = "hidden";
    }

    return () => {
      document.removeEventListener("keydown", handleEscape);
      document.body.style.overflow = "unset";
    };
  }, [isOpen, onClose]);

  const getBadgeClass = (interest: "High" | "Medium" | "Low") => {
    switch (interest) {
      case "High":
        return "bg-amber-100 text-amber-800";
      case "Medium":
        return "bg-gray-100 text-gray-600";
      case "Low":
        return "bg-green-100 text-green-800";
    }
  };

  if (!isOpen || !result) {
    return null;
  }

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center p-4">
      {/* Backdrop */}
      <div
        className="absolute inset-0 bg-gray-900/60 backdrop-blur-sm transition-opacity"
        onClick={onClose}
      ></div>

      {/* Content */}
      <div className="bg-white w-full max-w-2xl rounded-3xl shadow-2xl z-10 overflow-hidden transform transition-all scale-100 flex flex-col max-h-[85vh]">
        {/* Header */}
        <div className="p-6 border-b border-gray-100 flex justify-between items-start bg-[#FBFBF9]/50">
          <div>
            <div className="flex items-center gap-3 mb-2">
              <span className={`inline-flex items-center px-2.5 py-0.5 rounded-md text-xs font-medium ${getBadgeClass(result.analysis.paid_interest)}`}>
                {result.analysis.paid_interest} Intent
              </span>
              <span className="text-xs text-gray-400 font-mono">
                #Cluster-{result.id.slice(0, 6)}
              </span>
            </div>
            <h2 className="text-xl font-bold text-[#18181B] leading-snug">
              {result.analysis.one_line_pain}
            </h2>
          </div>
          <button
            onClick={onClose}
            className="text-gray-400 hover:text-[#18181B] p-2 transition-colors"
          >
            <svg className="w-6 h-6" fill="none" stroke="currentColor" viewBox="0 0 24 24">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M6 18L18 6M6 6l12 12" />
            </svg>
          </button>
        </div>

        {/* Scrollable Body */}
        <div className="p-6 overflow-y-auto hide-scroll space-y-8">
          {/* Reason Block */}
          <div className="bg-gray-50 rounded-xl p-5 border border-gray-100">
            <h3 className="text-xs font-bold text-gray-500 uppercase tracking-wide mb-3 flex items-center gap-2">
              <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M9 12h6m-6 4h6m2 5H7a2 2 0 01-2-2V5a2 2 0 012-2h5.586a1 1 0 01.707.293l5.414 5.414a1 1 0 01.293.707V19a2 2 0 01-2 2z" />
              </svg>
              分析依据
            </h3>
            <p className="text-gray-700 leading-relaxed text-sm">
              {result.analysis.rationale}
            </p>
          </div>

          {/* Product Idea Block */}
          <div>
            <h3 className="text-xs font-bold text-amber-600 uppercase tracking-wide mb-3 flex items-center gap-2">
              <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M13 10V3L4 14h7v7l9-11h-7z" />
              </svg>
              AI 产品构想
            </h3>
            <div className="pl-4 border-l-2 border-amber-400">
              <p className="text-[#18181B] text-lg font-medium">
                {result.analysis.potential_product}
              </p>
            </div>
          </div>

          {/* Stats */}
          <div className="flex gap-4">
            <div className="bg-[#FBFBF9] rounded-xl p-4 flex-1">
              <div className="text-xs text-gray-500 font-medium">样本数量</div>
              <div className="text-2xl font-bold text-[#18181B] mt-1">{result.size}</div>
            </div>
            <div className="bg-[#FBFBF9] rounded-xl p-4 flex-1">
              <div className="text-xs text-gray-500 font-medium">原文数量</div>
              <div className="text-2xl font-bold text-[#18181B] mt-1">{result.representative_texts.length}</div>
            </div>
          </div>

          {/* Comments List */}
          <div>
            <h3 className="text-xs font-bold text-gray-500 uppercase tracking-wide mb-4">代表性原文</h3>
            <div className="space-y-3">
              {result.representative_texts.map((text, index) => (
                <div
                  key={index}
                  className="text-sm text-gray-600 bg-white border border-gray-100 p-3 rounded-lg shadow-sm flex items-start gap-3"
                >
                  <span className="flex-shrink-0 flex items-center justify-center w-5 h-5 bg-gray-100 text-gray-500 text-[10px] font-bold rounded-full mt-0.5">
                    {index + 1}
                  </span>
                  <span className="leading-relaxed">{text}</span>
                </div>
              ))}
            </div>
          </div>
        </div>

        {/* Footer */}
        <div className="p-4 border-t border-gray-100 flex justify-end">
          <button
            onClick={onClose}
            className="px-5 py-2 text-sm font-semibold text-gray-600 hover:bg-gray-50 rounded-lg transition"
          >
            Close
          </button>
        </div>
      </div>
    </div>
  );
}
