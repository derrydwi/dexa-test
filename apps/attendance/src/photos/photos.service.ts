import { BadRequestException, Injectable, Logger } from "@nestjs/common";
import { randomUUID } from "node:crypto";
import { mkdir, unlink, writeFile } from "node:fs/promises";
import { resolve } from "node:path";
import sharp from "sharp";
import { attendanceConfig } from "../config/configuration";

export const MAX_PHOTO_BYTES = 5 * 1024 * 1024;

@Injectable()
export class PhotosService {
  private readonly logger = new Logger(PhotosService.name);

  path(filename: string): string {
    return resolve(attendanceConfig.uploadDirectory, filename);
  }

  async save(file?: Express.Multer.File): Promise<string> {
    if (!file?.buffer?.length) {
      throw new BadRequestException("A photo is required.");
    }
    if (file.size > MAX_PHOTO_BYTES) {
      throw new BadRequestException("Photo must be 5 MB or smaller.");
    }
    let output: Buffer;
    try {
      const image = sharp(file.buffer, {
        limitInputPixels: 25000000,
        failOn: "warning",
        animated: false,
      });
      const metadata = await image.metadata();
      if (
        !["jpeg", "png", "webp"].includes(metadata.format || "") ||
        (metadata.pages || 1) > 1
      ) {
        throw new Error("Unsupported image");
      }
      // Decode the complete image, remove metadata, and normalize uploads to a bounded JPEG.
      output = await image
        .rotate()
        .resize(2560, 2560, { fit: "inside", withoutEnlargement: true })
        .jpeg({ quality: 85 })
        .toBuffer();
    } catch {
      throw new BadRequestException(
        "Upload a valid JPEG, PNG, or WebP photo (up to 25 megapixels).",
      );
    }
    const filename = `${randomUUID()}.jpg`;
    await mkdir(attendanceConfig.uploadDirectory, { recursive: true });
    try {
      await writeFile(this.path(filename), output, {
        flag: "wx",
      });
    } catch (error) {
      await this.remove(filename);
      throw error;
    }

    return filename;
  }

  async remove(filename: string) {
    try {
      await unlink(this.path(filename));
    } catch (error) {
      if ((error as NodeJS.ErrnoException).code !== "ENOENT") {
        this.logger.error(
          "Could not remove failed upload:",
          (error as Error).message,
        );
      }
    }
  }
}
