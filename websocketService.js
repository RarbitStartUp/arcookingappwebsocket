import { WebSocketServer } from "ws";
import http from "http";

const server = http.createServer();
const wss = new WebSocketServer({ noServer: true });

console.log("WebSocketServer created");

wss.on("connection", (ws) => {
  console.log("Client connected");

  // Handle messages from the client
  ws.on("message", (message) => {
    console.log(`Received message: ${message}`);
  });

  // Handle disconnection
  ws.on("close", () => {
    console.log("Client disconnected");
  });
});

export default wss;
