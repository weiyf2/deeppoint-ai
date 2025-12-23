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

interface ResultsTableProps {
  results: ClusterResult[];
  onRowClick: (result: ClusterResult) => void;
}

export default function ResultsTable({ results, onRowClick }: ResultsTableProps) {
  const getBadgeClass = (interest: "High" | "Medium" | "Low") => {
    switch (interest) {
      case "High":
        return "bg-amber-100 text-amber-800 border border-amber-200";
      case "Medium":
        return "bg-gray-100 text-gray-600";
      case "Low":
        return "bg-green-100 text-green-800 border border-green-200";
    }
  };

  if (results.length === 0) {
    return null;
  }

  return (
    <div className="space-y-4">
      {results.map((result, index) => (
        <div
          key={result.id}
          onClick={() => onRowClick(result)}
          className="group bg-white rounded-2xl p-6 shadow-neuro border border-white hover:border-gray-200 transition-all cursor-pointer card-hover relative overflow-hidden"
        >
          <div className="flex justify-between items-start mb-3">
            <div className="flex flex-col flex-1 mr-4">
              <h4 className="font-bold text-lg text-[#18181B] mb-1 group-hover:text-amber-600 transition-colors line-clamp-1">
                {result.analysis.one_line_pain}
              </h4>
              <p className="text-sm text-gray-500 line-clamp-1">
                {result.analysis.potential_product}
              </p>
            </div>
            <div className="flex items-center gap-2 flex-shrink-0">
              <span className={`px-3 py-1 rounded-full text-xs font-bold uppercase tracking-wider ${getBadgeClass(result.analysis.paid_interest)}`}>
                $ {result.analysis.paid_interest} Intent
              </span>
            </div>
          </div>

          <div className="flex items-center justify-between pt-4 border-t border-gray-50 mt-4">
            <div className="flex items-center gap-2 text-xs text-gray-400">
              <span className="flex items-center gap-1 bg-gray-50 px-2 py-1 rounded">
                <svg className="w-3 h-3" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M17 20h5v-2a3 3 0 00-5.356-1.857M17 20H7m10 0v-2c0-.656-.126-1.283-.356-1.857M7 20H2v-2a3 3 0 015.356-1.857M7 20v-2c0-.656.126-1.283.356-1.857m0 0a5.002 5.002 0 019.288 0M15 7a3 3 0 11-6 0 3 3 0 016 0zm6 3a2 2 0 11-4 0 2 2 0 014 0zM7 10a2 2 0 11-4 0 2 2 0 014 0z" />
                </svg>
                Size: {result.size}
              </span>
              <span className="text-gray-300 font-mono">#{String(index + 1).padStart(2, '0')}</span>
            </div>
            <div className="opacity-0 group-hover:opacity-100 transition-opacity flex items-center text-xs font-bold text-amber-600">
              View Analysis
              <svg className="w-4 h-4 ml-1" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M9 5l7 7-7 7" />
              </svg>
            </div>
          </div>
        </div>
      ))}
    </div>
  );
}
