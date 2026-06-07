import { withAuth } from "next-auth/middleware";

export default withAuth({
  callbacks: {
    authorized({ req, token }) {
      if (!token) {
        return false;
      }

      if (req.nextUrl.pathname.startsWith("/admin")) {
        return token.role === "ADMIN";
      }

      return true;
    },
  },
  pages: {
    signIn: "/auth/signin",
  },
});

export const config = {
  matcher: [
    "/dashboard/:path*",
    "/matches/:path*",
    "/pre-tournament/:path*",
    "/ranking/:path*",
    "/admin/:path*",
  ],
};
