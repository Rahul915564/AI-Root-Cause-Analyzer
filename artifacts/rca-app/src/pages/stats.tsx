import { useLanguage } from "@/hooks/use-language";
import { useGetStats, getGetStatsQueryKey } from "@workspace/api-client-react";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Skeleton } from "@/components/ui/skeleton";
import { BarChart, Bar, XAxis, YAxis, Tooltip, ResponsiveContainer, Cell } from "recharts";
import { BarChart3, TrendingUp, AlertCircle, Database } from "lucide-react";

const CHART_COLORS = ["#06b6d4", "#3b82f6", "#8b5cf6", "#ec4899", "#f59e0b", "#22c55e", "#ef4444", "#14b8a6"];

function StatCard({
  title, value, icon: Icon, color, suffix = ""
}: { title: string; value: string | number; icon: any; color: string; suffix?: string }) {
  return (
    <Card className="border-border hover:border-primary/30 transition-colors">
      <CardContent className="p-5">
        <div className="flex items-start justify-between">
          <div>
            <p className="text-xs font-mono text-muted-foreground mb-1">{title}</p>
            <p className="text-3xl font-bold font-mono" style={{ color }}>
              {value}{suffix}
            </p>
          </div>
          <div className="p-2 rounded-md" style={{ backgroundColor: `${color}18` }}>
            <Icon className="w-5 h-5" style={{ color }} />
          </div>
        </div>
      </CardContent>
    </Card>
  );
}

const CustomTooltip = ({ active, payload, label }: any) => {
  if (active && payload && payload.length) {
    return (
      <div className="bg-card border border-border rounded-md px-3 py-2 shadow-xl">
        <p className="text-xs font-mono text-muted-foreground">{label}</p>
        <p className="text-sm font-bold text-primary">{payload[0].value} analyses</p>
      </div>
    );
  }
  return null;
};

export default function StatsPage() {
  const { t } = useLanguage();

  const { data: stats, isLoading } = useGetStats({
    query: { queryKey: getGetStatsQueryKey() },
  }) as any;

  return (
    <div className="space-y-6">
      <div className="flex items-center gap-2">
        <BarChart3 className="w-5 h-5 text-primary" />
        <h1 className="text-xl font-bold font-mono">{t("stats.title")}</h1>
      </div>

      {/* Summary Cards */}
      <div className="grid grid-cols-1 sm:grid-cols-3 gap-4">
        {isLoading ? (
          [...Array(3)].map((_, i) => (
            <Card key={i}><CardContent className="p-5"><Skeleton className="h-16 w-full" /></CardContent></Card>
          ))
        ) : (
          <>
            <StatCard
              title={t("stats.total")}
              value={stats?.totalAnalyses ?? 0}
              icon={Database}
              color="#06b6d4"
            />
            <StatCard
              title={t("stats.avg_confidence")}
              value={stats?.avgConfidence ?? 0}
              icon={TrendingUp}
              color="#22c55e"
              suffix="%"
            />
            <StatCard
              title={t("stats.critical")}
              value={stats?.criticalCount ?? 0}
              icon={AlertCircle}
              color="#ef4444"
            />
          </>
        )}
      </div>

      {/* Error Type Breakdown */}
      <Card>
        <CardHeader className="pb-2">
          <CardTitle className="text-sm font-mono text-muted-foreground flex items-center gap-2">
            <BarChart3 className="w-4 h-4 text-primary" />
            Error Type Breakdown
          </CardTitle>
        </CardHeader>
        <CardContent className="p-4">
          {isLoading ? (
            <Skeleton className="h-64 w-full" />
          ) : !stats?.errorTypeBreakdown?.length ? (
            <div className="h-64 flex flex-col items-center justify-center gap-3 text-center">
              <BarChart3 className="w-10 h-10 text-muted-foreground/20" />
              <p className="text-sm text-muted-foreground font-mono">No data yet</p>
              <p className="text-xs text-muted-foreground/50">Run some analyses to see the breakdown</p>
            </div>
          ) : (
            <ResponsiveContainer width="100%" height={280}>
              <BarChart
                data={stats.errorTypeBreakdown}
                margin={{ top: 10, right: 10, left: -10, bottom: 60 }}
              >
                <XAxis
                  dataKey="errorType"
                  tick={{ fill: "#64748b", fontSize: 10, fontFamily: "monospace" }}
                  angle={-35}
                  textAnchor="end"
                  interval={0}
                />
                <YAxis
                  tick={{ fill: "#64748b", fontSize: 11, fontFamily: "monospace" }}
                  allowDecimals={false}
                />
                <Tooltip content={<CustomTooltip />} />
                <Bar dataKey="count" radius={[4, 4, 0, 0]}>
                  {stats.errorTypeBreakdown.map((_: any, index: number) => (
                    <Cell key={index} fill={CHART_COLORS[index % CHART_COLORS.length]} />
                  ))}
                </Bar>
              </BarChart>
            </ResponsiveContainer>
          )}
        </CardContent>
      </Card>

      {/* Error type list */}
      {!isLoading && stats?.errorTypeBreakdown?.length > 0 && (
        <Card>
          <CardHeader className="pb-2">
            <CardTitle className="text-sm font-mono text-muted-foreground">Detailed Breakdown</CardTitle>
          </CardHeader>
          <CardContent className="p-4">
            <div className="space-y-2">
              {stats.errorTypeBreakdown
                .sort((a: any, b: any) => b.count - a.count)
                .map((item: any, i: number) => (
                  <div key={i} className="flex items-center gap-3">
                    <div className="w-2 h-2 rounded-full flex-shrink-0" style={{ backgroundColor: CHART_COLORS[i % CHART_COLORS.length] }} />
                    <span className="text-xs font-mono text-foreground flex-1">{item.errorType}</span>
                    <div
                      className="h-1.5 rounded-full"
                      style={{
                        width: `${(item.count / Math.max(...stats.errorTypeBreakdown.map((x: any) => x.count))) * 120}px`,
                        backgroundColor: CHART_COLORS[i % CHART_COLORS.length],
                        opacity: 0.6,
                      }}
                    />
                    <span className="text-xs font-mono font-bold" style={{ color: CHART_COLORS[i % CHART_COLORS.length] }}>
                      {item.count}
                    </span>
                  </div>
                ))}
            </div>
          </CardContent>
        </Card>
      )}
    </div>
  );
}
