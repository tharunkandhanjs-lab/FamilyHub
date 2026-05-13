import React, { useState, useMemo } from "react";
import {
  useFamilyMembers,
  useChores,
  useCreateChore,
  useUpdateChore,
  useToggleChoreComplete,
  useDeleteChore,
  useIsAdmin,
  useMyMember,
} from "../hooks/useQueries";
import type { Chore } from "../backend";
import { LoadingScreen } from "./LoadingScreen";

import {
  Dialog,
  DialogContent,
  DialogFooter,
  DialogHeader,
  DialogTitle,
} from "@/components/ui/dialog";
import { Button } from "@/components/ui/button";
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
import { FormButton } from "./shared/FormButton";
import { PageCard } from "./shared/PageCard";
import { MemberAvatar } from "./shared/MemberAvatar";
import { EmptyState } from "./shared/EmptyState";
import { StatCard } from "./shared/StatCard";
import { TrendChart } from "./shared/TrendChart";
import { Progress } from "@/components/ui/progress";
import {
  CheckCircle2,
  X,
  Edit2,
  ChevronLeft,
  ChevronRight,
  List,
  CalendarDays,
  Plus,
  AlertCircle,
} from "lucide-react";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Badge } from "@/components/ui/badge";
import { Tabs, TabsList, TabsTrigger } from "@/components/ui/tabs";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import { toast } from "sonner";
import { calculateCompletionRate, calculateChange } from "../utils/dataHelpers";
import {
  nanosecondsToDate,
  formatNanoseconds,
  isThisWeekNano,
  isLastWeekNano,
  getTodayLocalDate,
  localDateStringToNanoseconds,
  nanosecondsToLocalDateString,
  NS_PER_MS,
} from "../utils/dateHelpers";
import { prepareChoreChartData } from "../utils/chartHelpers";
import { CHART_COLORS } from "../utils/chartColors";

type ViewMode = "list" | "week";

export const ChoresPage: React.FC = () => {
  const { data: members = [], isLoading: membersLoading } = useFamilyMembers();
  const {
    data: chores = [],
    isLoading: choresLoading,
    error,
    refetch,
  } = useChores();
  const { data: isAdmin } = useIsAdmin();
  const { data: myMember } = useMyMember();
  const createChore = useCreateChore();
  const updateChore = useUpdateChore();
  const toggleChore = useToggleChoreComplete();
  const deleteChore = useDeleteChore();

  const [viewMode, setViewMode] = useState<ViewMode>("week");
  const [currentWeekStart, setCurrentWeekStart] = useState(() => {
    const today = new Date();
    const dayOfWeek = today.getDay();
    const start = new Date(today);
    start.setDate(today.getDate() - dayOfWeek);
    start.setHours(0, 0, 0, 0);
    return start;
  });
  const [showForm, setShowForm] = useState(false);
  const [editingChore, setEditingChore] = useState<Chore | null>(null);
  const [filterMemberId, setFilterMemberId] = useState<bigint | null>(null);
  const [formData, setFormData] = useState({
    title: "",
    description: "",
    assignedTo: null as bigint | null,
    dueDate: getTodayLocalDate(),
    recurrence: "none",
  });
  const [deleteTarget, setDeleteTarget] = useState<Chore | null>(null);

  // Statistics
  const stats = useMemo(() => {
    const thisWeek = chores.filter((c) => isThisWeekNano(c.dueDate));
    const lastWeek = chores.filter((c) => isLastWeekNano(c.dueDate));

    const thisWeekCompleted = thisWeek.filter((c) => c.isCompleted).length;
    const lastWeekCompleted = lastWeek.filter((c) => c.isCompleted).length;

    const today = new Date();
    const todayChores = chores.filter((c) => {
      const choreDate = nanosecondsToDate(c.dueDate);
      return choreDate.toDateString() === today.toDateString();
    });

    const overdue = chores.filter((c) => {
      if (c.isCompleted) return false;
      return nanosecondsToDate(c.dueDate) < today;
    });

    const completionRate = calculateCompletionRate(chores);
    const change = calculateChange(thisWeekCompleted, lastWeekCompleted);

    return {
      total: chores.length,
      completionRate,
      change,
      dueToday: todayChores.filter((c) => !c.isCompleted).length,
      overdue: overdue.length,
    };
  }, [chores]);

  // Chart data
  const chartData = useMemo(() => prepareChoreChartData(chores), [chores]);

  // Week days
  const weekDays = useMemo(() => {
    const days: Date[] = [];
    for (let i = 0; i < 7; i++) {
      const day = new Date(currentWeekStart);
      day.setDate(currentWeekStart.getDate() + i);
      days.push(day);
    }
    return days;
  }, [currentWeekStart]);

  const navigatePrevWeek = () => {
    const newStart = new Date(currentWeekStart);
    newStart.setDate(currentWeekStart.getDate() - 7);
    setCurrentWeekStart(newStart);
  };

  const navigateNextWeek = () => {
    const newStart = new Date(currentWeekStart);
    newStart.setDate(currentWeekStart.getDate() + 7);
    setCurrentWeekStart(newStart);
  };

  const goToThisWeek = () => {
    const today = new Date();
    const dayOfWeek = today.getDay();
    const start = new Date(today);
    start.setDate(today.getDate() - dayOfWeek);
    start.setHours(0, 0, 0, 0);
    setCurrentWeekStart(start);
  };

  const getChoresForDate = (date: Date): Chore[] => {
    const dayStart = new Date(
      date.getFullYear(),
      date.getMonth(),
      date.getDate(),
    ).getTime();
    const dayEnd = dayStart + 24 * 60 * 60 * 1000;

    let filtered = chores.filter((c) => {
      const choreDate = Number(c.dueDate / NS_PER_MS);
      return choreDate >= dayStart && choreDate < dayEnd;
    });

    if (filterMemberId) {
      filtered = filtered.filter((c) => c.assignedTo === filterMemberId);
    }

    return filtered;
  };

  const isToday = (date: Date) => {
    const today = new Date();
    return (
      date.getDate() === today.getDate() &&
      date.getMonth() === today.getMonth() &&
      date.getFullYear() === today.getFullYear()
    );
  };

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    try {
      if (editingChore) {
        await updateChore.mutateAsync({
          id: editingChore.id,
          title: formData.title,
          description: formData.description,
          assignedTo: formData.assignedTo,
          dueDate: localDateStringToNanoseconds(formData.dueDate),
          recurrence: formData.recurrence,
        });
        toast.success("Chore updated successfully!");
      } else {
        // For recurrence, we need to manipulate dates, so parse to Date first
        const [year, month, day] = formData.dueDate.split("-").map(Number);
        const baseDueDate = new Date(year, month - 1, day);

        if (formData.recurrence === "daily") {
          const chorePromises: Promise<bigint>[] = [];
          for (let i = 0; i < 7; i++) {
            const choreDate = new Date(baseDueDate);
            choreDate.setDate(baseDueDate.getDate() + i);
            chorePromises.push(
              createChore.mutateAsync({
                title: formData.title,
                description: formData.description,
                assignedTo: formData.assignedTo,
                dueDate: BigInt(choreDate.getTime()) * NS_PER_MS,
                recurrence: "none",
              }),
            );
          }
          await Promise.all(chorePromises);
          toast.success("7 daily chores created!");
        } else if (formData.recurrence === "weekly") {
          const chorePromises: Promise<bigint>[] = [];
          for (let i = 0; i < 4; i++) {
            const choreDate = new Date(baseDueDate);
            choreDate.setDate(baseDueDate.getDate() + i * 7);
            chorePromises.push(
              createChore.mutateAsync({
                title: formData.title,
                description: formData.description,
                assignedTo: formData.assignedTo,
                dueDate: BigInt(choreDate.getTime()) * NS_PER_MS,
                recurrence: "none",
              }),
            );
          }
          await Promise.all(chorePromises);
          toast.success("4 weekly chores created!");
        } else {
          await createChore.mutateAsync({
            title: formData.title,
            description: formData.description,
            assignedTo: formData.assignedTo,
            dueDate: localDateStringToNanoseconds(formData.dueDate),
            recurrence: formData.recurrence,
          });
          toast.success("Chore added!");
        }
      }

      setShowForm(false);
      setEditingChore(null);
      setFormData({
        title: "",
        description: "",
        assignedTo: null,
        dueDate: getTodayLocalDate(),
        recurrence: "none",
      });
    } catch (err) {
      toast.error(err instanceof Error ? err.message : "An error occurred");
    }
  };

  const handleToggleComplete = async (chore: Chore) => {
    try {
      await toggleChore.mutateAsync(chore.id);
    } catch (err) {
      toast.error(
        err instanceof Error ? err.message : "Failed to toggle chore",
      );
    }
  };

  const handleEdit = (chore: Chore) => {
    setEditingChore(chore);
    setFormData({
      title: chore.title,
      description: chore.description,
      assignedTo: chore.assignedTo || null,
      dueDate: nanosecondsToLocalDateString(chore.dueDate),
      recurrence: chore.recurrence,
    });
    setShowForm(true);
  };

  const handleDeleteClick = (chore: Chore) => {
    setDeleteTarget(chore);
  };

  const handleConfirmDelete = async () => {
    if (deleteTarget) {
      try {
        await deleteChore.mutateAsync(deleteTarget.id);
        toast.success("Chore deleted!");
      } catch (err) {
        toast.error(
          err instanceof Error ? err.message : "Failed to delete chore",
        );
      }
    }
  };

  if (choresLoading || membersLoading) {
    return <LoadingScreen />;
  }

  if (error) {
    return (
      <EmptyState
        icon={<X className="w-12 h-12 text-destructive" />}
        title="Failed to load chores"
        description="Please try again"
        action={{ label: "Try Again", onClick: () => refetch() }}
      />
    );
  }

  const allChores = filterMemberId
    ? chores.filter((c) => c.assignedTo === filterMemberId)
    : chores;

  const pendingChores = allChores.filter((c) => !c.isCompleted);

  return (
    <div className="space-y-6">
      {/* Header */}
      <div>
        <h2 className="text-3xl text-foreground">Chores</h2>
        <p className="text-sm text-muted-foreground mt-1">
          Manage family chores and track completion
        </p>
      </div>

      {/* Statistics */}
      <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-4">
        <StatCard
          title="Total Chores"
          value={stats.total}
          icon={CheckCircle2}
          changeType="neutral"
        />
        <StatCard
          title="Completion Rate"
          value={`${stats.completionRate}%`}
          change={stats.change.value}
          changeType={stats.change.type}
          icon={CheckCircle2}
        />
        <StatCard
          title="Due Today"
          value={stats.dueToday}
          icon={CalendarDays}
          changeType="neutral"
        />
        <StatCard
          title="Overdue"
          value={stats.overdue}
          icon={AlertCircle}
          changeType={stats.overdue > 0 ? "negative" : "neutral"}
        />
      </div>

      {/* Weekly Progress Chart */}
      <PageCard title="Weekly Progress" subtitle="Last 7 days completion rate">
        <TrendChart
          data={chartData}
          type="bar"
          dataKey="rate"
          xKey="date"
          color={CHART_COLORS.chore}
        />
      </PageCard>

      {/* Controls */}
      <div className="flex flex-col sm:flex-row items-start sm:items-center justify-between gap-4">
        <div className="flex items-center gap-2">
          <Tabs
            value={viewMode}
            onValueChange={(v) => setViewMode(v as ViewMode)}
          >
            <TabsList>
              <TabsTrigger value="week">
                <CalendarDays className="w-4 h-4" />
                Week View
              </TabsTrigger>
              <TabsTrigger value="list">
                <List className="w-4 h-4" />
                List View
              </TabsTrigger>
            </TabsList>
          </Tabs>
        </div>

        <div className="flex items-center gap-2">
          {/* Member Filter */}
          <Select
            value={filterMemberId?.toString() ?? "all"}
            onValueChange={(value) =>
              setFilterMemberId(value === "all" ? null : BigInt(value))
            }
          >
            <SelectTrigger className="w-[180px] text-sm">
              <SelectValue placeholder="All Members" />
            </SelectTrigger>
            <SelectContent>
              <SelectItem value="all">All Members</SelectItem>
              {members.map((m) => (
                <SelectItem key={m.id.toString()} value={m.id.toString()}>
                  {m.name}
                </SelectItem>
              ))}
            </SelectContent>
          </Select>

          <FormButton
            onClick={() => {
              setEditingChore(null);
              setFormData({
                title: "",
                description: "",
                assignedTo: !isAdmin && myMember ? myMember.id : null,
                dueDate: getTodayLocalDate(),
                recurrence: "none",
              });
              setShowForm(true);
            }}
            variant="primary"
          >
            <Plus className="w-4 h-4" />
            Add Chore
          </FormButton>
        </div>
      </div>

      {/* Week View */}
      {viewMode === "week" && (
        <div className="space-y-4">
          {/* Week Navigation */}
          <div className="flex items-center justify-between">
            <Button variant="ghost" size="icon" onClick={navigatePrevWeek}>
              <ChevronLeft className="w-5 h-5 text-muted-foreground" />
            </Button>
            <div className="text-center">
              <div className="text-foreground">
                {currentWeekStart.toLocaleDateString(undefined, {
                  month: "long",
                  year: "numeric",
                })}
              </div>
              <Button
                variant="link"
                onClick={goToThisWeek}
                className="text-sm p-0 h-auto"
              >
                Go to this week
              </Button>
            </div>
            <Button variant="ghost" size="icon" onClick={navigateNextWeek}>
              <ChevronRight className="w-5 h-5 text-muted-foreground" />
            </Button>
          </div>

          {/* Week Grid */}
          <div className="grid grid-cols-1 lg:grid-cols-7 gap-3">
            {weekDays.map((day) => {
              const dayChores = getChoresForDate(day);
              const completed = dayChores.filter((c) => c.isCompleted).length;
              const total = dayChores.length;
              const completionPercent =
                total > 0 ? (completed / total) * 100 : 0;

              return (
                <PageCard
                  key={day.toISOString()}
                  className={isToday(day) ? "ring-2 ring-ring/40" : ""}
                >
                  <div className="text-center mb-3">
                    <div className="text-xs text-muted-foreground">
                      {day.toLocaleDateString(undefined, { weekday: "short" })}
                    </div>
                    <div className="text-lg text-foreground">
                      {day.getDate()}
                    </div>
                    {total > 0 && (
                      <div className="mt-2">
                        <Progress value={completionPercent} className="h-1.5" />
                        <div className="text-xs text-muted-foreground mt-1">
                          {completed}/{total}
                        </div>
                      </div>
                    )}
                  </div>
                  <div className="space-y-2">
                    {dayChores.length === 0 ? (
                      <div className="text-xs text-center text-muted-foreground py-4">
                        No chores
                      </div>
                    ) : (
                      dayChores.map((chore) => {
                        const assignee = members.find(
                          (m) => m.id === chore.assignedTo,
                        );
                        return (
                          <div
                            key={chore.id.toString()}
                            className={`p-2 rounded-lg border transition-all cursor-pointer ${
                              chore.isCompleted
                                ? "bg-primary/10 border-primary/20 opacity-60"
                                : "bg-secondary border-border hover:shadow-sm"
                            }`}
                            onClick={() => handleToggleComplete(chore)}
                          >
                            <div className="flex items-start gap-2">
                              <div
                                className={`mt-0.5 w-5 h-5 rounded-full border-2 flex items-center justify-center shrink-0 ${
                                  chore.isCompleted
                                    ? "border-primary bg-primary"
                                    : "border-muted-foreground"
                                }`}
                              >
                                {chore.isCompleted && (
                                  <CheckCircle2 className="w-4 h-4 text-white" />
                                )}
                              </div>
                              <div className="flex-1 min-w-0">
                                <div
                                  className={`text-xs truncate ${
                                    chore.isCompleted
                                      ? "line-through text-muted-foreground"
                                      : "text-foreground"
                                  }`}
                                >
                                  {chore.title}
                                </div>
                                {assignee && (
                                  <div className="text-xs text-muted-foreground mt-0.5">
                                    {assignee.name}
                                  </div>
                                )}
                              </div>
                            </div>
                          </div>
                        );
                      })
                    )}
                  </div>
                </PageCard>
              );
            })}
          </div>
        </div>
      )}

      {/* List View */}
      {viewMode === "list" && (
        <PageCard>
          {pendingChores.length === 0 ? (
            <EmptyState
              icon={<CheckCircle2 className="w-12 h-12 text-primary" />}
              title="All chores complete!"
              description="No pending chores right now"
            />
          ) : (
            <div className="space-y-2">
              {pendingChores.map((chore) => {
                const assignee = members.find((m) => m.id === chore.assignedTo);
                const dueDate = nanosecondsToDate(chore.dueDate);
                const isOverdue = dueDate < new Date();

                return (
                  <div
                    key={chore.id.toString()}
                    className="flex items-center gap-3 p-3 rounded-lg bg-secondary border border-border hover:shadow-sm transition-all"
                  >
                    <Button
                      variant="ghost"
                      size="icon"
                      onClick={() => handleToggleComplete(chore)}
                      className="w-6 h-6 rounded-full border-2 border-muted-foreground hover:border-primary"
                    >
                      {chore.isCompleted && (
                        <CheckCircle2 className="w-4 h-4 text-primary" />
                      )}
                    </Button>
                    <div className="flex-1 min-w-0">
                      <div className="text-foreground">{chore.title}</div>
                      {chore.description && (
                        <div className="text-sm text-muted-foreground">
                          {chore.description}
                        </div>
                      )}
                      <div className="flex items-center gap-2 mt-1">
                        {assignee && (
                          <div className="flex items-center gap-1">
                            <MemberAvatar member={assignee} size="xs" />
                            <span className="text-xs text-muted-foreground">
                              {assignee.name}
                            </span>
                          </div>
                        )}
                        <Badge
                          variant={isOverdue ? "destructive" : "outline"}
                          className="text-xs"
                        >
                          {formatNanoseconds(chore.dueDate, "MMM dd")}
                        </Badge>
                      </div>
                    </div>
                    {isAdmin && (
                      <div className="flex gap-1">
                        <Button
                          variant="ghost"
                          size="icon"
                          onClick={() => handleEdit(chore)}
                        >
                          <Edit2 className="w-4 h-4 text-muted-foreground" />
                        </Button>
                        {isAdmin && (
                          <Button
                            variant="ghost"
                            size="icon"
                            onClick={() => handleDeleteClick(chore)}
                            className="hover:bg-destructive/10"
                          >
                            <X className="w-4 h-4 text-destructive" />
                          </Button>
                        )}
                      </div>
                    )}
                  </div>
                );
              })}
            </div>
          )}
        </PageCard>
      )}

      {chores.length === 0 && (
        <EmptyState
          icon={<CheckCircle2 className="w-12 h-12 text-primary" />}
          title="No chores yet"
          description="Add your first chore to get started!"
        />
      )}

      {/* Form Modal */}
      <Dialog
        open={showForm}
        onOpenChange={() => {
          setShowForm(false);
          setEditingChore(null);
        }}
      >
        <DialogContent className="max-w-md max-h-[90vh] overflow-y-auto">
          <DialogHeader>
            <DialogTitle>
              {editingChore ? "Edit Chore" : "Add Chore"}
            </DialogTitle>
          </DialogHeader>
          <form onSubmit={handleSubmit} className="space-y-4 mt-4">
            <div>
              <Label className="mb-2">Title</Label>
              <Input
                type="text"
                value={formData.title}
                onChange={(e) =>
                  setFormData({ ...formData, title: e.target.value })
                }
                placeholder="e.g., Take out trash"
                required
              />
            </div>
            <div>
              <Label className="mb-2">Description</Label>
              <Input
                type="text"
                value={formData.description}
                onChange={(e) =>
                  setFormData({ ...formData, description: e.target.value })
                }
                placeholder="Optional details"
              />
            </div>
            {isAdmin ? (
              <div>
                <Label className="mb-2">Assign To</Label>
                <Select
                  value={formData.assignedTo?.toString() ?? "unassigned"}
                  onValueChange={(value) =>
                    setFormData({
                      ...formData,
                      assignedTo: value === "unassigned" ? null : BigInt(value),
                    })
                  }
                >
                  <SelectTrigger className="w-full">
                    <SelectValue placeholder="Unassigned" />
                  </SelectTrigger>
                  <SelectContent>
                    <SelectItem value="unassigned">Unassigned</SelectItem>
                    {members.map((m) => (
                      <SelectItem key={m.id.toString()} value={m.id.toString()}>
                        {m.name}
                      </SelectItem>
                    ))}
                  </SelectContent>
                </Select>
              </div>
            ) : (
              <div>
                <Label className="mb-2">Assigned To</Label>
                <div className="w-full px-3 py-2 rounded-lg border border-border bg-muted text-foreground">
                  {myMember?.name || "You"}
                </div>
              </div>
            )}
            <div>
              <Label className="mb-2">Due Date</Label>
              <Input
                type="date"
                value={formData.dueDate}
                onChange={(e) =>
                  setFormData({ ...formData, dueDate: e.target.value })
                }
                required
              />
            </div>
            {!editingChore && (
              <div>
                <Label className="mb-2">Recurrence</Label>
                <Select
                  value={formData.recurrence}
                  onValueChange={(value) =>
                    setFormData({ ...formData, recurrence: value })
                  }
                >
                  <SelectTrigger className="w-full">
                    <SelectValue />
                  </SelectTrigger>
                  <SelectContent>
                    <SelectItem value="none">One-time</SelectItem>
                    <SelectItem value="daily">Daily (7 days)</SelectItem>
                    <SelectItem value="weekly">Weekly (4 weeks)</SelectItem>
                  </SelectContent>
                </Select>
              </div>
            )}
            <DialogFooter>
              <FormButton
                type="button"
                onClick={() => {
                  setShowForm(false);
                  setEditingChore(null);
                }}
                variant="secondary"
              >
                Cancel
              </FormButton>
              <FormButton
                type="submit"
                disabled={createChore.isPending || updateChore.isPending}
                loading={createChore.isPending || updateChore.isPending}
                variant="primary"
              >
                {editingChore ? "Save" : "Add Chore"}
              </FormButton>
            </DialogFooter>
          </form>
        </DialogContent>
      </Dialog>

      <AlertDialog
        open={deleteTarget !== null}
        onOpenChange={() => setDeleteTarget(null)}
      >
        <AlertDialogContent>
          <AlertDialogHeader>
            <AlertDialogTitle>Delete Chore</AlertDialogTitle>
            <AlertDialogDescription>
              Are you sure you want to delete this chore? This action cannot be
              undone.
            </AlertDialogDescription>
          </AlertDialogHeader>
          <AlertDialogFooter>
            <AlertDialogCancel>Cancel</AlertDialogCancel>
            <AlertDialogAction
              className="bg-destructive hover:bg-destructive/90"
              onClick={() => {
                handleConfirmDelete();
                setDeleteTarget(null);
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
