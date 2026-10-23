import { cookies } from "next/headers";
import { NextResponse } from "next/server";
import { getDb, getSessionUser } from "@/lib/db";
import { executeAgentResponse, fallbackAgentResponse } from "@/lib/execute";
import { demandsVerification, fallbackScore, judgePrompt } from "@/lib/judge";
import { getQuest } from "@/lib/quests";
import { allowLlmCall, MAX_PROMPT_CHARS } from "@/lib/usage";

export async function POST(req: Request) {
  let body: { questId?: string; prompt?: string };
  try {
    body = await req.json();
  } catch {
    return NextResponse.json({ error: "bad json" }, { status: 400 });
  }

  const questId = (body.questId ?? "").trim();
  const prompt = (body.prompt ?? "").toString().slice(0, MAX_PROMPT_CHARS);
  const quest = getQuest(questId);
  if (!quest?.rubric?.length || !quest.artifact) {
    return NextResponse.json({ error: "unknown prompting quest" }, { status: 400 });
  }
  if (!prompt.trim()) {
    return NextResponse.json({ error: "prompt required" }, { status: 400 });
  }

  const db = getDb();

  // Judge the prompt and run it with this quest's context, concurrently. The natural
  // agent response is shown to the student; the verdict powers the private coach.
  // Over the usage budget, both come from the offline fallbacks instead.
  const [verdict, executed] = allowLlmCall(db, req)
    ? await Promise.all([judgePrompt(quest, prompt), executeAgentResponse(quest, prompt)])
    : [fallbackScore(quest, prompt), null];

  const response = executed ?? fallbackAgentResponse(quest, verdict.tier);
  const responseFallback = executed === null;

  // p4 only: the same deterministic check the executor used to decide whether to plant
  // the fake facts, so the FLAGGED takeover can never disagree with the response shown.
  const trapSprung = quest.id === "p4" && !demandsVerification(prompt);

  const jar = await cookies();
  const user = getSessionUser(db, jar.get("pai_user")?.value);
  if (user) {
      db.prepare(
        `INSERT INTO attempts (user_id, quest_id, prompt, score, tier, feedback, missing, submitted)
         VALUES (?, ?, ?, ?, ?, ?, ?, 0)`,
      ).run(user.id, questId, prompt, verdict.score, verdict.tier, verdict.advice, JSON.stringify(verdict.missing));
  }

  return NextResponse.json({ verdict, response, responseFallback, trapSprung });
}
