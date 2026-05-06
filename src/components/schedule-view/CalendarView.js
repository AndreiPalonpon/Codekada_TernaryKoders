"use client";

import React, { useState, useRef, useEffect } from "react";
import FullCalendar from "@fullcalendar/react";
import timeGridPlugin from "@fullcalendar/timegrid";
import dayGridPlugin from "@fullcalendar/daygrid";
import { Filter, Download } from "lucide-react";
import EventDetailsModal from "./EventDetailsModal";
import { dummyEvents as fallbackEvents } from "@/lib/dummyData";
import useScheduleStore from "../../store/useScheduleStore";

export default function CalendarView() {
  const storeEvents = useScheduleStore((state) => state.events);
  const events = storeEvents;
  const [selectedEvent, setSelectedEvent] = useState(null);
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

  return (
    <div className="bg-white rounded-xl border border-slate-200 shadow-sm overflow-hidden h-full flex flex-col relative w-full">
      {/* Calendar Header Toolbar */}
      <div className="p-4 border-b border-slate-100 flex justify-between items-center shrink-0 w-full bg-slate-50/50">
        <div>
          <h3 className="font-semibold text-slate-800 text-lg">Schedule Dashboard</h3>
        </div>
        <div className="flex gap-3">
          <button className="px-3 py-1.5 text-xs font-medium text-slate-600 bg-white border border-slate-200 hover:bg-slate-50 rounded transition-colors shadow-sm flex items-center gap-1.5">
            <Filter size={14} /> Filter
          </button>
          <button className="px-3 py-1.5 text-xs font-medium text-slate-600 bg-white border border-slate-200 hover:bg-slate-50 rounded transition-colors shadow-sm flex items-center gap-1.5">
            <Download size={14} /> Export
          </button>
          <div className="w-px h-6 bg-slate-200 mx-1"></div>
          <button className="px-3 py-1.5 text-xs font-medium text-emerald-700 bg-emerald-50 border border-emerald-100 hover:bg-emerald-100 rounded transition-colors shadow-sm">
            Sync to Google Cal
          </button>
        </div>
      </div>
      
      {/* Calendar Grid Area */}
      <div ref={wrapperRef} className="flex-1 p-4 overflow-hidden relative custom-calendar-wrapper w-full">
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
      </div>

      {/* Extracted Event Modal Component */}
      <EventDetailsModal event={selectedEvent} onClose={closePopup} />
    </div>
  );
}
