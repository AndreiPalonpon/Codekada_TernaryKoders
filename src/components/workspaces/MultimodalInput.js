"use client";

import React, { useState, useRef } from "react";
import { ChevronDown, ChevronUp, Upload, Link as LinkIcon, Sparkles, Loader2, AlertTriangle, X, FileImage, Link2 } from "lucide-react";
import useScheduleStore from "../../store/useScheduleStore";
import useWorkspaceStore from "../../store/useWorkspaceStore";
import ConfirmationModal from "../ui/ConfirmationModal";

export default function MultimodalInput({ isExpanded = true, onToggle, embedMode = false }) {
  const textInput = useScheduleStore((state) => state.textInput);
  const setTextInput = useScheduleStore((state) => state.setTextInput);
  const attachments = useScheduleStore((state) => state.attachments);
  const addAttachment = useScheduleStore((state) => state.addAttachment);
  const removeAttachment = useScheduleStore((state) => state.removeAttachment);
  const generateSchedule = useScheduleStore((state) => state.generateSchedule);
  const isLoading = useScheduleStore((state) => state.isLoading);
  const events = useScheduleStore((state) => state.events);

  const activeWorkspaceId = useWorkspaceStore((state) => state.activeWorkspaceId);

  const [isOverwrite, setIsOverwrite] = useState(false);
  const [isConfirmOpen, setIsConfirmOpen] = useState(false);
  const fileInputRef = useRef(null);

  const appendPrompt = (promptText) => {
    const nextText = textInput.trim()
      ? `${textInput.trim()}\n\n${promptText}`
      : promptText;
    setTextInput(nextText);
  };

  const handleAnalyze = () => {
    if (isOverwrite && events.length > 0) {
      setIsConfirmOpen(true);
    } else {
      generateSchedule(activeWorkspaceId, isOverwrite);
    }
  };

  const handleFileUpload = (e) => {
    const file = e.target.files[0];
    if (!file) return;

    const reader = new FileReader();
    reader.onload = (event) => {
      addAttachment({
        type: "image_base64",
        content: event.target.result,
        name: file.name
      });
    };
    reader.readAsDataURL(file);
    e.target.value = ''; // Reset input
  };

  const handleAddLink = () => {
    const url = window.prompt("Enter URL to attach:");
    if (url && url.trim()) {
      addAttachment({
        type: "link",
        content: url.trim(),
        name: url.trim()
      });
    }
  };

  const contentMarkup = (
    <div className={embedMode ? "p-4 space-y-4" : "p-4 flex-1 overflow-y-auto"}>
      <textarea 
        className="w-full min-h-[140px] p-3 border border-slate-200 rounded-lg text-sm text-slate-700 placeholder:text-slate-400 focus:outline-none focus:ring-2 focus:ring-emerald-500/20 focus:border-emerald-500 transition-all resize-none shadow-inner bg-slate-50/50"
        placeholder="Paste your syllabus, link to a Google Doc, or describe your project goals..."
        value={textInput}
        onChange={(e) => setTextInput(e.target.value)}
      />
    
    {/* Attachment Display */}
    {attachments.length > 0 && (
      <div className="mt-3 flex flex-wrap gap-2">
        {attachments.map((att, idx) => (
          <div key={idx} className="flex items-center gap-2 bg-emerald-50 border border-emerald-200 text-emerald-700 px-2.5 py-1.5 rounded-lg text-xs font-medium shadow-sm">
            {att.type === "link" ? <Link2 size={14} /> : <FileImage size={14} />}
            <span className="max-w-[150px] truncate">{att.name}</span>
            <button 
              type="button"
              onClick={() => removeAttachment(idx)}
              className="p-0.5 hover:bg-emerald-200 rounded-full transition-colors ml-1"
            >
              <X size={12} />
            </button>
          </div>
        ))}
      </div>
    )}
    
    {/* Suggestion Chips */}
    <div className="mt-3 flex gap-2 overflow-x-auto pb-1 no-scrollbar">
      <button
        type="button"
        onClick={() => appendPrompt("Draft a study plan for my upcoming deadlines. Split large tasks into realistic focus blocks.")}
        className="shrink-0 px-3 py-1.5 bg-slate-100 hover:bg-emerald-50 hover:text-emerald-700 text-slate-600 text-xs rounded-full transition-colors border border-transparent hover:border-emerald-200 font-medium"
      >
        Draft Study Plan
      </button>
      <button
        type="button"
        onClick={() => appendPrompt("Schedule one 60-minute focus session for my highest priority task today.")}
        className="shrink-0 px-3 py-1.5 bg-slate-100 hover:bg-emerald-50 hover:text-emerald-700 text-slate-600 text-xs rounded-full transition-colors border border-transparent hover:border-emerald-200 font-medium"
      >
        Schedule 1hr Focus
      </button>
      <button
        type="button"
        onClick={() => appendPrompt("Break down this class or project link into actionable tasks with durations, priorities, and preferred time windows: ")}
        className="shrink-0 px-3 py-1.5 bg-slate-100 hover:bg-emerald-50 hover:text-emerald-700 text-slate-600 text-xs rounded-full transition-colors border border-transparent hover:border-emerald-200 font-medium"
      >
        Break down Canvas Link
      </button>
    </div>

    {/* Overwrite Toggle */}
    <div className="mt-4 flex items-center justify-between bg-white border border-slate-200 p-2.5 rounded-lg shadow-sm">
      <div className="flex items-center gap-2">
        <div className={`p-1.5 rounded-md ${isOverwrite ? 'bg-amber-100 text-amber-600' : 'bg-slate-100 text-slate-500'}`}>
          <AlertTriangle size={14} />
        </div>
        <div>
          <p className="text-sm font-semibold text-slate-800 leading-none">Overwrite Schedule</p>
          <p className="text-[10px] text-slate-500 mt-0.5">Wipe existing events before generating.</p>
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

    <div className="flex items-center justify-between mt-4 pt-4 border-t border-slate-100">
      <div className="flex items-center gap-1">
        <input 
          type="file" 
          accept="image/*" 
          className="hidden" 
          ref={fileInputRef} 
          onChange={handleFileUpload} 
        />
        <button 
          type="button"
          onClick={() => fileInputRef.current?.click()}
          className="p-2 text-slate-500 hover:text-emerald-600 hover:bg-emerald-50 rounded-lg transition-colors group relative" 
          title="Upload File"
        >
          <Upload size={16} />
        </button>
        <button 
          type="button"
          onClick={handleAddLink}
          className="p-2 text-slate-500 hover:text-emerald-600 hover:bg-emerald-50 rounded-lg transition-colors group relative" 
          title="Attach Link"
        >
          <LinkIcon size={16} />
        </button>
      </div>
      <button
        type="button"
        onClick={handleAnalyze}
        disabled={isLoading || (!textInput.trim() && attachments.length === 0)}
        className={`px-5 py-2.5 text-sm font-semibold rounded-lg transition-all shadow-md flex items-center gap-2 group ${
          isLoading || (!textInput.trim() && attachments.length === 0)
            ? "bg-slate-200 cursor-not-allowed text-slate-400 shadow-none"
            : isOverwrite
              ? "bg-amber-600 hover:bg-amber-700 text-white hover:shadow-lg shadow-amber-600/20"
              : "bg-slate-900 hover:bg-slate-800 hover:shadow-lg text-white"
        }`}
      >
        {isLoading ? "Analyzing..." : "Analyze"}
        {isLoading ? (
          <Loader2 size={16} className="animate-spin text-slate-400" />
        ) : (
          <Sparkles size={16} className={isOverwrite ? "text-amber-200" : "text-emerald-400 group-hover:animate-pulse"} />
        )}
      </button>
    </div>
  </div>
  );

  if (embedMode) {
    return (
      <>
        {contentMarkup}
        <ConfirmationModal 
          isOpen={isConfirmOpen}
          onClose={() => setIsConfirmOpen(false)}
          onConfirm={() => generateSchedule(activeWorkspaceId, isOverwrite)}
          title="Overwrite Schedule?"
          description="You have selected to overwrite your calendar. This will wipe all current scheduled tasks before generating the new ones. Do you want to proceed?"
          confirmText="Overwrite"
          cancelText="Cancel"
          isDestructive={true}
        />
      </>
    );
  }

  return (
    <div className={`bg-white rounded-xl border border-slate-200 shadow-sm overflow-hidden flex flex-col transition-all duration-300 ${!isExpanded ? 'h-14 shrink-0' : 'flex-1 min-h-[300px]'}`}>
      <div 
        onClick={onToggle}
        className={`p-4 border-b border-slate-100 bg-slate-50 flex justify-between items-center shrink-0 cursor-pointer hover:bg-slate-100 transition-colors ${!isExpanded ? 'border-b-0' : ''}`}
      >
        <h3 className="font-semibold text-slate-800 flex items-center gap-2">
          1. Context (Brain)
          {!isExpanded && <span className="text-xs font-normal text-slate-400 ml-2 truncate max-w-[150px]">({textInput.slice(0, 30)}...)</span>}
        </h3>
        <div className="flex items-center gap-3">
          <span className="text-[10px] font-bold uppercase tracking-wider px-2 py-1 bg-emerald-100/50 text-emerald-700 rounded border border-emerald-200/50">
            Gemini 1.5 Flash
          </span>
          {isExpanded ? <ChevronUp size={18} className="text-slate-400" /> : <ChevronDown size={18} className="text-slate-400" />}
        </div>
      </div>
      {isExpanded && contentMarkup}

      <ConfirmationModal 
        isOpen={isConfirmOpen}
        onClose={() => setIsConfirmOpen(false)}
        onConfirm={() => generateSchedule(activeWorkspaceId, isOverwrite)}
        title="Overwrite Schedule?"
        description="You have selected to overwrite your calendar. This will wipe all current scheduled tasks before generating the new ones. Do you want to proceed?"
        confirmText="Overwrite"
        cancelText="Cancel"
        isDestructive={true}
      />
    </div>
  );
}
