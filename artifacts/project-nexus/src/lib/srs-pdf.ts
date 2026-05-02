import { jsPDF } from "jspdf";
import type { Node, Edge } from "@xyflow/react";

// ─── Types ────────────────────────────────────────────────────────────────────
type SRSNodeData = {
  title: string;
  description: string;
  category: string;
  priority: string;
  locked: boolean;
};
type SRSNode = { id: string; reqId: string } & SRSNodeData;

// ─── Palette ─────────────────────────────────────────────────────────────────
type RGB = [number, number, number];
const BG:         RGB = [8, 4, 16];
const BG2:        RGB = [14, 7, 28];
const BG3:        RGB = [22, 11, 42];
const VIOLET:     RGB = [139, 92, 246];
const VIOLET_MID: RGB = [109, 62, 216];
const VIOLET_DIM: RGB = [60, 35, 100];
const WHITE:      RGB = [255, 255, 255];
const MUTED:      RGB = [140, 130, 165];
const MUTED2:     RGB = [80, 70, 110];
const BORDER:     RGB = [45, 28, 75];

const CAT: Record<string, RGB> = {
  functional: [99, 102, 241],
  database:   [34, 197, 94],
  auth:       [245, 158, 11],
  api:        [59, 130, 246],
  constraint: [239, 68, 68],
  ui:         [236, 72, 153],
};
const PRI: Record<string, RGB> = {
  critical: [239, 68, 68],
  high:     [245, 158, 11],
  medium:   [99, 102, 241],
  low:      [34, 197, 94],
};
const CAT_LABELS: Record<string, string> = {
  functional: "Functional", database: "Database", auth: "Auth",
  api: "API", constraint: "Constraint", ui: "UI",
};
const PRI_LABELS: Record<string, string> = {
  critical: "Critical", high: "High", medium: "Medium", low: "Low",
};

// ─── Helpers ─────────────────────────────────────────────────────────────────
const sf = (d: jsPDF, c: RGB) => d.setFillColor(c[0], c[1], c[2]);
const sd = (d: jsPDF, c: RGB) => d.setDrawColor(c[0], c[1], c[2]);
const st = (d: jsPDF, c: RGB) => d.setTextColor(c[0], c[1], c[2]);

function rule(doc: jsPDF, x1: number, y: number, x2: number, c: RGB, lw = 0.2) {
  doc.setLineWidth(lw);
  sd(doc, c);
  doc.line(x1, y, x2, y);
}

function badge(doc: jsPDF, x: number, y: number, label: string, bg: RGB, w = 0): number {
  doc.setFontSize(6.5);
  doc.setFont("helvetica", "bold");
  const tw = doc.getTextWidth(label.toUpperCase());
  const bw = w || tw + 8;
  const bh = 5;
  sf(doc, bg);
  doc.roundedRect(x, y - 4, bw, bh, 1.2, 1.2, "F");
  st(doc, WHITE);
  doc.text(label.toUpperCase(), x + (bw - tw) / 2, y - 0.3);
  return bw + 3;
}

function wrap(doc: jsPDF, text: string, x: number, y: number, maxW: number, lh: number): number {
  const lines = doc.splitTextToSize(text, maxW);
  doc.text(lines, x, y);
  return y + lines.length * lh;
}

function bgFill(doc: jsPDF) {
  sf(doc, BG);
  doc.rect(0, 0, 210, 297, "F");
}

// ─── Dot grid ────────────────────────────────────────────────────────────────
function dotGrid(doc: jsPDF, gap = 7, r = 0.25) {
  sf(doc, [25, 13, 48]);
  for (let gx = 10; gx < 210; gx += gap)
    for (let gy = 10; gy < 297; gy += gap)
      doc.circle(gx, gy, r, "F");
}

// ─── Page header / footer ────────────────────────────────────────────────────
function pageHeader(doc: jsPDF, section: string, docTitle: string) {
  sf(doc, BG2);
  doc.rect(0, 0, 210, 14, "F");
  sf(doc, VIOLET);
  doc.rect(0, 0, 4, 14, "F");
  st(doc, VIOLET);
  doc.setFont("helvetica", "bold");
  doc.setFontSize(6.5);
  doc.text("SRS", 9, 8.5);
  st(doc, MUTED);
  doc.setFont("helvetica", "normal");
  doc.setFontSize(6.5);
  doc.text("·  " + section, 16, 8.5);
  st(doc, MUTED2);
  doc.text(docTitle, 206, 8.5, { align: "right" });
  rule(doc, 4, 14, 206, VIOLET_DIM, 0.3);
}

function pageFooter(doc: jsPDF, pageNum: number, total: number, docTitle: string, date: string) {
  rule(doc, 14, 286, 196, BORDER, 0.2);
  st(doc, MUTED2);
  doc.setFont("helvetica", "normal");
  doc.setFontSize(6);
  doc.text(docTitle, 14, 291);
  doc.text(`Page ${pageNum} of ${total}`, 105, 291, { align: "center" });
  doc.text(date, 196, 291, { align: "right" });
}

// ─── Decorative large circle accent ──────────────────────────────────────────
function circleAccent(doc: jsPDF, cx: number, cy: number, r: number, c: RGB, opacity = 0.06) {
  // Simulate low-opacity circle by layering a slightly lighter bg circle
  const blended: RGB = [
    Math.round(BG[0] + (c[0] - BG[0]) * opacity),
    Math.round(BG[1] + (c[1] - BG[1]) * opacity),
    Math.round(BG[2] + (c[2] - BG[2]) * opacity),
  ];
  sf(doc, blended);
  doc.circle(cx, cy, r, "F");
}

// ─── Stacked horizontal bar chart ─────────────────────────────────────────────
function stackedBar(
  doc: jsPDF,
  x: number, y: number, w: number, h: number,
  segments: { value: number; color: RGB; label: string }[],
  total: number,
) {
  let curX = x;
  for (const seg of segments) {
    if (seg.value === 0) continue;
    const segW = (seg.value / total) * w;
    sf(doc, seg.color);
    doc.rect(curX, y, segW, h, "F");
    curX += segW;
  }
  // border
  doc.setLineWidth(0.3);
  sd(doc, VIOLET_DIM);
  doc.rect(x, y, w, h, "S");
}

// ─── Horizontal progress bar ──────────────────────────────────────────────────
function progressBar(doc: jsPDF, x: number, y: number, w: number, h: number, pct: number, color: RGB) {
  sf(doc, BG3);
  doc.roundedRect(x, y, w, h, h / 2, h / 2, "F");
  if (pct > 0) {
    sf(doc, color);
    doc.roundedRect(x, y, Math.max(w * pct, h), h, h / 2, h / 2, "F");
  }
}

// ─── Section header band ─────────────────────────────────────────────────────
function sectionHeader(doc: jsPDF, x: number, y: number, w: number, label: string, color: RGB) {
  sf(doc, color);
  doc.roundedRect(x, y, w, 9, 2, 2, "F");
  // darker overlay on right 80% for contrast
  const dark: RGB = [
    Math.round(color[0] * 0.45),
    Math.round(color[1] * 0.45),
    Math.round(color[2] * 0.45),
  ];
  sf(doc, dark);
  doc.roundedRect(x + 24, y, w - 24, 9, 2, 2, "F");
  sf(doc, color);
  doc.rect(x + 24, y, 4, 9, "F");

  st(doc, WHITE);
  doc.setFont("helvetica", "bold");
  doc.setFontSize(9);
  doc.text(label, x + 5, y + 6.2);
}

export async function exportSRSPdf(
  nodes: Node[],
  edges: Edge[],
  workspaceId: string,
  workspaceName?: string,
): Promise<void> {
  const doc = new jsPDF({ unit: "mm", format: "a4", orientation: "portrait" });

  const PW = 210, PH = 297;
  const ML = 14, MR = 14;
  const CW = PW - ML - MR;

  const now = new Date();
  const dateShort = now.toLocaleDateString("en-US", { year: "numeric", month: "short", day: "numeric" });
  const dateLong  = now.toLocaleDateString("en-US", { year: "numeric", month: "long",  day: "numeric" });
  const version   = `v1.${now.getMonth() + 1}.${now.getDate()}`;
  const docTitle  = workspaceName ?? `Workspace ${workspaceId.slice(0, 8).toUpperCase()}`;

  // Assign REQ-IDs
  const srsNodes: SRSNode[] = nodes.map((n, i) => ({
    id: n.id,
    reqId: `REQ-${String(i + 1).padStart(3, "0")}`,
    ...(n.data as SRSNodeData),
  }));

  // Aggregates
  const total = srsNodes.length;
  const priCounts: Record<string, number> = {};
  const catCounts: Record<string, number> = {};
  for (const n of srsNodes) {
    priCounts[n.priority] = (priCounts[n.priority] ?? 0) + 1;
    catCounts[n.category] = (catCounts[n.category] ?? 0) + 1;
  }
  const lockedCount    = srsNodes.filter(n => n.locked).length;
  const isolatedCount  = srsNodes.filter(n =>
    !edges.some(e => e.source === n.id || e.target === n.id)
  ).length;

  // ═══════════════════════════════════════════════════════════════════════════
  // PAGE 1 — COVER
  // ═══════════════════════════════════════════════════════════════════════════
  bgFill(doc);
  dotGrid(doc);

  // Large decorative circle accents
  circleAccent(doc, 170, 70, 75, VIOLET, 0.08);
  circleAccent(doc, 170, 70, 55, VIOLET, 0.05);
  circleAccent(doc, 30,  240, 60, VIOLET, 0.06);

  // Left accent bar (gradient simulation: two rects)
  sf(doc, VIOLET);
  doc.rect(0, 0, 5, 148, "F");
  sf(doc, VIOLET_MID);
  doc.rect(0, 148, 5, 149, "F");

  // Top label chip
  sf(doc, BG3);
  doc.roundedRect(ML, 22, 74, 7, 1.5, 1.5, "F");
  sf(doc, VIOLET);
  doc.roundedRect(ML, 22, 3.5, 7, 1, 1, "F");
  doc.rect(ML + 2.5, 22, 1, 7, "F");
  st(doc, VIOLET);
  doc.setFont("helvetica", "bold");
  doc.setFontSize(7);
  doc.text("SOFTWARE REQUIREMENTS SPECIFICATION", ML + 7, 27.2);

  // Big title
  st(doc, WHITE);
  doc.setFont("helvetica", "bold");
  doc.setFontSize(26);
  const titleLines = doc.splitTextToSize(docTitle, 130);
  doc.text(titleLines, ML, 52);

  const afterTitle = 52 + titleLines.length * 10;

  // Subtitle / tagline
  st(doc, MUTED);
  doc.setFont("helvetica", "normal");
  doc.setFontSize(9);
  doc.text("Formal Requirements Specification Document", ML, afterTitle + 4);

  // Horizontal divider
  rule(doc, ML, afterTitle + 10, PW - MR, VIOLET, 0.5);

  // ── Metadata block ─────────────────────────────────────────────────────────
  const metaY = afterTitle + 17;
  const metaItems = [
    { k: "Document ID",  v: `SRS-${workspaceId.slice(0, 8).toUpperCase()}` },
    { k: "Version",      v: version },
    { k: "Status",       v: "Draft" },
    { k: "Generated",    v: dateLong },
  ];
  for (let i = 0; i < metaItems.length; i++) {
    const col = i % 2;
    const row = Math.floor(i / 2);
    const mx = ML + col * (CW / 2);
    const my = metaY + row * 10;
    st(doc, MUTED2);
    doc.setFont("helvetica", "normal");
    doc.setFontSize(6.5);
    doc.text(metaItems[i].k.toUpperCase(), mx, my);
    st(doc, WHITE);
    doc.setFont("helvetica", "bold");
    doc.setFontSize(8.5);
    doc.text(metaItems[i].v, mx, my + 4.5);
  }

  // ── Stat cards (4 across) ──────────────────────────────────────────────────
  const statY = metaY + 26;
  const statItems = [
    { label: "Total\nRequirements", value: String(total),              color: VIOLET },
    { label: "Dependencies",        value: String(edges.length),       color: [59, 130, 246] as RGB },
    { label: "Critical",            value: String(priCounts.critical ?? 0), color: [239, 68, 68] as RGB },
    { label: "Locked",              value: String(lockedCount),         color: [245, 158, 11] as RGB },
  ];
  const cardW = CW / 4 - 3;
  for (let i = 0; i < statItems.length; i++) {
    const s = statItems[i];
    const cx = ML + i * (cardW + 4);

    // card body
    sf(doc, BG2);
    doc.roundedRect(cx, statY, cardW, 24, 2.5, 2.5, "F");

    // top color stripe
    sf(doc, s.color);
    doc.roundedRect(cx, statY, cardW, 4, 2.5, 2.5, "F");
    doc.rect(cx, statY + 1.5, cardW, 2.5, "F");

    // value
    st(doc, WHITE);
    doc.setFont("helvetica", "bold");
    doc.setFontSize(18);
    doc.text(s.value, cx + cardW / 2, statY + 16, { align: "center" });

    // label
    st(doc, MUTED);
    doc.setFont("helvetica", "normal");
    doc.setFontSize(6);
    const labelLines = s.label.split("\n");
    labelLines.forEach((l, li) =>
      doc.text(l.toUpperCase(), cx + cardW / 2, statY + 19.5 + li * 3.5, { align: "center" })
    );
  }

  // ── Priority stacked bar ───────────────────────────────────────────────────
  const pbY = statY + 32;
  st(doc, MUTED);
  doc.setFont("helvetica", "bold");
  doc.setFontSize(7);
  doc.text("PRIORITY DISTRIBUTION", ML, pbY);
  rule(doc, ML, pbY + 2.5, PW - MR, BORDER, 0.2);

  if (total > 0) {
    const segs = (["critical","high","medium","low"] as const).map(p => ({
      value: priCounts[p] ?? 0, color: PRI[p], label: p,
    }));
    stackedBar(doc, ML, pbY + 6, CW, 7, segs, total);

    // legend
    let lx = ML;
    segs.forEach(s => {
      if (!s.value) return;
      sf(doc, s.color);
      doc.roundedRect(lx, pbY + 15.5, 3, 3, 0.5, 0.5, "F");
      st(doc, MUTED);
      doc.setFont("helvetica", "normal");
      doc.setFontSize(6.5);
      doc.text(`${PRI_LABELS[s.label]} (${s.value})`, lx + 5, pbY + 18.2);
      lx += doc.getTextWidth(`${PRI_LABELS[s.label]} (${s.value})`) + 12;
    });
  }

  // ── Category breakdown bars ────────────────────────────────────────────────
  const cbY = pbY + 26;
  st(doc, MUTED);
  doc.setFont("helvetica", "bold");
  doc.setFontSize(7);
  doc.text("CATEGORY BREAKDOWN", ML, cbY);
  rule(doc, ML, cbY + 2.5, PW - MR, BORDER, 0.2);

  const activeCats = Object.entries(catCounts).filter(([,v]) => v > 0);
  const cols = 2;
  activeCats.forEach(([cat, count], idx) => {
    const col = idx % cols;
    const row = Math.floor(idx / cols);
    const bx = ML + col * (CW / 2 + 2);
    const by = cbY + 7 + row * 11;
    const bw = CW / 2 - 4;
    const pct = total > 0 ? count / total : 0;
    const rgb = CAT[cat] ?? VIOLET;

    st(doc, WHITE);
    doc.setFont("helvetica", "bold");
    doc.setFontSize(7.5);
    doc.text(CAT_LABELS[cat] ?? cat, bx, by);
    st(doc, MUTED);
    doc.setFont("helvetica", "normal");
    doc.setFontSize(6.5);
    doc.text(`${count} req · ${Math.round(pct * 100)}%`, bx + bw, by, { align: "right" });
    progressBar(doc, bx, by + 2, bw, 3.5, pct, rgb);
  });

  // ── Footer ─────────────────────────────────────────────────────────────────
  rule(doc, ML, PH - 16, PW - MR, BORDER, 0.2);
  st(doc, MUTED2);
  doc.setFont("helvetica", "normal");
  doc.setFontSize(6.5);
  doc.text(`Generated ${dateLong}`, ML, PH - 11);
  doc.text("Project Nexus · SRS Engine", PW - MR, PH - 11, { align: "right" });
  doc.text("CONFIDENTIAL", PW / 2, PH - 11, { align: "center" });

  // ═══════════════════════════════════════════════════════════════════════════
  // PAGE 2 — EXECUTIVE SUMMARY
  // ═══════════════════════════════════════════════════════════════════════════
  doc.addPage();
  bgFill(doc);
  dotGrid(doc);
  circleAccent(doc, 185, 260, 70, VIOLET, 0.05);
  circleAccent(doc, 185, 260, 45, VIOLET, 0.04);
  pageHeader(doc, "Executive Summary", docTitle);

  let cy = 20;

  // ── Section heading ─────────────────────────────────────────────────────────
  // Section number chip
  sf(doc, VIOLET);
  doc.roundedRect(ML, cy, 10, 10, 2, 2, "F");
  st(doc, WHITE);
  doc.setFont("helvetica", "bold");
  doc.setFontSize(8);
  doc.text("02", ML + 5, cy + 6.8, { align: "center" });

  st(doc, WHITE);
  doc.setFont("helvetica", "bold");
  doc.setFontSize(17);
  doc.text("Executive Summary", ML + 14, cy + 7.2);

  st(doc, MUTED);
  doc.setFont("helvetica", "normal");
  doc.setFontSize(7.5);
  doc.text("High-level overview of requirements, priorities, categories and document metadata.", ML + 14, cy + 12.5);

  cy += 17;
  rule(doc, ML, cy, PW - MR, VIOLET, 0.4);
  cy += 7;

  // ── KPI CARDS — 4 across full width ────────────────────────────────────────
  const coveragePct = total > 0 ? Math.round((1 - isolatedCount / total) * 100) : 0;
  const kpis4 = [
    { label: "Total Requirements", value: String(total),        sub: "Nodes on canvas",      color: VIOLET                   as RGB },
    { label: "Dependencies",       value: String(edges.length), sub: "Directed edges",        color: [59, 130, 246]           as RGB },
    { label: "Graph Coverage",     value: `${coveragePct}%`,    sub: "Connected nodes",       color: [34, 197, 94]            as RGB },
    { label: "Critical Priority",  value: String(priCounts.critical ?? 0), sub: "Must-have items", color: [239, 68, 68]      as RGB },
  ];
  const kCardW = (CW - 9) / 4; // 4 cards, 3 gaps of 3mm
  const kCardH = 28;
  kpis4.forEach((k, i) => {
    const kx = ML + i * (kCardW + 3);
    // Card body
    sf(doc, BG2);
    doc.roundedRect(kx, cy, kCardW, kCardH, 2.5, 2.5, "F");
    // Left accent bar
    sf(doc, k.color);
    doc.roundedRect(kx, cy, 3, kCardH, 2, 2, "F");
    doc.rect(kx + 1.5, cy, 1.5, kCardH, "F");
    // Value (big number)
    st(doc, WHITE);
    doc.setFont("helvetica", "bold");
    doc.setFontSize(20);
    doc.text(k.value, kx + kCardW / 2 + 1.5, cy + 17, { align: "center" });
    // Label
    st(doc, WHITE);
    doc.setFont("helvetica", "bold");
    doc.setFontSize(6.5);
    const lw = doc.splitTextToSize(k.label, kCardW - 8);
    doc.text(lw[0], kx + 5, cy + 5.5);
    // Sub-label
    st(doc, MUTED);
    doc.setFont("helvetica", "normal");
    doc.setFontSize(5.5);
    doc.text(k.sub.toUpperCase(), kx + 5, cy + kCardH - 4);
    // Color dot
    sf(doc, k.color);
    doc.circle(kx + kCardW - 5, cy + 5, 2, "F");
  });
  cy += kCardH + 7;

  // ── TWO-COLUMN PANEL ROW ────────────────────────────────────────────────────
  const colGap  = 5;
  const colW    = (CW - colGap) / 2; // ≈ 88.5mm each
  const leftX   = ML;
  const rightX  = ML + colW + colGap;

  // Estimate panel heights
  const priRows  = (["critical","high","medium","low"] as const).filter(p => (priCounts[p] ?? 0) > 0);
  const panelH   = 14 + 10 + priRows.length * 14; // header + stacked bar + rows

  // ── LEFT PANEL: Priority Breakdown ─────────────────────────────────────────
  sf(doc, BG2);
  doc.roundedRect(leftX, cy, colW, panelH, 2.5, 2.5, "F");
  // Panel header band
  sf(doc, BG3);
  doc.roundedRect(leftX, cy, colW, 11, 2.5, 2.5, "F");
  doc.rect(leftX, cy + 5, colW, 6, "F");
  sf(doc, VIOLET);
  doc.roundedRect(leftX, cy, 3, 11, 1.5, 1.5, "F");
  doc.rect(leftX + 1.5, cy, 1.5, 11, "F");
  st(doc, VIOLET);
  doc.setFont("helvetica", "bold");
  doc.setFontSize(7);
  doc.text("PRIORITY BREAKDOWN", leftX + 6, cy + 7.3);

  let py = cy + 14;

  if (total > 0) {
    // Stacked distribution bar
    const pSegs = (["critical","high","medium","low"] as const).map(p => ({
      value: priCounts[p] ?? 0, color: PRI[p], label: p,
    }));
    stackedBar(doc, leftX + 4, py, colW - 8, 6, pSegs, total);
    py += 9;

    // Rows per priority
    priRows.forEach(p => {
      const count = priCounts[p] ?? 0;
      const pct   = count / total;
      const rgb   = PRI[p];

      // Row background (alternating)
      const isEven = priRows.indexOf(p) % 2 === 0;
      if (isEven) { sf(doc, [20, 10, 38] as RGB); doc.rect(leftX + 4, py - 1, colW - 8, 13, "F"); }

      // Priority color circle
      sf(doc, rgb);
      doc.circle(leftX + 9, py + 4.5, 2.5, "F");

      // Name + count
      st(doc, WHITE);
      doc.setFont("helvetica", "bold");
      doc.setFontSize(8);
      doc.text(PRI_LABELS[p], leftX + 14, py + 5.5);

      st(doc, MUTED);
      doc.setFont("helvetica", "normal");
      doc.setFontSize(7);
      doc.text(`${count}`, leftX + colW - 5, py + 5.5, { align: "right" });

      // Progress bar
      progressBar(doc, leftX + 4, py + 7.5, colW - 8, 3, pct, rgb);

      // Percentage text right-aligned above bar
      st(doc, rgb);
      doc.setFont("helvetica", "bold");
      doc.setFontSize(6);
      doc.text(`${Math.round(pct * 100)}%`, leftX + colW - 5, py + 7, { align: "right" });

      py += 14;
    });
  }

  // ── RIGHT PANEL: Category Breakdown ─────────────────────────────────────────
  sf(doc, BG2);
  doc.roundedRect(rightX, cy, colW, panelH, 2.5, 2.5, "F");
  // Panel header band
  sf(doc, BG3);
  doc.roundedRect(rightX, cy, colW, 11, 2.5, 2.5, "F");
  doc.rect(rightX, cy + 5, colW, 6, "F");
  sf(doc, VIOLET_MID);
  doc.roundedRect(rightX, cy, 3, 11, 1.5, 1.5, "F");
  doc.rect(rightX + 1.5, cy, 1.5, 11, "F");
  st(doc, VIOLET);
  doc.setFont("helvetica", "bold");
  doc.setFontSize(7);
  doc.text("CATEGORY BREAKDOWN", rightX + 6, cy + 7.3);

  // Column sub-headers inside the panel
  let qy = cy + 14;
  st(doc, MUTED2);
  doc.setFont("helvetica", "bold");
  doc.setFontSize(5.5);
  doc.text("CATEGORY", rightX + 12, qy);
  doc.text("COUNT", rightX + colW - 22, qy);
  doc.text("SHARE", rightX + colW - 5, qy, { align: "right" });
  qy += 4;
  rule(doc, rightX + 4, qy, rightX + colW - 4, BORDER, 0.15);
  qy += 4;

  activeCats.forEach(([cat, count], idx) => {
    const pct = total > 0 ? count / total : 0;
    const rgb = CAT[cat] ?? VIOLET;
    const lbl = CAT_LABELS[cat] ?? cat;

    if (idx % 2 === 0) { sf(doc, [20, 10, 38] as RGB); doc.rect(rightX + 4, qy - 1.5, colW - 8, 10, "F"); }

    // Color square
    sf(doc, rgb);
    doc.roundedRect(rightX + 5, qy + 1.5, 3.5, 3.5, 0.7, 0.7, "F");

    // Category name
    st(doc, WHITE);
    doc.setFont("helvetica", "bold");
    doc.setFontSize(7.5);
    doc.text(lbl, rightX + 12, qy + 5);

    // Count
    st(doc, WHITE);
    doc.setFont("helvetica", "bold");
    doc.setFontSize(7.5);
    doc.text(String(count), rightX + colW - 22, qy + 5);

    // Share percentage
    st(doc, rgb);
    doc.setFont("helvetica", "bold");
    doc.setFontSize(7.5);
    doc.text(`${Math.round(pct * 100)}%`, rightX + colW - 5, qy + 5, { align: "right" });

    // Thin progress bar
    progressBar(doc, rightX + 5, qy + 6.5, colW - 10, 2.5, pct, rgb);

    qy += 10;
  });

  cy += panelH + 7;

  // ── DOCUMENT INFORMATION — properly bordered table ──────────────────────────
  // Section label
  sf(doc, BG3);
  doc.roundedRect(ML, cy, CW, 9, 2, 2, "F");
  sf(doc, VIOLET_MID);
  doc.roundedRect(ML, cy, 3, 9, 1.5, 1.5, "F");
  doc.rect(ML + 1.5, cy, 1.5, 9, "F");
  st(doc, VIOLET);
  doc.setFont("helvetica", "bold");
  doc.setFontSize(7);
  doc.text("DOCUMENT INFORMATION", ML + 6, cy + 6);
  cy += 12;

  const docInfo: [string, string][] = [
    ["Document Title",      docTitle],
    ["Workspace ID",        workspaceId],
    ["Document Version",    version],
    ["Classification",      "Confidential — Internal Use Only"],
    ["Generation Date",     dateLong],
    ["Requirement Count",   String(total)],
    ["Dependency Edges",    String(edges.length)],
    ["Locked Requirements", String(lockedCount)],
  ];

  const keyColW = 52;
  const valColW = CW - keyColW;
  const rowH    = 8;

  // Table outer border
  sf(doc, BG2);
  doc.roundedRect(ML, cy, CW, docInfo.length * rowH, 2, 2, "F");
  sd(doc, BORDER);
  doc.setLineWidth(0.3);
  doc.roundedRect(ML, cy, CW, docInfo.length * rowH, 2, 2, "S");

  // Vertical divider between key and value columns
  doc.setLineWidth(0.2);
  sd(doc, BORDER);
  doc.line(ML + keyColW, cy, ML + keyColW, cy + docInfo.length * rowH);

  docInfo.forEach(([k, v], idx) => {
    const ry = cy + idx * rowH;

    // Alternating row tint
    if (idx % 2 === 0) {
      sf(doc, [18, 9, 35] as RGB);
      if (idx === 0) {
        doc.roundedRect(ML, ry, CW, rowH, 2, 2, "F");
        doc.rect(ML, ry + 2, CW, rowH - 2, "F");
      } else if (idx === docInfo.length - 1) {
        doc.rect(ML, ry, CW, rowH - 2, "F");
        doc.roundedRect(ML, ry + rowH - 4, CW, 4, 2, 2, "F");
      } else {
        doc.rect(ML, ry, CW, rowH, "F");
      }
    }

    // Horizontal row separator
    if (idx > 0) {
      rule(doc, ML, ry, ML + CW, BORDER, 0.15);
    }

    // Key
    st(doc, MUTED);
    doc.setFont("helvetica", "normal");
    doc.setFontSize(7);
    doc.text(k, ML + 4, ry + 5.2);

    // Value
    st(doc, WHITE);
    doc.setFont("helvetica", "bold");
    doc.setFontSize(7);
    const vTrunc = v.length > 52 ? v.slice(0, 50) + "…" : v;
    doc.text(vTrunc, ML + keyColW + 4, ry + 5.2);
  });

  cy += docInfo.length * rowH + 4;

  pageFooter(doc, 2, 99, docTitle, dateShort);

  // ═══════════════════════════════════════════════════════════════════════════
  // PAGE 3 — REQUIREMENTS INDEX (ToC)
  // ═══════════════════════════════════════════════════════════════════════════
  doc.addPage();
  bgFill(doc);
  dotGrid(doc);
  pageHeader(doc, "Requirements Index", docTitle);

  cy = 24;
  st(doc, WHITE);
  doc.setFont("helvetica", "bold");
  doc.setFontSize(18);
  doc.text("Requirements Index", ML, cy + 6);
  st(doc, MUTED);
  doc.setFont("helvetica", "normal");
  doc.setFontSize(8);
  doc.text(`${total} requirements · sorted by priority`, ML, cy + 12);
  rule(doc, ML, cy + 15, PW - MR, VIOLET, 0.4);
  cy += 22;

  // Table header
  sf(doc, BG3);
  doc.roundedRect(ML, cy - 4, CW, 7.5, 1.5, 1.5, "F");
  sf(doc, VIOLET_DIM);
  doc.roundedRect(ML, cy - 4, 1.5, 7.5, 0.5, 0.5, "F");
  st(doc, VIOLET);
  doc.setFont("helvetica", "bold");
  doc.setFontSize(6.5);
  doc.text("ID", ML + 4, cy + 0.5);
  doc.text("REQUIREMENT TITLE", ML + 20, cy + 0.5);
  doc.text("CATEGORY", ML + 108, cy + 0.5);
  doc.text("PRI", ML + 136, cy + 0.5);
  doc.text("DEPS", PW - MR - 2, cy + 0.5, { align: "right" });
  cy += 8;

  const sorted = [...srsNodes].sort((a, b) => {
    const po = ["critical","high","medium","low"];
    return po.indexOf(a.priority) - po.indexOf(b.priority);
  });

  let rowIdx = 0;
  for (const n of sorted) {
    if (cy > PH - 22) {
      pageFooter(doc, doc.getNumberOfPages(), 99, docTitle, dateShort);
      doc.addPage();
      bgFill(doc);
      dotGrid(doc);
      pageHeader(doc, "Requirements Index (cont.)", docTitle);
      cy = 22;
    }

    const priRgb = PRI[n.priority] ?? VIOLET;
    const catRgb = CAT[n.category] ?? VIOLET;
    const deps = edges.filter(e => e.source === n.id || e.target === n.id).length;

    if (rowIdx % 2 === 0) {
      sf(doc, BG2);
      doc.rect(ML, cy - 4, CW, 7, "F");
    }

    // priority left border stripe
    sf(doc, priRgb);
    doc.rect(ML, cy - 4, 1.5, 7, "F");

    st(doc, MUTED);
    doc.setFont("helvetica", "bold");
    doc.setFontSize(6.5);
    doc.text(n.reqId, ML + 4, cy + 0.5);

    st(doc, WHITE);
    doc.setFont("helvetica", "bold");
    doc.setFontSize(7.5);
    const tl = n.title.length > 48 ? n.title.slice(0, 46) + "…" : n.title;
    doc.text(tl, ML + 20, cy + 0.5);

    // Category pill
    sf(doc, catRgb);
    const catLabel = (CAT_LABELS[n.category] ?? n.category).toUpperCase();
    doc.setFontSize(5.5);
    doc.setFont("helvetica", "bold");
    const cpw = doc.getTextWidth(catLabel) + 5;
    doc.roundedRect(ML + 107, cy - 2.5, cpw, 4.5, 1, 1, "F");
    st(doc, WHITE);
    doc.text(catLabel, ML + 107 + 2.5, cy + 0.5);

    // Priority dot
    sf(doc, priRgb);
    doc.circle(ML + 140, cy - 0.5, 2, "F");

    st(doc, MUTED2);
    doc.setFont("helvetica", "normal");
    doc.setFontSize(6.5);
    doc.text(String(deps), PW - MR - 2, cy + 0.5, { align: "right" });

    cy += 7;
    rowIdx++;
  }

  pageFooter(doc, doc.getNumberOfPages(), 99, docTitle, dateShort);

  // ═══════════════════════════════════════════════════════════════════════════
  // PAGES 4+ — INDIVIDUAL REQUIREMENT DETAIL CARDS
  // ═══════════════════════════════════════════════════════════════════════════
  let currentPri = "";

  for (const n of sorted) {
    const catRgb = PRI[n.priority] ?? VIOLET;
    const priRgb = PRI[n.priority] ?? VIOLET;
    const catColor = CAT[n.category] ?? VIOLET;

    const outEdges = edges
      .filter(e => e.source === n.id)
      .map(e => srsNodes.find(x => x.id === e.target))
      .filter(Boolean) as SRSNode[];
    const inEdges = edges
      .filter(e => e.target === n.id)
      .map(e => srsNodes.find(x => x.id === e.source))
      .filter(Boolean) as SRSNode[];

    // Priority-group divider page
    if (n.priority !== currentPri) {
      currentPri = n.priority;
      doc.addPage();
      bgFill(doc);
      dotGrid(doc);

      // big decorative circle for priority
      circleAccent(doc, 160, 148, 100, priRgb, 0.09);
      circleAccent(doc, 160, 148,  70, priRgb, 0.06);

      pageHeader(doc, `${PRI_LABELS[n.priority]} Priority`, docTitle);

      // Centred section divider layout
      sf(doc, priRgb);
      doc.roundedRect(ML, 90, CW, 40, 4, 4, "F");
      const dk: RGB = [
        Math.round(priRgb[0] * 0.4),
        Math.round(priRgb[1] * 0.4),
        Math.round(priRgb[2] * 0.4),
      ];
      sf(doc, dk);
      doc.roundedRect(ML + 30, 90, CW - 30, 40, 4, 4, "F");
      sf(doc, priRgb);
      doc.rect(ML + 30, 90, 4, 40, "F");

      // Icon shape (large number)
      st(doc, WHITE);
      doc.setFont("helvetica", "bold");
      doc.setFontSize(9);
      doc.text("SECTION", ML + 8, 112);
      doc.setFontSize(28);
      const priCount = priCounts[n.priority] ?? 0;
      doc.text(String(priCount), ML + 8, 125);
      doc.setFontSize(8);
      doc.text("REQUIREMENTS", ML + 8, 131);

      st(doc, WHITE);
      doc.setFont("helvetica", "bold");
      doc.setFontSize(22);
      doc.text(`${PRI_LABELS[n.priority]} Priority`, ML + 38, 113);
      st(doc, [255, 255, 255] as RGB);
      doc.setFont("helvetica", "normal");
      doc.setFontSize(8.5);
      const priDesc: Record<string, string> = {
        critical: "Must be implemented for the system to function.",
        high:     "Important features — high business value.",
        medium:   "Significant but non-blocking requirements.",
        low:      "Nice-to-have features or minor improvements.",
      };
      doc.text(priDesc[n.priority] ?? "", ML + 38, 122);

      pageFooter(doc, doc.getNumberOfPages(), 99, docTitle, dateShort);
    }

    // ── Individual requirement card page ──────────────────────────────────────
    doc.addPage();
    bgFill(doc);
    dotGrid(doc);
    circleAccent(doc, 175, 80, 55, catColor, 0.07);

    pageHeader(doc, `${n.reqId} — ${PRI_LABELS[n.priority]} Priority`, docTitle);
    cy = 22;

    // REQ-ID chip
    sf(doc, priRgb);
    doc.roundedRect(ML, cy, 22, 8, 1.5, 1.5, "F");
    st(doc, WHITE);
    doc.setFont("helvetica", "bold");
    doc.setFontSize(8.5);
    doc.text(n.reqId, ML + 11, cy + 5.5, { align: "center" });

    // Title
    st(doc, WHITE);
    doc.setFont("helvetica", "bold");
    doc.setFontSize(16);
    const titleL2 = doc.splitTextToSize(n.title, CW - 30);
    doc.text(titleL2, ML + 26, cy + 6);
    cy += Math.max(10, titleL2.length * 7) + 3;

    // Badge row
    let bx = ML;
    bx += badge(doc, bx, cy, CAT_LABELS[n.category] ?? n.category, catColor);
    bx += badge(doc, bx, cy, PRI_LABELS[n.priority] ?? n.priority, priRgb);
    if (n.locked) badge(doc, bx, cy, "Locked", [100, 80, 30] as RGB);
    cy += 5;

    rule(doc, ML, cy, PW - MR, BORDER, 0.25);
    cy += 6;

    // ── Metadata grid ─────────────────────────────────────────────────────────
    const metaGrid = [
      { k: "Category",    v: CAT_LABELS[n.category] ?? n.category, color: catColor },
      { k: "Priority",    v: PRI_LABELS[n.priority] ?? n.priority,  color: priRgb },
      { k: "Status",      v: n.locked ? "Locked" : "Open",          color: n.locked ? [100,80,30] as RGB : [34,197,94] as RGB },
      { k: "Dependencies", v: `${outEdges.length} out  ·  ${inEdges.length} in`, color: MUTED as RGB },
    ];
    const mgW = CW / 4 - 2;
    metaGrid.forEach((m, i) => {
      const mx = ML + i * (mgW + 2.5);
      sf(doc, BG2);
      doc.roundedRect(mx, cy, mgW, 14, 1.5, 1.5, "F");
      sf(doc, m.color);
      doc.roundedRect(mx, cy, mgW, 2, 0.8, 0.8, "F");
      doc.rect(mx, cy + 1, mgW, 1, "F");
      st(doc, MUTED2);
      doc.setFont("helvetica", "normal");
      doc.setFontSize(5.5);
      doc.text(m.k.toUpperCase(), mx + mgW / 2, cy + 5.5, { align: "center" });
      st(doc, WHITE);
      doc.setFont("helvetica", "bold");
      doc.setFontSize(7.5);
      const vLines = doc.splitTextToSize(m.v, mgW - 3);
      doc.text(vLines[0], mx + mgW / 2, cy + 10.5, { align: "center" });
    });
    cy += 18;

    // ── Description block ─────────────────────────────────────────────────────
    st(doc, MUTED);
    doc.setFont("helvetica", "bold");
    doc.setFontSize(7);
    doc.text("DESCRIPTION", ML, cy);
    rule(doc, ML, cy + 2.5, PW - MR, BORDER, 0.2);
    cy += 6;

    if (n.description && n.description.trim()) {
      sf(doc, BG2);
      const descLines = doc.splitTextToSize(n.description, CW - 8);
      const descH = descLines.length * 4.5 + 8;
      doc.roundedRect(ML, cy, CW, descH, 2, 2, "F");
      sf(doc, catColor);
      doc.roundedRect(ML, cy, 2.5, descH, 1, 1, "F");
      st(doc, WHITE);
      doc.setFont("helvetica", "normal");
      doc.setFontSize(8.5);
      doc.text(descLines, ML + 6, cy + 5.5);
      cy += descH + 6;
    } else {
      st(doc, MUTED2);
      doc.setFont("helvetica", "italic");
      doc.setFontSize(8);
      doc.text("No description provided.", ML + 3, cy + 4);
      cy += 10;
    }

    // ── Dependencies section ───────────────────────────────────────────────────
    if (outEdges.length > 0 || inEdges.length > 0) {
      st(doc, MUTED);
      doc.setFont("helvetica", "bold");
      doc.setFontSize(7);
      doc.text("DEPENDENCIES", ML, cy);
      rule(doc, ML, cy + 2.5, PW - MR, BORDER, 0.2);
      cy += 8;

      if (outEdges.length > 0) {
        st(doc, MUTED2);
        doc.setFont("helvetica", "bold");
        doc.setFontSize(6.5);
        doc.text("REQUIRES (outgoing)", ML, cy);
        cy += 5;
        outEdges.forEach(dep => {
          if (!dep) return;
          if (cy > PH - 30) { /* skip if near bottom */ return; }
          const depPri = PRI[dep.priority] ?? VIOLET;
          sf(doc, BG2);
          doc.roundedRect(ML, cy - 1, CW, 8, 1.5, 1.5, "F");
          sf(doc, depPri);
          doc.roundedRect(ML, cy - 1, 2, 8, 0.8, 0.8, "F");
          st(doc, MUTED2);
          doc.setFont("helvetica", "bold");
          doc.setFontSize(6.5);
          doc.text(dep.reqId, ML + 5, cy + 3.5);
          st(doc, WHITE);
          doc.setFont("helvetica", "bold");
          doc.setFontSize(8);
          doc.text(dep.title, ML + 22, cy + 3.5);
          // arrow indicator
          sf(doc, VIOLET_DIM);
          doc.roundedRect(PW - MR - 16, cy, 14, 5.5, 1, 1, "F");
          st(doc, VIOLET);
          doc.setFont("helvetica", "bold");
          doc.setFontSize(6);
          doc.text("REQUIRES →", PW - MR - 9, cy + 3.8, { align: "center" });
          cy += 10;
        });
      }

      if (inEdges.length > 0) {
        if (outEdges.length > 0) cy += 2;
        st(doc, MUTED2);
        doc.setFont("helvetica", "bold");
        doc.setFontSize(6.5);
        doc.text("REQUIRED BY (incoming)", ML, cy);
        cy += 5;
        inEdges.forEach(dep => {
          if (!dep) return;
          if (cy > PH - 30) return;
          const depPri = PRI[dep.priority] ?? VIOLET;
          sf(doc, BG2);
          doc.roundedRect(ML, cy - 1, CW, 8, 1.5, 1.5, "F");
          sf(doc, depPri);
          doc.roundedRect(ML, cy - 1, 2, 8, 0.8, 0.8, "F");
          st(doc, MUTED2);
          doc.setFont("helvetica", "bold");
          doc.setFontSize(6.5);
          doc.text(dep.reqId, ML + 5, cy + 3.5);
          st(doc, WHITE);
          doc.setFont("helvetica", "bold");
          doc.setFontSize(8);
          doc.text(dep.title, ML + 22, cy + 3.5);
          sf(doc, BG3);
          doc.roundedRect(PW - MR - 18, cy, 16, 5.5, 1, 1, "F");
          st(doc, [59, 130, 246] as RGB);
          doc.setFont("helvetica", "bold");
          doc.setFontSize(6);
          doc.text("← REQUIRED BY", PW - MR - 10, cy + 3.8, { align: "center" });
          cy += 10;
        });
      }
    } else {
      st(doc, MUTED);
      doc.setFont("helvetica", "bold");
      doc.setFontSize(7);
      doc.text("DEPENDENCIES", ML, cy);
      rule(doc, ML, cy + 2.5, PW - MR, BORDER, 0.2);
      cy += 8;
      sf(doc, BG2);
      doc.roundedRect(ML, cy, CW, 9, 1.5, 1.5, "F");
      st(doc, MUTED2);
      doc.setFont("helvetica", "italic");
      doc.setFontSize(7.5);
      doc.text("No dependencies defined for this requirement.", ML + 4, cy + 5.8);
      cy += 13;
    }

    pageFooter(doc, doc.getNumberOfPages(), 99, docTitle, dateShort);
  }

  // ═══════════════════════════════════════════════════════════════════════════
  // LAST PAGE — DEPENDENCY MATRIX
  // ═══════════════════════════════════════════════════════════════════════════
  doc.addPage();
  bgFill(doc);
  dotGrid(doc);
  circleAccent(doc, 170, 200, 90, VIOLET, 0.06);
  pageHeader(doc, "Dependency Matrix", docTitle);

  cy = 22;
  st(doc, WHITE);
  doc.setFont("helvetica", "bold");
  doc.setFontSize(18);
  doc.text("Dependency Matrix", ML, cy + 6);
  rule(doc, ML, cy + 10, PW - MR, VIOLET, 0.4);
  cy += 18;

  // Legend
  const legend = [
    { color: VIOLET, label: "Dependency (row → col)" },
    { color: BG3,    label: "No dependency" },
    { color: MUTED2, label: "Self (diagonal)" },
  ];
  let legX = ML;
  legend.forEach(l => {
    sf(doc, l.color);
    doc.roundedRect(legX, cy, 4, 4, 0.5, 0.5, "F");
    st(doc, MUTED);
    doc.setFont("helvetica", "normal");
    doc.setFontSize(6.5);
    doc.text(l.label, legX + 6, cy + 3.2);
    legX += doc.getTextWidth(l.label) + 14;
  });
  cy += 10;

  const matNodes = srsNodes.slice(0, 20);
  const labelW = 40;
  const matW   = CW - labelW;
  const cell   = Math.min(Math.floor(matW / matNodes.length), 9);

  // Column headers (angled)
  for (let ci = 0; ci < matNodes.length; ci++) {
    const cx = ML + labelW + ci * cell + cell / 2;
    const abbr = matNodes[ci].reqId;
    st(doc, MUTED2);
    doc.setFont("helvetica", "bold");
    doc.setFontSize(5);
    doc.text(abbr, cx, cy + 12, { angle: 60, align: "right" });
  }
  cy += 16;

  // Matrix rows
  for (let ri = 0; ri < matNodes.length; ri++) {
    const ry = cy + ri * cell;
    const rowNode = matNodes[ri];
    const priRgb = PRI[rowNode.priority] ?? VIOLET;

    // Row label
    sf(doc, priRgb);
    doc.roundedRect(ML, ry, 2, cell - 0.5, 0.3, 0.3, "F");
    st(doc, WHITE);
    doc.setFont("helvetica", "bold");
    doc.setFontSize(5);
    const rl = `${rowNode.reqId} ${rowNode.title.slice(0, 14)}`;
    doc.text(rl, ML + 3.5, ry + cell / 2 + 1.5);
    st(doc, MUTED2);
    doc.setFont("helvetica", "normal");
    doc.setFontSize(4.5);
    doc.text(CAT_LABELS[rowNode.category] ?? "", ML + 3.5, ry + cell / 2 + 5);

    // Cells
    for (let ci = 0; ci < matNodes.length; ci++) {
      const cx  = ML + labelW + ci * cell;
      const isSelf = ri === ci;
      const hasDep = !isSelf && edges.some(
        e => e.source === rowNode.id && e.target === matNodes[ci].id
      );
      const isIncoming = !isSelf && !hasDep && edges.some(
        e => e.source === matNodes[ci].id && e.target === rowNode.id
      );

      if (isSelf)       { sf(doc, MUTED2); doc.rect(cx, ry, cell - 0.5, cell - 0.5, "F"); }
      else if (hasDep)  { sf(doc, VIOLET); doc.rect(cx, ry, cell - 0.5, cell - 0.5, "F"); }
      else if (isIncoming){ sf(doc, [40, 28, 70] as RGB); doc.rect(cx, ry, cell - 0.5, cell - 0.5, "F"); }
      else              { sf(doc, BG2); doc.rect(cx, ry, cell - 0.5, cell - 0.5, "F"); }

      if (hasDep) {
        st(doc, WHITE);
        doc.setFont("helvetica", "bold");
        doc.setFontSize(4.5);
        doc.text("▸", cx + cell / 2 - 1, ry + cell / 2 + 1.5);
      }
    }
  }

  cy += matNodes.length * cell + 8;

  // Stats below matrix
  rule(doc, ML, cy, PW - MR, BORDER, 0.2);
  cy += 5;
  st(doc, MUTED);
  doc.setFont("helvetica", "normal");
  doc.setFontSize(7);
  doc.text(`Showing ${matNodes.length} of ${total} requirements  ·  ${edges.length} total edges  ·  ▸ = row depends on column`, ML, cy);

  pageFooter(doc, doc.getNumberOfPages(), doc.getNumberOfPages(), docTitle, dateShort);

  // Fix up "Page X of 99" → actual total
  const totalPages = doc.getNumberOfPages();
  for (let p = 1; p <= totalPages; p++) {
    doc.setPage(p);
    // Overwrite the "of 99" with real total by painting over old footer and rewriting
    sf(doc, BG);
    doc.rect(85, 288, 45, 6, "F");
    st(doc, MUTED2);
    doc.setFont("helvetica", "normal");
    doc.setFontSize(6);
    doc.text(`Page ${p} of ${totalPages}`, 105, 291, { align: "center" });
  }

  doc.save(`srs-${workspaceId.slice(0, 8)}-${now.getFullYear()}${String(now.getMonth() + 1).padStart(2, "0")}${String(now.getDate()).padStart(2, "0")}.pdf`);
}
