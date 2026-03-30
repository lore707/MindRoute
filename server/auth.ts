import passport from "passport";
import { Strategy as GoogleStrategy } from "passport-google-oauth20";
import { db } from "./db";
import { users } from "@shared/schema";
import { eq } from "drizzle-orm";

export function setupAuth(app: any) {
  passport.use(
    new GoogleStrategy(
      {
        clientID: process.env.GOOGLE_CLIENT_ID!,
        clientSecret: process.env.GOOGLE_CLIENT_SECRET!,
       callbackURL: "https://mindroute-pgav.onrender.com/auth/google/callback",
      },
      async (_accessToken, _refreshToken, profile, done) => {
        try {
          const existing = await db.select().from(users).where(eq(users.googleId, profile.id));
          if (existing.length > 0) {
            return done(null, existing[0]);
          }
          const newUser = await db.insert(users).values({
            googleId: profile.id,
            email: profile.emails?.[0]?.value ?? "",
            name: profile.displayName,
            avatar: profile.photos?.[0]?.value ?? null,
            createdAt: new Date().toISOString(),
          }).returning();
          return done(null, newUser[0]);
        } catch (err) {
          return done(err as Error);
        }
      }
    )
  );

  passport.serializeUser((user: any, done) => done(null, user.id));
  passport.deserializeUser(async (id: number, done) => {
    try {
      const result = await db.select().from(users).where(eq(users.id, id));
      done(null, result[0] ?? null);
    } catch (err) {
      done(err);
    }
  });

app.get("/auth/google", (req: any, res: any, next: any) => {
    const returnTo = (req.query.returnTo as string) || "/";
    req.session.returnTo = returnTo;
    passport.authenticate("google", {
      scope: ["profile", "email"],
      prompt: "select_account"
    })(req, res, next);
  });

  app.get(
    "/auth/google/callback",
    passport.authenticate("google", { failureRedirect: "/" }),
  (req: any, res: any) => {
      console.log("=== OAUTH CALLBACK ===");
      console.log("User:", req.user);
      console.log("Session ID:", req.sessionID);
      console.log("Session:", JSON.stringify(req.session));
      const returnTo = req.session.returnTo || "/";
      delete req.session.returnTo;
      req.session.save((err: any) => {
        if (err) console.error("Session save error:", err);
        console.log("Session saved, redirecting to:", returnTo);
        res.redirect(returnTo);
      });
    }
  );

  app.get("/auth/logout", (req: any, res: any) => {
    req.logout(() => {
      res.redirect("/");
    });
  });

  app.get("/api/auth/me", (req: any, res: any) => {
    if (req.user) {
      res.json(req.user);
    } else {
      res.status(401).json({ message: "Non autenticato" });
    }
  });
}

