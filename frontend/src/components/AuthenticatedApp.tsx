import React, { useState } from "react";
import { TabId } from "../constants";
import { Layout } from "./Layout";
import { Dashboard } from "./Dashboard";
import { FamilyPage } from "./FamilyPage";
import { MoodPage } from "./MoodPage";
import { CalendarPage } from "./CalendarPage";
import { ChoresPage } from "./ChoresPage";
import { MealsPage } from "./MealsPage";
import { ShoppingPage } from "./ShoppingPage";
import { SettingsPage } from "./SettingsPage";
import { OnboardingChoice } from "./OnboardingChoice";
import { CreateFamily } from "./CreateFamily";
import { JoinFamily } from "./JoinFamily";
import { LoadingScreen } from "./LoadingScreen";
import type { FamilyStatus } from "../backend";

type OnboardingStep = "choice" | "create" | "join";

interface AuthenticatedAppProps {
  familyStatus: FamilyStatus;
  refetchStatus: () => Promise<any>;
  onLogout: () => void;
}

export const AuthenticatedApp: React.FC<AuthenticatedAppProps> = ({
  familyStatus,
  refetchStatus,
  onLogout,
}) => {
  const [activeTab, setActiveTab] = useState<TabId>("dashboard");
  const [onboardingStep, setOnboardingStep] =
    useState<OnboardingStep>("choice");
  const [isTransitioning, setIsTransitioning] = useState(false);

  const isLinked = familyStatus.__kind__ !== "NotLinked";

  // Show loading screen during transition after onboarding
  if (isTransitioning) {
    return <LoadingScreen />;
  }

  // User not linked - show onboarding flow
  if (!isLinked) {
    const handleOnboardingSuccess = async () => {
      setIsTransitioning(true);
      await refetchStatus();
      setOnboardingStep("choice");
      setIsTransitioning(false);
    };

    switch (onboardingStep) {
      case "create":
        return (
          <CreateFamily
            onBack={() => setOnboardingStep("choice")}
            onSuccess={handleOnboardingSuccess}
          />
        );
      case "join":
        return (
          <JoinFamily
            onBack={() => setOnboardingStep("choice")}
            onSuccess={handleOnboardingSuccess}
          />
        );
      default:
        return (
          <OnboardingChoice
            onCreateFamily={() => setOnboardingStep("create")}
            onJoinFamily={() => setOnboardingStep("join")}
            onLogout={onLogout}
          />
        );
    }
  }

  // User is linked - show main app
  return (
    <Layout activeTab={activeTab} setActiveTab={setActiveTab}>
      {activeTab === "dashboard" && <Dashboard />}
      {activeTab === "family" && <FamilyPage />}
      {activeTab === "chores" && <ChoresPage />}
      {activeTab === "mood" && <MoodPage />}
      {activeTab === "calendar" && <CalendarPage />}
      {activeTab === "meals" && <MealsPage />}
      {activeTab === "shopping" && <ShoppingPage />}
      {activeTab === "settings" && <SettingsPage />}
    </Layout>
  );
};
