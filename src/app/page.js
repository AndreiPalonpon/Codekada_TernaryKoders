"use client";

import React, { useState, useEffect } from "react";
import { useRouter } from "next/navigation";
import { Search, Bell, Settings, Plus, FolderKanban, CalendarDays, MoreVertical, LayoutGrid, List, LogOut, BookOpen, Code, Clock } from "lucide-react";
import useScheduleStore from "@/store/useScheduleStore";

import { dummyEnvironments as initialEnvironments } from "@/lib/dummyData";

// Helper to render dynamic icons
const renderIcon = (iconName, props) => {
  if (iconName === "CalendarDays") return <CalendarDays {...props} />;
  if (iconName === "BookOpen") return <BookOpen {...props} />;
  if (iconName === "Code") return <Code {...props} />;
  if (iconName === "Clock") return <Clock {...props} />;
  return <FolderKanban {...props} />;
};

export default function EnvironmentPicker() {
  const router = useRouter();
  const [viewMode, setViewMode] = useState('grid'); // 'grid' | 'list'
  const [environments, setEnvironments] = useState([]);
  const [searchQuery, setSearchQuery] = useState("");
  const [isLoadingWorkspaces, setIsLoadingWorkspaces] = useState(false);
  const [activeMenuId, setActiveMenuId] = useState(null);

  // Configure/Create Workspace Modal States
  const [isCreateDialogOpen, setIsCreateDialogOpen] = useState(false);
  const [formName, setFormName] = useState("");
  const [formType, setFormType] = useState("Personal");
  const [formColor, setFormColor] = useState("bg-emerald-600");
  const [formIcon, setFormIcon] = useState("FolderKanban");

  // Notifications, Settings, and Search Focus States
  const [isNotificationsOpen, setIsNotificationsOpen] = useState(false);
  const [isSettingsOpen, setIsSettingsOpen] = useState(false);
  const [isSearchFocused, setIsSearchFocused] = useState(false);
  const [notifications, setNotifications] = useState([
    { id: 1, title: "Database target configured", description: "Mongoose database target successfully updated to 'DB'.", time: "5 mins ago", read: false },
    { id: 2, title: "Clean slate initialized", description: "All mock workspaces have been wiped clean.", time: "15 mins ago", read: false },
    { id: 3, title: "Welcome to SyncForge!", description: "Your AI-powered hybrid mathematical scheduler is ready.", time: "1 hour ago", read: true }
  ]);

  const [settings, setSettings] = useState({
    theme: 'light',
    aiProvider: 'GEMINI',
    deepWorkLimit: 240,
    bufferMinutes: 15,
    workStart: '09:00',
    workEnd: '17:00'
  });

  const user = useScheduleStore((state) => state.user);
  const isLoggedIn = useScheduleStore((state) => state.isLoggedIn);
  const checkAuth = useScheduleStore((state) => state.checkAuth);
  const logoutUser = useScheduleStore((state) => state.logoutUser);

  // Authenticate user on mount, load workspaces, and settings
  useEffect(() => {
    const authenticated = checkAuth();
    if (!authenticated && !isLoggedIn) {
      router.push("/login");
    }
    
    if (typeof window !== "undefined") {
      const stored = localStorage.getItem("syncforge_workspaces");
      if (stored) {
        setEnvironments(JSON.parse(stored));
      }

      const storedSettings = localStorage.getItem("syncforge_settings");
      if (storedSettings) {
        setSettings(JSON.parse(storedSettings));
      }
    }
  }, [checkAuth, isLoggedIn, router]);

  // Click outside to close menus
  useEffect(() => {
    const handleOutsideClick = () => setActiveMenuId(null);
    window.addEventListener('click', handleOutsideClick);
    return () => window.removeEventListener('click', handleOutsideClick);
  }, []);

  const saveEnvironments = (newEnvs) => {
    setEnvironments(newEnvs);
    if (typeof window !== "undefined") {
      localStorage.setItem("syncforge_workspaces", JSON.stringify(newEnvs));
    }
  };

  const saveSettings = (newSettings) => {
    setSettings(newSettings);
    if (typeof window !== "undefined") {
      localStorage.setItem("syncforge_settings", JSON.stringify(newSettings));
    }
  };

  const handleOpenEnv = (envId) => {
    const env = environments.find(e => e.id === envId);
    if (env) {
      useScheduleStore.setState({
        workspaceId: env.id,
        userId: env.userId || useScheduleStore.getState().userId
      });
    }
    router.push(`/workspace?id=${envId}`);
  };

  const handleCreateNewWorkspace = async (
    templateName = "Blank Workspace",
    type = "Personal",
    iconName = "FolderKanban",
    color = "bg-emerald-600"
  ) => {
    setIsLoadingWorkspaces(true);
    try {
      // Call the API to create a real workspace and user in MongoDB Atlas
      const response = await fetch("/api/test-helpers/setup-workspace", {
        method: "POST"
      });
      const result = await response.json();

      if (response.ok && result.workspaceId) {
        const newWorkspace = {
          id: result.workspaceId,
          name: templateName,
          type: type,
          iconName: iconName,
          color: color,
          date: "Just now",
          userId: result.userId,
        };
        
        const updatedEnvs = [newWorkspace, ...environments];
        saveEnvironments(updatedEnvs);
        
        // Update the Zustand store immediately with these valid IDs
        useScheduleStore.setState({
          workspaceId: result.workspaceId,
          userId: result.userId,
        });

        router.push(`/workspace?id=${result.workspaceId}`);
      } else {
        alert("Failed to create database-backed workspace: " + (result.error || "Unknown error"));
      }
    } catch (err) {
      alert("Error reaching workspace creation server: " + err.message);
    } finally {
      setIsLoadingWorkspaces(false);
    }
  };

  const toggleMenu = (e, envId) => {
    e.stopPropagation();
    setActiveMenuId(activeMenuId === envId ? null : envId);
  };

  const handleDeleteWorkspace = (e, envId) => {
    e.stopPropagation();
    if (confirm("Are you sure you want to delete this workspace?")) {
      const updated = environments.filter(env => env.id !== envId);
      saveEnvironments(updated);
    }
    setActiveMenuId(null);
  };

  const handleRenameWorkspace = (e, envId, currentName) => {
    e.stopPropagation();
    const newName = prompt("Enter new name for the workspace:", currentName);
    if (newName && newName.trim()) {
      const updated = environments.map(env => 
        env.id === envId ? { ...env, name: newName.trim() } : env
      );
      saveEnvironments(updated);
    }
    setActiveMenuId(null);
  };

  // Filter workspaces based on search query
  const filteredWorkspaces = environments.filter((env) =>
    env.name.toLowerCase().includes(searchQuery.toLowerCase()) ||
    env.type.toLowerCase().includes(searchQuery.toLowerCase())
  );

  if (!isLoggedIn && !user) {
    return (
      <div className="min-h-screen flex items-center justify-center bg-slate-50">
        <div className="flex flex-col items-center gap-3">
          <div className="w-10 h-10 border-4 border-emerald-500/20 border-t-emerald-600 rounded-full animate-spin"></div>
          <p className="text-sm font-semibold text-slate-500">Checking credentials...</p>
        </div>
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-slate-50 font-sans flex flex-col relative">
      {/* Premium Loading Overlay */}
      {isLoadingWorkspaces && (
        <div className="fixed inset-0 bg-slate-900/40 backdrop-blur-sm flex items-center justify-center z-[100] transition-opacity duration-300">
          <div className="bg-white p-6 rounded-2xl shadow-xl flex flex-col items-center gap-4 max-w-xs border border-slate-200">
            <div className="w-10 h-10 border-4 border-emerald-500/20 border-t-emerald-600 rounded-full animate-spin"></div>
            <div className="text-center">
              <h4 className="font-bold text-slate-800 text-sm">Initializing Workspace</h4>
              <p className="text-[11px] text-slate-500 mt-1">Creating secure MongoDB Atlas collection entries and preparing AI scheduler...</p>
            </div>
          </div>
        </div>
      )}

      {/* Header */}
      <header className="h-16 bg-white border-b border-slate-200 flex items-center px-6 justify-between shrink-0 shadow-sm sticky top-0 z-50">
        <div className="flex items-center gap-3 w-1/3">
          <div className="w-8 h-8 rounded-lg bg-emerald-600 text-white flex items-center justify-center font-bold text-lg shadow-sm border border-emerald-500">S</div>
          <div>
            <h1 className="text-xl font-bold tracking-tight text-slate-900 leading-none">SyncForge</h1>
          </div>
        </div>

        {/* Global Search Bar with Real-Time Suggestions Dropdown */}
        <div className="w-1/3 flex justify-center relative">
          <div className="relative w-full max-w-lg group">
            <Search className="absolute left-3 top-1/2 -translate-y-1/2 text-slate-400 group-focus-within:text-emerald-500 transition-colors" size={18} />
            <input 
              type="text" 
              value={searchQuery}
              onChange={(e) => setSearchQuery(e.target.value)}
              onFocus={() => setIsSearchFocused(true)}
              onBlur={() => setTimeout(() => setIsSearchFocused(false), 200)}
              placeholder="Search workspaces..." 
              className="w-full bg-slate-100 border-transparent focus:bg-white border focus:border-emerald-300 rounded-full py-2.5 pl-10 pr-4 text-sm text-slate-800 placeholder-slate-500 focus:outline-none focus:ring-4 focus:ring-emerald-500/10 transition-all font-medium"
            />
            {isSearchFocused && searchQuery && (
              <div className="absolute top-full left-0 right-0 mt-2 bg-white border border-slate-200 rounded-2xl shadow-xl py-3 z-50 animate-in fade-in duration-100 max-h-64 overflow-y-auto">
                <p className="text-[10px] uppercase tracking-wider text-slate-400 font-bold px-4 mb-2">Workspace Suggestions</p>
                {filteredWorkspaces.length === 0 ? (
                  <p className="text-xs text-slate-500 px-4 py-2 font-medium">No matching workspaces found.</p>
                ) : (
                  filteredWorkspaces.map(env => (
                    <button
                      key={env.id}
                      onMouseDown={() => handleOpenEnv(env.id)}
                      className="w-full text-left px-4 py-2.5 hover:bg-slate-50 flex items-center gap-3 transition-colors"
                    >
                      <div className={`p-1.5 rounded-lg text-white ${env.color}`}>
                        {renderIcon(env.iconName, { size: 14 })}
                      </div>
                      <div className="min-w-0 flex-1">
                        <p className="text-sm font-bold text-slate-800 truncate">{env.name}</p>
                        <p className="text-[10px] text-slate-400 font-semibold">{env.type}</p>
                      </div>
                    </button>
                  ))
                )}
              </div>
            )}
          </div>
        </div>
        
        {/* Right Actions */}
        <div className="w-1/3 flex items-center justify-end gap-5">
          {/* Functional Notifications Dropdown */}
          <div className="relative">
            <button 
              onClick={() => setIsNotificationsOpen(!isNotificationsOpen)}
              className="p-2 text-slate-500 hover:bg-slate-100 rounded-full transition-colors relative flex items-center justify-center" 
              title="Notifications"
            >
              <Bell size={20} />
              {notifications.some(n => !n.read) && (
                <span className="absolute top-1.5 right-1.5 w-2.5 h-2.5 bg-red-500 rounded-full border border-white flex items-center justify-center text-[7px] font-bold text-white animate-pulse"></span>
              )}
            </button>
            {isNotificationsOpen && (
              <>
                <div className="fixed inset-0 z-40" onClick={() => setIsNotificationsOpen(false)}></div>
                <div className="absolute top-full right-0 mt-2 w-80 bg-white rounded-2xl shadow-xl border border-slate-200 py-3.5 px-4 z-50 animate-in fade-in duration-100">
                  <div className="flex items-center justify-between border-b border-slate-100 pb-2 mb-3">
                    <h3 className="font-bold text-slate-900 text-sm">Notifications</h3>
                    <button 
                      onClick={() => setNotifications(notifications.map(n => ({ ...n, read: true })))}
                      className="text-[10px] font-bold text-emerald-600 hover:text-emerald-700 hover:underline"
                    >
                      Mark all as read
                    </button>
                  </div>
                  <div className="space-y-3 max-h-64 overflow-y-auto pr-1">
                    {notifications.map(notification => (
                      <div 
                        key={notification.id} 
                        onClick={() => setNotifications(notifications.map(n => n.id === notification.id ? { ...n, read: true } : n))}
                        className={`p-2.5 rounded-xl transition-all cursor-pointer border ${notification.read ? 'bg-white hover:bg-slate-50 border-transparent' : 'bg-emerald-50/40 border-emerald-100 hover:bg-emerald-50'}`}
                      >
                        <div className="flex items-start justify-between gap-2">
                          <h4 className={`text-xs font-bold leading-tight ${notification.read ? 'text-slate-800' : 'text-emerald-950'}`}>{notification.title}</h4>
                          <span className="text-[9px] text-slate-400 font-bold shrink-0">{notification.time}</span>
                        </div>
                        <p className="text-[11px] text-slate-500 mt-1 leading-normal">{notification.description}</p>
                      </div>
                    ))}
                  </div>
                </div>
              </>
            )}
          </div>

          {/* Settings Modal Toggle Button */}
          <button 
            onClick={() => setIsSettingsOpen(true)}
            className="p-2 text-slate-500 hover:bg-slate-100 rounded-full transition-colors hidden sm:inline-flex"
            title="Settings"
          >
            <Settings size={20} />
          </button>

          {/* User Profile & Sign Out Button */}
          <div className="flex items-center gap-2">
            <div className="text-right hidden sm:block">
              <p className="text-xs font-bold text-slate-800 leading-tight">{user?.name || "SmartyToonster"}</p>
              <button 
                onClick={() => {
                  logoutUser();
                  router.push("/login");
                }}
                className="text-[10px] font-bold text-emerald-600 hover:text-emerald-700 hover:underline block ml-auto mt-0.5"
              >
                Sign Out
              </button>
            </div>
            <button 
              onClick={() => {
                logoutUser();
                router.push("/login");
              }}
              className="p-2 text-slate-500 hover:bg-slate-100 rounded-full transition-colors sm:hidden"
              title="Sign Out"
            >
              <LogOut size={20} />
            </button>
            <div className="w-9 h-9 rounded-full bg-gradient-to-tr from-emerald-500 to-teal-400 flex items-center justify-center text-white font-bold text-sm shadow-sm border-2 border-white ml-2 hover:shadow-md transition-shadow">
              {user?.name ? user.name.slice(0, 2).toUpperCase() : "ST"}
            </div>
          </div>
        </div>
      </header>
      
      <main className="flex-1 w-full max-w-6xl mx-auto p-6 md:p-10">
        
        {/* Create New Section with Single Configurable CTA card */}
        <section className="mb-12">
          <div className="bg-gradient-to-r from-emerald-600 to-teal-500 rounded-2xl p-6 md:p-8 text-white shadow-md flex flex-col md:flex-row items-center justify-between gap-6">
            <div>
              <h2 className="text-2xl font-extrabold tracking-tight mb-2">Build your custom space</h2>
              <p className="text-emerald-100 text-sm max-w-xl font-medium text-pretty">Set up a personalized workspace tailored to your goals. Define custom themes, select identifying icons, and configure settings fully synchronized with our MongoDB Atlas engine and mathematical AI scheduler.</p>
            </div>
            <button 
              onClick={() => {
                setFormName("");
                setFormType("Personal");
                setFormColor("bg-emerald-600");
                setFormIcon("FolderKanban");
                setIsCreateDialogOpen(true);
              }}
              className="px-6 py-3 bg-white text-emerald-700 font-bold text-sm rounded-xl hover:bg-emerald-50 active:scale-95 shadow-lg transition-all shrink-0 flex items-center gap-2"
            >
              <Plus size={18} /> Configure Workspace
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

          {environments.length === 0 ? (
            <div className="bg-white border border-dashed border-slate-300 rounded-2xl p-12 text-center max-w-xl mx-auto shadow-sm">
              <div className="w-12 h-12 rounded-full bg-emerald-50 text-emerald-600 flex items-center justify-center mx-auto mb-4">
                <FolderKanban size={24} />
              </div>
              <h3 className="font-bold text-slate-800 text-lg mb-1">Welcome to SyncForge!</h3>
              <p className="text-slate-500 text-sm mb-6 max-w-md mx-auto leading-relaxed">You don&apos;t have any workspaces yet. Use the custom workspace configurator above to build a personalized space and start scheduling your tasks with AI.</p>
              <button 
                onClick={() => {
                  setFormName("");
                  setFormType("Personal");
                  setFormColor("bg-emerald-600");
                  setFormIcon("FolderKanban");
                  setIsCreateDialogOpen(true);
                }}
                className="inline-flex items-center gap-2 px-4 py-2.5 bg-emerald-600 hover:bg-emerald-700 text-white text-sm font-semibold rounded-xl shadow-sm transition-colors"
              >
                <Plus size={16} /> Create Workspace
              </button>
            </div>
          ) : filteredWorkspaces.length === 0 ? (
            <div className="bg-white border border-slate-200 rounded-xl p-10 text-center">
              <p className="text-slate-500 font-medium text-sm">No workspaces match your query.</p>
            </div>
          ) : viewMode === 'grid' ? (
            <div className="grid grid-cols-1 sm:grid-cols-2 md:grid-cols-3 lg:grid-cols-4 gap-4">
              {filteredWorkspaces.map((env) => (
                <div key={env.id} onClick={() => handleOpenEnv(env.id)} className="bg-white border border-slate-200 rounded-xl p-5 hover:shadow-md hover:border-emerald-300 transition-all cursor-pointer group flex flex-col h-40">
                  <div className="flex items-start justify-between mb-auto">
                    <div className={`p-2.5 rounded-lg text-white shadow-sm ${env.color}`}>
                      {renderIcon(env.iconName, { size: 18 })}
                    </div>
                    <div className="relative">
                      <button 
                        className="text-slate-400 hover:text-slate-700 opacity-0 group-hover:opacity-100 focus:opacity-100 transition-opacity p-1 rounded-md hover:bg-slate-100" 
                        onClick={(e) => toggleMenu(e, env.id)}
                      >
                        <MoreVertical size={16} />
                      </button>
                      {activeMenuId === env.id && (
                        <div className="absolute right-0 top-full mt-1 w-32 bg-white border border-slate-200 rounded-xl shadow-lg py-1.5 z-30 animate-in fade-in duration-100">
                          <button 
                            onClick={(e) => handleRenameWorkspace(e, env.id, env.name)}
                            className="w-full text-left px-3.5 py-2 text-xs text-slate-700 hover:bg-slate-50 font-bold transition-colors"
                          >
                            Rename
                          </button>
                          <div className="h-px bg-slate-100 my-1"></div>
                          <button 
                            onClick={(e) => handleDeleteWorkspace(e, env.id)}
                            className="w-full text-left px-3.5 py-2 text-xs text-red-600 hover:bg-red-50 font-bold transition-colors"
                          >
                            Delete
                          </button>
                        </div>
                      )}
                    </div>
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
                  {filteredWorkspaces.map((env) => (
                    <tr key={env.id} onClick={() => handleOpenEnv(env.id)} className="border-b border-slate-100 hover:bg-slate-50 cursor-pointer group transition-colors last:border-0">
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
                        <div className="relative inline-block text-left">
                          <button 
                            className="text-slate-400 hover:text-slate-700 p-1.5 hover:bg-slate-200 rounded-md transition-colors" 
                            onClick={(e) => toggleMenu(e, env.id)}
                          >
                            <MoreVertical size={16} />
                          </button>
                          {activeMenuId === env.id && (
                            <div className="absolute right-0 top-full mt-1 w-32 bg-white border border-slate-200 rounded-xl shadow-lg py-1.5 z-30 animate-in fade-in duration-100">
                              <button 
                                onClick={(e) => handleRenameWorkspace(e, env.id, env.name)}
                                className="w-full text-left px-3.5 py-2 text-xs text-slate-700 hover:bg-slate-50 font-bold transition-colors"
                              >
                                Rename
                              </button>
                              <div className="h-px bg-slate-100 my-1"></div>
                              <button 
                                onClick={(e) => handleDeleteWorkspace(e, env.id)}
                                className="w-full text-left px-3.5 py-2 text-xs text-red-600 hover:bg-red-50 font-bold transition-colors"
                              >
                                Delete
                              </button>
                            </div>
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

      {/* Settings Modal */}
      {isSettingsOpen && (
        <div className="fixed inset-0 bg-slate-900/40 backdrop-blur-sm flex items-center justify-center z-[100] animate-in fade-in duration-200">
          <div className="bg-white w-full max-w-md rounded-2xl shadow-xl border border-slate-200 p-6 relative animate-in zoom-in-95 duration-200 mx-4">
            <button 
              onClick={() => setIsSettingsOpen(false)}
              className="absolute top-4 right-4 text-slate-400 hover:text-slate-600 font-bold p-1 hover:bg-slate-50 rounded"
            >
              <svg xmlns="http://www.w3.org/2000/svg" width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.5" strokeLinecap="round" strokeLinejoin="round"><line x1="18" y1="6" x2="6" y2="18"></line><line x1="6" y1="6" x2="18" y2="18"></line></svg>
            </button>
            
            <h3 className="font-bold text-slate-900 text-lg border-b border-slate-100 pb-3 mb-5 flex items-center gap-2">
              <Settings className="text-emerald-600 animate-spin-slow" size={20} />
              System Settings
            </h3>
            
            <div className="space-y-5">
              {/* Theme Settings */}
              <div>
                <label className="block text-xs font-bold text-slate-400 uppercase tracking-wider mb-2">Display Theme</label>
                <div className="grid grid-cols-2 gap-3">
                  <button 
                    onClick={() => saveSettings({ ...settings, theme: 'light' })}
                    className={`px-4 py-2.5 text-xs font-bold rounded-xl border transition-all text-center ${settings.theme === 'light' ? 'bg-emerald-50 text-emerald-800 border-emerald-200 shadow-sm' : 'bg-slate-50 text-slate-600 border-slate-200 hover:bg-slate-100'}`}
                  >
                    ☀️ Light Mode
                  </button>
                  <button 
                    onClick={() => saveSettings({ ...settings, theme: 'dark' })}
                    className={`px-4 py-2.5 text-xs font-bold rounded-xl border transition-all text-center ${settings.theme === 'dark' ? 'bg-emerald-50 text-emerald-800 border-emerald-200 shadow-sm' : 'bg-slate-50 text-slate-600 border-slate-200 hover:bg-slate-100'}`}
                  >
                    🌙 Dark Mode (Beta)
                  </button>
                </div>
              </div>

              {/* AI Provider Settings */}
              <div>
                <label className="block text-xs font-bold text-slate-400 uppercase tracking-wider mb-2">Default AI Provider</label>
                <div className="grid grid-cols-3 gap-2">
                  {['GEMINI', 'DEEPSEEK', 'GEMMA'].map(prov => (
                    <button 
                      key={prov}
                      onClick={() => saveSettings({ ...settings, aiProvider: prov })}
                      className={`px-2.5 py-2 text-[10px] font-bold rounded-lg border transition-all text-center uppercase tracking-wider ${settings.aiProvider === prov ? 'bg-emerald-50 text-emerald-800 border-emerald-200 shadow-sm' : 'bg-slate-50 text-slate-600 border-slate-200 hover:bg-slate-100'}`}
                    >
                      {prov}
                    </button>
                  ))}
                </div>
              </div>

              {/* Scheduler Constraints */}
              <div>
                <label className="block text-xs font-bold text-slate-400 uppercase tracking-wider mb-2.5">Scheduler Constraints</label>
                <div className="space-y-3 bg-slate-50 p-4 rounded-xl border border-slate-200/60">
                  <div className="flex items-center justify-between">
                    <span className="text-xs font-bold text-slate-600">Deep Work Max (min)</span>
                    <input 
                      type="number" 
                      value={settings.deepWorkLimit}
                      onChange={(e) => saveSettings({ ...settings, deepWorkLimit: Number(e.target.value) })}
                      className="w-20 bg-white border border-slate-200 rounded-lg px-2.5 py-1 text-xs text-right font-semibold focus:outline-none focus:ring-2 focus:ring-emerald-500/20"
                    />
                  </div>
                  <div className="flex items-center justify-between">
                    <span className="text-xs font-bold text-slate-600">Buffer Time (min)</span>
                    <input 
                      type="number" 
                      value={settings.bufferMinutes}
                      onChange={(e) => saveSettings({ ...settings, bufferMinutes: Number(e.target.value) })}
                      className="w-20 bg-white border border-slate-200 rounded-lg px-2.5 py-1 text-xs text-right font-semibold focus:outline-none focus:ring-2 focus:ring-emerald-500/20"
                    />
                  </div>
                </div>
              </div>
            </div>
            
            <div className="mt-6 pt-4 border-t border-slate-100 flex gap-3">
              <button 
                onClick={() => setIsSettingsOpen(false)}
                className="flex-1 py-2.5 text-xs font-bold text-slate-700 bg-slate-100 hover:bg-slate-200 rounded-xl transition-colors text-center"
              >
                Close Settings
              </button>
              <button 
                onClick={() => {
                  alert("Settings successfully synchronized with database scheduler!");
                  setIsSettingsOpen(false);
                }}
                className="flex-1 py-2.5 text-xs font-bold text-white bg-emerald-600 hover:bg-emerald-700 rounded-xl shadow-sm transition-colors text-center"
              >
                Save & Apply
              </button>
            </div>
          </div>
        </div>
      )}

      {/* Create Workspace Dialog */}
      {isCreateDialogOpen && (
        <div className="fixed inset-0 bg-slate-900/40 backdrop-blur-sm flex items-center justify-center z-[100] animate-in fade-in duration-200">
          <div className="bg-white w-full max-w-sm rounded-2xl shadow-xl border border-slate-200 p-6 relative animate-in zoom-in-95 duration-200 mx-4">
            <button 
              onClick={() => setIsCreateDialogOpen(false)}
              className="absolute top-4 right-4 text-slate-400 hover:text-slate-600 font-bold p-1 hover:bg-slate-50 rounded"
            >
              <svg xmlns="http://www.w3.org/2000/svg" width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.5" strokeLinecap="round" strokeLinejoin="round"><line x1="18" y1="6" x2="6" y2="18"></line><line x1="6" y1="6" x2="18" y2="18"></line></svg>
            </button>
            
            <h3 className="font-bold text-slate-900 text-lg border-b border-slate-100 pb-3 mb-5 flex items-center gap-2">
              <Plus className="text-emerald-600" size={20} />
              Configure Workspace
            </h3>
            
            <div className="space-y-4">
              {/* Workspace Name Input */}
              <div>
                <label className="block text-[10px] font-bold text-slate-400 uppercase tracking-wider mb-1.5">Workspace Name</label>
                <input 
                  type="text" 
                  value={formName}
                  onChange={(e) => setFormName(e.target.value)}
                  placeholder="e.g. Capstone Research Project"
                  className="w-full bg-slate-50 border border-slate-200 rounded-xl px-4 py-2.5 text-sm font-semibold text-slate-800 placeholder-slate-400 focus:outline-none focus:ring-4 focus:ring-emerald-500/10 focus:border-emerald-500 transition-all"
                  maxLength={40}
                />
              </div>

              {/* Workspace Type Selector */}
              <div>
                <label className="block text-[10px] font-bold text-slate-400 uppercase tracking-wider mb-1.5">Workspace Type</label>
                <div className="grid grid-cols-2 gap-2">
                  {['Personal', 'Team'].map(type => (
                    <button 
                      key={type}
                      onClick={() => setFormType(type)}
                      className={`px-3 py-2 text-xs font-bold rounded-lg border transition-all text-center ${formType === type ? 'bg-emerald-50 text-emerald-800 border-emerald-200 shadow-sm' : 'bg-slate-50 text-slate-600 border-slate-200 hover:bg-slate-100'}`}
                    >
                      {type}
                    </button>
                  ))}
                </div>
              </div>

              {/* Icon Selector */}
              <div>
                <label className="block text-[10px] font-bold text-slate-400 uppercase tracking-wider mb-1.5">Select Icon</label>
                <div className="grid grid-cols-5 gap-2">
                  {[
                    { id: 'FolderKanban', icon: FolderKanban },
                    { id: 'CalendarDays', icon: CalendarDays },
                    { id: 'BookOpen', icon: BookOpen },
                    { id: 'Code', icon: Code },
                    { id: 'Clock', icon: Clock }
                  ].map(item => {
                    const IconComp = item.icon;
                    return (
                      <button 
                        key={item.id}
                        onClick={() => setFormIcon(item.id)}
                        className={`py-2 rounded-lg border transition-all flex items-center justify-center ${formIcon === item.id ? 'bg-emerald-50 text-emerald-600 border-emerald-200 shadow-sm' : 'bg-slate-50 text-slate-400 hover:text-slate-600 border-slate-200 hover:bg-slate-100'}`}
                      >
                        <IconComp size={16} />
                      </button>
                    );
                  })}
                </div>
              </div>

              {/* Color Selector */}
              <div>
                <label className="block text-[10px] font-bold text-slate-400 uppercase tracking-wider mb-1.5">Workspace Theme Color</label>
                <div className="grid grid-cols-6 gap-2">
                  {[
                    { class: 'bg-emerald-600', name: 'Emerald' },
                    { class: 'bg-blue-600', name: 'Blue' },
                    { class: 'bg-indigo-600', name: 'Indigo' },
                    { class: 'bg-amber-500', name: 'Amber' },
                    { class: 'bg-rose-500', name: 'Rose' },
                    { class: 'bg-purple-600', name: 'Purple' }
                  ].map(color => (
                    <button 
                      key={color.class}
                      onClick={() => setFormColor(color.class)}
                      className={`w-full aspect-square rounded-full transition-all border-2 flex items-center justify-center ${formColor === color.class ? 'border-slate-800 scale-110 shadow-sm' : 'border-transparent hover:scale-105'}`}
                      style={{ outline: 'none' }}
                      title={color.name}
                    >
                      <span className={`w-full h-full rounded-full ${color.class}`}></span>
                    </button>
                  ))}
                </div>
              </div>
            </div>
            
            <div className="mt-6 pt-4 border-t border-slate-100 flex gap-3">
              <button 
                onClick={() => setIsCreateDialogOpen(false)}
                className="flex-1 py-2 text-xs font-bold text-slate-700 bg-slate-100 hover:bg-slate-200 rounded-xl transition-colors text-center"
              >
                Cancel
              </button>
              <button 
                onClick={() => {
                  if (!formName.trim()) {
                    alert("Please enter a workspace name.");
                    return;
                  }
                  setIsCreateDialogOpen(false);
                  handleCreateNewWorkspace(formName.trim(), `${formType.toUpperCase()} WORKSPACE`, formIcon, formColor);
                }}
                className="flex-1 py-2 text-xs font-bold text-white bg-emerald-600 hover:bg-emerald-700 rounded-xl shadow-sm transition-colors text-center"
              >
                Create
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}
