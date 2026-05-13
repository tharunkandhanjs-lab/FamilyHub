import React, { useState, useEffect } from "react";
import { useInviteDetails, useJoinFamily } from "../hooks/useQueries";
import { FormButton } from "./shared/FormButton";
import { Label } from "@/components/ui/label";
import { Card, CardContent } from "@/components/ui/card";
import { Alert, AlertTitle, AlertDescription } from "@/components/ui/alert";
import {
  ArrowLeft,
  Link,
  CheckCircle,
  XCircle,
  Loader2,
  AlertCircle,
} from "lucide-react";
import { Button } from "@/components/ui/button";

interface JoinFamilyProps {
  onBack: () => void;
  onSuccess: () => void;
}

export const JoinFamily: React.FC<JoinFamilyProps> = ({
  onBack,
  onSuccess,
}) => {
  const [inviteCode, setInviteCode] = useState("");
  const [debouncedCode, setDebouncedCode] = useState("");
  const [error, setError] = useState<string | null>(null);

  const {
    data: inviteDetails,
    isLoading: isLoadingDetails,
    error: detailsError,
  } = useInviteDetails(debouncedCode);

  const joinFamily = useJoinFamily();

  // Debounce the invite code input
  useEffect(() => {
    const timer = setTimeout(() => {
      if (inviteCode.length >= 9) {
        // XXXX-XXXX format
        setDebouncedCode(inviteCode.toUpperCase());
      } else {
        setDebouncedCode("");
      }
    }, 500);

    return () => clearTimeout(timer);
  }, [inviteCode]);

  const handleCodeChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    let value = e.target.value.toUpperCase().replace(/[^A-Z0-9-]/g, "");

    // Auto-add dash after 4 characters
    if (value.length === 4 && !value.includes("-")) {
      value = value + "-";
    }

    // Limit to 9 characters (XXXX-XXXX)
    if (value.length <= 9) {
      setInviteCode(value);
      setError(null);
    }
  };

  const handleJoin = async () => {
    if (!inviteDetails) {
      setError("Please enter a valid invite code");
      return;
    }

    try {
      await joinFamily.mutateAsync(debouncedCode);
      onSuccess();
    } catch (err) {
      setError(err instanceof Error ? err.message : "Failed to join family");
    }
  };

  const isValidCode = inviteCode.length === 9 && inviteCode.includes("-");
  const showPreview = isValidCode && inviteDetails && !detailsError;
  const showError = isValidCode && detailsError && !isLoadingDetails;

  return (
    <div className="min-h-screen bg-background flex items-center justify-center p-4">
      <Card className="max-w-md w-full">
        <CardContent className="p-8">
          <Button variant="ghost" onClick={onBack} className="mb-4">
            <ArrowLeft className="w-4 h-4" /> Back
          </Button>

          <div className="text-center mb-6">
            <Link className="w-12 h-12 text-primary mx-auto mb-3" />
            <h1 className="text-2xl text-foreground mb-2">Join a Family</h1>
            <p className="text-muted-foreground text-sm">
              Enter the invite code your family admin shared with you
            </p>
          </div>

          {error && (
            <Alert variant="destructive" className="mb-4">
              <AlertCircle className="h-4 w-4" />
              <AlertDescription>{error}</AlertDescription>
            </Alert>
          )}

          <div className="space-y-6">
            {/* Invite Code Input */}
            <div>
              <Label className="mb-2">Invite Code</Label>
              <input
                type="text"
                value={inviteCode}
                onChange={handleCodeChange}
                placeholder="XXXX-XXXX"
                className="w-full px-4 py-4 text-center text-2xl font-mono tracking-widest bg-muted border border-border text-foreground placeholder:text-muted-foreground rounded-lg focus:ring-2 focus:ring-ring focus:border-transparent uppercase"
                autoComplete="off"
              />
              <p className="text-sm text-muted-foreground mt-2 text-center">
                The code looks like: ABCD-1234
              </p>
            </div>

            {/* Loading State */}
            {isValidCode && isLoadingDetails && (
              <div className="bg-muted/30 rounded-lg p-4 text-center border border-border">
                <Loader2 className="w-6 h-6 text-primary animate-spin mx-auto mb-2" />
                <p className="text-muted-foreground text-sm">
                  Checking invite code...
                </p>
              </div>
            )}

            {/* Invalid Code Error */}
            {showError && (
              <Alert variant="destructive">
                <XCircle className="h-4 w-4" />
                <AlertTitle>Invalid Invite Code</AlertTitle>
                <AlertDescription>
                  Please check the code and try again
                </AlertDescription>
              </Alert>
            )}

            {/* Valid Code Preview */}
            {showPreview && (
              <div className="bg-primary/10 rounded-lg p-4 border-2 border-primary/20">
                <div className="text-center mb-4">
                  <CheckCircle className="w-8 h-8 text-primary mx-auto mb-2" />
                  <p className="text-primary">Valid Invite Code!</p>
                </div>

                <div className="bg-muted/50 rounded-lg p-4 mb-4 border border-border">
                  <div className="text-sm text-muted-foreground mb-3">
                    You're joining:
                  </div>
                  <div className="flex items-center gap-3">
                    <div
                      className="w-14 h-14 rounded-full flex items-center justify-center text-2xl shadow-md border border-border"
                      style={{ backgroundColor: inviteDetails.memberColor }}
                    >
                      {inviteDetails.memberAvatarEmoji}
                    </div>
                    <div>
                      <div className="text-foreground">
                        {inviteDetails.memberName}
                      </div>
                      <div className="text-sm text-muted-foreground">
                        in {inviteDetails.familyName}
                      </div>
                    </div>
                  </div>
                </div>

                <FormButton
                  onClick={handleJoin}
                  variant="primary"
                  loading={joinFamily.isPending}
                  disabled={joinFamily.isPending}
                  className="w-full bg-primary hover:bg-primary/90"
                >
                  {joinFamily.isPending ? "Joining..." : "Join Family"}
                </FormButton>
              </div>
            )}

            {/* Initial state - no code entered */}
            {!isValidCode && (
              <div className="text-center text-muted-foreground text-sm">
                <p>Ask your family admin for an invite code.</p>
                <p className="mt-1">
                  They can find it in the Family section of their app.
                </p>
              </div>
            )}
          </div>
        </CardContent>
      </Card>
    </div>
  );
};
