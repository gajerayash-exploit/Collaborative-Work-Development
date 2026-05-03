import { Router, type IRouter } from "express";
import { db, messagesTable, usersTable, workspaceMembersTable } from "@workspace/db";
import { eq, and, gte, isNull } from "drizzle-orm";
import { requireAuth } from "../middlewares/requireAuth";
import { openai } from "@workspace/integrations-openai-ai-server";

const router: IRouter = Router();

/** Strip @[Name|userId] → @Name */
function stripMentions(text: string): string {
  return text.replace(/@\[([^\]|]+)\|[^\]]+\]/g, "@$1");
}

const SYSTEM_PROMPT = `You are an expert team assistant. A team member is catching up after being away. Summarize the chat conversation they missed.

Respond using EXACTLY this structure (keep the emoji headers as written):

## 🗓 What happened
- [2–6 bullet points covering the main topics discussed — be specific, not generic]

## ✅ Decisions made
- [Any conclusions, agreements, or choices the team landed on — or write "None noted."]

## 📋 Action items
- [Format: "@Person — what they said they would do", or "None noted." if no tasks were mentioned]

## 👥 Who was active
[Comma-separated list of names of people who sent messages]

Rules:
- Be factual. Only state what is actually in the messages.
- Be concise. Each bullet ≤ 20 words.
- Mentions like @[Name|id] should be written as @Name.
- Skip pleasantries, greetings, and off-topic chatter.
- If a section has nothing relevant, write exactly: None noted.
- Do NOT add any text before the first ## header or after the last section.`;

router.get(
  "/workspaces/:workspaceId/ai/catchup",
  requireAuth,
  async (req: any, res): Promise<void> => {
    const { workspaceId } = req.params;
    const clerkId = req.clerkUserId;
    const hours = Math.min(Math.max(parseInt((req.query.hours as string) ?? "24", 10), 1), 168);

    const user = await db
      .select()
      .from(usersTable)
      .where(eq(usersTable.clerkId, clerkId))
      .limit(1);
    if (!user[0]) {
      res.status(404).json({ error: "User not found" });
      return;
    }

    const membership = await db
      .select()
      .from(workspaceMembersTable)
      .where(
        and(
          eq(workspaceMembersTable.workspaceId, workspaceId),
          eq(workspaceMembersTable.userId, user[0].id),
        ),
      )
      .limit(1);
    if (!membership[0]) {
      res.status(403).json({ error: "Access denied" });
      return;
    }

    const since = new Date(Date.now() - hours * 60 * 60 * 1000);

    const msgs = await db
      .select({
        content: messagesTable.content,
        senderName: usersTable.name,
        createdAt: messagesTable.createdAt,
      })
      .from(messagesTable)
      .innerJoin(usersTable, eq(messagesTable.senderId, usersTable.id))
      .where(
        and(
          eq(messagesTable.workspaceId, workspaceId),
          isNull(messagesTable.parentMessageId),
          gte(messagesTable.createdAt, since),
        ),
      )
      .orderBy(messagesTable.createdAt)
      .limit(200);

    if (msgs.length === 0) {
      res.setHeader("Content-Type", "text/event-stream");
      res.setHeader("Cache-Control", "no-cache");
      res.setHeader("Connection", "keep-alive");
      res.write(
        `data: ${JSON.stringify({ content: `No messages found in the last ${hours} hour${hours !== 1 ? "s" : ""}.` })}\n\n`,
      );
      res.write(`data: ${JSON.stringify({ done: true, messageCount: 0 })}\n\n`);
      res.end();
      return;
    }

    const transcript = msgs
      .map(
        (m) =>
          `[${new Date(m.createdAt).toLocaleTimeString("en-US", { hour: "2-digit", minute: "2-digit" })}] ${m.senderName}: ${stripMentions(m.content)}`,
      )
      .join("\n");

    const userPrompt = `Here is the last ${hours} hour${hours !== 1 ? "s" : ""} of team chat (${msgs.length} message${msgs.length !== 1 ? "s" : ""}):\n\n${transcript}`;

    res.setHeader("Content-Type", "text/event-stream");
    res.setHeader("Cache-Control", "no-cache");
    res.setHeader("Connection", "keep-alive");
    // Send message count immediately so UI can show it
    res.write(`data: ${JSON.stringify({ messageCount: msgs.length })}\n\n`);

    try {
      const stream = await openai.chat.completions.create({
        model: "gpt-5-mini",
        max_completion_tokens: 1024,
        messages: [
          { role: "system", content: SYSTEM_PROMPT },
          { role: "user", content: userPrompt },
        ],
        stream: true,
      });

      for await (const chunk of stream) {
        const content = chunk.choices[0]?.delta?.content;
        if (content) {
          res.write(`data: ${JSON.stringify({ content })}\n\n`);
        }
      }

      res.write(`data: ${JSON.stringify({ done: true, messageCount: msgs.length })}\n\n`);
      res.end();
    } catch (err) {
      req.log.error({ err }, "OpenAI catchup failed");
      res.write(`data: ${JSON.stringify({ error: "AI summarization failed. Please try again." })}\n\n`);
      res.end();
    }
  },
);

export default router;
