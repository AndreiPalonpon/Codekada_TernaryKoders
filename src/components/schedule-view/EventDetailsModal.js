"use client";

import React, { useState } from "react";
import { X, CheckCircle, Edit, Trash2, Clock, User, Activity, AlarmClock } from "lucide-react";
import useScheduleStore from "../../store/useScheduleStore";

/**
 * EventDetailsModal
 *
 * Popup displayed when a user clicks on a FullCalendar event.
 * Provides task details and action buttons (Complete, Delete, Snooze)
 * that are wired to the Zustand store for instant UI updates.
 */
export default function EventDetailsModal({ event, onClose }) {
  const markTaskComplete = useScheduleStore((state) => state.markTaskComplete);
  const deleteTask = useScheduleStore((state) => state.deleteTask);
  const snoozeTask = useScheduleStore((state) => state.snoozeTask);
  const isRecalculating = useScheduleStore((state) => state.isRecalculating);

  const [snoozeMinutes, setSnoozeMinutes] = useState(30);

  if (!event) return null;

  const isReadOnly = event.extendedProps?.readOnly;

  const handleComplete = () => {
    if (isReadOnly) return;
    markTaskComplete(event.id);
    onClose();
  };

  const handleDelete = () => {
    if (isReadOnly) return;
    deleteTask(event.id);
    onClose();
  };

  const handleSnooze = () => {
    if (isReadOnly) return;
    snoozeTask(event.id, snoozeMinutes);
    onClose();
  };

  return (
    <div className="fixed inset-0 bg-slate-900/60 backdrop-blur-sm z-[100] flex items-center justify-center p-4 transition-all duration-200" onClick={onClose}>
      <div 
        className="bg-white rounded-xl shadow-2xl w-full max-w-xl border border-slate-200 overflow-hidden flex flex-col max-h-[85vh] transform transition-all scale-100 animate-in zoom-in-95" 
        onClick={(e) => e.stopPropagation()}
      >
        {/* Header */}
        <div className="p-5 border-b border-slate-100 flex justify-between items-start bg-slate-50 relative">
          <div className="absolute top-0 left-0 w-full h-1" style={{ backgroundColor: event.backgroundColor }}></div>
          <div>
            <h4 className="font-bold text-slate-900 text-xl pr-4 leading-tight">{event.title}</h4>
            <p className="text-sm text-slate-500 font-medium mt-1">
              {event.start?.toLocaleDateString(undefined, { weekday: 'long', month: 'short', day: 'numeric' })}
            </p>
          </div>
          <button onClick={onClose} className="text-slate-400 hover:text-slate-700 bg-white border border-slate-200 shadow-sm rounded-full p-1.5 transition-colors">
            <X size={16} />
          </button>
        </div>
        
        {/* Body */}
        <div className="p-6 overflow-y-auto space-y-6 flex-1">
          <div className="flex gap-6 items-center">
            <div className="flex items-center gap-2 text-slate-700 bg-slate-50 px-3 py-2 rounded-lg border border-slate-100">
              <Clock size={16} className="text-emerald-600" />
              <span className="text-sm font-semibold">
                {event.start?.toLocaleTimeString([], {hour: '2-digit', minute:'2-digit'})} - {event.end?.toLocaleTimeString([], {hour: '2-digit', minute:'2-digit'})}
              </span>
            </div>
          </div>

          {event.extendedProps?.description && (
            <div>
              <p className="text-xs text-slate-400 uppercase font-bold tracking-wider mb-2">Description / Context</p>
              <div 
                className="text-sm text-slate-700 leading-relaxed bg-white border border-slate-100 rounded-lg p-5 shadow-inner prose prose-sm max-w-none"
                dangerouslySetInnerHTML={{ __html: event.extendedProps.description }}
              />
            </div>
          )}
          
          <div className="grid grid-cols-2 gap-4">
            <div className="bg-slate-50 p-4 rounded-lg border border-slate-100">
              <p className="text-xs text-slate-400 uppercase font-bold tracking-wider mb-1.5 flex items-center gap-1.5">
                <Activity size={14} /> Cognitive Load
              </p>
              <span className="inline-flex items-center gap-2 text-sm font-semibold text-slate-700">
                <div className={`w-2 h-2 rounded-full ${event.extendedProps?.cognitive_load?.includes('High') ? 'bg-red-500' : 'bg-emerald-500'}`}></div>
                {event.extendedProps?.cognitive_load || "Normal"}
              </span>
            </div>
            <div className="bg-slate-50 p-4 rounded-lg border border-slate-100">
              <p className="text-xs text-slate-400 uppercase font-bold tracking-wider mb-1.5 flex items-center gap-1.5">
                <User size={14} /> Assignee
              </p>
              <div className="flex items-center gap-2">
                <div className="w-7 h-7 rounded-full bg-slate-200 flex items-center justify-center text-[11px] font-bold text-slate-600 shadow-sm border border-white">
                  {event.extendedProps?.assigned_to?.charAt(0) || "U"}
                </div>
                <span className="text-sm font-semibold text-slate-700 truncate">
                  {event.extendedProps?.assigned_to || "Unassigned"}
                </span>
              </div>
            </div>
          </div>

          {!isReadOnly && (
            <div className="bg-amber-50 border border-amber-200 rounded-lg p-4">
              <p className="text-xs text-amber-700 uppercase font-bold tracking-wider mb-2 flex items-center gap-1.5">
                <AlarmClock size={14} /> Snooze Task
              </p>
              <div className="flex items-center gap-3">
                <select
                  value={snoozeMinutes}
                  onChange={(e) => setSnoozeMinutes(Number(e.target.value))}
                  className="text-sm px-3 py-2 border border-amber-200 rounded-lg bg-white focus:outline-none focus:ring-2 focus:ring-amber-500/20 focus:border-amber-400 transition-all"
                >
                  <option value={15}>15 minutes</option>
                  <option value={30}>30 minutes</option>
                  <option value={60}>1 hour</option>
                  <option value={120}>2 hours</option>
                </select>
                <button
                  onClick={handleSnooze}
                  disabled={isRecalculating}
                  className="px-4 py-2 text-sm font-medium text-amber-700 bg-amber-100 hover:bg-amber-200 border border-amber-300 rounded-lg transition-colors disabled:opacity-50"
                >
                  {isRecalculating ? "Snoozing..." : "Snooze"}
                </button>
              </div>
            </div>
          )}
        </div>
        
        {/* Footer */}
        <div className="p-4 bg-slate-50 border-t border-slate-200 flex justify-between shrink-0">
          {!isReadOnly ? (
            <button
              onClick={handleDelete}
              className="px-4 py-2 text-sm font-medium text-red-600 hover:bg-red-50 rounded-lg transition-colors flex items-center gap-1.5"
            >
              <Trash2 size={16} /> Delete
            </button>
          ) : (
            <span className="px-4 py-2 text-sm font-medium text-slate-500">
              Read-only calendar block
            </span>
          )}
          <div className="flex gap-2">
            <button
              onClick={onClose}
              className="px-4 py-2 text-sm font-medium text-slate-700 bg-white border border-slate-200 hover:bg-slate-50 shadow-sm rounded-lg transition-colors flex items-center gap-1.5"
            >
              <Edit size={16} /> Close
            </button>
            {!isReadOnly && (
              <button
                onClick={handleComplete}
                disabled={isRecalculating}
                className="px-4 py-2 text-sm font-medium text-white bg-emerald-600 hover:bg-emerald-700 shadow-md shadow-emerald-600/20 rounded-lg transition-colors flex items-center gap-1.5 disabled:opacity-50"
              >
                <CheckCircle size={16} /> Complete
              </button>
            )}
          </div>
        </div>
      </div>
    </div>
  );
}
