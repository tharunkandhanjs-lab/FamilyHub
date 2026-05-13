import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query";
import { useActor } from "./useActor";
import { useInternetIdentity } from "./useInternetIdentity";
import type {
  FamilyMember,
  MoodEntry,
  CalendarEvent,
  Chore,
  MealOption,
  ShoppingItem,
  SampleData,
  FamilyStatus,
  InviteDetails,
  Family,
} from "../backend";

// ==================== Family Status Hooks ====================

export function useFamilyStatus() {
  const { actor, isFetching } = useActor();
  const { identity } = useInternetIdentity();
  const principal = identity?.getPrincipal().toString() ?? "anonymous";

  return useQuery<FamilyStatus>({
    queryKey: ["familyStatus", principal],
    queryFn: async () => {
      if (!actor) return { __kind__: "NotLinked", NotLinked: null };
      return actor.getMyFamilyStatus();
    },
    enabled: !!actor && !isFetching,
    staleTime: Infinity, // Only refetch on invalidation
  });
}

export function useMyFamily() {
  const { actor, isFetching } = useActor();

  return useQuery<Family>({
    queryKey: ["myFamily"],
    queryFn: async () => {
      if (!actor) throw new Error("Actor not available");
      return actor.getMyFamily();
    },
    enabled: !!actor && !isFetching,
  });
}

export function useMyMember() {
  const { actor, isFetching } = useActor();

  return useQuery<FamilyMember>({
    queryKey: ["myMember"],
    queryFn: async () => {
      if (!actor) throw new Error("Actor not available");
      return actor.getMyMember();
    },
    enabled: !!actor && !isFetching,
  });
}

export function useCreateFamily() {
  const { actor } = useActor();
  const queryClient = useQueryClient();

  return useMutation<
    { familyId: bigint; memberId: bigint },
    Error,
    {
      familyName: string;
      adminName: string;
      adminColor: string;
      adminAvatarEmoji: string;
    }
  >({
    mutationFn: async (data) => {
      if (!actor) throw new Error("Actor not available");
      return actor.createFamily(
        data.familyName,
        data.adminName,
        data.adminColor,
        data.adminAvatarEmoji,
      );
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["familyStatus"] });
      queryClient.invalidateQueries({ queryKey: ["myFamily"] });
      queryClient.invalidateQueries({ queryKey: ["myMember"] });
      queryClient.invalidateQueries({ queryKey: ["familyMembers"] });
    },
  });
}

export function useInviteDetails(code: string) {
  const { actor, isFetching } = useActor();

  return useQuery<InviteDetails>({
    queryKey: ["inviteDetails", code],
    queryFn: async () => {
      if (!actor) throw new Error("Actor not available");
      return actor.getInviteDetails(code);
    },
    enabled: !!actor && !isFetching && !!code && code.length > 0,
    retry: false, // Don't retry on invalid code
  });
}

export function useJoinFamily() {
  const { actor } = useActor();
  const queryClient = useQueryClient();

  return useMutation<{ familyId: bigint; memberId: bigint }, Error, string>({
    mutationFn: async (inviteCode) => {
      if (!actor) throw new Error("Actor not available");
      return actor.joinFamilyWithCode(inviteCode);
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["familyStatus"] });
      queryClient.invalidateQueries({ queryKey: ["myFamily"] });
      queryClient.invalidateQueries({ queryKey: ["myMember"] });
      queryClient.invalidateQueries({ queryKey: ["familyMembers"] });
    },
  });
}

// ==================== Family Member Hooks ====================

export function useFamilyMembers() {
  const { actor, isFetching } = useActor();

  return useQuery<FamilyMember[]>({
    queryKey: ["familyMembers"],
    queryFn: async () => {
      if (!actor) return [];
      return actor.getAllFamilyMembers();
    },
    enabled: !!actor && !isFetching,
  });
}

// Add family member with invite code (admin only)
export function useAddFamilyMemberWithInvite() {
  const { actor } = useActor();
  const queryClient = useQueryClient();

  return useMutation<
    { memberId: bigint; inviteCode: string },
    Error,
    { name: string; color: string; avatarEmoji: string }
  >({
    mutationFn: async (data) => {
      if (!actor) throw new Error("Actor not available");
      return actor.addFamilyMemberWithInvite(
        data.name,
        data.color,
        data.avatarEmoji,
      );
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["familyMembers"] });
      queryClient.invalidateQueries({ queryKey: ["dataCounts"] });
    },
  });
}

// Regenerate invite code for unlinked member (admin only)
export function useRegenerateInviteCode() {
  const { actor } = useActor();
  const queryClient = useQueryClient();

  return useMutation<string, Error, bigint>({
    mutationFn: async (memberId) => {
      if (!actor) throw new Error("Actor not available");
      return actor.regenerateInviteCode(memberId);
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["familyMembers"] });
    },
  });
}

export function useUpdateFamilyMember() {
  const { actor } = useActor();
  const queryClient = useQueryClient();

  return useMutation<
    FamilyMember,
    Error,
    { id: bigint; name: string; color: string; avatarEmoji: string }
  >({
    mutationFn: async (data) => {
      if (!actor) throw new Error("Actor not available");
      return actor.updateFamilyMember(
        data.id,
        data.name,
        data.color,
        data.avatarEmoji,
      );
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["familyMembers"] });
      queryClient.invalidateQueries({ queryKey: ["myMember"] });
    },
  });
}

export function useUpdateMemberRole() {
  const { actor } = useActor();
  const queryClient = useQueryClient();

  return useMutation<FamilyMember, Error, { id: bigint; role: string }>({
    mutationFn: async (data) => {
      if (!actor) throw new Error("Actor not available");
      return actor.updateMemberRole(data.id, data.role);
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["familyMembers"] });
      queryClient.invalidateQueries({ queryKey: ["myMember"] });
    },
  });
}

export function useDeleteFamilyMember() {
  const { actor } = useActor();
  const queryClient = useQueryClient();

  return useMutation<boolean, Error, bigint>({
    mutationFn: async (id) => {
      if (!actor) throw new Error("Actor not available");
      return actor.deleteFamilyMember(id);
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["familyMembers"] });
      queryClient.invalidateQueries({ queryKey: ["dataCounts"] });
    },
  });
}

// ==================== Mood Entry Hooks ====================

export function useMoodEntries() {
  const { actor, isFetching } = useActor();

  return useQuery<MoodEntry[]>({
    queryKey: ["moodEntries"],
    queryFn: async () => {
      if (!actor) return [];
      return actor.getAllMoodEntries();
    },
    enabled: !!actor && !isFetching,
  });
}

export function useMoodEntriesByMember(memberId: bigint) {
  const { actor, isFetching } = useActor();

  return useQuery<MoodEntry[]>({
    queryKey: ["moodEntries", "member", memberId.toString()],
    queryFn: async () => {
      if (!actor) return [];
      return actor.getMoodEntriesByMember(memberId);
    },
    enabled: !!actor && !isFetching,
  });
}

export function useCreateMoodEntry() {
  const { actor } = useActor();
  const queryClient = useQueryClient();

  return useMutation<
    bigint,
    Error,
    { memberId: bigint; mood: string; note: string; date: bigint }
  >({
    mutationFn: async (data) => {
      if (!actor) throw new Error("Actor not available");
      return actor.addMoodEntry(data.memberId, data.mood, data.note, data.date);
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["moodEntries"] });
      queryClient.invalidateQueries({ queryKey: ["dataCounts"] });
    },
  });
}

export function useUpdateMoodEntry() {
  const { actor } = useActor();
  const queryClient = useQueryClient();

  return useMutation<
    MoodEntry,
    Error,
    { id: bigint; mood: string; note: string }
  >({
    mutationFn: async (data) => {
      if (!actor) throw new Error("Actor not available");
      return actor.updateMoodEntry(data.id, data.mood, data.note);
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["moodEntries"] });
    },
  });
}

export function useDeleteMoodEntry() {
  const { actor } = useActor();
  const queryClient = useQueryClient();

  return useMutation<boolean, Error, bigint>({
    mutationFn: async (id) => {
      if (!actor) throw new Error("Actor not available");
      return actor.deleteMoodEntry(id);
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["moodEntries"] });
      queryClient.invalidateQueries({ queryKey: ["dataCounts"] });
    },
  });
}

// ==================== Calendar Event Hooks ====================

export function useCalendarEvents() {
  const { actor, isFetching } = useActor();

  return useQuery<CalendarEvent[]>({
    queryKey: ["calendarEvents"],
    queryFn: async () => {
      if (!actor) return [];
      return actor.getAllCalendarEvents();
    },
    enabled: !!actor && !isFetching,
  });
}

export function useCalendarEventsByDateRange(
  startDate: bigint,
  endDate: bigint,
) {
  const { actor, isFetching } = useActor();

  return useQuery<CalendarEvent[]>({
    queryKey: [
      "calendarEvents",
      "range",
      startDate.toString(),
      endDate.toString(),
    ],
    queryFn: async () => {
      if (!actor) return [];
      return actor.getCalendarEventsByDateRange(startDate, endDate);
    },
    enabled: !!actor && !isFetching,
  });
}

export function useCreateCalendarEvent() {
  const { actor } = useActor();
  const queryClient = useQueryClient();

  return useMutation<
    bigint,
    Error,
    {
      title: string;
      description: string;
      startDate: bigint;
      endDate: bigint;
      memberIds: bigint[];
      eventType: string;
    }
  >({
    mutationFn: async (data) => {
      if (!actor) throw new Error("Actor not available");
      return actor.addCalendarEvent(
        data.title,
        data.description,
        data.startDate,
        data.endDate,
        data.memberIds,
        data.eventType,
      );
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["calendarEvents"] });
      queryClient.invalidateQueries({ queryKey: ["dataCounts"] });
    },
  });
}

export function useUpdateCalendarEvent() {
  const { actor } = useActor();
  const queryClient = useQueryClient();

  return useMutation<
    CalendarEvent,
    Error,
    {
      id: bigint;
      title: string;
      description: string;
      startDate: bigint;
      endDate: bigint;
      memberIds: bigint[];
      eventType: string;
    }
  >({
    mutationFn: async (data) => {
      if (!actor) throw new Error("Actor not available");
      return actor.updateCalendarEvent(
        data.id,
        data.title,
        data.description,
        data.startDate,
        data.endDate,
        data.memberIds,
        data.eventType,
      );
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["calendarEvents"] });
    },
  });
}

export function useDeleteCalendarEvent() {
  const { actor } = useActor();
  const queryClient = useQueryClient();

  return useMutation<boolean, Error, bigint>({
    mutationFn: async (id) => {
      if (!actor) throw new Error("Actor not available");
      return actor.deleteCalendarEvent(id);
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["calendarEvents"] });
      queryClient.invalidateQueries({ queryKey: ["dataCounts"] });
    },
  });
}

// ==================== Chore Hooks ====================

export function useChores() {
  const { actor, isFetching } = useActor();

  return useQuery<Chore[]>({
    queryKey: ["chores"],
    queryFn: async () => {
      if (!actor) return [];
      return actor.getAllChores();
    },
    enabled: !!actor && !isFetching,
  });
}

export function useChoresByMember(memberId: bigint) {
  const { actor, isFetching } = useActor();

  return useQuery<Chore[]>({
    queryKey: ["chores", "member", memberId.toString()],
    queryFn: async () => {
      if (!actor) return [];
      return actor.getChoresByMember(memberId);
    },
    enabled: !!actor && !isFetching,
  });
}

export function useCreateChore() {
  const { actor } = useActor();
  const queryClient = useQueryClient();

  return useMutation<
    bigint,
    Error,
    {
      title: string;
      description: string;
      assignedTo: bigint | null;
      dueDate: bigint;
      recurrence: string;
    }
  >({
    mutationFn: async (data) => {
      if (!actor) throw new Error("Actor not available");
      return actor.addChore(
        data.title,
        data.description,
        data.assignedTo,
        data.dueDate,
        data.recurrence,
      );
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["chores"] });
      queryClient.invalidateQueries({ queryKey: ["dataCounts"] });
    },
  });
}

export function useUpdateChore() {
  const { actor } = useActor();
  const queryClient = useQueryClient();

  return useMutation<
    Chore,
    Error,
    {
      id: bigint;
      title: string;
      description: string;
      assignedTo: bigint | null;
      dueDate: bigint;
      recurrence: string;
    }
  >({
    mutationFn: async (data) => {
      if (!actor) throw new Error("Actor not available");
      return actor.updateChore(
        data.id,
        data.title,
        data.description,
        data.assignedTo,
        data.dueDate,
        data.recurrence,
      );
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["chores"] });
    },
  });
}

export function useToggleChoreComplete() {
  const { actor } = useActor();
  const queryClient = useQueryClient();

  return useMutation<Chore, Error, bigint>({
    mutationFn: async (id) => {
      if (!actor) throw new Error("Actor not available");
      return actor.toggleChoreComplete(id);
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["chores"] });
    },
  });
}

export function useDeleteChore() {
  const { actor } = useActor();
  const queryClient = useQueryClient();

  return useMutation<boolean, Error, bigint>({
    mutationFn: async (id) => {
      if (!actor) throw new Error("Actor not available");
      return actor.deleteChore(id);
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["chores"] });
      queryClient.invalidateQueries({ queryKey: ["dataCounts"] });
    },
  });
}

// ==================== Meal Voting Hooks ====================

export function useMealOptions() {
  const { actor, isFetching } = useActor();

  return useQuery<MealOption[]>({
    queryKey: ["mealOptions"],
    queryFn: async () => {
      if (!actor) return [];
      return actor.getAllMealOptions();
    },
    enabled: !!actor && !isFetching,
  });
}

export function useCreateMealOption() {
  const { actor } = useActor();
  const queryClient = useQueryClient();

  return useMutation<
    bigint,
    Error,
    {
      name: string;
      description: string;
      proposedBy: bigint;
      scheduledDate: bigint;
    }
  >({
    mutationFn: async (data) => {
      if (!actor) throw new Error("Actor not available");
      return actor.addMealOption(
        data.name,
        data.description,
        data.proposedBy,
        data.scheduledDate,
      );
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["mealOptions"] });
      queryClient.invalidateQueries({ queryKey: ["dataCounts"] });
    },
  });
}

export function useVoteForMeal() {
  const { actor } = useActor();
  const queryClient = useQueryClient();

  return useMutation<MealOption, Error, { mealId: bigint; memberId: bigint }>({
    mutationFn: async (data) => {
      if (!actor) throw new Error("Actor not available");
      return actor.voteForMeal(data.mealId, data.memberId);
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["mealOptions"] });
    },
  });
}

export function useSelectMeal() {
  const { actor } = useActor();
  const queryClient = useQueryClient();

  return useMutation<MealOption, Error, bigint>({
    mutationFn: async (mealId) => {
      if (!actor) throw new Error("Actor not available");
      return actor.selectMeal(mealId);
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["mealOptions"] });
    },
  });
}

export function useDeleteMealOption() {
  const { actor } = useActor();
  const queryClient = useQueryClient();

  return useMutation<boolean, Error, bigint>({
    mutationFn: async (id) => {
      if (!actor) throw new Error("Actor not available");
      return actor.deleteMealOption(id);
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["mealOptions"] });
      queryClient.invalidateQueries({ queryKey: ["dataCounts"] });
    },
  });
}

// ==================== Meal Attendance Hooks ====================

interface MealAttendance {
  date: bigint;
  memberId: bigint;
  attending: boolean;
}

export function useMealAttendance(date: bigint) {
  const { actor, isFetching } = useActor();

  return useQuery<MealAttendance[]>({
    queryKey: ["mealAttendance", date.toString()],
    queryFn: async () => {
      if (!actor) return [];
      return actor.getMealAttendanceForDate(date);
    },
    enabled: !!actor && !isFetching,
  });
}

export function useSetMealAttendance() {
  const { actor } = useActor();
  const queryClient = useQueryClient();

  return useMutation<
    MealAttendance,
    Error,
    { date: bigint; memberId: bigint; attending: boolean }
  >({
    mutationFn: async (data) => {
      if (!actor) throw new Error("Actor not available");
      return actor.setMealAttendance(data.date, data.memberId, data.attending);
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["mealAttendance"] });
    },
  });
}

// ==================== Shopping List Hooks ====================

export function useShoppingItems() {
  const { actor, isFetching } = useActor();

  return useQuery<ShoppingItem[]>({
    queryKey: ["shoppingItems"],
    queryFn: async () => {
      if (!actor) return [];
      return actor.getAllShoppingItems();
    },
    enabled: !!actor && !isFetching,
  });
}

export function useCreateShoppingItem() {
  const { actor } = useActor();
  const queryClient = useQueryClient();

  return useMutation<
    bigint,
    Error,
    { name: string; quantity: string; category: string; addedBy: bigint }
  >({
    mutationFn: async (data) => {
      if (!actor) throw new Error("Actor not available");
      return actor.addShoppingItem(
        data.name,
        data.quantity,
        data.category,
        data.addedBy,
      );
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["shoppingItems"] });
      queryClient.invalidateQueries({ queryKey: ["dataCounts"] });
    },
  });
}

export function useUpdateShoppingItem() {
  const { actor } = useActor();
  const queryClient = useQueryClient();

  return useMutation<
    ShoppingItem,
    Error,
    { id: bigint; name: string; quantity: string; category: string }
  >({
    mutationFn: async (data) => {
      if (!actor) throw new Error("Actor not available");
      return actor.updateShoppingItem(
        data.id,
        data.name,
        data.quantity,
        data.category,
      );
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["shoppingItems"] });
    },
  });
}

export function useToggleShoppingItemComplete() {
  const { actor } = useActor();
  const queryClient = useQueryClient();

  return useMutation<ShoppingItem, Error, bigint>({
    mutationFn: async (id) => {
      if (!actor) throw new Error("Actor not available");
      return actor.toggleShoppingItemComplete(id);
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["shoppingItems"] });
    },
  });
}

export function useDeleteShoppingItem() {
  const { actor } = useActor();
  const queryClient = useQueryClient();

  return useMutation<boolean, Error, bigint>({
    mutationFn: async (id) => {
      if (!actor) throw new Error("Actor not available");
      return actor.deleteShoppingItem(id);
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["shoppingItems"] });
      queryClient.invalidateQueries({ queryKey: ["dataCounts"] });
    },
  });
}

export function useClearCompletedShoppingItems() {
  const { actor } = useActor();
  const queryClient = useQueryClient();

  return useMutation<bigint, Error>({
    mutationFn: async () => {
      if (!actor) throw new Error("Actor not available");
      return actor.clearCompletedShoppingItems();
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["shoppingItems"] });
      queryClient.invalidateQueries({ queryKey: ["dataCounts"] });
    },
  });
}

// ==================== Utility Hooks ====================

export function useIsAdmin() {
  const { actor, isFetching } = useActor();

  return useQuery<boolean>({
    queryKey: ["isAdmin"],
    queryFn: async () => {
      if (!actor) return false;
      return actor.isAdmin();
    },
    enabled: !!actor && !isFetching,
  });
}

export function useDataCounts() {
  const { actor, isFetching } = useActor();

  return useQuery<{
    members: number;
    moodEntries: number;
    events: number;
    chores: number;
    meals: number;
    shoppingItems: number;
  }>({
    queryKey: ["dataCounts"],
    queryFn: async () => {
      if (!actor)
        return {
          members: 0,
          moodEntries: 0,
          events: 0,
          chores: 0,
          meals: 0,
          shoppingItems: 0,
        };
      const result = await actor.getDataCounts();
      return {
        members: Number(result.members),
        moodEntries: Number(result.moodEntries),
        events: Number(result.events),
        chores: Number(result.chores),
        meals: Number(result.meals),
        shoppingItems: Number(result.shoppingItems),
      };
    },
    enabled: !!actor && !isFetching,
  });
}

export function useGenerateSampleData() {
  const { actor } = useActor();
  const queryClient = useQueryClient();

  return useMutation<SampleData, Error>({
    mutationFn: async () => {
      if (!actor) throw new Error("Actor not available");
      return actor.generateSampleData();
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["familyMembers"] });
      queryClient.invalidateQueries({ queryKey: ["moodEntries"] });
      queryClient.invalidateQueries({ queryKey: ["calendarEvents"] });
      queryClient.invalidateQueries({ queryKey: ["chores"] });
      queryClient.invalidateQueries({ queryKey: ["mealOptions"] });
      queryClient.invalidateQueries({ queryKey: ["shoppingItems"] });
      queryClient.invalidateQueries({ queryKey: ["dataCounts"] });
    },
  });
}

export function useClearAllData() {
  const { actor } = useActor();
  const queryClient = useQueryClient();

  return useMutation<boolean, Error>({
    mutationFn: async () => {
      if (!actor) throw new Error("Actor not available");
      return actor.clearAllData();
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["familyMembers"] });
      queryClient.invalidateQueries({ queryKey: ["moodEntries"] });
      queryClient.invalidateQueries({ queryKey: ["calendarEvents"] });
      queryClient.invalidateQueries({ queryKey: ["chores"] });
      queryClient.invalidateQueries({ queryKey: ["mealOptions"] });
      queryClient.invalidateQueries({ queryKey: ["shoppingItems"] });
      queryClient.invalidateQueries({ queryKey: ["dataCounts"] });
    },
  });
}
