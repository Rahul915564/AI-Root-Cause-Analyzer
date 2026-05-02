import { useState, useRef, useCallback } from "react";
import { useLanguage } from "@/hooks/use-language";
import { useStreamingAnalysis } from "@/hooks/use-streaming-analysis";
import { getGetHistoryQueryKey, getGetStatsQueryKey } from "@workspace/api-client-react";
import { useQueryClient } from "@tanstack/react-query";
import { useToast } from "@/hooks/use-toast";
import { Button } from "@/components/ui/button";
import { Textarea } from "@/components/ui/textarea";
import { Badge } from "@/components/ui/badge";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import {
  Upload, Zap, CheckCircle, AlertTriangle, XCircle, Info,
  ExternalLink, Copy, Check, ChevronRight, FileText, Terminal,
  Loader2, Search, Brain, Wrench, Link2, ScanLine, Share2,
} from "lucide-react";
import { useState as useLocalState } from "react";

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

const PRIORITY_CONFIG = {
  Critical: { color: "bg-red-500/15 text-red-400 border-red-500/30", icon: XCircle, iconColor: "text-red-400" },
  High:     { color: "bg-orange-500/15 text-orange-400 border-orange-500/30", icon: AlertTriangle, iconColor: "text-orange-400" },
  Medium:   { color: "bg-yellow-500/15 text-yellow-400 border-yellow-500/30", icon: Info, iconColor: "text-yellow-400" },
  Low:      { color: "bg-green-500/15 text-green-400 border-green-500/30", icon: CheckCircle, iconColor: "text-green-400" },
};

const STAGE_ICONS: Record<string, React.ElementType> = {
  scanning:     ScanLine,
  identified:   Search,
  scoring:      Brain,
  root_cause:   Zap,
  explanation:  ChevronRight,
  fixes:        Wrench,
  links:        Link2,
  complete:     CheckCircle,
};

// ─── Confidence Gauge ────────────────────────────────────────────────────────
function ConfidenceGauge({ score, animate = false }: { score: number; animate?: boolean }) {
  const color = score >= 80 ? "#22c55e" : score >= 50 ? "#eab308" : "#ef4444";
  const circumference = 2 * Math.PI * 36;
  const offset = circumference - (score / 100) * circumference;
  return (
    <div className="flex flex-col items-center gap-1" data-testid="confidence-gauge">
      <div className="relative w-24 h-24">
        <svg viewBox="0 0 88 88" className={`w-full h-full -rotate-90 ${animate ? "drop-shadow-[0_0_8px_rgba(6,182,212,0.4)]" : ""}`}>
          <circle cx="44" cy="44" r="36" fill="none" stroke="currentColor" strokeWidth="7" className="text-secondary" />
          <circle
            cx="44" cy="44" r="36"
            fill="none"
            stroke={color}
            strokeWidth="7"
            strokeLinecap="round"
            strokeDasharray={circumference}
            strokeDashoffset={offset}
            style={{ transition: "stroke-dashoffset 0.8s cubic-bezier(0.34,1.56,0.64,1)" }}
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

// ─── Code Block ───────────────────────────────────────────────────────────────
function CodeBlock({ code, language }: { code: string; language?: string }) {
  const { toast } = useToast();
  return (
    <div className="relative rounded-md overflow-hidden border border-border">
      {language && (
        <div className="flex items-center justify-between px-3 py-1.5 bg-secondary/50 border-b border-border">
          <span className="text-xs text-muted-foreground font-mono">{language}</span>
          <button
            data-testid="button-copy-code"
            onClick={() => { navigator.clipboard.writeText(code); toast({ description: "Copied to clipboard" }); }}
            className="flex items-center gap-1 text-xs text-muted-foreground hover:text-foreground transition-colors"
          >
            <Copy className="w-3 h-3" /> Copy
          </button>
        </div>
      )}
      <pre className="p-3 text-sm font-mono text-foreground bg-[#0d1117] overflow-x-auto leading-relaxed">
        <code>{code}</code>
      </pre>
    </div>
  );
}

// ─── Stage Status Bar (shown while streaming) ─────────────────────────────────
function StageBar({ stage, message }: { stage: string; message: string }) {
  const Icon = STAGE_ICONS[stage] ?? Loader2;
  return (
    <div className="flex items-center gap-2 px-3 py-2 rounded-md bg-primary/8 border border-primary/20">
      <Icon className="w-3.5 h-3.5 text-primary animate-pulse flex-shrink-0" />
      <span className="text-xs font-mono text-primary truncate">{message}</span>
      <div className="ml-auto flex gap-0.5">
        {[0,1,2].map(i => (
          <div key={i} className="w-1 h-1 rounded-full bg-primary animate-bounce" style={{ animationDelay: `${i * 0.15}s` }} />
        ))}
      </div>
    </div>
  );
}

// ─── Inline Share Button ──────────────────────────────────────────────────────
function InlineShareButton({ resultId }: { resultId: number }) {
  const [copied, setCopied] = useLocalState(false);
  const base = import.meta.env.BASE_URL.replace(/\/$/, "");
  const url = `${window.location.origin}${base}/share/${resultId}`;

  const copy = () => {
    navigator.clipboard.writeText(url);
    setCopied(true);
    setTimeout(() => setCopied(false), 2500);
  };

  return (
    <div className="flex items-center gap-2 pt-2 border-t border-border animate-in fade-in duration-400">
      <button
        data-testid="button-share-result"
        onClick={copy}
        className="flex items-center gap-1.5 px-3 py-1.5 rounded-md text-sm border border-border text-muted-foreground hover:text-primary hover:border-primary/40 hover:bg-primary/5 transition-colors font-mono"
      >
        {copied ? <Check className="w-3.5 h-3.5 text-green-400" /> : <Share2 className="w-3.5 h-3.5" />}
        {copied ? "Link copied!" : "Share analysis"}
      </button>
      {copied && (
        <span className="text-xs text-muted-foreground font-mono truncate max-w-[200px]">{url}</span>
      )}
    </div>
  );
}

// ─── Streaming Result Panel ───────────────────────────────────────────────────
function StreamingResultPanel({
  stage, stageMessage, errorType, language, confidenceScore, priority,
  rootCause, explanation, fixes, stackOverflowLinks, isStreaming, resultId,
}: {
  stage: string;
  stageMessage: string;
  errorType?: string;
  language?: string;
  confidenceScore?: number;
  priority?: "Critical" | "High" | "Medium" | "Low";
  rootCause?: string;
  explanation: string[];
  fixes: Fix[];
  stackOverflowLinks: SOLink[];
  isStreaming: boolean;
  resultId?: number;
}) {
  const { t } = useLanguage();
  const pConfig = priority ? PRIORITY_CONFIG[priority] : null;
  const PIcon = pConfig?.icon;

  const visible = stage !== "idle";
  if (!visible) return null;

  return (
    <div className="space-y-4">
      {/* Stage status bar while streaming */}
      {isStreaming && <StageBar stage={stage} message={stageMessage} />}

      {/* Header: errorType + language + confidence + priority */}
      {errorType && (
        <div className="flex items-start justify-between gap-4 flex-wrap animate-in fade-in slide-in-from-bottom-2 duration-400">
          <div className="space-y-1">
            <div className="flex items-center gap-2 flex-wrap">
              <span className="text-lg font-bold text-foreground font-mono">{errorType}</span>
              {language && <Badge variant="outline" className="text-xs">{language}</Badge>}
            </div>
            {stage === "complete" && (
              <p className="text-xs text-muted-foreground">Analysis complete</p>
            )}
          </div>
          <div className="flex items-center gap-3">
            {confidenceScore !== undefined && <ConfidenceGauge score={confidenceScore} animate={isStreaming} />}
            {priority && pConfig && PIcon && (
              <div className={`flex items-center gap-1.5 px-3 py-1.5 rounded-md border text-sm font-medium ${pConfig.color} animate-in fade-in duration-300`}>
                <PIcon className={`w-4 h-4 ${pConfig.iconColor}`} />
                {priority}
              </div>
            )}
          </div>
        </div>
      )}

      {/* Root Cause */}
      {rootCause && (
        <Card className="border-primary/20 bg-primary/5 animate-in fade-in slide-in-from-bottom-2 duration-400">
          <CardHeader className="pb-2 pt-4 px-4">
            <CardTitle className="text-sm text-primary font-mono flex items-center gap-2">
              <Zap className="w-4 h-4" />
              {t("analyzer.results.root_cause")}
            </CardTitle>
          </CardHeader>
          <CardContent className="px-4 pb-4">
            <p className="text-sm text-foreground leading-relaxed">{rootCause}</p>
          </CardContent>
        </Card>
      )}

      {/* Explanation steps — reveal one by one */}
      {explanation.length > 0 && (
        <Card className="animate-in fade-in slide-in-from-bottom-2 duration-400">
          <CardHeader className="pb-2 pt-4 px-4">
            <CardTitle className="text-sm text-muted-foreground font-mono flex items-center gap-2">
              <ChevronRight className="w-4 h-4 text-primary" />
              {t("analyzer.results.explanation")}
            </CardTitle>
          </CardHeader>
          <CardContent className="px-4 pb-4 space-y-2">
            {explanation.map((step, i) => (
              <div key={i} className="flex gap-3 items-start animate-in fade-in slide-in-from-left-2 duration-300">
                <div className="flex-shrink-0 w-5 h-5 rounded-full bg-primary/15 text-primary text-xs flex items-center justify-center font-mono font-bold mt-0.5">
                  {i + 1}
                </div>
                <p className="text-sm text-foreground leading-relaxed">{step}</p>
              </div>
            ))}
            {/* Placeholder dot for next incoming step while still streaming explanation */}
            {isStreaming && (stage === "explanation" || stage === "root_cause") && (
              <div className="flex gap-3 items-center">
                <div className="flex-shrink-0 w-5 h-5 rounded-full bg-primary/10 flex items-center justify-center">
                  <div className="w-1.5 h-1.5 rounded-full bg-primary/50 animate-pulse" />
                </div>
                <div className="h-3 w-40 rounded bg-primary/10 animate-pulse" />
              </div>
            )}
          </CardContent>
        </Card>
      )}

      {/* Fixes */}
      {fixes.length > 0 && (
        <div className="animate-in fade-in slide-in-from-bottom-2 duration-400">
          <h3 className="text-sm font-mono text-muted-foreground mb-3 flex items-center gap-2">
            <Wrench className="w-4 h-4 text-primary" />
            {t("analyzer.results.fixes")}
          </h3>
          <div className="space-y-3">
            {fixes.slice(0, 3).map((fix, i) => (
              <Card key={i} className="border-border animate-in fade-in slide-in-from-bottom-2 duration-300">
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
            {/* Skeleton for incoming fix while streaming */}
            {isStreaming && stage === "fixes" && (
              <div className="rounded-lg border border-border/50 p-4 space-y-2 animate-pulse">
                <div className="h-3 w-32 rounded bg-secondary" />
                <div className="h-3 w-full rounded bg-secondary/70" />
              </div>
            )}
          </div>
        </div>
      )}

      {/* Stack Overflow Links */}
      {stackOverflowLinks.length > 0 && (
        <Card className="animate-in fade-in slide-in-from-bottom-2 duration-400">
          <CardHeader className="pb-2 pt-3 px-4">
            <CardTitle className="text-sm font-mono text-muted-foreground flex items-center gap-2">
              <ExternalLink className="w-4 h-4" />
              {t("analyzer.results.stackoverflow")}
            </CardTitle>
          </CardHeader>
          <CardContent className="px-4 pb-4 space-y-2">
            {stackOverflowLinks.map((link, i) => (
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

      {/* Share button — only when complete and saved to DB */}
      {stage === "complete" && resultId && (
        <InlineShareButton resultId={resultId} />
      )}
    </div>
  );
}

// ─── Main Page ────────────────────────────────────────────────────────────────
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
  const fileInputRef = useRef<HTMLInputElement>(null);

  const { state, analyze, isStreaming } = useStreamingAnalysis(() => {
    queryClient.invalidateQueries({ queryKey: getGetHistoryQueryKey() });
    queryClient.invalidateQueries({ queryKey: getGetStatsQueryKey() });
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
    analyze(input, activeTab as "paste" | "file" | "message", activeTab === "upload" ? fileName : undefined);
  };

  const hasInput =
    (activeTab === "paste" && pasteInput.trim()) ||
    (activeTab === "upload" && fileContent.trim()) ||
    (activeTab === "message" && messageInput.trim());

  const showResults = state.stage !== "idle";
  const showEmpty = !showResults && !isStreaming;
  const showError = state.stage === "error";

  return (
    <div className="grid grid-cols-1 xl:grid-cols-2 gap-6">
      {/* ── Input Panel ── */}
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
              disabled={isStreaming || !hasInput}
              className="w-full bg-primary text-primary-foreground hover:bg-primary/90 font-mono font-semibold gap-2 h-11"
            >
              {isStreaming ? (
                <>
                  <Loader2 className="w-4 h-4 animate-spin" />
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

        {/* Example hints — hide while active */}
        {showEmpty && (
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

      {/* ── Results Panel ── */}
      <div className="space-y-4">
        <div className="flex items-center justify-between">
          <div className="flex items-center gap-2">
            {isStreaming ? (
              <Loader2 className="w-4 h-4 text-primary animate-spin" />
            ) : (
              <CheckCircle className="w-4 h-4 text-primary" />
            )}
            <h2 className="text-xl font-bold font-mono">{t("analyzer.results.title")}</h2>
          </div>
          {state.stage === "complete" && (
            <span className="text-xs font-mono text-green-400 flex items-center gap-1">
              <CheckCircle className="w-3 h-3" /> Done
            </span>
          )}
        </div>

        <Card className="min-h-[400px]">
          <CardContent className="p-4">
            {showEmpty && (
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

            {showError && (
              <div className="flex flex-col items-center justify-center h-80 text-center gap-3">
                <XCircle className="w-10 h-10 text-destructive" />
                <p className="text-destructive font-mono text-sm">Analysis failed</p>
                <p className="text-muted-foreground text-xs">{state.errorMessage}</p>
              </div>
            )}

            {!showEmpty && !showError && (
              <StreamingResultPanel
                stage={state.stage}
                stageMessage={state.stageMessage}
                errorType={state.errorType}
                language={state.language}
                confidenceScore={state.confidenceScore}
                priority={state.priority}
                rootCause={state.rootCause}
                explanation={state.explanation}
                fixes={state.fixes}
                stackOverflowLinks={state.stackOverflowLinks}
                isStreaming={isStreaming}
                resultId={state.result?.id}
              />
            )}
          </CardContent>
        </Card>
      </div>
    </div>
  );
}
