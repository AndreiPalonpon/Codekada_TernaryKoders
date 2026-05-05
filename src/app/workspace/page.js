"use client";

import React, { useState } from "react";
import WorkspaceLayout from "@/components/workspaces/WorkspaceLayout";
import MultimodalInput from "@/components/workspaces/MultimodalInput";
import TaskBreakdown from "@/components/workspaces/TaskBreakdown";
import dynamic from "next/dynamic";

const CalendarView = dynamic(() => import("@/components/schedule-view/CalendarView"), {
  ssr: false,
  loading: () => (
    <div className="w-full h-full flex items-center justify-center bg-slate-50 border border-slate-200 rounded-xl shadow-sm">
      <div className="flex flex-col items-center gap-4">
        <div className="w-10 h-10 border-4 border-emerald-500/20 border-t-emerald-600 rounded-full animate-spin"></div>
        <p className="text-sm font-semibold text-slate-500 animate-pulse">Loading Schedule Engine...</p>
      </div>
    </div>
  )
});
import { ChevronRight, ChevronLeft, Bot, ListChecks } from "lucide-react";

export default function WorkspacePage() {
  const [isRightExpanded, setIsRightExpanded] = useState(true);

  return (
    <WorkspaceLayout>
      <div className="flex h-full gap-6">
        
        {/* Center Stage: Mathematical Scheduler Visualizer */}
        <div className="flex-1 h-full min-w-0 transition-all duration-300">
          <CalendarView />
        </div>

        {/* Right Sidebar: AI Assistant (Input & Output) */}
        <div className={`shrink-0 h-full flex flex-col bg-white border border-slate-200 rounded-xl shadow-sm transition-all duration-300 ${isRightExpanded ? 'w-[450px] p-4' : 'w-16 py-4 px-2 items-center'}`}>
          <div className={`flex items-center shrink-0 mb-4 ${isRightExpanded ? 'justify-between' : 'justify-center'}`}>
            {isRightExpanded && (
              <h3 className="font-semibold text-slate-800 flex items-center gap-2">
                <Bot size={20} className="text-emerald-600" />
                AI Assistant
              </h3>
            )}
            <button 
              onClick={() => setIsRightExpanded(!isRightExpanded)}
              className="p-1.5 text-slate-400 hover:text-slate-600 hover:bg-slate-100 rounded-md transition-colors"
            >
              {isRightExpanded ? <ChevronRight size={18} /> : <ChevronLeft size={18} />}
            </button>
          </div>
          
          {isRightExpanded ? (
            <div className="flex flex-col gap-6 overflow-y-auto pr-2 pb-4">
              <div className="bg-amber-50 border border-amber-200 rounded-lg p-3 text-xs text-amber-800 shadow-sm">
                <strong>Assistant Panel:</strong> This panel appears when you want to add or modify tasks. It acts like an intelligent chat sidebar.
              </div>
              <MultimodalInput />
              <TaskBreakdown />
            </div>
          ) : (
            <div className="flex flex-col gap-4 mt-4 w-full items-center">
              <button 
                onClick={() => setIsRightExpanded(true)}
                className="p-2.5 text-slate-400 hover:text-emerald-600 hover:bg-emerald-50 rounded-lg transition-colors group relative" 
                title="Open Multimodal Input"
              >
                <Bot size={22} />
              </button>
              <button 
                onClick={() => setIsRightExpanded(true)}
                className="p-2.5 text-slate-400 hover:text-emerald-600 hover:bg-emerald-50 rounded-lg transition-colors group relative" 
                title="View Generated Tasks"
              >
                <ListChecks size={22} />
              </button>
            </div>
          )}
        </div>
        
      </div>
    </WorkspaceLayout>
  );
}
