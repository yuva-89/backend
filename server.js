const express = require('express');
const http = require('http');
const WebSocket = require('ws');

const app = express();
const server = http.createServer(app);
const wss = new WebSocket.Server({ server });

// Store connected clients
// ws -> { id, room }
const clients = new Map();

function broadcast(room, message, except) {
  for (const [client, info] of clients.entries()) {
    if (info.room === room && client.readyState === WebSocket.OPEN && client !== except) {
      client.send(JSON.stringify(message));
    }
  }
}

wss.on('connection', (ws) => {
  console.log('New client connected');

  ws.on('message', (raw) => {
    let msg;
    try {
      msg = JSON.parse(raw);
    } catch (e) {
      console.error('Invalid JSON:', raw);
      return;
    }

    if (msg.type === 'join' && msg.room && msg.id) {
      clients.set(ws, { id: msg.id, room: msg.room });
      console.log(`Client ${msg.id} joined room ${msg.room}`);
    }

    if (msg.type === 'leave' && msg.room && msg.id) {
      broadcast(msg.room, msg, ws);
      clients.delete(ws);
      console.log(`Client ${msg.id} left room ${msg.room}`);
    }

    if (msg.type === 'location' && msg.room && msg.id) {
      broadcast(msg.room, msg, ws);
    }
  });

  ws.on('close', () => {
    const info = clients.get(ws);
    if (info) {
      broadcast(info.room, { type: 'leave', room: info.room, id: info.id }, ws);
      clients.delete(ws);
      console.log(`Client ${info.id} disconnected from ${info.room}`);
    }
  });
});

// Simple health check route
app.get('/', (req, res) => {
  res.send('WebSocket server is running');
});

const PORT = 8080;
server.listen(PORT, () => {
  console.log(`Server running on http://localhost:${PORT}`);
  console.log(`WebSocket server running on ws://localhost:${PORT}`);
});