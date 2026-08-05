"use client";

import { useState, useEffect, useCallback } from "react";
import { TopBar } from "@/components/layout/TopBar";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Select } from "@/components/ui/select";
import { Card, CardContent } from "@/components/ui/card";
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from "@/components/ui/table";
import { Badge } from "@/components/ui/badge";
import { Dialog, DialogContent, DialogHeader, DialogTitle } from "@/components/ui/dialog";
import { Plus, RefreshCw, Download, Eye, Loader2 } from "lucide-react";
import { useTranslations } from "@/i18n";
import { useMe } from "@/hooks/useMe";
import type { Supplier, ExtractedDocument, SupplierPriceList } from "@/types/supplier";

type SourceType = "whatsapp" | "file" | "google_sheets";

interface ExtractionResult {
  extraction: { supplier: string; effective_date: string; products: unknown[] };
  documentId: number;
  supplierId: number;
  priceListId: number;
}

interface ExtractionDetail {
  document: ExtractedDocument;
  priceList: SupplierPriceList | null;
}

const SOURCE_LABEL: Record<string, string> = {
  whatsapp: "sourceWhatsapp",
  pdf: "sourcePdf",
  xlsx: "sourceXlsx",
  google_sheets: "sourceGoogleSheets",
};

function sourceLabel(t: ReturnType<typeof useTranslations>, value: string): string {
  const key = SOURCE_LABEL[value] ?? "sourceWhatsapp";
  return t.extractions[key as keyof typeof t.extractions];
}

function availabilityLabel(t: ReturnType<typeof useTranslations>, value: string): string {
  if (value === "available") return t.extractions.available;
  if (value === "out_of_stock") return t.extractions.outOfStock;
  return t.extractions.unknown;
}

export default function ExtractionsPage() {
  const t = useTranslations();
  const { me } = useMe();
  const canCreate = me?.policies.includes("extractions.create") ?? false;
  const canRetry = me?.policies.includes("extractions.retry") ?? false;

  const [documents, setDocuments] = useState<ExtractedDocument[]>([]);
  const [total, setTotal] = useState(0);
  const [statusFilter, setStatusFilter] = useState("");
  const [page, setPage] = useState(1);
  const [showForm, setShowForm] = useState(false);
  const [detail, setDetail] = useState<ExtractionDetail | null>(null);
  const [detailId, setDetailId] = useState<number | null>(null);
  const [loadingDetail, setLoadingDetail] = useState(false);

  const [source, setSource] = useState<SourceType>("whatsapp");
  const [text, setText] = useState("");
  const [file, setFile] = useState<File | null>(null);
  const [sheetUrl, setSheetUrl] = useState("");
  const [suppliers, setSuppliers] = useState<Supplier[]>([]);
  const [supplierId, setSupplierId] = useState("");
  const [submitting, setSubmitting] = useState(false);
  const [formError, setFormError] = useState("");
  const [lastResult, setLastResult] = useState<ExtractionResult | null>(null);

  const load = useCallback(async () => {
    const params = new URLSearchParams();
    if (statusFilter) params.set("status", statusFilter);
    params.set("page", String(page));
    params.set("pageSize", "20");
    const res = await fetch(`/api/extractions?${params.toString()}`);
    const data = await res.json();
    setDocuments(Array.isArray(data.documents) ? data.documents : []);
    setTotal(data.total ?? 0);
  }, [statusFilter, page]);

  useEffect(() => {
    load();
  }, [load]);

  useEffect(() => {
    setPage(1);
  }, [statusFilter]);

  useEffect(() => {
    fetch("/api/suppliers")
      .then((r) => r.json())
      .then((data: Supplier[]) => setSuppliers(Array.isArray(data) ? data : []))
      .catch(() => setSuppliers([]));
  }, []);

  async function openDetail(id: number) {
    setDetailId(id);
    setDetail(null);
    setLoadingDetail(true);
    try {
      const res = await fetch(`/api/extractions/${id}`);
      const data = await res.json();
      setDetail(data);
    } catch {
      setDetail(null);
    } finally {
      setLoadingDetail(false);
    }
  }

  async function handleSubmit() {
    setFormError("");
    if (source === "whatsapp" && !text.trim()) {
      setFormError(t.api.extractionInputRequired);
      return;
    }
    if (source === "file" && !file) {
      setFormError(t.api.extractionInputRequired);
      return;
    }
    if (source === "google_sheets" && !sheetUrl.trim()) {
      setFormError(t.api.extractionInputRequired);
      return;
    }

    const fd = new FormData();
    if (supplierId) fd.set("supplierId", supplierId);
    if (source === "whatsapp") fd.set("text", text.trim());
    if (source === "file" && file) fd.set("file", file);
    if (source === "google_sheets") fd.set("sheetUrl", sheetUrl.trim());

    setSubmitting(true);
    try {
      const res = await fetch("/api/extractions", { method: "POST", body: fd });
      const data = await res.json();
      if (!res.ok) {
        setFormError(data.error || t.api.failedCreateExtraction);
        return;
      }
      setLastResult(data);
      setShowForm(false);
      setText("");
      setFile(null);
      setSheetUrl("");
      setSupplierId("");
      load();
    } catch {
      setFormError(t.login.connectionError);
    } finally {
      setSubmitting(false);
    }
  }

  async function handleRetry(id: number) {
    if (!confirm(t.extractions.retryConfirm)) return;
    await fetch(`/api/extractions/${id}/retry`, { method: "POST" });
    setDetail(null);
    setDetailId(null);
    load();
  }

  const totalPages = Math.max(1, Math.ceil(total / 20));

  return (
    <>
      <TopBar />
      <div className="flex-1 overflow-auto p-4">
        <div className="flex items-center justify-between mb-4">
          <h1 className="text-2xl font-bold">{t.extractions.title}</h1>
          {canCreate && (
            <Button onClick={() => setShowForm(true)} aria-label={t.extractions.newExtraction}>
              <Plus className="h-4 w-4 mr-1" />
              {t.extractions.newExtraction}
            </Button>
          )}
        </div>

        <div className="flex gap-2 mb-4">
          <Select
            value={statusFilter}
            onChange={(e) => setStatusFilter(e.target.value)}
            className="w-48"
            aria-label={t.extractions.status}
          >
            <option value="">{t.common.all}</option>
            <option value="processed">{t.extractions.processed}</option>
            <option value="error">{t.extractions.failed}</option>
          </Select>
        </div>

        {lastResult && (
          <div className="mb-4 p-3 rounded-md bg-green-500/10 border border-green-500/30 text-sm">
            {t.extractions.processed}: <strong>{lastResult.extraction.supplier}</strong> —{" "}
            {lastResult.extraction.products.length} {t.extractions.itemCount}
          </div>
        )}

        <Card>
          <CardContent className="p-0">
            <Table>
              <TableHeader>
                <TableRow>
                  <TableHead>{t.common.date}</TableHead>
                  <TableHead>{t.extractions.supplier}</TableHead>
                  <TableHead>{t.extractions.source}</TableHead>
                  <TableHead>{t.extractions.status}</TableHead>
                  <TableHead className="w-40"></TableHead>
                </TableRow>
              </TableHeader>
              <TableBody>
                {documents.length === 0 ? (
                  <TableRow>
                    <TableCell colSpan={5} className="text-center text-muted-foreground py-8">
                      {t.extractions.empty}
                    </TableCell>
                  </TableRow>
                ) : (
                  documents.map((d) => (
                    <TableRow key={d.id}>
                      <TableCell>{new Date(d.createdAt).toLocaleString()}</TableCell>
                      <TableCell className="font-medium">{d.supplier?.name ?? "-"}</TableCell>
                      <TableCell>{sourceLabel(t, d.inputType)}</TableCell>
                      <TableCell>
                        <Badge variant={d.status === "processed" ? "default" : "destructive"}>
                          {d.status === "processed" ? t.extractions.processed : t.extractions.failed}
                        </Badge>
                      </TableCell>
                      <TableCell>
                        <div className="flex gap-1">
                          <Button
                            variant="ghost"
                            size="icon"
                            className="h-8 w-8"
                            onClick={() => openDetail(d.id)}
                            title={t.extractions.viewDetails}
                            aria-label={t.extractions.viewDetails}
                          >
                            <Eye className="h-3 w-3" />
                          </Button>
                          {canRetry && d.status === "error" && (
                            <Button
                              variant="ghost"
                              size="icon"
                              className="h-8 w-8"
                              onClick={() => handleRetry(d.id)}
                              title={t.extractions.retry}
                              aria-label={t.extractions.retry}
                            >
                              <RefreshCw className="h-3 w-3" />
                            </Button>
                          )}
                        </div>
                      </TableCell>
                    </TableRow>
                  ))
                )}
              </TableBody>
            </Table>
          </CardContent>
        </Card>

        {totalPages > 1 && (
          <div className="flex items-center justify-end gap-2 mt-4">
            <Button
              variant="outline"
              size="sm"
              disabled={page <= 1}
              onClick={() => setPage((p) => Math.max(1, p - 1))}
            >
              {t.common.previous}
            </Button>
            <span className="text-sm text-muted-foreground">
              {t.common.page} {page} {t.common.of} {totalPages}
            </span>
            <Button
              variant="outline"
              size="sm"
              disabled={page >= totalPages}
              onClick={() => setPage((p) => Math.min(totalPages, p + 1))}
            >
              {t.common.next}
            </Button>
          </div>
        )}
      </div>

      <Dialog open={showForm} onOpenChange={setShowForm}>
        <DialogContent className="max-w-lg">
          <DialogHeader>
            <DialogTitle>{t.extractions.newExtraction}</DialogTitle>
          </DialogHeader>
          <div className="space-y-3">
            {formError && <div className="text-sm text-red-500 bg-red-500/10 p-2 rounded">{formError}</div>}

            <div>
              <label className="text-sm text-muted-foreground">{t.extractions.source}</label>
              <Select value={source} onChange={(e) => setSource(e.target.value as SourceType)} className="w-full">
                <option value="whatsapp">{t.extractions.whatsapp}</option>
                <option value="file">{t.extractions.file}</option>
                <option value="google_sheets">{t.extractions.sheets}</option>
              </Select>
            </div>

            {source === "whatsapp" && (
              <div>
                <label className="text-sm text-muted-foreground">{t.extractions.whatsapp}</label>
                <textarea
                  className="w-full min-h-[120px] bg-background border border-border rounded-md p-3 text-sm focus:outline-none focus:ring-2 focus:ring-primary"
                  placeholder={t.extractions.textPlaceholder}
                  value={text}
                  onChange={(e) => setText(e.target.value)}
                />
              </div>
            )}

            {source === "file" && (
              <div>
                <label className="text-sm text-muted-foreground">{t.extractions.file}</label>
                <Input type="file" accept=".pdf,.xlsx,.xls,application/pdf,application/vnd.openxmlformats-officedocument.spreadsheetml.sheet,application/vnd.ms-excel" onChange={(e) => setFile(e.target.files?.[0] ?? null)} />
              </div>
            )}

            {source === "google_sheets" && (
              <div>
                <label className="text-sm text-muted-foreground">{t.extractions.sheets}</label>
                <Input placeholder={t.extractions.sheetUrlPlaceholder} value={sheetUrl} onChange={(e) => setSheetUrl(e.target.value)} />
              </div>
            )}

            <div>
              <label className="text-sm text-muted-foreground">{t.extractions.supplier}</label>
              <Select value={supplierId} onChange={(e) => setSupplierId(e.target.value)} className="w-full">
                <option value="">{t.extractions.inferSupplier}</option>
                {suppliers.map((s) => (
                  <option key={s.id} value={String(s.id)}>
                    {s.name}
                  </option>
                ))}
              </Select>
            </div>

            <div className="flex gap-2 pt-2">
              <Button variant="outline" className="flex-1" onClick={() => setShowForm(false)} aria-label={t.common.cancel}>
                {t.common.cancel}
              </Button>
              <Button className="flex-1" onClick={handleSubmit} disabled={submitting} aria-label={t.extractions.run}>
                {submitting ? (
                  <>
                    <Loader2 className="h-4 w-4 mr-1 animate-spin" />
                    {t.extractions.processing}
                  </>
                ) : (
                  t.extractions.run
                )}
              </Button>
            </div>
          </div>
        </DialogContent>
      </Dialog>

      <Dialog open={detailId !== null} onOpenChange={(open) => !open && setDetailId(null)}>
        <DialogContent className="max-w-3xl">
          <DialogHeader>
            <DialogTitle>{t.extractions.viewDetails}</DialogTitle>
          </DialogHeader>
          {loadingDetail ? (
            <div className="text-sm text-muted-foreground py-6 text-center">{t.common.loading}</div>
          ) : detail ? (
            <div className="space-y-4">
              <div className="flex items-center gap-3 flex-wrap">
                <Badge variant={detail.document.status === "processed" ? "default" : "destructive"}>
                  {detail.document.status === "processed" ? t.extractions.processed : t.extractions.failed}
                </Badge>
                <span className="text-sm text-muted-foreground">
                  {t.extractions.supplier}:{" "}
                  <span className="text-foreground font-medium">
                    {detail.priceList?.supplier?.name ?? detail.document.supplierId ?? t.extractions.inferSupplier}
                  </span>
                </span>
                <span className="text-sm text-muted-foreground">
                  {new Date(detail.document.createdAt).toLocaleString()}
                </span>
              </div>

              {detail.document.errorMessage && (
                <div className="text-sm text-red-500 bg-red-500/10 p-2 rounded break-words">
                  {detail.document.errorMessage}
                </div>
              )}

              {detail.document.storagePath && (
                <Button variant="outline" size="sm" onClick={() => window.open(`/api/extractions/${detail.document.id}/document`)}>
                  <Download className="h-4 w-4 mr-1" />
                  {t.extractions.downloadOriginal}
                </Button>
              )}

              {canRetry && detail.document.status === "error" && (
                <Button variant="outline" size="sm" onClick={() => handleRetry(detail.document.id)}>
                  <RefreshCw className="h-4 w-4 mr-1" />
                  {t.extractions.retry}
                </Button>
              )}

              {detail.priceList ? (
                <div className="max-h-[50vh] overflow-auto border border-border rounded-md">
                  <Table>
                    <TableHeader>
                      <TableRow>
                        <TableHead>{t.extractions.name}</TableHead>
                        <TableHead>{t.extractions.unit}</TableHead>
                        <TableHead className="text-right">{t.extractions.price}</TableHead>
                        <TableHead>{t.extractions.currency}</TableHead>
                        <TableHead>{t.extractions.availability}</TableHead>
                      </TableRow>
                    </TableHeader>
                    <TableBody>
                      {(detail.priceList.items ?? []).map((item) => (
                        <TableRow key={item.id}>
                          <TableCell>{item.product?.name || "-"}</TableCell>
                          <TableCell>{item.product?.unit || "-"}</TableCell>
                          <TableCell className="text-right font-mono">
                            {Number(item.price).toLocaleString()}
                          </TableCell>
                          <TableCell>{item.currency || "-"}</TableCell>
                          <TableCell>
                            {availabilityLabel(t, item.availability)}
                          </TableCell>
                        </TableRow>
                      ))}
                    </TableBody>
                  </Table>
                </div>
              ) : (
                <div className="text-sm text-muted-foreground">{t.extractions.empty}</div>
              )}
            </div>
          ) : (
            <div className="text-sm text-muted-foreground py-6 text-center">{t.extractions.empty}</div>
          )}
        </DialogContent>
      </Dialog>
    </>
  );
}
