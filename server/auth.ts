import passport from "passport";
import { Strategy as GoogleStrategy } from "passport-google-oauth20";
import rateLimit from "express-rate-limit";
import { db } from "./db";
import { users } from "@shared/schema";
import { eq } from "drizzle-orm";

// Gate condiviso: blocca le funzioni che richiedono un account (quiz +
// generazione itinerario). Passport popola req.user dalla sessione; se manca
// l'utente è anonimo e rispondiamo 401 così il client può mandare al login.
export function requireAuth(req: any, res: any, next: any) {
  if (req.user) return next();
  return res.status(401).json({ message: "Devi accedere per usare questa funzione." });
}

const authRateLimit = rateLimit({
  windowMs: 15 * 60 * 1000, // 15 minuti
  max: 20,
  standardHeaders: true,
  legacyHeaders: false,
  message: { message: "Troppi tentativi, riprova tra 15 minuti." },
});

// Il redirect_uri OAuth deve seguire il dominio da cui arriva l'utente, non
// essere fisso: altrimenti chi entra da mindroute.co viene rimandato da Google
// sul dominio dell'env (onrender) e finisce loggato sul dominio sbagliato.
// trust proxy:1 fa sì che protocol=https e host=dominio pubblico su Render.
// NB: ogni host pubblico va aggiunto agli "Authorized redirect URIs" in Google
// Cloud Console. L'env GOOGLE_CALLBACK_URL resta come fallback (host assente).
function callbackURLFor(req: any): string {
  const host = req.get?.("host");
  if (host) return `${req.protocol || "https"}://${host}/auth/google/callback`;
  return process.env.GOOGLE_CALLBACK_URL || "http://localhost:5000/auth/google/callback";
}

export function setupAuth(app: any) {
  passport.use(
    new GoogleStrategy(
      {
        clientID: process.env.GOOGLE_CLIENT_ID!,
        clientSecret: process.env.GOOGLE_CLIENT_SECRET!,
        callbackURL: process.env.GOOGLE_CALLBACK_URL || "http://localhost:5000/auth/google/callback",
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
          // Flag effimero (vive solo per questa richiesta: serializeUser salva
          // solo l'id, deserializeUser rilegge la riga senza il flag). Lo usa il
          // callback per mandare un utente NUOVO dritto al quiz invece che a una
          // dashboard vuota.
          return done(null, { ...newUser[0], isNewSignup: true });
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

app.get("/auth/google", authRateLimit, (req: any, res: any, next: any) => {
    const returnTo = (req.query.returnTo as string) || "/";
    req.session.returnTo = returnTo;
    passport.authenticate("google", {
      scope: ["profile", "email"],
      prompt: "select_account",
      callbackURL: callbackURLFor(req),
    } as any)(req, res, next);
  });

  app.get(
    "/auth/google/callback",
    // callbackURL dev'essere identico a quello dell'andata (Google valida il
    // redirect_uri allo scambio del code) → ricalcolato dallo stesso host.
    (req: any, res: any, next: any) =>
      passport.authenticate("google", {
        failureRedirect: "/",
        callbackURL: callbackURLFor(req),
      } as any)(req, res, next),
  (req: any, res: any) => {
      // No PII in logs: non logghiamo user/email/sessione. Solo errori di save.
      // Utente nuovo → quiz (onboarding), non la dashboard vuota. Per chi ha già
      // un profilo si rispetta il returnTo (dove stava prima del login).
      const returnTo = req.session.returnTo || "/";
      delete req.session.returnTo;
      const dest = req.user?.isNewSignup ? "/profiling" : returnTo;
      req.session.save((err: any) => {
        if (err) console.error("Session save error:", err);
        res.redirect(dest);
      });
    }
  );

  app.get("/auth/logout", authRateLimit, (req: any, res: any) => {
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

