import { createClient } from '@supabase/supabase-js';

const supabaseUrl = 'https://hqqhivgvyrpmqrdonxip.supabase.co';

const supabaseAnonKey = 'eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpc3MiOiJzdXBhYmFzZSIsInJlZiI6ImhxcWhpdmd2eXJwbXFyZG9ueGlwIiwicm9sZSI6ImFub24iLCJpYXQiOjE3NjMwMjM5MTAsImV4cCI6MjA3ODU5OTkxMH0.dhXTgNvvEXdfcSrgKj6mSQwWvZTZFXIlxNn4seU9spQ';

export const supabase = createClient(supabaseUrl, supabaseAnonKey);