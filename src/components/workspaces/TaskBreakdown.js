"use client";

import React from "react";

// Dummy JSON output from the AI Phase 1
const dummyTasks = [
  {
    id: "task_1",
    task_name: "Write Thesis Intro",
    estimated_minutes: 120,
    cognitive_load: "High",
    preferred_window: "Morning",
    splittable: true,
    assigned_to: "SmartyToonster"
  },
  {
    id: "task_2",
    task_name: "Review Bio Chapters 4-6",
    estimated_minutes: 60,
    cognitive_load: "Low",
    preferred_window: "Any",
    splittable: false,
    assigned_to: "SmartyToonster"
  }
];

export default function TaskBreakdown() {
  return (
    <div className="bg-white rounded-xl border border-slate-200 shadow-sm overflow-hidden">
      <div className="p-4 border-b border-slate-100 flex justify-between items-center">
        <h3 className="font-medium text-slate-800">2. AI Parsed Tasks (JSON Metadata)</h3>
        <span className="text-xs text-slate-500 bg-slate-100 px-2 py-1 rounded">Read-Only View</span>
      </div>
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
            {dummyTasks.map((task, idx) => (
              <tr key={task.id} className={idx !== dummyTasks.length - 1 ? "border-b border-slate-50" : ""}>
                <td className="px-4 py-3 font-medium text-slate-800">{task.task_name}</td>
                <td className="px-4 py-3">{task.estimated_minutes} min</td>
                <td className="px-4 py-3">
                  <span className={`px-2 py-1 rounded-md text-xs font-medium ${
                    task.cognitive_load === 'High' ? 'bg-red-50 text-red-600' : 'bg-blue-50 text-blue-600'
                  }`}>
                    {task.cognitive_load}
                  </span>
                </td>
                <td className="px-4 py-3">{task.preferred_window}</td>
                <td className="px-4 py-3">{task.splittable ? "Yes" : "No"}</td>
              </tr>
            ))}
          </tbody>
        </table>
      </div>
      <div className="p-4 border-t border-slate-100 bg-slate-50 flex justify-end">
        <button className="px-5 py-2 bg-emerald-600 hover:bg-emerald-700 text-white text-sm font-medium rounded-lg transition-colors shadow-sm shadow-emerald-600/20">
          Generate Schedule (Run Bin-Packing)
        </button>
      </div>
    </div>
  );
}
