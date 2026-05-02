import { useState, useRef, useCallback } from "react";
import { useLanguage } from "@/hooks/use-language";
import { useAnalyzeError, getGetHistoryQueryKey, getGetStatsQueryKey } from "@workspace/api-client-react";
import { useQueryClient } from "@tanstack/react-query";
import { useToast } from "@/hooks/use-toast";
import { Button } from "@/components/ui/button";
import { Textarea } from "@/components/ui/textarea";
import { Badge } from "@/components/ui/badge";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Skeleton } from "@/components/ui/skeleton";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import {
  Upload, Zap, CheckCircle, AlertTriangle, XCircle, Info,
  ExternalLink, Copy, ChevronRight, FileText, Terminal
} from "lucide-react";

interface Fix {
  title: string;
  description: string;
  codeSnippet?: string;
  language?: string;
}

interface SOLink {
  title: string;
  url: string;
}

interface AnalysisResult {
  id?: number;
  errorType: string;
  language: string;
  rootCause: string;
  confidenceScore: number;
  explanation: string[];
  priority: "Critical" | "High" | "Medium" | "Low";
  fixes: Fix[];
  stackOverflowLinks: SOLink[];
  analyzedAt: string;
}

const PRIORITY_CONFIG = {
  Critical: { color: "bg-red-500/15 text-red-400 border-red-500/30", icon: XCircle, iconColor: "text-red-400" },
  High: { color: "bg-orange-500/15 text-orange-400 border-orange-500/30", icon: AlertTriangle, iconColor: "text-orange-400" },
  Medium: { color: "bg-yellow-500/15 text-yellow-400 border-yellow-500/30", icon: Info, iconColor: "text-yellow-400" },
  Low: { color: "bg-green-500/15 text-green-400 border-green-500/30", icon: CheckCircle, iconColor: "text-green-400" },
};

function ConfidenceGauge({ score }: { score: number }) {
  const color = score >= 80 ? "#22c55e" : score >= 50 ? "#eab308" : "#ef4444";
  const circumference = 2 * Math.PI * 36;
  const offset = circumference - (score / 100) * circumference;

  return (
    <div className="flex flex-col items-center gap-1" data-testid="confidence-gauge">
      <div className="relative w-24 h-24">
        <svg viewBox="0 0 88 88" className="w-full h-full -rotate-90">
          <circle cx="44" cy="44" r="36" fill="none" stroke="currentColor" strokeWidth="7" className="text-secondary" />
          <circle
            cx="44" cy="44" r="36"
            fill="none"
            stroke={color}
            strokeWidth="7"
            strokeLinecap="round"
            strokeDasharray={circumference}
            strokeDashoffset={offset}
            style={{ transition: "stroke-dashoffset 0.6s ease" }}
          />
        </svg>
        <div className="absolute inset-0 flex items-center justify-center flex-col">
          <span className="text-xl font-bold font-mono" style={{ color }}>{score}%</span>
        </div>
      </div>
      <span className="text-xs text-muted-foreground">Confidence</span>
    </div>
  );
}

function CodeBlock({ code, language }: { code: string; language?: string }) {
  const { toast } = useToast();

  const copy = () => {
    navigator.clipboard.writeText(code);
    toast({ description: "Code copied to clipboard" });
  };

  return (
    <div className="relative group rounded-md overflow-hidden border border-border">
      {language && (
        <div className="flex items-center justify-between px-3 py-1.5 bg-secondary/50 border-b border-border">
          <span className="text-xs text-muted-foreground font-mono">{language}</span>
          <button
            data-testid="button-copy-code"
            onClick={copy}
            className="flex items-center gap-1 text-xs text-muted-foreground hover:text-foreground transition-colors"
          >
            <Copy className="w-3 h-3" />
            Copy
          </button>
        </div>
      )}
      <pre className="p-3 text-sm font-mono text-foreground bg-[#0d1117] overflow-x-auto leading-relaxed">
        <code>{code}</code>
      </pre>
    </div>
  );
}

function AnalysisResultPanel({ result }: { result: AnalysisResult }) {
  const { t } = useLanguage();
  const pConfig = PRIORITY_CONFIG[result.priority];
  const PIcon = pConfig.icon;

  return (
    <div className="space-y-4 animate-in fade-in slide-in-from-bottom-4 duration-500">
      {/* Header row */}
      <div className="flex items-start justify-between gap-4 flex-wrap">
        <div className="space-y-1">
          <div className="flex items-center gap-2 flex-wrap">
            <span className="text-lg font-bold text-foreground font-mono">{result.errorType}</span>
            <Badge variant="outline" className="text-xs text-muted-foreground border-border">{result.language}</Badge>
          </div>
          <p className="text-xs text-muted-foreground">
            Analyzed {new Date(result.analyzedAt).toLocaleString()}
          </p>
        </div>
        <div className="flex items-center gap-3">
          <ConfidenceGauge score={result.confidenceScore} />
          <div className={`flex items-center gap-1.5 px-3 py-1.5 rounded-md border text-sm font-medium ${pConfig.color}`}>
            <PIcon className={`w-4 h-4 ${pConfig.iconColor}`} />
            {result.priority}
          </div>
        </div>
      </div>

      {/* Root Cause */}
      <Card className="border-primary/20 bg-primary/5">
        <CardHeader className="pb-2 pt-4 px-4">
          <CardTitle className="text-sm text-primary font-mono flex items-center gap-2">
            <Zap className="w-4 h-4" />
            {t("analyzer.results.root_cause")}
          </CardTitle>
        </CardHeader>
        <CardContent className="px-4 pb-4">
          <p className="text-sm text-foreground leading-relaxed">{result.rootCause}</p>
        </CardContent>
      </Card>

      {/* Step-by-step explanation */}
      <Card>
        <CardHeader className="pb-2 pt-4 px-4">
          <CardTitle className="text-sm text-muted-foreground font-mono">{t("analyzer.results.explanation")}</CardTitle>
        </CardHeader>
        <CardContent className="px-4 pb-4 space-y-2">
          {result.explanation.map((step, i) => (
            <div key={i} className="flex gap-3 items-start">
              <div className="flex-shrink-0 w-5 h-5 rounded-full bg-primary/15 text-primary text-xs flex items-center justify-center font-mono font-bold mt-0.5">
                {i + 1}
              </div>
              <p className="text-sm text-foreground leading-relaxed">{step}</p>
            </div>
          ))}
        </CardContent>
      </Card>

      {/* Top 3 Fixes */}
      <div>
        <h3 className="text-sm font-mono text-muted-foreground mb-3 flex items-center gap-2">
          <ChevronRight className="w-4 h-4 text-primary" />
          {t("analyzer.results.fixes")}
        </h3>
        <div className="space-y-3">
          {result.fixes.slice(0, 3).map((fix, i) => (
            <Card key={i} className="border-border">
              <CardHeader className="pb-2 pt-3 px-4">
                <div className="flex items-center gap-2">
                  <span className="text-xs font-mono text-primary bg-primary/10 px-2 py-0.5 rounded">Fix {i + 1}</span>
                  <CardTitle className="text-sm font-semibold">{fix.title}</CardTitle>
                </div>
              </CardHeader>
              <CardContent className="px-4 pb-4 space-y-3">
                <p className="text-sm text-muted-foreground">{fix.description}</p>
                {fix.codeSnippet && <CodeBlock code={fix.codeSnippet} language={fix.language} />}
              </CardContent>
            </Card>
          ))}
        </div>
      </div>

      {/* Stack Overflow Links */}
      {result.stackOverflowLinks.length > 0 && (
        <Card>
          <CardHeader className="pb-2 pt-3 px-4">
            <CardTitle className="text-sm font-mono text-muted-foreground flex items-center gap-2">
              <ExternalLink className="w-4 h-4" />
              {t("analyzer.results.stackoverflow")}
            </CardTitle>
          </CardHeader>
          <CardContent className="px-4 pb-4 space-y-2">
            {result.stackOverflowLinks.map((link, i) => (
              <a
                key={i}
                href={link.url}
                target="_blank"
                rel="noopener noreferrer"
                data-testid={`link-stackoverflow-${i}`}
                className="flex items-center gap-2 text-sm text-primary hover:text-primary/80 transition-colors group"
              >
                <ExternalLink className="w-3.5 h-3.5 flex-shrink-0" />
                <span className="group-hover:underline">{link.title}</span>
              </a>
            ))}
          </CardContent>
        </Card>
      )}
    </div>
  );
}

function AnalysisResultSkeleton() {
  return (
    <div className="space-y-4">
      <div className="flex items-center justify-between">
        <div className="space-y-2">
          <Skeleton className="h-6 w-48" />
          <Skeleton className="h-3 w-32" />
        </div>
        <Skeleton className="h-24 w-24 rounded-full" />
      </div>
      <Skeleton className="h-24 w-full" />
      <Skeleton className="h-36 w-full" />
      <Skeleton className="h-48 w-full" />
    </div>
  );
}

export default function AnalyzerPage() {
  const { t } = useLanguage();
  const { toast } = useToast();
  const queryClient = useQueryClient();
  const [activeTab, setActiveTab] = useState("paste");
  const [pasteInput, setPasteInput] = useState("");
  const [messageInput, setMessageInput] = useState("");
  const [fileContent, setFileContent] = useState("");
  const [fileName, setFileName] = useState("");
  const [isDragging, setIsDragging] = useState(false);
  const [result, setResult] = useState<AnalysisResult | null>(null);
  const fileInputRef = useRef<HTMLInputElement>(null);

  const mutation = useAnalyzeError({
    mutation: {
      onSuccess: (data) => {
        setResult(data as AnalysisResult);
        queryClient.invalidateQueries({ queryKey: getGetHistoryQueryKey() });
        queryClient.invalidateQueries({ queryKey: getGetStatsQueryKey() });
      },
      onError: () => {
        toast({ variant: "destructive", description: "Analysis failed. Please try again." });
      },
    },
  });

  const handleFileRead = (file: File) => {
    if (!file.name.match(/\.(txt|log)$/i)) {
      toast({ variant: "destructive", description: "Only .txt and .log files are supported" });
      return;
    }
    const reader = new FileReader();
    reader.onload = (e) => {
      setFileContent(e.target?.result as string ?? "");
      setFileName(file.name);
    };
    reader.readAsText(file);
  };

  const handleDrop = useCallback((e: React.DragEvent) => {
    e.preventDefault();
    setIsDragging(false);
    const file = e.dataTransfer.files[0];
    if (file) handleFileRead(file);
  }, []);

  const handleAnalyze = () => {
    const inputMap: Record<string, string> = {
      paste: pasteInput,
      upload: fileContent,
      message: messageInput,
    };
    const input = inputMap[activeTab]?.trim();
    if (!input) {
      toast({ variant: "destructive", description: "Please provide an error to analyze" });
      return;
    }
    mutation.mutate({
      data: {
        input,
        inputType: activeTab as "paste" | "file" | "message",
        fileName: activeTab === "upload" ? fileName : undefined,
      },
    });
  };

  const hasInput =
    (activeTab === "paste" && pasteInput.trim()) ||
    (activeTab === "upload" && fileContent.trim()) ||
    (activeTab === "message" && messageInput.trim());

  return (
    <div className="grid grid-cols-1 xl:grid-cols-2 gap-6">
      {/* Input Panel */}
      <div className="space-y-4">
        <div className="flex items-center gap-2">
          <Terminal className="w-4 h-4 text-primary" />
          <h1 className="text-xl font-bold font-mono">{t("app.title")}</h1>
        </div>

        <Card>
          <CardContent className="p-4 space-y-4">
            <Tabs value={activeTab} onValueChange={setActiveTab}>
              <TabsList className="w-full grid grid-cols-3 h-auto p-1">
                <TabsTrigger value="paste" className="text-xs py-2 data-[state=active]:text-primary">{t("analyzer.tabs.paste")}</TabsTrigger>
                <TabsTrigger value="upload" className="text-xs py-2 data-[state=active]:text-primary">{t("analyzer.tabs.upload")}</TabsTrigger>
                <TabsTrigger value="message" className="text-xs py-2 data-[state=active]:text-primary">{t("analyzer.tabs.message")}</TabsTrigger>
              </TabsList>

              <TabsContent value="paste" className="mt-3">
                <Textarea
                  data-testid="input-paste-log"
                  value={pasteInput}
                  onChange={(e) => setPasteInput(e.target.value)}
                  placeholder={t("analyzer.input.placeholder")}
                  className="min-h-[280px] font-mono text-xs resize-none bg-[#0d1117] border-border text-foreground placeholder:text-muted-foreground/50 focus:border-primary/50"
                />
              </TabsContent>

              <TabsContent value="upload" className="mt-3">
                <div
                  data-testid="input-file-drop"
                  onDragOver={(e) => { e.preventDefault(); setIsDragging(true); }}
                  onDragLeave={() => setIsDragging(false)}
                  onDrop={handleDrop}
                  onClick={() => fileInputRef.current?.click()}
                  className={`min-h-[280px] rounded-md border-2 border-dashed flex flex-col items-center justify-center gap-3 cursor-pointer transition-colors ${
                    isDragging ? "border-primary bg-primary/5" : "border-border hover:border-primary/50 hover:bg-secondary/50"
                  }`}
                >
                  <input
                    ref={fileInputRef}
                    type="file"
                    accept=".txt,.log"
                    className="hidden"
                    onChange={(e) => { const f = e.target.files?.[0]; if (f) handleFileRead(f); }}
                  />
                  {fileContent ? (
                    <div className="text-center space-y-2">
                      <FileText className="w-8 h-8 text-primary mx-auto" />
                      <p className="text-sm font-medium text-foreground">{fileName}</p>
                      <p className="text-xs text-muted-foreground">{fileContent.length} characters loaded</p>
                      <p className="text-xs text-primary">Click to replace file</p>
                    </div>
                  ) : (
                    <div className="text-center space-y-2">
                      <Upload className="w-8 h-8 text-muted-foreground mx-auto" />
                      <p className="text-sm text-muted-foreground">{t("analyzer.upload.drag")}</p>
                      <p className="text-xs text-muted-foreground/60">.txt and .log files supported</p>
                    </div>
                  )}
                </div>
              </TabsContent>

              <TabsContent value="message" className="mt-3">
                <Textarea
                  data-testid="input-message"
                  value={messageInput}
                  onChange={(e) => setMessageInput(e.target.value)}
                  placeholder={t("analyzer.message.placeholder")}
                  className="min-h-[280px] font-mono text-xs resize-none bg-[#0d1117] border-border text-foreground placeholder:text-muted-foreground/50 focus:border-primary/50"
                />
              </TabsContent>
            </Tabs>

            <Button
              data-testid="button-analyze"
              onClick={handleAnalyze}
              disabled={mutation.isPending || !hasInput}
              className="w-full bg-primary text-primary-foreground hover:bg-primary/90 font-mono font-semibold gap-2 h-11"
            >
              {mutation.isPending ? (
                <>
                  <div className="w-4 h-4 border-2 border-primary-foreground/30 border-t-primary-foreground rounded-full animate-spin" />
                  {t("analyzer.analyzing")}
                </>
              ) : (
                <>
                  <Zap className="w-4 h-4" />
                  {t("analyzer.analyze_button")}
                </>
              )}
            </Button>
          </CardContent>
        </Card>

        {/* Example hints */}
        {!result && !mutation.isPending && (
          <div className="space-y-2">
            <p className="text-xs text-muted-foreground font-mono">Try pasting any of these:</p>
            {[
              "NullPointerException at com.example.Main.run(Main.java:42)",
              "TypeError: Cannot read properties of undefined (reading 'map')",
              "ECONNREFUSED 127.0.0.1:5432",
              "UnhandledPromiseRejectionWarning: Error: getaddrinfo ENOTFOUND",
            ].map((ex, i) => (
              <button
                key={i}
                data-testid={`button-example-${i}`}
                onClick={() => { setPasteInput(ex); setActiveTab("paste"); }}
                className="w-full text-left text-xs font-mono text-muted-foreground/70 hover:text-primary bg-secondary/30 hover:bg-secondary/60 px-3 py-2 rounded border border-border/50 hover:border-primary/30 transition-colors truncate"
              >
                {ex}
              </button>
            ))}
          </div>
        )}
      </div>

      {/* Results Panel */}
      <div className="space-y-4">
        <div className="flex items-center gap-2">
          <CheckCircle className="w-4 h-4 text-primary" />
          <h2 className="text-xl font-bold font-mono">{t("analyzer.results.title")}</h2>
        </div>

        <Card className="min-h-[400px]">
          <CardContent className="p-4">
            {mutation.isPending && <AnalysisResultSkeleton />}
            {!mutation.isPending && result && <AnalysisResultPanel result={result} />}
            {!mutation.isPending && !result && (
              <div className="flex flex-col items-center justify-center h-80 text-center gap-4">
                <div className="w-16 h-16 rounded-full bg-primary/10 flex items-center justify-center">
                  <Terminal className="w-8 h-8 text-primary/50" />
                </div>
                <div>
                  <p className="text-muted-foreground font-mono text-sm">No analysis yet</p>
                  <p className="text-muted-foreground/50 text-xs mt-1">Paste your error log to get started</p>
                </div>
              </div>
            )}
          </CardContent>
        </Card>
      </div>
    </div>
  );
}
