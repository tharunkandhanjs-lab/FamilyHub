import React from "react";
import { AlertTriangle } from "lucide-react";
import { Button } from "@/components/ui/button";

export const Error = ({
  message,
  onRetry,
}: {
  message?: string | React.ReactNode;
  onRetry?: () => void;
}) => {
  return (
    <div className="flex flex-1 items-center justify-center py-16 px-4">
      <div className="max-w-md text-center">
        <div className="mx-auto mb-6 flex h-16 w-16 items-center justify-center rounded-full bg-destructive/10">
          <AlertTriangle className="h-8 w-8 text-destructive" />
        </div>

        {message ? (
          typeof message === "string" ? (
            <p className="text-muted-foreground mb-8">{message}</p>
          ) : (
            message
          )
        ) : (
          <>
            <h1 className="mb-3 text-3xl font-bold text-foreground">
              Something went wrong
            </h1>

            <p className="mb-8 text-muted-foreground">
              An error occurred while loading this page.
            </p>
          </>
        )}

        {onRetry && (
          <Button
            onClick={onRetry}
            className="rounded-xl bg-orange-500 px-6 py-3 hover:bg-orange-600"
          >
            Try Again
          </Button>
        )}
      </div>
    </div>
  );
};
