import { randomUUID } from "node:crypto";
import fs from "node:fs";
import path from "node:path";
import type { IFileStorage } from "@/extraction/application/contracts/storage.port";

/**
 * Local-filesystem storage for original source documents (audit trail).
 * Files are written under STORAGE_DIR with a timestamp + UUID name so they
 * never collide. Swapping this for S3/etc. is trivial because the pipeline
 * only depends on the IFileStorage port.
 */
export class LocalFileStorage implements IFileStorage {
  constructor(
    private readonly dir: string = process.env.STORAGE_DIR || "./storage/extracted-documents",
  ) {}

  private ensureDir(): void {
    fs.mkdirSync(this.dir, { recursive: true });
  }

  async save(buffer: Buffer, fileName: string): Promise<string> {
    this.ensureDir();
    const ext = path.extname(fileName) || ".bin";
    const storedName = `${Date.now()}-${randomUUID()}${ext}`;
    const filePath = path.join(this.dir, storedName);
    await fs.promises.writeFile(filePath, buffer);
    return filePath;
  }

  async load(filePath: string): Promise<Buffer> {
    return fs.promises.readFile(filePath);
  }
}
