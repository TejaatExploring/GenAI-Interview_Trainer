import { useEffect, useState } from "react";
import {
  CategoryScale,
  Chart as ChartJS,
  Filler,
  Legend,
  LineElement,
  LinearScale,
  PointElement,
  Tooltip,
} from "chart.js";
import { Line } from "react-chartjs-2";

import { fetchBreakdown, fetchOverview, fetchTrends } from "../services/analyticsApi";

ChartJS.register(CategoryScale, LinearScale, PointElement, LineElement, Tooltip, Legend, Filler);

interface TrendItem {
  date: string;
  score: number;
}

interface OverviewData {
  sessions_count: number;
  average_score: number;
  latest_score: number | null;
}

interface BreakdownData {
  averages: {
    accuracy: number;
    clarity: number;
    structure: number;
    completeness: number;
    overall?: number;
  };
}

interface TrendsData {
  trends: TrendItem[];
}

export function DashboardPage() {
  const [overview, setOverview] = useState<OverviewData | null>(null);
  const [trends, setTrends] = useState<TrendsData | null>(null);
  const [breakdown, setBreakdown] = useState<BreakdownData | null>(null);
  const [trendType, setTrendType] = useState("All Types");

  useEffect(() => {
    const userId = "demo-user";
    Promise.all([
      fetchOverview(userId, trendType),
      fetchTrends(userId, trendType),
      fetchBreakdown(userId, trendType),
    ]).then(([o, t, b]) => {
      setOverview(o);
      setTrends(t);
      setBreakdown(b);
    });
  }, [trendType]);

  const chartData = {
    labels: trends?.trends?.map((item: TrendItem) => item.date) ?? [],
    datasets: [
      {
        label: "Overall Score",
        data: trends?.trends?.map((item: TrendItem) => item.score) ?? [],
        borderColor: "#f8fafc",
        backgroundColor: "rgba(248, 250, 252, 0.15)",
        tension: 0.35,
        fill: true,
        pointRadius: 4,
      },
    ],
  };

  const chartOptions = {
    responsive: true,
    maintainAspectRatio: false,
    plugins: {
      legend: { display: false },
      tooltip: { mode: "index" as const, intersect: false },
    },
    scales: {
      x: {
        grid: { color: "rgba(148, 163, 184, 0.12)" },
        ticks: { color: "#94a3b8" },
      },
      y: {
        min: 0,
        max: 10,
        grid: { color: "rgba(148, 163, 184, 0.12)" },
        ticks: { color: "#94a3b8", stepSize: 2 },
      },
    },
  };

  const metrics = [
    { name: "Accuracy", score: breakdown?.averages?.accuracy ?? 0 },
    { name: "Clarity", score: breakdown?.averages?.clarity ?? 0 },
    { name: "Structure", score: breakdown?.averages?.structure ?? 0 },
    { name: "Completeness", score: breakdown?.averages?.completeness ?? 0 },
  ];

  const sessionCount = overview?.sessions_count ?? 0;
  const hasSessionData = sessionCount > 0 && (trends?.trends?.length ?? 0) > 0;

  const sortedMetrics = [...metrics].sort((a, b) => b.score - a.score);
  const strongest = sortedMetrics[0];
  const weakest = sortedMetrics[sortedMetrics.length - 1];

  const trendPoints = trends?.trends ?? [];
  const latestScore = trendPoints.length ? trendPoints[trendPoints.length - 1].score : 0;
  const previousScore = trendPoints.length > 1 ? trendPoints[trendPoints.length - 2].score : latestScore;
  const trendDelta = latestScore - previousScore;

  const now = new Date();
  const weekAgo = new Date(now);
  weekAgo.setDate(now.getDate() - 7);

  const sessionsThisWeek = trendPoints.filter((item) => {
    const date = new Date(item.date);
    return !Number.isNaN(date.getTime()) && date >= weekAgo && date <= now;
  }).length;

  const recentWindow = Math.min(3, trendPoints.length);
  const recentScores = trendPoints.slice(-recentWindow).map((item) => item.score);
  const previousScores = trendPoints.slice(-recentWindow * 2, -recentWindow).map((item) => item.score);

  const average = (arr: number[]) => (arr.length ? arr.reduce((acc, n) => acc + n, 0) / arr.length : 0);

  const recentAvg = average(recentScores);
  const previousAvg = previousScores.length ? average(previousScores) : average(trendPoints.slice(0, -recentWindow).map((item) => item.score));
  const averageDelta = recentAvg - previousAvg;

  const latestScoreLabel = latestScore >= 8 ? "Excellent" : latestScore >= 6 ? "Good" : latestScore >= 4 ? "Needs Work" : "At Risk";
  const readinessLabel = (overview?.average_score ?? 0) >= 8 ? "Advanced" : (overview?.average_score ?? 0) >= 6 ? "Progressing" : (overview?.average_score ?? 0) >= 4 ? "Developing" : "Foundation";

  const trendClass = (value: number) => (value > 0 ? "trend-positive" : value < 0 ? "trend-negative" : "trend-neutral");

  const strengths = hasSessionData
    ? [
        `${strongest.name} is your strongest area (${strongest.score.toFixed(1)}/10).`,
        trendDelta >= 0
          ? `Your latest score improved by ${trendDelta.toFixed(1)} compared to the previous session.`
          : `Your score dropped by ${Math.abs(trendDelta).toFixed(1)} from the previous session, but your core strengths remain stable.`,
      ]
    : ["No session data yet.", "Complete interviews to unlock personalized strengths."];

  const weaknesses = hasSessionData
    ? [
        `${weakest.name} needs focus (${weakest.score.toFixed(1)}/10).`,
        `Gap between strongest and weakest areas is ${(strongest.score - weakest.score).toFixed(1)} points.`,
      ]
    : ["No session data yet.", "Complete interviews to identify your current weak areas."];

  const suggestions = hasSessionData
    ? [
        `Prioritize ${weakest.name.toLowerCase()} in your next 3 sessions to close the score gap.`,
        weakest.name === "Clarity"
          ? "Use STAR structure and keep answers under 90 seconds with one concrete example."
          : weakest.name === "Structure"
            ? "Start every answer with context, then approach, then measurable outcome."
            : weakest.name === "Completeness"
              ? "Add edge cases, trade-offs, and final impact in each technical response."
              : "Double-check factual correctness and include one validation step in your answer.",
      ]
    : ["Practice at least one interview session.", "AI suggestions will adapt automatically once data is available."];

  return (
    <div className="dashboard-stack">
      <section className="stats-grid">
        <div className="card stat-card">
          <p className="eyebrow label-inline">Total Sessions</p>
          <h2>{overview?.sessions_count ?? 0}</h2>
          <p className={sessionsThisWeek > 0 ? "trend-positive" : "trend-neutral"}>
            {sessionsThisWeek > 0 ? `+${sessionsThisWeek} this week` : "No sessions this week"}
          </p>
        </div>
        <div className="card stat-card">
          <p className="eyebrow label-inline">Average Score</p>
          <h2>{(overview?.average_score ?? 0).toFixed(1)}<span className="score-sub">/10</span></h2>
          <p className={trendClass(averageDelta)}>
            {trendPoints.length > 1 ? `${averageDelta >= 0 ? "+" : ""}${averageDelta.toFixed(1)} vs previous` : "Not enough history"}
          </p>
        </div>
        <div className="card stat-card">
          <p className="eyebrow label-inline">Latest Score</p>
          <h2>
            {overview?.latest_score !== null && overview?.latest_score !== undefined ? (
              <>
                {overview.latest_score.toFixed(1)}<span className="score-sub">/10</span>
              </>
            ) : "N/A"}
          </h2>
          <p className={trendPoints.length ? trendClass(trendDelta) : "trend-neutral"}>
            {trendPoints.length ? `${latestScoreLabel}${trendPoints.length > 1 ? ` (${trendDelta >= 0 ? "+" : ""}${trendDelta.toFixed(1)})` : ""}` : "No latest session"}
          </p>
        </div>
        <div className="card stat-card">
          <p className="eyebrow label-inline">Readiness Badge</p>
          <h2>{readinessLabel}</h2>
          <p className="trend-neutral">{trendType}</p>
        </div>
      </section>

      <section className="dashboard-grid">
        <article className="card chart-card">
          <div className="chart-head">
            <p className="eyebrow label-inline">Score Trends (Last 30 Days)</p>
            <select className="mini-select" value={trendType} onChange={(e) => setTrendType(e.target.value)}>
              <option>All Types</option>
              <option>Technical</option>
              <option>Behavioral</option>
              <option>HR</option>
              <option>System Design</option>
            </select>
          </div>
          <div className="chart-wrap">
            <Line data={chartData} options={chartOptions} />
          </div>
        </article>

        <article className="card breakdown-card">
          <p className="eyebrow label-inline">Performance Breakdown</p>
          <div className="breakdown-list">
            {metrics.map((metric) => (
              <div key={metric.name} className="breakdown-row">
                <div className="breakdown-head">
                  <span>{metric.name}</span>
                  <strong>{metric.score.toFixed(1)}/10</strong>
                </div>
                <div className="breakdown-track">
                  <div className="breakdown-fill" style={{ width: `${(metric.score / 10) * 100}%` }} />
                </div>
              </div>
            ))}
          </div>
        </article>
      </section>

      <section className="insights-grid">
        <article className="card insight-card green">
          <h3>Strengths</h3>
          <ul>
            {strengths.map((item) => (
              <li key={item}>{item}</li>
            ))}
          </ul>
        </article>

        <article className="card insight-card red">
          <h3>Weaknesses</h3>
          <ul>
            {weaknesses.map((item) => (
              <li key={item}>{item}</li>
            ))}
          </ul>
        </article>

        <article className="card insight-card">
          <h3>AI Suggestions</h3>
          <ul>
            {suggestions.map((item) => (
              <li key={item}>{item}</li>
            ))}
          </ul>
        </article>
      </section>

      <section className="card history-card">
        <p className="eyebrow label-inline">Recent Session History</p>
        <div className="history-list">
          {(trends?.trends ?? []).slice(-3).reverse().map((item) => (
            <div key={item.date} className="history-item">
              <div>
                <strong>Interview Session</strong>
                <p>{item.date}</p>
              </div>
              <div className="history-score">{item.score.toFixed(1)} /10</div>
            </div>
          ))}
          {!trends?.trends?.length ? <p className="card-subtitle">No sessions yet. Complete an interview to populate history.</p> : null}
        </div>
      </section>
    </div>
  );
}
