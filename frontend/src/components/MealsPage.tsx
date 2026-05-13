import React, { useState, useMemo } from "react";
import {
  useFamilyMembers,
  useMealOptions,
  useCreateMealOption,
  useVoteForMeal,
  useSelectMeal,
  useDeleteMealOption,
  useMealAttendance,
  useSetMealAttendance,
  useIsAdmin,
  useMyMember,
} from "../hooks/useQueries";
import type { MealOption } from "../backend";
import { toast } from "sonner";
import { LoadingScreen } from "./LoadingScreen";

import {
  Dialog,
  DialogContent,
  DialogFooter,
  DialogHeader,
  DialogTitle,
} from "@/components/ui/dialog";
import { Button } from "@/components/ui/button";
import { cn } from "@/lib/utils";
import { FormButton } from "./shared/FormButton";
import { MemberAvatar } from "./shared/MemberAvatar";
import { PageCard } from "./shared/PageCard";
import { EmptyState } from "./shared/EmptyState";
import { StatCard } from "./shared/StatCard";
import { UtensilsCrossed, X, Trophy, Users, TrendingUp } from "lucide-react";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Tabs, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { Progress } from "@/components/ui/progress";
import { Badge } from "@/components/ui/badge";
import {
  formatNanoseconds,
  nanosecondsToDate,
  getTodayLocalDate,
  localDateStringToNanoseconds,
  dateToNanoseconds,
  NS_PER_DAY,
} from "../utils/dateHelpers";

export const MealsPage: React.FC = () => {
  const { data: members = [], isLoading: membersLoading } = useFamilyMembers();
  const {
    data: meals = [],
    isLoading: mealsLoading,
    error,
    refetch,
  } = useMealOptions();
  const { data: isAdmin } = useIsAdmin();
  const { data: myMember } = useMyMember();
  const createMeal = useCreateMealOption();
  const voteForMeal = useVoteForMeal();
  const selectMeal = useSelectMeal();
  const deleteMeal = useDeleteMealOption();
  const setMealAttendance = useSetMealAttendance();

  // Get today's date for attendance
  const today = useMemo(() => {
    const now = new Date();
    now.setHours(0, 0, 0, 0);
    return dateToNanoseconds(now);
  }, []);

  const { data: attendanceList = [] } = useMealAttendance(today);

  const [showForm, setShowForm] = useState(false);
  const [selectedDateFilter, setSelectedDateFilter] = useState<string>("today");
  const [formData, setFormData] = useState({
    name: "",
    description: "",
    scheduledDate: getTodayLocalDate(),
  });

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!myMember) return;
    try {
      const scheduledDate = localDateStringToNanoseconds(
        formData.scheduledDate,
      );
      await createMeal.mutateAsync({
        name: formData.name,
        description: formData.description,
        proposedBy: myMember.id,
        scheduledDate,
      });
      toast.success("Meal suggestion added!");
      setShowForm(false);
      setFormData({
        name: "",
        description: "",
        scheduledDate: getTodayLocalDate(),
      });
    } catch (err) {
      toast.error(err instanceof Error ? err.message : "Failed to add meal");
    }
  };

  const handleVote = async (mealId: bigint) => {
    if (!myMember) return;
    try {
      await voteForMeal.mutateAsync({ mealId, memberId: myMember.id });
    } catch (err) {
      toast.error(err instanceof Error ? err.message : "Failed to vote");
    }
  };

  const handleSelect = async (mealId: bigint) => {
    try {
      await selectMeal.mutateAsync(mealId);
    } catch (err) {
      toast.error(err instanceof Error ? err.message : "Failed to select meal");
    }
  };

  const handleDelete = async (mealId: bigint) => {
    try {
      await deleteMeal.mutateAsync(mealId);
      toast.success("Meal removed!");
    } catch (err) {
      toast.error(err instanceof Error ? err.message : "Failed to remove meal");
    }
  };

  const handleAttendanceToggle = async (
    memberId: bigint,
    currentlyAttending: boolean,
  ) => {
    try {
      await setMealAttendance.mutateAsync({
        date: today,
        memberId,
        attending: !currentlyAttending,
      });
    } catch (err) {
      toast.error(
        err instanceof Error ? err.message : "Failed to update attendance",
      );
    }
  };

  // Build attendance map for today
  const attendanceMap = useMemo(() => {
    const map = new Map<string, boolean>();
    attendanceList.forEach((a) => {
      map.set(a.memberId.toString(), a.attending);
    });
    return map;
  }, [attendanceList]);

  // Count attending members for today
  const attendingCount = useMemo(() => {
    let count = 0;
    members.forEach((member) => {
      const attending = attendanceMap.get(member.id.toString());
      // Default to attending if no record exists
      if (attending === undefined || attending === true) {
        count++;
      }
    });
    return count;
  }, [members, attendanceMap]);

  // Statistics
  const stats = useMemo(() => {
    const totalVotes = meals.reduce((sum, m) => sum + m.votes.length, 0);
    const selectedMeals = meals.filter((m) => m.isSelected);
    const attendanceRate =
      members.length > 0 ? (attendingCount / members.length) * 100 : 0;

    // Most popular meal (by votes)
    const mostPopular = meals.reduce((prev, current) => {
      return current.votes.length > prev.votes.length ? current : prev;
    }, meals[0]);

    return {
      totalProposed: meals.length,
      totalVotes,
      selectedCount: selectedMeals.length,
      attendanceRate,
      mostPopular: mostPopular?.name || "—",
    };
  }, [meals, attendingCount, members.length]);

  // Filter and group meals by date
  const filteredMeals = useMemo(() => {
    const now = new Date();
    now.setHours(0, 0, 0, 0);
    const todayNs = dateToNanoseconds(now);

    return meals.filter((meal) => {
      const mealDateNs = meal.scheduledDate;
      if (selectedDateFilter === "today") {
        return mealDateNs >= todayNs && mealDateNs < todayNs + NS_PER_DAY;
      } else if (selectedDateFilter === "week") {
        return (
          mealDateNs >= todayNs && mealDateNs < todayNs + NS_PER_DAY * BigInt(7)
        );
      }
      return true;
    });
  }, [meals, selectedDateFilter]);

  const mealsByDate = useMemo(() => {
    const groups: Record<string, MealOption[]> = {};
    filteredMeals.forEach((meal) => {
      const dateStr = nanosecondsToDate(
        meal.scheduledDate,
      ).toLocaleDateString();
      if (!groups[dateStr]) groups[dateStr] = [];
      groups[dateStr].push(meal);
    });
    // Sort each group by vote count (descending)
    Object.values(groups).forEach((group) => {
      group.sort((a, b) => b.votes.length - a.votes.length);
    });
    return groups;
  }, [filteredMeals]);

  // Top meals by votes (for leaderboard)
  const topMeals = useMemo(() => {
    return [...filteredMeals]
      .sort((a, b) => b.votes.length - a.votes.length)
      .slice(0, 5);
  }, [filteredMeals]);

  // Week view: Get next 7 days with meals
  const weekView = useMemo(() => {
    const days: Array<{ date: Date; meals: MealOption[] }> = [];
    const now = new Date();
    now.setHours(0, 0, 0, 0);

    for (let i = 0; i < 7; i++) {
      const date = new Date(now);
      date.setDate(now.getDate() + i);
      const dayStart = dateToNanoseconds(date);
      const dayEnd = dayStart + NS_PER_DAY;

      const dayMeals = meals
        .filter((m) => m.scheduledDate >= dayStart && m.scheduledDate < dayEnd)
        .sort((a, b) => b.votes.length - a.votes.length);

      days.push({ date, meals: dayMeals });
    }
    return days;
  }, [meals]);

  const isLoading = membersLoading || mealsLoading;

  if (isLoading) {
    return <LoadingScreen />;
  }

  if (error) {
    return (
      <EmptyState
        icon={<X className="w-12 h-12 text-destructive" />}
        title="Failed to load meals"
        description="Please try again"
        action={{
          label: "Try Again",
          onClick: () => refetch(),
        }}
      />
    );
  }

  return (
    <div className="space-y-6">
      {/* Header */}
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4">
        <div>
          <h2 className="text-3xl text-foreground">Meal Planning</h2>
          <p className="text-sm text-muted-foreground mt-1">
            Vote on meals and track attendance
          </p>
        </div>
        <FormButton onClick={() => setShowForm(true)} variant="primary">
          + Suggest Meal
        </FormButton>
      </div>

      {/* Statistics */}
      <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-4">
        <StatCard
          title="Total Meals"
          value={stats.totalProposed}
          icon={UtensilsCrossed}
          changeType="neutral"
        />
        <StatCard
          title="Total Votes"
          value={stats.totalVotes}
          change={`${stats.selectedCount} selected`}
          changeType="neutral"
          icon={Trophy}
        />
        <StatCard
          title="Most Popular"
          value={stats.mostPopular}
          change="By votes"
          changeType="neutral"
          icon={TrendingUp}
        />
        <StatCard
          title="Attendance Rate"
          value={`${Math.round(stats.attendanceRate)}%`}
          change={`${attendingCount}/${members.length} eating`}
          changeType={stats.attendanceRate >= 75 ? "positive" : "neutral"}
          icon={Users}
        />
      </div>

      {/* Who's Eating Tonight - Attendance Section */}
      <PageCard
        title="Who's eating tonight?"
        subtitle={`${attendingCount} of ${members.length} attending`}
      >
        <div className="flex gap-3 flex-wrap">
          {members.map((member) => {
            const attendingValue = attendanceMap.get(member.id.toString());
            // Default to attending if no record
            const isAttending =
              attendingValue === undefined || attendingValue === true;
            const canModify =
              isAdmin || (myMember && member.id === myMember.id);

            return (
              <Button
                key={member.id.toString()}
                variant="outline"
                onClick={() => handleAttendanceToggle(member.id, isAttending)}
                disabled={!canModify || setMealAttendance.isPending}
                className={cn(
                  "flex items-center gap-2 px-3 py-2 rounded-lg border-2 h-auto",
                  !canModify && "opacity-50 cursor-not-allowed",
                  isAttending
                    ? "border-primary bg-primary/20"
                    : "border-border bg-muted/30 opacity-60",
                )}
              >
                <span
                  className={cn(
                    "w-8 h-8 rounded-full flex items-center justify-center text-white transition-transform",
                    !isAttending && "grayscale",
                  )}
                  style={{ backgroundColor: member.color }}
                >
                  {member.avatarEmoji}
                </span>
                <span
                  className={cn(
                    "text-sm",
                    !isAttending
                      ? "line-through text-muted-foreground"
                      : "text-foreground",
                  )}
                >
                  {member.name}
                </span>
                <span
                  className={cn(
                    "text-lg",
                    isAttending ? "text-primary" : "text-muted-foreground",
                  )}
                >
                  {isAttending ? "+" : "-"}
                </span>
              </Button>
            );
          })}
        </div>
        {members.some((m) => {
          const v = attendanceMap.get(m.id.toString());
          return v === false;
        }) && (
          <p className="text-xs text-muted-foreground mt-3">
            Members marked as not attending won't be counted for tonight's meal.
          </p>
        )}
      </PageCard>

      {/* View Toggle */}
      <Tabs
        value={selectedDateFilter}
        onValueChange={(v) => setSelectedDateFilter(v)}
      >
        <TabsList>
          <TabsTrigger value="today">Today</TabsTrigger>
          <TabsTrigger value="week">This Week</TabsTrigger>
          <TabsTrigger value="all">All Meals</TabsTrigger>
        </TabsList>
      </Tabs>

      {/* Voting Leaderboard - Show when there are meals */}
      {topMeals.length > 0 && (
        <PageCard
          title="Voting Leaderboard"
          subtitle="Top meal suggestions by votes"
        >
          <div className="space-y-3">
            {topMeals.map((meal, index) => {
              const proposer = members.find((m) => m.id === meal.proposedBy);
              const totalVotes = topMeals.reduce(
                (sum, m) => sum + m.votes.length,
                0,
              );
              const votePercentage =
                totalVotes > 0 ? (meal.votes.length / totalVotes) * 100 : 0;
              const rank = index + 1;

              return (
                <div
                  key={meal.id.toString()}
                  className="flex items-center gap-4 p-3 rounded-lg bg-secondary border border-border"
                >
                  {/* Rank Badge */}
                  <div
                    className={`w-10 h-10 rounded-full flex items-center justify-center shrink-0 ${
                      rank === 1
                        ? "bg-yellow-500 text-white"
                        : rank === 2
                          ? "bg-gray-400 text-white"
                          : rank === 3
                            ? "bg-orange-600 text-white"
                            : "bg-muted text-muted-foreground"
                    }`}
                  >
                    {rank === 1
                      ? "🥇"
                      : rank === 2
                        ? "🥈"
                        : rank === 3
                          ? "🥉"
                          : `#${rank}`}
                  </div>

                  {/* Meal Info */}
                  <div className="flex-1 min-w-0">
                    <div className="flex items-center gap-2 flex-wrap">
                      <span className="text-foreground">{meal.name}</span>
                      {meal.isSelected && (
                        <Badge className="bg-primary text-white">Winner</Badge>
                      )}
                    </div>
                    <div className="text-xs text-muted-foreground">
                      by {proposer?.name || "Unknown"} •{" "}
                      {formatNanoseconds(meal.scheduledDate, "MMM dd")}
                    </div>
                    <div className="mt-2">
                      <div className="flex items-center gap-2 mb-1">
                        <span className="text-sm text-foreground">
                          {meal.votes.length} vote
                          {meal.votes.length !== 1 ? "s" : ""}
                        </span>
                        <span className="text-xs text-muted-foreground">
                          ({Math.round(votePercentage)}%)
                        </span>
                      </div>
                      <Progress value={votePercentage} className="h-2" />
                    </div>
                  </div>

                  {/* Quick Vote Button */}
                  {myMember && (
                    <FormButton
                      onClick={() => handleVote(meal.id)}
                      disabled={voteForMeal.isPending}
                      variant={
                        meal.votes.includes(myMember.id)
                          ? "primary"
                          : "secondary"
                      }
                      className="text-sm"
                    >
                      {meal.votes.includes(myMember.id) ? "Voted" : "Vote"}
                    </FormButton>
                  )}
                </div>
              );
            })}
          </div>
        </PageCard>
      )}

      {/* Meals by Date */}
      {Object.entries(mealsByDate).map(([dateStr, dateMeals]) => {
        const totalVotes = dateMeals.reduce(
          (sum, m) => sum + m.votes.length,
          0,
        );
        const maxVotes = Math.max(...dateMeals.map((m) => m.votes.length), 1);

        return (
          <PageCard
            key={dateStr}
            title={dateStr}
            subtitle={`${totalVotes} total votes`}
          >
            <div className="space-y-4">
              {dateMeals.map((meal, index) => {
                const proposer = members.find((m) => m.id === meal.proposedBy);
                const hasVoted = myMember && meal.votes.includes(myMember.id);
                const votePercentage =
                  totalVotes > 0 ? (meal.votes.length / totalVotes) * 100 : 0;
                const isLeading =
                  meal.votes.length === maxVotes && maxVotes > 0;

                return (
                  <div
                    key={meal.id.toString()}
                    className={`relative rounded-xl overflow-hidden ${
                      meal.isSelected
                        ? "bg-primary/10 border-2 border-primary"
                        : isLeading && index === 0
                          ? "bg-primary/10 border-2 border-primary/40"
                          : "bg-muted/30 border border-border"
                    }`}
                  >
                    {/* Vote Progress Bar Background */}
                    <div
                      className={`absolute inset-y-0 left-0 transition-all ${
                        meal.isSelected ? "bg-primary/20" : "bg-primary/20"
                      }`}
                      style={{ width: `${votePercentage}%`, opacity: 0.5 }}
                    />

                    <div className="relative flex items-start gap-4 p-4">
                      <UtensilsCrossed className="w-8 h-8 text-primary shrink-0" />
                      <div className="flex-1 min-w-0">
                        <div className="flex items-center gap-2 flex-wrap">
                          <span className="text-foreground">{meal.name}</span>
                          {meal.isSelected && (
                            <span className="text-xs bg-primary text-white px-2 py-0.5 rounded-full">
                              Winner!
                            </span>
                          )}
                          {isLeading && index === 0 && !meal.isSelected && (
                            <span className="text-xs bg-primary text-white px-2 py-0.5 rounded-full">
                              Leading
                            </span>
                          )}
                        </div>
                        {meal.description && (
                          <div className="text-sm text-muted-foreground truncate">
                            {meal.description}
                          </div>
                        )}
                        <div className="flex items-center gap-3 mt-2 flex-wrap">
                          <span className="text-xs text-muted-foreground">
                            by{" "}
                            <span className="text-muted-foreground">
                              {proposer?.name || "Unknown"}
                            </span>
                          </span>
                        </div>

                        {/* Vote visualization */}
                        <div className="mt-3 space-y-2">
                          {/* Vote count and percentage */}
                          <div className="flex items-center gap-2">
                            <span className="text-lg text-foreground">
                              {meal.votes.length}
                            </span>
                            <span className="text-sm text-muted-foreground">
                              vote{meal.votes.length !== 1 ? "s" : ""}
                            </span>
                            {totalVotes > 0 && (
                              <span className="text-sm text-primary">
                                ({Math.round(votePercentage)}%)
                              </span>
                            )}
                          </div>

                          {/* Voter avatars with names */}
                          {meal.votes.length > 0 && (
                            <div className="flex flex-wrap gap-1">
                              {meal.votes.map((voterId) => {
                                const voter = members.find(
                                  (m) => m.id === voterId,
                                );
                                return voter ? (
                                  <div
                                    key={voterId.toString()}
                                    className="flex items-center gap-1"
                                  >
                                    <MemberAvatar
                                      member={voter}
                                      size="xs"
                                      showName
                                    />
                                  </div>
                                ) : null;
                              })}
                            </div>
                          )}
                        </div>
                      </div>

                      {/* Action buttons */}
                      <div className="flex flex-col gap-2">
                        {myMember && (
                          <FormButton
                            onClick={() => handleVote(meal.id)}
                            disabled={voteForMeal.isPending}
                            variant={hasVoted ? "primary" : "secondary"}
                            className="text-sm"
                          >
                            {hasVoted ? "Voted!" : "Vote"}
                          </FormButton>
                        )}
                        {isAdmin && (
                          <FormButton
                            onClick={() => handleSelect(meal.id)}
                            disabled={selectMeal.isPending}
                            variant={meal.isSelected ? "primary" : "secondary"}
                            className={`text-sm ${
                              meal.isSelected
                                ? "bg-primary hover:bg-primary/90"
                                : "border-primary/40 text-primary hover:bg-primary/10"
                            }`}
                          >
                            {meal.isSelected ? "Winner" : "Select"}
                          </FormButton>
                        )}
                        <Button
                          variant="ghost"
                          onClick={() => handleDelete(meal.id)}
                          disabled={deleteMeal.isPending}
                          className="text-muted-foreground hover:text-destructive text-sm px-2 h-auto"
                        >
                          Remove
                        </Button>
                      </div>
                    </div>
                  </div>
                );
              })}
            </div>
          </PageCard>
        );
      })}

      {filteredMeals.length === 0 && (
        <EmptyState
          icon={<UtensilsCrossed className="w-12 h-12 text-primary" />}
          title={
            selectedDateFilter === "today"
              ? "No meal suggestions for today"
              : selectedDateFilter === "week"
                ? "No meal suggestions this week"
                : "No meal suggestions yet"
          }
          description="Add meal ideas and let the family vote!"
        />
      )}

      {/* Form Modal */}
      <Dialog open={showForm} onOpenChange={() => setShowForm(false)}>
        <DialogContent className="max-w-md max-h-[90vh] overflow-y-auto">
          <DialogHeader>
            <DialogTitle>Suggest a Meal</DialogTitle>
          </DialogHeader>
          <form onSubmit={handleSubmit} className="space-y-4 mt-4">
            <div>
              <Label className="mb-2">Meal Name</Label>
              <Input
                type="text"
                value={formData.name}
                onChange={(e) =>
                  setFormData({ ...formData, name: e.target.value })
                }
                required
              />
            </div>
            <div>
              <Label className="mb-2">Description (optional)</Label>
              <Input
                type="text"
                value={formData.description}
                onChange={(e) =>
                  setFormData({ ...formData, description: e.target.value })
                }
              />
            </div>
            <div>
              <Label className="mb-2">For Date</Label>
              <Input
                type="date"
                value={formData.scheduledDate}
                onChange={(e) =>
                  setFormData({ ...formData, scheduledDate: e.target.value })
                }
                required
              />
            </div>
            <DialogFooter>
              <FormButton
                type="button"
                onClick={() => setShowForm(false)}
                variant="secondary"
              >
                Cancel
              </FormButton>
              <FormButton
                type="submit"
                disabled={!myMember || !formData.name.trim()}
                loading={createMeal.isPending}
                variant="primary"
              >
                Suggest
              </FormButton>
            </DialogFooter>
          </form>
        </DialogContent>
      </Dialog>
    </div>
  );
};
