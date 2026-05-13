import type { Principal } from "@icp-sdk/core/principal";
export interface Some<T> {
    __kind__: "Some";
    value: T;
}
export interface None {
    __kind__: "None";
}
export type Option<T> = Some<T> | None;
export interface SampleData {
    members: Array<FamilyMember>;
    shoppingItems: Array<ShoppingItem>;
    moodEntries: Array<MoodEntry>;
    mealOptions: Array<MealOption>;
    events: Array<CalendarEvent>;
    chores: Array<Chore>;
}
export interface MoodEntry {
    id: bigint;
    memberId: bigint;
    date: Time;
    mood: string;
    note: string;
    createdAt: Time;
}
export interface Chore {
    id: bigint;
    title: string;
    assignedTo?: bigint;
    isCompleted: boolean;
    createdAt: Time;
    dueDate: Time;
    description: string;
    recurrence: string;
}
export interface ShoppingItem {
    id: bigint;
    isCompleted: boolean;
    name: string;
    createdAt: Time;
    addedBy: bigint;
    quantity: string;
    category: string;
}
export type Time = bigint;
export interface Family {
    id: bigint;
    adminPrincipal: Principal;
    name: string;
    createdAt: Time;
}
export interface InviteDetails {
    familyName: string;
    memberColor: string;
    memberName: string;
    memberAvatarEmoji: string;
}
export interface CalendarEvent {
    id: bigint;
    title: string;
    endDate: Time;
    createdAt: Time;
    description: string;
    memberIds: Array<bigint>;
    startDate: Time;
    eventType: string;
}
export interface FamilyMember {
    id: bigint;
    principal?: Principal;
    isLinked: boolean;
    name: string;
    createdAt: Time;
    color: string;
    role: string;
    inviteCode?: string;
    avatarEmoji: string;
    familyId: bigint;
}
export interface MealOption {
    id: bigint;
    isSelected: boolean;
    scheduledDate: Time;
    votes: Array<bigint>;
    name: string;
    createdAt: Time;
    description: string;
    proposedBy: bigint;
}
export type FamilyStatus = {
    __kind__: "NotLinked";
    NotLinked: null;
} | {
    __kind__: "FamilyMember";
    FamilyMember: {
        memberId: bigint;
        familyId: bigint;
    };
} | {
    __kind__: "FamilyAdmin";
    FamilyAdmin: {
        memberId: bigint;
        familyId: bigint;
    };
};
export interface MealAttendance {
    memberId: bigint;
    date: Time;
    attending: boolean;
}
export interface backendInterface {
    addCalendarEvent(title: string, description: string, startDate: Time, endDate: Time, memberIds: Array<bigint>, eventType: string): Promise<bigint>;
    addChore(title: string, description: string, assignedTo: bigint | null, dueDate: Time, recurrence: string): Promise<bigint>;
    addFamilyMemberWithInvite(name: string, color: string, avatarEmoji: string): Promise<{
        memberId: bigint;
        inviteCode: string;
    }>;
    addMealOption(name: string, description: string, proposedBy: bigint, scheduledDate: Time): Promise<bigint>;
    addMoodEntry(memberId: bigint, mood: string, note: string, date: Time): Promise<bigint>;
    addShoppingItem(name: string, quantity: string, category: string, addedBy: bigint): Promise<bigint>;
    clearAllData(): Promise<boolean>;
    clearCompletedShoppingItems(): Promise<bigint>;
    createFamily(familyName: string, adminName: string, adminColor: string, adminAvatarEmoji: string): Promise<{
        memberId: bigint;
        familyId: bigint;
    }>;
    deleteCalendarEvent(id: bigint): Promise<boolean>;
    deleteChore(id: bigint): Promise<boolean>;
    deleteFamilyMember(id: bigint): Promise<boolean>;
    deleteMealOption(id: bigint): Promise<boolean>;
    deleteMoodEntry(id: bigint): Promise<boolean>;
    deleteShoppingItem(id: bigint): Promise<boolean>;
    generateSampleData(): Promise<SampleData>;
    getAllCalendarEvents(): Promise<Array<CalendarEvent>>;
    getAllChores(): Promise<Array<Chore>>;
    getAllFamilyMembers(): Promise<Array<FamilyMember>>;
    getAllMealOptions(): Promise<Array<MealOption>>;
    getAllMoodEntries(): Promise<Array<MoodEntry>>;
    getAllShoppingItems(): Promise<Array<ShoppingItem>>;
    getCalendarEventsByDateRange(startDate: Time, endDate: Time): Promise<Array<CalendarEvent>>;
    getCalendarEventsByMember(memberId: bigint): Promise<Array<CalendarEvent>>;
    getChoresByMember(memberId: bigint): Promise<Array<Chore>>;
    getDataCounts(): Promise<{
        meals: bigint;
        members: bigint;
        shoppingItems: bigint;
        moodEntries: bigint;
        events: bigint;
        chores: bigint;
    }>;
    getFamilyMember(id: bigint): Promise<FamilyMember | null>;
    getInviteDetails(code: string): Promise<InviteDetails>;
    getMealAttendanceForDate(date: Time): Promise<Array<MealAttendance>>;
    getMealOptionsByDate(date: Time): Promise<Array<MealOption>>;
    getMemberAttendance(date: Time, memberId: bigint): Promise<MealAttendance | null>;
    getMoodEntriesByDateRange(startDate: Time, endDate: Time): Promise<Array<MoodEntry>>;
    getMoodEntriesByMember(memberId: bigint): Promise<Array<MoodEntry>>;
    getMyFamily(): Promise<Family>;
    getMyFamilyStatus(): Promise<FamilyStatus>;
    getMyMember(): Promise<FamilyMember>;
    getShoppingItemsByCategory(category: string): Promise<Array<ShoppingItem>>;
    isAdmin(): Promise<boolean>;
    joinFamilyWithCode(inviteCode: string): Promise<{
        memberId: bigint;
        familyId: bigint;
    }>;
    regenerateInviteCode(memberId: bigint): Promise<string>;
    selectMeal(mealId: bigint): Promise<MealOption>;
    setMealAttendance(date: Time, memberId: bigint, attending: boolean): Promise<MealAttendance>;
    toggleChoreComplete(id: bigint): Promise<Chore>;
    toggleShoppingItemComplete(id: bigint): Promise<ShoppingItem>;
    updateCalendarEvent(id: bigint, title: string, description: string, startDate: Time, endDate: Time, memberIds: Array<bigint>, eventType: string): Promise<CalendarEvent>;
    updateChore(id: bigint, title: string, description: string, assignedTo: bigint | null, dueDate: Time, recurrence: string): Promise<Chore>;
    updateFamilyMember(id: bigint, name: string, color: string, avatarEmoji: string): Promise<FamilyMember>;
    updateMemberRole(id: bigint, newRole: string): Promise<FamilyMember>;
    updateMoodEntry(id: bigint, mood: string, note: string): Promise<MoodEntry>;
    updateShoppingItem(id: bigint, name: string, quantity: string, category: string): Promise<ShoppingItem>;
    voteForMeal(mealId: bigint, memberId: bigint): Promise<MealOption>;
}
