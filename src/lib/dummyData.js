const today = new Date();
const getDay = (offsetDays, hours) => {
  const d = new Date(today);
  d.setDate(today.getDate() + offsetDays);
  d.setHours(hours, 0, 0, 0);
  return d;
};

export const dummyEnvironments = [
  { id: 1, name: "Capstone Project", type: "Team Workspace", date: "Opened 2 hours ago", color: "bg-emerald-500", iconName: "FolderKanban" },
  { id: 2, name: "Personal Errands", type: "Personal", date: "Opened yesterday", color: "bg-blue-500", iconName: "CalendarDays" },
  { id: 3, name: "Hackathon Prep", type: "Team Workspace", date: "Opened 3 days ago", color: "bg-purple-500", iconName: "FolderKanban" },
  { id: 4, name: "Final Exams Study", type: "Personal", date: "Opened last week", color: "bg-amber-500", iconName: "CalendarDays" }
];

export const dummyEvents = [
  // Today's Events
  {
    id: "evt_1",
    title: "Write Thesis Intro (Part 1)",
    start: getDay(0, 9),
    end: getDay(0, 10),
    backgroundColor: "#10b981", 
    borderColor: "#059669",
    extendedProps: {
      description: `<p>Draft the first 3 pages of the introduction. Focus on the main argument.</p>`,
      cognitive_load: "High",
      assigned_to: "SmartyToonster"
    }
  },
  {
    id: "evt_2",
    title: "Write Thesis Intro (Part 2)",
    start: new Date(getDay(0, 10).setMinutes(15)),
    end: new Date(getDay(0, 11).setMinutes(15)),
    backgroundColor: "#10b981",
    borderColor: "#059669",
    extendedProps: {
      description: `<p>Edit and refine the thesis statement. Make sure to check against the rubric.</p>`,
      cognitive_load: "High",
      assigned_to: "SmartyToonster"
    }
  },
  {
    id: "evt_3",
    title: "Review Bio Chapters 4-6",
    start: getDay(0, 13),
    end: getDay(0, 14),
    backgroundColor: "#3b82f6",
    borderColor: "#2563eb",
    extendedProps: {
      description: `<p>Quick review of the textbook chapters before the quiz.</p>`,
      cognitive_load: "Low",
      assigned_to: "SmartyToonster"
    }
  },
  // Yesterday
  {
    id: "evt_4",
    title: "Project Architecture Planning",
    start: getDay(-1, 10),
    end: getDay(-1, 12),
    backgroundColor: "#8b5cf6",
    borderColor: "#7c3aed",
    extendedProps: {
      description: `
        <p>This task involves a deep dive into the following requirements:</p>
        <ul class="list-disc pl-5 mt-2 space-y-1 text-sm">
          <li>Review the <strong>CodeKada Specs.md</strong> architectural guidelines.</li>
          <li>Setup the Next.js foundation and TailwindCSS v4.</li>
          <li>Implement the AI Phase 1 engine (Gemini API).</li>
        </ul>
        <p class="mt-3 p-2 bg-purple-50 text-purple-800 rounded border border-purple-100 text-xs"><strong>Notes:</strong> Please coordinate with the backend team regarding the Mongoose schemas.</p>
      `,
      cognitive_load: "Very High",
      assigned_to: "Backend Team"
    }
  },
  // Tomorrow
  {
    id: "evt_5",
    title: "Algorithm Optimization",
    start: getDay(1, 14),
    end: getDay(1, 16),
    backgroundColor: "#f59e0b",
    borderColor: "#d97706",
    extendedProps: {
      description: `
        <p>Refine the deterministic Bin-Packing scheduler. The current Big-O complexity is too high.</p>
        <div class="mt-3 border rounded overflow-hidden">
          <table class="w-full text-left text-xs">
            <thead class="bg-slate-50 border-b"><tr><th class="p-2">Phase</th><th class="p-2">Current</th><th class="p-2">Target</th></tr></thead>
            <tbody>
              <tr class="border-b"><td class="p-2">Parsing</td><td class="p-2 text-red-500">O(N^2)</td><td class="p-2 text-emerald-500">O(N log N)</td></tr>
              <tr><td class="p-2">Bin-Packing</td><td class="p-2 text-amber-500">O(2^N)</td><td class="p-2 text-emerald-500">O(N * W)</td></tr>
            </tbody>
          </table>
        </div>
      `,
      cognitive_load: "High",
      assigned_to: "SmartyToonster"
    }
  },
  // Next Week
  {
    id: "evt_6",
    title: "Client Presentation",
    start: getDay(4, 9),
    end: getDay(4, 10),
    backgroundColor: "#ec4899",
    borderColor: "#db2777",
    extendedProps: {
      description: `<p>Present the finalized MVP to the Hackathon judges.</p>`,
      cognitive_load: "Medium",
      assigned_to: "All Team Members"
    }
  },
  // Imported Busy Block
  {
    id: "evt_busy",
    title: "Busy (Google Cal)",
    start: new Date(getDay(0, 11).setMinutes(30)),
    end: new Date(getDay(0, 12).setMinutes(30)),
    backgroundColor: "#cbd5e1",
    borderColor: "#94a3b8",
    textColor: "#475569",
    extendedProps: {
      description: `<p>External meeting imported from Google Calendar. Visibility is private.</p>`,
      cognitive_load: "N/A",
      assigned_to: "SmartyToonster"
    }
  }
];
