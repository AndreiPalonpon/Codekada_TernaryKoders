"use client";

import React, { useState, useEffect } from "react";
import { useRouter } from "next/navigation";
import { Search, Bell, Settings, Plus, FolderKanban, CalendarDays, MoreVertical, LayoutGrid, List, LogOut, Check, X, Briefcase, GraduationCap, Sparkles, Code2 } from "lucide-react";
import { useSession, signOut } from "next-auth/react";
import useWorkspaceStore from "@/store/useWorkspaceStore";

const renderIcon = (iconName, props) => {
  switch (iconName) {
    case "CalendarDays": return <CalendarDays {...props} />;
    case "FolderKanban": return <FolderKanban {...props} />;
    case "Briefcase": return <Briefcase {...props} />;
    case "GraduationCap": return <GraduationCap {...props} />;
    case "Sparkles": return <Sparkles {...props} />;
    case "Code2": return <Code2 {...props} />;
    default: return <FolderKanban {...props} />;
  }
};

export default function EnvironmentPicker() {
  const router = useRouter();
  const { data: session, status } = useSession();
  const [viewMode, setViewMode] = useState('grid');
  const [openMenuId, setOpenMenuId] = useState(null);
  const [searchTerm, setSearchTerm] = useState("");

  // Header Interactions State
  const [isNotifOpen, setIsNotifOpen] = useState(false);
  const [isSettingsOpen, setIsSettingsOpen] = useState(false);
  const [isAccountOpen, setIsAccountOpen] = useState(false);

  // Custom Modal States
  const [isCreateModalOpen, setIsCreateModalOpen] = useState(false);
  const [newWsName, setNewWsName] = useState("");
  const [newWsType, setNewWsType] = useState("Personal");
  const [newWsColor, setNewWsColor] = useState("bg-emerald-500");
  const [newWsIcon, setNewWsIcon] = useState("CalendarDays");

  const workspaces = useWorkspaceStore((state) => state.workspaces);
  const fetchWorkspaces = useWorkspaceStore((state) => state.fetchWorkspaces);
  const createWorkspace = useWorkspaceStore((state) => state.createWorkspace);
  const renameWorkspace = useWorkspaceStore((state) => state.renameWorkspace);
  const removeWorkspace = useWorkspaceStore((state) => state.removeWorkspace);
  const setActiveWorkspace = useWorkspaceStore((state) => state.setActiveWorkspace);
  const isCreating = useWorkspaceStore((state) => state.isCreating);
  const isFetching = useWorkspaceStore((state) => state.isFetching);
  const visibleWorkspaces = workspaces.filter((workspace) => {
    const query = searchTerm.trim().toLowerCase();
    if (!query) return true;
    return [workspace.name, workspace.type].some((value) =>
      String(value || "").toLowerCase().includes(query)
    );
  });

  useEffect(() => {
    if (status === "authenticated") {
      fetchWorkspaces();
    } else if (status === "unauthenticated") {
      router.push("/login");
    }
  }, [status, fetchWorkspaces, router]);

  const handleOpenEnv = (workspaceId) => {
    setActiveWorkspace(workspaceId);
    router.push("/workspace");
  };

  const handleCreateBlank = () => {
    setNewWsName("");
    setNewWsType("Personal");
    setNewWsColor("bg-emerald-500");
    setNewWsIcon("CalendarDays");
    setIsCreateModalOpen(true);
  };

  const handleModalSubmit = async (e) => {
    e.preventDefault();
    if (!newWsName.trim()) return;
    setIsCreateModalOpen(false);
    const ws = await createWorkspace(newWsName.trim(), newWsType, {
      color: newWsColor,
      iconName: newWsIcon
    });
    if (ws) router.push("/workspace");
  };

  const handleCreateFromTemplate = async (templateName, type) => {
    const ws = await createWorkspace(templateName, type);
    if (ws) router.push("/workspace");
  };

  return (
    <div className="min-h-screen bg-slate-50 font-sans flex flex-col">
      <header className="h-16 bg-white border-b border-slate-200 flex items-center px-6 justify-between shrink-0 shadow-sm sticky top-0 z-50">
        <div className="flex items-center gap-3 w-1/3">
          <img src="/Synkrohan Icon.png" alt="Synkrohan" className="w-8 h-8 object-contain" />
          <h1 className="text-xl font-bold tracking-tight text-slate-900 leading-none">Synkrohan</h1>
        </div>
        <div className="w-1/3 flex justify-center">
          <div className="relative w-full max-w-lg group">
            <Search className="absolute left-3 top-1/2 -translate-y-1/2 text-slate-400 group-focus-within:text-emerald-500 transition-colors" size={18} />
            <input
              type="text"
              placeholder="Search workspaces..."
              value={searchTerm}
              onChange={(e) => setSearchTerm(e.target.value)}
              className="w-full bg-slate-100 border-transparent focus:bg-white border focus:border-emerald-300 rounded-full py-2.5 pl-10 pr-4 text-sm text-slate-800 placeholder-slate-500 focus:outline-none focus:ring-4 focus:ring-emerald-500/10 transition-all font-medium"
            />
          </div>
        </div>
        <div className="w-1/3 flex items-center justify-end gap-5">
          {/* Notifications Dropdown */}
          <div className="relative">
            <button 
              onClick={() => {
                setIsNotifOpen(!isNotifOpen);
                setIsSettingsOpen(false);
                setIsAccountOpen(false);
              }}
              className={`p-2 rounded-full transition-colors relative ${isNotifOpen ? 'bg-emerald-50 text-emerald-600' : 'text-slate-500 hover:bg-slate-100'}`}
              title="Notifications"
            >
              <Bell size={20} />
              <span className="absolute top-1.5 right-1.5 w-2 h-2 bg-red-500 rounded-full border border-white animate-pulse"></span>
            </button>
            
            {isNotifOpen && (
              <>
                <div className="fixed inset-0 z-[100]" onClick={() => setIsNotifOpen(false)}></div>
                <div className="absolute right-0 mt-3 bg-white border border-slate-200 rounded-xl shadow-xl w-80 py-2 z-[110] animate-in fade-in slide-in-from-top-3 duration-150">
                  <div className="px-4 py-2 border-b border-slate-100 flex justify-between items-center">
                    <span className="font-bold text-slate-800 text-sm">Notifications</span>
                    <span className="text-[10px] bg-red-50 text-red-600 px-2 py-0.5 rounded-full font-bold">3 Unread</span>
                  </div>
                  <div className="max-h-60 overflow-y-auto">
                    <div className="px-4 py-3 hover:bg-slate-50 border-b border-slate-50 cursor-pointer">
                      <div className="flex items-start gap-2.5">
                        <div className="w-2 h-2 mt-1.5 rounded-full bg-emerald-500 shrink-0"></div>
                        <div>
                          <p className="text-xs font-bold text-slate-800">Workspace Calibrated</p>
                          <p className="text-[10px] text-slate-500 mt-0.5 font-medium">Synkrohan successfully optimized your workspace planner slots.</p>
                          <span className="text-[9px] text-slate-400 font-bold block mt-1">2 hours ago</span>
                        </div>
                      </div>
                    </div>
                    <div className="px-4 py-3 hover:bg-slate-50 border-b border-slate-50 cursor-pointer">
                      <div className="flex items-start gap-2.5">
                        <div className="w-2 h-2 mt-1.5 rounded-full bg-blue-500 shrink-0"></div>
                        <div>
                          <p className="text-xs font-bold text-slate-800">MongoDB Atlas Synced</p>
                          <p className="text-[10px] text-slate-500 mt-0.5 font-medium">All tasks and schedules are persistently synchronized.</p>
                          <span className="text-[9px] text-slate-400 font-bold block mt-1">1 day ago</span>
                        </div>
                      </div>
                    </div>
                    <div className="px-4 py-3 hover:bg-slate-50 cursor-pointer">
                      <div className="flex items-start gap-2.5">
                        <div className="w-2 h-2 mt-1.5 rounded-full bg-purple-500 shrink-0"></div>
                        <div>
                          <p className="text-xs font-bold text-slate-800">Welcome to Synkrohan!</p>
                          <p className="text-[10px] text-slate-500 mt-0.5 font-medium">Start creating workspaces and planning smart tasks.</p>
                          <span className="text-[9px] text-slate-400 font-bold block mt-1">2 days ago</span>
                        </div>
                      </div>
                    </div>
                  </div>
                </div>
              </>
            )}
          </div>

          {/* Settings Trigger */}
          <button 
            onClick={() => {
              setIsSettingsOpen(true);
              setIsNotifOpen(false);
              setIsAccountOpen(false);
            }}
            className="p-2 text-slate-500 hover:bg-slate-100 rounded-full transition-colors"
            title="Settings"
          >
            <Settings size={20} />
          </button>

          {/* Account Profile Dropdown */}
          <div className="relative">
            <div 
              onClick={() => {
                setIsAccountOpen(!isAccountOpen);
                setIsNotifOpen(false);
                setIsSettingsOpen(false);
              }}
              className={`flex items-center gap-2 cursor-pointer group p-1 rounded-full transition-colors ${isAccountOpen ? 'bg-slate-100' : 'hover:bg-slate-50'}`}
            >
              <div className="w-9 h-9 rounded-full bg-gradient-to-tr from-emerald-500 to-teal-400 flex items-center justify-center text-white font-bold text-sm shadow-sm border-2 border-white ml-1 overflow-hidden hover:shadow-md transition-shadow">
                {session?.user?.image ? (
                  <img src={session.user.image} alt={session.user.name} className="w-full h-full object-cover" />
                ) : (
                  session?.user?.name?.charAt(0) || "U"
                )}
              </div>
              <span className="text-sm font-semibold text-slate-700 group-hover:text-emerald-600 transition-colors hidden sm:inline mr-2">
                {session?.user?.name || "User"}
              </span>
            </div>

            {isAccountOpen && (
              <>
                <div className="fixed inset-0 z-[100]" onClick={() => setIsAccountOpen(false)}></div>
                <div className="absolute right-0 mt-3 bg-white border border-slate-200 rounded-xl shadow-xl w-64 py-3 z-[110] animate-in fade-in slide-in-from-top-3 duration-150">
                  <div className="px-4 pb-3 border-b border-slate-100 flex items-center gap-3">
                    <div className="w-10 h-10 rounded-full bg-gradient-to-tr from-emerald-500 to-teal-400 flex items-center justify-center text-white font-bold text-base shadow-sm">
                      {session?.user?.name?.charAt(0) || "U"}
                    </div>
                    <div className="min-w-0">
                      <p className="text-xs font-bold text-slate-800 truncate">{session?.user?.name || "Active Session User"}</p>
                      <p className="text-[10px] text-slate-500 font-medium truncate">{session?.user?.email || "user@synkrohan.app"}</p>
                    </div>
                  </div>
                  <div className="px-4 py-2 border-b border-slate-100 bg-slate-50">
                    <div className="flex justify-between items-center text-[10px] font-bold text-slate-500 uppercase tracking-wider">
                      <span>Plan Status</span>
                      <span className="text-emerald-600 bg-emerald-50 border border-emerald-100 px-2 py-0.5 rounded-full font-bold">Synkrohan Elite</span>
                    </div>
                  </div>
                  <div className="py-1">
                    <div className="px-4 py-2 text-[10px] font-semibold text-slate-400 uppercase tracking-wider">Workspaces</div>
                    <div className="px-4 py-1.5 flex justify-between items-center hover:bg-slate-50 cursor-pointer">
                      <span className="text-xs text-slate-600 font-bold">Active Environments</span>
                      <span className="text-xs font-extrabold text-slate-800 bg-slate-100 px-2 py-0.5 rounded-md">{workspaces.length}</span>
                    </div>
                  </div>
                  <div className="pt-2 border-t border-slate-100 px-3">
                    <button
                      onClick={() => signOut({ callbackUrl: "/login" })}
                      className="w-full py-2 bg-red-50 hover:bg-red-100 hover:text-red-700 text-red-600 font-bold text-xs rounded-lg transition-colors flex items-center justify-center gap-2"
                    >
                      <LogOut size={14} />
                      Sign out of account
                    </button>
                  </div>
                </div>
              </>
            )}
          </div>
        </div>
      </header>
      
      <main className="flex-1 w-full max-w-6xl mx-auto p-6 md:p-10">
        <section className="mb-10 bg-gradient-to-r from-emerald-600 to-teal-600 rounded-2xl p-6 md:p-8 text-white shadow-lg relative overflow-hidden">
          <div className="absolute inset-0 bg-[radial-gradient(circle_at_top_right,rgba(255,255,255,0.15),transparent)] pointer-events-none"></div>
          <div className="relative z-10 max-w-xl">
            <h2 className="text-2xl md:text-3xl font-extrabold tracking-tight mb-2">Create your next schedule environment</h2>
            <p className="text-emerald-50/90 text-sm md:text-base font-medium mb-6">
              Build a custom tailored workspace backed by MongoDB Atlas and optimized by our analytical scheduler engine.
            </p>
            <button 
              onClick={handleCreateBlank}
              className="px-6 py-3 bg-white text-emerald-700 hover:bg-emerald-50 active:scale-95 text-sm font-bold rounded-xl shadow-md transition-all flex items-center gap-2 group font-bold"
            >
              <Plus size={18} className="group-hover:rotate-90 transition-transform duration-200" />
              Create Custom Workspace
            </button>
          </div>
        </section>

        <section>
          <div className="flex items-center justify-between mb-6">
            <h2 className="text-lg font-bold text-slate-800">Recent workspaces</h2>
            <div className="flex items-center gap-2 bg-slate-100 p-1 rounded-lg border border-slate-200">
              <button onClick={() => setViewMode('grid')} className={`p-1.5 rounded text-slate-600 transition-colors ${viewMode === 'grid' ? 'bg-white shadow-sm font-bold text-slate-900' : 'hover:bg-slate-200'}`}><LayoutGrid size={16} /></button>
              <button onClick={() => setViewMode('list')} className={`p-1.5 rounded text-slate-600 transition-colors ${viewMode === 'list' ? 'bg-white shadow-sm font-bold text-slate-900' : 'hover:bg-slate-200'}`}><List size={16} /></button>
            </div>
          </div>

          {visibleWorkspaces.length === 0 ? (
            <div className="bg-white border border-slate-200 rounded-xl p-12 text-center">
              <div className="w-16 h-16 rounded-full bg-slate-100 flex items-center justify-center mx-auto mb-4"><FolderKanban size={28} className="text-slate-400" /></div>
              <h3 className="text-lg font-bold text-slate-700 mb-2">{workspaces.length === 0 ? "No workspaces yet" : "No matching workspaces"}</h3>
              <p className="text-sm text-slate-500 max-w-sm mx-auto mb-6">
                {workspaces.length === 0
                  ? "Create your first workspace to start organizing tasks and generating AI-powered schedules."
                  : "Try a different name or workspace type."}
              </p>
              {workspaces.length === 0 && (
                <button onClick={handleCreateBlank} className="px-6 py-2.5 bg-emerald-600 hover:bg-emerald-700 text-white font-semibold text-sm rounded-lg shadow-md shadow-emerald-600/20 transition-all">+ Create Workspace</button>
              )}
            </div>
          ) : viewMode === 'grid' ? (
            <div className="grid grid-cols-1 sm:grid-cols-2 md:grid-cols-3 lg:grid-cols-4 gap-4">
              {visibleWorkspaces.map((env) => (
                <div key={env.id} onClick={() => handleOpenEnv(env.id)} className="bg-white border border-slate-200 rounded-xl p-5 hover:shadow-md hover:border-emerald-300 transition-all cursor-pointer group flex flex-col h-40">
                  <div className="flex items-start justify-between mb-auto">
                    <div className={`p-2.5 rounded-lg text-white shadow-sm ${env.color}`}>{renderIcon(env.iconName, { size: 18 })}</div>
                    <div className="relative">
                      <button 
                        className="text-slate-400 hover:text-slate-700 opacity-100 group-hover:opacity-100 transition-opacity p-1 bg-slate-50 hover:bg-slate-100 border border-slate-200/50 rounded-md shadow-sm" 
                        onClick={(e) => {
                          e.stopPropagation();
                          setOpenMenuId(openMenuId === env.id ? null : env.id);
                        }}
                      >
                        <MoreVertical size={16} />
                      </button>
                      {openMenuId === env.id && (
                        <>
                          <div className="fixed inset-0 z-40" onClick={(e) => { e.stopPropagation(); setOpenMenuId(null); }}></div>
                          <div className="absolute right-0 top-full mt-1 bg-white border border-slate-200 rounded-lg shadow-lg py-1 w-28 z-50 animate-in fade-in duration-100">
                            <button 
                              onClick={(e) => {
                                e.stopPropagation();
                                const newName = prompt("Rename workspace:", env.name);
                                if (newName && newName.trim()) {
                                  renameWorkspace(env.id, newName.trim());
                                }
                                setOpenMenuId(null);
                              }}
                              className="w-full text-left px-3 py-1.5 text-xs text-slate-700 hover:bg-slate-50 hover:text-emerald-600 transition-colors font-semibold"
                            >
                              Rename
                            </button>
                            <button 
                              onClick={(e) => {
                                e.stopPropagation();
                                if (confirm(`Are you sure you want to delete "${env.name}"? This will permanently delete all its schedules.`)) {
                                  removeWorkspace(env.id);
                                }
                                setOpenMenuId(null);
                              }}
                              className="w-full text-left px-3 py-1.5 text-xs text-red-600 hover:bg-red-50 transition-colors font-semibold"
                            >
                              Delete
                            </button>
                          </div>
                        </>
                      )}
                    </div>
                  </div>
                  <div>
                    <h3 className="font-bold text-slate-800 text-base truncate">{env.name}</h3>
                    <div className="flex items-center gap-2 mt-1.5"><span className="text-xs font-semibold text-slate-500 bg-slate-100 px-2 py-0.5 rounded-md truncate">{env.type}</span></div>
                  </div>
                </div>
              ))}
            </div>
          ) : (
            <div className="bg-white border border-slate-200 rounded-xl shadow-sm overflow-hidden">
              <table className="w-full text-left border-collapse">
                <thead><tr className="border-b border-slate-100 bg-slate-50/50">
                  <th className="py-3 px-5 text-xs font-bold text-slate-500 uppercase tracking-wider">Name</th>
                  <th className="py-3 px-5 text-xs font-bold text-slate-500 uppercase tracking-wider">Type</th>
                  <th className="py-3 px-5 text-xs font-bold text-slate-500 uppercase tracking-wider hidden md:table-cell">Created</th>
                  <th className="py-3 px-5 text-xs font-bold text-slate-500 uppercase tracking-wider text-right">Actions</th>
                </tr></thead>
                <tbody>
                  {visibleWorkspaces.map((env) => (
                    <tr key={env.id} onClick={() => handleOpenEnv(env.id)} className="border-b border-slate-100 hover:bg-slate-50 cursor-pointer group transition-colors last:border-0">
                      <td className="py-4 px-5"><div className="flex items-center gap-3"><div className={`p-2 rounded-lg text-white shadow-sm ${env.color}`}>{renderIcon(env.iconName, { size: 16 })}</div><span className="font-bold text-slate-800">{env.name}</span></div></td>
                      <td className="py-4 px-5"><span className="text-xs font-semibold text-slate-600 bg-slate-100 border border-slate-200 px-2.5 py-1 rounded-md">{env.type}</span></td>
                      <td className="py-4 px-5 text-sm text-slate-500 font-medium hidden md:table-cell">{env.createdAt ? new Date(env.createdAt).toLocaleDateString() : "—"}</td>
                      <td className="py-4 px-5 text-right">
                        <div className="relative inline-block text-left">
                          <button 
                            className="text-slate-400 hover:text-slate-700 p-1.5 hover:bg-slate-200 rounded-md transition-colors" 
                            onClick={(e) => {
                              e.stopPropagation();
                              setOpenMenuId(openMenuId === env.id ? null : env.id);
                            }}
                          >
                            <MoreVertical size={16} />
                          </button>
                          {openMenuId === env.id && (
                            <>
                              <div className="fixed inset-0 z-40" onClick={(e) => { e.stopPropagation(); setOpenMenuId(null); }}></div>
                              <div className="absolute right-0 mt-1 bg-white border border-slate-200 rounded-lg shadow-lg py-1 w-28 z-50 animate-in fade-in duration-100">
                                <button 
                                  onClick={(e) => {
                                    e.stopPropagation();
                                    const newName = prompt("Rename workspace:", env.name);
                                    if (newName && newName.trim()) {
                                      renameWorkspace(env.id, newName.trim());
                                    }
                                    setOpenMenuId(null);
                                  }}
                                  className="w-full text-left px-3 py-1.5 text-xs text-slate-700 hover:bg-slate-50 hover:text-emerald-600 transition-colors font-semibold"
                                >
                                  Rename
                                </button>
                                <button 
                                  onClick={(e) => {
                                    e.stopPropagation();
                                    if (confirm(`Are you sure you want to delete "${env.name}"? This will permanently delete all its schedules.`)) {
                                      removeWorkspace(env.id);
                                    }
                                    setOpenMenuId(null);
                                  }}
                                  className="w-full text-left px-3 py-1.5 text-xs text-red-600 hover:bg-red-50 transition-colors font-semibold"
                                >
                                  Delete
                                </button>
                              </div>
                            </>
                          )}
                        </div>
                      </td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          )}
        </section>
      </main>

      {/* Premium Full-Screen Loading Overlay */}
      {(isCreating || isFetching) && (
        <div className="fixed inset-0 bg-slate-900/60 backdrop-blur-md z-[200] flex items-center justify-center p-4">
          <div className="bg-white rounded-2xl shadow-2xl p-8 max-w-sm w-full border border-slate-100 flex flex-col items-center text-center gap-6 animate-in zoom-in-95 duration-200">
            <div className="relative w-16 h-16">
              <div className="absolute inset-0 border-4 border-emerald-50 rounded-full"></div>
              <div className="absolute inset-0 border-4 border-emerald-600 border-t-transparent rounded-full animate-spin"></div>
            </div>
            <div>
              <h3 className="text-lg font-bold text-slate-800">
                {isCreating ? "Creating Workspace..." : "Retrieving Workspaces..."}
              </h3>
              <p className="text-sm text-slate-500 mt-2 font-medium">
                {isCreating 
                  ? "Configuring environment containers & calibrating sync modules..." 
                  : "Syncing secure workspaces with database..."}
              </p>
            </div>
          </div>
        </div>
      )}

      {/* Premium Workspace Creation Modal */}
      {isCreateModalOpen && (
        <div className="fixed inset-0 bg-slate-900/60 backdrop-blur-sm z-[150] flex items-center justify-center p-4 animate-in fade-in duration-200">
          <div className="bg-white rounded-2xl shadow-2xl border border-slate-200 max-w-md w-full overflow-hidden flex flex-col animate-in zoom-in-95 duration-200">
            {/* Modal Header */}
            <div className="px-6 py-5 border-b border-slate-100 flex justify-between items-center bg-slate-50">
              <div>
                <h3 className="font-bold text-slate-900 text-lg leading-tight">Create Workspace</h3>
                <p className="text-xs text-slate-500 font-semibold mt-1">Design a tailored environment for your scheduler</p>
              </div>
              <button 
                onClick={() => setIsCreateModalOpen(false)}
                className="text-slate-400 hover:text-slate-700 bg-white border border-slate-200 shadow-sm rounded-full p-1.5 transition-colors"
              >
                <X size={16} />
              </button>
            </div>

            {/* Modal Body */}
            <form onSubmit={handleModalSubmit} className="p-6 space-y-5">
              {/* Workspace Name */}
              <div className="space-y-1.5">
                <label className="text-xs uppercase tracking-wider text-slate-500 font-bold">Workspace Name</label>
                <input 
                  type="text" 
                  value={newWsName}
                  onChange={(e) => setNewWsName(e.target.value)}
                  placeholder="e.g. DLSU Manila Hackathon, Personal Planner"
                  className="w-full bg-slate-50 border border-slate-200 focus:bg-white focus:border-emerald-500 rounded-xl px-4 py-3 text-sm text-slate-800 placeholder-slate-400 focus:outline-none focus:ring-4 focus:ring-emerald-500/10 transition-all font-semibold"
                  required
                />
              </div>

              {/* Theme Color Picker */}
              <div className="space-y-1.5">
                <label className="text-xs uppercase tracking-wider text-slate-500 font-bold">Color Theme</label>
                <div className="flex items-center gap-3">
                  {[
                    { key: "bg-emerald-500", label: "Emerald" },
                    { key: "bg-blue-500", label: "Blue" },
                    { key: "bg-purple-500", label: "Purple" },
                    { key: "bg-amber-500", label: "Amber" },
                    { key: "bg-rose-500", label: "Rose" },
                    { key: "bg-cyan-500", label: "Cyan" }
                  ].map((colorObj) => (
                    <button
                      key={colorObj.key}
                      type="button"
                      onClick={() => setNewWsColor(colorObj.key)}
                      className={`w-8 h-8 rounded-full ${colorObj.key} flex items-center justify-center text-white shadow-sm hover:scale-110 transition-transform`}
                      title={colorObj.label}
                    >
                      {newWsColor === colorObj.key && <Check size={14} strokeWidth={3} />}
                    </button>
                  ))}
                </div>
              </div>

              {/* Layout Icon Selector */}
              <div className="space-y-1.5">
                <label className="text-xs uppercase tracking-wider text-slate-500 font-bold">Icon Selection</label>
                <div className="grid grid-cols-3 gap-3">
                  {[
                    { key: "CalendarDays", label: "Calendar", icon: CalendarDays },
                    { key: "FolderKanban", label: "Projects", icon: FolderKanban },
                    { key: "Briefcase", label: "Work", icon: Briefcase },
                    { key: "GraduationCap", label: "Education", icon: GraduationCap },
                    { key: "Sparkles", label: "Creative", icon: Sparkles },
                    { key: "Code2", label: "Dev", icon: Code2 }
                  ].map((item) => {
                    const IconComponent = item.icon;
                    return (
                      <button
                        key={item.key}
                        type="button"
                        onClick={() => setNewWsIcon(item.key)}
                        className={`p-2.5 rounded-xl border-2 flex flex-col items-center gap-1.5 transition-all ${newWsIcon === item.key ? "border-emerald-500 bg-emerald-50/30 text-emerald-800" : "border-slate-100 hover:border-slate-200 text-slate-600"}`}
                      >
                        <IconComponent size={18} className={newWsIcon === item.key ? "text-emerald-600" : "text-slate-400"} />
                        <span className="text-[10px] font-bold">{item.label}</span>
                      </button>
                    );
                  })}
                </div>
              </div>

              {/* Action Buttons */}
              <div className="flex justify-end gap-3 pt-3 border-t border-slate-100">
                <button
                  type="button"
                  onClick={() => setIsCreateModalOpen(false)}
                  className="px-4 py-2 border border-slate-200 rounded-xl text-xs font-bold text-slate-600 hover:bg-slate-50 transition-colors"
                >
                  Cancel
                </button>
                <button
                  type="submit"
                  className="px-5 py-2.5 bg-emerald-600 hover:bg-emerald-700 text-white font-bold text-xs rounded-xl shadow-md shadow-emerald-600/20 hover:shadow-lg transition-all"
                >
                  Create Environment
                </button>
              </div>
            </form>
          </div>
        </div>
      )}

      {/* Global Dashboard Settings Modal */}
      {isSettingsOpen && (
        <div className="fixed inset-0 bg-slate-900/60 backdrop-blur-sm z-[150] flex items-center justify-center p-4 animate-in fade-in duration-200">
          <div className="bg-white rounded-2xl shadow-2xl border border-slate-200 max-w-md w-full overflow-hidden flex flex-col animate-in zoom-in-95 duration-200">
            {/* Modal Header */}
            <div className="px-6 py-5 border-b border-slate-100 flex justify-between items-center bg-slate-50">
              <div>
                <h3 className="font-bold text-slate-900 text-lg leading-tight">Global Preferences</h3>
                <p className="text-xs text-slate-500 font-semibold mt-1">Manage global system options and sync configurations</p>
              </div>
              <button 
                onClick={() => setIsSettingsOpen(false)}
                className="text-slate-400 hover:text-slate-700 bg-white border border-slate-200 shadow-sm rounded-full p-1.5 transition-colors"
              >
                <X size={16} />
              </button>
            </div>

            {/* Modal Body */}
            <div className="p-6 space-y-5">
              {/* Theme Settings (mock toggle) */}
              <div className="space-y-1.5">
                <label className="text-xs uppercase tracking-wider text-slate-500 font-bold">Theme Setting</label>
                <div className="grid grid-cols-2 gap-3">
                  <button className="p-3 border-2 border-emerald-500 bg-emerald-50/50 rounded-xl text-left font-bold text-slate-800 text-sm">
                    Light Mode
                  </button>
                  <button className="p-3 border-2 border-slate-100 rounded-xl text-left font-bold text-slate-400 text-sm cursor-not-allowed" title="Dark Mode coming soon!">
                    Dark Mode (Locked)
                  </button>
                </div>
              </div>

              {/* Sync interval option */}
              <div className="space-y-1.5">
                <label className="text-xs uppercase tracking-wider text-slate-500 font-bold">Auto-Sync Frequency</label>
                <select className="w-full bg-slate-50 border border-slate-200 rounded-xl px-4 py-3 text-sm text-slate-800 font-semibold focus:outline-none">
                  <option>Real-Time Push (Default)</option>
                  <option>Every 5 Minutes</option>
                  <option>Every 15 Minutes</option>
                  <option>Manual Sync</option>
                </select>
              </div>

              {/* DB Status */}
              <div className="bg-emerald-50/60 border border-emerald-100 rounded-xl p-4 flex items-center justify-between">
                <div className="flex items-center gap-3">
                  <span className="relative flex h-3.5 w-3.5">
                    <span className="animate-ping absolute inline-flex h-full w-full rounded-full bg-emerald-400 opacity-75"></span>
                    <span className="relative inline-flex rounded-full h-3.5 w-3.5 bg-emerald-500"></span>
                  </span>
                  <div>
                    <p className="text-xs font-bold text-emerald-800">MongoDB Atlas Database Connected</p>
                    <p className="text-[10px] text-emerald-600 font-medium mt-0.5">Atlas Cluster syncforge_db</p>
                  </div>
                </div>
              </div>

              {/* Action Buttons */}
              <div className="flex justify-end gap-3 pt-3 border-t border-slate-100">
                <button
                  onClick={() => setIsSettingsOpen(false)}
                  className="px-5 py-2.5 bg-emerald-600 hover:bg-emerald-700 text-white font-bold text-xs rounded-xl shadow-md transition-all"
                >
                  Save Settings
                </button>
              </div>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}
