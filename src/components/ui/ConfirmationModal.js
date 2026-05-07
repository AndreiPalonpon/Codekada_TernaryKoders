"use client";

import React from "react";
import { AlertTriangle, X } from "lucide-react";

export default function ConfirmationModal({ 
  isOpen, 
  onClose, 
  onConfirm, 
  title = "Are you sure?", 
  description = "This action cannot be undone. Do you want to proceed?",
  confirmText = "Confirm",
  cancelText = "Cancel",
  isDestructive = true
}) {
  if (!isOpen) return null;

  return (
    <div className="fixed inset-0 bg-slate-900/60 backdrop-blur-sm z-[100] flex items-center justify-center p-4 transition-all duration-200" onClick={onClose}>
      <div 
        className="bg-white rounded-xl shadow-2xl w-full max-w-sm border border-slate-200 overflow-hidden flex flex-col transform transition-all scale-100 animate-in zoom-in-95" 
        onClick={(e) => e.stopPropagation()}
      >
        <div className="p-5 pb-4">
          <div className="flex items-start gap-4">
            <div className={`p-2 rounded-full shrink-0 ${isDestructive ? 'bg-red-100 text-red-600' : 'bg-amber-100 text-amber-600'}`}>
              <AlertTriangle size={20} />
            </div>
            <div>
              <h4 className="font-bold text-slate-900 text-lg leading-tight">{title}</h4>
              <p className="text-sm text-slate-500 font-medium mt-1.5 leading-relaxed">
                {description}
              </p>
            </div>
            <button onClick={onClose} className="absolute top-4 right-4 text-slate-400 hover:text-slate-700 transition-colors">
              <X size={16} />
            </button>
          </div>
        </div>
        
        <div className="p-4 bg-slate-50 border-t border-slate-100 flex justify-end gap-2 shrink-0">
          <button
            onClick={onClose}
            className="px-4 py-2 text-sm font-medium text-slate-700 bg-white border border-slate-200 hover:bg-slate-50 shadow-sm rounded-lg transition-colors"
          >
            {cancelText}
          </button>
          <button
            onClick={() => {
              onConfirm();
              onClose();
            }}
            className={`px-4 py-2 text-sm font-medium text-white shadow-md rounded-lg transition-colors ${
              isDestructive 
                ? 'bg-red-600 hover:bg-red-700 shadow-red-600/20' 
                : 'bg-emerald-600 hover:bg-emerald-700 shadow-emerald-600/20'
            }`}
          >
            {confirmText}
          </button>
        </div>
      </div>
    </div>
  );
}
