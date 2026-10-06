import { Button } from "@/components/ui/button";
import { AlertCircle, Inbox, LoaderCircle } from "lucide-react";
import type { ReactNode } from "react";
import { Alert, AlertDescription } from "./ui/alert";

export function ErrorNotice({
  message,
  retry,
}: {
  message: string;
  retry?: () => void;
}) {
  if (!message) {
    return null;
  }

  return (
    <Alert className="my-3" variant="destructive">
      <AlertCircle size={18} />
      <AlertDescription className="flex flex-row items-start justify-between gap-3">
        <span>{message}</span>
        {retry && (
          <Button
            variant="link"
            size="sm"
            className="h-auto p-0 text-inherit"
            type="button"
            onClick={retry}
          >
            Try again
          </Button>
        )}
      </AlertDescription>
    </Alert>
  );
}

export function Loading() {
  return (
    <div className="loading" role="status">
      <LoaderCircle size={20} className="spin" />
      Loading…
    </div>
  );
}

export function Empty({
  title,
  children,
}: {
  title: string;
  children: ReactNode;
}) {
  return (
    <div className="empty">
      <Inbox size={30} strokeWidth={1.5} />
      <h3>{title}</h3>
      <p>{children}</p>
    </div>
  );
}
