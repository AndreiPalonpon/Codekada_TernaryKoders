"use client";

import React, { useState } from "react";
import { X, Settings2, Clock, CalendarDays, Zap } from "lucide-react";
import useScheduleStore from "../../store/useScheduleStore";

export default function SettingsModal({ onClose }) {
  const userPreferences = useScheduleStore((state) => state.userPreferences);
  const updatePreferences = useScheduleStore((state) => state.updatePreferences);

  // Local state for edits
  const [excludeTimes, setExcludeTimes] = useState(userPreferences.exclude_times.join(", "));
  const [excludeDays, setExcludeDays] = useState(userPreferences.exclude_days);
  const [forceSplitTasks, setForceSplitTasks] = useState(userPreferences.force_split_tasks);

  const daysOfWeek = ["Monday", "Tuesday", "Wednesday", "Thursday", "Friday", "Saturday", "Sunday"];

  const handleDayToggle = (day) => {
    setExcludeDays((prev) => 
      prev.includes(day) ? prev.filter(d => d !== day) : [...prev, day]
    );
  };

  const handleSave = () => {
    const rawTimes = excludeTimes.split(",").map(t => t.trim()).filter(Boolean);
    const validTimes = [];
    
    for (const t of rawTimes) {
      const match = t.match(/^(\d{1,2}):(\d{2})\s*-\s*(\d{1,2}):(\d{2})$/);
      if (match) {
        const [_, h1, m1, h2, m2] = match;
        const start = `${h1.padStart(2, '0')}:${m1}`;
        const end = `${h2.padStart(2, '0')}:${m2}`;
        validTimes.push(`${start}-${end}`);
      } else {
        alert(`Invalid time format: "${t}". Please use 24-hour HH:MM-HH:MM format (e.g. 13:00-14:00).`);
        return; // Stop save if invalid
      }
    }

    updatePreferences({
      exclude_times: validTimes,
      exclude_days: excludeDays,
      force_split_tasks: forceSplitTasks
    });
    onClose();
  };

  return (
    <div className="fixed inset-0 bg-slate-900/60 backdrop-blur-sm z-[100] flex items-center justify-center p-4 transition-all duration-200" onClick={onClose}>
      <div 
        className="bg-white rounded-xl shadow-2xl w-full max-w-md border border-slate-200 overflow-hidden flex flex-col max-h-[85vh] transform transition-all scale-100 animate-in zoom-in-95" 
        onClick={(e) => e.stopPropagation()}
      >
        {/* Header */}
        <div className="p-5 border-b border-slate-100 flex justify-between items-center bg-slate-50 relative">
          <div className="absolute top-0 left-0 w-full h-1 bg-emerald-500"></div>
          <div className="flex items-center gap-2">
            <Settings2 className="text-emerald-600" size={20} />
            <h4 className="font-bold text-slate-900 text-lg">User Preferences</h4>
          </div>
          <button onClick={onClose} className="text-slate-400 hover:text-slate-700 bg-white border border-slate-200 shadow-sm rounded-full p-1.5 transition-colors">
            <X size={16} />
          </button>
        </div>
        
        {/* Body */}
        <div className="p-6 overflow-y-auto space-y-6 flex-1">
          
          {/* Exclude Specific Times */}
          <div>
            <label className="text-sm font-bold text-slate-800 flex items-center gap-2 mb-2">
              <Clock size={16} className="text-emerald-600" />
              Exclude Specific Times
            </label>
            <p className="text-xs text-slate-500 mb-2">Enter time ranges to avoid scheduling (e.g., "12:00-13:00, 18:00-19:00").</p>
            <input 
              type="text" 
              value={excludeTimes}
              onChange={(e) => setExcludeTimes(e.target.value)}
              placeholder="HH:MM-HH:MM"
              className="w-full px-3 py-2 border border-slate-200 rounded-lg text-sm focus:outline-none focus:border-emerald-500 focus:ring-1 focus:ring-emerald-500"
            />
          </div>

          {/* Exclude Specific Days */}
          <div>
            <label className="text-sm font-bold text-slate-800 flex items-center gap-2 mb-2">
              <CalendarDays size={16} className="text-emerald-600" />
              Exclude Specific Days
            </label>
            <p className="text-xs text-slate-500 mb-3">Select days you do not want any tasks scheduled.</p>
            <div className="grid grid-cols-2 gap-2">
              {daysOfWeek.map((day) => (
                <label key={day} className="flex items-center gap-2 text-sm text-slate-700 cursor-pointer p-2 rounded-md hover:bg-slate-50 border border-transparent hover:border-slate-200">
                  <input 
                    type="checkbox" 
                    checked={excludeDays.includes(day)}
                    onChange={() => handleDayToggle(day)}
                    className="rounded text-emerald-600 focus:ring-emerald-500 w-4 h-4"
                  />
                  {day}
                </label>
              ))}
            </div>
          </div>

          {/* Force Split Tasks */}
          <div className="pt-2 border-t border-slate-100">
            <div className="flex items-center justify-between">
              <div>
                <label className="text-sm font-bold text-slate-800 flex items-center gap-2">
                  <Zap size={16} className="text-emerald-600" />
                  Force Split Tasks
                </label>
                <p className="text-xs text-slate-500 mt-1 max-w-[250px]">
                  Override AI logic and strictly enforce the max deep work block limit on all tasks.
                </p>
              </div>
              <label className="relative inline-flex items-center cursor-pointer">
                <input 
                  type="checkbox" 
                  className="sr-only peer" 
                  checked={forceSplitTasks}
                  onChange={(e) => setForceSplitTasks(e.target.checked)}
                />
                <div className="w-11 h-6 bg-slate-200 peer-focus:outline-none rounded-full peer peer-checked:after:translate-x-full peer-checked:after:border-white after:content-[''] after:absolute after:top-[2px] after:left-[2px] after:bg-white after:border-slate-300 after:border after:rounded-full after:h-5 after:w-5 after:transition-all peer-checked:bg-emerald-600"></div>
              </label>
            </div>
          </div>

        </div>
        
        {/* Footer */}
        <div className="p-4 bg-slate-50 border-t border-slate-200 flex justify-end gap-2 shrink-0">
          <button
            onClick={onClose}
            className="px-4 py-2 text-sm font-medium text-slate-700 bg-white border border-slate-200 hover:bg-slate-50 shadow-sm rounded-lg transition-colors"
          >
            Cancel
          </button>
          <button
            onClick={handleSave}
            className="px-4 py-2 text-sm font-medium text-white bg-emerald-600 hover:bg-emerald-700 shadow-md shadow-emerald-600/20 rounded-lg transition-colors"
          >
            Save Preferences
          </button>
        </div>
      </div>
    </div>
  );
}
