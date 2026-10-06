import { X } from "lucide-react";
import { useRef, type ReactNode } from "react";
import { Button } from "./ui/button";
import { Dialog, DialogContent, DialogTitle } from "./ui/dialog";

export function Modal({
  title,
  children,
  onClose,
  wide = false,
  busy = false,
  returnFocus: opener,
}: {
  title: string;
  children: ReactNode;
  onClose: () => void;
  wide?: boolean;
  busy?: boolean;
  returnFocus?: HTMLElement | null;
}) {
  const returnFocus = useRef(
    opener ?? (document.activeElement as HTMLElement | null),
  );

  return (
    <Dialog
      open
      onOpenChange={(open) => {
        if (!open && !busy) {
          onClose();
        }
      }}
    >
      <DialogContent
        className={`modal ${wide ? "wide" : ""}`}
        showCloseButton={false}
        aria-describedby={undefined}
        onEscapeKeyDown={(event) => {
          if (busy) {
            event.preventDefault();
          }
        }}
        onInteractOutside={(event) => {
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
          <DialogTitle>{title}</DialogTitle>
          <Button
            variant="ghost"
            size="icon-sm"
            disabled={busy}
            onClick={onClose}
            aria-label="Close dialog"
          >
            <X size={20} />
          </Button>
        </div>
        {children}
      </DialogContent>
    </Dialog>
  );
}
