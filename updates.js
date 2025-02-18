export const updates = [
  {
    version: "0.8.0",
    date: "February 2025",
    title: "Initial Release",
    changes: [
      "Launch of Smart Note with core features",
      "Add notes and open note editor",
      "Basic note tracking functionality",
      "light mode support",
      "Download note groups to share with other users",
      "Upload note groups sent by other users to add to your notes"
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
