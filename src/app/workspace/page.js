"use client";

import React, { useState, useEffect } from "react";
import WorkspaceLayout from "@/components/workspaces/WorkspaceLayout";
import MultimodalInput from "@/components/workspaces/MultimodalInput";
import ManualTaskInput from "@/components/workspaces/ManualTaskInput";
import TaskBreakdown from "@/components/workspaces/TaskBreakdown";
import useWorkspaceStore from "@/store/useWorkspaceStore";
import useScheduleStore from "@/store/useScheduleStore";
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
  const [expandedSection, setExpandedSection] = useState("input"); // "input" or "breakdown"
  const [activeInput, setActiveInput] = useState("ai"); // "ai" or "manual"

  const activeWorkspaceId = useWorkspaceStore((state) => state.activeWorkspaceId);
  const loadSchedule = useScheduleStore((state) => state.loadSchedule);
  const isLoading = useScheduleStore((state) => state.isLoading);

  useEffect(() => {
    if (activeWorkspaceId) {
      loadSchedule(activeWorkspaceId);
    }
  }, [activeWorkspaceId, loadSchedule]);

  return (
    <WorkspaceLayout>
      <div className="flex h-full gap-6 relative">
        {isLoading && (
          <div className="absolute inset-0 bg-slate-900/40 backdrop-blur-[2px] z-50 flex items-center justify-center rounded-xl animate-in fade-in duration-200">
            <div className="bg-white/95 backdrop-blur-md border border-slate-200 rounded-2xl p-6 shadow-2xl flex flex-col items-center gap-4 max-w-sm text-center">
              <div className="relative w-12 h-12">
                <div className="absolute inset-0 border-4 border-emerald-100 rounded-full"></div>
                <div className="absolute inset-0 border-4 border-emerald-600 border-t-transparent rounded-full animate-spin"></div>
              </div>
              <div>
                <h4 className="font-bold text-slate-800 text-sm">Synchronizing Workspace</h4>
                <p className="text-xs text-slate-500 mt-1 font-semibold">Calibrating calendar slots & schedule blocks...</p>
              </div>
            </div>
          </div>
        )}
        
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
            <div className="flex-1 flex flex-col gap-4 overflow-hidden min-h-0">
              
              {/* Top Segmented Control (only visible when input section is expanded) */}
              {expandedSection === "input" && (
                <div className="flex bg-slate-100 p-1 rounded-lg shrink-0 animate-in fade-in slide-in-from-top-2">
                  <button 
                    onClick={() => setActiveInput("ai")}
                    className={`flex-1 flex items-center justify-center gap-1.5 py-1.5 text-xs font-semibold rounded-md transition-all ${activeInput === "ai" ? "bg-white text-emerald-700 shadow-sm" : "text-slate-600 hover:text-slate-800"}`}
                  >
                    <Bot size={14} />
                    AI Brain
                  </button>
                  <button 
                    onClick={() => setActiveInput("manual")}
                    className={`flex-1 flex items-center justify-center gap-1.5 py-1.5 text-xs font-semibold rounded-md transition-all ${activeInput === "manual" ? "bg-white text-blue-700 shadow-sm" : "text-slate-600 hover:text-slate-800"}`}
                  >
                    <ListChecks size={14} />
                    Manual Form
                  </button>
                </div>
              )}

              {/* Input Modal (AI or Manual) */}
              {activeInput === "ai" ? (
                <MultimodalInput 
                  isExpanded={expandedSection === "input"} 
                  onToggle={() => setExpandedSection(expandedSection === "input" ? null : "input")} 
                />
              ) : (
                <ManualTaskInput 
                  isExpanded={expandedSection === "input"} 
                  onToggle={() => setExpandedSection(expandedSection === "input" ? null : "input")} 
                />
              )}

              {/* Task Breakdown */}
              <TaskBreakdown 
                isExpanded={expandedSection === "breakdown"} 
                onToggle={() => setExpandedSection(expandedSection === "breakdown" ? null : "breakdown")} 
              />
            </div>
          ) : (
            <div className="flex flex-col gap-4 mt-4 w-full items-center">
              <button 
                onClick={() => { setIsRightExpanded(true); setExpandedSection("input"); setActiveInput("ai"); }}
                className={`p-2.5 rounded-lg transition-colors group relative ${expandedSection === "input" && activeInput === "ai" ? "text-emerald-600 bg-emerald-50" : "text-slate-400 hover:text-emerald-600 hover:bg-emerald-50"}`}
                title="AI Brain Input"
              >
                <Bot size={22} />
              </button>
              <button 
                onClick={() => { setIsRightExpanded(true); setExpandedSection("input"); setActiveInput("manual"); }}
                className={`p-2.5 rounded-lg transition-colors group relative ${expandedSection === "input" && activeInput === "manual" ? "text-blue-600 bg-blue-50" : "text-slate-400 hover:text-blue-600 hover:bg-blue-50"}`}
                title="Direct Manual Input"
              >
                <ListChecks size={22} />
              </button>
              <button 
                onClick={() => { setIsRightExpanded(true); setExpandedSection("breakdown"); }}
                className={`p-2.5 rounded-lg transition-colors group relative ${expandedSection === "breakdown" ? "text-slate-800 bg-slate-100" : "text-slate-400 hover:text-slate-800 hover:bg-slate-100"}`}
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
