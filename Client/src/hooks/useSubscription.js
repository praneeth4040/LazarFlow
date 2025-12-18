import { useState, useEffect } from 'react'
import { supabase } from '../lib/supabaseClient'
import { useAuth } from './useAuth'

export const useSubscription = () => {
    const { user } = useAuth()
    const [tier, setTier] = useState('free') // free, ranked, competitive, premier
    const [tournamentsCreated, setTournamentsCreated] = useState(0)
    const [loading, setLoading] = useState(true)

    // Feature Flags & Limits
    const [maxLayouts, setMaxLayouts] = useState(1)
    const [maxAILobbies, setMaxAILobbies] = useState(2)
    const [canUseAI, setCanUseAI] = useState(true)
    const [canCustomSocial, setCanCustomSocial] = useState(false)
    const [isCasual, setIsCasual] = useState(true)

    useEffect(() => {
        if (!user) {
            setLoading(false)
            return
        }

        const fetchSubscription = async () => {
            try {
                const { data: profile, error } = await supabase
                    .from('profiles')
                    .select('subscription_tier, tournaments_created_count')
                    .eq('id', user.id)
                    .single()

                if (error) throw error

                const currentTier = profile?.subscription_tier?.toLowerCase() || 'free'
                const count = profile?.tournaments_created_count || 0

                setTier(currentTier)
                setTournamentsCreated(count)

                // Define Limits based on Tier
                let aiLimit = 2 // Default for Free
                let layoutLimit = 1
                let customSocial = false

                switch (currentTier) {
                    case 'developer':
                        aiLimit = Infinity
                        layoutLimit = Infinity
                        customSocial = true
                        break
                    case 'premier':
                        aiLimit = 150
                        layoutLimit = 5
                        customSocial = true
                        break
                    case 'competitive':
                        aiLimit = 100
                        layoutLimit = 5
                        customSocial = true
                        break
                    case 'ranked':
                        aiLimit = 60
                        layoutLimit = 3
                        customSocial = true
                        break
                    case 'free':
                    default:
                        aiLimit = 2
                        if (count < aiLimit) {
                            layoutLimit = 3 // Trial perks
                            customSocial = true // Trial perks
                        } else {
                            layoutLimit = 1 // Casual restrictions
                            customSocial = false
                        }
                        break
                }

                setMaxAILobbies(aiLimit)

                // Determine Capabilities
                const aiAvailable = count < aiLimit
                setCanUseAI(aiAvailable)

                // Effective Casual Mode check
                const casualState = currentTier === 'free' && !aiAvailable
                setIsCasual(casualState)

                setMaxLayouts(layoutLimit)
                setCanCustomSocial(customSocial)

            } catch (err) {
                console.error('Error fetching subscription:', err)
            } finally {
                setLoading(false)
            }
        }

        fetchSubscription()

        // Realtime subscription for profile updates
        const subscription = supabase
            .channel('profile_subscription')
            .on('postgres_changes', {
                event: 'UPDATE',
                schema: 'public',
                table: 'profiles',
                filter: `id=eq.${user.id}`
            }, payload => {
                if (payload.new) {
                    fetchSubscription()
                }
            })
            .subscribe()

        return () => {
            subscription.unsubscribe()
        }
    }, [user])

    return {
        tier,
        tournamentsCreated,
        loading,
        limits: {
            maxAILobbies,
            maxLayouts,
        },
        features: {
            canUseAI,
            canCustomSocial,
            isCasual
        }
    }
}

