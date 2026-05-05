"use client";

import React, { useState } from "react";
import { ChevronLeft, ChevronRight, BarChart2, CheckCircle2, Clock, Settings, LogOut, CreditCard, Moon, MoreVertical } from "lucide-react";
import { dummyEnvironments as fallbackEnvs } from "@/lib/dummyData";
import { FolderKanban, CalendarDays } from "lucide-react";

// Helper to render dynamic icons
const renderIcon = (iconName, props) => {
  if (iconName === "CalendarDays") return <CalendarDays {...props} />;
  return <FolderKanban {...props} />;
};

export default function WorkspaceSidebar({ 
  isExpanded, 
  setIsExpanded, 
  environments = fallbackEnvs,
  // Extensibility props: inject arbitrary components into sidebar regions
  topWidgets = null,
  bottomWidgets = null 
}) {
  const [activeHoverEnv, setActiveHoverEnv] = useState(null);
  const [isProfileMenuOpen, setIsProfileMenuOpen] = useState(false);

  return (
    <aside className={`bg-white border-r border-slate-200 flex flex-col shrink-0 z-20 transition-all duration-300 relative ${isExpanded ? 'w-64' : 'w-16'}`}>
      
      {/* Toggle Button */}
      <button 
        onClick={() => setIsExpanded(!isExpanded)}
        className="absolute -right-3 top-6 bg-white border border-slate-200 text-slate-400 hover:text-slate-600 rounded-full p-0.5 shadow-sm z-30 hover:scale-110 transition-transform"
      >
        {isExpanded ? <ChevronLeft size={16} /> : <ChevronRight size={16} />}
      </button>

      {/* Brand Region */}
      <div className={`p-4 border-b border-slate-100 h-16 flex items-center ${isExpanded ? 'justify-start' : 'justify-center'}`}>
        {isExpanded ? (
          <div className="flex items-center gap-2">
            <div className="w-8 h-8 rounded-lg bg-emerald-600 text-white flex items-center justify-center font-bold text-lg shadow-sm">S</div>
            <div>
              <h1 className="text-lg font-bold tracking-tight text-slate-900 leading-none">SyncForge</h1>
              <p className="text-[10px] text-emerald-600 font-semibold uppercase mt-0.5 tracking-wider">Hybrid Scheduler</p>
            </div>
          </div>
        ) : (
          <div className="w-8 h-8 rounded-lg bg-emerald-600 text-white flex items-center justify-center font-bold text-lg shadow-sm">
            S
          </div>
        )}
      </div>
      
      {/* Main Navigation Region */}
      <div className={`py-4 flex-1 overflow-y-auto ${isExpanded ? 'px-3' : 'px-2'}`}>
        
        {/* Custom Top Widgets Injection */}
        {topWidgets}

        {/* Environments Core Feature */}
        {isExpanded && (
          <div className="flex items-center justify-between mb-3 px-1">
            <h2 className="text-xs uppercase tracking-wider text-slate-400 font-semibold">Environments</h2>
            <button className="text-slate-400 hover:text-emerald-600 transition-colors" title="Add Environment">
              <svg xmlns="http://www.w3.org/2000/svg" width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"><line x1="12" y1="5" x2="12" y2="19"></line><line x1="5" y1="12" x2="19" y2="12"></line></svg>
            </button>
          </div>
        )}
        <nav className={`space-y-1 ${!isExpanded && 'flex flex-col items-center'}`}>
          {environments.map((env) => (
            <div 
              key={env.id} 
              className="relative group"
              onMouseEnter={() => setActiveHoverEnv(env.id)}
              onMouseLeave={() => setActiveHoverEnv(null)}
            >
              <button className={`w-full text-left rounded-lg font-medium text-sm flex items-center transition-all ${isExpanded ? (env.id === 1 ? 'px-3 py-2 bg-emerald-50 text-emerald-800' : 'px-3 py-2 text-slate-600 hover:bg-slate-100') : 'p-2.5 justify-center text-slate-600 hover:bg-slate-100'}`} title={env.name}>
                {renderIcon(env.iconName, { size: 18, className: `shrink-0 ${env.id === 1 ? 'text-emerald-600' : ''}` })}
                {isExpanded && <span className="ml-3 truncate flex-1">{env.name}</span>}
                {isExpanded && env.type && <span className="bg-emerald-100/50 text-emerald-700 py-0.5 px-2 rounded font-semibold text-[9px] uppercase tracking-wider ml-2 shrink-0">{env.type}</span>}
              </button>
              {isExpanded && activeHoverEnv === env.id && (
                <div className="absolute right-2 top-1/2 -translate-y-1/2 flex items-center">
                  <button className="p-1 text-slate-400 hover:text-slate-700 hover:bg-white rounded shadow-sm border border-slate-200/50 opacity-0 group-hover:opacity-100 transition-opacity">
                    <MoreVertical size={14} />
                  </button>
                </div>
              )}
            </div>
          ))}
        </nav>

        {/* Custom Bottom Widgets Injection (e.g. Analytics, App Store) */}
        <div className="mt-8">
          {bottomWidgets || (
            isExpanded ? (
              <>
                <div className="flex items-center justify-between mb-3 px-1">
                  <h2 className="text-xs uppercase tracking-wider text-slate-400 font-semibold">Team Analytics</h2>
                </div>
                <div className="px-3 py-3 bg-slate-50 rounded-xl border border-slate-100 space-y-3 shadow-sm">
                  <div className="flex items-center gap-3">
                    <div className="p-2 bg-white rounded-lg shadow-sm text-emerald-600 border border-slate-100">
                      <CheckCircle2 size={16} />
                    </div>
                    <div>
                      <p className="text-[10px] uppercase text-slate-500 font-bold tracking-wider leading-none">Completed Tasks</p>
                      <p className="text-sm font-bold text-slate-800 mt-1">24 <span className="text-xs text-slate-400 font-medium">/ 30</span></p>
                    </div>
                  </div>
                </div>
              </>
            ) : (
              <div className="flex flex-col items-center gap-4 mt-6">
                <button className="p-2.5 text-slate-400 hover:text-slate-600 hover:bg-slate-100 rounded-xl transition-colors" title="Team Analytics">
                  <BarChart2 size={18} />
                </button>
              </div>
            )
          )}
        </div>
      </div>
      
      {/* Extensible User Profile Region */}
      <div className={`p-4 border-t border-slate-200 relative ${!isExpanded && 'flex justify-center px-2'}`}>
        <button 
          onClick={() => setIsProfileMenuOpen(!isProfileMenuOpen)}
          className="flex items-center gap-3 w-full text-left hover:bg-slate-50 p-1 -m-1 rounded-lg transition-colors group"
        >
          <div className="w-8 h-8 rounded-full bg-gradient-to-tr from-emerald-500 to-teal-400 flex items-center justify-center text-white font-bold text-sm shrink-0 shadow-sm border-2 border-white">
            ST
          </div>
          {isExpanded && (
            <div className="overflow-hidden flex-1">
              <p className="text-sm font-semibold text-slate-800 truncate group-hover:text-emerald-700 transition-colors">SmartyToonster</p>
              <p className="text-[10px] uppercase font-bold tracking-wider text-slate-400">Pro Plan</p>
            </div>
          )}
        </button>

        {isProfileMenuOpen && (
          <>
            <div className="fixed inset-0 z-40" onClick={() => setIsProfileMenuOpen(false)}></div>
            <div className="absolute bottom-full left-4 mb-2 w-56 bg-white rounded-xl shadow-xl border border-slate-200 py-2 z-50 animate-in slide-in-from-bottom-2 fade-in duration-200">
              <div className="px-4 py-2 border-b border-slate-100 mb-2">
                <p className="text-sm font-bold text-slate-900">SmartyToonster</p>
                <p className="text-xs text-slate-500">smarty@codekada.com</p>
              </div>
              <button className="w-full text-left px-4 py-2 text-sm text-slate-700 hover:bg-slate-50 hover:text-emerald-600 flex items-center gap-2 transition-colors">
                <Settings size={16} /> Account Settings
              </button>
              <button className="w-full text-left px-4 py-2 text-sm text-slate-700 hover:bg-slate-50 hover:text-emerald-600 flex items-center gap-2 transition-colors">
                <CreditCard size={16} /> Billing & Plan
              </button>
              <div className="my-2 border-t border-slate-100"></div>
              <button className="w-full text-left px-4 py-2 text-sm text-red-600 hover:bg-red-50 flex items-center gap-2 transition-colors">
                <LogOut size={16} /> Sign out
              </button>
            </div>
          </>
        )}
      </div>
    </aside>
  );
}
