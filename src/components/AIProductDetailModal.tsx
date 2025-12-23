"use client";

import { useEffect } from "react";
import { AIProductResult } from "../../lib/services/ai-product-service";

interface AIProductDetailModalProps {
  isOpen: boolean;
  onClose: () => void;
  result: AIProductResult | null;
}

export default function AIProductDetailModal({
  isOpen,
  onClose,
  result,
}: AIProductDetailModalProps) {
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

  if (!isOpen || !result) return null;

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
            <div className="flex items-center gap-2 mb-2">
              <span className="px-2 py-0.5 text-xs font-medium rounded-md bg-[#18181B] text-white">
                {result.analysis.product_category}
              </span>
              <span className="text-xs text-gray-400 font-mono">
                {result.size} 条样本
              </span>
            </div>
            <h2 className="text-xl font-bold text-[#18181B] leading-snug">
              {result.analysis.product_name} - 用户反馈
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
        <div className="p-6 overflow-y-auto hide-scroll space-y-6">
          <div className="bg-gray-50 rounded-xl p-4 border border-gray-100">
            <p className="text-sm text-gray-600">
              以下是用于生成该产品建议的代表性用户反馈。
            </p>
          </div>

          <div className="space-y-3">
            {result.representative_texts.map((text, index) => (
              <div
                key={index}
                className="text-sm text-gray-600 bg-white border border-gray-100 p-4 rounded-xl shadow-sm flex items-start gap-3"
              >
                <span className="flex-shrink-0 flex items-center justify-center w-6 h-6 bg-amber-100 text-amber-700 text-xs font-bold rounded-full mt-0.5">
                  {index + 1}
                </span>
                <span className="leading-relaxed">{text}</span>
              </div>
            ))}
          </div>

          {result.representative_texts.length === 0 && (
            <div className="text-center py-12">
              <div className="w-12 h-12 bg-gray-100 rounded-full flex items-center justify-center mx-auto mb-3">
                <svg className="w-6 h-6 text-gray-400" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M9 12h6m-6 4h6m2 5H7a2 2 0 01-2-2V5a2 2 0 012-2h5.586a1 1 0 01.707.293l5.414 5.414a1 1 0 01.293.707V19a2 2 0 01-2 2z" />
                </svg>
              </div>
              <p className="text-gray-400">暂无代表性文本</p>
            </div>
          )}
        </div>

        {/* Footer */}
        <div className="p-4 border-t border-gray-100 flex justify-end">
          <button
            onClick={onClose}
            className="px-5 py-2 text-sm font-semibold text-gray-600 hover:bg-gray-50 rounded-lg transition"
          >
            关闭
          </button>
        </div>
      </div>
    </div>
  );
}
