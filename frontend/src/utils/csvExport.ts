// CSV Export Utilities for FamilyHub

interface FamilyMember {
  id: bigint;
  name: string;
  color: string;
  avatarEmoji: string;
  role: string;
}

interface Chore {
  id: bigint;
  title: string;
  description: string;
  assignedTo?: bigint;
  dueDate: bigint;
  recurrence: string;
  isCompleted: boolean;
  createdAt: bigint;
}

interface MoodEntry {
  id: bigint;
  memberId: bigint;
  mood: string;
  note: string;
  date: bigint;
  createdAt: bigint;
}

interface CalendarEvent {
  id: bigint;
  title: string;
  description: string;
  startDate: bigint;
  endDate: bigint;
  memberIds: bigint[];
  eventType: string;
  createdAt: bigint;
}

interface ShoppingItem {
  id: bigint;
  name: string;
  quantity: string;
  category: string;
  addedBy: bigint;
  isCompleted: boolean;
  createdAt: bigint;
}

// Helper to escape CSV values
function escapeCSV(value: string): string {
  if (value.includes(",") || value.includes('"') || value.includes("\n")) {
    return `"${value.replace(/"/g, '""')}"`;
  }
  return value;
}

// Format bigint timestamp to readable date string
function formatDate(timestamp: bigint): string {
  const date = new Date(Number(timestamp) / 1_000_000);
  return date.toISOString().replace("T", " ").substring(0, 19);
}

// Format date for display (shorter format)
function formatDateShort(timestamp: bigint): string {
  const date = new Date(Number(timestamp) / 1_000_000);
  return date.toLocaleDateString();
}

// Create member lookup map
function createMemberMap(members: FamilyMember[]): Map<string, FamilyMember> {
  return new Map(members.map((m) => [m.id.toString(), m]));
}

// Export Chores to CSV
export function exportChoresCSV(
  chores: Chore[],
  members: FamilyMember[],
): string {
  const memberMap = createMemberMap(members);
  const headers = [
    "ID",
    "Title",
    "Description",
    "Assigned To",
    "Due Date",
    "Recurrence",
    "Completed",
    "Created At",
  ];

  const rows = chores.map((chore) => {
    const assignedMember = chore.assignedTo
      ? memberMap.get(chore.assignedTo.toString())?.name || "Unknown"
      : "Unassigned";

    return [
      chore.id.toString(),
      escapeCSV(chore.title),
      escapeCSV(chore.description),
      escapeCSV(assignedMember),
      formatDateShort(chore.dueDate),
      escapeCSV(chore.recurrence),
      chore.isCompleted ? "Yes" : "No",
      formatDate(chore.createdAt),
    ].join(",");
  });

  return [headers.join(","), ...rows].join("\n");
}

// Export Mood Entries to CSV
export function exportMoodsCSV(
  moods: MoodEntry[],
  members: FamilyMember[],
): string {
  const memberMap = createMemberMap(members);
  const headers = ["ID", "Member", "Mood", "Note", "Date", "Created At"];

  const rows = moods.map((mood) => {
    const member = memberMap.get(mood.memberId.toString());
    return [
      mood.id.toString(),
      escapeCSV(member?.name || "Unknown"),
      escapeCSV(mood.mood),
      escapeCSV(mood.note),
      formatDate(mood.date),
      formatDate(mood.createdAt),
    ].join(",");
  });

  return [headers.join(","), ...rows].join("\n");
}

// Export Calendar Events to CSV
export function exportEventsCSV(
  events: CalendarEvent[],
  members: FamilyMember[],
): string {
  const memberMap = createMemberMap(members);
  const headers = [
    "ID",
    "Title",
    "Description",
    "Start Date",
    "End Date",
    "Event Type",
    "Members",
    "Created At",
  ];

  const rows = events.map((event) => {
    const memberNames = event.memberIds
      .map((id) => memberMap.get(id.toString())?.name || "Unknown")
      .join("; ");

    return [
      event.id.toString(),
      escapeCSV(event.title),
      escapeCSV(event.description),
      formatDate(event.startDate),
      formatDate(event.endDate),
      escapeCSV(event.eventType),
      escapeCSV(memberNames),
      formatDate(event.createdAt),
    ].join(",");
  });

  return [headers.join(","), ...rows].join("\n");
}

// Export Shopping Items to CSV
export function exportShoppingCSV(
  items: ShoppingItem[],
  members: FamilyMember[],
): string {
  const memberMap = createMemberMap(members);
  const headers = [
    "ID",
    "Name",
    "Quantity",
    "Category",
    "Added By",
    "Completed",
    "Created At",
  ];

  const rows = items.map((item) => {
    const addedByMember =
      memberMap.get(item.addedBy.toString())?.name || "Unknown";

    return [
      item.id.toString(),
      escapeCSV(item.name),
      escapeCSV(item.quantity),
      escapeCSV(item.category),
      escapeCSV(addedByMember),
      item.isCompleted ? "Yes" : "No",
      formatDate(item.createdAt),
    ].join(",");
  });

  return [headers.join(","), ...rows].join("\n");
}

// Download CSV file
export function downloadCSV(content: string, filename: string): void {
  const blob = new Blob([content], { type: "text/csv;charset=utf-8;" });
  const link = document.createElement("a");
  const url = URL.createObjectURL(blob);

  link.setAttribute("href", url);
  link.setAttribute("download", filename);
  link.style.visibility = "hidden";

  document.body.appendChild(link);
  link.click();
  document.body.removeChild(link);

  URL.revokeObjectURL(url);
}

// Generate filename with date (using local timezone)
export function generateFilename(prefix: string): string {
  const today = new Date();
  const year = today.getFullYear();
  const month = String(today.getMonth() + 1).padStart(2, "0");
  const day = String(today.getDate()).padStart(2, "0");
  const date = `${year}-${month}-${day}`;
  return `familyhub_${prefix}_${date}.csv`;
}
