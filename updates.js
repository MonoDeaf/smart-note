export const updates = [
  {
    version: "0.8.2",
    date: "February 2024",
    title: "Notes & Updates Page",
    changes: [
      "Added new Updates page to track app changes",
      "Introduced task notes feature",
      "Enhanced mobile responsiveness across all pages",
      "Improved group customization with vertical scrolling",
      "Fixed sidebar overlap issues on mobile devices",
      "Resolved task completion animation glitches"
    ]
  },
  {
    version: "0.8.1",
    date: "February 2024",
    title: "Task Due Dates",
    changes: [
      "Added task due dates with flexible presets",
      "Introduced detailed task analytics",
      "Enhanced dark/light mode transitions",
      "Fixed group deletion confirmation dialog"
    ]
  },
  {
    version: "0.8.0",
    date: "January 2024",
    title: "Initial Release",
    changes: [
      "Launch of Smart Task with core features",
      "Task group management system",
      "Basic task tracking functionality",
      "Dark mode support"
    ]
  }
];

export function getLatestVersion() {
  return updates[0].version;
}

export function getLastSeenVersion() {
  return localStorage.getItem('lastSeenVersion') || '0.0.0';
}

export function setLastSeenVersion(version) {
  localStorage.setItem('lastSeenVersion', version);
}

export function hasNewUpdates() {
  const lastSeen = getLastSeenVersion();
  const latest = getLatestVersion();
  return lastSeen !== latest;
}