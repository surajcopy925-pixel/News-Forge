import withAuth from 'next-auth/middleware';

export default withAuth({
  pages: {
    signIn: '/login',
  },
});

export const config = {
  matcher: [
    /*
     * Match all request paths except for the ones starting with:
     * - login
     * - api/auth (NextAuth API routes)
     * - api/events (SSE)
     * - api/prompter
     * - api/upload
     * - api/files
     * - api/debug-schema
     * - api/debug-clips
     * - api/caspar/playlists (Playout server access)
     * - api/rundowns (Playout server access)
     * - _next/static (static files)
     * - _next/image (image optimization files)
     * - favicon.ico (favicon file)
     */
    '/((?!login|newsroom-connect\\.html|api/auth|api/events|api/prompter|api/upload|api/files|api/debug-schema|api/debug-clips|api/caspar/playlists|api/rundowns|_next/static|_next/image|favicon.ico).*)',
  ],
};
