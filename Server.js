const express = require("express");
const app = express();
const http = require("http");
const path = require("path");
const { Server } = require("socket.io");
const ACTIONS = require("./src/Actions"); // Ensure this path is correct

const server = http.createServer(app);

const io = new Server(server, {
    cors: {
        origin: ["http://localhost:3000", "http://localhost:5173"],
        methods: ["GET", "POST"],
    },
});
app.use(express.static('build'));
app.use((req,res,next)=>{
res.sendFile(path.join(__dirname,'build','index.html'));
})
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

io.on("connection", (socket) => {
    console.log("Socket connected:", socket.id);

    // User joins a room
    socket.on(ACTIONS.JOIN, ({ roomId, username }) => {
        userSocketMap[socket.id] = username;
        socket.join(roomId);

        const clients = getAllConnectedClients(roomId);

        // Emit updated list to everyone in the room
        io.in(roomId).emit(ACTIONS.JOINED, {
            clients,
            username,
            socketId: socket.id,
        });
    });

    // Code changes broadcast
    socket.on(ACTIONS.CODE_CHANGE, ({ roomId, code }) => {
        socket.to(roomId).emit(ACTIONS.CODE_CHANGE, { code });
    });

    // Sync code to a specific socket
    socket.on(ACTIONS.SYNC_CODE, ({ socketId, code }) => {
        io.to(socketId).emit(ACTIONS.CODE_CHANGE, { code });
    });

    // Handle disconnect
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

// Serve React build
const buildPath = path.join(__dirname, "build");
app.use(express.static(buildPath));

// Catch-all route for React (works safely with Node 25+)
app.use((req, res) => {
    res.sendFile(path.join(buildPath, "index.html"));
});

// Start server
const PORT = process.env.PORT || 5000;
server.listen(PORT, () => {
    console.log(`Server running on port ${PORT}`);
});