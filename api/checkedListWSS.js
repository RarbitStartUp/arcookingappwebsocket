// checkedListWSS.js
import { WebSocketServer } from "ws";
import { WebSocket } from "ws";
import { checkedListAI } from "./checkedListAI"; // Import the new function

let jsonData; // Variable to store jsonData
let framesReceived = 0; // Counter for received frames

// WebSocket server instance
const wss = new WebSocketServer({ server });

// Array to store connected clients
const clients = [];

export function handleWebSocketMessage(message) {
  // Assume message contains either jsonData or frames
  if (message.type === "jsonData") {
    jsonData = message.data;
  } else if (message.type === "frames") {
    framesReceived++;
    if (jsonData && framesReceived > 0) {
      // Both jsonData and at least one frame received, trigger checkedListAI
      processCheckedListAI();
    }
  }
}

async function processCheckedListAI() {
  // Ensure both jsonData and frames are available
  if (jsonData && frames > 0) {
    processFrames(frames);
    const result = await checkedListAI(jsonData, frames);
    // Broadcast the result or handle it accordingly
  }
}

// Function to process frames and send response to all connected clients
async function processFrames(frames) {
  try {
    const jsonData = {}; // Populate jsonData as needed

    // Call checkedListAI function
    const content = await checkedListAI(jsonData, frames);

    // Send the content to all connected WebSocket clients
    clients.forEach((client) => {
      if (client.readyState === WebSocket.OPEN) {
        client.send(content);
      }
    });
  } catch (error) {
    console.error("Error processing frames:", error);
    // Handle the error, e.g., send an error message to the client
  }
}

wss.on("connection", (ws) => {
  console.log("WebSocket connection opened in checkedListWSS.js");

  ws.on("message", (message) => {
    console.log(`Received raw message: ${message}`);

    // Check if the message is valid JSON before parsing
    try {
      const data = JSON.parse(message);

      // Handle the parsed data based on its structure
      if (data.type === "ping") {
        // Handle ping message
        ws.send(JSON.stringify({ type: "pong" }));

        // frames received from websocket
        const frames = data.frames;
        const jsonData = data.jsonData;

        if (data.type === "jsonData") {
          jsonData = message.data;
        } else if (data.type === "frames") {
          framesReceived++;
          if (jsonData && frames > 0) {
            // Both jsonData and at least one frame received, trigger checkedListAI

            checkedListAI(jsonData, frames);
          }
        }
      } else {
        // Handle other types of messages
      }
    } catch (error) {
      console.error("Error parsing WebSocket message:", error);
      // Handle the error, e.g., display an error message to the user
    }
  });

  ws.on("close", (code, reason) => {
    console.log(`WebSocket closed with code: ${code}, reason: ${reason}`);
  });
});
