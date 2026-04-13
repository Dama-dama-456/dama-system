import { useRef, useState } from "react";
import { Button } from "@/components/ui/button";
import { Dialog, DialogContent, DialogHeader, DialogTitle } from "@/components/ui/dialog";
import { Upload, Download, CheckCircle2, XCircle, FileSpreadsheet, AlertCircle, FileDown } from "lucide-react";
import { useToast } from "@/hooks/use-toast";

interface FailedRow {
  row: number;
  reason: string;
}

interface ImportResult {
  total: number;
  added: number;
  skipped: number;
  failed: FailedRow[];
}

interface ImportExcelProps {
  entity: string;
  entityLabel: string;
  onSuccess?: () => void;
  canImport?: boolean;
}

const BASE = import.meta.env.BASE_URL?.replace(/\/$/, "") || "";

function getToken(): string | null {
  return localStorage.getItem("dama_token");
}

export function ImportExcel({ entity, entityLabel, onSuccess, canImport = true }: ImportExcelProps) {
  const fileRef = useRef<HTMLInputElement>(null);
  const [uploading, setUploading] = useState(false);
  const [result, setResult] = useState<ImportResult | null>(null);
  const [showResult, setShowResult] = useState(false);
  const { toast } = useToast();

  const downloadViaFetch = (url: string, filename: string) => {
    const token = getToken();
    fetch(url, { headers: { Authorization: `Bearer ${token}` } })
      .then((r) => {
        if (!r.ok) throw new Error("فشل التحميل");
        return r.blob();
      })
      .then((blob) => {
        const a = document.createElement("a");
        a.href = URL.createObjectURL(blob);
        a.download = filename;
        a.click();
        URL.revokeObjectURL(a.href);
      })
      .catch(() => toast({ title: "فشل التحميل", variant: "destructive" }));
  };

  const downloadTemplate = () => {
    downloadViaFetch(`${BASE}/api/import/${entity}/template`, `${entity}-template.xlsx`);
  };

  const exportData = () => {
    const date = new Date().toISOString().substring(0, 10);
    downloadViaFetch(`${BASE}/api/export/${entity}`, `${entity}-export-${date}.xlsx`);
  };

  const handleFile = async (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (!file) return;
    if (!file.name.match(/\.(xlsx|xls)$/i)) {
      toast({ title: "صيغة غير مدعومة", description: "يُقبل فقط ملفات .xlsx أو .xls", variant: "destructive" });
      return;
    }
    if (file.size > 10 * 1024 * 1024) {
      toast({ title: "الملف كبير جداً", description: "الحجم الأقصى المسموح هو 10 ميغابايت", variant: "destructive" });
      return;
    }

    const formData = new FormData();
    formData.append("file", file);
    setUploading(true);

    try {
      const res = await fetch(`${BASE}/api/import/${entity}`, {
        method: "POST",
        headers: { Authorization: `Bearer ${getToken()}` },
        body: formData,
      });
      const data = await res.json();
      if (!res.ok) {
        toast({ title: "فشل الاستيراد", description: data.message || "خطأ غير معروف", variant: "destructive" });
        return;
      }
      setResult(data);
      setShowResult(true);
      if (data.added > 0) onSuccess?.();
    } catch {
      toast({ title: "خطأ في الشبكة", description: "تعذّر الوصول للخادم", variant: "destructive" });
    } finally {
      setUploading(false);
      if (fileRef.current) fileRef.current.value = "";
    }
  };

  return (
    <>
      <input ref={fileRef} type="file" accept=".xlsx,.xls" className="hidden" onChange={handleFile} />

      <div className="flex items-center gap-2">
        <Button
          variant="outline"
          size="sm"
          onClick={exportData}
          className="gap-1.5 text-green-700 border-green-200 hover:bg-green-50"
        >
          <FileDown className="h-4 w-4" />
          تصدير Excel
        </Button>
        {canImport && (
          <Button
            variant="outline"
            size="sm"
            onClick={downloadTemplate}
            className="gap-1.5 text-muted-foreground"
          >
            <Download className="h-4 w-4" />
            نموذج
          </Button>
        )}
        {canImport && (
          <Button
            variant="outline"
            size="sm"
            disabled={uploading}
            onClick={() => fileRef.current?.click()}
            className="gap-1.5"
          >
            <Upload className="h-4 w-4" />
            {uploading ? "جاري الرفع..." : "رفع Excel"}
          </Button>
        )}
      </div>

      <Dialog open={showResult} onOpenChange={setShowResult}>
        <DialogContent className="sm:max-w-[560px]" dir="rtl">
          <DialogHeader>
            <DialogTitle className="flex items-center gap-2">
              <FileSpreadsheet className="h-5 w-5" />
              نتيجة استيراد {entityLabel}
            </DialogTitle>
          </DialogHeader>

          {result && (
            <div className="space-y-4 pt-2">
              {/* Summary cards */}
              <div className="grid grid-cols-3 gap-3">
                <div className="rounded-lg border bg-card p-3 text-center">
                  <div className="text-2xl font-bold">{result.total}</div>
                  <div className="text-xs text-muted-foreground mt-1">إجمالي الصفوف</div>
                </div>
                <div className="rounded-lg border border-green-200 bg-green-50 p-3 text-center">
                  <div className="text-2xl font-bold text-green-700">{result.added}</div>
                  <div className="text-xs text-green-600 mt-1">تمت إضافته</div>
                </div>
                <div className="rounded-lg border border-red-200 bg-red-50 p-3 text-center">
                  <div className="text-2xl font-bold text-red-700">{result.skipped}</div>
                  <div className="text-xs text-red-600 mt-1">تم تخطيه</div>
                </div>
              </div>

              {/* Success message */}
              {result.added > 0 && result.skipped === 0 && (
                <div className="flex items-center gap-2 rounded-lg bg-green-50 border border-green-200 p-3 text-green-800">
                  <CheckCircle2 className="h-5 w-5 shrink-0" />
                  <span className="text-sm">تمت إضافة جميع السجلات بنجاح!</span>
                </div>
              )}
              {result.added > 0 && result.skipped > 0 && (
                <div className="flex items-center gap-2 rounded-lg bg-yellow-50 border border-yellow-200 p-3 text-yellow-800">
                  <AlertCircle className="h-5 w-5 shrink-0" />
                  <span className="text-sm">تمت إضافة {result.added} سجل، وتم تخطي {result.skipped} سجل.</span>
                </div>
              )}
              {result.added === 0 && (
                <div className="flex items-center gap-2 rounded-lg bg-red-50 border border-red-200 p-3 text-red-800">
                  <XCircle className="h-5 w-5 shrink-0" />
                  <span className="text-sm">لم يُضَف أي سجل. راجع الأخطاء أدناه.</span>
                </div>
              )}

              {/* Failed rows */}
              {result.failed.length > 0 && (
                <div className="space-y-2">
                  <p className="text-sm font-medium text-muted-foreground">تفاصيل الأخطاء:</p>
                  <div className="max-h-52 overflow-y-auto rounded-lg border divide-y text-sm">
                    {result.failed.map((f, idx) => (
                      <div key={idx} className="flex items-start gap-3 px-3 py-2 bg-background">
                        <span className="shrink-0 rounded bg-red-100 text-red-700 px-1.5 py-0.5 text-xs font-mono">
                          صف {f.row}
                        </span>
                        <span className="text-foreground">{f.reason}</span>
                      </div>
                    ))}
                  </div>
                </div>
              )}

              <div className="flex justify-end">
                <Button onClick={() => setShowResult(false)}>إغلاق</Button>
              </div>
            </div>
          )}
        </DialogContent>
      </Dialog>
    </>
  );
}
