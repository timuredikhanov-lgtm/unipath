import { createOpenAI } from "@ai-sdk/openai";

const openrouter = createOpenAI({
  baseURL: "https://openrouter.ai/api/v1",
  apiKey: process.env.OPENROUTER_API_KEY,
});
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
essay_editor: readFileSync(join(process.cwd(), "prompts/essay_editor.md"), "utf-8"),
  athlete_mode: readFileSync(join(process.cwd(), "prompts/athlete_mode.md"), "utf-8"),
  phd_block: readFileSync(join(process.cwd(), "prompts/phd_mode.md"), "utf-8"),
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

    const resolvedMode = (prompts[mode as string] ? mode : "advisor") as string;
    const basePrompt = prompts[resolvedMode];
    const isPhd = (userProfile?.level as string | undefined)?.toLowerCase().includes("phd");
    const systemPrompt = (resolvedMode === "advisor" && isPhd)
      ? basePrompt + "\n\n" + prompts.phd_block
      : basePrompt;
    console.log(`[chat:${rid}] промт: ${resolvedMode}${isPhd ? "+phd_block" : ""} | файл найден: ${resolvedMode !== mode ? `(mode "${mode}" не найден, fallback→advisor)` : "да"}`);

    let sessionId = clientSessionId as string | undefined;
    if (!sessionId) {
      const newSession = await prisma.session.create({ data: { userId, mode: resolvedMode } });
      sessionId = newSession.id;
    }

    const lastUserMessage = messages[messages.length - 1];
    if (lastUserMessage?.role === "user") {
      await prisma.message.create({
        data: { sessionId, role: "user", content: lastUserMessage.content },
      });
    }

    const profileNote = userProfile
      ? `\n\n## Профиль пользователя\n- Имя: ${userProfile.name}\n- Целевые страны: ${userProfile.countries.join(", ")}\n- Уровень программы: ${userProfile.level}\n- Планируемый год поступления: ${userProfile.year}\n\nОбращайся к пользователю по имени, склоняя его по падежам как в живой русской речи (именительный — «Тимур, смотри», родительный — «у Тимура», дательный — «советую Тимуру»). Если имя необычное и ты не уверен в форме — используй именительный падеж в обращении, не выдумывай неправильную форму. Учитывай этот профиль при ответах.`
      : "";

    const result = streamText({
      model: openrouter("deepseek/deepseek-chat"),
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
        if (text.length > 0 && sessionId) {
          // списываем сообщение только после успешного ответа
          await Promise.all([
            prisma.message.create({
              data: { sessionId, role: "assistant", content: text },
            }),
            prisma.user.update({
              where: { id: userId },
              data: { messagesUsed: { increment: 1 } },
            }),
          ]);
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
