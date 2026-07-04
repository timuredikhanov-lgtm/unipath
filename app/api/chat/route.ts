import { anthropic } from "@ai-sdk/anthropic";
import { streamText, tool } from "ai";
import { z } from "zod";
import { prisma } from "@/lib/prisma";
import { getServerSession } from "next-auth";
import { authOptions } from "@/lib/auth";
import { readFileSync } from "fs";
import { join } from "path";

export const maxDuration = 60;

const MAX_HISTORY = 20;
const DAILY_LIMIT = 20;

const prompts: Record<string, string> = {
  advisor: readFileSync(join(process.cwd(), "prompts/advisor.md"), "utf-8"),
  mock_admissions: readFileSync(join(process.cwd(), "prompts/mock_admissions.md"), "utf-8"),
  essay_editor: readFileSync(join(process.cwd(), "prompts/essay_editor.md"), "utf-8"),
};

async function tavilySearch(query: string) {
  console.log("[web_search] запрос:", query);
  try {
    const res = await fetch("https://api.tavily.com/search", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({
        api_key: process.env.TAVILY_API_KEY,
        query,
        max_results: 5,
        include_answer: false,
      }),
      signal: AbortSignal.timeout(8000),
    });
    if (!res.ok) {
      console.error("[web_search] HTTP ошибка:", res.status);
      return [];
    }
    const data = await res.json();
    const results = (data.results ?? []).map((r: { title: string; url: string; content: string }) => ({
      title: r.title,
      url: r.url,
      content: r.content,
    }));
    console.log("[web_search] найдено:", results.length, results.map((r: { url: string }) => r.url));
    return results;
  } catch (err) {
    console.error("[web_search] ошибка:", err instanceof Error ? err.message : err);
    return [];
  }
}

export async function POST(req: Request) {
  const rid = Math.random().toString(36).slice(2, 7);
  console.log(`[chat:${rid}] запрос получен`);

  try {
    const session = await getServerSession(authOptions);
    if (!session?.user) {
      return Response.json({ error: "Unauthorized" }, { status: 401 });
    }

    const userId = (session.user as { id: string }).id;

    const user = await prisma.user.findUnique({
      where: { id: userId },
      select: { messagesUsed: true, lastResetDate: true },
    });

    if (!user) {
      return Response.json({ error: "User not found" }, { status: 404 });
    }

    const today = new Date();
    const needsReset = new Date(user.lastResetDate).toDateString() !== today.toDateString();
    const used = needsReset ? 0 : user.messagesUsed;

    if (used >= DAILY_LIMIT) {
      return Response.json(
        { error: "Дневной лимит исчерпан. Приходите завтра или напишите нам для расширенного доступа." },
        { status: 429 }
      );
    }

    if (needsReset) {
      await prisma.user.update({
        where: { id: userId },
        data: { messagesUsed: 0, lastResetDate: today },
      });
    }

    const { messages, sessionId: clientSessionId, userProfile, mode } = await req.json();
    console.log(`[chat:${rid}] режим: ${mode} | промт: ${!!(prompts[mode as string])}`);

    const systemPrompt = prompts[mode as string] ?? prompts.advisor;

    let sessionId = clientSessionId as string | undefined;
    if (!sessionId) {
      const newSession = await prisma.session.create({ data: { userId } });
      sessionId = newSession.id;
    }

    const lastUserMessage = messages[messages.length - 1];
    if (lastUserMessage?.role === "user") {
      await prisma.message.create({
        data: { sessionId, role: "user", content: lastUserMessage.content },
      });
    }

    await prisma.user.update({
      where: { id: userId },
      data: { messagesUsed: { increment: 1 } },
    });

    const profileNote = userProfile
      ? `\n\n## Профиль пользователя\n- Имя: ${userProfile.name}\n- Целевые страны: ${userProfile.countries.join(", ")}\n- Уровень программы: ${userProfile.level}\n- Планируемый год поступления: ${userProfile.year}\n\nОбращайся к пользователю по имени. Учитывай этот профиль при ответах.`
      : "";

    const result = streamText({
      model: anthropic("claude-sonnet-4-6"),
      system: systemPrompt + profileNote,
      messages: messages.slice(-MAX_HISTORY),
      maxSteps: 5,
      tools: {
        web_search: tool({
          description: "Search the web for current university information: deadlines, tuition, requirements, programs",
          parameters: z.object({
            query: z.string().describe("Search query in English"),
          }),
          execute: async ({ query }) => tavilySearch(query),
        }),
      },
      onFinish: async ({ text, steps }) => {
        const stepsCount = steps?.length ?? 1;
        console.log(`[chat:${rid}] завершён | шагов: ${stepsCount} | символов: ${text.length}`);
        if (sessionId) {
          await prisma.message.create({
            data: { sessionId, role: "assistant", content: text },
          });
        }
      },
    });

    const response = result.toDataStreamResponse();
    const headers = new Headers(response.headers);
    headers.set("X-Session-Id", sessionId);

    console.log(`[chat:${rid}] стрим запущен`);
    return new Response(response.body, { status: response.status, headers });

  } catch (err) {
    const msg = err instanceof Error ? err.message : String(err);
    console.error(`[chat:${rid}] критическая ошибка:`, msg);
    return Response.json({ error: "Произошла ошибка на сервере. Попробуйте ещё раз." }, { status: 500 });
  }
}
