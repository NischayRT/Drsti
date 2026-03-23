import { createClient } from '@supabase/supabase-js'

const supabaseUrl = process.env.NEXT_PUBLIC_SUPABASE_URL  || ''
const supabaseKey = process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY || ''

// Custom storage using localStorage with fallback for Electron file:// context
const electronStorage = {
  getItem: (key) => {
    try { return window.localStorage.getItem(key) } catch { return null }
  },
  setItem: (key, value) => {
    try { window.localStorage.setItem(key, value) } catch {}
  },
  removeItem: (key) => {
    try { window.localStorage.removeItem(key) } catch {}
  },
}

export const supabase = createClient(supabaseUrl, supabaseKey, {
  auth: {
    storage:          electronStorage,
    persistSession:   true,
    autoRefreshToken: true,
    detectSessionInUrl: false,  // we handle this manually via deep link
  },
})

const MAX_PER_DAY = 10

export async function saveSession(sessionData, userId) {
  // Accept userId directly to avoid auth re-fetch issues in Electron
  let uid = userId
  if (!uid) {
    const { data: { user } } = await supabase.auth.getUser()
    if (!user) return { error: 'Not logged in' }
    uid = user.id
  }

  const today = new Date()
  today.setHours(0, 0, 0, 0)
  const { count } = await supabase
    .from('sessions')
    .select('id', { count: 'exact', head: true })
    .eq('user_id', uid)
    .gte('created_at', today.toISOString())

  if (count >= MAX_PER_DAY) {
    return { error: `Daily limit of ${MAX_PER_DAY} sessions reached` }
  }

  const { data, error } = await supabase
    .from('sessions')
    .insert({ ...sessionData, user_id: uid })
    .select()
    .single()

  return { data, error }
}

export async function getUserSessions(limit = 50) {
  const { data, error } = await supabase
    .from('sessions')
    .select('*')
    .order('created_at', { ascending: false })
    .limit(limit)
  return { data, error }
}

export async function deleteSession(id) {
  const { error } = await supabase
    .from('sessions')
    .delete()
    .eq('id', id)
  return { error }
}

export async function getTodaySessionCount() {
  const today = new Date()
  today.setHours(0, 0, 0, 0)
  const { count } = await supabase
    .from('sessions')
    .select('id', { count: 'exact', head: true })
    .gte('created_at', today.toISOString())
  return count || 0
}