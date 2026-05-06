"use client";

import React from "react";
import { Upload, Link as LinkIcon, Sparkles, Loader2 } from "lucide-react";
import useScheduleStore from "../../store/useScheduleStore";

export default function MultimodalInput() {
  const textInput = useScheduleStore((state) => state.textInput);
  const setTextInput = useScheduleStore((state) => state.setTextInput);
  const generateSchedule = useScheduleStore((state) => state.generateSchedule);
  const isLoading = useScheduleStore((state) => state.isLoading);

  return (
    <div className="bg-white rounded-xl border border-slate-200 shadow-sm overflow-hidden flex flex-col">
      <div className="p-4 border-b border-slate-100 bg-slate-50 flex justify-between items-center shrink-0">
        <h3 className="font-semibold text-slate-800 flex items-center gap-2">
          1. Context (Brain)
        </h3>
        <span className="text-[10px] font-bold uppercase tracking-wider px-2 py-1 bg-emerald-100/50 text-emerald-700 rounded border border-emerald-200/50">
          Gemini 1.5 Flash
        </span>
      </div>
      <div className="p-4 flex-1 overflow-y-auto">
        <textarea 
          className="w-full min-h-[140px] p-3 border border-slate-200 rounded-lg text-sm text-slate-700 placeholder:text-slate-400 focus:outline-none focus:ring-2 focus:ring-emerald-500/20 focus:border-emerald-500 transition-all resize-none shadow-inner bg-slate-50/50"
          placeholder="Paste your syllabus, link to a Google Doc, or describe your project goals..."
          value={textInput}
          onChange={(e) => setTextInput(e.target.value)}
        />
        
        {/* Suggestion Chips */}
        <div className="mt-3 flex gap-2 overflow-x-auto pb-1 no-scrollbar">
          <button className="shrink-0 px-3 py-1.5 bg-slate-100 hover:bg-emerald-50 hover:text-emerald-700 text-slate-600 text-xs rounded-full transition-colors border border-transparent hover:border-emerald-200 font-medium">
            Draft Study Plan
          </button>
          <button className="shrink-0 px-3 py-1.5 bg-slate-100 hover:bg-emerald-50 hover:text-emerald-700 text-slate-600 text-xs rounded-full transition-colors border border-transparent hover:border-emerald-200 font-medium">
            Schedule 1hr Focus
          </button>
          <button className="shrink-0 px-3 py-1.5 bg-slate-100 hover:bg-emerald-50 hover:text-emerald-700 text-slate-600 text-xs rounded-full transition-colors border border-transparent hover:border-emerald-200 font-medium">
            Break down Canvas Link
          </button>
        </div>

        <div className="flex items-center justify-between mt-5 pt-4 border-t border-slate-100">
          <div className="flex items-center gap-1">
            <button className="p-2 text-slate-500 hover:text-emerald-600 hover:bg-emerald-50 rounded-lg transition-colors group relative" title="Upload File">
              <Upload size={16} />
            </button>
            <button className="p-2 text-slate-500 hover:text-emerald-600 hover:bg-emerald-50 rounded-lg transition-colors group relative" title="Attach Link">
              <LinkIcon size={16} />
            </button>
          </div>
          <button
            onClick={() => generateSchedule("ws_8f92a")}
            disabled={isLoading}
            className={`px-5 py-2.5 text-sm font-semibold rounded-lg transition-all shadow-md flex items-center gap-2 group ${
              isLoading
                ? "bg-slate-400 cursor-not-allowed text-slate-200"
                : "bg-slate-900 hover:bg-slate-800 hover:shadow-lg text-white"
            }`}
          >
            {isLoading ? "Analyzing..." : "Analyze"}
            {isLoading ? (
              <Loader2 size={16} className="animate-spin text-slate-300" />
            ) : (
              <Sparkles size={16} className="text-emerald-400 group-hover:animate-pulse" />
            )}
          </button>
        </div>
      </div>
    </div>
  );
}
