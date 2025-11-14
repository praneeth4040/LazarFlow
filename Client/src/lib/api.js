import axios from 'axios'
import { supabase } from './supabaseClient'

const API_BASE_URL = import.meta.env.VITE_API_URL || 'http://localhost:5000/api'

// Create axios instance with base URL
const apiClient = axios.create({
  baseURL: API_BASE_URL,
  headers: {
    'Content-Type': 'application/json',
  },
})

// Add token to requests
apiClient.interceptors.request.use(async (config) => {
  try {
    const { data: { session }, error } = await supabase.auth.getSession()
    if (session) {
      console.log('✅ Token attached to request')
      config.headers.Authorization = `Bearer ${session.access_token}`
    } else {
      console.log('⚠️ No session found')
    }
  } catch (err) {
    console.error('Error getting session:', err)
  }
  return config
})

// Tournament API calls
export const tournamentAPI = {
  // Create new tournament
  create: async (tournamentData) => {
    try {
      const response = await apiClient.post('/tournaments', tournamentData)
      return response.data
    } catch (error) {
      console.error('Error creating tournament:', error)
      throw error
    }
  },

  // Get all tournaments
  getAll: async () => {
    try {
      const response = await apiClient.get('/tournaments')
      return response.data
    } catch (error) {
      console.error('Error fetching tournaments:', error)
      throw error
    }
  },

  // Get single tournament
  getById: async (id) => {
    try {
      const response = await apiClient.get(`/tournaments/${id}`)
      return response.data
    } catch (error) {
      console.error('Error fetching tournament:', error)
      throw error
    }
  },

  // Update tournament
  update: async (id, tournamentData) => {
    try {
      const response = await apiClient.put(`/tournaments/${id}`, tournamentData)
      return response.data
    } catch (error) {
      console.error('Error updating tournament:', error)
      throw error
    }
  },

  // Delete tournament
  delete: async (id) => {
    try {
      const response = await apiClient.delete(`/tournaments/${id}`)
      return response.data
    } catch (error) {
      console.error('Error deleting tournament:', error)
      throw error
    }
  },
}

// Health check
export const healthCheck = async () => {
  try {
    const response = await apiClient.get('/health')
    return response.data
  } catch (error) {
    console.error('Health check failed:', error)
    throw error
  }
}

export default apiClient
