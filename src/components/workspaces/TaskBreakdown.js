"use client";

import React from "react";
import { Play, Loader2, Sparkles, AlertCircle } from "lucide-react";
import useScheduleStore from "../../store/useScheduleStore";

export default function TaskBreakdown() {
  const parsedTasks = useScheduleStore((state) => state.parsedTasks);
  const generateSchedule = useScheduleStore((state) => state.generateSchedule);
  const isScheduling = useScheduleStore((state) => state.isScheduling);
  const isAnalyzing = useScheduleStore((state) => state.isAnalyzing);
  const error = useScheduleStore((state) => state.error);

  const hasTasks = parsedTasks && parsedTasks.length > 0;

  return (
    <div className="bg-white rounded-xl border border-slate-200 shadow-sm overflow-hidden flex flex-col">
      <div className="p-4 border-b border-slate-100 flex justify-between items-center bg-slate-50">
        <h3 className="font-semibold text-slate-800 flex items-center gap-2">
          2. AI Parsed Tasks (JSON Metadata)
        </h3>
        <span className={`text-[10px] font-bold uppercase tracking-wider px-2 py-1 rounded border ${
          hasTasks 
            ? "bg-emerald-100/50 text-emerald-700 border-emerald-200/50" 
            : "bg-slate-100 text-slate-500 border-slate-200/50"
        }`}>
          {hasTasks ? `${parsedTasks.length} Parsed` : "Empty State"}
        </span>
      </div>

      {error && (
        <div className="p-3 bg-red-50 border-b border-red-100 flex items-start gap-2 text-xs text-red-700">
          <AlertCircle size={14} className="shrink-0 mt-0.5" />
          <div>
            <strong>Error:</strong> {error.message || "An unexpected error occurred."}
          </div>
        </div>
      )}

      <div className="min-h-[200px] flex-1 overflow-x-auto">
        {!hasTasks ? (
          <div className="flex flex-col items-center justify-center p-8 text-center h-full min-h-[200px]">
            {isAnalyzing ? (
              <div className="flex flex-col items-center gap-2">
                <Loader2 size={32} className="text-emerald-600 animate-spin" />
                <p className="text-sm font-semibold text-slate-600">Analyzing context...</p>
                <p className="text-xs text-slate-400">Gemini is structuring your workload.</p>
              </div>
            ) : (
              <div className="flex flex-col items-center gap-2 max-w-sm">
                <div className="w-10 h-10 rounded-lg bg-slate-100 text-slate-400 flex items-center justify-center mb-1">
                  <Sparkles size={20} />
                </div>
                <p className="text-sm font-semibold text-slate-700">No tasks parsed yet</p>
                <p className="text-xs text-slate-400">
                  Enter a project description, paste a syllabus, or try sample suggestions in the panel above to begin.
                </p>
              </div>
            )}
          </div>
        ) : (
          <table className="w-full text-sm text-left text-slate-600">
            <thead className="text-xs text-slate-400 uppercase bg-slate-50/50 border-b border-slate-100">
              <tr>
                <th className="px-4 py-3 font-semibold">Task Name</th>
                <th className="px-4 py-3 font-semibold">Est. Time</th>
                <th className="px-4 py-3 font-semibold">Cognitive Load</th>
                <th className="px-4 py-3 font-semibold">Pref. Window</th>
                <th className="px-4 py-3 font-semibold">Split</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-slate-100">
              {parsedTasks.map((task, idx) => {
                const meta = task.metadata || {};
                const cognitiveLoad = meta.cognitive_load || "Medium";
                
                return (
                  <tr key={idx} className="hover:bg-slate-50/50 transition-colors">
                    <td className="px-4 py-3 font-medium text-slate-800 max-w-[160px] truncate" title={meta.task_name}>
                      {meta.task_name}
                    </td>
                    <td className="px-4 py-3 text-slate-500 font-medium">{meta.estimated_minutes} min</td>
                    <td className="px-4 py-3">
                      <span className={`px-2 py-0.5 rounded-full text-[11px] font-semibold tracking-wide border ${
                        cognitiveLoad === 'High' 
                          ? 'bg-red-50 text-red-700 border-red-100' 
                          : cognitiveLoad === 'Medium'
                          ? 'bg-blue-50 text-blue-700 border-blue-100'
                          : 'bg-emerald-50 text-emerald-700 border-emerald-100'
                      }`}>
                        {cognitiveLoad}
                      </span>
                    </td>
                    <td className="px-4 py-3 text-slate-500 font-medium">{meta.preferred_window || "Any"}</td>
                    <td className="px-4 py-3 text-slate-500 font-medium">{meta.splittable ? "Yes" : "No"}</td>
                  </tr>
                );
              })}
            </tbody>
          </table>
        )}
      </div>

      {hasTasks && (
        <div className="p-4 border-t border-slate-100 bg-slate-50 flex justify-end shrink-0">
          <button
            onClick={() => generateSchedule()}
            disabled={isScheduling}
            className={`px-5 py-2.5 bg-emerald-600 hover:bg-emerald-700 text-white text-sm font-semibold rounded-lg transition-all shadow-md shadow-emerald-600/10 flex items-center gap-2 group ${
              isScheduling ? "opacity-75 cursor-not-allowed" : "hover:shadow-lg"
            }`}
          >
            {isScheduling ? "Scheduling..." : "Generate Schedule"}
            {isScheduling ? (
              <Loader2 size={16} className="animate-spin" />
            ) : (
              <Play size={14} className="fill-white group-hover:scale-110 transition-transform" />
            )}
          </button>
        </div>
      )}
    </div>
  );
}
