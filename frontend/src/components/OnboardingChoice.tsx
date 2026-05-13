import React from "react";
import { Card, CardContent } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Plus, Link, Home, LogOut } from "lucide-react";

interface OnboardingChoiceProps {
  onCreateFamily: () => void;
  onJoinFamily: () => void;
  onLogout: () => void;
}

export const OnboardingChoice: React.FC<OnboardingChoiceProps> = ({
  onCreateFamily,
  onJoinFamily,
  onLogout,
}) => {
  return (
    <div className="min-h-screen bg-background flex items-center justify-center p-4">
      <Card className="max-w-md w-full">
        <CardContent className="p-8">
          <div className="text-center mb-8">
            <div className="w-24 h-24 rounded-2xl bg-primary flex items-center justify-center shadow-md mx-auto mb-4">
              <Home className="w-12 h-12 text-white" />
            </div>
            <h1 className="text-2xl text-foreground mb-2">
              Welcome to FamilyHub
            </h1>
            <p className="text-muted-foreground">
              Get started by creating a new family or joining an existing one.
            </p>
          </div>

          <div className="space-y-4">
            <Button
              onClick={onCreateFamily}
              className="w-full h-auto p-4 rounded-xl flex items-center justify-center gap-3"
            >
              <Plus className="w-6 h-6" />
              <div className="text-left">
                <div>Create a New Family</div>
                <div className="text-sm opacity-90">
                  Start fresh as the family admin
                </div>
              </div>
            </Button>

            <div className="relative">
              <div className="absolute inset-0 flex items-center">
                <div className="w-full border-t border-border" />
              </div>
              <div className="relative flex justify-center text-sm">
                <span className="px-4 bg-card text-muted-foreground">or</span>
              </div>
            </div>

            <Button
              variant="outline"
              onClick={onJoinFamily}
              className="w-full h-auto p-4 rounded-xl hover:border-primary hover:bg-secondary flex items-center justify-center gap-3"
            >
              <Link className="w-6 h-6" />
              <div className="text-left">
                <div>Join Existing Family</div>
                <div className="text-sm text-muted-foreground">
                  Use an invite code from your family
                </div>
              </div>
            </Button>
          </div>

          <Button variant="ghost" onClick={onLogout} className="w-full mt-6">
            <LogOut className="w-4 h-4" />
            Log out
          </Button>
        </CardContent>
      </Card>
    </div>
  );
};
