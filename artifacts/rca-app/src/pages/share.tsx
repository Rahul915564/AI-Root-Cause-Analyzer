import { useState } from "react";
import { Link } from "wouter";
import { useGetAnalysisById, getGetAnalysisByIdQueryKey } from "@workspace/api-client-react";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Skeleton } from "@/components/ui/skeleton";
import {
  ActivitySquare, Zap, ChevronRight, ExternalLink, Copy,
  Check, AlertTriangle, XCircle, Info, CheckCircle,
  ArrowRight, Wrench,
} from "lucide-react";
import { useToast } from "@/hooks/use-toast";

const PRIORITY_CONFIG: Record<string, { color: string; icon: React.ElementType; iconColor: string }> = {
  Critical: { color: "bg-red-500/15 text-red-400 border-red-500/30", icon: XCircle, iconColor: "text-red-400" },
  High:     { color: "bg-orange-500/15 text-orange-400 border-orange-500/30", icon: AlertTriangle, iconColor: "text-orange-400" },
  Medium:   { color: "bg-yellow-500/15 text-yellow-400 border-yellow-500/30", icon: Info, iconColor: "text-yellow-400" },
  Low:      { color: "bg-green-500/15 text-green-400 border-green-500/30", icon: CheckCircle, iconColor: "text-green-400" },
};

function ConfidenceRing({ score }: { score: number }) {
  const color = score >= 80 ? "#22c55e" : score >= 50 ? "#eab308" : "#ef4444";
  const circumference = 2 * Math.PI * 36;
  const offset = circumference - (score / 100) * circumference;
  return (
    <div className="flex flex-col items-center gap-1">
      <div className="relative w-20 h-20">
        <svg viewBox="0 0 88 88" className="w-full h-full -rotate-90">
          <circle cx="44" cy="44" r="36" fill="none" stroke="currentColor" strokeWidth="7" className="text-secondary" />
          <circle cx="44" cy="44" r="36" fill="none" stroke={color} strokeWidth="7" strokeLinecap="round"
            strokeDasharray={circumference} strokeDashoffset={offset}
            style={{ transition: "stroke-dashoffset 0.8s ease" }} />
        </svg>
        <div className="absolute inset-0 flex items-center justify-center">
          <span className="text-lg font-bold font-mono" style={{ color }}>{score}%</span>
        </div>
      </div>
      <span className="text-xs text-muted-foreground">Confidence</span>
    </div>
  );
}

function CodeBlock({ code, language }: { code: string; language?: string }) {
  const { toast } = useToast();
  return (
    <div className="rounded-md overflow-hidden border border-border">
      {language && (
        <div className="flex items-center justify-between px-3 py-1.5 bg-secondary/50 border-b border-border">
          <span className="text-xs text-muted-foreground font-mono">{language}</span>
          <button
            onClick={() => { navigator.clipboard.writeText(code); toast({ description: "Copied" }); }}
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

function ShareButton({ id }: { id: number }) {
  const [copied, setCopied] = useState(false);
  const base = import.meta.env.BASE_URL.replace(/\/$/, "");
  const url = `${window.location.origin}${base}/share/${id}`;

  const copy = () => {
    navigator.clipboard.writeText(url);
    setCopied(true);
    setTimeout(() => setCopied(false), 2000);
  };

  return (
    <button
      data-testid="button-copy-share-link"
      onClick={copy}
      className="flex items-center gap-1.5 px-3 py-1.5 rounded-md text-sm border border-border text-muted-foreground hover:text-foreground hover:border-primary/40 hover:bg-secondary/50 transition-colors font-mono"
    >
      {copied ? <Check className="w-3.5 h-3.5 text-green-400" /> : <Copy className="w-3.5 h-3.5" />}
      {copied ? "Copied!" : "Copy link"}
    </button>
  );
}

function SharePageSkeleton() {
  return (
    <div className="max-w-3xl mx-auto space-y-5">
      <Skeleton className="h-8 w-64" />
      <Skeleton className="h-20 w-full" />
      <Skeleton className="h-32 w-full" />
      <Skeleton className="h-48 w-full" />
      <Skeleton className="h-48 w-full" />
    </div>
  );
}

export default function SharePage({ id }: { id: number }) {
  const { data, isLoading } = useGetAnalysisById(id, {
    query: {
      enabled: !!id && !isNaN(id),
      queryKey: getGetAnalysisByIdQueryKey(id),
      retry: 1,
    },
  }) as any;

  const isNotFound = !isLoading && !data;

  const pConfig = data?.priority ? PRIORITY_CONFIG[data.priority] : null;
  const PIcon = pConfig?.icon;

  return (
    <div className="min-h-screen bg-background text-foreground">
      {/* Minimal header — no main nav, just the brand */}
      <header className="border-b border-border bg-card/50 backdrop-blur-sm">
        <div className="max-w-4xl mx-auto px-4 sm:px-6 h-14 flex items-center justify-between">
          <Link href="/" className="flex items-center gap-2 text-primary font-bold font-mono">
            <ActivitySquare className="w-4 h-4" />
            Root Cause Analyzer
          </Link>
          {data?.id && <ShareButton id={data.id} />}
        </div>
      </header>

      <main className="max-w-3xl mx-auto px-4 sm:px-6 py-10">
        {isLoading && <SharePageSkeleton />}

        {isNotFound && (
          <div className="flex flex-col items-center justify-center py-32 text-center gap-4">
            <div className="w-16 h-16 rounded-full bg-destructive/10 flex items-center justify-center">
              <XCircle className="w-8 h-8 text-destructive/60" />
            </div>
            <h1 className="text-xl font-bold font-mono">Analysis not found</h1>
            <p className="text-muted-foreground text-sm">This link may have expired or the analysis was deleted.</p>
            <Link href="/">
              <Button className="gap-2 mt-2">
                <ArrowRight className="w-4 h-4" />
                Analyze your own error
              </Button>
            </Link>
          </div>
        )}

        {data && (
          <div className="space-y-6 animate-in fade-in slide-in-from-bottom-4 duration-500">
            {/* ── Title block ── */}
            <div className="space-y-2 pb-2 border-b border-border">
              <div className="flex items-start justify-between gap-4 flex-wrap">
                <div>
                  <div className="flex items-center gap-2 flex-wrap mb-1">
                    <h1 className="text-2xl font-bold font-mono text-foreground">{data.errorType}</h1>
                    <Badge variant="outline" className="text-xs">{data.language}</Badge>
                  </div>
                  <p className="text-xs text-muted-foreground">
                    Analyzed {new Date(data.analyzedAt).toLocaleString()}
                  </p>
                </div>
                <div className="flex items-center gap-3">
                  <ConfidenceRing score={data.confidenceScore} />
                  {pConfig && PIcon && (
                    <div className={`flex items-center gap-1.5 px-3 py-1.5 rounded-md border text-sm font-medium ${pConfig.color}`}>
                      <PIcon className={`w-4 h-4 ${pConfig.iconColor}`} />
                      {data.priority}
                    </div>
                  )}
                </div>
              </div>
            </div>

            {/* ── Input snippet ── */}
            <div className="space-y-1.5">
              <p className="text-xs font-mono text-muted-foreground uppercase tracking-wide">Input</p>
              <pre className="text-xs font-mono text-muted-foreground bg-secondary/40 border border-border rounded-md p-3 overflow-x-auto whitespace-pre-wrap break-all">
                {data.inputSnippet}{data.inputSnippet?.length >= 200 ? "…" : ""}
              </pre>
            </div>

            {/* ── Root Cause ── */}
            <Card className="border-primary/20 bg-primary/5">
              <CardHeader className="pb-2 pt-4 px-4">
                <CardTitle className="text-sm text-primary font-mono flex items-center gap-2">
                  <Zap className="w-4 h-4" />
                  Root Cause
                </CardTitle>
              </CardHeader>
              <CardContent className="px-4 pb-4">
                <p className="text-sm text-foreground leading-relaxed">{data.rootCause}</p>
              </CardContent>
            </Card>

            {/* ── Explanation ── */}
            {data.explanation?.length > 0 && (
              <Card>
                <CardHeader className="pb-2 pt-4 px-4">
                  <CardTitle className="text-sm text-muted-foreground font-mono flex items-center gap-2">
                    <ChevronRight className="w-4 h-4 text-primary" />
                    Step-by-step Explanation
                  </CardTitle>
                </CardHeader>
                <CardContent className="px-4 pb-4 space-y-2">
                  {data.explanation.map((step: string, i: number) => (
                    <div key={i} className="flex gap-3 items-start">
                      <div className="flex-shrink-0 w-5 h-5 rounded-full bg-primary/15 text-primary text-xs flex items-center justify-center font-mono font-bold mt-0.5">
                        {i + 1}
                      </div>
                      <p className="text-sm text-foreground leading-relaxed">{step}</p>
                    </div>
                  ))}
                </CardContent>
              </Card>
            )}

            {/* ── Fixes ── */}
            {data.fixes?.length > 0 && (
              <div>
                <h2 className="text-sm font-mono text-muted-foreground mb-3 flex items-center gap-2">
                  <Wrench className="w-4 h-4 text-primary" />
                  Suggested Fixes
                </h2>
                <div className="space-y-3">
                  {data.fixes.slice(0, 3).map((fix: any, i: number) => (
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
            )}

            {/* ── Stack Overflow refs ── */}
            {data.stackOverflowLinks?.length > 0 && (
              <Card>
                <CardHeader className="pb-2 pt-3 px-4">
                  <CardTitle className="text-sm font-mono text-muted-foreground flex items-center gap-2">
                    <ExternalLink className="w-4 h-4" />
                    Stack Overflow References
                  </CardTitle>
                </CardHeader>
                <CardContent className="px-4 pb-4 space-y-2">
                  {data.stackOverflowLinks.map((link: any, i: number) => (
                    <a key={i} href={link.url} target="_blank" rel="noopener noreferrer"
                      className="flex items-center gap-2 text-sm text-primary hover:text-primary/80 transition-colors group">
                      <ExternalLink className="w-3.5 h-3.5 flex-shrink-0" />
                      <span className="group-hover:underline">{link.title}</span>
                    </a>
                  ))}
                </CardContent>
              </Card>
            )}

            {/* ── CTA ── */}
            <div className="border-t border-border pt-6 flex flex-col sm:flex-row items-center justify-between gap-4">
              <div>
                <p className="text-sm font-medium">Got a different error?</p>
                <p className="text-xs text-muted-foreground">Paste it into the analyzer for an instant root cause breakdown.</p>
              </div>
              <Link href="/">
                <Button
                  data-testid="button-analyze-own"
                  className="gap-2 bg-primary text-primary-foreground hover:bg-primary/90 font-mono whitespace-nowrap"
                >
                  <Zap className="w-4 h-4" />
                  Analyze your error
                  <ArrowRight className="w-4 h-4" />
                </Button>
              </Link>
            </div>
          </div>
        )}
      </main>
    </div>
  );
}
