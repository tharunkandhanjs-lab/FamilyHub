import React, { useState, useMemo } from "react";
import {
  useFamilyMembers,
  useMoodEntries,
  useCreateMoodEntry,
  useDeleteMoodEntry,
  useMyMember,
  useIsAdmin,
} from "../hooks/useQueries";
import { toast } from "sonner";
import { MOODS } from "../constants";
import { LoadingScreen } from "./LoadingScreen";

import {
  AlertDialog,
  AlertDialogAction,
  AlertDialogCancel,
  AlertDialogContent,
  AlertDialogDescription,
  AlertDialogFooter,
  AlertDialogHeader,
  AlertDialogTitle,
} from "@/components/ui/alert-dialog";
import { Button } from "@/components/ui/button";
import { cn } from "@/lib/utils";
import { FormButton } from "./shared/FormButton";
import { MemberAvatar } from "./shared/MemberAvatar";
import { PageCard } from "./shared/PageCard";
import { EmptyState } from "./shared/EmptyState";
import { TrendChart } from "./shared/TrendChart";
import { Progress } from "@/components/ui/progress";
import { Alert, AlertDescription, AlertTitle } from "@/components/ui/alert";
import {
  HoverCard,
  HoverCardContent,
  HoverCardTrigger,
} from "@/components/ui/hover-card";
import { Tabs, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { Smile, X, TrendingUp, Clock } from "lucide-react";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import {
  calculateAverageMoodScore,
  getEmojiForScore,
} from "../utils/dataHelpers";
import {
  formatNanoseconds,
  nanosecondsToDate,
  getLast7Days,
  dateToNanoseconds,
} from "../utils/dateHelpers";
import { prepareMoodChartData } from "../utils/chartHelpers";
import { CHART_COLORS } from "../utils/chartColors";

type ViewMode = "checkin" | "history";

export const MoodPage: React.FC = () => {
  const { data: members = [], isLoading: membersLoading } = useFamilyMembers();
  const {
    data: moods = [],
    isLoading: moodsLoading,
    error,
    refetch,
  } = useMoodEntries();
  const { data: myMember } = useMyMember();
  const { data: isAdmin } = useIsAdmin();
  const createMood = useCreateMoodEntry();
  const deleteMood = useDeleteMoodEntry();

  const [viewMode, setViewMode] = useState<ViewMode>("checkin");
  const [selectedMember, setSelectedMember] = useState<bigint | null>(null);
  const [selectedMood, setSelectedMood] = useState<string | null>(null);
  const [note, setNote] = useState("");
  const [deleteMoodId, setDeleteMoodId] = useState<bigint | null>(null);

  React.useEffect(() => {
    if (!isAdmin && myMember) {
      setSelectedMember(myMember.id);
    }
  }, [isAdmin, myMember]);

  // Analytics
  const analytics = useMemo(() => {
    const last7Days = getLast7Days();
    const last7DaysStart = last7Days[0].getTime();

    const recentMoods = moods.filter((m) => {
      const moodTime = nanosecondsToDate(m.date).getTime();
      return moodTime >= last7DaysStart;
    });

    const avgScore = calculateAverageMoodScore(recentMoods);
    const avgEmoji = moods.length === 0 ? "😊" : getEmojiForScore(avgScore);

    // Check for streak (7+ days of happy moods)
    const happyMoods = ["😊", "🤩"];
    const last7DaysHappy = last7Days.every((day) => {
      const dayMoods = moods.filter((m) => {
        const moodDate = nanosecondsToDate(m.date);
        return moodDate.toDateString() === day.toDateString();
      });
      return dayMoods.some((m) => happyMoods.includes(m.mood));
    });

    // Today's check-ins
    const today = new Date();
    const todayMoods = moods.filter((m) => {
      const moodDate = nanosecondsToDate(m.date);
      return moodDate.toDateString() === today.toDateString();
    });

    return {
      avgScore: avgScore.toFixed(1),
      avgEmoji,
      hasStreak: last7DaysHappy && recentMoods.length >= 7,
      todayCheckIns: todayMoods.length,
      totalCheckIns: moods.length,
    };
  }, [moods]);

  // Chart data
  const chartData = useMemo(() => prepareMoodChartData(moods), [moods]);

  // Per-member recent moods
  const memberMoods = useMemo(() => {
    return members.map((member) => {
      const memberMoodsList = moods
        .filter((m) => m.memberId === member.id)
        .sort((a, b) => Number(b.date - a.date));

      const recentMood = memberMoodsList[0];
      const last7 = memberMoodsList.slice(0, 7);

      return {
        member,
        recentMood: recentMood?.mood || null,
        recentNote: recentMood?.note || null,
        last7Days: last7,
      };
    });
  }, [members, moods]);

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();

    const memberId = isAdmin ? selectedMember : (myMember?.id ?? null);

    if (memberId === null || !selectedMood) {
      toast.error("Please select a family member and mood");
      return;
    }

    try {
      await createMood.mutateAsync({
        memberId,
        mood: selectedMood,
        note,
        date: dateToNanoseconds(new Date()),
      });
      toast.success("Mood logged successfully!");
      setSelectedMember(null);
      setSelectedMood(null);
      setNote("");
    } catch (err) {
      toast.error(err instanceof Error ? err.message : "Failed to log mood");
    }
  };

  const handleDeleteClick = (moodId: bigint) => {
    setDeleteMoodId(moodId);
  };

  const handleConfirmDelete = async () => {
    if (deleteMoodId !== null) {
      try {
        await deleteMood.mutateAsync(deleteMoodId);
        toast.success("Mood entry deleted!");
      } catch (err) {
        toast.error(err instanceof Error ? err.message : "Failed to delete");
      }
    }
  };

  if (moodsLoading || membersLoading) {
    return <LoadingScreen />;
  }

  if (error) {
    return (
      <EmptyState
        icon={<X className="w-12 h-12 text-destructive" />}
        title="Failed to load moods"
        description="Please try again"
        action={{ label: "Try Again", onClick: () => refetch() }}
      />
    );
  }

  return (
    <div className="space-y-6">
      {/* Header */}
      <div>
        <h2 className="text-3xl text-foreground">Mood Tracker</h2>
        <p className="text-sm text-muted-foreground mt-1">
          Track family moods and emotional wellbeing
        </p>
      </div>

      {/* Streak Alert */}
      {analytics.hasStreak && (
        <Alert>
          <TrendingUp className="h-4 w-4" />
          <AlertTitle>Positive Streak!</AlertTitle>
          <AlertDescription>
            Your family has logged happy moods for 7 days straight! 🎉
          </AlertDescription>
        </Alert>
      )}

      {/* Analytics Dashboard */}
      <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
        {/* Mood Score Card */}
        <PageCard title="Family Mood Score" subtitle="Last 7 days average">
          <div className="text-center py-4">
            <div className="text-6xl mb-3">{analytics.avgEmoji}</div>
            <div className="text-3xl text-foreground mb-2">
              {analytics.avgScore}/10
            </div>
            <Progress
              value={Number(analytics.avgScore) * 10}
              className="h-2 mb-2"
            />
            <div className="text-sm text-muted-foreground">
              {analytics.todayCheckIns} check-ins today
            </div>
          </div>
        </PageCard>

        {/* Mood Trends Chart */}
        <PageCard
          title="Mood Trends"
          subtitle="Last 7 days"
          className="lg:col-span-2"
        >
          <TrendChart
            data={chartData}
            type="area"
            dataKey="score"
            xKey="date"
            color={CHART_COLORS.mood}
          />
        </PageCard>
      </div>

      {/* View Toggle */}
      <Tabs value={viewMode} onValueChange={(v) => setViewMode(v as ViewMode)}>
        <TabsList>
          <TabsTrigger value="checkin">
            <Smile className="w-4 h-4" />
            Check In
          </TabsTrigger>
          <TabsTrigger value="history">
            <Clock className="w-4 h-4" />
            History
          </TabsTrigger>
        </TabsList>
      </Tabs>

      {/* Check In View */}
      {viewMode === "checkin" && (
        <div className="space-y-6">
          {/* Per-Member Mood Cards */}
          <div>
            <h3 className="text-lg text-foreground mb-4">Family Moods</h3>
            <div className="grid grid-cols-2 lg:grid-cols-4 gap-4">
              {memberMoods.map(({ member, recentMood, last7Days }) => (
                <HoverCard key={member.id.toString()}>
                  <HoverCardTrigger asChild>
                    <PageCard className="cursor-pointer hover:shadow-lg transition-all">
                      <div className="text-center">
                        <MemberAvatar
                          member={member}
                          size="lg"
                          className="mx-auto mb-2"
                        />
                        <div className="text-foreground mb-1">
                          {member.name}
                        </div>
                        <div className="text-4xl mb-1">{recentMood || "—"}</div>
                        <div className="text-xs text-muted-foreground">
                          {last7Days.length > 0 ? (
                            <>
                              Last:{" "}
                              {formatNanoseconds(last7Days[0].date, "MMM dd")}
                            </>
                          ) : (
                            "No moods yet"
                          )}
                        </div>
                      </div>
                    </PageCard>
                  </HoverCardTrigger>
                  <HoverCardContent className="w-64">
                    <div className="space-y-2">
                      <h4 className="text-foreground">Last 7 Days</h4>
                      {last7Days.length === 0 ? (
                        <p className="text-sm text-muted-foreground">
                          No recent moods
                        </p>
                      ) : (
                        <div className="space-y-1">
                          {last7Days.map((m) => (
                            <div
                              key={m.id.toString()}
                              className="flex items-center justify-between text-sm"
                            >
                              <span className="text-2xl">{m.mood}</span>
                              <span className="text-xs text-muted-foreground">
                                {formatNanoseconds(m.date, "MMM dd")}
                              </span>
                            </div>
                          ))}
                        </div>
                      )}
                    </div>
                  </HoverCardContent>
                </HoverCard>
              ))}
            </div>
          </div>

          {/* Check-in Form */}
          <PageCard title="Log a Mood" subtitle="How is everyone feeling?">
            <form onSubmit={handleSubmit} className="space-y-4">
              <div>
                <Label className="mb-2">Family Member</Label>
                {isAdmin ? (
                  <Select
                    value={selectedMember?.toString() ?? ""}
                    onValueChange={(value) =>
                      setSelectedMember(value ? BigInt(value) : null)
                    }
                  >
                    <SelectTrigger className="w-full">
                      <SelectValue placeholder="Select a member" />
                    </SelectTrigger>
                    <SelectContent>
                      {members.map((m) => (
                        <SelectItem
                          key={m.id.toString()}
                          value={m.id.toString()}
                        >
                          {m.name}
                        </SelectItem>
                      ))}
                    </SelectContent>
                  </Select>
                ) : (
                  <div className="w-full px-4 py-2 rounded-lg border border-border bg-muted text-foreground">
                    {myMember?.name || "You"}
                  </div>
                )}
              </div>

              <div>
                <Label className="mb-2">How are you feeling?</Label>
                <div className="grid grid-cols-3 md:grid-cols-6 gap-3">
                  {MOODS.map((mood) => {
                    const isSelected = selectedMood === mood.emoji;
                    const tint = {
                      "😊": {
                        bg: "bg-amber-50 dark:bg-amber-950/30",
                        ring: "ring-amber-400",
                        accent: "text-amber-600 dark:text-amber-400",
                      },
                      "😢": {
                        bg: "bg-blue-50 dark:bg-blue-950/30",
                        ring: "ring-blue-400",
                        accent: "text-blue-600 dark:text-blue-400",
                      },
                      "😡": {
                        bg: "bg-red-50 dark:bg-red-950/30",
                        ring: "ring-red-400",
                        accent: "text-red-600 dark:text-red-400",
                      },
                      "😴": {
                        bg: "bg-indigo-50 dark:bg-indigo-950/30",
                        ring: "ring-indigo-400",
                        accent: "text-indigo-600 dark:text-indigo-400",
                      },
                      "🤩": {
                        bg: "bg-fuchsia-50 dark:bg-fuchsia-950/30",
                        ring: "ring-fuchsia-400",
                        accent: "text-fuchsia-600 dark:text-fuchsia-400",
                      },
                      "😐": {
                        bg: "bg-slate-100 dark:bg-slate-800/40",
                        ring: "ring-slate-400",
                        accent: "text-slate-500 dark:text-slate-400",
                      },
                    }[mood.emoji] || {
                      bg: "bg-muted",
                      ring: "ring-border",
                      accent: "text-muted-foreground",
                    };

                    return (
                      <button
                        key={mood.emoji}
                        type="button"
                        onClick={() => setSelectedMood(mood.emoji)}
                        className={cn(
                          "flex flex-col items-center gap-1.5 rounded-2xl py-3 px-2 transition-all duration-200 cursor-pointer",
                          "active:scale-95",
                          isSelected
                            ? cn(
                                tint.bg,
                                "ring-2",
                                tint.ring,
                                "shadow-md animate-mood-pop scale-105",
                              )
                            : "bg-secondary hover:shadow-sm hover:scale-[1.03]",
                        )}
                      >
                        <span
                          className={cn(
                            "text-4xl leading-none transition-transform duration-200",
                            isSelected && "drop-shadow-sm",
                          )}
                        >
                          {mood.emoji}
                        </span>
                        <span
                          className={cn(
                            "text-[11px] font-medium tracking-wide transition-colors duration-200",
                            isSelected ? tint.accent : "text-muted-foreground",
                          )}
                        >
                          {mood.label}
                        </span>
                      </button>
                    );
                  })}
                </div>
              </div>

              <div>
                <Label className="mb-2">Note (Optional)</Label>
                <Input
                  type="text"
                  value={note}
                  onChange={(e) => setNote(e.target.value)}
                  placeholder="How are you feeling?"
                />
              </div>

              <FormButton
                type="submit"
                disabled={
                  (isAdmin ? selectedMember === null : !myMember) ||
                  !selectedMood ||
                  createMood.isPending
                }
                loading={createMood.isPending}
                variant="primary"
                className="w-full"
              >
                Log Mood
              </FormButton>
            </form>
          </PageCard>
        </div>
      )}

      {/* History View */}
      {viewMode === "history" && (
        <PageCard title="Mood History" subtitle="Recent check-ins">
          {moods.length === 0 ? (
            <EmptyState
              icon={<Smile className="w-12 h-12 text-primary" />}
              title="No mood entries yet"
              description="Start tracking moods to see history"
            />
          ) : (
            <div className="space-y-3">
              {moods
                .slice()
                .sort((a, b) => Number(b.date - a.date))
                .slice(0, 20)
                .map((mood) => {
                  const member = members.find((m) => m.id === mood.memberId);
                  if (!member) return null;

                  return (
                    <div
                      key={mood.id.toString()}
                      className="flex items-center gap-4 p-3 rounded-lg bg-secondary border border-border"
                    >
                      <div className="text-3xl">{mood.mood}</div>
                      <MemberAvatar member={member} size="md" />
                      <div className="flex-1 min-w-0">
                        <div className="text-foreground">{member.name}</div>
                        {mood.note && (
                          <div className="text-sm text-muted-foreground truncate">
                            {mood.note}
                          </div>
                        )}
                        <div className="text-xs text-muted-foreground mt-0.5">
                          {formatNanoseconds(
                            mood.date,
                            "MMM dd, yyyy 'at' h:mm a",
                          )}
                        </div>
                      </div>
                      {(isAdmin || mood.memberId === myMember?.id) && (
                        <Button
                          variant="ghost"
                          size="icon"
                          onClick={() => handleDeleteClick(mood.id)}
                          className="hover:bg-destructive/10"
                        >
                          <X className="w-4 h-4 text-destructive" />
                        </Button>
                      )}
                    </div>
                  );
                })}
            </div>
          )}
        </PageCard>
      )}

      {moods.length === 0 && (
        <EmptyState
          icon={<Smile className="w-12 h-12 text-primary" />}
          title="No mood entries yet"
          description="Start tracking family moods to see trends!"
        />
      )}

      <AlertDialog
        open={deleteMoodId !== null}
        onOpenChange={() => setDeleteMoodId(null)}
      >
        <AlertDialogContent>
          <AlertDialogHeader>
            <AlertDialogTitle>Delete Mood Entry</AlertDialogTitle>
            <AlertDialogDescription>
              Are you sure you want to delete this mood entry? This action
              cannot be undone.
            </AlertDialogDescription>
          </AlertDialogHeader>
          <AlertDialogFooter>
            <AlertDialogCancel>Cancel</AlertDialogCancel>
            <AlertDialogAction
              className="bg-destructive hover:bg-destructive/90"
              onClick={() => {
                handleConfirmDelete();
                setDeleteMoodId(null);
              }}
            >
              Delete
            </AlertDialogAction>
          </AlertDialogFooter>
        </AlertDialogContent>
      </AlertDialog>
    </div>
  );
};
