"use client";

import React from "react";
import { ChevronDown, ChevronUp } from "lucide-react";
import useScheduleStore from "../../store/useScheduleStore";
import useWorkspaceStore from "../../store/useWorkspaceStore";

/**
 * TaskBreakdown
 *
 * Displays the raw AI Phase 1 output (the mathematically agnostic JSON array)
 * in a read-only table. Data is pulled from the Zustand `aiParsedTasks` state
 * which is populated after a successful schedule generation.
 *
 * The "Generate Schedule" button re-triggers the full pipeline for quick
 * iteration when the user modifies their input.
 */

/** Maps cognitive load levels to pill styles. */
const LOAD_STYLES = {
  High:   "bg-red-50 text-red-600",
  Medium: "bg-amber-50 text-amber-600",
  Low:    "bg-blue-50 text-blue-600",
};

export default function TaskBreakdown({ isExpanded = true, onToggle }) {
  const aiParsedTasks = useScheduleStore((state) => state.aiParsedTasks);
  const generateSchedule = useScheduleStore((state) => state.generateSchedule);
  const isLoading = useScheduleStore((state) => state.isLoading);
  const activeWorkspaceId = useWorkspaceStore((state) => state.activeWorkspaceId);

  const tasks = aiParsedTasks.length > 0
    ? aiParsedTasks
    : [];

  return (
    <div className={`bg-white rounded-xl border border-slate-200 shadow-sm overflow-hidden flex flex-col transition-all duration-300 ${!isExpanded ? 'h-14 shrink-0' : 'flex-1 min-h-[300px]'}`}>
      <div 
        onClick={onToggle}
        className={`p-4 border-b border-slate-100 bg-slate-50 flex justify-between items-center shrink-0 cursor-pointer hover:bg-slate-100 transition-colors ${!isExpanded ? 'border-b-0' : ''}`}
      >
        <h3 className="font-medium text-slate-800">2. Reschedule & Rearrange Tasks</h3>
        <div className="flex items-center gap-3">
          <span className="text-xs text-slate-500 bg-slate-100 px-2 py-1 rounded">
            {tasks.length > 0 ? `${tasks.length} tasks` : "Read-Only View"}
          </span>
          {isExpanded ? <ChevronUp size={18} className="text-slate-400" /> : <ChevronDown size={18} className="text-slate-400" />}
        </div>
      </div>

      {isExpanded && (
        <>
          <div className="flex-1 overflow-hidden flex flex-col">
            {tasks.length === 0 ? (
        /* Empty state */
        <div className="p-8 flex flex-col items-center text-center">
          <div className="w-12 h-12 rounded-full bg-slate-100 flex items-center justify-center mb-3">
            <svg xmlns="http://www.w3.org/2000/svg" width="24" height="24" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.5" strokeLinecap="round" strokeLinejoin="round" className="text-slate-400">
              <path d="M14 2H6a2 2 0 0 0-2 2v16a2 2 0 0 0 2 2h12a2 2 0 0 0 2-2V8z"/><polyline points="14 2 14 8 20 8"/><line x1="16" y1="13" x2="8" y2="13"/><line x1="16" y1="17" x2="8" y2="17"/><polyline points="10 9 9 9 8 9"/>
            </svg>
          </div>
          <p className="text-sm text-slate-500">
            AI-extracted tasks will appear here after you run <strong>Analyze</strong>.
          </p>
        </div>
      ) : (
        <div className="p-0 flex-1 overflow-y-auto scrollbar-thin scrollbar-thumb-slate-200">
          <table className="w-full text-sm text-left text-slate-600 relative">
            <thead className="text-xs text-slate-400 uppercase bg-slate-50 border-b border-slate-100 sticky top-0 z-10">
              <tr>
                <th className="px-4 py-3 font-medium">Task Name</th>
                <th className="px-4 py-3 font-medium">Est. Time</th>
                <th className="px-4 py-3 font-medium">Cognitive Load</th>
                <th className="px-4 py-3 font-medium">Pref. Window</th>
                <th className="px-4 py-3 font-medium">Splittable</th>
              </tr>
            </thead>
            <tbody>
              {tasks.map((task, idx) => {
                const meta = task.metadata || {};
                return (
                <tr
                  key={meta.task_name + "_" + idx}
                  className={idx !== tasks.length - 1 ? "border-b border-slate-50" : ""}
                >
                  <td className="px-4 py-3 font-medium text-slate-800">{meta.task_name || "Unnamed Task"}</td>
                  <td className="px-4 py-3">{meta.estimated_minutes || 0} min</td>
                  <td className="px-4 py-3">
                    <span className={`px-2 py-1 rounded-md text-xs font-medium ${
                      LOAD_STYLES[meta.cognitive_load] || LOAD_STYLES.Medium
                    }`}>
                      {meta.cognitive_load || "Medium"}
                    </span>
                  </td>
                  <td className="px-4 py-3">{meta.preferred_window || "Any"}</td>
                  <td className="px-4 py-3">{meta.splittable ? "Yes" : "No"}</td>
                </tr>
              )})}
            </tbody>
          </table>
        </div>
      )}

      <div className="p-4 border-t border-slate-100 bg-slate-50 flex justify-end">
        <button
          onClick={() => generateSchedule(activeWorkspaceId)}
          disabled={isLoading}
          className={`px-5 py-2 text-sm font-medium rounded-lg transition-colors shadow-sm ${
            isLoading
              ? "bg-slate-400 text-slate-200 cursor-not-allowed"
              : "bg-emerald-600 hover:bg-emerald-700 text-white shadow-emerald-600/20"
          }`}
        >
          {isLoading ? "Generating..." : "Generate Schedule (Run Bin-Packing)"}
        </button>
        </div>
      </div>
    </>
  )}
</div>
  );
}
