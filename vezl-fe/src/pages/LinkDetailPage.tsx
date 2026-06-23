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

export default function LinkDetailPage() {
  const { id } = useParams<{ id: string }>();
  const navigate = useNavigate();
  const [url, setUrl] = useState<VezlURL | null>(null);
  const [metrics, setMetrics] = useState<Metric[]>([]);
  const [aggregate, setAggregate] = useState<AggregateMetric[]>([]);
  const [loading, setLoading] = useState(true);

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
    <div className="text-text-secondary text-sm">Link not found.</div>
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
  function breakdown(field: keyof AggregateMetric) {
    const map: Record<string, number> = {};
    aggregate.forEach(m => {
      const v = String(m[field] ?? "Unknown");
      map[v] = (map[v] ?? 0) + Number(m.count);
    });
    const total = Object.values(map).reduce((s, v) => s + v, 0);
    return Object.entries(map)
      .sort(([, a], [, b]) => b - a)
      .slice(0, 10)
      .map(([label, count]) => ({ label, count, pct: total ? Math.round((count / total) * 100) : 0 }));
  }

  function BreakdownTable({ data }: { data: { label: string; count: number; pct: number }[] }) {
    if (!data.length) return <p className="text-sm text-text-tertiary py-4">No data yet.</p>;
    return (
      <div className="space-y-2">
        {data.map(row => (
          <div key={row.label} className="flex items-center gap-3">
            <span className="text-sm text-text-secondary w-36 truncate">{row.label}</span>
            <div className="flex-1 h-1.5 bg-surface-raised rounded-full overflow-hidden">
              <div className="h-full bg-accent rounded-full" style={{ width: `${row.pct}%` }} />
            </div>
            <span className="text-xs text-text-tertiary w-8 text-right">{row.count}</span>
          </div>
        ))}
      </div>
    );
  }

  return (
    <>
      {/* Header */}
      <div className="flex items-center gap-3 mb-2">
        <Button size="sm" variant="light" className="text-text-secondary px-0 min-w-0" onPress={() => navigate("/links")}>
          ← Back
        </Button>
      </div>
      <div className="flex items-start justify-between mb-5">
        <div>
          <div className="flex items-center gap-2 mb-1">
            <span className="font-mono text-xl font-bold text-text-primary">{url.shortcode}</span>
            <CopyButton text={url.shortcode} />
            <StatusChip url={url} />
          </div>
          <a href={url.original_url} target="_blank" rel="noopener noreferrer" className="text-sm text-link hover:underline truncate-url block">
            {url.original_url}
          </a>
        </div>
        <div className="text-right text-xs text-text-tertiary">
          <p>{url.hit} total clicks</p>
          <p>Created {relativeTime(url.created_at)}</p>
        </div>
      </div>

      {/* Tabs */}
      <Tabs
        variant="underlined"
        classNames={{
          tabList: "border-b border-border gap-4 p-0",
          tab: "text-text-secondary data-[selected=true]:text-text-primary px-0",
          cursor: "bg-accent",
        }}
      >
        <Tab key="clicks" title="Clicks">
          <div className="mt-4 bg-surface-elevated border border-border rounded-lg p-6">
            <h3 className="text-base font-semibold text-text-primary mb-4">Clicks over time</h3>
            {clicksData.length === 0 ? (
              <p className="text-sm text-text-tertiary">No click data yet.</p>
            ) : (
              <ResponsiveContainer width="100%" height={240}>
                <LineChart data={clicksData}>
                  <CartesianGrid stroke="#27272a" strokeDasharray="3 3" />
                  <XAxis dataKey="date" stroke="#71717a" tick={{ fontSize: 11 }} />
                  <YAxis stroke="#71717a" tick={{ fontSize: 11 }} allowDecimals={false} />
                  <RTooltip
                    contentStyle={{ background: "#18181b", border: "1px solid #27272a", borderRadius: 8 }}
                    labelStyle={{ color: "#fafafa" }}
                    itemStyle={{ color: "#a1a1aa" }}
                  />
                  <Line type="monotone" dataKey="clicks" stroke="#006FEE" strokeWidth={2} dot={false} />
                </LineChart>
              </ResponsiveContainer>
            )}
          </div>
        </Tab>

        <Tab key="geo" title="Geo">
          <div className="mt-4 bg-surface-elevated border border-border rounded-lg p-6">
            <h3 className="text-base font-semibold text-text-primary mb-4">Top Countries</h3>
            <BreakdownTable data={breakdown("country")} />
          </div>
        </Tab>

        <Tab key="devices" title="Devices">
          <div className="mt-4 grid grid-cols-3 gap-4">
            {[
              { title: "Browsers", field: "browser" as keyof AggregateMetric },
              { title: "OS", field: "os" as keyof AggregateMetric },
              { title: "Device", field: "device" as keyof AggregateMetric },
            ].map(({ title, field }) => (
              <div key={field} className="bg-surface-elevated border border-border rounded-lg p-6">
                <h3 className="text-base font-semibold text-text-primary mb-4">{title}</h3>
                <BreakdownTable data={breakdown(field)} />
              </div>
            ))}
          </div>
        </Tab>

        <Tab key="overview" title="Overview">
          <div className="mt-4 bg-surface-elevated border border-border rounded-lg p-6 space-y-4">
            {[
              { label: "Shortcode", value: <span className="font-mono text-sm">{url.shortcode}</span> },
              { label: "Original URL", value: <a href={url.original_url} target="_blank" rel="noopener noreferrer" className="text-link hover:underline text-sm">{url.original_url}</a> },
              { label: "Status", value: <StatusChip url={url} /> },
              { label: "Total Hits", value: url.hit },
              { label: "Hit Limit", value: url.hit_limit === -1 ? "Unlimited" : url.hit_limit },
              { label: "Expires", value: url.expires_at ? new Date(url.expires_at).toLocaleString() : "Never" },
              { label: "Notes", value: url.notes ?? "—" },
              { label: "Created", value: new Date(url.created_at).toLocaleString() },
            ].map(row => (
              <div key={row.label} className="flex items-center gap-4">
                <span className="text-xs font-semibold text-text-secondary w-28 shrink-0">{row.label}</span>
                <span className="text-sm text-text-primary">{row.value}</span>
              </div>
            ))}
          </div>
        </Tab>
      </Tabs>
    </>
  );
}
