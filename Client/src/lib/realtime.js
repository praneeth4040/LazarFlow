import { supabase } from './supabaseClient'

/**
 * Centralized Supabase realtime helpers
 * All subscriptions return a cleanup function (unsubscribe)
 */

/**
 * Subscribe to tournaments for a specific user.
 * Triggers callback on INSERT / UPDATE / DELETE.
 */
export const subscribeToUserTournaments = (userId, callback) => {
  if (!userId) return () => {}

  const channel = supabase
    .channel(`tournaments-user-${userId}`)
    .on(
      'postgres_changes',
      {
        event: '*',
        schema: 'public',
        table: 'tournaments',
        filter: `user_id=eq.${userId}`,
      },
      (payload) => {
        callback?.(payload)
      },
    )
    .subscribe()

  return () => {
    supabase.removeChannel(channel)
  }
}

/**
 * Subscribe to teams for a specific tournament.
 * Triggers callback on INSERT / UPDATE / DELETE.
 */
export const subscribeToTournamentTeams = (tournamentId, callback) => {
  if (!tournamentId) return () => {}

  console.log('🛰️ Subscribing to tournament_teams realtime for tournament:', tournamentId)

  const channel = supabase
    .channel(`tournament-teams-${tournamentId}`)
    .on(
      'postgres_changes',
      {
        event: '*',
        schema: 'public',
        table: 'tournament_teams',
        filter: `tournament_id=eq.${tournamentId}`,
      },
      (payload) => {
        console.log('🔁 Realtime event on tournament_teams:', payload)
        callback?.(payload)
      },
    )
    .subscribe()

  return () => {
    console.log('📡 Unsubscribing from tournament_teams realtime for tournament:', tournamentId)
    supabase.removeChannel(channel)
  }
}

export default {
  subscribeToUserTournaments,
  subscribeToTournamentTeams,
}


