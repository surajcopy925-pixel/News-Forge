import 'next-auth';

declare module 'next-auth' {
  interface User {
    userId: string;
    role: string;
  }

  interface Session {
    user: {
      userId: string;
      fullName: string;
      email: string;
      role: string;
    };
  }
}

declare module 'next-auth/jwt' {
  interface JWT {
    userId: string;
    role: string;
    fullName: string;
  }
}
