import { Prisma } from "@prisma/client";
import { prisma } from "@/lib/db";
import type { IExtractionRepository, CreateDocumentData } from "@/extraction/application/contracts/repositories.port";
import type { ExtractedDocument, InputSourceType } from "@/types/supplier";

function mapDocument(d: {
  id: number;
  supplierId: number | null;
  inputType: string;
  fileName: string | null;
  mimeType: string | null;
  storagePath: string | null;
  rawText: string;
  contentHash: string;
  status: string;
  errorMessage: string | null;
  geminiResponse: unknown;
  createdAt: Date;
  supplier?: { id: number; name: string } | null;
}): ExtractedDocument {
  return {
    ...d,
    inputType: d.inputType as InputSourceType,
    status: d.status as ExtractedDocument["status"],
    geminiResponse: d.geminiResponse ?? null,
    supplier: d.supplier ?? null,
  };
}

/** Prisma-backed document repository; maps DB rows to domain types. */
export class PrismaExtractionRepository implements IExtractionRepository {
  async findByContentHash(hash: string): Promise<ExtractedDocument | null> {
    const doc = await prisma.extractedDocument.findUnique({ where: { contentHash: hash } });
    return doc ? mapDocument(doc) : null;
  }

  async findById(id: number): Promise<ExtractedDocument | null> {
    const doc = await prisma.extractedDocument.findUnique({ where: { id } });
    return doc ? mapDocument(doc) : null;
  }

  async create(data: CreateDocumentData): Promise<ExtractedDocument> {
    const doc = await prisma.extractedDocument.create({
      data: {
        supplierId: data.supplierId,
        inputType: data.inputType,
        fileName: data.fileName ?? null,
        mimeType: data.mimeType ?? null,
        storagePath: data.storagePath ?? null,
        rawText: data.rawText,
        contentHash: data.contentHash,
        status: data.status,
        errorMessage: data.errorMessage ?? null,
        geminiResponse: data.geminiResponse as Prisma.InputJsonValue | undefined,
      },
    });
    return mapDocument(doc);
  }

  async updateStatus(
    id: number,
    data: { status: "processed" | "error"; errorMessage?: string | null; geminiResponse?: unknown },
  ): Promise<ExtractedDocument> {
    const doc = await prisma.extractedDocument.update({
      where: { id },
      data: {
        status: data.status,
        errorMessage: data.errorMessage ?? null,
        geminiResponse: data.geminiResponse as Prisma.InputJsonValue | undefined,
      },
    });
    return mapDocument(doc);
  }

  async delete(id: number): Promise<void> {
    await prisma.extractedDocument.delete({ where: { id } });
  }

  async list(params?: { status?: string; page?: number; pageSize?: number }): Promise<{
    documents: ExtractedDocument[];
    total: number;
  }> {
    const where = params?.status ? { status: params.status } : {};
    const page = Math.max(1, params?.page ?? 1);
    const take = params?.pageSize ? Math.max(1, params.pageSize) : 50;
    const [rows, total] = await Promise.all([
      prisma.extractedDocument.findMany({
        where,
        include: { supplier: { select: { id: true, name: true } } },
        orderBy: { createdAt: "desc" },
        skip: (page - 1) * take,
        take,
      }),
      prisma.extractedDocument.count({ where }),
    ]);
    return { documents: rows.map(mapDocument), total };
  }

  async listBySupplier(supplierId: number): Promise<ExtractedDocument[]> {
    const rows = await prisma.extractedDocument.findMany({
      where: { supplierId },
      orderBy: { createdAt: "desc" },
    });
    return rows.map(mapDocument);
  }
}
