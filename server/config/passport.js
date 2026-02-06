import passport from "passport";
import { Strategy as GoogleStrategy } from "passport-google-oauth20";
import prisma from "../db.js";

const {
  GOOGLE_CLIENT_ID,
  GOOGLE_CLIENT_SECRET,
  GOOGLE_CALLBACK_URL,
} = process.env;

if (!GOOGLE_CLIENT_ID || !GOOGLE_CLIENT_SECRET) {
  console.warn("⚠️ Google OAuth not configured. Skipping GoogleStrategy.");
} else {
  passport.use(
    new GoogleStrategy(
      {
        clientID: GOOGLE_CLIENT_ID,
        clientSecret: GOOGLE_CLIENT_SECRET,
        callbackURL: GOOGLE_CALLBACK_URL,
      },
      async (accessToken, refreshToken, profile, done) => {
        try {
          const email = profile.emails?.[0]?.value;
          const googleId = profile.id;
          const profilePicture = profile.photos?.[0]?.value;

          if (!email) {
            return done(new Error("Google account has no email"), null);
          }

          // 1️⃣ Check by googleId
          let user = await prisma.user.findFirst({
            where: { googleId },
          });

          if (user) {
            return done(null, user);
          }

          // 2️⃣ Account linking by email
          user = await prisma.user.findUnique({
            where: { email },
          });

          if (user) {
            user = await prisma.user.update({
              where: { email },
              data: {
                googleId,
                authProvider: "google",
                profilePicture,
                isVerified: true,
              },
            });
            return done(null, user);
          }

          // 3️⃣ Create new user
          user = await prisma.user.create({
            data: {
              email,
              googleId,
              authProvider: "google",
              profilePicture,
              isVerified: true,
              needsUsername: true,
            },
          });

          return done(null, user);
        } catch (error) {
          return done(error, null);
        }
      }
    )
  );
}

export default passport;
