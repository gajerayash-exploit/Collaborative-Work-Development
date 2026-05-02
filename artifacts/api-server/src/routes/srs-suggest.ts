import { Router, type IRouter } from "express";
import { requireAuth } from "../middlewares/requireAuth";
import { openai } from "@workspace/integrations-openai-ai-server";

const router: IRouter = Router();

type SRSNode = {
  id: string;
  title: string;
  description?: string;
  category: string;
  priority: string;
};

type ExistingEdge = {
  source: string;
  target: string;
};

type Suggestion = {
  fromId: string;
  toId: string;
  fromTitle: string;
  toTitle: string;
  reason: string;
  confidence: "high" | "medium" | "low";
};

router.post("/srs/suggest", requireAuth, async (req: any, res): Promise<void> => {
  try {
    const { nodes, edges } = req.body as { nodes: SRSNode[]; edges: ExistingEdge[] };

    if (!nodes || !Array.isArray(nodes) || nodes.length < 2) {
      res.json({ suggestions: [] });
      return;
    }

    const existingPairs = new Set(
      (edges ?? []).map((e: ExistingEdge) => `${e.source}→${e.target}`)
    );

    const nodeList = nodes
      .map(n => `- id="${n.id}" title="${n.title}" category=${n.category} priority=${n.priority}${n.description ? ` desc="${n.description.slice(0, 80)}"` : ""}`)
      .join("\n");

    const existingEdgeList = (edges ?? [])
      .map((e: ExistingEdge) => {
        const src = nodes.find(n => n.id === e.source)?.title ?? e.source;
        const tgt = nodes.find(n => n.id === e.target)?.title ?? e.target;
        return `${src} → ${tgt}`;
      })
      .join(", ") || "none";

    const prompt = `You are a software architecture expert analyzing a Software Requirements Specification (SRS) dependency graph.

NODES:
${nodeList}

EXISTING EDGES (already connected): ${existingEdgeList}

Your task: Suggest up to 6 missing but logically necessary directed edges between these nodes. Only suggest connections that are NOT already listed above.

Respond with a JSON array (no markdown, no explanation outside the array):
[
  {
    "fromId": "<node id>",
    "toId": "<node id>",
    "reason": "<one sentence why this link is architecturally important>",
    "confidence": "high" | "medium" | "low"
  }
]

Rules:
- Only use ids that exist in the NODES list above
- Never suggest the reverse of an already existing edge as a new suggestion if the forward already exists
- Prioritize: auth→api, api→database, ui→api, functional dependencies, constraint enforcement
- confidence=high if clearly required, medium if recommended, low if optional but useful
- Return an empty array [] if no good suggestions exist`;

    const response = await openai.chat.completions.create({
      model: "gpt-5-mini",
      max_completion_tokens: 1024,
      messages: [{ role: "user", content: prompt }],
    });

    const raw = response.choices[0]?.message?.content?.trim() ?? "[]";
    let parsed: Array<{ fromId: string; toId: string; reason: string; confidence: string }> = [];
    try {
      const jsonStart = raw.indexOf("[");
      const jsonEnd = raw.lastIndexOf("]");
      if (jsonStart !== -1 && jsonEnd !== -1) {
        parsed = JSON.parse(raw.slice(jsonStart, jsonEnd + 1));
      }
    } catch {
      parsed = [];
    }

    const nodeIdSet = new Set(nodes.map(n => n.id));
    const suggestions: Suggestion[] = parsed
      .filter(s =>
        s.fromId && s.toId &&
        nodeIdSet.has(s.fromId) && nodeIdSet.has(s.toId) &&
        s.fromId !== s.toId &&
        !existingPairs.has(`${s.fromId}→${s.toId}`)
      )
      .slice(0, 6)
      .map(s => ({
        fromId: s.fromId,
        toId: s.toId,
        fromTitle: nodes.find(n => n.id === s.fromId)?.title ?? s.fromId,
        toTitle: nodes.find(n => n.id === s.toId)?.title ?? s.toId,
        reason: s.reason ?? "",
        confidence: (["high", "medium", "low"].includes(s.confidence) ? s.confidence : "medium") as Suggestion["confidence"],
      }));

    res.json({ suggestions });
    return;
  } catch (err) {
    req.log.error({ err }, "SRS suggest failed");
    res.status(500).json({ error: "Suggestion failed" });
    return;
  }
});

export default router;
