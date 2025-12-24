import axios from 'axios';

const BASE_URL = 'https://www.api.lazarflow.app';

const apiClient = axios.create({
    baseURL: BASE_URL,
    timeout: 300000,
    headers: {
        'Content-Type': 'application/json',
        'Accept': 'application/json',
    },
});

apiClient.interceptors.request.use(
    (config) => {
        console.log(` Sending Request: ${config.method.toUpperCase()} ${config.baseURL}${config.url}`);
        return config;
    },
    (error) => {
        console.error('❌ Request Failed to send:', error);
        return Promise.reject(error);
    }
);

apiClient.interceptors.response.use(
    (response) => {
        console.log(`✅ Request Successful: ${response.config.url} (${response.status})`);
        return response;
    },
    (error) => {
        if (error.response) {
            console.error('❌ Server Error:', {
                status: error.response.status,
                data: error.response.data,
                url: error.config.url,
            });
        } else {
            console.error('❌ Client/Network Error:', error.message);
        }
        return Promise.reject(error);
    }
);

export default apiClient;
