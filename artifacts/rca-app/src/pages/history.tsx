import { useState } from "react";
import { useLanguage } from "@/hooks/use-language";
import {
  useGetHistory, getGetHistoryQueryKey,
  useGetAnalysisById, getGetAnalysisByIdQueryKey,
  useDeleteAnalysis,
} from "@workspace/api-client-react";
import { useQueryClient } from "@tanstack/react-query";
import { useToast } from "@/hooks/use-toast";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Skeleton } from "@/components/ui/skeleton";
import {
  Select, SelectContent, SelectItem, SelectTrigger, SelectValue
} from "@/components/ui/select";
import {
  Dialog, DialogContent, DialogHeader, DialogTitle
} from "@/components/ui/dialog";
import { History, Download, Trash2, Eye, ChevronRight, ExternalLink } from "lucide-react";

const ERROR_TYPES = ["All", "NullPointerException", "TypeError", "ReferenceError", "AttributeError", "ImportError", "KeyError", "MemoryError", "TimeoutError", "DatabaseConnectionError", "MySQLError", "HTTPNotFound", "InternalServerError", "CORSError", "SyntaxError", "SystemError", "UnhandledPromiseRejection", "UnknownError"];

const PRIORITY_COLORS: Record<string, string> = {
  Critical: "bg-red-500/15 text-red-400 border-red-500/30",
  High: "bg-orange-500/15 text-orange-400 border-orange-500/30",
  Medium: "bg-yellow-500/15 text-yellow-400 border-yellow-500/30",
  Low: "bg-green-500/15 text-green-400 border-green-500/30",
};

function ConfidenceBadge({ score }: { score: number }) {
  const color = score >= 80 ? "text-green-400" : score >= 50 ? "text-yellow-400" : "text-red-400";
  return <span className={`font-mono font-bold text-sm ${color}`}>{score}%</span>;
}

function DetailModal({ id, open, onClose }: { id: number | null; open: boolean; onClose: () => void }) {
  const record = useGetAnalysisById(id ?? 0, {
    query: { enabled: !!id && open, queryKey: getGetAnalysisByIdQueryKey(id ?? 0) },
  });

  const data = record as any;

  return (
    <Dialog open={open} onOpenChange={onClose}>
      <DialogContent className="max-w-2xl max-h-[80vh] overflow-y-auto bg-card border-border">
        <DialogHeader>
          <DialogTitle className="font-mono text-primary">
            {data?.errorType ?? "Analysis Detail"}
          </DialogTitle>
        </DialogHeader>
        {record === undefined || (record as any).isLoading ? (
          <div className="space-y-3">
            <Skeleton className="h-6 w-full" />
            <Skeleton className="h-24 w-full" />
            <Skeleton className="h-48 w-full" />
          </div>
        ) : data ? (
          <div className="space-y-4">
            <div className="flex items-center gap-2 flex-wrap">
              <Badge variant="outline">{data.language}</Badge>
              <Badge className={`${PRIORITY_COLORS[data.priority]} border`}>{data.priority}</Badge>
              <ConfidenceBadge score={data.confidenceScore} />
              <span className="text-xs text-muted-foreground ml-auto">{new Date(data.analyzedAt).toLocaleString()}</span>
            </div>

            <div className="rounded-md bg-primary/5 border border-primary/20 p-3">
              <p className="text-xs font-mono text-primary mb-1">Root Cause</p>
              <p className="text-sm">{data.rootCause}</p>
            </div>

            <div>
              <p className="text-xs font-mono text-muted-foreground mb-2">Explanation</p>
              <ol className="space-y-1.5">
                {data.explanation?.map((step: string, i: number) => (
                  <li key={i} className="flex gap-2 items-start text-sm">
                    <span className="text-primary font-mono text-xs bg-primary/10 px-1.5 py-0.5 rounded mt-0.5 flex-shrink-0">{i + 1}</span>
                    {step}
                  </li>
                ))}
              </ol>
            </div>

            {data.fixes?.length > 0 && (
              <div>
                <p className="text-xs font-mono text-muted-foreground mb-2">Suggested Fixes</p>
                <div className="space-y-2">
                  {data.fixes.map((fix: any, i: number) => (
                    <div key={i} className="rounded border border-border p-3 space-y-1">
                      <p className="text-sm font-medium">{fix.title}</p>
                      <p className="text-xs text-muted-foreground">{fix.description}</p>
                      {fix.codeSnippet && (
                        <pre className="text-xs font-mono bg-[#0d1117] p-2 rounded overflow-x-auto mt-2">{fix.codeSnippet}</pre>
                      )}
                    </div>
                  ))}
                </div>
              </div>
            )}

            {data.stackOverflowLinks?.length > 0 && (
              <div>
                <p className="text-xs font-mono text-muted-foreground mb-2">References</p>
                {data.stackOverflowLinks.map((link: any, i: number) => (
                  <a key={i} href={link.url} target="_blank" rel="noopener noreferrer"
                    className="flex items-center gap-1.5 text-sm text-primary hover:underline mb-1">
                    <ExternalLink className="w-3 h-3" /> {link.title}
                  </a>
                ))}
              </div>
            )}

            <div className="border-t border-border pt-3">
              <p className="text-xs font-mono text-muted-foreground">Input snippet:</p>
              <pre className="text-xs text-muted-foreground bg-secondary/50 p-2 rounded mt-1 overflow-x-auto">{data.inputSnippet}</pre>
            </div>
          </div>
        ) : null}
      </DialogContent>
    </Dialog>
  );
}

export default function HistoryPage() {
  const { t } = useLanguage();
  const { toast } = useToast();
  const queryClient = useQueryClient();
  const [errorTypeFilter, setErrorTypeFilter] = useState("All");
  const [selectedId, setSelectedId] = useState<number | null>(null);
  const [modalOpen, setModalOpen] = useState(false);

  const params = errorTypeFilter !== "All" ? { errorType: errorTypeFilter, limit: 10 } : { limit: 10 };
  const history = useGetHistory(params, {
    query: { queryKey: getGetHistoryQueryKey(params) },
  }) as any;

  const deleteMutation = useDeleteAnalysis({
    mutation: {
      onSuccess: () => {
        queryClient.invalidateQueries({ queryKey: getGetHistoryQueryKey() });
        toast({ description: "Record deleted" });
      },
      onError: () => toast({ variant: "destructive", description: "Failed to delete" }),
    },
  });

  const handleExport = () => window.print();

  const openDetail = (id: number) => {
    setSelectedId(id);
    setModalOpen(true);
  };

  const records = history?.records ?? [];
  const total = history?.total ?? 0;

  return (
    <div className="space-y-6">
      <DetailModal id={selectedId} open={modalOpen} onClose={() => setModalOpen(false)} />

      <div className="flex items-center justify-between flex-wrap gap-3 no-print">
        <div className="flex items-center gap-2">
          <History className="w-5 h-5 text-primary" />
          <h1 className="text-xl font-bold font-mono">{t("history.title")}</h1>
          {total > 0 && (
            <Badge variant="outline" className="font-mono text-xs">{total} records</Badge>
          )}
        </div>
        <div className="flex items-center gap-2">
          <Select value={errorTypeFilter} onValueChange={setErrorTypeFilter}>
            <SelectTrigger data-testid="select-error-type-filter" className="w-48 h-9 text-sm">
              <SelectValue placeholder="Filter by type" />
            </SelectTrigger>
            <SelectContent>
              {ERROR_TYPES.map((type) => (
                <SelectItem key={type} value={type}>
                  {type === "All" ? t("history.filter.all") : type}
                </SelectItem>
              ))}
            </SelectContent>
          </Select>
          <Button
            data-testid="button-export-pdf"
            variant="outline"
            size="sm"
            onClick={handleExport}
            className="gap-1.5 h-9 text-sm"
          >
            <Download className="w-3.5 h-3.5" />
            {t("history.export")}
          </Button>
        </div>
      </div>

      {/* Loading */}
      {history === undefined && (
        <Card>
          <CardContent className="p-4 space-y-3">
            {[...Array(5)].map((_, i) => (
              <Skeleton key={i} className="h-14 w-full" />
            ))}
          </CardContent>
        </Card>
      )}

      {/* Empty state */}
      {history !== undefined && records.length === 0 && (
        <Card>
          <CardContent className="py-20 flex flex-col items-center gap-3 text-center">
            <History className="w-10 h-10 text-muted-foreground/30" />
            <p className="text-muted-foreground font-mono text-sm">No analyses yet</p>
            <p className="text-muted-foreground/50 text-xs">Run your first analysis to see history here</p>
          </CardContent>
        </Card>
      )}

      {/* Table */}
      {records.length > 0 && (
        <Card className="print-card">
          <CardContent className="p-0">
            <div className="overflow-x-auto">
              <table className="w-full text-sm">
                <thead className="border-b border-border bg-secondary/30">
                  <tr>
                    <th className="text-left px-4 py-3 text-xs font-mono text-muted-foreground font-medium">{t("history.table.error_type")}</th>
                    <th className="text-left px-4 py-3 text-xs font-mono text-muted-foreground font-medium">{t("history.table.language")}</th>
                    <th className="text-left px-4 py-3 text-xs font-mono text-muted-foreground font-medium">{t("history.table.confidence")}</th>
                    <th className="text-left px-4 py-3 text-xs font-mono text-muted-foreground font-medium">{t("history.table.priority")}</th>
                    <th className="text-left px-4 py-3 text-xs font-mono text-muted-foreground font-medium">{t("history.table.date")}</th>
                    <th className="text-left px-4 py-3 text-xs font-mono text-muted-foreground font-medium no-print">Actions</th>
                  </tr>
                </thead>
                <tbody>
                  {records.map((record: any, i: number) => (
                    <tr
                      key={record.id}
                      data-testid={`row-analysis-${record.id}`}
                      className="border-b border-border/50 hover:bg-secondary/20 transition-colors cursor-pointer"
                      onClick={() => openDetail(record.id)}
                    >
                      <td className="px-4 py-3">
                        <div className="flex items-center gap-2">
                          <ChevronRight className="w-3 h-3 text-primary flex-shrink-0" />
                          <span className="font-mono text-xs font-medium text-foreground">{record.errorType}</span>
                        </div>
                        <p className="text-xs text-muted-foreground mt-0.5 truncate max-w-[200px]">{record.inputSnippet}</p>
                      </td>
                      <td className="px-4 py-3">
                        <Badge variant="outline" className="text-xs">{record.language}</Badge>
                      </td>
                      <td className="px-4 py-3">
                        <ConfidenceBadge score={record.confidenceScore} />
                      </td>
                      <td className="px-4 py-3">
                        <span className={`inline-flex items-center px-2 py-0.5 rounded text-xs font-medium border ${PRIORITY_COLORS[record.priority]}`}>
                          {record.priority}
                        </span>
                      </td>
                      <td className="px-4 py-3 text-xs text-muted-foreground">
                        {new Date(record.analyzedAt).toLocaleDateString()}
                        <br />
                        <span className="text-muted-foreground/50">{new Date(record.analyzedAt).toLocaleTimeString()}</span>
                      </td>
                      <td className="px-4 py-3 no-print">
                        <div className="flex items-center gap-1" onClick={(e) => e.stopPropagation()}>
                          <Button
                            data-testid={`button-view-${record.id}`}
                            variant="ghost"
                            size="icon"
                            className="h-7 w-7 hover:text-primary"
                            onClick={() => openDetail(record.id)}
                          >
                            <Eye className="w-3.5 h-3.5" />
                          </Button>
                          <Button
                            data-testid={`button-delete-${record.id}`}
                            variant="ghost"
                            size="icon"
                            className="h-7 w-7 hover:text-destructive"
                            disabled={deleteMutation.isPending}
                            onClick={() => deleteMutation.mutate({ id: record.id })}
                          >
                            <Trash2 className="w-3.5 h-3.5" />
                          </Button>
                        </div>
                      </td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          </CardContent>
        </Card>
      )}
    </div>
  );
}
