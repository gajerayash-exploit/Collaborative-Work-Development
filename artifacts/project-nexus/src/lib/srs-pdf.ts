import { jsPDF } from "jspdf";
import type { Node, Edge } from "@xyflow/react";

type SRSNodeData = {
  title: string;
  description: string;
  category: string;
  priority: string;
  locked: boolean;
};

const CAT_COLORS: Record<string, [number, number, number]> = {
  functional: [99, 102, 241],
  database:   [34, 197, 94],
  auth:       [245, 158, 11],
  api:        [59, 130, 246],
  constraint: [239, 68, 68],
  ui:         [236, 72, 153],
};

const PRI_COLORS: Record<string, [number, number, number]> = {
  critical: [239, 68, 68],
  high:     [245, 158, 11],
  medium:   [99, 102, 241],
  low:      [34, 197, 94],
};

const DARK_BG: [number, number, number]     = [5, 2, 8];
const VIOLET:  [number, number, number]     = [139, 92, 246];
const VIOLET_DIM: [number, number, number]  = [139, 92, 246];
const TEXT_DIM: [number, number, number]    = [160, 160, 180];
const WHITE: [number, number, number]       = [255, 255, 255];

function hex(rgb: [number, number, number]) {
  return `#${rgb.map(v => v.toString(16).padStart(2, "0")).join("")}`;
}

function setFill(doc: jsPDF, rgb: [number, number, number]) {
  doc.setFillColor(rgb[0], rgb[1], rgb[2]);
}
function setDraw(doc: jsPDF, rgb: [number, number, number]) {
  doc.setDrawColor(rgb[0], rgb[1], rgb[2]);
}
function setTextColor(doc: jsPDF, rgb: [number, number, number]) {
  doc.setTextColor(rgb[0], rgb[1], rgb[2]);
}

function pill(doc: jsPDF, x: number, y: number, text: string, bgRgb: [number, number, number], w = 0) {
  const fontSize = 7;
  doc.setFontSize(fontSize);
  const textW = doc.getTextWidth(text);
  const pillW = w || textW + 10;
  const pillH = 5.5;
  setFill(doc, bgRgb);
  doc.roundedRect(x, y - pillH + 1, pillW, pillH, 1.5, 1.5, "F");
  setTextColor(doc, WHITE);
  doc.setFont("helvetica", "bold");
  doc.text(text.toUpperCase(), x + (pillW - textW) / 2, y - 0.5);
  return pillW;
}

function line(doc: jsPDF, x1: number, y1: number, x2: number, y2: number, rgb: [number, number, number], lw = 0.2) {
  doc.setLineWidth(lw);
  setDraw(doc, rgb);
  doc.line(x1, y1, x2, y2);
}

function wrapText(doc: jsPDF, text: string, x: number, y: number, maxW: number, lineH: number): number {
  const lines = doc.splitTextToSize(text, maxW);
  doc.text(lines, x, y);
  return y + lines.length * lineH;
}

export async function exportSRSPdf(
  nodes: Node[],
  edges: Edge[],
  workspaceId: string,
  workspaceName?: string,
): Promise<void> {
  const doc = new jsPDF({ unit: "mm", format: "a4", orientation: "portrait" });
  const PW = 210;
  const PH = 297;
  const ML = 18, MR = 18, MT = 18;
  const CW = PW - ML - MR;

  const srsNodes = nodes.map(n => ({
    id: n.id,
    ...(n.data as SRSNodeData),
  }));

  const now = new Date();
  const dateStr = now.toLocaleDateString("en-US", { year: "numeric", month: "long", day: "numeric" });
  const name = workspaceName ?? `Workspace ${workspaceId.slice(0, 8).toUpperCase()}`;

  // ─── PAGE 1: COVER ───────────────────────────────────────────────────────────
  setFill(doc, DARK_BG);
  doc.rect(0, 0, PW, PH, "F");

  // violet gradient accent bar
  setFill(doc, VIOLET);
  doc.rect(0, 0, 6, PH, "F");

  // dot grid pattern
  setFill(doc, [20, 10, 35]);
  for (let gx = 12; gx < PW; gx += 8) {
    for (let gy = 8; gy < PH; gy += 8) {
      doc.circle(gx, gy, 0.3, "F");
    }
  }

  // top chip
  setFill(doc, [30, 15, 50]);
  doc.roundedRect(ML, 28, 46, 7, 1.5, 1.5, "F");
  setTextColor(doc, VIOLET);
  doc.setFont("helvetica", "bold");
  doc.setFontSize(7.5);
  doc.text("SOFTWARE REQUIREMENTS SPECIFICATION", ML + 4, 33);

  // main title
  setTextColor(doc, WHITE);
  doc.setFont("helvetica", "bold");
  doc.setFontSize(30);
  const titleLines = doc.splitTextToSize(name, CW);
  doc.text(titleLines, ML, 58);

  // horizontal rule
  const titleH = 58 + (titleLines.length - 1) * 12 + 6;
  line(doc, ML, titleH, PW - MR, titleH, VIOLET, 0.5);

  // stats strip
  const cats = Object.fromEntries(
    Object.keys(CAT_COLORS).map(c => [c, srsNodes.filter(n => n.category === c).length])
  );
  const pris = Object.fromEntries(
    Object.keys(PRI_COLORS).map(p => [p, srsNodes.filter(n => n.priority === p).length])
  );

  let sx = ML;
  const sy = titleH + 16;
  const statItems = [
    { label: "Requirements", value: String(srsNodes.length) },
    { label: "Dependencies",  value: String(edges.length) },
    { label: "Critical",      value: String(pris.critical ?? 0) },
    { label: "Categories",    value: String(Object.values(cats).filter(v => v > 0).length) },
  ];
  for (const s of statItems) {
    setFill(doc, [25, 12, 42]);
    doc.roundedRect(sx, sy, 36, 18, 2, 2, "F");
    setFill(doc, VIOLET);
    doc.roundedRect(sx, sy, 36, 4, 2, 2, "F");
    doc.rect(sx, sy + 2, 36, 2, "F");

    setTextColor(doc, WHITE);
    doc.setFont("helvetica", "bold");
    doc.setFontSize(14);
    doc.text(s.value, sx + 18, sy + 13, { align: "center" });
    setTextColor(doc, TEXT_DIM);
    doc.setFont("helvetica", "normal");
    doc.setFontSize(6.5);
    doc.text(s.label.toUpperCase(), sx + 18, sy + 17, { align: "center" });
    sx += 40;
  }

  // category breakdown
  const cbY = sy + 28;
  setTextColor(doc, TEXT_DIM);
  doc.setFont("helvetica", "bold");
  doc.setFontSize(7);
  doc.text("CATEGORY BREAKDOWN", ML, cbY);
  line(doc, ML, cbY + 2, PW - MR, cbY + 2, [40, 25, 65], 0.2);

  let bx = ML;
  let by = cbY + 8;
  for (const [cat, count] of Object.entries(cats)) {
    if (count === 0) continue;
    const rgb = CAT_COLORS[cat] ?? VIOLET;
    const barW = Math.min((count / srsNodes.length) * (CW - 40), CW - 40);
    setFill(doc, [25, 12, 42]);
    doc.roundedRect(bx, by - 3, CW, 6, 1, 1, "F");
    setFill(doc, rgb);
    doc.roundedRect(bx, by - 3, barW + 40, 6, 1, 1, "F");
    setTextColor(doc, WHITE);
    doc.setFont("helvetica", "bold");
    doc.setFontSize(7);
    doc.text(cat.toUpperCase(), bx + 3, by + 0.8);
    doc.text(String(count), bx + CW - 4, by + 0.8, { align: "right" });
    by += 9;
  }

  // generated by / date footer
  line(doc, ML, PH - 22, PW - MR, PH - 22, [40, 25, 65], 0.2);
  setTextColor(doc, TEXT_DIM);
  doc.setFont("helvetica", "normal");
  doc.setFontSize(7);
  doc.text(`Generated ${dateStr}`, ML, PH - 16);
  doc.text("Project Nexus · SRS Engine", PW - MR, PH - 16, { align: "right" });

  // ─── PAGE 2+: REQUIREMENTS ───────────────────────────────────────────────────
  const CATEGORIES = ["critical", "high", "medium", "low"] as const;
  const grouped = CATEGORIES.flatMap(pri =>
    srsNodes.filter(n => n.priority === pri)
  );

  let curY = 0;

  function newPage(pageTitle: string) {
    doc.addPage();
    setFill(doc, DARK_BG);
    doc.rect(0, 0, PW, PH, "F");
    setFill(doc, VIOLET);
    doc.rect(0, 0, 6, PH, "F");
    // dot grid
    setFill(doc, [20, 10, 35]);
    for (let gx = 12; gx < PW; gx += 8) {
      for (let gy = 8; gy < PH; gy += 8) {
        doc.circle(gx, gy, 0.3, "F");
      }
    }
    // header strip
    setFill(doc, [18, 8, 32]);
    doc.rect(6, 0, PW - 6, 16, "F");
    setTextColor(doc, VIOLET);
    doc.setFont("helvetica", "bold");
    doc.setFontSize(7);
    doc.text("SOFTWARE REQUIREMENTS SPECIFICATION", ML, 7);
    setTextColor(doc, TEXT_DIM);
    doc.setFont("helvetica", "normal");
    doc.setFontSize(7);
    doc.text(pageTitle, PW - MR, 7, { align: "right" });
    line(doc, ML, 16, PW - MR, 16, VIOLET, 0.3);
    curY = 24;
  }

  function drawFooter(pageNum: number) {
    line(doc, ML, PH - 10, PW - MR, PH - 10, [40, 25, 65], 0.2);
    setTextColor(doc, TEXT_DIM);
    doc.setFont("helvetica", "normal");
    doc.setFontSize(6.5);
    doc.text(name, ML, PH - 6);
    doc.text(`Page ${pageNum}`, PW / 2, PH - 6, { align: "center" });
    doc.text(dateStr, PW - MR, PH - 6, { align: "right" });
  }

  // ── Requirements table of contents ──────────────────────────────────────────
  newPage("Table of Contents");

  setTextColor(doc, WHITE);
  doc.setFont("helvetica", "bold");
  doc.setFontSize(16);
  doc.text("Requirements Index", ML, curY);
  curY += 10;
  line(doc, ML, curY, PW - MR, curY, VIOLET, 0.4);
  curY += 6;

  // header row
  setFill(doc, [30, 15, 50]);
  doc.rect(ML, curY - 4, CW, 7, "F");
  setTextColor(doc, VIOLET);
  doc.setFont("helvetica", "bold");
  doc.setFontSize(7);
  doc.text("REQUIREMENT", ML + 3, curY + 0.5);
  doc.text("CATEGORY", ML + 90, curY + 0.5);
  doc.text("PRIORITY", ML + 125, curY + 0.5);
  doc.text("DEPS", PW - MR - 4, curY + 0.5, { align: "right" });
  curY += 8;

  for (const n of grouped) {
    if (curY > PH - 20) { drawFooter(doc.getNumberOfPages()); newPage("Table of Contents (cont.)"); }

    const catRgb = CAT_COLORS[n.category] ?? VIOLET;
    const priRgb = PRI_COLORS[n.priority] ?? VIOLET;
    const outgoing = edges.filter(e => e.source === n.id).length;
    const incoming = edges.filter(e => e.target === n.id).length;

    // alternating row
    if (grouped.indexOf(n) % 2 === 0) {
      setFill(doc, [15, 7, 28]);
      doc.rect(ML, curY - 4, CW, 6.5, "F");
    }

    setTextColor(doc, WHITE);
    doc.setFont("helvetica", "bold");
    doc.setFontSize(8);
    const titleLine = n.title.length > 42 ? n.title.slice(0, 40) + "…" : n.title;
    doc.text(titleLine, ML + 3, curY);

    pill(doc, ML + 88, curY, n.category, catRgb, 28);
    pill(doc, ML + 123, curY, n.priority, priRgb, 22);

    setTextColor(doc, TEXT_DIM);
    doc.setFont("helvetica", "normal");
    doc.setFontSize(7);
    doc.text(`↑${outgoing} ↓${incoming}`, PW - MR - 4, curY, { align: "right" });

    curY += 7;
  }

  drawFooter(2);

  // ── Individual requirement pages ─────────────────────────────────────────────
  let pageNum = 3;
  let currentPri = "";

  for (const n of grouped) {
    const catRgb = CAT_COLORS[n.category] ?? VIOLET;
    const priRgb = PRI_COLORS[n.priority] ?? VIOLET;
    const outEdges = edges.filter(e => e.source === n.id).map(e => {
      const t = srsNodes.find(x => x.id === e.target);
      return t ? t.title : e.target;
    });
    const inEdges = edges.filter(e => e.target === n.id).map(e => {
      const s = srsNodes.find(x => x.id === e.source);
      return s ? s.title : e.source;
    });

    // section header for new priority group
    if (n.priority !== currentPri) {
      currentPri = n.priority;
      newPage(`${n.priority.toUpperCase()} Priority Requirements`);
      // priority section title
      setFill(doc, priRgb);
      doc.roundedRect(ML, curY - 5, CW, 10, 2, 2, "F");
      setTextColor(doc, WHITE);
      doc.setFont("helvetica", "bold");
      doc.setFontSize(12);
      doc.text(`${n.priority.charAt(0).toUpperCase() + n.priority.slice(1)} Priority`, ML + 4, curY + 1.5);
      curY += 14;
      pageNum++;
    }

    // need a new page?
    const estimatedH = 14 + (n.description ? 16 : 0) + (outEdges.length + inEdges.length) * 5 + 12;
    if (curY + estimatedH > PH - 18) {
      drawFooter(pageNum++);
      newPage(`${n.priority.toUpperCase()} Priority Requirements (cont.)`);
    }

    // card background
    setFill(doc, [15, 7, 28]);
    doc.roundedRect(ML, curY - 2, CW, estimatedH, 2, 2, "F");

    // left accent bar (category color)
    setFill(doc, catRgb);
    doc.roundedRect(ML, curY - 2, 3, estimatedH, 1, 1, "F");

    // title
    setTextColor(doc, WHITE);
    doc.setFont("helvetica", "bold");
    doc.setFontSize(11);
    doc.text(n.title, ML + 7, curY + 6);

    // pills
    pill(doc, ML + 7, curY + 13, n.category, catRgb);
    pill(doc, ML + 7 + (doc.getTextWidth(n.category) + 14), curY + 13, n.priority, priRgb);
    if (n.locked) pill(doc, ML + 7 + (doc.getTextWidth(n.category) + 14) + (doc.getTextWidth(n.priority) + 14), curY + 13, "locked", [100, 90, 50]);

    curY += 17;

    // description
    if (n.description) {
      setTextColor(doc, TEXT_DIM);
      doc.setFont("helvetica", "normal");
      doc.setFontSize(8.5);
      curY = wrapText(doc, n.description, ML + 7, curY + 2, CW - 12, 4.5) + 3;
    }

    // dependencies
    if (outEdges.length > 0 || inEdges.length > 0) {
      line(doc, ML + 7, curY, ML + CW - 3, curY, [40, 20, 60], 0.15);
      curY += 4;

      if (outEdges.length > 0) {
        setTextColor(doc, [139, 92, 246]);
        doc.setFont("helvetica", "bold");
        doc.setFontSize(7);
        doc.text("REQUIRES →", ML + 7, curY);
        setTextColor(doc, TEXT_DIM);
        doc.setFont("helvetica", "normal");
        doc.text(outEdges.join("   ·   "), ML + 32, curY);
        curY += 5;
      }
      if (inEdges.length > 0) {
        setTextColor(doc, [59, 130, 246]);
        doc.setFont("helvetica", "bold");
        doc.setFontSize(7);
        doc.text("← REQUIRED BY", ML + 7, curY);
        setTextColor(doc, TEXT_DIM);
        doc.setFont("helvetica", "normal");
        doc.text(inEdges.join("   ·   "), ML + 36, curY);
        curY += 5;
      }
    }

    curY += 8;
  }

  drawFooter(pageNum++);

  // ── Dependency Matrix page ───────────────────────────────────────────────────
  newPage("Dependency Matrix");

  setTextColor(doc, WHITE);
  doc.setFont("helvetica", "bold");
  doc.setFontSize(16);
  doc.text("Dependency Matrix", ML, curY);
  curY += 4;
  setTextColor(doc, TEXT_DIM);
  doc.setFont("helvetica", "normal");
  doc.setFontSize(8);
  doc.text("● = dependency exists  (row depends on column)", ML, curY + 4);
  curY += 12;

  const matNodes = srsNodes.slice(0, 18); // max 18 for readability
  const cellSize = Math.min(Math.floor((CW - 30) / matNodes.length), 10);
  const labelW = 30;
  const startX = ML + labelW;
  const startY = curY;

  // column headers
  for (let ci = 0; ci < matNodes.length; ci++) {
    const cx = startX + ci * cellSize + cellSize / 2;
    const cy = startY;
    doc.saveGraphicsState();
    doc.setGState(new (doc as any).GState({ opacity: 1 }));
    setTextColor(doc, TEXT_DIM);
    doc.setFont("helvetica", "normal");
    doc.setFontSize(5.5);
    // abbreviated column label
    const abbr = matNodes[ci].title.slice(0, 6);
    doc.text(abbr, cx, cy, { angle: 60, align: "right" });
    doc.restoreGraphicsState();
  }
  curY = startY + 14;

  // rows
  for (let ri = 0; ri < matNodes.length; ri++) {
    const ry = curY + ri * cellSize;
    // row label
    setTextColor(doc, TEXT_DIM);
    doc.setFont("helvetica", "normal");
    doc.setFontSize(5.5);
    const rowLabel = matNodes[ri].title.slice(0, 16);
    doc.text(rowLabel, ML + labelW - 2, ry + cellSize / 2, { align: "right" });

    // cells
    for (let ci = 0; ci < matNodes.length; ci++) {
      const cx = startX + ci * cellSize;
      const hasEdge = ri !== ci && edges.some(e => e.source === matNodes[ri].id && e.target === matNodes[ci].id);
      const isSelf = ri === ci;

      if (isSelf) {
        setFill(doc, [30, 15, 50]);
      } else if (hasEdge) {
        setFill(doc, VIOLET);
      } else {
        setFill(doc, [18, 8, 30]);
      }
      doc.rect(cx, ry, cellSize - 0.5, cellSize - 0.5, "F");

      if (hasEdge) {
        setTextColor(doc, WHITE);
        doc.setFont("helvetica", "bold");
        doc.setFontSize(5);
        doc.text("●", cx + cellSize / 2 - 0.8, ry + cellSize / 2 + 1.5);
      }
    }
  }

  drawFooter(pageNum);

  doc.save(`srs-${workspaceId.slice(0, 8)}-${now.getFullYear()}${String(now.getMonth() + 1).padStart(2, "0")}${String(now.getDate()).padStart(2, "0")}.pdf`);
}
