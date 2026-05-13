import React, { useState, useMemo } from "react";
import {
  useFamilyMembers,
  useShoppingItems,
  useCreateShoppingItem,
  useToggleShoppingItemComplete,
  useDeleteShoppingItem,
  useClearCompletedShoppingItems,
  useMyMember,
} from "../hooks/useQueries";
import type { ShoppingItem } from "../backend";
import { toast } from "sonner";
import { CATEGORIES } from "../constants";
import { LoadingScreen } from "./LoadingScreen";

import {
  Dialog,
  DialogContent,
  DialogFooter,
  DialogHeader,
  DialogTitle,
} from "@/components/ui/dialog";
import { Button } from "@/components/ui/button";
import { FormButton } from "./shared/FormButton";
import { PageCard } from "./shared/PageCard";
import { MemberAvatar } from "./shared/MemberAvatar";
import { EmptyState } from "./shared/EmptyState";
import { StatCard } from "./shared/StatCard";
import {
  ShoppingCart,
  CheckCircle2,
  X,
  Trash2,
  ListChecks,
  TrendingUp,
  Plus,
} from "lucide-react";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import {
  Accordion,
  AccordionContent,
  AccordionItem,
  AccordionTrigger,
} from "@/components/ui/accordion";
import { Progress } from "@/components/ui/progress";
import { Badge } from "@/components/ui/badge";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";

export const ShoppingPage: React.FC = () => {
  const { data: members = [], isLoading: membersLoading } = useFamilyMembers();
  const {
    data: items = [],
    isLoading: itemsLoading,
    error,
    refetch,
  } = useShoppingItems();
  const { data: myMember } = useMyMember();
  const createItem = useCreateShoppingItem();
  const toggleItem = useToggleShoppingItemComplete();
  const deleteItem = useDeleteShoppingItem();
  const clearCompleted = useClearCompletedShoppingItems();

  const [showForm, setShowForm] = useState(false);
  const [formData, setFormData] = useState({
    name: "",
    quantity: "",
    category: "Other",
  });

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!myMember) return;
    try {
      await createItem.mutateAsync({
        name: formData.name,
        quantity: formData.quantity,
        category: formData.category,
        addedBy: myMember.id,
      });
      toast.success("Item added to list!");
      setShowForm(false);
      setFormData({
        name: "",
        quantity: "",
        category: "Other",
      });
    } catch (err) {
      toast.error(err instanceof Error ? err.message : "Failed to add item");
    }
  };

  const handleToggle = async (itemId: bigint) => {
    try {
      await toggleItem.mutateAsync(itemId);
    } catch (err) {
      toast.error(err instanceof Error ? err.message : "Failed to update item");
    }
  };

  const handleDelete = async (itemId: bigint) => {
    try {
      await deleteItem.mutateAsync(itemId);
    } catch (err) {
      toast.error(err instanceof Error ? err.message : "Failed to delete item");
    }
  };

  const handleClearCompleted = async () => {
    try {
      await clearCompleted.mutateAsync();
      toast.success("Completed items cleared!");
    } catch (err) {
      toast.error(err instanceof Error ? err.message : "Failed to clear items");
    }
  };

  const activeItems = items.filter((i) => !i.isCompleted);
  const completedItems = items.filter((i) => i.isCompleted);

  // Group by category
  const itemsByCategory = activeItems.reduce(
    (acc, item) => {
      if (!acc[item.category]) acc[item.category] = [];
      acc[item.category].push(item);
      return acc;
    },
    {} as Record<string, ShoppingItem[]>,
  );

  // Statistics
  const stats = useMemo(() => {
    const totalItems = items.length;
    const completedCount = completedItems.length;
    const activeCount = activeItems.length;
    const completionRate =
      totalItems > 0 ? (completedCount / totalItems) * 100 : 0;

    // Items added this week (if we had timestamps, but we don't - so just use total for now)
    // This could be enhanced if we add createdAt to the backend
    const addedThisWeek = activeCount;

    return {
      totalActive: activeCount,
      completedCount,
      completionRate,
      addedThisWeek,
    };
  }, [items, activeItems, completedItems]);

  const isLoading = membersLoading || itemsLoading;

  if (isLoading) {
    return <LoadingScreen />;
  }

  if (error) {
    return (
      <EmptyState
        icon={<X className="w-12 h-12 text-destructive" />}
        title="Failed to load shopping list"
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
          <h2 className="text-3xl text-foreground">Shopping List</h2>
          <p className="text-sm text-muted-foreground mt-1">
            Track items you need to buy
          </p>
        </div>
        <div className="flex gap-2">
          {completedItems.length > 0 && (
            <FormButton
              onClick={handleClearCompleted}
              loading={clearCompleted.isPending}
              disabled={clearCompleted.isPending}
              variant="secondary"
            >
              <Trash2 className="w-4 h-4" />
              Clear Completed
            </FormButton>
          )}
          <FormButton onClick={() => setShowForm(true)} variant="primary">
            <Plus className="w-4 h-4" />
            Add Item
          </FormButton>
        </div>
      </div>

      {/* Statistics */}
      <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
        <StatCard
          title="Items to Buy"
          value={stats.totalActive}
          icon={ShoppingCart}
          changeType="neutral"
        />
        <StatCard
          title="Completion Rate"
          value={`${Math.round(stats.completionRate)}%`}
          change={`${stats.completedCount} completed`}
          changeType={stats.completionRate >= 50 ? "positive" : "neutral"}
          icon={ListChecks}
        />
        <StatCard
          title="Categories"
          value={Object.keys(itemsByCategory).length}
          change="Active categories"
          changeType="neutral"
          icon={TrendingUp}
        />
      </div>

      {/* Overall Progress */}
      {items.length > 0 && (
        <PageCard
          title="Shopping Progress"
          subtitle={`${stats.completedCount} of ${items.length} items completed`}
        >
          <Progress value={stats.completionRate} className="h-3" />
        </PageCard>
      )}

      {/* Active Items by Category - Accordion */}
      {Object.keys(itemsByCategory).length > 0 && (
        <PageCard
          title="Items by Category"
          subtitle={`${Object.keys(itemsByCategory).length} categories`}
        >
          <Accordion
            type="multiple"
            defaultValue={Object.keys(itemsByCategory).slice(0, 3)}
            className="w-full"
          >
            {Object.entries(itemsByCategory).map(
              ([category, categoryItems]) => (
                <AccordionItem key={category} value={category}>
                  <AccordionTrigger className="hover:no-underline">
                    <div className="flex items-center gap-3">
                      <span className="text-foreground">{category}</span>
                      <Badge variant="secondary">{categoryItems.length}</Badge>
                    </div>
                  </AccordionTrigger>
                  <AccordionContent>
                    <div className="space-y-2 pt-2">
                      {categoryItems.map((item) => {
                        const addedByMember = members.find(
                          (m) => m.id === item.addedBy,
                        );
                        return (
                          <div
                            key={item.id.toString()}
                            className="flex items-center gap-4 p-3 bg-muted/30 rounded-lg border border-border"
                          >
                            <Button
                              variant="outline"
                              size="icon"
                              onClick={() => handleToggle(item.id)}
                              disabled={toggleItem.isPending}
                              className="w-6 h-6 rounded-full border-2 border-primary hover:bg-primary/20 shrink-0"
                            />
                            <div className="flex-1 min-w-0">
                              <span className="text-foreground">
                                {item.name}
                              </span>
                              {item.quantity && (
                                <span className="text-sm text-muted-foreground ml-2">
                                  ({item.quantity})
                                </span>
                              )}
                            </div>
                            {addedByMember && (
                              <MemberAvatar member={addedByMember} size="xs" />
                            )}
                            <Button
                              variant="ghost"
                              size="icon"
                              onClick={() => handleDelete(item.id)}
                              disabled={deleteItem.isPending}
                              className="h-auto w-auto text-muted-foreground hover:text-destructive shrink-0"
                            >
                              <X className="w-4 h-4" />
                            </Button>
                          </div>
                        );
                      })}
                    </div>
                  </AccordionContent>
                </AccordionItem>
              ),
            )}
          </Accordion>
        </PageCard>
      )}

      {activeItems.length === 0 && (
        <EmptyState
          icon={<ShoppingCart className="w-12 h-12 text-primary" />}
          title="Shopping list is empty"
          description="Add items you need to buy!"
        />
      )}

      {/* Completed Items */}
      {completedItems.length > 0 && (
        <PageCard
          title={`Completed (${completedItems.length})`}
          subtitle="Recently completed items"
        >
          <div className="space-y-2 opacity-60 max-h-48 overflow-y-auto">
            {completedItems.map((item) => (
              <div
                key={item.id.toString()}
                className="flex items-center gap-4 p-2"
              >
                <Button
                  variant="outline"
                  size="icon"
                  onClick={() => handleToggle(item.id)}
                  disabled={toggleItem.isPending}
                  className="w-6 h-6 rounded-full border-2 border-primary bg-primary text-white shrink-0"
                >
                  <CheckCircle2 className="w-4 h-4" />
                </Button>
                <span className="flex-1 text-muted-foreground line-through">
                  {item.name}
                </span>
                <Button
                  variant="ghost"
                  size="icon"
                  onClick={() => handleDelete(item.id)}
                  disabled={deleteItem.isPending}
                  className="h-auto w-auto text-muted-foreground hover:text-destructive shrink-0"
                >
                  <X className="w-4 h-4" />
                </Button>
              </div>
            ))}
          </div>
        </PageCard>
      )}

      {/* Form Modal */}
      <Dialog open={showForm} onOpenChange={() => setShowForm(false)}>
        <DialogContent className="max-w-md max-h-[90vh] overflow-y-auto">
          <DialogHeader>
            <DialogTitle>Add Item</DialogTitle>
          </DialogHeader>
          <form onSubmit={handleSubmit} className="space-y-4 mt-4">
            <div>
              <Label className="mb-2">Item Name</Label>
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
              <Label className="mb-2">Quantity (optional)</Label>
              <Input
                type="text"
                value={formData.quantity}
                onChange={(e) =>
                  setFormData({ ...formData, quantity: e.target.value })
                }
                placeholder="e.g., 2 lbs, 1 gallon"
              />
            </div>
            <div>
              <Label className="mb-2">Category</Label>
              <Select
                value={formData.category}
                onValueChange={(value) =>
                  setFormData({ ...formData, category: value })
                }
              >
                <SelectTrigger className="w-full">
                  <SelectValue />
                </SelectTrigger>
                <SelectContent>
                  {CATEGORIES.map((cat) => (
                    <SelectItem key={cat} value={cat}>
                      {cat}
                    </SelectItem>
                  ))}
                </SelectContent>
              </Select>
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
                loading={createItem.isPending}
                variant="primary"
              >
                Add Item
              </FormButton>
            </DialogFooter>
          </form>
        </DialogContent>
      </Dialog>
    </div>
  );
};
