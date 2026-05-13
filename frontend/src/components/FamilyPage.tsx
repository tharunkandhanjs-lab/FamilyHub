import React, { useState, useMemo } from "react";
import {
  useFamilyMembers,
  useAddFamilyMemberWithInvite,
  useUpdateFamilyMember,
  useUpdateMemberRole,
  useDeleteFamilyMember,
  useRegenerateInviteCode,
  useIsAdmin,
  useMyMember,
  useMyFamily,
  useChores,
  useMoodEntries,
  useCalendarEvents,
} from "../hooks/useQueries";
import type { FamilyMember } from "../backend";
import { toast } from "sonner";
import { COLORS, AVATARS } from "../constants";
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
import { DataTable, DataTableColumn } from "./shared/DataTable";
import { Tabs, TabsList, TabsTrigger } from "@/components/ui/tabs";
import {
  HoverCard,
  HoverCardContent,
  HoverCardTrigger,
} from "@/components/ui/hover-card";
import { ToggleGroup, ToggleGroupItem } from "@/components/ui/toggle-group";
import { Alert, AlertDescription } from "@/components/ui/alert";
import {
  Users,
  Copy,
  Check,
  X,
  UserPlus,
  Link,
  UserCheck,
  Clock,
  Info,
} from "lucide-react";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Badge } from "@/components/ui/badge";
import { getMemberStats } from "../utils/dataHelpers";

export const FamilyPage: React.FC = () => {
  const { data: members = [], isLoading, error, refetch } = useFamilyMembers();
  const { data: isAdmin } = useIsAdmin();
  const { data: myMember } = useMyMember();
  const { data: myFamily } = useMyFamily();
  const { data: chores = [] } = useChores();
  const { data: moods = [] } = useMoodEntries();
  const { data: events = [] } = useCalendarEvents();

  const addMemberWithInvite = useAddFamilyMemberWithInvite();
  const updateMember = useUpdateFamilyMember();
  const updateRole = useUpdateMemberRole();
  const deleteMember = useDeleteFamilyMember();
  const regenerateCode = useRegenerateInviteCode();

  const [showForm, setShowForm] = useState(false);
  const [editingMember, setEditingMember] = useState<FamilyMember | null>(null);
  const [formData, setFormData] = useState({
    name: "",
    color: COLORS[0],
    avatarEmoji: AVATARS[0],
    role: "member" as "admin" | "member",
  });
  const [newInviteCode, setNewInviteCode] = useState<string | null>(null);
  const [copiedCode, setCopiedCode] = useState<string | null>(null);
  const [deleteTarget, setDeleteTarget] = useState<FamilyMember | null>(null);
  const [viewMode, setViewMode] = useState<"grid" | "table">("grid");

  const copyToClipboard = async (code: string | undefined) => {
    if (!code) {
      return toast.error("Invite code not found");
    }
    try {
      await navigator.clipboard.writeText(code);
      setCopiedCode(code);
      setTimeout(() => setCopiedCode(null), 2000);
    } catch {
      toast.error("Failed to copy code");
    }
  };

  // Calculate statistics
  const stats = useMemo(() => {
    const linkedCount = members.filter((m) => m.isLinked).length;
    const pendingCount = members.filter((m) => !m.isLinked).length;

    return {
      total: members.length,
      linked: linkedCount,
      pending: pendingCount,
    };
  }, [members]);

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    try {
      if (editingMember) {
        await updateMember.mutateAsync({
          id: editingMember.id,
          name: formData.name,
          color: formData.color,
          avatarEmoji: formData.avatarEmoji,
        });

        const canEditRole =
          isAdmin && myMember && editingMember.id !== myMember.id;
        if (canEditRole && formData.role !== editingMember.role) {
          await updateRole.mutateAsync({
            id: editingMember.id,
            role: formData.role,
          });
        }

        toast.success("Family member updated successfully!");
        setShowForm(false);
      } else {
        const result = await addMemberWithInvite.mutateAsync(formData);
        setNewInviteCode(result.inviteCode);
        toast.success("Family member added! Share the invite code with them.");
      }
      setEditingMember(null);
      setFormData({
        name: "",
        color: COLORS[0],
        avatarEmoji: AVATARS[0],
        role: "member",
      });
    } catch (err) {
      toast.error(err instanceof Error ? err.message : "An error occurred");
    }
  };

  const handleEdit = (member: FamilyMember) => {
    setEditingMember(member);
    setFormData({
      name: member.name,
      color: member.color,
      avatarEmoji: member.avatarEmoji,
      role: member.role as "admin" | "member",
    });
    setShowForm(true);
    setNewInviteCode(null);
  };

  const handleDeleteClick = (member: FamilyMember) => {
    if (member.role === "admin") {
      toast.error("Cannot remove the admin member.");
      return;
    }
    setDeleteTarget(member);
  };

  const handleConfirmDelete = async () => {
    if (deleteTarget) {
      try {
        await deleteMember.mutateAsync(deleteTarget.id);
        toast.success("Family member removed successfully!");
      } catch (err) {
        toast.error(
          err instanceof Error ? err.message : "Failed to remove member",
        );
      }
    }
  };

  const handleRegenerateCode = async (member: FamilyMember) => {
    try {
      const newCode = await regenerateCode.mutateAsync(member.id);
      toast.success(`New invite code for ${member.name}: ${newCode}`);
    } catch (err) {
      toast.error(
        err instanceof Error ? err.message : "Failed to regenerate code",
      );
    }
  };

  if (isLoading) {
    return <LoadingScreen />;
  }

  if (error) {
    return (
      <EmptyState
        icon={<X className="w-12 h-12 text-destructive" />}
        title="Failed to load family members"
        description="Please try again"
        action={{
          label: "Try Again",
          onClick: () => refetch(),
        }}
      />
    );
  }

  const isFormLoading =
    addMemberWithInvite.isPending ||
    updateMember.isPending ||
    updateRole.isPending;

  // Table columns
  const tableColumns: DataTableColumn<FamilyMember>[] = [
    {
      key: "avatar",
      label: "",
      render: (member) => <MemberAvatar member={member} size="md" />,
    },
    {
      key: "name",
      label: "Name",
      sortable: true,
      render: (member) => (
        <div>
          <div className="text-foreground">
            {member.name}
            {myMember && member.id === myMember.id && (
              <Badge className="ml-2 text-xs">You</Badge>
            )}
          </div>
        </div>
      ),
    },
    {
      key: "role",
      label: "Role",
      filterable: true,
      render: (member) => (
        <Badge
          variant={member.role === "admin" ? "default" : "secondary"}
          className="capitalize"
        >
          {member.role}
        </Badge>
      ),
    },
    {
      key: "status",
      label: "Status",
      render: (member) => (
        <Badge
          variant="outline"
          className={
            member.isLinked
              ? "border-primary/40 text-primary"
              : "border-yellow-500/40 text-yellow-600 dark:text-yellow-400"
          }
        >
          {member.isLinked ? "Linked" : "Pending"}
        </Badge>
      ),
    },
    {
      key: "actions",
      label: "",
      render: (member) => (
        <div className="flex gap-2 justify-end">
          {(isAdmin || (myMember && member.id === myMember.id)) && (
            <FormButton
              onClick={() => handleEdit(member)}
              variant="secondary"
              className="text-xs"
            >
              Edit
            </FormButton>
          )}
          {isAdmin && member.role !== "admin" && (
            <FormButton
              onClick={() => handleDeleteClick(member)}
              disabled={deleteMember.isPending}
              variant="secondary"
              className="text-xs text-destructive"
            >
              Remove
            </FormButton>
          )}
        </div>
      ),
    },
  ];

  return (
    <div className="space-y-6">
      {/* Header */}
      <div>
        <h2 className="text-3xl text-foreground">Family Members</h2>
        {myFamily && (
          <p className="text-sm text-muted-foreground mt-1">
            {myFamily.name} • {members.length} member
            {members.length !== 1 ? "s" : ""}
          </p>
        )}
      </div>

      {/* Statistics */}
      <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
        <StatCard
          title="Total Members"
          value={stats.total}
          icon={Users}
          changeType="neutral"
        />
        <StatCard
          title="Linked Accounts"
          value={stats.linked}
          icon={Link}
          changeType="positive"
        />
        <StatCard
          title="Pending Invites"
          value={stats.pending}
          icon={Clock}
          changeType="neutral"
        />
      </div>

      {/* View Toggle & Add Button */}
      <div className="flex items-center justify-between">
        <Tabs
          value={viewMode}
          onValueChange={(v) => setViewMode(v as "grid" | "table")}
        >
          <TabsList>
            <TabsTrigger value="grid">Grid View</TabsTrigger>
            <TabsTrigger value="table">Table View</TabsTrigger>
          </TabsList>
        </Tabs>

        {isAdmin && (
          <FormButton
            onClick={() => {
              setEditingMember(null);
              setFormData({
                name: "",
                color: COLORS[0],
                avatarEmoji: AVATARS[0],
                role: "member",
              });
              setShowForm(true);
              setNewInviteCode(null);
            }}
            variant="primary"
          >
            <UserPlus className="w-4 h-4" />
            Add Member
          </FormButton>
        )}
      </div>

      {/* Content Views */}
      {members.length === 0 ? (
        <EmptyState
          icon={<Users className="w-12 h-12 text-primary" />}
          title="No family members yet"
          description="Add family members and invite them to join!"
        />
      ) : viewMode === "grid" ? (
        /* Grid View */
        <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-4">
          {members.map((member) => {
            const isCurrentUser = myMember && member.id === myMember.id;
            const memberStats = getMemberStats(
              member.id,
              chores,
              moods,
              events,
            );

            return (
              <HoverCard key={member.id.toString()}>
                <HoverCardTrigger asChild>
                  <PageCard
                    className={`cursor-pointer hover:shadow-lg transition-all duration-200 ${
                      isCurrentUser ? "ring-2 ring-ring/40" : ""
                    }`}
                  >
                    <div className="flex items-center gap-4">
                      <MemberAvatar member={member} size="lg" />
                      <div className="flex-1">
                        <h3 className="text-foreground">{member.name}</h3>
                        <div className="flex items-center gap-2 flex-wrap mt-1">
                          <Badge
                            variant="secondary"
                            className="text-xs capitalize"
                          >
                            {member.role}
                          </Badge>
                          {isCurrentUser && (
                            <Badge className="text-xs">You</Badge>
                          )}
                          {member.isLinked ? (
                            <Badge
                              variant="outline"
                              className="text-xs border-primary/40 text-primary"
                            >
                              <UserCheck className="w-3 h-3 mr-1" />
                              Linked
                            </Badge>
                          ) : (
                            <Badge
                              variant="outline"
                              className="text-xs border-yellow-500/40 text-yellow-600 dark:text-yellow-400"
                            >
                              <Clock className="w-3 h-3 mr-1" />
                              Pending
                            </Badge>
                          )}
                        </div>
                      </div>
                    </div>

                    {/* Invite Code Section */}
                    {isAdmin &&
                      !member.isLinked &&
                      member.inviteCode &&
                      member.inviteCode.length > 0 &&
                      member.inviteCode[0] && (
                        <div className="mt-4 p-3 bg-muted/30 rounded-lg">
                          <div className="text-xs text-muted-foreground mb-1">
                            Invite Code
                          </div>
                          <div className="flex items-center gap-2">
                            <code className="flex-1 font-mono text-sm text-foreground tracking-wider">
                              {member.inviteCode}
                            </code>
                            <FormButton
                              onClick={() => copyToClipboard(member.inviteCode)}
                              variant="secondary"
                              className="text-xs"
                            >
                              {copiedCode === member.inviteCode[0] ? (
                                <Check className="w-3 h-3" />
                              ) : (
                                <Copy className="w-3 h-3" />
                              )}
                            </FormButton>
                          </div>
                        </div>
                      )}

                    {/* Actions */}
                    <div className="flex gap-2 mt-4">
                      {(isAdmin || isCurrentUser) && (
                        <FormButton
                          onClick={() => handleEdit(member)}
                          variant="secondary"
                          className="flex-1 text-sm"
                        >
                          Edit
                        </FormButton>
                      )}
                      {isAdmin &&
                        !member.isLinked &&
                        member.role !== "admin" && (
                          <FormButton
                            onClick={() => handleRegenerateCode(member)}
                            disabled={regenerateCode.isPending}
                            loading={regenerateCode.isPending}
                            variant="secondary"
                            className="text-sm"
                          >
                            New Code
                          </FormButton>
                        )}
                      {isAdmin && member.role !== "admin" && (
                        <FormButton
                          onClick={() => handleDeleteClick(member)}
                          disabled={deleteMember.isPending}
                          loading={deleteMember.isPending}
                          variant="secondary"
                          className="text-sm text-destructive"
                        >
                          Remove
                        </FormButton>
                      )}
                    </div>
                  </PageCard>
                </HoverCardTrigger>
                <HoverCardContent className="w-64">
                  <div className="space-y-2">
                    <h4 className="text-foreground">
                      {member.name}'s Activity
                    </h4>
                    <div className="text-sm space-y-1">
                      <div className="flex justify-between">
                        <span className="text-muted-foreground">Chores:</span>
                        <span className="text-foreground">
                          {memberStats.choresCompleted}/
                          {memberStats.choresAssigned}
                        </span>
                      </div>
                      <div className="flex justify-between">
                        <span className="text-muted-foreground">
                          Recent mood:
                        </span>
                        <span className="text-xl">
                          {memberStats.recentMood || "\u2014"}
                        </span>
                      </div>
                      <div className="flex justify-between">
                        <span className="text-muted-foreground">
                          Upcoming events:
                        </span>
                        <span className="text-foreground">
                          {memberStats.upcomingEvents}
                        </span>
                      </div>
                    </div>
                  </div>
                </HoverCardContent>
              </HoverCard>
            );
          })}
        </div>
      ) : (
        /* Table View */
        <DataTable
          columns={tableColumns}
          data={members}
          getRowKey={(m) => m.id.toString()}
        />
      )}

      {/* Form Modal */}
      <Dialog
        open={showForm}
        onOpenChange={() => {
          setShowForm(false);
          setNewInviteCode(null);
        }}
      >
        <DialogContent className="max-w-md max-h-[90vh] overflow-y-auto">
          <DialogHeader>
            <DialogTitle>
              {newInviteCode
                ? "Member Added!"
                : editingMember
                  ? "Edit Member"
                  : "Add Family Member"}
            </DialogTitle>
          </DialogHeader>
          <div className="mt-4">
            {newInviteCode ? (
              <div className="text-center">
                <div className="text-5xl mb-4">🎉</div>
                <p className="text-muted-foreground mb-6">
                  Share this invite code with {formData.name || "them"} so they
                  can join your family:
                </p>
                <div className="bg-muted rounded-xl p-6 mb-6">
                  <div className="text-3xl font-mono tracking-widest text-foreground mb-4">
                    {newInviteCode}
                  </div>
                  <FormButton
                    onClick={() => copyToClipboard(newInviteCode)}
                    variant="primary"
                  >
                    {copiedCode === newInviteCode ? (
                      <>
                        <Check className="w-4 h-4" /> Copied!
                      </>
                    ) : (
                      <>
                        <Copy className="w-4 h-4" /> Copy Code
                      </>
                    )}
                  </FormButton>
                </div>
                <p className="text-sm text-muted-foreground mb-6">
                  They'll need to create an Internet Identity and enter this
                  code to join.
                </p>
                <FormButton
                  onClick={() => {
                    setShowForm(false);
                    setNewInviteCode(null);
                    setFormData({
                      name: "",
                      color: COLORS[0],
                      avatarEmoji: AVATARS[0],
                      role: "member",
                    });
                  }}
                  variant="secondary"
                  className="w-full"
                >
                  Done
                </FormButton>
              </div>
            ) : (
              <form onSubmit={handleSubmit} className="space-y-4">
                <div>
                  <Label className="mb-2">Name</Label>
                  <Input
                    type="text"
                    value={formData.name}
                    onChange={(e) =>
                      setFormData({ ...formData, name: e.target.value })
                    }
                    placeholder="e.g., Mom, Dad, Emma"
                    required
                  />
                </div>
                <div>
                  <Label className="mb-2">Avatar</Label>
                  <div className="flex gap-2 flex-wrap">
                    {AVATARS.map((avatar) => (
                      <Button
                        key={avatar}
                        type="button"
                        variant="outline"
                        onClick={() =>
                          setFormData({ ...formData, avatarEmoji: avatar })
                        }
                        className={cn(
                          "w-12 h-12 text-2xl rounded-lg border-2",
                          formData.avatarEmoji === avatar
                            ? "border-primary bg-primary/20"
                            : "border-border hover:border-foreground",
                        )}
                      >
                        {avatar}
                      </Button>
                    ))}
                  </div>
                </div>
                <div>
                  <Label className="mb-2">Color</Label>
                  <div className="flex gap-2 flex-wrap">
                    {COLORS.map((color) => (
                      <Button
                        key={color}
                        type="button"
                        variant="outline"
                        onClick={() => setFormData({ ...formData, color })}
                        className={cn(
                          "w-10 h-10 rounded-full border-2 p-0",
                          formData.color === color
                            ? "border-foreground"
                            : "border-transparent",
                        )}
                        style={{ backgroundColor: color }}
                      />
                    ))}
                  </div>
                </div>
                {isAdmin &&
                  editingMember &&
                  myMember &&
                  editingMember.id !== myMember.id && (
                    <div>
                      <Label className="mb-2">Role</Label>
                      <ToggleGroup
                        type="single"
                        value={formData.role}
                        onValueChange={(val) => {
                          if (val)
                            setFormData({
                              ...formData,
                              role: val as "admin" | "member",
                            });
                        }}
                        variant="outline"
                        className="w-full rounded-lg bg-muted p-0.5"
                      >
                        <ToggleGroupItem
                          value="member"
                          className="flex-1 rounded-md data-[state=on]:bg-background data-[state=on]:text-foreground data-[state=on]:shadow-sm"
                        >
                          Member
                        </ToggleGroupItem>
                        <ToggleGroupItem
                          value="admin"
                          className="flex-1 rounded-md data-[state=on]:bg-background data-[state=on]:text-foreground data-[state=on]:shadow-sm"
                        >
                          Admin
                        </ToggleGroupItem>
                      </ToggleGroup>
                      <p className="text-xs text-muted-foreground mt-1">
                        Admins can manage family members and settings.
                      </p>
                    </div>
                  )}
                {!editingMember && (
                  <Alert>
                    <Info className="h-4 w-4" />
                    <AlertDescription>
                      An invite code will be generated. Share it with this
                      person so they can link their Internet Identity to join
                      your family.
                    </AlertDescription>
                  </Alert>
                )}
                <DialogFooter>
                  <FormButton
                    type="button"
                    onClick={() => {
                      setShowForm(false);
                      setNewInviteCode(null);
                    }}
                    variant="secondary"
                  >
                    Cancel
                  </FormButton>
                  <FormButton
                    type="submit"
                    disabled={isFormLoading || !formData.name.trim()}
                    loading={isFormLoading}
                    variant="primary"
                  >
                    {editingMember ? "Save" : "Add & Get Code"}
                  </FormButton>
                </DialogFooter>
              </form>
            )}
          </div>
        </DialogContent>
      </Dialog>

      <AlertDialog
        open={deleteTarget !== null}
        onOpenChange={() => setDeleteTarget(null)}
      >
        <AlertDialogContent>
          <AlertDialogHeader>
            <AlertDialogTitle>Remove Family Member</AlertDialogTitle>
            <AlertDialogDescription>
              Are you sure you want to remove this family member? This action
              cannot be undone.
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
              Remove
            </AlertDialogAction>
          </AlertDialogFooter>
        </AlertDialogContent>
      </AlertDialog>
    </div>
  );
};
