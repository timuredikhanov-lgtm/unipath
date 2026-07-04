import { getServerSession } from "next-auth";
import { authOptions } from "@/lib/auth";
import { prisma } from "@/lib/prisma";

const DAILY_LIMIT = 20;

export async function GET(req: Request) {
  const session = await getServerSession(authOptions);
  if (!session?.user) {
    return Response.json({ error: "Unauthorized" }, { status: 401 });
  }

  const userId = (session.user as { id: string }).id;
  const { searchParams } = new URL(req.url);
  const mode = searchParams.get("mode") ?? "advisor";

  const [dbSession, user] = await Promise.all([
    prisma.session.findFirst({
      where: { userId, mode },
      orderBy: { createdAt: "desc" },
      include: {
        messages: {
          orderBy: { createdAt: "asc" },
          select: { id: true, role: true, content: true },
        },
      },
    }),
    prisma.user.findUnique({
      where: { id: userId },
      select: { messagesUsed: true, lastResetDate: true },
    }),
  ]);

  let used = user?.messagesUsed ?? 0;
  if (user?.lastResetDate) {
    const today = new Date().toDateString();
    const lastReset = new Date(user.lastResetDate).toDateString();
    if (today !== lastReset) used = 0;
  }

  return Response.json({
    sessionId: dbSession?.id ?? null,
    messages: dbSession?.messages ?? [],
    remaining: Math.max(0, DAILY_LIMIT - used),
  });
}
