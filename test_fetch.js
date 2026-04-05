import fetch from 'node-fetch';
import jwt from 'jsonwebtoken';

const SUPABASE_URL = process.env.VITE_SUPABASE_URL || 'https://xhdoupxnpjbzkzuhucpp.supabase.co';
const SUPABASE_KEY = process.env.VITE_SUPABASE_ANON_KEY;
const JWT_SECRET = process.env.VITE_SUPABASE_JWT_SECRET; // This isn't exported in frontend usually, but wait, do I have the service key? I can just use supabase-js with an email/pg?

// wait, I don't have the password.
