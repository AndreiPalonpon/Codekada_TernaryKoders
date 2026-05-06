"use client";

import React from "react";
import useScheduleStore from "../../store/useScheduleStore";

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

export default function TaskBreakdown() {
  const aiParsedTasks = useScheduleStore((state) => state.aiParsedTasks);
  const generateSchedule = useScheduleStore((state) => state.generateSchedule);
  const isLoading = useScheduleStore((state) => state.isLoading);

  const tasks = aiParsedTasks.length > 0
    ? aiParsedTasks
    : [];

  return (
    <div className="bg-white rounded-xl border border-slate-200 shadow-sm overflow-hidden">
      <div className="p-4 border-b border-slate-100 flex justify-between items-center">
        <h3 className="font-medium text-slate-800">2. AI Parsed Tasks (JSON Metadata)</h3>
        <span className="text-xs text-slate-500 bg-slate-100 px-2 py-1 rounded">
          {tasks.length > 0 ? `${tasks.length} tasks` : "Read-Only View"}
        </span>
      </div>

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
        <div className="p-0">
          <table className="w-full text-sm text-left text-slate-600">
            <thead className="text-xs text-slate-400 uppercase bg-slate-50 border-b border-slate-100">
              <tr>
                <th className="px-4 py-3 font-medium">Task Name</th>
                <th className="px-4 py-3 font-medium">Est. Time</th>
                <th className="px-4 py-3 font-medium">Cognitive Load</th>
                <th className="px-4 py-3 font-medium">Pref. Window</th>
                <th className="px-4 py-3 font-medium">Splittable</th>
              </tr>
            </thead>
            <tbody>
              {tasks.map((task, idx) => (
                <tr
                  key={task.task_name + "_" + idx}
                  className={idx !== tasks.length - 1 ? "border-b border-slate-50" : ""}
                >
                  <td className="px-4 py-3 font-medium text-slate-800">{task.task_name}</td>
                  <td className="px-4 py-3">{task.estimated_minutes} min</td>
                  <td className="px-4 py-3">
                    <span className={`px-2 py-1 rounded-md text-xs font-medium ${
                      LOAD_STYLES[task.cognitive_load] || LOAD_STYLES.Medium
                    }`}>
                      {task.cognitive_load}
                    </span>
                  </td>
                  <td className="px-4 py-3">{task.preferred_window || "Any"}</td>
                  <td className="px-4 py-3">{task.splittable ? "Yes" : "No"}</td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      )}

      <div className="p-4 border-t border-slate-100 bg-slate-50 flex justify-end">
        <button
          onClick={() => generateSchedule("ws_8f92a")}
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
  );
}
