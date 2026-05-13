import React, { useState } from "react";
import { useInternetIdentity } from "../hooks/useInternetIdentity";
import { useMyMember } from "../hooks/useQueries";
import { TABS, TabId } from "../constants";
import { ThemeToggle } from "./shared/ThemeToggle";
import { Button } from "@/components/ui/button";
import {
  Sheet,
  SheetContent,
  SheetHeader,
  SheetTitle,
  SheetFooter,
} from "@/components/ui/sheet";
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuTrigger,
} from "@/components/ui/dropdown-menu";
import { cn } from "@/lib/utils";
import {
  Home,
  Users,
  CheckCircle2,
  Smile,
  Calendar,
  UtensilsCrossed,
  ShoppingCart,
  Settings,
  Menu,
  LogOut,
} from "lucide-react";
import { useQueryClient } from "@tanstack/react-query";

interface LayoutProps {
  activeTab: TabId;
  setActiveTab: (tab: TabId) => void;
  children: React.ReactNode;
}

// Icon mapping for tabs
const TAB_ICONS: Record<TabId, React.ComponentType<{ className?: string }>> = {
  dashboard: Home,
  family: Users,
  chores: CheckCircle2,
  mood: Smile,
  calendar: Calendar,
  meals: UtensilsCrossed,
  shopping: ShoppingCart,
  settings: Settings,
};

export const Layout: React.FC<LayoutProps> = ({
  activeTab,
  setActiveTab,
  children,
}) => {
  const queryClient = useQueryClient();
  const { clear } = useInternetIdentity();
  const { data: myMember } = useMyMember();
  const [mobileMenuOpen, setMobileMenuOpen] = useState(false);

  const handleTabClick = (tabId: TabId) => {
    setActiveTab(tabId);
    setMobileMenuOpen(false);
  };

  const handleSignOut = () => {
    queryClient.clear();
    clear();
  };

  const renderNavItems = (onClickFn: (id: TabId) => void) =>
    TABS.map((tab) => {
      const Icon = TAB_ICONS[tab.id];
      const isActive = activeTab === tab.id;
      return (
        <Button
          key={tab.id}
          variant="ghost"
          onClick={() => onClickFn(tab.id)}
          className={cn(
            "w-full justify-start gap-3 h-9",
            isActive
              ? "bg-primary text-white hover:bg-primary/90 hover:text-white"
              : "text-muted-foreground hover:text-foreground",
          )}
        >
          <Icon className="w-4 h-4" />
          <span className="text-sm">{tab.label}</span>
        </Button>
      );
    });

  return (
    <div className="min-h-screen bg-background flex">
      {/* Desktop Sidebar */}
      <aside className="hidden md:flex md:flex-col md:w-60 bg-background border-r border-border fixed h-full z-30">
        {/* Logo */}
        <div className="h-14 flex items-center gap-3 px-4 border-b border-border">
          <div className="w-8 h-8 rounded-lg bg-primary flex items-center justify-center">
            <Home className="w-4 h-4 text-white" />
          </div>
          <span className="text-sm font-semibold text-foreground">
            FamilyHub
          </span>
        </div>

        <nav className="flex-1 p-3 space-y-1 overflow-y-auto">
          {renderNavItems(setActiveTab)}
        </nav>
      </aside>

      {/* Header Bar - shares background with sidebar for fluid look */}
      <header className="fixed top-0 right-0 left-0 md:left-60 h-14 bg-background border-b border-border z-40">
        <div className="flex items-center justify-between h-full px-4">
          {/* Mobile Menu Button */}
          <Button
            variant="ghost"
            size="icon"
            onClick={() => setMobileMenuOpen(true)}
            className="md:hidden"
            aria-label="Toggle menu"
          >
            <Menu className="w-5 h-5" />
          </Button>

          {/* Spacer */}
          <div className="flex-1" />

          {/* Theme + Profile */}
          <div className="flex items-center gap-1">
            <ThemeToggle />
            <DropdownMenu>
              <DropdownMenuTrigger asChild>
                <Button variant="ghost" size="icon" className="relative">
                  {myMember ? (
                    <div
                      className="w-7 h-7 rounded-lg flex items-center justify-center text-xs"
                      style={{ backgroundColor: myMember.color }}
                    >
                      {myMember.avatarEmoji}
                    </div>
                  ) : (
                    <div className="w-7 h-7 rounded-lg bg-muted" />
                  )}
                </Button>
              </DropdownMenuTrigger>
              <DropdownMenuContent align="end" className="w-48">
                <div className="px-2 py-1.5 text-sm font-medium">
                  Welcome back, {myMember?.name || "..."}!
                </div>
                <DropdownMenuItem onClick={handleSignOut}>
                  <LogOut className="w-4 h-4" />
                  Sign Out
                </DropdownMenuItem>
              </DropdownMenuContent>
            </DropdownMenu>
          </div>
        </div>
      </header>

      {/* Mobile Menu */}
      <Sheet open={mobileMenuOpen} onOpenChange={setMobileMenuOpen}>
        <SheetContent side="left" className="w-64 p-0 gap-0 md:hidden">
          <SheetHeader className="h-14 flex-row items-center gap-3 px-4 border-b border-border space-y-0">
            <div className="w-8 h-8 rounded-lg bg-primary flex items-center justify-center">
              <Home className="w-4 h-4 text-white" />
            </div>
            <SheetTitle className="text-sm">FamilyHub</SheetTitle>
          </SheetHeader>
          <nav className="flex-1 p-3 space-y-1 overflow-y-auto">
            {renderNavItems(handleTabClick)}
          </nav>
          <SheetFooter className="border-t border-border p-3">
            <Button
              variant="ghost"
              onClick={() => {
                clear();
                setMobileMenuOpen(false);
              }}
              className="w-full justify-start gap-3 h-9 text-muted-foreground hover:text-foreground"
            >
              <LogOut className="w-4 h-4" />
              <span className="text-sm">Sign Out</span>
            </Button>
          </SheetFooter>
        </SheetContent>
      </Sheet>

      {/* Main Content - full width, no max-w constraint */}
      <main className="flex-1 md:ml-60 pt-14">
        <div className="p-4 md:p-6">{children}</div>
      </main>
    </div>
  );
};
