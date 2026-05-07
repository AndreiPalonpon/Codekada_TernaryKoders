"use client";

import React, { useState } from "react";
import { PlusCircle, Loader2, Sparkles, AlertTriangle, Calendar, Layers, Clock } from "lucide-react";
import useScheduleStore from "../../store/useScheduleStore";
import useWorkspaceStore from "../../store/useWorkspaceStore";

export default function ManualTaskInput({ isExpanded = true, onToggle }) {
  const generateManualTask = useScheduleStore((state) => state.generateManualTask);
  const isLoading = useScheduleStore((state) => state.isLoading);
  const activeWorkspaceId = useWorkspaceStore((state) => state.activeWorkspaceId);

  const [taskName, setTaskName] = useState("");
  const [estimatedMinutes, setEstimatedMinutes] = useState(60);
  const [cognitiveLoad, setCognitiveLoad] = useState("Medium");
  const [preferredWindow, setPreferredWindow] = useState("Morning");
  const [splittable, setSplittable] = useState(true);
  const [priority, setPriority] = useState("P3");
  const [fixedTime, setFixedTime] = useState(false);
  const [startTime, setStartTime] = useState("");
  const [endTime, setEndTime] = useState("");
  const [isOverwrite, setIsOverwrite] = useState(false);
  const [successMsg, setSuccessMsg] = useState("");

  const handleSubmit = async (e) => {
    e.preventDefault();
    if (!taskName.trim()) return;

    const manualTask = {
      task_name: taskName,
      estimated_minutes: parseInt(estimatedMinutes) || 60,
      cognitive_load: cognitiveLoad,
      preferred_window: preferredWindow,
      splittable,
      priority,
      fixed_time: fixedTime,
      start_after: fixedTime && startTime ? new Date(startTime).toISOString() : null,
      deadline: fixedTime && endTime ? new Date(endTime).toISOString() : null,
    };

    const res = await generateManualTask(activeWorkspaceId, manualTask, isOverwrite);
    if (res?.success) {
      setSuccessMsg("Task successfully scheduled!");
      setTaskName("");
      setTimeout(() => setSuccessMsg(""), 3000);
    }
  };

  return (
    <div className={`bg-white rounded-xl border border-slate-200 shadow-sm overflow-hidden flex flex-col transition-all duration-300 ${!isExpanded ? 'h-14 shrink-0' : 'flex-1 min-h-[300px]'}`}>
      <div 
        onClick={onToggle}
        className={`p-4 border-b border-slate-100 bg-slate-50 flex justify-between items-center shrink-0 cursor-pointer hover:bg-slate-100 transition-colors ${!isExpanded ? 'border-b-0' : ''}`}
      >
        <h3 className="font-semibold text-slate-800 flex items-center gap-2">
          <Layers size={18} className="text-emerald-600" />
          Direct Manual Task
          {!isExpanded && taskName && <span className="text-xs font-normal text-slate-400 ml-2">({taskName})</span>}
        </h3>
        <div className="flex items-center gap-3">
          <span className="text-[10px] font-bold uppercase tracking-wider px-2 py-1 bg-blue-100/50 text-blue-700 rounded border border-blue-200/50">
            AI Bypass
          </span>
        </div>
      </div>
      
      {isExpanded && (
        <form onSubmit={handleSubmit} className="p-4 flex-1 overflow-y-auto space-y-4 text-sm text-slate-700">
          {successMsg && (
            <div className="p-2.5 bg-emerald-50 border border-emerald-200 text-emerald-800 text-xs font-semibold rounded-lg text-center animate-pulse">
              🎉 {successMsg}
            </div>
          )}

          {/* Task Name */}
          <div>
            <label className="block text-xs font-bold text-slate-500 uppercase tracking-wider mb-1">Task Title</label>
            <input 
              type="text"
              required
              className="w-full p-2.5 border border-slate-200 rounded-lg focus:outline-none focus:ring-2 focus:ring-emerald-500/20 focus:border-emerald-500 transition-all bg-slate-50/50 text-slate-800"
              placeholder="e.g. Finish Math Homework"
              value={taskName}
              onChange={(e) => setTaskName(e.target.value)}
            />
          </div>

          <div className="grid grid-cols-2 gap-3">
            {/* Duration */}
            <div>
              <label className="block text-xs font-bold text-slate-500 uppercase tracking-wider mb-1">Duration (Min)</label>
              <input 
                type="number"
                min="5"
                required
                className="w-full p-2.5 border border-slate-200 rounded-lg focus:outline-none focus:ring-2 focus:ring-emerald-500/20 focus:border-emerald-500 transition-all bg-slate-50/50 text-slate-800"
                value={estimatedMinutes}
                onChange={(e) => setEstimatedMinutes(e.target.value)}
              />
            </div>

            {/* Priority */}
            <div>
              <label className="block text-xs font-bold text-slate-500 uppercase tracking-wider mb-1">Priority</label>
              <select 
                className="w-full p-2.5 border border-slate-200 rounded-lg focus:outline-none focus:ring-2 focus:ring-emerald-500/20 focus:border-emerald-500 transition-all bg-slate-50/50 text-slate-800 font-medium"
                value={priority}
                onChange={(e) => setPriority(e.target.value)}
              >
                <option value="P1">P1 (Urgent/Prereq)</option>
                <option value="P2">P2 (High)</option>
                <option value="P3">P3 (Medium)</option>
                <option value="P4">P4 (Low)</option>
              </select>
            </div>
          </div>

          <div className="grid grid-cols-2 gap-3">
            {/* Cognitive Load */}
            <div>
              <label className="block text-xs font-bold text-slate-500 uppercase tracking-wider mb-1">Brain Load</label>
              <select 
                className="w-full p-2.5 border border-slate-200 rounded-lg focus:outline-none focus:ring-2 focus:ring-emerald-500/20 focus:border-emerald-500 transition-all bg-slate-50/50 text-slate-800 font-medium"
                value={cognitiveLoad}
                onChange={(e) => setCognitiveLoad(e.target.value)}
              >
                <option value="High">🔴 High</option>
                <option value="Medium">🟡 Medium</option>
                <option value="Low">🟢 Low</option>
              </select>
            </div>

            {/* Preferred Window */}
            <div>
              <label className="block text-xs font-bold text-slate-500 uppercase tracking-wider mb-1">Preferred Time</label>
              <select 
                className="w-full p-2.5 border border-slate-200 rounded-lg focus:outline-none focus:ring-2 focus:ring-emerald-500/20 focus:border-emerald-500 transition-all bg-slate-50/50 text-slate-800 font-medium"
                value={preferredWindow}
                onChange={(e) => setPreferredWindow(e.target.value)}
              >
                <option value="Morning">🌅 Morning</option>
                <option value="Afternoon">☀️ Afternoon</option>
                <option value="Night">🌙 Night</option>
              </select>
            </div>
          </div>

          {/* Splittable Toggle */}
          <div className="flex items-center justify-between bg-slate-50/50 border border-slate-200 p-2.5 rounded-lg">
            <div className="flex items-center gap-2">
              <Clock size={16} className="text-slate-500" />
              <div>
                <p className="text-xs font-semibold text-slate-800 leading-none">Splittable Task</p>
                <p className="text-[10px] text-slate-500 mt-0.5">Allows break periods during scheduling.</p>
              </div>
            </div>
            <label className="relative inline-flex items-center cursor-pointer">
              <input 
                type="checkbox" 
                className="sr-only peer" 
                checked={splittable}
                onChange={(e) => setSplittable(e.target.checked)}
              />
              <div className="w-9 h-5 bg-slate-200 peer-focus:outline-none rounded-full peer peer-checked:after:translate-x-full peer-checked:after:border-white after:content-[''] after:absolute after:top-[2px] after:left-[2px] after:bg-white after:border-slate-300 after:border after:rounded-full after:h-4 after:w-4 after:transition-all peer-checked:bg-emerald-600"></div>
            </label>
          </div>

          {/* Fixed Time Toggle */}
          <div className="flex items-center justify-between bg-slate-50/50 border border-slate-200 p-2.5 rounded-lg">
            <div className="flex items-center gap-2">
              <Calendar size={16} className="text-slate-500" />
              <div>
                <p className="text-xs font-semibold text-slate-800 leading-none">Pin Exact Time Slot</p>
                <p className="text-[10px] text-slate-500 mt-0.5">Bypasses packer and pins to calendar.</p>
              </div>
            </div>
            <label className="relative inline-flex items-center cursor-pointer">
              <input 
                type="checkbox" 
                className="sr-only peer" 
                checked={fixedTime}
                onChange={(e) => setFixedTime(e.target.checked)}
              />
              <div className="w-9 h-5 bg-slate-200 peer-focus:outline-none rounded-full peer peer-checked:after:translate-x-full peer-checked:after:border-white after:content-[''] after:absolute after:top-[2px] after:left-[2px] after:bg-white after:border-slate-300 after:border after:rounded-full after:h-4 after:w-4 after:transition-all peer-checked:bg-blue-600"></div>
            </label>
          </div>

          {/* Fixed Date Pickers */}
          {fixedTime && (
            <div className="space-y-3 p-3 bg-blue-50/30 border border-blue-100 rounded-lg animate-in fade-in slide-in-from-top-2 duration-200">
              <div>
                <label className="block text-[10px] font-bold text-blue-600 uppercase tracking-wider mb-1">Start Time</label>
                <input 
                  type="datetime-local"
                  required={fixedTime}
                  className="w-full p-2 border border-slate-200 rounded bg-white text-xs font-medium focus:ring-1 focus:ring-blue-500 focus:border-blue-500 focus:outline-none"
                  value={startTime}
                  onChange={(e) => setStartTime(e.target.value)}
                />
              </div>
              <div>
                <label className="block text-[10px] font-bold text-blue-600 uppercase tracking-wider mb-1">End Time</label>
                <input 
                  type="datetime-local"
                  required={fixedTime}
                  className="w-full p-2 border border-slate-200 rounded bg-white text-xs font-medium focus:ring-1 focus:ring-blue-500 focus:border-blue-500 focus:outline-none"
                  value={endTime}
                  onChange={(e) => setEndTime(e.target.value)}
                />
              </div>
            </div>
          )}

          {/* Overwrite Toggle */}
          <div className="flex items-center justify-between bg-white border border-slate-200 p-2.5 rounded-lg shadow-sm">
            <div className="flex items-center gap-2">
              <div className={`p-1.5 rounded-md ${isOverwrite ? 'bg-amber-100 text-amber-600' : 'bg-slate-100 text-slate-500'}`}>
                <AlertTriangle size={14} />
              </div>
              <div>
                <p className="text-xs font-semibold text-slate-800 leading-none font-medium">Overwrite Calendar</p>
                <p className="text-[10px] text-slate-500 mt-0.5">Wipes existing tasks first.</p>
              </div>
            </div>
            <label className="relative inline-flex items-center cursor-pointer">
              <input 
                type="checkbox" 
                className="sr-only peer" 
                checked={isOverwrite}
                onChange={(e) => setIsOverwrite(e.target.checked)}
              />
              <div className="w-9 h-5 bg-slate-200 peer-focus:outline-none rounded-full peer peer-checked:after:translate-x-full peer-checked:after:border-white after:content-[''] after:absolute after:top-[2px] after:left-[2px] after:bg-white after:border-slate-300 after:border after:rounded-full after:h-4 after:w-4 after:transition-all peer-checked:bg-amber-500"></div>
            </label>
          </div>

          {/* Submit Button */}
          <button
            type="submit"
            disabled={isLoading || !taskName.trim()}
            className={`w-full py-2.5 text-sm font-semibold rounded-lg transition-all shadow-md flex items-center justify-center gap-2 group ${
              isLoading || !taskName.trim()
                ? "bg-slate-200 cursor-not-allowed text-slate-400 shadow-none"
                : "bg-slate-900 hover:bg-slate-800 hover:shadow-lg text-white"
            }`}
          >
            {isLoading ? "Scheduling..." : "Schedule Task"}
            {isLoading ? (
              <Loader2 size={16} className="animate-spin text-slate-400" />
            ) : (
              <PlusCircle size={16} className="text-emerald-400 group-hover:rotate-90 transition-transform" />
            )}
          </button>
        </form>
      )}
    </div>
  );
}
