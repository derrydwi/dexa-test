import { Confirmation } from "@/components/confirmation";
import { ErrorNotice, Loading } from "@/components/feedback";
import { Badge } from "@/components/status-badge";
import { Button } from "@/components/ui/button";
import { useAttendance, useAttendanceSubmit } from "./queries";
import {
  attendanceFormSchema,
  type AttendanceValues,
  type AttendanceFormValues,
} from "./schema";
import { Controller, useForm } from "react-hook-form";
import { zodResolver } from "@hookform/resolvers/zod";
import { useWorkDate } from "@/hooks/use-work-date";
import { formatDate, timeWib } from "@/lib/format";
import { ApiError, errorMessage } from "@/lib/http";
import type { User } from "@wfh/contracts";
import {
  ArrowRight,
  CalendarDays,
  Camera,
  CheckCircle2,
  Clock3,
  LogIn,
  LogOut,
  ShieldCheck,
} from "lucide-react";
import { useRef, useState } from "react";
import { AttendanceList } from "./attendance-list";
import { PhotoButton } from "./photo-button";
import { PhotoUploader } from "./photo-uploader";

export function Today({ user }: { user: User }) {
  const day = useWorkDate();

  return <Workday key={day} user={user} day={day} />;
}

function Workday({ user, day }: { user: User; day: string }) {
  const [confirming, setConfirming] = useState(false);
  const [notice, setNotice] = useState("");

  const opener = useRef<HTMLButtonElement>(null);

  const form = useForm<AttendanceFormValues, unknown, AttendanceValues>({
    resolver: zodResolver(attendanceFormSchema),
    defaultValues: { photo: null },
  });
  const today = useAttendance(user.id, { from: day, to: day, pageSize: 1 });
  const mutation = useAttendanceSubmit(user.id);

  const file = form.watch("photo");
  const busy = mutation.isPending || form.formState.isSubmitting;
  const record = today.data?.items[0];
  const completed = !!record?.checkOutAt;
  const action = record ? "check-out" : "check-in";

  const submit = async (values: AttendanceValues) => {
    if (!values.photo || mutation.isPending) {
      return;
    }
    try {
      await mutation.mutateAsync({ action, photo: values.photo });
      setNotice(`Your ${action} was recorded successfully.`);
      form.reset({ photo: null });
      setConfirming(false);
    } catch (error) {
      if (error instanceof ApiError && error.fieldErrors.photo) {
        form.setError("photo", {
          type: "server",
          message: error.fieldErrors.photo.join(" · "),
        });
      }
      form.setError("root.server", { message: errorMessage(error) });
      setConfirming(false);
    }
  };

  return (
    <>
      <div className="page-heading">
        <div>
          <h1>Hello, {user.fullName.split(" ")[0]}.</h1>
          <p>Let’s make a clear record of your workday.</p>
        </div>
        <span className="date-chip">
          <CalendarDays size={17} />
          {formatDate(day)}
        </span>
      </div>
      {notice && (
        <div className="success-notice" role="status">
          <CheckCircle2 size={18} />
          {notice}
        </div>
      )}
      <div className="workday-grid">
        <section className="workday-panel">
          <div className="panel-heading">
            <div>
              <h2>Today’s attendance</h2>
              <p>{formatDate(day, true)}</p>
            </div>
            {record ? (
              <Badge status={record.status} />
            ) : (
              <Badge status="Not started" />
            )}
          </div>
          <div className="workday-body">
            <div className="time-strip">
              <div>
                <span className="time-label">
                  <LogIn size={17} />
                  Check-in
                </span>
                <strong>{timeWib(record?.checkInAt)}</strong>
                <small>
                  {record ? "Recorded in WIB" : "Start your workday"}
                </small>
              </div>
              <span className="time-connector" />
              <div>
                <span className="time-label">
                  <LogOut size={17} />
                  Check-out
                </span>
                <strong>{timeWib(record?.checkOutAt)}</strong>
                <small>
                  {completed ? "Recorded in WIB" : "Finish before midnight WIB"}
                </small>
              </div>
            </div>
            <ErrorNotice
              message={today.error ? errorMessage(today.error) : ""}
              retry={() => void today.refetch()}
            />
            {today.isPending ? (
              <Loading />
            ) : completed ? (
              <div className="day-complete">
                <span>
                  <CheckCircle2 size={30} strokeWidth={1.6} />
                </span>
                <h3>Your workday is complete.</h3>
                <p>
                  Both photos and timestamps have been recorded.
                  <br />
                  You’re all set for today.
                </p>
                <div className="complete-photos">
                  <PhotoButton
                    url={record!.checkInPhoto}
                    label="Check-in photo"
                  />
                  <PhotoButton
                    url={record!.checkOutPhoto}
                    label="Check-out photo"
                  />
                </div>
              </div>
            ) : (
              (!today.error || today.data) && (
                <>
                  <div className="upload-heading">
                    <h3>
                      {record
                        ? "Ready to wrap up?"
                        : "Ready to start your day?"}
                    </h3>
                    <p>
                      {record
                        ? "Add a photo before checking out."
                        : "Add a photo of yourself working from home."}
                    </p>
                  </div>
                  <form
                    noValidate
                    onSubmit={form.handleSubmit(() => setConfirming(true))}
                  >
                    <Controller
                      name="photo"
                      control={form.control}
                      render={({ field, fieldState }) => (
                        <PhotoUploader
                          file={field.value}
                          onChange={field.onChange}
                          onBlur={field.onBlur}
                          inputRef={field.ref}
                          error={fieldState.error?.message}
                          disabled={busy}
                        />
                      )}
                    />
                    <ErrorNotice
                      message={
                        form.formState.errors.root?.server?.message || ""
                      }
                    />
                    <Button
                      ref={opener}
                      className="attendance-submit"
                      disabled={!file || busy}
                      type="submit"
                    >
                      {record ? <LogOut size={18} /> : <LogIn size={18} />}{" "}
                      {record ? "Check out" : "Check in"}
                      <ArrowRight size={17} />
                    </Button>
                    <p className="submit-note">
                      <ShieldCheck size={14} />
                      Your photo is visible only to you and HR.
                    </p>
                  </form>
                </>
              )
            )}
          </div>
        </section>
        <aside className="workday-guide">
          <h2>
            A little clarity,
            <br />
            every day.
          </h2>
          <p>Keep your team connected with a reliable record of your work.</p>
          <div className="guide-step">
            <span>
              <Camera size={19} />
            </span>
            <div>
              <h3>Show your workday</h3>
              <p>Choose a clear photo as your attendance evidence.</p>
            </div>
          </div>
          <div className="guide-step">
            <span>
              <Clock3 size={19} />
            </span>
            <div>
              <h3>We’ll handle the time</h3>
              <p>Your submission gets a server timestamp, shown in WIB.</p>
            </div>
          </div>
          <div className="guide-step">
            <span>
              <CheckCircle2 size={19} />
            </span>
            <div>
              <h3>Close the day</h3>
              <p>
                Check out before midnight WIB. Unclosed days are marked
                incomplete.
              </p>
            </div>
          </div>
          <div className="guide-bottom">
            <span className="small-dot" />
            One check-in. One check-out. Every day.
          </div>
        </aside>
      </div>
      <AttendanceList user={user} compact />
      {confirming && (
        <Confirmation
          returnFocus={opener.current}
          title={`Confirm ${action}?`}
          busy={busy}
          confirm={() => void form.handleSubmit(submit)()}
          onClose={() => setConfirming(false)}
        >
          Your photo and the server’s current time will be recorded. Submitted
          attendance cannot be edited.
        </Confirmation>
      )}
    </>
  );
}
