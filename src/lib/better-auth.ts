import { betterAuth } from 'better-auth';
import { nextCookies } from 'better-auth/next-js';
import { pool } from './db';
import bcrypt from 'bcryptjs';
import crypto from 'crypto';
import { sendVerificationEmail, sendWelcomeEmail, notifyNewRegistration, sendPasswordResetEmail } from './mailer';
import { logActivity } from './activity-logger';

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
