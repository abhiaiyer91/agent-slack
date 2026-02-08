/**
 * Canvas Renderer — converts canvas component payloads to HTML.
 *
 * This is the server-side renderer for Jarvis's generative UI. When the
 * agent produces a canvas payload (via the canvas tool), this renderer
 * turns it into standalone HTML that can be:
 *
 *   1. Served via an API endpoint
 *   2. Embedded in a chat message
 *   3. Displayed in a webview (mobile apps)
 *   4. Saved as a static file
 *
 * The rendered HTML is self-contained with inline styles — no external
 * dependencies required. Charts use inline SVG.
 */

interface ChartDataPoint {
  label: string;
  value: number;
  color?: string;
}

type CanvasComponent =
  | { type: "markdown"; title?: string; content: string }
  | { type: "bar-chart"; title: string; data: ChartDataPoint[]; xLabel?: string; yLabel?: string }
  | { type: "line-chart"; title: string; data: ChartDataPoint[]; xLabel?: string; yLabel?: string }
  | { type: "metric"; label: string; value: string; change?: string; trend?: "up" | "down" | "flat" }
  | { type: "table"; title?: string; columns: string[]; rows: string[][] }
  | { type: "status-grid"; title?: string; items: { label: string; status: "ok" | "warning" | "error" | "unknown"; detail?: string }[] }
  | { type: "code"; title?: string; language?: string; code: string }
  | { type: "image"; url: string; alt?: string; caption?: string };

interface CanvasPayload {
  title: string;
  layout: "single" | "grid" | "dashboard";
  components: CanvasComponent[];
}

function escapeHtml(text: string): string {
  return text
    .replace(/&/g, "&amp;")
    .replace(/</g, "&lt;")
    .replace(/>/g, "&gt;")
    .replace(/"/g, "&quot;");
}

// ---------------------------------------------------------------------------
// Component Renderers
// ---------------------------------------------------------------------------

function renderMarkdown(c: Extract<CanvasComponent, { type: "markdown" }>): string {
  // Simple markdown-to-HTML: headers, bold, italic, code, lists
  let html = escapeHtml(c.content)
    .replace(/^### (.+)$/gm, "<h3>$1</h3>")
    .replace(/^## (.+)$/gm, "<h2>$1</h2>")
    .replace(/^# (.+)$/gm, "<h1>$1</h1>")
    .replace(/\*\*(.+?)\*\*/g, "<strong>$1</strong>")
    .replace(/\*(.+?)\*/g, "<em>$1</em>")
    .replace(/`(.+?)`/g, "<code>$1</code>")
    .replace(/^- (.+)$/gm, "<li>$1</li>")
    .replace(/(<li>.*<\/li>\n?)+/g, "<ul>$&</ul>")
    .replace(/\n\n/g, "</p><p>")
    .replace(/\n/g, "<br>");

  const titleHtml = c.title ? `<h3 class="component-title">${escapeHtml(c.title)}</h3>` : "";
  return `<div class="component markdown">${titleHtml}<div class="markdown-body"><p>${html}</p></div></div>`;
}

function renderBarChart(c: Extract<CanvasComponent, { type: "bar-chart" }>): string {
  const maxVal = Math.max(...c.data.map((d) => d.value), 1);
  const barWidth = Math.max(30, Math.floor(400 / c.data.length));
  const chartHeight = 200;

  const bars = c.data
    .map((d, i) => {
      const barHeight = Math.round((d.value / maxVal) * (chartHeight - 30));
      const color = d.color || `hsl(${(i * 360) / c.data.length}, 70%, 55%)`;
      const x = i * (barWidth + 8) + 40;
      return `
        <rect x="${x}" y="${chartHeight - barHeight - 20}" width="${barWidth}" height="${barHeight}" fill="${color}" rx="4"/>
        <text x="${x + barWidth / 2}" y="${chartHeight - 4}" text-anchor="middle" fill="#888" font-size="10">${escapeHtml(d.label)}</text>
        <text x="${x + barWidth / 2}" y="${chartHeight - barHeight - 26}" text-anchor="middle" fill="#ccc" font-size="11">${d.value}</text>
      `;
    })
    .join("");

  const svgWidth = c.data.length * (barWidth + 8) + 60;
  return `<div class="component chart">
    <h3 class="component-title">${escapeHtml(c.title)}</h3>
    <svg viewBox="0 0 ${svgWidth} ${chartHeight}" width="100%" preserveAspectRatio="xMidYMid meet">
      <line x1="40" y1="0" x2="40" y2="${chartHeight - 20}" stroke="#333" stroke-width="1"/>
      <line x1="40" y1="${chartHeight - 20}" x2="${svgWidth}" y2="${chartHeight - 20}" stroke="#333" stroke-width="1"/>
      ${bars}
    </svg>
  </div>`;
}

function renderLineChart(c: Extract<CanvasComponent, { type: "line-chart" }>): string {
  const maxVal = Math.max(...c.data.map((d) => d.value), 1);
  const chartWidth = 500;
  const chartHeight = 200;
  const padding = 40;

  const points = c.data
    .map((d, i) => {
      const x = padding + (i / Math.max(c.data.length - 1, 1)) * (chartWidth - padding * 2);
      const y = chartHeight - padding - (d.value / maxVal) * (chartHeight - padding * 2);
      return `${x},${y}`;
    })
    .join(" ");

  const dots = c.data
    .map((d, i) => {
      const x = padding + (i / Math.max(c.data.length - 1, 1)) * (chartWidth - padding * 2);
      const y = chartHeight - padding - (d.value / maxVal) * (chartHeight - padding * 2);
      return `<circle cx="${x}" cy="${y}" r="4" fill="#60a5fa"/>
        <text x="${x}" y="${y - 10}" text-anchor="middle" fill="#ccc" font-size="10">${d.value}</text>`;
    })
    .join("");

  const labels = c.data
    .map((d, i) => {
      const x = padding + (i / Math.max(c.data.length - 1, 1)) * (chartWidth - padding * 2);
      return `<text x="${x}" y="${chartHeight - 8}" text-anchor="middle" fill="#888" font-size="10">${escapeHtml(d.label)}</text>`;
    })
    .join("");

  return `<div class="component chart">
    <h3 class="component-title">${escapeHtml(c.title)}</h3>
    <svg viewBox="0 0 ${chartWidth} ${chartHeight}" width="100%" preserveAspectRatio="xMidYMid meet">
      <polyline points="${points}" fill="none" stroke="#60a5fa" stroke-width="2.5"/>
      ${dots}
      ${labels}
    </svg>
  </div>`;
}

function renderMetric(c: Extract<CanvasComponent, { type: "metric" }>): string {
  const trendIcon = c.trend === "up" ? "&#9650;" : c.trend === "down" ? "&#9660;" : "&#9644;";
  const trendColor = c.trend === "up" ? "#34d399" : c.trend === "down" ? "#f87171" : "#888";
  const changeHtml = c.change
    ? `<span class="metric-change" style="color:${trendColor}">${trendIcon} ${escapeHtml(c.change)}</span>`
    : "";

  return `<div class="component metric-card">
    <div class="metric-label">${escapeHtml(c.label)}</div>
    <div class="metric-value">${escapeHtml(c.value)}</div>
    ${changeHtml}
  </div>`;
}

function renderTable(c: Extract<CanvasComponent, { type: "table" }>): string {
  const headerRow = c.columns.map((col) => `<th>${escapeHtml(col)}</th>`).join("");
  const bodyRows = c.rows
    .map((row) => `<tr>${row.map((cell) => `<td>${escapeHtml(cell)}</td>`).join("")}</tr>`)
    .join("");
  const titleHtml = c.title ? `<h3 class="component-title">${escapeHtml(c.title)}</h3>` : "";

  return `<div class="component table-wrap">${titleHtml}<table><thead><tr>${headerRow}</tr></thead><tbody>${bodyRows}</tbody></table></div>`;
}

function renderStatusGrid(c: Extract<CanvasComponent, { type: "status-grid" }>): string {
  const statusColors: Record<string, string> = {
    ok: "#34d399",
    warning: "#fbbf24",
    error: "#f87171",
    unknown: "#6b7280",
  };

  const items = c.items
    .map(
      (item) => `<div class="status-item">
        <span class="status-dot" style="background:${statusColors[item.status] || "#6b7280"}"></span>
        <span class="status-label">${escapeHtml(item.label)}</span>
        ${item.detail ? `<span class="status-detail">${escapeHtml(item.detail)}</span>` : ""}
      </div>`
    )
    .join("");
  const titleHtml = c.title ? `<h3 class="component-title">${escapeHtml(c.title)}</h3>` : "";

  return `<div class="component status-grid">${titleHtml}<div class="status-items">${items}</div></div>`;
}

function renderCode(c: Extract<CanvasComponent, { type: "code" }>): string {
  const titleHtml = c.title ? `<h3 class="component-title">${escapeHtml(c.title)}</h3>` : "";
  return `<div class="component code-block">${titleHtml}<pre><code class="language-${escapeHtml(c.language || "text")}">${escapeHtml(c.code)}</code></pre></div>`;
}

function renderImage(c: Extract<CanvasComponent, { type: "image" }>): string {
  const captionHtml = c.caption ? `<figcaption>${escapeHtml(c.caption)}</figcaption>` : "";
  return `<div class="component image-wrap"><figure><img src="${escapeHtml(c.url)}" alt="${escapeHtml(c.alt || "")}" loading="lazy"/>${captionHtml}</figure></div>`;
}

function renderComponent(c: CanvasComponent): string {
  switch (c.type) {
    case "markdown":
      return renderMarkdown(c);
    case "bar-chart":
      return renderBarChart(c);
    case "line-chart":
      return renderLineChart(c);
    case "metric":
      return renderMetric(c);
    case "table":
      return renderTable(c);
    case "status-grid":
      return renderStatusGrid(c);
    case "code":
      return renderCode(c);
    case "image":
      return renderImage(c);
    default:
      return `<div class="component">[Unknown component]</div>`;
  }
}

// ---------------------------------------------------------------------------
// Main Renderer
// ---------------------------------------------------------------------------

const CSS = `
  * { margin: 0; padding: 0; box-sizing: border-box; }
  body { font-family: -apple-system, BlinkMacSystemFont, 'Segoe UI', Roboto, sans-serif; background: #0a0a0a; color: #e5e5e5; padding: 24px; }
  .canvas-title { font-size: 24px; font-weight: 700; margin-bottom: 20px; color: #fff; letter-spacing: -0.02em; }
  .canvas-grid { display: grid; gap: 16px; }
  .layout-single .canvas-grid { grid-template-columns: 1fr; }
  .layout-grid .canvas-grid { grid-template-columns: repeat(auto-fit, minmax(300px, 1fr)); }
  .layout-dashboard .canvas-grid { grid-template-columns: repeat(auto-fit, minmax(250px, 1fr)); }
  .component { background: #141414; border: 1px solid #262626; border-radius: 12px; padding: 16px; }
  .component-title { font-size: 14px; font-weight: 600; color: #a1a1aa; margin-bottom: 12px; text-transform: uppercase; letter-spacing: 0.05em; }
  .markdown-body { line-height: 1.6; }
  .markdown-body h1, .markdown-body h2, .markdown-body h3 { color: #fff; margin: 12px 0 8px; }
  .markdown-body code { background: #1e1e2e; padding: 2px 6px; border-radius: 4px; font-size: 0.9em; }
  .markdown-body ul { padding-left: 20px; }
  .metric-card { text-align: center; padding: 24px; }
  .metric-label { font-size: 13px; color: #71717a; text-transform: uppercase; letter-spacing: 0.05em; }
  .metric-value { font-size: 36px; font-weight: 700; color: #fff; margin: 8px 0; }
  .metric-change { font-size: 14px; font-weight: 500; }
  table { width: 100%; border-collapse: collapse; }
  th { text-align: left; padding: 8px 12px; border-bottom: 2px solid #262626; color: #a1a1aa; font-size: 12px; text-transform: uppercase; letter-spacing: 0.05em; }
  td { padding: 8px 12px; border-bottom: 1px solid #1a1a1a; }
  .status-items { display: flex; flex-wrap: wrap; gap: 12px; }
  .status-item { display: flex; align-items: center; gap: 8px; padding: 8px 12px; background: #1a1a1a; border-radius: 8px; }
  .status-dot { width: 10px; height: 10px; border-radius: 50%; flex-shrink: 0; }
  .status-label { font-weight: 500; }
  .status-detail { color: #71717a; font-size: 13px; }
  pre { background: #1e1e2e; border-radius: 8px; padding: 16px; overflow-x: auto; }
  code { font-family: 'SF Mono', 'Fira Code', Consolas, monospace; font-size: 13px; line-height: 1.5; }
  figure { text-align: center; }
  figure img { max-width: 100%; border-radius: 8px; }
  figcaption { color: #71717a; font-size: 13px; margin-top: 8px; }
`;

/**
 * Render a canvas payload to a self-contained HTML document.
 */
export function renderCanvas(payload: CanvasPayload): string {
  const componentsHtml = payload.components.map(renderComponent).join("\n");

  return `<!DOCTYPE html>
<html lang="en">
<head>
  <meta charset="utf-8"/>
  <meta name="viewport" content="width=device-width, initial-scale=1"/>
  <title>${escapeHtml(payload.title)} — Jarvis Canvas</title>
  <style>${CSS}</style>
</head>
<body class="layout-${payload.layout}">
  <div class="canvas-title">${escapeHtml(payload.title)}</div>
  <div class="canvas-grid">
    ${componentsHtml}
  </div>
</body>
</html>`;
}
