const express = require("express");
const app = express();
const http = require("http");
const path = require("path");
const { Server } = require("socket.io");
const ACTIONS = require("./src/Actions");

const server = http.createServer(app);

// ✅ Socket.io setup with proper CORS
const io = new Server(server, {
    cors: {
        origin: "*", // allow all origins (you can restrict later)
        methods: ["GET", "POST"],
    },
});

// Store connected users
const userSocketMap = {};

// Helper: get all clients in a room
function getAllConnectedClients(roomId) {
    const room = io.sockets.adapter.rooms.get(roomId) || new Set();
    return Array.from(room).map((socketId) => ({
        socketId,
        username: userSocketMap[socketId],
    }));
}

// Socket connection
io.on("connection", (socket) => {
    console.log("Socket connected:", socket.id);

    // Join room
    socket.on(ACTIONS.JOIN, ({ roomId, username }) => {
        userSocketMap[socket.id] = username;
        socket.join(roomId);

        const clients = getAllConnectedClients(roomId);

        io.in(roomId).emit(ACTIONS.JOINED, {
            clients,
            username,
            socketId: socket.id,
        });
    });

    // Code change
    socket.on(ACTIONS.CODE_CHANGE, ({ roomId, code }) => {
        socket.to(roomId).emit(ACTIONS.CODE_CHANGE, { code });
    });

    // Sync code
    socket.on(ACTIONS.SYNC_CODE, ({ socketId, code }) => {
        io.to(socketId).emit(ACTIONS.CODE_CHANGE, { code });
    });

    // Disconnect
    socket.on("disconnecting", () => {
        const rooms = [...socket.rooms];

        rooms.forEach((roomId) => {
            socket.to(roomId).emit(ACTIONS.DISCONNECTED, {
                socketId: socket.id,
                username: userSocketMap[socket.id],
            });
        });

        delete userSocketMap[socket.id];
    });
});

// ✅ Serve React build (IMPORTANT)
const buildPath = path.join(__dirname, "build");
app.use(express.static(buildPath));

// Catch-all route for React
app.get("*", (req, res) => {
    res.sendFile(path.join(buildPath, "index.html"));
});

// ✅ Start server (Render uses process.env.PORT)
const PORT = process.env.PORT || 5000;

server.listen(PORT, () => {
    console.log(`Server running on port ${PORT}`);
});