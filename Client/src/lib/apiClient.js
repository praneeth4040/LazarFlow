import axios from 'axios'

/**
 * Centralized API Configuration
 * All backend API calls should use this configured axios instance
 */

// Base URL for all API requests
const BASE_URL = import.meta.env.VITE_API_BASE_URL || 'http://localhost:5000'

// Create axios instance with default config
const apiClient = axios.create({
    baseURL: BASE_URL,
    timeout: 0, // No timeout - AI processing can take time
    headers: {
        'Content-Type': 'application/json',
    }
})

// Request interceptor for logging
apiClient.interceptors.request.use(
    (config) => {
        console.log(`📡 API Request: ${config.method.toUpperCase()} ${config.baseURL}${config.url}`)
        return config
    },
    (error) => {
        console.error('❌ Request Error:', error)
        return Promise.reject(error)
    }
)

// Response interceptor for logging and error handling
apiClient.interceptors.response.use(
    (response) => {
        console.log(`✅ API Response: ${response.config.method.toUpperCase()} ${response.config.url} - ${response.status}`)
        return response
    },
    (error) => {
        if (error.response) {
            // Server responded with error status
            console.error(`❌ API Error: ${error.response.status} - ${error.response.data?.error || error.message}`)
        } else if (error.request) {
            // Request made but no response
            console.error('❌ Network Error: No response from server')
        } else {
            // Something else happened
            console.error('❌ Error:', error.message)
        }
        return Promise.reject(error)
    }
)

/**
 * Export configured axios instance
 * Usage: apiClient.post('/api/endpoint', data)
 */
export default apiClient
