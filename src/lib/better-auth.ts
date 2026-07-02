import { betterAuth } from 'better-auth';
import { nextCookies } from 'better-auth/next-js';
import { pool } from './db';
import bcrypt from 'bcryptjs';
import crypto from 'crypto';
import { sendVerificationEmail, sendWelcomeEmail, notifyNewRegistration, sendPasswordResetEmail } from './mailer';
import { logActivity } from './activity-logger';

if (!process.env.BETTER_AUTH_SECRET || process.env.BETTER_AUTH_SECRET.length < 32) {
  throw new Error('BETTER_AUTH_SECRET must be defined and at least 32 characters');
}

export const auth = betterAuth({
  database: pool,
  baseURL: process.env.BETTER_AUTH_URL || process.env.NEXT_PUBLIC_APP_URL || 'http://localhost:3000',
  secret: process.env.BETTER_AUTH_SECRET,
  trustedOrigins: ['https://auformat.com', 'https://www.auformat.com'],
  advanced: {
    database: {
      generateId: () => crypto.randomUUID(),
    },
  },

  emailAndPassword: {
    enabled: true,
    // Aucune inscription libre : les comptes sont créés en interne par un admin.
    // Le login des comptes existants reste ouvert ; la définition du mot de passe
    // se fait via « Mot de passe oublié » (sendResetPassword).
    disableSignUp: true,
    requireEmailVerification: false,
    password: {
      hash: async (password) => {
        return bcrypt.hash(password, 12);
      },
      verify: async (data) => {
        return bcrypt.compare(data.password, data.hash);
      },
    },
    sendResetPassword: async ({ user, url }) => {
      void sendPasswordResetEmail(user.email, url);
    },
  },

  emailVerification: {
    sendOnSignUp: true,
    autoSignInAfterVerification: true,
    sendVerificationEmail: async ({ user, url }) => {
      void sendVerificationEmail(user.email, url);
    },
  },

  socialProviders: {
    google: {
      clientId: process.env.GOOGLE_CLIENT_ID || '',
      clientSecret: process.env.GOOGLE_CLIENT_SECRET || '',
      enabled: !!(process.env.GOOGLE_CLIENT_ID && process.env.GOOGLE_CLIENT_SECRET),
    },
  },

  account: {
    accountLinking: {
      // Un profil créé par le commercial (attribution de projet) ou par une demande de
      // devis doit pouvoir être récupéré en se connectant avec Google sur le même email :
      // Google vérifie l'email, la liaison est sûre.
      enabled: true,
      trustedProviders: ['google'],
    },
  },

  session: {
    expiresIn: 7 * 24 * 60 * 60, // 7 days
    updateAge: 24 * 60 * 60, // refresh every 24h
  },

  user: {
    modelName: 'profiles',
    fields: {
      name: 'full_name',
      image: 'avatar_url',
      emailVerified: 'email_verified',
      createdAt: 'created_at',
      updatedAt: 'updated_at',
    },
    additionalFields: {
      role: {
        type: 'string',
        required: false,
        defaultValue: 'client',
        input: false,
      },
      companyName: {
        type: 'string',
        required: false,
        fieldName: 'company_name',
      },
      phone: {
        type: 'string',
        required: false,
      },
      address: {
        type: 'string',
        required: false,
      },
      discountRate: {
        type: 'number',
        required: false,
        defaultValue: 0,
        fieldName: 'discount_rate',
      },
    },
  },

  databaseHooks: {
    user: {
      create: {
        // Verrou anti-inscription : on n'autorise la création d'un utilisateur (y compris via
        // Google) que si un profil existe déjà pour cet email (créé en interne par un admin).
        // La liaison de compte (accountLinking) sur un email existant ne passe PAS par ce hook.
        before: async (user) => {
          const email = String((user as Record<string, unknown>).email || '').toLowerCase().trim();
          if (!email) return false;
          const { rows } = await pool.query('SELECT id FROM profiles WHERE lower(email) = $1 LIMIT 1', [email]);
          if (rows.length === 0) return false; // inscription libre bloquée
          return { data: user };
        },
        after: async (user) => {
          const u = user as Record<string, unknown>;
          const name = String(u.full_name || u.name || u.email || '').split('@')[0];
          void sendWelcomeEmail(String(u.email), name);
          void notifyNewRegistration(name, String(u.email));
          void logActivity(String(u.id), 'register', 'auth', null, { description: `Inscription : ${String(u.email)}` }, 'unknown', 'unknown');
        },
      },
    },
    session: {
      create: {
        after: async (session) => {
          const s = session as Record<string, unknown>;
          const userId = String(s.userId || s.user_id || '');
          const ip = String(s.ipAddress || s.ip_address || 'unknown');
          const ua = String(s.userAgent || s.user_agent || 'unknown');
          void logActivity(userId, 'login', 'auth', null, { description: 'Connexion réussie' }, ip, ua);
        },
      },
    },
  },

  plugins: [nextCookies()],
});

export type Session = typeof auth.$Infer.Session;
