import { withAuth } from 'next-auth/middleware';

export default withAuth({
  pages: {
    signIn: '/login',
  },
});

export const config = {
  matcher: [
    '/((?!login|api/auth|api/events|api/prompter|api/upload|api/files|api/debug-schema|api/debug-clips|_next/static|_next/image|favicon.ico).*)',
  ],
};
