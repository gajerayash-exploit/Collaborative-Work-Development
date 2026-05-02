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

type GeneratedNode = {
  title: string;
  description: string;
  category: "functional" | "database" | "auth" | "api" | "constraint" | "ui";
  priority: "critical" | "high" | "medium" | "low";
  suggestedEdges: Array<{
    targetId: string;
    direction: "to" | "from";
    reason: string;
  }>;
};

router.post("/srs/generate-node", requireAuth, async (req: any, res): Promise<void> => {
  try {
    const { prompt, nodes } = req.body as { prompt: string; nodes: SRSNode[] };

    if (!prompt || typeof prompt !== "string" || prompt.trim().length === 0) {
      res.status(400).json({ error: "prompt is required" });
      return;
    }

    const nodeList = (nodes ?? [])
      .map(n => `- id="${n.id}" title="${n.title}" category=${n.category} priority=${n.priority}`)
      .join("\n") || "  (none yet)";

    const systemPrompt = `You are a software architecture expert that creates SRS (Software Requirements Specification) nodes for a dependency graph.

EXISTING NODES IN THE GRAPH:
${nodeList}

The user wants to add a new node described as: "${prompt.trim()}"

Respond with ONLY a single valid JSON object (no markdown, no code fences):
{
  "title": "<concise 2-5 word title for the requirement>",
  "description": "<1-2 sentence technical description of this requirement>",
  "category": "<exactly one of: functional, database, auth, api, constraint, ui>",
  "priority": "<exactly one of: critical, high, medium, low>",
  "suggestedEdges": [
    {
      "targetId": "<id of an existing node this should connect to>",
      "direction": "<'to' means new→existing, 'from' means existing→new>",
      "reason": "<why this connection is important>"
    }
  ]
}

Rules:
- suggestedEdges should only reference IDs from the EXISTING NODES list
- Suggest 1-3 edges maximum, only the most architecturally important ones
- If no existing nodes are relevant, return an empty suggestedEdges array
- Pick category based on what the requirement primarily involves
- Pick priority based on how critical it is to system correctness`;

    const response = await openai.chat.completions.create({
      model: "gpt-5-mini",
      max_completion_tokens: 512,
      messages: [{ role: "user", content: systemPrompt }],
    });

    const raw = response.choices[0]?.message?.content?.trim() ?? "{}";
    let parsed: Partial<GeneratedNode> = {};
    try {
      const jsonStart = raw.indexOf("{");
      const jsonEnd = raw.lastIndexOf("}");
      if (jsonStart !== -1 && jsonEnd !== -1) {
        parsed = JSON.parse(raw.slice(jsonStart, jsonEnd + 1));
      }
    } catch {
      parsed = {};
    }

    const VALID_CATEGORIES = ["functional", "database", "auth", "api", "constraint", "ui"] as const;
    const VALID_PRIORITIES = ["critical", "high", "medium", "low"] as const;
    const existingIds = new Set((nodes ?? []).map(n => n.id));

    const result: GeneratedNode = {
      title: typeof parsed.title === "string" && parsed.title.trim() ? parsed.title.trim().slice(0, 60) : prompt.trim().slice(0, 40),
      description: typeof parsed.description === "string" ? parsed.description.trim().slice(0, 200) : "",
      category: VALID_CATEGORIES.includes(parsed.category as GeneratedNode["category"])
        ? (parsed.category as GeneratedNode["category"])
        : "functional",
      priority: VALID_PRIORITIES.includes(parsed.priority as GeneratedNode["priority"])
        ? (parsed.priority as GeneratedNode["priority"])
        : "medium",
      suggestedEdges: (parsed.suggestedEdges ?? [])
        .filter((e): e is GeneratedNode["suggestedEdges"][number] =>
          typeof e === "object" && e !== null &&
          typeof e.targetId === "string" && existingIds.has(e.targetId) &&
          (e.direction === "to" || e.direction === "from")
        )
        .slice(0, 3),
    };

    res.json(result);
    return;
  } catch (err) {
    req.log.error({ err }, "SRS generate-node failed");
    res.status(500).json({ error: "Generation failed" });
    return;
  }
});

export default router;
