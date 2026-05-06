"use client";

import React, { useState } from "react";
import { Search, Bell, Zap, UserPlus, Globe, Link as LinkIcon, Check } from "lucide-react";
import useWorkspaceStore from "../../store/useWorkspaceStore";

export default function WorkspaceHeader({ 
  title = "Workspace", 
  subtitle = "Details", 
  icon: Icon,
  // Extensibility: allow passing custom actions to the header
  customActions = null 
}) {
  const [isFocusMode, setIsFocusMode] = useState(false);
  const [isShareMenuOpen, setIsShareMenuOpen] = useState(false);
  const [inviteEmail, setInviteEmail] = useState("");
  const [inviteStatus, setInviteStatus] = useState(null); // null | "sending" | "sent"

  const activeWorkspaceId = useWorkspaceStore((state) => state.activeWorkspaceId);
  const inviteMember = useWorkspaceStore((state) => state.inviteMember);

  const handleInvite = async () => {
    if (!inviteEmail.trim()) return;

    setInviteStatus("sending");
    const success = await inviteMember(activeWorkspaceId || "ws_8f92a", inviteEmail.trim());

    if (success) {
      setInviteStatus("sent");
      setTimeout(() => {
        setInviteEmail("");
        setInviteStatus(null);
      }, 2000);
    } else {
      setInviteStatus(null);
    }
  };

  const handleCopyLink = () => {
    const link = `${window.location.origin}/workspace?invite=${activeWorkspaceId || "ws_8f92a"}`;
    navigator.clipboard.writeText(link);
    alert("Invite link copied to clipboard!");
  };

  return (
    <header className="h-16 bg-white border-b border-slate-200 flex items-center px-8 justify-between shrink-0 shadow-sm z-10">
      
      {/* Dynamic Title Area */}
      <div className="flex items-center gap-3 w-1/3">
        {Icon && (
          <div className="p-2 bg-emerald-50 text-emerald-600 rounded-lg">
            <Icon size={20} />
          </div>
        )}
        <div>
          <h2 className="text-lg font-bold text-slate-800 leading-tight">{title}</h2>
          <div className="flex items-center gap-2 text-xs text-slate-500 font-medium">
            <Globe size={12} />
            <span>{subtitle}</span>
          </div>
        </div>
      </div>

      {/* Extensible Center Area: Global Search */}
      <div className="w-1/3 flex justify-center">
        <div className="relative w-full max-w-md group">
          <Search className="absolute left-3 top-1/2 -translate-y-1/2 text-slate-400 group-focus-within:text-emerald-500 transition-colors" size={18} />
          <input 
            type="text" 
            placeholder="Search tasks, teams, or schedules..." 
            className="w-full bg-slate-100 border-transparent focus:bg-white border focus:border-emerald-300 rounded-full py-2 pl-10 pr-12 text-sm text-slate-800 placeholder-slate-400 focus:outline-none focus:ring-4 focus:ring-emerald-500/10 transition-all"
          />
          <span className="absolute right-3 top-1/2 -translate-y-1/2 text-[10px] font-bold text-slate-400 border border-slate-200 bg-white px-1.5 py-0.5 rounded shadow-sm">
            Ctrl K
          </span>
        </div>
      </div>
      
      {/* Extensible Right Actions Area */}
      <div className="w-1/3 flex items-center justify-end gap-5">
        
        {/* Inject custom plugin actions if provided, otherwise render defaults */}
        {customActions || (
          <div className="flex items-center gap-3 border-r border-slate-200 pr-5">
            <button 
              onClick={() => setIsFocusMode(!isFocusMode)}
              className={`p-2 rounded-full transition-colors flex items-center gap-2 text-sm font-medium ${isFocusMode ? 'bg-amber-100 text-amber-700' : 'text-slate-500 hover:bg-slate-100'}`}
              title="Focus Mode"
            >
              <Zap size={18} className={isFocusMode ? 'fill-amber-500' : ''} />
            </button>
            <button className="p-2 text-slate-500 hover:bg-slate-100 rounded-full transition-colors relative" title="Notifications">
              <Bell size={20} />
              <span className="absolute top-1.5 right-1.5 w-2 h-2 bg-red-500 rounded-full border border-white"></span>
            </button>
          </div>
        )}

        {/* Team Collaboration Module */}
        <div className="flex items-center gap-3">
          <div className="flex -space-x-3">
            <img src="https://api.dicebear.com/7.x/avataaars/svg?seed=Felix" alt="User 1" className="w-8 h-8 rounded-full border-2 border-white shadow-sm bg-slate-100" />
            <img src="https://api.dicebear.com/7.x/avataaars/svg?seed=Aneka" alt="User 2" className="w-8 h-8 rounded-full border-2 border-white shadow-sm bg-slate-100" />
            <div className="w-8 h-8 rounded-full bg-slate-100 border-2 border-white shadow-sm flex items-center justify-center text-slate-600 text-[10px] font-bold ring-1 ring-inset ring-slate-200">+2</div>
          </div>
          
          <div className="relative">
            <button 
              onClick={() => setIsShareMenuOpen(!isShareMenuOpen)}
              className="px-3 py-1.5 text-sm font-bold text-white bg-slate-900 border border-transparent rounded-lg hover:bg-slate-800 shadow-sm transition-all flex items-center gap-2"
            >
              <UserPlus size={16} />
              Share
            </button>

            {/* Share Popover with functional Invite */}
            {isShareMenuOpen && (
              <>
                <div className="fixed inset-0 z-40" onClick={() => setIsShareMenuOpen(false)}></div>
                <div className="absolute top-full right-0 mt-2 w-80 bg-white rounded-xl shadow-xl border border-slate-200 p-4 z-50 animate-in slide-in-from-top-2 fade-in duration-200">
                  <h3 className="font-bold text-slate-900 mb-1">Share Workspace</h3>
                  <p className="text-xs text-slate-500 mb-4">Invite your team members to collaborate.</p>
                  
                  <div className="flex gap-2 mb-4">
                    <input
                      type="email"
                      placeholder="Email address"
                      value={inviteEmail}
                      onChange={(e) => setInviteEmail(e.target.value)}
                      onKeyDown={(e) => e.key === "Enter" && handleInvite()}
                      className="flex-1 text-sm px-3 py-2 border border-slate-200 rounded-lg focus:outline-none focus:ring-2 focus:ring-emerald-500/20 focus:border-emerald-500 transition-all"
                    />
                    <button
                      onClick={handleInvite}
                      disabled={inviteStatus === "sending" || !inviteEmail.trim()}
                      className="px-3 py-2 bg-emerald-600 hover:bg-emerald-700 text-white text-sm font-semibold rounded-lg transition-colors disabled:opacity-50 flex items-center gap-1"
                    >
                      {inviteStatus === "sent" ? <><Check size={14} /> Sent!</> : inviteStatus === "sending" ? "Sending..." : "Invite"}
                    </button>
                  </div>

                  <div className="space-y-3">
                    <p className="text-xs font-bold text-slate-400 uppercase tracking-wider">Members</p>
                    <div className="flex items-center justify-between">
                      <div className="flex items-center gap-2">
                        <div className="w-6 h-6 rounded-full bg-gradient-to-tr from-emerald-500 to-teal-400 flex items-center justify-center text-white text-[10px] font-bold">ST</div>
                        <span className="text-sm font-medium text-slate-700">You</span>
                      </div>
                      <span className="text-xs text-slate-500">Owner</span>
                    </div>
                  </div>

                  <div className="mt-5 pt-3 border-t border-slate-100">
                    <button
                      onClick={handleCopyLink}
                      className="w-full py-2 flex items-center justify-center gap-2 text-sm font-medium text-slate-700 bg-slate-50 hover:bg-slate-100 rounded-lg transition-colors border border-slate-200"
                    >
                      <LinkIcon size={14} /> Copy Invite Link
                    </button>
                  </div>
                </div>
              </>
            )}
          </div>
        </div>
      </div>
    </header>
  );
}
