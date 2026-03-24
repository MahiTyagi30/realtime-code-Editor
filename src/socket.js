import { io } from 'socket.io-client';

export const initSocket = async () => {
    const options = {
        'force new connection': true,
        reconnectionAttempts: 'Infinity', // Fixed typo (added 's')
        timeout: 10000,
        transports: ['websocket'],
    };
    
    // FIX: Added fallback to http://localhost:5000 if env variable is missing
    const backendUrl = process.env.REACT_APP_BACKEND_URL || 'http://localhost:5000';
    
    return io(backendUrl, options);
};