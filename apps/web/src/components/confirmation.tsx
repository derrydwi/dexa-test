import { useRef, type ReactNode } from "react";
import { ErrorNotice } from "./feedback";
import {
  AlertDialog,
  AlertDialogAction,
  AlertDialogCancel,
  AlertDialogContent,
  AlertDialogDescription,
  AlertDialogTitle,
} from "./ui/alert-dialog";

export function Confirmation({
  title,
  children,
  confirm,
  onClose,
  danger = false,
  busy = false,
  error = "",
  returnFocus: opener,
}: {
  title: string;
  children: ReactNode;
  confirm: () => void;
  onClose: () => void;
  danger?: boolean;
  busy?: boolean;
  error?: string;
  returnFocus?: HTMLElement | null;
}) {
  const returnFocus = useRef(
    opener ?? (document.activeElement as HTMLElement | null),
  );

  return (
    <AlertDialog
      open
      onOpenChange={(open) => {
        if (!open && !busy) {
          onClose();
        }
      }}
    >
      <AlertDialogContent
        className="modal"
        onEscapeKeyDown={(event) => {
          if (busy) {
            event.preventDefault();
          }
        }}
        onCloseAutoFocus={(event) => {
          event.preventDefault();
          returnFocus.current?.focus();
        }}
      >
        <div className="modal-head">
          <AlertDialogTitle>{title}</AlertDialogTitle>
        </div>
        <AlertDialogDescription className="modal-description">
          {children}
        </AlertDialogDescription>
        <ErrorNotice message={error} />
        <div className="modal-actions">
          <AlertDialogCancel variant="outline" disabled={busy}>
            Cancel
          </AlertDialogCancel>
          <AlertDialogAction
            variant={danger ? "destructive" : "default"}
            disabled={busy}
            onClick={(event) => {
              event.preventDefault();
              confirm();
            }}
          >
            {busy ? "Saving…" : "Confirm"}
          </AlertDialogAction>
        </div>
      </AlertDialogContent>
    </AlertDialog>
  );
}
