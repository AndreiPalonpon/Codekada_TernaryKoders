"use client";

import React, { useState } from "react";
import { useRouter } from "next/navigation";
import { Search, Bell, Settings, Plus, FolderKanban, CalendarDays, MoreVertical, LayoutGrid, List } from "lucide-react";

import { dummyEnvironments as environments } from "@/lib/dummyData";

// Helper to render dynamic icons
const renderIcon = (iconName, props) => {
  if (iconName === "CalendarDays") return <CalendarDays {...props} />;
  return <FolderKanban {...props} />;
};

export default function EnvironmentPicker() {
  const router = useRouter();
  const [viewMode, setViewMode] = useState('grid'); // 'grid' | 'list'

  const handleOpenEnv = () => {
    router.push("/workspace");
  };

  return (
    <div className="min-h-screen bg-slate-50 font-sans flex flex-col">
      {/* Header */}
      <header className="h-16 bg-white border-b border-slate-200 flex items-center px-6 justify-between shrink-0 shadow-sm sticky top-0 z-50">
        <div className="flex items-center gap-3 w-1/3">
          <div className="w-8 h-8 rounded-lg bg-emerald-600 text-white flex items-center justify-center font-bold text-lg shadow-sm border border-emerald-500">S</div>
          <div>
            <h1 className="text-xl font-bold tracking-tight text-slate-900 leading-none">SyncForge</h1>
          </div>
        </div>

        {/* Global Search Bar */}
        <div className="w-1/3 flex justify-center">
          <div className="relative w-full max-w-lg group">
            <Search className="absolute left-3 top-1/2 -translate-y-1/2 text-slate-400 group-focus-within:text-emerald-500 transition-colors" size={18} />
            <input 
              type="text" 
              placeholder="Search workspaces..." 
              className="w-full bg-slate-100 border-transparent focus:bg-white border focus:border-emerald-300 rounded-full py-2.5 pl-10 pr-4 text-sm text-slate-800 placeholder-slate-500 focus:outline-none focus:ring-4 focus:ring-emerald-500/10 transition-all font-medium"
            />
          </div>
        </div>
        
        {/* Right Actions */}
        <div className="w-1/3 flex items-center justify-end gap-5">
          <button className="p-2 text-slate-500 hover:bg-slate-100 rounded-full transition-colors relative" title="Notifications">
            <Bell size={20} />
            <span className="absolute top-1.5 right-1.5 w-2 h-2 bg-red-500 rounded-full border border-white"></span>
          </button>
          <button className="p-2 text-slate-500 hover:bg-slate-100 rounded-full transition-colors">
            <Settings size={20} />
          </button>
          <div className="w-9 h-9 rounded-full bg-gradient-to-tr from-emerald-500 to-teal-400 flex items-center justify-center text-white font-bold text-sm shadow-sm border-2 border-white ml-2 cursor-pointer hover:shadow-md transition-shadow">
            ST
          </div>
        </div>
      </header>
      
      <main className="flex-1 w-full max-w-6xl mx-auto p-6 md:p-10">
        
        {/* Create New Section */}
        <section className="mb-12">
          <h2 className="text-lg font-bold text-slate-800 mb-6">Start a new workspace</h2>
          <div className="grid grid-cols-2 sm:grid-cols-3 md:grid-cols-4 lg:grid-cols-5 gap-6">
            {/* Blank Template */}
            <button 
              onClick={handleOpenEnv}
              className="group flex flex-col items-center text-left"
            >
              <div className="w-full aspect-[4/3] bg-white border border-slate-200 rounded-xl flex items-center justify-center shadow-sm group-hover:border-emerald-500 group-hover:shadow-emerald-500/20 transition-all mb-3 relative overflow-hidden">
                <div className="absolute inset-0 bg-emerald-50 opacity-0 group-hover:opacity-100 transition-opacity"></div>
                <div className="w-12 h-12 rounded-full bg-slate-50 flex items-center justify-center text-emerald-600 group-hover:scale-110 group-hover:bg-white group-hover:shadow-sm transition-all relative z-10">
                  <Plus size={24} />
                </div>
              </div>
              <span className="text-sm font-semibold text-slate-800">Blank Workspace</span>
            </button>
            
            {/* Mock Template 1 */}
            <button className="group flex flex-col items-center text-left opacity-70 hover:opacity-100 transition-opacity">
              <div className="w-full aspect-[4/3] bg-gradient-to-br from-blue-50 to-indigo-50 border border-slate-200 rounded-xl p-4 shadow-sm group-hover:border-blue-300 transition-all mb-3 flex flex-col relative overflow-hidden">
                <div className="w-8 h-2 bg-blue-200 rounded-full mb-2"></div>
                <div className="w-16 h-2 bg-blue-200 rounded-full mb-4"></div>
                <div className="w-full h-8 bg-white/60 rounded border border-blue-100 mb-2"></div>
                <div className="w-full h-8 bg-white/60 rounded border border-blue-100"></div>
              </div>
              <span className="text-sm font-semibold text-slate-800">Exam Study Plan</span>
            </button>

            {/* Mock Template 2 */}
            <button className="group flex flex-col items-center text-left opacity-70 hover:opacity-100 transition-opacity">
              <div className="w-full aspect-[4/3] bg-gradient-to-br from-amber-50 to-orange-50 border border-slate-200 rounded-xl p-4 shadow-sm group-hover:border-amber-300 transition-all mb-3 flex flex-col relative overflow-hidden">
                <div className="w-8 h-2 bg-amber-200 rounded-full mb-2"></div>
                <div className="flex gap-2 mb-2">
                  <div className="flex-1 h-12 bg-white/60 rounded border border-amber-100"></div>
                  <div className="flex-1 h-12 bg-white/60 rounded border border-amber-100"></div>
                </div>
              </div>
              <span className="text-sm font-semibold text-slate-800">Team Hackathon</span>
            </button>
          </div>
        </section>

        {/* Recent Workspaces Section */}
        <section>
          <div className="flex items-center justify-between mb-6">
            <h2 className="text-lg font-bold text-slate-800">Recent workspaces</h2>
            <div className="flex items-center gap-2 bg-slate-100 p-1 rounded-lg border border-slate-200">
              <button 
                onClick={() => setViewMode('grid')}
                className={`p-1.5 rounded text-slate-600 transition-colors ${viewMode === 'grid' ? 'bg-white shadow-sm font-bold text-slate-900' : 'hover:bg-slate-200'}`}
              >
                <LayoutGrid size={16} />
              </button>
              <button 
                onClick={() => setViewMode('list')}
                className={`p-1.5 rounded text-slate-600 transition-colors ${viewMode === 'list' ? 'bg-white shadow-sm font-bold text-slate-900' : 'hover:bg-slate-200'}`}
              >
                <List size={16} />
              </button>
            </div>
          </div>

          {viewMode === 'grid' ? (
            <div className="grid grid-cols-1 sm:grid-cols-2 md:grid-cols-3 lg:grid-cols-4 gap-4">
              {environments.map((env) => (
                <div key={env.id} onClick={handleOpenEnv} className="bg-white border border-slate-200 rounded-xl p-5 hover:shadow-md hover:border-emerald-300 transition-all cursor-pointer group flex flex-col h-40">
                  <div className="flex items-start justify-between mb-auto">
                    <div className={`p-2.5 rounded-lg text-white shadow-sm ${env.color}`}>
                      {renderIcon(env.iconName, { size: 18 })}
                    </div>
                    <button className="text-slate-400 hover:text-slate-700 opacity-0 group-hover:opacity-100 transition-opacity p-1" onClick={(e) => { e.stopPropagation(); }}>
                      <MoreVertical size={16} />
                    </button>
                  </div>
                  <div>
                    <h3 className="font-bold text-slate-800 text-base truncate">{env.name}</h3>
                    <div className="flex items-center gap-2 mt-1.5">
                      <span className="text-xs font-semibold text-slate-500 bg-slate-100 px-2 py-0.5 rounded-md truncate">{env.type}</span>
                    </div>
                  </div>
                </div>
              ))}
            </div>
          ) : (
            <div className="bg-white border border-slate-200 rounded-xl shadow-sm overflow-hidden">
              <table className="w-full text-left border-collapse">
                <thead>
                  <tr className="border-b border-slate-100 bg-slate-50/50">
                    <th className="py-3 px-5 text-xs font-bold text-slate-500 uppercase tracking-wider">Name</th>
                    <th className="py-3 px-5 text-xs font-bold text-slate-500 uppercase tracking-wider">Type</th>
                    <th className="py-3 px-5 text-xs font-bold text-slate-500 uppercase tracking-wider hidden md:table-cell">Last Opened</th>
                    <th className="py-3 px-5 text-xs font-bold text-slate-500 uppercase tracking-wider text-right">Actions</th>
                  </tr>
                </thead>
                <tbody>
                  {environments.map((env) => (
                    <tr key={env.id} onClick={handleOpenEnv} className="border-b border-slate-100 hover:bg-slate-50 cursor-pointer group transition-colors last:border-0">
                      <td className="py-4 px-5">
                        <div className="flex items-center gap-3">
                          <div className={`p-2 rounded-lg text-white shadow-sm ${env.color}`}>
                            {renderIcon(env.iconName, { size: 16 })}
                          </div>
                          <span className="font-bold text-slate-800">{env.name}</span>
                        </div>
                      </td>
                      <td className="py-4 px-5">
                        <span className="text-xs font-semibold text-slate-600 bg-slate-100 border border-slate-200 px-2.5 py-1 rounded-md">{env.type}</span>
                      </td>
                      <td className="py-4 px-5 text-sm text-slate-500 font-medium hidden md:table-cell">
                        {env.date}
                      </td>
                      <td className="py-4 px-5 text-right">
                        <button className="text-slate-400 hover:text-slate-700 p-1.5 hover:bg-slate-200 rounded-md transition-colors" onClick={(e) => { e.stopPropagation(); }}>
                          <MoreVertical size={16} />
                        </button>
                      </td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          )}
        </section>
      </main>
    </div>
  );
}
