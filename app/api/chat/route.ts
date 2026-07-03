import { anthropic } from "@ai-sdk/anthropic";
import { streamText, tool } from "ai";
import { z } from "zod";
import { prisma } from "@/lib/prisma";
import { readFileSync } from "fs";
import { join } from "path";

export const maxDuration = 60;

async function tavilySearch(query: string) {
  console.log("[web_search] запрос:", query);
  const res = await fetch("https://api.tavily.com/search", {
    method: "POST",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify({
      api_key: process.env.TAVILY_API_KEY,
      query,
      max_results: 5,
      include_answer: false,
    }),
  });
  const data = await res.json();
  const results = (data.results ?? []).map((r: { title: string; url: string; content: string }) => ({
    title: r.title,
    url: r.url,
    content: r.content,
  }));
  console.log("[web_search] найдено результатов:", results.length, results.map((r: { url: string }) => r.url));
  return results;
}
import { getServerSession } from "next-auth";
import { authOptions } from "@/lib/auth";

const MAX_HISTORY = 20;
const DAILY_LIMIT = 20;

const prompts: Record<string, string> = {
  advisor: readFileSync(join(process.cwd(), "prompts/advisor.md"), "utf-8"),
  mock_admissions: readFileSync(join(process.cwd(), "prompts/mock_admissions.md"), "utf-8"),
  essay_editor: readFileSync(join(process.cwd(), "prompts/essay_editor.md"), "utf-8"),
};

export async function POST(req: Request) {
  const session = await getServerSession(authOptions);
  if (!session?.user) {
    return Response.json({ error: "Unauthorized" }, { status: 401 });
  }

  const userId = (session.user as { id: string }).id;

  // Проверяем дневной лимит
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

  // Сбрасываем счётчик при новом дне
  if (needsReset) {
    await prisma.user.update({
      where: { id: userId },
      data: { messagesUsed: 0, lastResetDate: today },
    });
  }

  const { messages, sessionId: clientSessionId, userProfile, mode } = await req.json();
  const systemPrompt = prompts[mode as string] ?? prompts.advisor;

  // Создаём сессию если нет
  let sessionId = clientSessionId as string | undefined;
  if (!sessionId) {
    const newSession = await prisma.session.create({ data: { userId } });
    sessionId = newSession.id;
  }

  // Сохраняем сообщение пользователя
  const lastUserMessage = messages[messages.length - 1];
  if (lastUserMessage?.role === "user") {
    await prisma.message.create({
      data: { sessionId, role: "user", content: lastUserMessage.content },
    });
  }

  // Увеличиваем счётчик
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
      console.log("[chat] шагов агента:", steps?.length ?? 1, steps?.length > 1 ? "→ использовал инструменты" : "→ ответил из памяти");
      if (sessionId) {
        await prisma.message.create({
          data: { sessionId, role: "assistant", content: text },
        });
      }
    },
  });

  // Возвращаем sessionId в заголовке — клиент сохранит его для следующих запросов
  const response = result.toDataStreamResponse();
  const headers = new Headers(response.headers);
  headers.set("X-Session-Id", sessionId);

  return new Response(response.body, { status: response.status, headers });
}
