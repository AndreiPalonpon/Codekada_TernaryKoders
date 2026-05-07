"use client";

import React, { useState, useRef, useEffect, useMemo } from "react";
import FullCalendar from "@fullcalendar/react";
import timeGridPlugin from "@fullcalendar/timegrid";
import dayGridPlugin from "@fullcalendar/daygrid";
import { Filter, Download, X, RefreshCw } from "lucide-react";
import EventDetailsModal from "./EventDetailsModal";
import useScheduleStore from "../../store/useScheduleStore";
import ConfirmationModal from "../ui/ConfirmationModal";

export default function CalendarView() {
  const rawEvents = useScheduleStore((state) => state.events);
  const activeFilter = useScheduleStore((state) => state.activeFilter);

  const events = useMemo(() => {
    if (!activeFilter) return rawEvents;
    return rawEvents.filter(
      (e) => e.extendedProps?.cognitive_load === activeFilter
    );
  }, [rawEvents, activeFilter]);
  const setFilter = useScheduleStore((state) => state.setFilter);
  const clearSchedule = useScheduleStore((state) => state.clearSchedule);
  const syncGoogleCalendarBusy = useScheduleStore((state) => state.syncGoogleCalendarBusy);
  const isSyncingGoogleCalendar = useScheduleStore((state) => state.isSyncingGoogleCalendar);

  const [selectedEvent, setSelectedEvent] = useState(null);
  const [isFilterOpen, setIsFilterOpen] = useState(false);
  const [isClearModalOpen, setIsClearModalOpen] = useState(false);
  const calendarRef = useRef(null);
  const wrapperRef = useRef(null);

  // Auto-resize FullCalendar when layout/sidebar changes
  useEffect(() => {
    if (!wrapperRef.current) return;
    const resizeObserver = new ResizeObserver(() => {
      setTimeout(() => {
        if (calendarRef.current) calendarRef.current.getApi().updateSize();
      }, 10);
    });
    resizeObserver.observe(wrapperRef.current);
    return () => resizeObserver.disconnect();
  }, []);

  const handleEventClick = (clickInfo) => {
    setSelectedEvent(clickInfo.event);
  };

  const closePopup = () => setSelectedEvent(null);

  const handleGoogleCalendarSync = async () => {
    const result = await syncGoogleCalendarBusy();

    if (!result.success) {
      alert(result.error?.message || "Google Calendar sync failed.");
      return;
    }

    if (result.busyCount === 0) {
      alert("Google Calendar connected, but no busy blocks were found in the next 7 days.");
    }
  };

  /**
   * Exports the current calendar events as a downloadable JSON file.
   */
  const handleExport = () => {
    const exportData = events.map((e) => ({
      title: e.title,
      start: e.start,
      end: e.end,
      cognitive_load: e.extendedProps?.cognitive_load,
      assigned_to: e.extendedProps?.assigned_to,
    }));

    const blob = new Blob([JSON.stringify(exportData, null, 2)], {
      type: "application/json",
    });
    const url = URL.createObjectURL(blob);
    const link = document.createElement("a");
    link.href = url;
    link.download = `syncforge_schedule_${new Date().toISOString().slice(0, 10)}.json`;
    link.click();
    URL.revokeObjectURL(url);
  };

  const FILTER_OPTIONS = [
    { label: "All Tasks", value: null },
    { label: "High Load", value: "High" },
    { label: "Medium Load", value: "Medium" },
    { label: "Low Load", value: "Low" },
  ];

  return (
    <div className="bg-white rounded-xl border border-slate-200 shadow-sm overflow-hidden h-full flex flex-col relative w-full">
      {/* Calendar Header Toolbar */}
      <div className="p-4 border-b border-slate-100 flex justify-between items-center shrink-0 w-full bg-slate-50/50">
        <div>
          <h3 className="font-semibold text-slate-800 text-lg">Schedule Dashboard</h3>
          {events.length > 0 && (
            <p className="text-xs text-slate-500 mt-0.5">
              {events.length} task{events.length !== 1 ? "s" : ""} scheduled
            </p>
          )}
        </div>
        <div className="flex gap-3">
          {/* Filter Dropdown */}
          <div className="relative">
            <button
              onClick={() => setIsFilterOpen(!isFilterOpen)}
              className={`px-3 py-1.5 text-xs font-medium border rounded transition-colors shadow-sm flex items-center gap-1.5 ${
                activeFilter
                  ? "text-emerald-700 bg-emerald-50 border-emerald-200"
                  : "text-slate-600 bg-white border-slate-200 hover:bg-slate-50"
              }`}
            >
              <Filter size={14} />
              {activeFilter ? activeFilter : "Filter"}
            </button>
            {isFilterOpen && (
              <>
                <div className="fixed inset-0 z-40" onClick={() => setIsFilterOpen(false)} />
                <div className="absolute top-full right-0 mt-1 w-40 bg-white rounded-lg shadow-xl border border-slate-200 py-1 z-50">
                  {FILTER_OPTIONS.map((opt) => (
                    <button
                      key={opt.label}
                      onClick={() => { setFilter(opt.value); setIsFilterOpen(false); }}
                      className={`w-full text-left px-3 py-2 text-sm transition-colors ${
                        activeFilter === opt.value
                          ? "bg-emerald-50 text-emerald-700 font-semibold"
                          : "text-slate-700 hover:bg-slate-50"
                      }`}
                    >
                      {opt.label}
                    </button>
                  ))}
                </div>
              </>
            )}
          </div>

          {/* Export */}
          <button
            onClick={handleExport}
            disabled={events.length === 0}
            className="px-3 py-1.5 text-xs font-medium text-slate-600 bg-white border border-slate-200 hover:bg-slate-50 rounded transition-colors shadow-sm flex items-center gap-1.5 disabled:opacity-40 disabled:cursor-not-allowed"
          >
            <Download size={14} /> Export
          </button>

          {/* Clear Schedule */}
          {events.length > 0 && (
            <button
              onClick={() => setIsClearModalOpen(true)}
              className="px-3 py-1.5 text-xs font-medium text-red-600 bg-red-50 border border-red-100 hover:bg-red-100 rounded transition-colors shadow-sm flex items-center gap-1.5"
            >
              <X size={14} /> Clear
            </button>
          )}

          <div className="w-px h-6 bg-slate-200 mx-1"></div>

          {/* Sync Google Calendar busy blocks into the visible schedule. */}
          <button
            onClick={handleGoogleCalendarSync}
            disabled={isSyncingGoogleCalendar}
            className="px-3 py-1.5 text-xs font-medium text-emerald-700 bg-emerald-50 border border-emerald-100 hover:bg-emerald-100 rounded transition-colors shadow-sm flex items-center gap-1.5 disabled:opacity-50 disabled:cursor-wait"
          >
            <RefreshCw size={14} className={isSyncingGoogleCalendar ? "animate-spin" : ""} />
            {isSyncingGoogleCalendar ? "Syncing..." : "Sync Google Cal"}
          </button>
        </div>
      </div>
      
      {/* Calendar Grid Area */}
      <div ref={wrapperRef} className="flex-1 p-4 overflow-hidden relative custom-calendar-wrapper w-full">
        {events.length === 0 ? (
          /* Empty state when no events are present */
          <div className="w-full h-full flex flex-col items-center justify-center text-center">
            <div className="w-16 h-16 rounded-full bg-slate-100 flex items-center justify-center mb-4">
              <svg xmlns="http://www.w3.org/2000/svg" width="32" height="32" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.5" strokeLinecap="round" strokeLinejoin="round" className="text-slate-400">
                <rect x="3" y="4" width="18" height="18" rx="2" ry="2"/><line x1="16" y1="2" x2="16" y2="6"/><line x1="8" y1="2" x2="8" y2="6"/><line x1="3" y1="10" x2="21" y2="10"/>
              </svg>
            </div>
            <h4 className="text-lg font-bold text-slate-700 mb-1">No tasks scheduled yet</h4>
            <p className="text-sm text-slate-500 max-w-xs">
              Use the AI Assistant panel to describe your tasks, then hit <strong>Analyze</strong> to generate your schedule.
            </p>
          </div>
        ) : (
          <FullCalendar
            ref={calendarRef}
            plugins={[timeGridPlugin, dayGridPlugin]}
            initialView="timeGridWeek"
            headerToolbar={{
              left: "prev,next today",
              center: "title",
              right: "dayGridMonth,timeGridWeek,timeGridDay"
            }}
            events={events}
            allDaySlot={false}
            slotMinTime="07:00:00"
            slotMaxTime="20:00:00"
            height="100%"
            eventClassNames="rounded-sm shadow-sm border text-xs p-1 cursor-pointer hover:opacity-90 transition-opacity font-medium"
            eventClick={handleEventClick}
            dayMaxEvents={3} 
          />
        )}
      </div>

      {/* Extracted Event Modal Component */}
      <EventDetailsModal event={selectedEvent} onClose={closePopup} />

      <ConfirmationModal 
        isOpen={isClearModalOpen}
        onClose={() => setIsClearModalOpen(false)}
        onConfirm={clearSchedule}
        title="Clear Schedule?"
        description="Are you sure you want to modify your current calendar? All scheduled tasks will be wiped."
        confirmText="Clear All"
        cancelText="Cancel"
        isDestructive={true}
      />
    </div>
  );
}
