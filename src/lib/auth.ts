import type { NextAuthOptions } from "next-auth";
import GoogleProvider from "next-auth/providers/google";

import dbConnect from "@/lib/mongodb";
import User from "@/models/User";

type GoogleTokenSet = {
  providerAccountId?: string;
  access_token?: string;
  refresh_token?: string;
  expires_at?: number;
};

type DatabaseUser = {
  _id: {
    toString: () => string;
  };
};

const getRequiredEnv = (key: "GOOGLE_CLIENT_ID" | "GOOGLE_CLIENT_SECRET") => {
  const value = process.env[key];

  if (!value) {
    throw new Error(`Missing required environment variable: ${key}`);
  }

  return value;
};

export const authOptions: NextAuthOptions = {
  providers: [
    GoogleProvider({
      clientId: getRequiredEnv("GOOGLE_CLIENT_ID"),
      clientSecret: getRequiredEnv("GOOGLE_CLIENT_SECRET"),
      authorization: {
        params: {
          scope:
            "openid email profile https://www.googleapis.com/auth/calendar.readonly",
          access_type: "offline",
          prompt: "consent",
        },
      },
    }),
  ],
  callbacks: {
    async redirect({ url, baseUrl }) {
      if (url.startsWith("/")) {
        return `${baseUrl}${url}`;
      }

      if (new URL(url).origin === baseUrl) {
        return url;
      }

      return baseUrl;
    },
    async signIn({ user, account }) {
      if (account?.provider !== "google" || !user.email) {
        return true;
      }

      const googleAccount: GoogleTokenSet = account;

      try {
        await dbConnect();

        const tokenExpiry = googleAccount.expires_at
          ? new Date(googleAccount.expires_at * 1000)
          : undefined;

        const existingUser = await User.findOne({ email: user.email });

        if (!existingUser) {
          await User.create({
            name: user.name ?? user.email,
            email: user.email,
            auth_provider_id: googleAccount.providerAccountId ?? user.email,
            preferences: {
              preferred_window: "Morning",
              deep_work_max_minutes: 240,
              buffer_minutes: 15,
            },
            integrations: {
              google_calendar: {
                access_token: googleAccount.access_token,
                refresh_token: googleAccount.refresh_token,
                token_expiry: tokenExpiry,
              },
            },
          });
        } else {
          const tokenUpdate: Record<string, unknown> = {
            "integrations.google_calendar.access_token":
              googleAccount.access_token,
            "integrations.google_calendar.token_expiry": tokenExpiry,
          };

          if (googleAccount.refresh_token) {
            tokenUpdate["integrations.google_calendar.refresh_token"] =
              googleAccount.refresh_token;
          }

          await User.updateOne({ email: user.email }, { $set: tokenUpdate });
        }

        return true;
      } catch (error) {
        console.error("Error creating user profile during sign in:", error);
        return true;
      }
    },
    async session({ session }) {
      if (!session.user?.email) {
        return session;
      }

      try {
        await dbConnect();

        const dbUser = (await User.findOne({
          email: session.user.email,
        }).lean()) as DatabaseUser | null;

        if (dbUser) {
          session.user.id = dbUser._id.toString();
        }
      } catch (error) {
        console.error("Error loading user profile for session:", error);
      }

      return session;
    },
  },
  pages: {
    signIn: "/login",
  },
  session: {
    strategy: "jwt",
  },
  secret: process.env.NEXTAUTH_SECRET,
};
