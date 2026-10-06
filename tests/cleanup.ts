import { unlink } from "node:fs/promises";
import { resolve } from "node:path";
import { execFile } from "node:child_process";
import { promisify } from "node:util";

export async function removeTestPhotos(filenames: Array<string | null>) {
  const names = [
    ...new Set(
      filenames.filter(
        (name): name is string => !!name && /^[a-f0-9-]{36}\.jpg$/.test(name),
      ),
    ),
  ];
  if (process.env.TEST_UPLOAD_DIR) {
    for (const name of names) {
      await unlink(resolve(process.env.TEST_UPLOAD_DIR, name)).catch(
        (error) => {
          if (error.code !== "ENOENT") {
            throw error;
          }
        },
      );
    }
  } else if (process.env.TEST_DOCKER === "1" && names.length) {
    await promisify(execFile)("docker", [
      "compose",
      "exec",
      "-T",
      "attendance",
      "node",
      "-e",
      "const fs=require('node:fs'); for(const name of process.argv.slice(1)) { if(/^[a-f0-9-]{36}\\.jpg$/.test(name)) try {fs.unlinkSync('/data/uploads/'+name)} catch(e) {if(e.code!=='ENOENT') throw e} }",
      ...names,
    ]);
  }
}
