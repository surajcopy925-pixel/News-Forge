import { NextAuthOptions } from 'next-auth';
import CredentialsProvider from 'next-auth/providers/credentials';
import bcrypt from 'bcryptjs';
import { prisma } from './prisma';

export const authOptions: NextAuthOptions = {
  providers: [
    CredentialsProvider({
      name: 'NewsForge',
      credentials: {
        email: { label: 'Email', type: 'email', placeholder: 'user@newsforge.com' },
        password: { label: 'Password', type: 'password' },
      },
      async authorize(credentials) {
        if (!credentials?.email || !credentials?.password) {
          return null;
        }

        const user = await prisma.user.findUnique({
          where: { email: credentials.email },
        });

        if (!user || !user.passwordHash) {
          return null;
        }

        const isValid = await bcrypt.compare(credentials.password, user.passwordHash);
        if (!isValid) {
          return null;
        }

        return {
          id: user.userId,
          userId: user.userId,
          name: user.fullName,
          email: user.email,
          role: user.role,
        };
      },
    }),
  ],

  session: {
    strategy: 'jwt',
    maxAge: 12 * 60 * 60, // 12 hours (one broadcast day)
  },

  callbacks: {
    async jwt({ token, user }) {
      if (user) {
        token.userId = (user as any).userId;
        token.role = (user as any).role;
        token.fullName = user.name ?? '';
      }
      return token;
    },
    async session({ session, token }) {
      session.user = {
        userId: token.userId,
        fullName: token.fullName,
        email: token.email ?? '',
        role: token.role,
      };
      return session;
    },
  },

  pages: {
    signIn: '/login',
  },

  secret: process.env.NEXTAUTH_SECRET,
};
