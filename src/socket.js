import { io } from 'socket.io-client';

export const initSocket = async () => {
    const options = {
        'force new connection': true,
        reconnectionAttempts: Infinity,
        timeout: 10000,
        transports: ['websocket'],
    };

    const backendUrl =
        process.env.NODE_ENV === 'production'
            ? 'https://realtime-editor-wotd.onrender.com'
            : 'http://localhost:5000';

    return io(backendUrl, options);
};