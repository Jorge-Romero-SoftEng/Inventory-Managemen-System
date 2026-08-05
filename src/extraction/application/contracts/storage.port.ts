/**
 * Port for persisting original source documents so every extraction has an
 * audit trail (spec requirement 4). The default implementation writes to
 * STORAGE_DIR on the local filesystem.
 */
export interface IFileStorage {
  save(buffer: Buffer, fileName: string): Promise<string>;
  load(path: string): Promise<Buffer>;
}
