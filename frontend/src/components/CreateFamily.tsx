import React, { useState } from "react";
import { useCreateFamily } from "../hooks/useQueries";
import { AVATARS, COLORS } from "../constants";
import { FormButton } from "./shared/FormButton";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Card, CardContent } from "@/components/ui/card";
import { Alert, AlertDescription } from "@/components/ui/alert";
import { ArrowLeft, Home, AlertCircle } from "lucide-react";
import { Button } from "@/components/ui/button";
import { cn } from "@/lib/utils";

interface CreateFamilyProps {
  onBack: () => void;
  onSuccess: () => void;
}

export const CreateFamily: React.FC<CreateFamilyProps> = ({
  onBack,
  onSuccess,
}) => {
  const createFamily = useCreateFamily();
  const [familyName, setFamilyName] = useState("");
  const [adminName, setAdminName] = useState("");
  const [selectedColor, setSelectedColor] = useState(COLORS[0]);
  const [selectedAvatar, setSelectedAvatar] = useState(AVATARS[0]);
  const [error, setError] = useState<string | null>(null);

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setError(null);

    if (!familyName.trim() || !adminName.trim()) {
      setError("Please fill in all fields");
      return;
    }

    try {
      await createFamily.mutateAsync({
        familyName: familyName.trim(),
        adminName: adminName.trim(),
        adminColor: selectedColor,
        adminAvatarEmoji: selectedAvatar,
      });
      onSuccess();
    } catch (err) {
      setError(err instanceof Error ? err.message : "Failed to create family");
    }
  };

  return (
    <div className="min-h-screen bg-background flex items-center justify-center p-4">
      <Card className="max-w-md w-full">
        <CardContent className="p-8">
          <Button variant="ghost" onClick={onBack} className="mb-4">
            <ArrowLeft className="w-4 h-4" /> Back
          </Button>

          <div className="text-center mb-6">
            <Home className="w-12 h-12 text-primary mx-auto mb-3" />
            <h1 className="text-2xl text-foreground mb-2">
              Create Your Family
            </h1>
            <p className="text-muted-foreground text-sm">
              Set up your family and your admin profile
            </p>
          </div>

          {error && (
            <Alert variant="destructive" className="mb-4">
              <AlertCircle className="h-4 w-4" />
              <AlertDescription>{error}</AlertDescription>
            </Alert>
          )}

          <form onSubmit={handleSubmit} className="space-y-6">
            {/* Family Name */}
            <div>
              <Label className="mb-2">Family Name</Label>
              <Input
                type="text"
                value={familyName}
                onChange={(e) => setFamilyName(e.target.value)}
                placeholder="e.g., The Smiths"
                required
              />
            </div>

            {/* Divider */}
            <div className="relative">
              <div className="absolute inset-0 flex items-center">
                <div className="w-full border-t border-border" />
              </div>
              <div className="relative flex justify-center text-sm">
                <span className="px-4 bg-card text-muted-foreground">
                  Your Profile
                </span>
              </div>
            </div>

            {/* Admin Name */}
            <div>
              <Label className="mb-2">Your Name</Label>
              <Input
                type="text"
                value={adminName}
                onChange={(e) => setAdminName(e.target.value)}
                placeholder="e.g., Dad, Mom, John"
                required
              />
            </div>

            {/* Avatar Selection */}
            <div>
              <Label className="mb-2">Choose Your Avatar</Label>
              <div className="flex flex-wrap gap-2">
                {AVATARS.map((avatar) => (
                  <Button
                    key={avatar}
                    type="button"
                    variant="outline"
                    onClick={() => setSelectedAvatar(avatar)}
                    className={cn(
                      "w-12 h-12 rounded-full text-2xl border-2 transition-all",
                      selectedAvatar === avatar
                        ? "border-primary bg-primary/10 scale-110"
                        : "border-border hover:border-muted-foreground",
                    )}
                  >
                    {avatar}
                  </Button>
                ))}
              </div>
            </div>

            {/* Color Selection */}
            <div>
              <Label className="mb-2">Choose Your Color</Label>
              <div className="flex flex-wrap gap-2">
                {COLORS.map((color) => (
                  <Button
                    key={color}
                    type="button"
                    variant="outline"
                    onClick={() => setSelectedColor(color)}
                    className={cn(
                      "w-10 h-10 rounded-full border-2 p-0 transition-all",
                      selectedColor === color
                        ? "border-foreground scale-110"
                        : "border-transparent hover:border-muted-foreground",
                    )}
                    style={{ backgroundColor: color }}
                  />
                ))}
              </div>
            </div>

            {/* Preview */}
            <div className="bg-muted/30 rounded-lg p-4 border border-border">
              <div className="text-sm text-muted-foreground mb-2">Preview</div>
              <div className="flex items-center gap-3">
                <div
                  className="w-12 h-12 rounded-full flex items-center justify-center text-xl shadow-md border border-border"
                  style={{ backgroundColor: selectedColor }}
                >
                  {selectedAvatar}
                </div>
                <div>
                  <div className="text-foreground">
                    {adminName || "Your Name"}
                  </div>
                  <div className="text-sm text-primary">Family Admin</div>
                </div>
              </div>
            </div>

            {/* Submit */}
            <FormButton
              type="submit"
              variant="primary"
              loading={createFamily.isPending}
              disabled={createFamily.isPending}
              className="w-full"
            >
              {createFamily.isPending ? "Creating..." : "Create Family"}
            </FormButton>
          </form>
        </CardContent>
      </Card>
    </div>
  );
};
