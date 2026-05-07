"use client";

import React, { useEffect, useState } from "react";
import { X, CheckCircle, Edit, Trash2, Clock, User, Activity, AlarmClock, CalendarPlus } from "lucide-react";
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
  const addEventToGoogleCalendar = useScheduleStore((state) => state.addEventToGoogleCalendar);
  const isRecalculating = useScheduleStore((state) => state.isRecalculating);
  const isWritingGoogleCalendar = useScheduleStore((state) => state.isWritingGoogleCalendar);

  const [snoozeOption, setSnoozeOption] = useState("30"); // "15", "30", "45", "60", "120", "240", "custom"
  const [customSnoozeValue, setCustomSnoozeValue] = useState(15);
  const [customSnoozeUnit, setCustomSnoozeUnit] = useState("minutes"); // "minutes" | "hours"
  const [snoozeReason, setSnoozeReason] = useState("");
  const [createdGoogleEvent, setCreatedGoogleEvent] = useState(null);

  const effectiveSnoozeMinutes = React.useMemo(() => {
    if (snoozeOption === "custom") {
      const val = Number(customSnoozeValue) || 0;
      return customSnoozeUnit === "hours" ? val * 60 : val;
    }
    return Number(snoozeOption) || 30;
  }, [snoozeOption, customSnoozeValue, customSnoozeUnit]);

  useEffect(() => {
    setCreatedGoogleEvent(null);
    setSnoozeOption("30");
    setCustomSnoozeValue(15);
    setCustomSnoozeUnit("minutes");
    setSnoozeReason("");
  }, [event?.id]);

  if (!event) return null;

  const isReadOnly = event.extendedProps?.readOnly;
  const isExportedToGoogleCalendar = Boolean(
    event.extendedProps?.google_event_id || createdGoogleEvent?.id
  );

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
    snoozeTask(event.id, effectiveSnoozeMinutes, snoozeReason);
    onClose();
  };

  const handleAddToGoogleCalendar = async () => {
    if (isReadOnly || isExportedToGoogleCalendar) return;

    const result = await addEventToGoogleCalendar(event);
    if (!result.success) {
      alert(result.error?.message || "Failed to add event to Google Calendar.");
      return;
    }

    setCreatedGoogleEvent(result.event);
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
            <div className="bg-amber-50/50 border border-amber-200 rounded-xl p-5 shadow-sm space-y-4">
              <div className="flex items-center justify-between">
                <p className="text-xs text-amber-800 uppercase font-bold tracking-wider flex items-center gap-1.5">
                  <AlarmClock size={15} className="text-amber-600" /> Advanced Snooze Postponement
                </p>
                {event.start && (
                  <span className="text-[11px] font-semibold text-amber-700 bg-amber-100/60 px-2 py-0.5 rounded-full">
                    Est. New Time: {new Date(new Date(event.start).getTime() + effectiveSnoozeMinutes * 60000).toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' })}
                  </span>
                )}
              </div>
              
              <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
                <div className="space-y-1">
                  <label className="text-[11px] font-bold text-amber-900/60 uppercase">Delay Duration</label>
                  <select
                    value={snoozeOption}
                    onChange={(e) => setSnoozeOption(e.target.value)}
                    className="w-full text-sm px-3 py-2 border border-amber-200 rounded-lg bg-white font-medium text-slate-800 focus:outline-none focus:ring-2 focus:ring-amber-500/20 focus:border-amber-400 transition-all shadow-sm"
                  >
                    <option value="15">15 minutes</option>
                    <option value="30">30 minutes</option>
                    <option value="45">45 minutes</option>
                    <option value="60">1 hour</option>
                    <option value="120">2 hours</option>
                    <option value="240">4 hours</option>
                    <option value="custom">Custom Duration...</option>
                  </select>
                </div>

                <div className="space-y-1">
                  <label className="text-[11px] font-bold text-amber-900/60 uppercase">Postponement Reason</label>
                  <input
                    type="text"
                    value={snoozeReason}
                    onChange={(e) => setSnoozeReason(e.target.value)}
                    placeholder="e.g. coffee break, waiting on code review"
                    className="w-full text-sm px-3 py-2 border border-amber-200 rounded-lg bg-white placeholder-amber-900/40 focus:outline-none focus:ring-2 focus:ring-amber-500/20 focus:border-amber-400 transition-all shadow-sm"
                  />
                </div>
              </div>

              {snoozeOption === "custom" && (
                <div className="p-3 bg-amber-100/40 border border-amber-200/50 rounded-lg flex items-center gap-3 animate-in slide-in-from-top-1 fade-in duration-150">
                  <span className="text-xs font-bold text-amber-800">Snooze for:</span>
                  <input
                    type="number"
                    min="1"
                    value={customSnoozeValue}
                    onChange={(e) => setCustomSnoozeValue(Math.max(1, parseInt(e.target.value) || 1))}
                    className="w-20 text-sm px-2 py-1 border border-amber-200 rounded-md bg-white text-center focus:outline-none focus:ring-2 focus:ring-amber-500/20"
                  />
                  <select
                    value={customSnoozeUnit}
                    onChange={(e) => setCustomSnoozeUnit(e.target.value)}
                    className="text-xs px-2 py-1 border border-amber-200 rounded-md bg-white focus:outline-none focus:ring-2 focus:ring-amber-500/20"
                  >
                    <option value="minutes">Minutes</option>
                    <option value="hours">Hours</option>
                  </select>
                </div>
              )}

              <div className="flex justify-end pt-1">
                <button
                  onClick={handleSnooze}
                  disabled={isRecalculating}
                  className="px-5 py-2 text-sm font-semibold text-white bg-amber-600 hover:bg-amber-700 active:bg-amber-800 rounded-lg shadow-sm shadow-amber-600/10 transition-all disabled:opacity-50 flex items-center gap-2"
                >
                  <AlarmClock size={16} />
                  {isRecalculating ? "Snoozing Task..." : "Delay & Reschedule"}
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
            {!isReadOnly && (
              <button
                onClick={handleAddToGoogleCalendar}
                disabled={isWritingGoogleCalendar || isExportedToGoogleCalendar}
                className="px-4 py-2 text-sm font-medium text-sky-700 bg-sky-50 border border-sky-200 hover:bg-sky-100 shadow-sm rounded-lg transition-colors flex items-center gap-1.5 disabled:opacity-50 disabled:cursor-not-allowed"
              >
                <CalendarPlus size={16} />
                {isWritingGoogleCalendar
                  ? "Syncing..."
                  : isExportedToGoogleCalendar
                    ? "Synced to GCal"
                    : "Sync to GCal"}
              </button>
            )}
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
