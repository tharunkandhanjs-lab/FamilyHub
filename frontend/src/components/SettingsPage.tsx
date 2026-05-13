import React, { useMemo } from "react";
import {
  useDataCounts,
  useIsAdmin,
  useFamilyMembers,
  useChores,
  useMoodEntries,
  useCalendarEvents,
  useShoppingItems,
  useMyMember,
} from "../hooks/useQueries";
import {
  exportChoresCSV,
  exportMoodsCSV,
  exportEventsCSV,
  exportShoppingCSV,
  downloadCSV,
  generateFilename,
} from "../utils/csvExport";

import { PageCard } from "./shared/PageCard";
import { Button } from "@/components/ui/button";
import { Download } from "lucide-react";
import { useTheme } from "next-themes";
import { Progress } from "@/components/ui/progress";
import { toast } from "sonner";

export const SettingsPage: React.FC = () => {
  const { data: counts } = useDataCounts();
  const { data: isAdmin } = useIsAdmin();
  const { data: members = [] } = useFamilyMembers();
  const { data: chores = [] } = useChores();
  const { data: moods = [] } = useMoodEntries();
  const { data: events = [] } = useCalendarEvents();
  const { data: shoppingItems = [] } = useShoppingItems();
  const { data: myMember } = useMyMember();
  const { theme, setTheme } = useTheme();

  // Personal stats for current user
  const personalStats = useMemo(() => {
    if (!myMember)
      return { choresCompleted: 0, moodCheckIns: 0, eventsAttended: 0 };

    const choresCompleted = chores.filter(
      (c) => c.assignedTo === myMember.id && c.isCompleted,
    ).length;

    const moodCheckIns = moods.filter((m) => m.memberId === myMember.id).length;

    const eventsAttended = events.filter((e) =>
      e.memberIds.includes(myMember.id),
    ).length;

    return { choresCompleted, moodCheckIns, eventsAttended };
  }, [myMember, chores, moods, events]);

  const handleExportChores = () => {
    if (chores.length === 0) {
      toast.error("No chores to export");
      return;
    }
    const csv = exportChoresCSV(chores, members);
    downloadCSV(csv, generateFilename("chores"));
    toast.success(`Exported ${chores.length} chores`);
  };

  const handleExportMoods = () => {
    if (moods.length === 0) {
      toast.error("No mood entries to export");
      return;
    }
    const csv = exportMoodsCSV(moods, members);
    downloadCSV(csv, generateFilename("moods"));
    toast.success(`Exported ${moods.length} mood entries`);
  };

  const handleExportEvents = () => {
    if (events.length === 0) {
      toast.error("No calendar events to export");
      return;
    }
    const csv = exportEventsCSV(events, members);
    downloadCSV(csv, generateFilename("events"));
    toast.success(`Exported ${events.length} events`);
  };

  const handleExportShopping = () => {
    if (shoppingItems.length === 0) {
      toast.error("No shopping items to export");
      return;
    }
    const csv = exportShoppingCSV(shoppingItems, members);
    downloadCSV(csv, generateFilename("shopping"));
    toast.success(`Exported ${shoppingItems.length} shopping items`);
  };

  const handleExportAll = () => {
    let exportCount = 0;
    if (chores.length > 0) {
      const csv = exportChoresCSV(chores, members);
      downloadCSV(csv, generateFilename("chores"));
      exportCount++;
    }
    if (moods.length > 0) {
      const csv = exportMoodsCSV(moods, members);
      downloadCSV(csv, generateFilename("moods"));
      exportCount++;
    }
    if (events.length > 0) {
      const csv = exportEventsCSV(events, members);
      downloadCSV(csv, generateFilename("events"));
      exportCount++;
    }
    if (shoppingItems.length > 0) {
      const csv = exportShoppingCSV(shoppingItems, members);
      downloadCSV(csv, generateFilename("shopping"));
      exportCount++;
    }
    if (exportCount === 0) {
      toast.error("No data to export");
    } else {
      toast.success(`Exported ${exportCount} file(s)`);
    }
  };

  return (
    <div className="space-y-6">
      {/* Header */}
      <div>
        <h2 className="text-3xl text-foreground">Settings</h2>
        <p className="text-sm text-muted-foreground mt-1">
          Manage your preferences and view app information
        </p>
      </div>

      {/* Data Summary */}
      <PageCard
        title="Data Summary"
        subtitle="Your family hub data at a glance"
      >
        <div className="grid grid-cols-2 md:grid-cols-3 lg:grid-cols-6 gap-4">
          <div className="text-center p-4 bg-secondary rounded-lg border border-border">
            <div className="text-2xl text-foreground">
              {counts?.members || 0}
            </div>
            <div className="text-sm text-muted-foreground">Members</div>
            <Progress
              value={Math.min(((counts?.members || 0) / 10) * 100, 100)}
              className="h-1 mt-2"
            />
          </div>
          <div className="text-center p-4 bg-secondary rounded-lg border border-border">
            <div className="text-2xl text-foreground">
              {counts?.moodEntries || 0}
            </div>
            <div className="text-sm text-muted-foreground">Moods</div>
            <Progress
              value={Math.min(((counts?.moodEntries || 0) / 100) * 100, 100)}
              className="h-1 mt-2"
            />
          </div>
          <div className="text-center p-4 bg-secondary rounded-lg border border-border">
            <div className="text-2xl text-foreground">
              {counts?.events || 0}
            </div>
            <div className="text-sm text-muted-foreground">Events</div>
            <Progress
              value={Math.min(((counts?.events || 0) / 50) * 100, 100)}
              className="h-1 mt-2"
            />
          </div>
          <div className="text-center p-4 bg-secondary rounded-lg border border-border">
            <div className="text-2xl text-foreground">
              {counts?.chores || 0}
            </div>
            <div className="text-sm text-muted-foreground">Chores</div>
            <Progress
              value={Math.min(((counts?.chores || 0) / 100) * 100, 100)}
              className="h-1 mt-2"
            />
          </div>
          <div className="text-center p-4 bg-secondary rounded-lg border border-border">
            <div className="text-2xl text-foreground">{counts?.meals || 0}</div>
            <div className="text-sm text-muted-foreground">Meals</div>
            <Progress
              value={Math.min(((counts?.meals || 0) / 50) * 100, 100)}
              className="h-1 mt-2"
            />
          </div>
          <div className="text-center p-4 bg-secondary rounded-lg border border-border">
            <div className="text-2xl text-foreground">
              {counts?.shoppingItems || 0}
            </div>
            <div className="text-sm text-muted-foreground">Shopping</div>
            <Progress
              value={Math.min(((counts?.shoppingItems || 0) / 50) * 100, 100)}
              className="h-1 mt-2"
            />
          </div>
        </div>
      </PageCard>

      {/* Export Data */}
      <PageCard title="Export Data" subtitle="Download your data as CSV files">
        <p className="text-sm text-muted-foreground mb-4">
          Download your family data as CSV files for backup or analysis.
        </p>
        <div className="grid grid-cols-2 md:grid-cols-5 gap-3">
          <Button
            variant="outline"
            onClick={handleExportChores}
            className="h-auto px-4 py-3 bg-primary/10 text-primary hover:bg-primary/20 flex flex-col items-center gap-1 border-primary/20"
          >
            <Download className="w-5 h-5" />
            <span className="text-sm">Chores</span>
            <span className="text-xs text-muted-foreground">
              {chores.length} items
            </span>
          </Button>
          <Button
            variant="outline"
            onClick={handleExportMoods}
            className="h-auto px-4 py-3 bg-purple-500/10 dark:bg-purple-500/20 text-purple-400 dark:text-purple-300 hover:bg-purple-500/20 dark:hover:bg-purple-500/30 flex flex-col items-center gap-1 border-purple-500/20 dark:border-purple-500/30"
          >
            <Download className="w-5 h-5" />
            <span className="text-sm">Moods</span>
            <span className="text-xs text-muted-foreground">
              {moods.length} items
            </span>
          </Button>
          <Button
            variant="outline"
            onClick={handleExportEvents}
            className="h-auto px-4 py-3 bg-blue-500/10 dark:bg-blue-500/20 text-blue-400 dark:text-blue-300 hover:bg-blue-500/20 dark:hover:bg-blue-500/30 flex flex-col items-center gap-1 border-blue-500/20 dark:border-blue-500/30"
          >
            <Download className="w-5 h-5" />
            <span className="text-sm">Events</span>
            <span className="text-xs text-muted-foreground">
              {events.length} items
            </span>
          </Button>
          <Button
            variant="outline"
            onClick={handleExportShopping}
            className="h-auto px-4 py-3 bg-teal-500/10 dark:bg-teal-500/20 text-teal-400 dark:text-teal-300 hover:bg-teal-500/20 dark:hover:bg-teal-500/30 flex flex-col items-center gap-1 border-teal-500/20 dark:border-teal-500/30"
          >
            <Download className="w-5 h-5" />
            <span className="text-sm">Shopping</span>
            <span className="text-xs text-muted-foreground">
              {shoppingItems.length} items
            </span>
          </Button>
          <Button
            variant="outline"
            onClick={handleExportAll}
            className="h-auto px-4 py-3 bg-primary/10 text-primary hover:bg-primary/20 flex flex-col items-center gap-1 border-primary/20"
          >
            <Download className="w-5 h-5" />
            <span className="text-sm">All Data</span>
            <span className="text-xs text-muted-foreground">Download all</span>
          </Button>
        </div>
      </PageCard>

      {/* About */}
      <PageCard title="About FamilyHub" subtitle="App information">
        <div className="space-y-2 text-sm text-muted-foreground">
          <p>
            <strong className="text-foreground">FamilyHub</strong> - A family
            organization app for the Internet Computer.
          </p>
          <p>
            Admin Status:{" "}
            <span className="text-primary">{isAdmin ? "Yes" : "No"}</span>
          </p>
        </div>
      </PageCard>
    </div>
  );
};
