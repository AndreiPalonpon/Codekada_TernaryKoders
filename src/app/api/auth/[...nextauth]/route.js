import NextAuth from "next-auth";
import GoogleProvider from "next-auth/providers/google";
import dbConnect from "@/lib/mongodb";
import User from "@/models/User";

export const authOptions = {
  providers: [
    GoogleProvider({
      clientId: process.env.GOOGLE_CLIENT_ID,
      clientSecret: process.env.GOOGLE_CLIENT_SECRET,
    }),
  ],
  callbacks: {
    async signIn({ user, account, profile }) {
      if (account.provider === "google") {
        try {
          await dbConnect();
          
          // Check if user exists in our database
          let dbUser = await User.findOne({ email: user.email });
          
          if (!dbUser) {
            // "When a user is created, a db user is created as well"
            dbUser = await User.create({
              name: user.name,
              email: user.email,
              auth_provider_id: account.providerAccountId,
              preferences: {
                preferred_window: 'Morning',
                deep_work_max_minutes: 240,
                buffer_minutes: 15
              },
              integrations: {
                google_calendar: {
                  access_token: account.access_token,
                  refresh_token: account.refresh_token,
                  // Token expiry is usually provided by Google OAuth in expires_at (seconds)
                  token_expiry: account.expires_at ? new Date(account.expires_at * 1000) : undefined
                }
              }
            });
          }
          return true;
        } catch (error) {
          console.error("Error creating user profile during sign in:", error);
          return false;
        }
      }
      return true;
    },
    async session({ session, token }) {
      // Attach the user's MongoDB ObjectId to the session for easy access in API routes
      if (session.user) {
        await dbConnect();
        const dbUser = await User.findOne({ email: session.user.email });
        if (dbUser) {
          session.user.id = dbUser._id.toString();
        }
      }
      return session;
    }
  },
  session: {
    strategy: "jwt",
  },
};

const handler = NextAuth(authOptions);
export { handler as GET, handler as POST };
