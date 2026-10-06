import { ErrorNotice } from "@/components/feedback";
import { Modal } from "@/components/modal";
import { Button } from "@/components/ui/button";
import { Camera } from "lucide-react";
import { useRef, useState } from "react";

export function PhotoButton({
  url,
  label,
}: {
  url: string | null;
  label: string;
}) {
  const [open, setOpen] = useState(false);
  const [failed, setFailed] = useState(false);

  const opener = useRef<HTMLButtonElement>(null);

  if (!url) {
    return <span className="muted">—</span>;
  }

  return (
    <>
      <Button
        ref={opener}
        variant="secondary"
        size="sm"
        onClick={() => {
          setFailed(false);
          setOpen(true);
        }}
      >
        <Camera size={15} />
        {label}
      </Button>
      {open && (
        <Modal
          title={label}
          onClose={() => setOpen(false)}
          returnFocus={opener.current}
          wide
        >
          {failed ? (
            <ErrorNotice message="The photo is unavailable. Close this window and try again." />
          ) : (
            <img
              className="evidence-photo"
              src={url}
              alt={label}
              onError={() => setFailed(true)}
            />
          )}
          <p className="photo-note">
            Attendance evidence · visible only to this employee and HR
          </p>
        </Modal>
      )}
    </>
  );
}
