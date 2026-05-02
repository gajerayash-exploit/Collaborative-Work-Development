import { db, activityEventsTable } from "@workspace/db";

export async function recordActivity(params: {
  workspaceId: string;
  userId: string;
  type: string;
  payload: Record<string, unknown>;
}): Promise<void> {
  try {
    await db.insert(activityEventsTable).values({
      workspaceId: params.workspaceId,
      userId: params.userId,
      type: params.type,
      payload: params.payload,
    });
  } catch {
    // Fire-and-forget; never throw
  }
}
