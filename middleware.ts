import { getToken } from "next-auth/jwt";
import { NextRequest, NextResponse } from "next/server";

export async function middleware(req: NextRequest) {
  const token = await getToken({ req, secret: process.env.NEXTAUTH_SECRET });

  if (!token) {
    return NextResponse.redirect(new URL("/login", req.url));
  }

  return NextResponse.next();
}

export const config = {
  // Защищаем всё кроме страниц входа/регистрации и статики
  matcher: ["/((?!login|register|api/auth|_next/static|_next/image|favicon.ico).*)"],
};
