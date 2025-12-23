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

interface ExportButtonProps {
  results: ClusterResult[];
}

export default function ExportButton({ results }: ExportButtonProps) {
  const convertToCSV = (data: ClusterResult[]): string => {
    const headers = [
      "簇ID",
      "簇大小",
      "付费意向",
      "核心痛点",
      "分析理由",
      "产品构想",
      "代表性原文"
    ];

    const translatePaidInterest = (interest: "High" | "Medium" | "Low") => {
      const mapping = {
        High: "高",
        Medium: "中",
        Low: "低"
      };
      return mapping[interest];
    };

    const escapeCSVField = (field: string): string => {
      if (field.includes(',') || field.includes('"') || field.includes('\n')) {
        const escaped = field.replace(/"/g, '""');
        return `"${escaped}"`;
      }
      return field;
    };

    const csvRows = [headers.join(',')];

    data.forEach(result => {
      const row = [
        escapeCSVField(result.id),
        result.size.toString(),
        escapeCSVField(translatePaidInterest(result.analysis.paid_interest)),
        escapeCSVField(result.analysis.one_line_pain),
        escapeCSVField(result.analysis.rationale),
        escapeCSVField(result.analysis.potential_product),
        escapeCSVField(result.representative_texts.join('; '))
      ];
      csvRows.push(row.join(','));
    });

    return csvRows.join('\n');
  };

  const handleExport = () => {
    if (results.length === 0) {
      return;
    }

    try {
      const csvContent = convertToCSV(results);
      const BOM = '\uFEFF';
      const csvWithBOM = BOM + csvContent;
      const blob = new Blob([csvWithBOM], { type: 'text/csv;charset=utf-8;' });
      const link = document.createElement('a');
      const url = URL.createObjectURL(blob);
      link.setAttribute('href', url);

      const timestamp = new Date().toISOString().slice(0, 19).replace(/[T:]/g, '-');
      link.setAttribute('download', `痛点分析结果_${timestamp}.csv`);

      link.style.visibility = 'hidden';
      document.body.appendChild(link);
      link.click();
      document.body.removeChild(link);
      URL.revokeObjectURL(url);
    } catch {
      // Export failed silently
    }
  };

  return (
    <div
      onClick={handleExport}
      className="bg-[#18181B] rounded-2xl p-4 shadow-lg text-white relative overflow-hidden group cursor-pointer hover:bg-zinc-800 transition"
    >
      <div className="absolute right-3 top-3 opacity-20">
        <svg className="w-6 h-6" fill="none" stroke="currentColor" viewBox="0 0 24 24">
          <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M4 16v1a3 3 0 003 3h10a3 3 0 003-3v-1m-4-4l-4 4m0 0l-4-4m4 4V4" />
        </svg>
      </div>
      <div className="text-gray-400 text-xs font-semibold uppercase">Export</div>
      <div className="text-lg font-bold mt-1">Download CSV</div>
    </div>
  );
}
