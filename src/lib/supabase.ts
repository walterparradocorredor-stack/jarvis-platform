import { createClient } from '@supabase/supabase-js';

const supabaseUrl =
  process.env.NEXT_PUBLIC_SUPABASE_URL || 'https://www.waltherparrado.com/supabase-api';

const supabaseAnonKey =
  process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY ||
  'eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJyb2xlIjoiYW5vbiIsImlzcyI6InN1cGFiYXNlIiwiaWF0IjoxNzg2NTU1MTI0LCJleHAiOjIxMDE5MTUxMjR9.gxsX0XhFm7uw7JjCJ5NB1g4K9Z8V_pRUkaLPHQo6Ps0';

export const supabase = createClient(supabaseUrl, supabaseAnonKey);
