import axios from 'axios'

/**
 * LazarFlow API Client
 * Configured for production backend at https://www.api.lazarflow.app
 */

// Production API URL (includes www to avoid 307 redirects)
const PROD_API_URL = 'https://www.api.lazarflow.app'

// Use environment variable if set, otherwise default to production
const BASE_URL = import.meta.env.VITE_API_BASE_URL || PROD_API_URL

// Create axios instance
const apiClient = axios.create({
    baseURL: BASE_URL,
    timeout: 300000, // 5 minutes timeout for long AI operations
    headers: {
        'Content-Type': 'application/json',
        'Accept': 'application/json'
    }
})

// Request Logger
apiClient.interceptors.request.use(
    (config) => {
        // Ensure trailing slash is handled if needed, or clean up
        console.log(`� Sending Request: ${config.method.toUpperCase()} ${config.baseURL}${config.url}`)
        return config
    },
    (error) => {
        console.error('❌ Request Failed to send:', error)
        return Promise.reject(error)
    }
)

// Response Handler
apiClient.interceptors.response.use(
    (response) => {
        console.log(`✅ Request Successful: ${response.config.url} (${response.status})`)
        return response
    },
    (error) => {
        if (error.response) {
            // The request was made and the server responded with a status code
            // that falls out of the range of 2xx
            console.error('❌ Server Error:', {
                status: error.response.status,
                data: error.response.data,
                url: error.config.url
            })
        } else if (error.request) {
            // The request was made but no response was received
            console.error('❌ Network Error (No Response):', error.message)
            console.error('This might be a CORS issue or the server is unreachable.')
        } else {
            // Something happened in setting up the request that triggered an Error
            console.error('❌ Client Error:', error.message)
        }
        return Promise.reject(error)
    }
)

export default apiClient
