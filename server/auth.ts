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
        callbackURL: "/auth/google/callback",
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

  app.get("/auth/google", passport.authenticate("google", { scope: ["profile", "email"] }));

  app.get(
    "/auth/google/callback",
    passport.authenticate("google", { failureRedirect: "/" }),
    (_req: any, res: any) => {
      res.redirect("/destinations");
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
```

---

**MODIFICA 3 — Aggiorna `server/index.ts`**

**Cerca:**
```
import express, { type Request, Response, NextFunction } from "express";
import { registerRoutes } from "./routes";
import { serveStatic } from "./static";
import { createServer } from "http";
const app = express();
const httpServer = createServer(app);
```

**Sostituisci con:**
```
import express, { type Request, Response, NextFunction } from "express";
import session from "express-session";
import passport from "passport";
import { registerRoutes } from "./routes";
import { serveStatic } from "./static";
import { setupAuth } from "./auth";
import { createServer } from "http";
const app = express();
const httpServer = createServer(app);

app.use(session({
  secret: process.env.SESSION_SECRET || "fallback_secret",
  resave: false,
  saveUninitialized: false,
  cookie: { secure: process.env.NODE_ENV === "production", maxAge: 30 * 24 * 60 * 60 * 1000 }
}));
app.use(passport.initialize());
app.use(passport.session());
setupAuth(app);
