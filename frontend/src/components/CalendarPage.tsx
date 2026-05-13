import React, { useState, useMemo } from "react";
import {
  useFamilyMembers,
  useCalendarEvents,
  useCreateCalendarEvent,
  useUpdateCalendarEvent,
  useDeleteCalendarEvent,
} from "../hooks/useQueries";
import type { CalendarEvent } from "../backend";
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
import { MemberAvatar } from "./shared/MemberAvatar";
import { PageCard } from "./shared/PageCard";
import { EmptyState } from "./shared/EmptyState";
import { StatCard } from "./shared/StatCard";
import { DataTable, type DataTableColumn } from "./shared/DataTable";
import { Alert, AlertDescription, AlertTitle } from "@/components/ui/alert";
import { Tabs, TabsList, TabsTrigger } from "@/components/ui/tabs";
import {
  Cake,
  Stethoscope,
  Activity,
  Pin,
  ChevronLeft,
  ChevronRight,
  CalendarDays,
  X,
  Calendar,
  Plus,
} from "lucide-react";
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
  formatNanoseconds,
  nanosecondsToDate,
  isWithinDaysFromNow,
  daysUntilNano,
  getTodayLocalDate,
  localDateStringToNanoseconds,
  nanosecondsToLocalDateString,
  NS_PER_MS,
  NS_PER_HOUR,
  MS_PER_DAY,
} from "../utils/dateHelpers";

type ViewMode = "month" | "week" | "day" | "list";

export const CalendarPage: React.FC = () => {
  const { data: members = [], isLoading: membersLoading } = useFamilyMembers();
  const {
    data: events = [],
    isLoading: eventsLoading,
    error,
    refetch,
  } = useCalendarEvents();
  const createEvent = useCreateCalendarEvent();
  const updateEvent = useUpdateCalendarEvent();
  const deleteEvent = useDeleteCalendarEvent();

  const [viewMode, setViewMode] = useState<ViewMode>("month");
  const [currentDate, setCurrentDate] = useState(new Date());
  const [filterMemberId, setFilterMemberId] = useState<bigint | null>(null);
  const [showForm, setShowForm] = useState(false);
  const [editingEvent, setEditingEvent] = useState<CalendarEvent | null>(null);
  const [formData, setFormData] = useState({
    title: "",
    description: "",
    date: getTodayLocalDate(),
    eventType: "activity",
    memberIds: [] as bigint[],
  });
  const [deleteEventId, setDeleteEventId] = useState<bigint | null>(null);

  // Statistics
  const stats = useMemo(() => {
    const today = new Date();
    const todayStart = new Date(
      today.getFullYear(),
      today.getMonth(),
      today.getDate(),
    ).getTime();
    const todayEnd = todayStart + MS_PER_DAY;
    const weekStart = new Date(today);
    weekStart.setDate(today.getDate() - today.getDay());
    weekStart.setHours(0, 0, 0, 0);

    const todayEvents = events.filter((e) => {
      const eventTime = Number(e.startDate / NS_PER_MS);
      return eventTime >= todayStart && eventTime < todayEnd;
    });

    const thisWeekEvents = events.filter((e) => {
      const eventDate = nanosecondsToDate(e.startDate);
      return eventDate >= weekStart && eventDate <= today;
    });

    const upcomingBirthdays = events.filter(
      (e) => e.eventType === "birthday" && isWithinDaysFromNow(e.startDate, 7),
    );

    const futureEvents = events.filter(
      (e) => nanosecondsToDate(e.startDate) > today,
    );

    return {
      total: events.length,
      thisWeek: thisWeekEvents.length,
      today: todayEvents.length,
      upcomingBirthdays,
      futureEvents: futureEvents.length,
    };
  }, [events]);

  // Filter events by member if selected
  const filteredEvents = useMemo(() => {
    if (!filterMemberId) return events;
    return events.filter((e) => e.memberIds.includes(filterMemberId));
  }, [events, filterMemberId]);

  // Get events for a specific date
  const getEventsForDate = (date: Date): CalendarEvent[] => {
    const dayStart = new Date(
      date.getFullYear(),
      date.getMonth(),
      date.getDate(),
    ).getTime();
    const dayEnd = dayStart + MS_PER_DAY;
    return filteredEvents.filter((e) => {
      const eventTime = Number(e.startDate / NS_PER_MS);
      return eventTime >= dayStart && eventTime < dayEnd;
    });
  };

  // Calendar navigation
  const navigatePrev = () => {
    const newDate = new Date(currentDate);
    if (viewMode === "month") {
      newDate.setMonth(newDate.getMonth() - 1);
    } else if (viewMode === "week") {
      newDate.setDate(newDate.getDate() - 7);
    } else {
      newDate.setDate(newDate.getDate() - 1);
    }
    setCurrentDate(newDate);
  };

  const navigateNext = () => {
    const newDate = new Date(currentDate);
    if (viewMode === "month") {
      newDate.setMonth(newDate.getMonth() + 1);
    } else if (viewMode === "week") {
      newDate.setDate(newDate.getDate() + 7);
    } else {
      newDate.setDate(newDate.getDate() + 1);
    }
    setCurrentDate(newDate);
  };

  const goToToday = () => {
    setCurrentDate(new Date());
  };

  // Month view helpers
  const getMonthDays = () => {
    const year = currentDate.getFullYear();
    const month = currentDate.getMonth();
    const firstDay = new Date(year, month, 1);
    const lastDay = new Date(year, month + 1, 0);
    const startPadding = firstDay.getDay();
    const days: (Date | null)[] = [];

    // Add padding for days before month starts
    for (let i = 0; i < startPadding; i++) {
      days.push(null);
    }

    // Add all days of the month
    for (let d = 1; d <= lastDay.getDate(); d++) {
      days.push(new Date(year, month, d));
    }

    return days;
  };

  // Week view helpers
  const getWeekDays = () => {
    const days: Date[] = [];
    const startOfWeek = new Date(currentDate);
    startOfWeek.setDate(currentDate.getDate() - currentDate.getDay());

    for (let i = 0; i < 7; i++) {
      const day = new Date(startOfWeek);
      day.setDate(startOfWeek.getDate() + i);
      days.push(day);
    }
    return days;
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
      const startDate = localDateStringToNanoseconds(formData.date);
      const endDate = startDate + NS_PER_HOUR;
      if (editingEvent) {
        await updateEvent.mutateAsync({
          id: editingEvent.id,
          title: formData.title,
          description: formData.description,
          startDate,
          endDate,
          memberIds: formData.memberIds,
          eventType: formData.eventType,
        });
        toast.success("Event updated!");
      } else {
        await createEvent.mutateAsync({
          title: formData.title,
          description: formData.description,
          startDate,
          endDate,
          memberIds: formData.memberIds,
          eventType: formData.eventType,
        });
        toast.success("Event added!");
      }
      setShowForm(false);
      setEditingEvent(null);
      setFormData({
        title: "",
        description: "",
        date: getTodayLocalDate(),
        eventType: "activity",
        memberIds: [],
      });
    } catch (err) {
      toast.error(
        err instanceof Error
          ? err.message
          : editingEvent
            ? "Failed to update event"
            : "Failed to add event",
      );
    }
  };

  const handleEdit = (event: CalendarEvent) => {
    setEditingEvent(event);
    setFormData({
      title: event.title,
      description: event.description,
      date: nanosecondsToLocalDateString(event.startDate),
      eventType: event.eventType,
      memberIds: [...event.memberIds],
    });
    setShowForm(true);
  };

  const handleDelete = async (eventId: bigint) => {
    try {
      await deleteEvent.mutateAsync(eventId);
      toast.success("Event removed!");
    } catch (err) {
      toast.error(
        err instanceof Error ? err.message : "Failed to delete event",
      );
    }
  };

  const handleConfirmDelete = async () => {
    if (deleteEventId !== null) {
      await handleDelete(deleteEventId);
      if (editingEvent && editingEvent.id === deleteEventId) {
        setShowForm(false);
        setEditingEvent(null);
      }
    }
  };

  const toggleMember = (memberId: bigint) => {
    setFormData((prev) => ({
      ...prev,
      memberIds: prev.memberIds.includes(memberId)
        ? prev.memberIds.filter((id) => id !== memberId)
        : [...prev.memberIds, memberId],
    }));
  };

  const getEventIcon = (eventType: string, size: "sm" | "md" | "lg" = "md") => {
    const sizeClasses = {
      sm: "w-4 h-4",
      md: "w-5 h-5",
      lg: "w-6 h-6",
    };
    const iconClass = sizeClasses[size];

    switch (eventType) {
      case "birthday":
        return <Cake className={iconClass} />;
      case "appointment":
        return <Stethoscope className={iconClass} />;
      case "activity":
        return <Activity className={iconClass} />;
      default:
        return <Pin className={iconClass} />;
    }
  };

  const getEventTypeColor = (eventType: string) => {
    switch (eventType) {
      case "birthday":
        return "text-pink-500 bg-pink-50 dark:bg-pink-900/20 border-pink-200 dark:border-pink-800";
      case "appointment":
        return "text-blue-500 bg-blue-50 dark:bg-blue-900/20 border-blue-200 dark:border-blue-800";
      case "activity":
        return "text-primary bg-primary/10 border-primary/20";
      default:
        return "text-gray-500 bg-gray-50 dark:bg-gray-900/20 border-gray-200 dark:border-gray-800";
    }
  };

  // DataTable columns for list view
  const eventColumns: DataTableColumn<CalendarEvent>[] = [
    {
      key: "eventType",
      label: "Type",
      render: (event) => (
        <div
          className={`inline-flex items-center gap-2 px-3 py-1 rounded-full border ${getEventTypeColor(event.eventType)}`}
        >
          {getEventIcon(event.eventType, "sm")}
          <span className="text-xs capitalize">{event.eventType}</span>
        </div>
      ),
    },
    {
      key: "title",
      label: "Title",
      sortable: true,
      render: (event) => <div className="text-foreground">{event.title}</div>,
    },
    {
      key: "startDate",
      label: "Date",
      sortable: true,
      render: (event) => (
        <div className="text-sm">
          <div className="text-foreground">
            {formatNanoseconds(event.startDate, "MMM dd, yyyy")}
          </div>
          <div className="text-xs text-muted-foreground">
            {formatNanoseconds(event.startDate, "h:mm a")}
          </div>
        </div>
      ),
    },
    {
      key: "memberIds",
      label: "Attendees",
      render: (event) => {
        const eventMembers = members.filter((m) =>
          event.memberIds.includes(m.id),
        );
        if (eventMembers.length === 0) {
          return <span className="text-xs text-muted-foreground">None</span>;
        }
        return (
          <div className="flex gap-1">
            {eventMembers.slice(0, 3).map((m) => (
              <MemberAvatar key={m.id.toString()} member={m} size="xs" />
            ))}
            {eventMembers.length > 3 && (
              <span className="text-xs text-muted-foreground">
                +{eventMembers.length - 3}
              </span>
            )}
          </div>
        );
      },
    },
    {
      key: "description",
      label: "Description",
      render: (event) => (
        <div className="text-sm text-muted-foreground truncate max-w-xs">
          {event.description || "\u2014"}
        </div>
      ),
    },
    {
      key: "actions",
      label: "Actions",
      render: (event) => (
        <div className="flex gap-2">
          <Button
            variant="link"
            onClick={() => handleEdit(event)}
            className="text-sm p-0 h-auto"
          >
            Edit
          </Button>
          <Button
            variant="link"
            onClick={() => setDeleteEventId(event.id)}
            className="text-sm p-0 h-auto text-destructive"
          >
            Delete
          </Button>
        </div>
      ),
    },
  ];

  const isLoading = membersLoading || eventsLoading;

  if (isLoading) {
    return <LoadingScreen />;
  }

  if (error) {
    return (
      <EmptyState
        icon={<X className="w-12 h-12 text-destructive" />}
        title="Failed to load events"
        description="Please try again"
        action={{
          label: "Try Again",
          onClick: () => refetch(),
        }}
      />
    );
  }

  const weekDays = ["Sun", "Mon", "Tue", "Wed", "Thu", "Fri", "Sat"];

  return (
    <div className="space-y-6">
      {/* Header */}
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4">
        <div>
          <h2 className="text-3xl text-foreground">Family Calendar</h2>
          <p className="text-sm text-muted-foreground mt-1">
            Track events, appointments, and special occasions
          </p>
        </div>
        <FormButton
          onClick={() => {
            setEditingEvent(null);
            setFormData({
              title: "",
              description: "",
              date: getTodayLocalDate(),
              eventType: "activity",
              memberIds: [],
            });
            setShowForm(true);
          }}
          variant="primary"
        >
          <Plus className="w-4 h-4" />
          Add Event
        </FormButton>
      </div>

      {/* Birthday Alerts */}
      {stats.upcomingBirthdays.length > 0 && (
        <div className="space-y-2">
          {stats.upcomingBirthdays.slice(0, 2).map((birthday) => (
            <Alert key={birthday.id.toString()}>
              <Cake className="h-4 w-4" />
              <AlertTitle>Upcoming Birthday!</AlertTitle>
              <AlertDescription>
                {birthday.title} is in {daysUntilNano(birthday.startDate)} day
                {daysUntilNano(birthday.startDate) === 1 ? "" : "s"} -{" "}
                {formatNanoseconds(birthday.startDate, "MMMM dd")}
              </AlertDescription>
            </Alert>
          ))}
        </div>
      )}

      {/* Statistics */}
      <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-4">
        <StatCard
          title="Total Events"
          value={stats.total}
          icon={Calendar}
          changeType="neutral"
        />
        <StatCard
          title="This Week"
          value={stats.thisWeek}
          change={`${stats.today} today`}
          changeType="neutral"
          icon={CalendarDays}
        />
        <StatCard
          title="Upcoming"
          value={stats.futureEvents}
          change="Future events"
          changeType="neutral"
          icon={Activity}
        />
        <StatCard
          title="Birthdays"
          value={stats.upcomingBirthdays.length}
          change="Next 7 days"
          changeType={
            stats.upcomingBirthdays.length > 0 ? "positive" : "neutral"
          }
          icon={Cake}
        />
      </div>

      {/* View Toggle */}
      <Tabs value={viewMode} onValueChange={(v) => setViewMode(v as ViewMode)}>
        <TabsList>
          <TabsTrigger value="month">Month</TabsTrigger>
          <TabsTrigger value="week">Week</TabsTrigger>
          <TabsTrigger value="day">Day</TabsTrigger>
          <TabsTrigger value="list">List</TabsTrigger>
        </TabsList>
      </Tabs>

      {/* View Controls & Navigation */}
      {viewMode !== "list" && (
        <PageCard>
          <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4">
            {/* Navigation */}
            <div className="flex items-center gap-2">
              <Button variant="ghost" size="icon" onClick={navigatePrev}>
                <ChevronLeft className="w-5 h-5 text-muted-foreground" />
              </Button>
              <FormButton
                onClick={goToToday}
                variant="secondary"
                className="text-sm"
              >
                Today
              </FormButton>
              <Button variant="ghost" size="icon" onClick={navigateNext}>
                <ChevronRight className="w-5 h-5 text-muted-foreground" />
              </Button>
            </div>

            {/* Current Date Display */}
            <div className="text-lg text-foreground">
              {viewMode === "month" &&
                currentDate.toLocaleDateString(undefined, {
                  month: "long",
                  year: "numeric",
                })}
              {viewMode === "week" && (
                <>
                  {getWeekDays()[0].toLocaleDateString(undefined, {
                    month: "short",
                    day: "numeric",
                  })}{" "}
                  -{" "}
                  {getWeekDays()[6].toLocaleDateString(undefined, {
                    month: "short",
                    day: "numeric",
                    year: "numeric",
                  })}
                </>
              )}
              {viewMode === "day" &&
                currentDate.toLocaleDateString(undefined, {
                  weekday: "long",
                  month: "long",
                  day: "numeric",
                  year: "numeric",
                })}
            </div>
          </div>

          {/* Member Filter */}
          <div className="mt-4 pt-4 border-t border-border">
            <div className="flex items-center gap-1.5 flex-wrap">
              <span className="text-sm text-muted-foreground mr-0.5">
                Filter:
              </span>
              <button
                onClick={() => setFilterMemberId(null)}
                className={cn(
                  "inline-flex items-center rounded-full px-3 py-1 text-sm font-medium transition-all duration-200",
                  filterMemberId === null
                    ? "bg-primary text-primary-foreground shadow-sm"
                    : "bg-muted text-muted-foreground hover:bg-accent hover:text-accent-foreground",
                )}
              >
                All
              </button>
              {members.map((member) => (
                <button
                  key={member.id.toString()}
                  onClick={() =>
                    setFilterMemberId(
                      filterMemberId === member.id ? null : member.id,
                    )
                  }
                  className={cn(
                    "inline-flex items-center gap-1.5 rounded-full px-3 py-1 text-sm font-medium transition-all duration-200",
                    filterMemberId === member.id
                      ? "bg-primary text-primary-foreground shadow-sm"
                      : "bg-muted text-muted-foreground hover:bg-accent hover:text-accent-foreground",
                  )}
                >
                  <span className="text-sm leading-none">
                    {member.avatarEmoji}
                  </span>
                  <span>{member.name}</span>
                </button>
              ))}
            </div>
          </div>
        </PageCard>
      )}

      {/* Month View */}
      {viewMode === "month" && (
        <PageCard>
          {/* Week day headers */}
          <div className="grid grid-cols-7 -mx-6 -mt-6">
            {weekDays.map((day) => (
              <div
                key={day}
                className="p-2 text-center text-sm text-muted-foreground border-b border-border"
              >
                {day}
              </div>
            ))}
          </div>

          {/* Calendar days */}
          <div className="grid grid-cols-7 -mx-6 -mb-6">
            {getMonthDays().map((date, i) => {
              const dayEvents = date ? getEventsForDate(date) : [];
              return (
                <div
                  key={i}
                  className={`min-h-[100px] p-2 border-b border-r border-border last:border-r-0 ${
                    !date ? "bg-background" : ""
                  } ${date && isToday(date) ? "bg-primary/10" : ""}`}
                >
                  {date && (
                    <>
                      <div
                        className={`text-sm mb-1 ${
                          isToday(date)
                            ? "w-7 h-7 bg-primary text-white rounded-full flex items-center justify-center"
                            : "text-foreground"
                        }`}
                      >
                        {date.getDate()}
                      </div>
                      <div className="space-y-1">
                        {dayEvents.slice(0, 3).map((event) => (
                          <div
                            key={event.id.toString()}
                            onClick={() => handleEdit(event)}
                            className="text-xs p-1 bg-primary/20 text-primary rounded truncate cursor-pointer hover:bg-primary/30 flex items-center gap-1 transition-all"
                            title={event.title}
                          >
                            {getEventIcon(event.eventType, "sm")}
                            <span className="truncate">{event.title}</span>
                          </div>
                        ))}
                        {dayEvents.length > 3 && (
                          <div className="text-xs text-muted-foreground">
                            +{dayEvents.length - 3} more
                          </div>
                        )}
                      </div>
                    </>
                  )}
                </div>
              );
            })}
          </div>
        </PageCard>
      )}

      {/* Week View */}
      {viewMode === "week" && (
        <PageCard>
          <div className="grid grid-cols-7 -mx-6 -mt-6 -mb-6">
            {getWeekDays().map((date) => {
              const dayEvents = getEventsForDate(date);
              return (
                <div
                  key={date.toISOString()}
                  className={`min-h-[300px] border-r border-border last:border-r-0 ${
                    isToday(date) ? "bg-primary/10" : ""
                  }`}
                >
                  {/* Day header */}
                  <div className="p-3 border-b border-border text-center">
                    <div className="text-xs text-muted-foreground uppercase">
                      {weekDays[date.getDay()]}
                    </div>
                    <div
                      className={`text-lg ${
                        isToday(date)
                          ? "w-8 h-8 bg-primary text-white rounded-full flex items-center justify-center mx-auto"
                          : "text-foreground"
                      }`}
                    >
                      {date.getDate()}
                    </div>
                  </div>

                  {/* Events */}
                  <div className="p-2 space-y-2">
                    {dayEvents.map((event) => {
                      const eventMembers = members.filter((m) =>
                        event.memberIds.includes(m.id),
                      );
                      return (
                        <div
                          key={event.id.toString()}
                          onClick={() => handleEdit(event)}
                          className="p-2 bg-muted/30 rounded-lg text-xs cursor-pointer hover:bg-muted/50 transition-colors"
                        >
                          <div className="text-foreground flex items-center gap-1">
                            {getEventIcon(event.eventType, "sm")}
                            <span className="truncate">{event.title}</span>
                          </div>
                          {eventMembers.length > 0 && (
                            <div className="flex gap-0.5 mt-1">
                              {eventMembers.slice(0, 3).map((m) => (
                                <span
                                  key={m.id.toString()}
                                  className="w-4 h-4 rounded-full text-[10px] flex items-center justify-center text-white"
                                  style={{ backgroundColor: m.color }}
                                  title={m.name}
                                >
                                  {m.avatarEmoji}
                                </span>
                              ))}
                            </div>
                          )}
                        </div>
                      );
                    })}
                  </div>
                </div>
              );
            })}
          </div>
        </PageCard>
      )}

      {/* Day View */}
      {viewMode === "day" && (
        <PageCard>
          <div className="mb-6">
            <div
              className={`text-3xl ${
                isToday(currentDate) ? "text-primary" : "text-foreground"
              }`}
            >
              {currentDate.getDate()}
            </div>
            <div className="text-muted-foreground">
              {currentDate.toLocaleDateString(undefined, {
                weekday: "long",
                month: "long",
                year: "numeric",
              })}
            </div>
          </div>

          {/* Day's events */}
          <div className="space-y-4">
            {getEventsForDate(currentDate).length === 0 ? (
              <EmptyState
                icon={<CalendarDays className="w-12 h-12 text-primary" />}
                title="No events scheduled for this day"
                description=""
              />
            ) : (
              getEventsForDate(currentDate).map((event) => {
                const eventMembers = members.filter((m) =>
                  event.memberIds.includes(m.id),
                );
                return (
                  <div
                    key={event.id.toString()}
                    onClick={() => handleEdit(event)}
                    className="flex items-start gap-4 p-4 bg-muted/30 rounded-xl cursor-pointer hover:bg-muted/50 transition-colors"
                  >
                    <div className="text-3xl text-primary">
                      {getEventIcon(event.eventType, "lg")}
                    </div>
                    <div className="flex-1">
                      <div className="text-foreground text-lg">
                        {event.title}
                      </div>
                      {event.description && (
                        <div className="text-muted-foreground mt-1">
                          {event.description}
                        </div>
                      )}
                      {eventMembers.length > 0 && (
                        <div className="flex gap-2 mt-3 flex-wrap">
                          {eventMembers.map((m) => (
                            <MemberAvatar
                              key={m.id.toString()}
                              member={m}
                              size="xs"
                              showName
                            />
                          ))}
                        </div>
                      )}
                    </div>
                  </div>
                );
              })
            )}
          </div>
        </PageCard>
      )}

      {/* List View */}
      {viewMode === "list" && (
        <PageCard
          title="All Events"
          subtitle={`${filteredEvents.length} total events`}
        >
          {filteredEvents.length === 0 ? (
            <EmptyState
              icon={<CalendarDays className="w-12 h-12 text-primary" />}
              title="No events yet"
              description="Start by adding your first event"
            />
          ) : (
            <DataTable
              columns={eventColumns}
              data={filteredEvents
                .slice()
                .sort((a, b) => Number(b.startDate - a.startDate))}
            />
          )}
        </PageCard>
      )}

      {/* Form Modal */}
      <Dialog
        open={showForm}
        onOpenChange={() => {
          setShowForm(false);
          setEditingEvent(null);
        }}
      >
        <DialogContent className="max-w-md max-h-[90vh] overflow-y-auto">
          <DialogHeader>
            <DialogTitle>
              {editingEvent ? "Edit Event" : "Add Event"}
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
                required
              />
            </div>
            <div>
              <Label className="mb-2">Date</Label>
              <Input
                type="date"
                value={formData.date}
                onChange={(e) =>
                  setFormData({ ...formData, date: e.target.value })
                }
                required
              />
            </div>
            <div>
              <Label className="mb-2">Type</Label>
              <Select
                value={formData.eventType}
                onValueChange={(value) =>
                  setFormData({ ...formData, eventType: value })
                }
              >
                <SelectTrigger className="w-full">
                  <SelectValue />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="activity">Activity</SelectItem>
                  <SelectItem value="appointment">Appointment</SelectItem>
                  <SelectItem value="birthday">Birthday</SelectItem>
                  <SelectItem value="reminder">Reminder</SelectItem>
                </SelectContent>
              </Select>
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
              <Label className="mb-2">Who's involved?</Label>
              <div className="flex gap-2 flex-wrap">
                {members.map((member) => (
                  <button
                    key={member.id.toString()}
                    type="button"
                    onClick={() => toggleMember(member.id)}
                    className={cn(
                      "inline-flex items-center gap-2 rounded-full px-3 py-1.5 text-sm font-medium border transition-all duration-200",
                      formData.memberIds.includes(member.id)
                        ? "border-primary bg-primary/10 text-primary shadow-sm"
                        : "border-border text-muted-foreground hover:border-muted-foreground hover:text-foreground",
                    )}
                  >
                    <span
                      className="w-5 h-5 rounded-full flex items-center justify-center text-white text-[10px]"
                      style={{ backgroundColor: member.color }}
                    >
                      {member.avatarEmoji}
                    </span>
                    <span>{member.name}</span>
                  </button>
                ))}
              </div>
            </div>
            <DialogFooter>
              <FormButton
                type="button"
                onClick={() => {
                  setShowForm(false);
                  setEditingEvent(null);
                }}
                variant="secondary"
              >
                Cancel
              </FormButton>
              <FormButton
                type="submit"
                disabled={!formData.title.trim()}
                loading={
                  editingEvent ? updateEvent.isPending : createEvent.isPending
                }
                variant="primary"
              >
                {editingEvent ? "Save Changes" : "Add Event"}
              </FormButton>
            </DialogFooter>
            {editingEvent && (
              <div className="pt-4 mt-4 border-t border-border">
                <FormButton
                  type="button"
                  onClick={() => setDeleteEventId(editingEvent.id)}
                  disabled={deleteEvent.isPending}
                  loading={deleteEvent.isPending}
                  variant="secondary"
                  className="w-full text-destructive hover:text-destructive"
                >
                  Delete Event
                </FormButton>
              </div>
            )}
          </form>
        </DialogContent>
      </Dialog>

      <AlertDialog
        open={deleteEventId !== null}
        onOpenChange={() => setDeleteEventId(null)}
      >
        <AlertDialogContent>
          <AlertDialogHeader>
            <AlertDialogTitle>Delete Event</AlertDialogTitle>
            <AlertDialogDescription>
              Are you sure you want to delete this event? This action cannot be
              undone.
            </AlertDialogDescription>
          </AlertDialogHeader>
          <AlertDialogFooter>
            <AlertDialogCancel>Cancel</AlertDialogCancel>
            <AlertDialogAction
              className="bg-destructive hover:bg-destructive/90"
              onClick={() => {
                handleConfirmDelete();
                setDeleteEventId(null);
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
