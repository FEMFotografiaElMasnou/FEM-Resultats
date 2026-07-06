import { createClient } from '@supabase/supabase-js'

const SUPABASE_URL = 'https://ogqqcgbgcqowvywaolln.supabase.co'
const SUPABASE_KEY = 'eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpc3MiOiJzdXBhYmFzZSIsInJlZiI6Im9ncXFjZ2JnY3Fvd3Z5d2FvbGxuIiwicm9sZSI6ImFub24iLCJpYXQiOjE3NzM0OTYzNTIsImV4cCI6MjA4OTA3MjM1Mn0.f4JGoy2BQmir9veKMp_Fk1GqjMGGbMr4YMUK1iH9wfM'

export const db = createClient(SUPABASE_URL, SUPABASE_KEY)
