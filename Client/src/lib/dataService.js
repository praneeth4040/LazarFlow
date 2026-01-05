import { supabase } from './supabaseClient'

export const getCurrentUser = async () => {
  const { data: { user } } = await supabase.auth.getUser()
  return user || null
}

const slugify = (str) => {
  return (str || '')
    .toLowerCase()
    .replace(/[^a-z0-9]+/g, '-')
    .replace(/^-+|-+$/g, '')
}

const generateShareId = (name) => {
  const base = slugify(name || 'tournament')
  const rand = Math.random().toString(36).slice(2, 8)
  return `${base}-${rand}`
}

export const getUserThemes = async () => {
  const user = await getCurrentUser()
  if (!user) return []
  const { data: profile, error } = await supabase
    .from('profiles')
    .select('theme_config')
    .eq('id', user.id)
    .single()
  if (error) return []
  const tc = profile?.theme_config
  if (Array.isArray(tc)) return tc
  if (tc && typeof tc === 'object') return [tc]
  return []
}

export const getLatestUserTheme = async () => {
  const arr = await getUserThemes()
  return arr[arr.length - 1] || {}
}

export const appendThemeToProfile = async (theme) => {
  const user = await getCurrentUser()
  if (!user) throw new Error('User not authenticated')
  const { data: existing } = await supabase
    .from('profiles')
    .select('theme_config')
    .eq('id', user.id)
    .single()
  const current = existing?.theme_config
  let next
  if (Array.isArray(current)) {
    next = [...current, { ...theme }]
  } else if (current && typeof current === 'object' && Object.keys(current).length > 0) {
    next = [current, { ...theme }]
  } else {
    next = [{ ...theme }]
  }
  const { error } = await supabase
    .from('profiles')
    .update({ theme_config: next })
    .eq('id', user.id)
  if (error) throw error
  return next
}

export const uploadThemeFile = async (path, file) => {
  const { error } = await supabase.storage.from('themes').upload(path, file)
  if (error) throw error
  const { data } = supabase.storage.from('themes').getPublicUrl(path)
  return data.publicUrl
}

export const uploadBackgroundImage = async (file) => {
  const fileName = `${Date.now()}-${file.name.replace(/[^a-zA-Z0-9.-]/g, '_')}`
  return uploadThemeFile(fileName, file)
}

export const uploadAsset = async (file) => {
  const fileName = `assets/${Date.now()}-${file.name.replace(/[^a-zA-Z0-9.-]/g, '_')}`
  return uploadThemeFile(fileName, file)
}

export const getTournamentById = async (id) => {
  const { data, error } = await supabase
    .from('lobbies')
    .select('*')
    .eq('id', id)
    .single()
  if (error) throw error
  return data
}

export const getTournamentByLiveId = async (liveid) => {
  // Try public share_id first
  const { data: byShare, error: shareErr } = await supabase
    .from('lobbies')
    .select('*')
    .eq('share_id', liveid)
    .eq('is_public', true)
    .single()
  if (!shareErr && byShare) return byShare

  // Fallback to direct id (for authenticated usage or legacy links)
  const { data: byId, error: idErr } = await supabase
    .from('lobbies')
    .select('*')
    .eq('id', liveid)
    .single()
  if (idErr) throw idErr
  return byId
}

export const getTournamentTeams = async (tournamentId) => {
  const { data, error } = await supabase
    .from('lobby_teams')
    .select('*')
    .eq('lobby_id', tournamentId)
  if (error) throw error
  return data || []
}

export const updateTournamentTheme = async (id, theme) => {
  const { error } = await supabase
    .from('lobbies')
    .update({ theme_config: theme })
    .eq('id', id)
  if (error) throw error
  return true
}

export const ensureTournamentPublicAndShareId = async (id, name) => {
  // Fetch current tournament to check share_id
  const { data: current } = await supabase
    .from('lobbies')
    .select('share_id,is_public')
    .eq('id', id)
    .single()

  const nextShareId = current?.share_id || generateShareId(name)
  const { data, error } = await supabase
    .from('lobbies')
    .update({ is_public: true, share_id: nextShareId })
    .eq('id', id)
    .select()
  if (error) throw error
  return data?.[0] || { id, share_id: nextShareId, is_public: true }
}

export const setUserThemes = async (themes) => {
  const user = await getCurrentUser()
  if (!user) throw new Error('User not authenticated')
  const { error } = await supabase
    .from('profiles')
    .update({ theme_config: themes })
    .eq('id', user.id)
  if (error) throw error
  return themes
}

export const deleteThemeByIndex = async (index) => {
  const arr = await getUserThemes()
  if (index < 0 || index >= arr.length) return arr
  const next = arr.filter((_, i) => i !== index)
  await setUserThemes(next)
  return next
}

export const renameThemeByIndex = async (index, name) => {
  const arr = await getUserThemes()
  if (index < 0 || index >= arr.length) return arr
  const next = arr.map((t, i) => i === index ? { ...t, name } : t)
  await setUserThemes(next)
  return next
}

export const updateThemeByIndex = async (index, theme) => {
  const arr = await getUserThemes()
  if (index < 0 || index >= arr.length) {
    throw new Error('Invalid theme index')
  }
  const next = arr.map((t, i) => i === index ? { ...theme } : t)
  await setUserThemes(next)
  return next
}

export const createTournament = async (tournamentData, userId) => {
  const { data, error } = await supabase
    .from('lobbies')
    .insert([
      {
        name: tournamentData.name,
        user_id: userId,
        status: 'active',
        game: tournamentData.game,
        points_system: tournamentData.pointsSystem,
        kill_points: tournamentData.killPoints
      }
    ])
    .select()

  if (error) throw error
  return data?.[0]
}
