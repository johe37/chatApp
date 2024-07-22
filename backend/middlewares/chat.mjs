import { Server as socketIo } from 'socket.io';
import { wrap, corsConfig } from '../middlewares/session.mjs';
import { getUsername } from '../utils/helpers.mjs';

let io;
let connectedUsers = {};
let rooms = {}; // Store room information including messages

function emitActiveUsersList() {
  const uniqueUsernames = [...new Set(Object.values(connectedUsers))];
  io.emit('updateActiveUsers', uniqueUsernames);
}

function emitPreviousMessages(socket, roomName) {
  if (rooms[roomName] && rooms[roomName].messages) {
    const messages = rooms[roomName].messages;
    // console.log(`Emitting ${messages.length} previous messages for room ${roomName}`);
    socket.emit('previousMessages', messages);
  } else {
    // console.log(`No messages found for room ${roomName}`);
    socket.emit('previousMessages', []);
  }
}

function emitChatMessage(socket, roomName) {
  socket.on('chatMessage', (message) => {
    const timestamp = new Date().toISOString(); // Use ISO string for timestamp
    const username = connectedUsers[socket.id];
    const msgObj = { timestamp, username, message };
    console.log(`Chat message - User ${username}: ${message}`);
    rooms[roomName].messages.push(msgObj);
    io.to(roomName).emit('chatMessage', msgObj); // Broadcast message to all clients in the room
  });
}

function handleDisconnect(socket) {
  socket.on('disconnect', () => {
    const username = connectedUsers[socket.id];
    delete connectedUsers[socket.id];
    emitActiveUsersList();
    console.log(`${username} (${socket.id}) disconnected`);
  });
}

export default function initializeChatSocket(server, sessionMiddleware) {
  io = new socketIo(server, {
    cors: {
      origin: corsConfig.origin, // Corrected the origin
      credentials: corsConfig.credentials,
      methods: ['GET', 'POST']
    }
  });

  io.use(wrap(sessionMiddleware));

  io.on('connection', async (socket) => {
    const sessionId = socket.request.session?.passport?.user;
    if (sessionId) {
      const sessionUsername = await getUsername(sessionId);
      const userSocketId = socket.id;
      connectedUsers[userSocketId] = sessionUsername;

      // const keysAndValues = Object.keys(connectedUsers).map(key => ({ key: key, value: connectedUsers[key] }));
      console.log(`${sessionUsername} (${userSocketId}) connected`);
      // console.log('Connected users:');
      // keysAndValues.forEach(pair => {
      //   console.log(`${pair.key}: ${pair.value}`);
      // });


      // Joining a specific chat room
      socket.on('joinRoom', (roomName) => {
        console.log(`User ${sessionUsername} tries to join chatroom ${roomName}`);
        socket.join(roomName);
        if (!rooms[roomName]) {
          rooms[roomName] = { users: [], messages: [] };
        }
        if (!rooms[roomName].users.includes(sessionUsername)) {
          rooms[roomName].users.push(sessionUsername);
        }
        emitPreviousMessages(socket, roomName);
        emitActiveUsersList();
        emitChatMessage(socket, roomName);
      });

      handleDisconnect(socket);
    }
  });
}
