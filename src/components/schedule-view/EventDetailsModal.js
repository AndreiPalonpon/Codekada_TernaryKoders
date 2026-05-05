"use client";

import React from "react";
import { X, CheckCircle, Edit, Trash2, Clock, User, Activity } from "lucide-react";

export default function EventDetailsModal({ event, onClose }) {
  if (!event) return null;

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
        </div>
        
        {/* Footer */}
        <div className="p-4 bg-slate-50 border-t border-slate-200 flex justify-between shrink-0">
          <button className="px-4 py-2 text-sm font-medium text-red-600 hover:bg-red-50 rounded-lg transition-colors flex items-center gap-1.5">
            <Trash2 size={16} /> Delete
          </button>
          <div className="flex gap-2">
            <button className="px-4 py-2 text-sm font-medium text-slate-700 bg-white border border-slate-200 hover:bg-slate-50 shadow-sm rounded-lg transition-colors flex items-center gap-1.5">
              <Edit size={16} /> Edit Task
            </button>
            <button className="px-4 py-2 text-sm font-medium text-white bg-emerald-600 hover:bg-emerald-700 shadow-md shadow-emerald-600/20 rounded-lg transition-colors flex items-center gap-1.5">
              <CheckCircle size={16} /> Complete
            </button>
          </div>
        </div>
      </div>
    </div>
  );
}
