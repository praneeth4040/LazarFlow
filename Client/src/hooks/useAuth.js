import { useState, useEffect, useCallback } from 'react'
import { useNavigate } from 'react-router-dom'
import { supabase } from '../lib/supabaseClient'

export const useAuth = () => {
    const [user, setUser] = useState(null)
    const [loading, setLoading] = useState(true)
    const navigate = useNavigate()

    const checkUser = useCallback(async () => {
        try {
            const { data: { user } } = await supabase.auth.getUser()
            if (!user) {
                navigate('/login')
            } else {
                setUser(user)
            }
        } catch (error) {
            console.error('Error checking user:', error)
            navigate('/login')
        } finally {
            setLoading(false)
        }
    }, [navigate])

    useEffect(() => {
        checkUser()

        const { data: authListener } = supabase.auth.onAuthStateChange(async (event, session) => {
            if (event === 'SIGNED_IN') {
                setUser(session.user)
            } else if (event === 'SIGNED_OUT') {
                navigate('/login')
            }
        })

        return () => {
            authListener.subscription.unsubscribe()
        }
    }, [navigate, checkUser])

    const logout = async () => {
        try {
            await supabase.auth.signOut()
            navigate('/login')
        } catch (error) {
            console.error('Error logging out:', error)
        }
    }

    return { user, loading, logout }
}
