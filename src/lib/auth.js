import GoogleProvider from "next-auth/providers/google";
import dbConnect from "@/lib/mongodb";
import User from "@/models/User";

const GOOGLE_CALENDAR_SCOPES = [
  "https://www.googleapis.com/auth/calendar.events",
  "https://www.googleapis.com/auth/calendar.freebusy",
];

export const authOptions = {
  providers: [
    GoogleProvider({
      clientId: process.env.GOOGLE_CLIENT_ID,
      clientSecret: process.env.GOOGLE_CLIENT_SECRET,
      authorization: {
        params: {
          scope: `openid email profile ${GOOGLE_CALENDAR_SCOPES.join(" ")}`,
          access_type: "offline",
          prompt: "consent",
        },
      },
    }),
  ],
  callbacks: {
    async signIn({ user, account }) {
      if (account.provider === "google") {
        try {
          await dbConnect();

          const tokenUpdate = {
            "integrations.google_calendar.access_token": account.access_token,
            "integrations.google_calendar.token_expiry": account.expires_at
              ? new Date(account.expires_at * 1000)
              : undefined,
          };

          // Google may only send a refresh token during the consent flow.
          if (account.refresh_token) {
            tokenUpdate["integrations.google_calendar.refresh_token"] = account.refresh_token;
          }

          const dbUser = await User.findOneAndUpdate(
            { email: user.email },
            {
              $setOnInsert: {
                name: user.name,
                email: user.email,
                auth_provider_id: account.providerAccountId,
                preferences: {
                  preferred_window: "Morning",
                  deep_work_max_minutes: 240,
                  buffer_minutes: 15,
                },
              },
              $set: tokenUpdate,
            },
            { new: true, upsert: true }
          );

          return Boolean(dbUser);
        } catch (error) {
          console.error("Error creating/updating user profile during sign in:", error);
          return false;
        }
      }
      return true;
    },
    async session({ session }) {
      // Attach the user's MongoDB ObjectId to the session for easy access in API routes.
      if (session.user) {
        await dbConnect();
        const dbUser = await User.findOne({ email: session.user.email });
        if (dbUser) {
          session.user.id = dbUser._id.toString();
        }
      }
      return session;
    },
  },
  session: {
    strategy: "jwt",
  },
};
