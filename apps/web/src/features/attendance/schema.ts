import { z } from "zod";

export const photoSchema = z
  .file()
  .min(1, "Choose a non-empty photo.")
  .max(5 * 1024 * 1024, "Choose a photo up to 5 MB.")
  .mime(
    ["image/jpeg", "image/png", "image/webp"],
    "Choose a JPEG, PNG, or WebP photo up to 5 MB.",
  );

export const attendanceFormSchema = z.object({
  photo: photoSchema
    .nullable()
    .refine((photo) => photo !== null, "Choose an attendance photo."),
});

export type AttendanceValues = z.infer<typeof attendanceFormSchema>;

export type AttendanceFormValues = z.input<typeof attendanceFormSchema>;
