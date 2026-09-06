import { NextResponse, type NextRequest } from "next/server";

/**
 * Barreira de borda (convenção `proxy` do Next 16): bloqueia rotas privadas para quem não tem cookie
 * de sessão e evita que quem já está logado volte ao /login.
 *
 * A checagem fina (cargo, permissão por página) acontece no servidor,
 * dentro de cada página, via requirePage() — o middleware roda no Edge,
 * onde Prisma e bcrypt não estão disponíveis.
 */
const PUBLIC_PATHS = ["/login", "/api/auth"];

function hasSessionCookie(req: NextRequest) {
  return Boolean(
    req.cookies.get("authjs.session-token") ??
      req.cookies.get("__Secure-authjs.session-token"),
  );
}

export default function proxy(req: NextRequest) {
  const { pathname, search } = req.nextUrl;
  const isPublic = PUBLIC_PATHS.some(
    (p) => pathname === p || pathname.startsWith(`${p}/`),
  );
  const logged = hasSessionCookie(req);

  if (!logged && !isPublic) {
    const url = new URL("/login", req.url);
    if (pathname !== "/") url.searchParams.set("next", `${pathname}${search}`);
    return NextResponse.redirect(url);
  }

  if (logged && pathname === "/login") {
    return NextResponse.redirect(new URL("/inicio", req.url));
  }

  return NextResponse.next();
}

export const config = {
  // tudo, menos assets estáticos e o favicon
  matcher: ["/((?!_next/static|_next/image|favicon.ico|.*\\.(?:svg|png|jpg|jpeg|webp|gif|ico)$).*)"],
};
