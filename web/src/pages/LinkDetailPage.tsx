import { useEffect, useState } from "react";
import { useParams, useNavigate } from "react-router-dom";
import { Button, Spinner, Tabs, Tab } from "@heroui/react";
import {
  LineChart, Line, XAxis, YAxis, Tooltip as RTooltip, ResponsiveContainer, CartesianGrid,
} from "recharts";
import { urlsApi, metricsApi } from "@/api/client";
import type { URL as VezlURL, Metric, AggregateMetric } from "@/api/types";
import { StatusChip, relativeTime } from "@/components/chips";
import { CopyButton } from "@/components/CopyButton";
import { chartColors } from "@/components/styles";
import { useTheme } from "@/contexts/ThemeContext";

export default function LinkDetailPage() {
  const { id } = useParams<{ id: string }>();
  const navigate = useNavigate();
  const [url, setUrl] = useState<VezlURL | null>(null);
  const [metrics, setMetrics] = useState<Metric[]>([]);
  const [aggregate, setAggregate] = useState<AggregateMetric[]>([]);
  const [loading, setLoading] = useState(true);
  const chart = chartColors[useTheme().theme];

  useEffect(() => {
    if (!id) return;
    Promise.all([
      urlsApi.get(id),
      urlsApi.stats(id),
      metricsApi.aggregate({ url_id: id }),
    ]).then(([u, m, a]) => {
      setUrl(u);
      setMetrics(m || []);
      setAggregate(a || []);
    }).finally(() => setLoading(false));
  }, [id]);

  if (loading) return (
    <div className="flex justify-center items-center h-64"><Spinner /></div>
  );
  if (!url) return (
    <div className="text-text-secondary text-[15px]">Link not found.</div>
  );

  // Clicks over time — bucket by day
  const clicksByDay = metrics.reduce<Record<string, number>>((acc, m) => {
    const day = m.timestamp.slice(0, 10);
    acc[day] = (acc[day] ?? 0) + 1;
    return acc;
  }, {});
  const clicksData = Object.entries(clicksByDay)
    .sort(([a], [b]) => a.localeCompare(b))
    .map(([date, clicks]) => ({ date, clicks }));

  // Breakdowns
  function extractStr(val: unknown): string {
    if (val == null) return "Unknown";
    if (typeof val === "string") return val;
    if (typeof val === "object" && val !== null && "String" in val) return (val as { String: string }).String || "Unknown";
    return String(val);
  }

  function breakdown(field: keyof AggregateMetric) {
    const map: Record<string, number> = {};
    aggregate.forEach(m => {
      const v = extractStr(m[field]);
      map[v] = (map[v] ?? 0) + Number(m.count);
    });
    const total = Object.values(map).reduce((s, v) => s + v, 0);
    return Object.entries(map)
      .sort(([, a], [, b]) => b - a)
      .slice(0, 10)
      .map(([label, count]) => ({ label, count, pct: total ? Math.round((count / total) * 100) : 0 }));
  }

  function BreakdownTable({ data }: { data: { label: string; count: number; pct: number }[] }) {
    if (!data.length) return <p className="text-[15px] text-text-tertiary py-4">No data yet.</p>;
    return (
      <div className="space-y-3">
        {data.map(row => (
          <div key={row.label} className="flex items-center gap-4">
            <span className="text-[15px] text-text-primary w-44 truncate">{row.label}</span>
            <div className="flex-1 h-2 bg-surface-subtle rounded-full overflow-hidden">
              <div className="h-full bg-accent rounded-full" style={{ width: `${row.pct}%` }} />
            </div>
            <span className="text-sm text-text-tertiary w-12 text-right tabular-nums">{row.count}</span>
          </div>
        ))}
      </div>
    );
  }

  return (
    <>
      {/* Header */}
      <div className="flex items-center gap-3 mb-2">
        <Button size="sm" variant="light" className="text-text-secondary text-sm px-2 -ml-2 min-w-0" onPress={() => navigate("/links")}>
          ← Back
        </Button>
      </div>
      <div className="flex items-start justify-between mb-6">
        <div>
          <div className="flex items-center gap-2.5 mb-1.5">
            <span className="font-mono text-[28px] font-semibold text-text-primary tracking-display">{url.shortcode}</span>
            <CopyButton text={`${window.location.origin}/${url.shortcode}`} />
            <StatusChip url={url} />
          </div>
          <a href={url.original_url} target="_blank" rel="noopener noreferrer" className="text-[15px] text-link hover:underline truncate-url block">
            {url.original_url}
          </a>
        </div>
        <div className="text-right text-sm text-text-tertiary space-y-0.5">
          <p>{url.hit} total clicks</p>
          <p>Created {relativeTime(url.created_at)}</p>
        </div>
      </div>

      {/* Tabs */}
      <Tabs
        variant="underlined"
        classNames={{
          base: "w-full",
          tabList: "w-full justify-start border-b border-border gap-7 p-0",
          tab: "px-0 h-11 w-auto flex-none",
          tabContent: "text-[15px] font-medium text-text-tertiary group-data-[selected=true]:text-text-primary",
          cursor: "bg-accent-strong w-full",
        }}
      >
        <Tab key="clicks" title="Clicks">
          <div className="mt-4 bg-surface-elevated border border-border rounded-xl p-6">
            <h3 className="text-lg font-medium text-text-primary mb-5">Clicks over time</h3>
            {clicksData.length === 0 ? (
              <p className="text-[15px] text-text-tertiary">No click data yet.</p>
            ) : (
              <ResponsiveContainer width="100%" height={300}>
                <LineChart data={clicksData}>
                  <CartesianGrid stroke={chart.grid} vertical={false} />
                  <XAxis dataKey="date" stroke={chart.axis} tick={{ fontSize: 12 }} tickLine={false} axisLine={{ stroke: chart.grid }} />
                  <YAxis stroke={chart.axis} tick={{ fontSize: 12 }} tickLine={false} axisLine={false} allowDecimals={false} />
                  <RTooltip
                    contentStyle={{ background: chart.tooltipBg, border: `1px solid ${chart.tooltipBorder}`, borderRadius: 8, boxShadow: "0 4px 12px rgba(0,0,0,0.06)" }}
                    labelStyle={{ color: chart.tooltipLabel, fontWeight: 500 }}
                    itemStyle={{ color: chart.tooltipItem }}
                  />
                  <Line type="monotone" dataKey="clicks" stroke={chart.line} strokeWidth={2} dot={false} activeDot={{ r: 4 }} />
                </LineChart>
              </ResponsiveContainer>
            )}
          </div>
        </Tab>

        <Tab key="geo" title="Geo">
          <div className="mt-4 bg-surface-elevated border border-border rounded-xl p-6">
            <h3 className="text-lg font-medium text-text-primary mb-5">Top Countries</h3>
            <BreakdownTable data={breakdown("country")} />
            <p className="mt-5 text-[13px] text-text-tertiary">
              IP geolocation by{" "}
              <a href="https://db-ip.com" target="_blank" rel="noopener noreferrer" className="underline hover:text-text-secondary">
                DB-IP
              </a>
            </p>
          </div>
        </Tab>

        <Tab key="devices" title="Devices">
          <div className="mt-4 grid grid-cols-3 gap-4">
            {[
              { title: "Browsers", field: "browser" as keyof AggregateMetric },
              { title: "OS", field: "os" as keyof AggregateMetric },
              { title: "Device", field: "device" as keyof AggregateMetric },
            ].map(({ title, field }) => (
              <div key={field} className="bg-surface-elevated border border-border rounded-xl p-6">
                <h3 className="text-lg font-medium text-text-primary mb-5">{title}</h3>
                <BreakdownTable data={breakdown(field)} />
              </div>
            ))}
          </div>
        </Tab>

        <Tab key="overview" title="Overview">
          <div className="mt-4 bg-surface-elevated border border-border rounded-xl p-6 space-y-4">
            {[
              { label: "Shortcode", value: <span className="font-mono text-[15px]">{url.shortcode}</span> },
              { label: "Original URL", value: <a href={url.original_url} target="_blank" rel="noopener noreferrer" className="text-link hover:underline text-[15px]">{url.original_url}</a> },
              { label: "Status", value: <StatusChip url={url} /> },
              { label: "Total Hits", value: url.hit },
              { label: "Hit Limit", value: url.hit_limit === -1 ? "Unlimited" : url.hit_limit },
              { label: "Expires", value: url.expires_at ? new Date(url.expires_at).toLocaleString() : "Never" },
              { label: "Notes", value: extractStr(url.notes) || "—" },
              { label: "Created", value: new Date(url.created_at).toLocaleString() },
            ].map(row => (
              <div key={row.label} className="flex items-center gap-4">
                <span className="text-sm text-text-tertiary w-32 shrink-0">{row.label}</span>
                <span className="text-[15px] text-text-primary">{row.value}</span>
              </div>
            ))}
          </div>
        </Tab>
      </Tabs>
    </>
  );
}
