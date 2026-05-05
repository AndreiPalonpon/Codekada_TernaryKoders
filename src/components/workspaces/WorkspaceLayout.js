"use client";

import React, { useState } from "react";
import WorkspaceSidebar from "./WorkspaceSidebar";
import WorkspaceHeader from "./WorkspaceHeader";

export default function WorkspaceLayout({ 
  children,
  // Extensibility Hook: Allow any new page to override Header or Sidebar features
  headerProps = {},
  sidebarProps = {}
}) {
  const [isExpanded, setIsExpanded] = useState(true);

  return (
    <div className="flex h-screen w-full bg-slate-50 overflow-hidden font-sans">
      
      {/* Extensible Sidebar Component */}
      <WorkspaceSidebar 
        isExpanded={isExpanded} 
        setIsExpanded={setIsExpanded} 
        {...sidebarProps} 
      />
      
      {/* Main Content Area */}
      <main className="flex-1 overflow-hidden flex flex-col relative z-0">
        
        {/* Extensible Header Component */}
        <WorkspaceHeader {...headerProps} />
        
        {/* App Content Body */}
        <div className="flex-1 overflow-hidden p-4 md:p-6 h-full w-full bg-slate-50">
          {children}
        </div>
      </main>
      
    </div>
  );
}
