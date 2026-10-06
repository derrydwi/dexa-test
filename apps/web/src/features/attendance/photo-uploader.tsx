import { Input } from "@/components/ui/input";
import { Field, FieldLabel, FieldError } from "@/components/ui/field";
import { photoSchema } from "./schema";
import { Button, buttonVariants } from "@/components/ui/button";
import { Camera, ImagePlus } from "lucide-react";
import { useEffect, useId, useRef, useState } from "react";

export function PhotoUploader({
  file,
  onChange,
  disabled,
  inputRef: formRef,
  onBlur,
  error: formError,
}: {
  file: File | null;
  onChange: (file: File | null) => void;
  disabled?: boolean;
  inputRef?: (element: HTMLInputElement | null) => void;
  onBlur?: () => void;
  error?: string;
}) {
  const [preview, setPreview] = useState("");
  const [error, setError] = useState("");

  const inputRef = useRef<HTMLInputElement>(null);

  const id = useId();

  const choose = (next: File | undefined) => {
    if (!next) {
      return;
    }
    const validation = photoSchema.safeParse(next);
    if (!validation.success) {
      setError(validation.error.issues[0].message);
      onChange(null);
      if (inputRef.current) {
        inputRef.current.value = "";
      }

      return;
    }
    setError("");
    onChange(next);
  };

  useEffect(() => {
    if (!file) {
      if (inputRef.current) {
        inputRef.current.value = "";
      }
      setPreview("");

      return;
    }
    const url = URL.createObjectURL(file);
    setPreview(url);

    return () => URL.revokeObjectURL(url);
  }, [file]);

  return (
    <Field
      className="photo-uploader gap-0"
      data-invalid={!!(error || formError)}
    >
      <Input
        ref={(element) => {
          inputRef.current = element;
          formRef?.(element);
        }}
        onBlur={onBlur}
        aria-invalid={!!(error || formError)}
        aria-describedby={error || formError ? `${id}-error` : undefined}
        id={id}
        type="file"
        accept="image/jpeg,image/png,image/webp"
        capture="user"
        disabled={disabled}
        onChange={(event) => choose(event.target.files?.[0])}
        className="file-input"
        aria-label="Upload attendance photo"
      />
      <FieldLabel
        htmlFor={id}
        className={`upload-target ${disabled ? "disabled" : ""}`}
      >
        {preview ? (
          <>
            <img src={preview} alt="Your attendance photo preview" />
            <span className="preview-caption">
              <Camera size={16} />
              {file?.name}
            </span>
          </>
        ) : (
          <>
            <span className="upload-icon">
              <ImagePlus size={25} strokeWidth={1.6} />
            </span>
            <strong>Add your work photo</strong>
            <span>Take a photo or choose from your device</span>
            <small>JPEG, PNG or WebP · up to 5 MB</small>
            <span
              data-slot="button"
              className={buttonVariants({ variant: "outline", size: "sm" })}
            >
              Choose photo
            </span>
          </>
        )}
      </FieldLabel>
      {file && (
        <Button
          variant="link"
          size="sm"
          type="button"
          className="mt-2"
          disabled={disabled}
          onClick={() => {
            setError("");
            onChange(null);
            if (inputRef.current) {
              inputRef.current.value = "";
            }
          }}
        >
          Remove photo
        </Button>
      )}
      <FieldError id={`${id}-error`} className="my-3">
        {error || formError}
      </FieldError>
    </Field>
  );
}
