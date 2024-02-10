// server.js
import express from "express";
// import https from "https";
import http from "http";
import { WebSocketServer , WebSocket } from "ws";
// import fs from "fs";
import cors from "cors";
import path from "path"; // Import join from path
import { fileURLToPath } from "url";
import { checkedListAI } from "./api/checkedListAI.js";

// const keysPath = path.join(__dirname, "Keys"); // Use path.join

// const options = {
//   key: fs.readFileSync(path.join(keysPath, "private-key.pem")),
//   cert: fs.readFileSync(path.join(keysPath, "certificate.pem")),
// };

const app = express();
// const server = https.createServer(options, app);
const server = http.createServer(app);
const port = process.env.PORT || 3001;

// Get the directory path using import.meta.url
const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);

// WebSocket server setup using 'ws'
const wss = new WebSocketServer({ noServer: true });

// Attach the WebSocket server to the existing HTTP server
wss.server = server;

const clients = new Set(); // Using a Set to store connected clients

wss.on("connection", (ws) => {

  // Add the newly connected client to the set
  clients.add(ws);
  // Define variables to track incoming data
let jsonDataReceived = false;
let framesReceived = 0;
let frames;
let jsonData;
  console.log("WebSocket connection opened in server.js");

  ws.on("message", async (message) => {
    // console.log(`Received raw message: ${message}`);

    // Check if the message is valid JSON before parsing
    try {
      const data = JSON.parse(message);
      console.log("data :", data)

      // Handle the parsed data based on its structure
      if (data.type === "ping") {
        // Handle ping message
        ws.send(JSON.stringify({ type: "pong" }));
      } else if (data.type === "jsonData") {
        try {
          // Handle jsonData
          console.log("Setting jsonDataReceived flag");
          jsonDataReceived = true;
          console.log("jsonDataReceived :", jsonDataReceived);
          console.log("jsonDataReceived is now true");
          console.log("data.jsonData :", data.jsonData);
          jsonData = data.jsonData;
        } catch (error) {
          console.error("Error handling jsonData:", error);
        }
      } else if (data.type === "frames") {
        // Handle live stream frames
        console.log("data.frames :", data.frames)
        frames = data.frames;
        framesReceived++;
        console.log("jsonDataReceived:", jsonDataReceived);
        console.log("framesReceived:", framesReceived);

        // if (jsonDataReceived && framesReceived === 1 ) {
          if ( jsonDataReceived && framesReceived > 0 && framesReceived <= 16 ) {
          // Both jsonData and at least one frame received, trigger checkedListAI

          // Log the data being sent to the AI API endpoint
          console.log("Sending data to AI API endpoint:", { jsonData, frames });
          const content = await checkedListAI(jsonData, frames);
try{

  // Log the data being sent to the AI API endpoint
  console.log("content - AI result returned from AI API endpoint :", content );
  
  const aiResult = content.parts[0].text;
  console.log("aiResult before ws send to client :", aiResult);
  // Send the content to all connected WebSocket clients
  clients.forEach((client) => {
    if (client.readyState === WebSocket.OPEN) {
      client.send(aiResult);
    }
  });
  
  console.log("aiResult already sent to client.");
  // Reset flags after processing
  // jsonDataReceived = false;
  framesReceived = 0;
}catch (error) {
  console.error("Error processing frames asynchronously:", error);
}
          // jsonData = null;
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

  // Handle ping/pong
  // ws.on("ping", () => {
  //   console.log("Received ping from client");
  // });

  // ws.on("pong", () => {
  //   console.log("Received pong from client");
  // });

  // Set up a periodic ping to keep the connection alive
  const pingInterval = setInterval(() => {
    if (ws.readyState === ws.OPEN) {
      ws.ping();
    } else {
      clearInterval(pingInterval);
    }
  }, 30000); // Send a ping every 30 seconds
});

// Use cors middleware with specific origin
app.use(
  cors({
    origin: [
      "https://rarbit.com",
      "https://www.rarbit.com",
      "https://rarbit.tech",
      "http://0.0.0.0:3001",
      "http://localhost:3000",
      "http://localhost:3001",
      "https://rarbitarcookingapp.vercel.app",
      "https://rarbit.com:3001",
      "http://rarbit.com:3001",
      "http://18.222.93.182",
      "http://18.222.93.182:3001",
      "http://ec2-18-222-93-182.us-east-2.compute.amazonaws.com",
      "http://ec2-18-222-93-182.us-east-2.compute.amazonaws.com:3001",
    ],
    optionsSuccessStatus: 200,
  })
);

process.on("unhandledRejection", (error) => {
  console.error("Unhandled Promise Rejection:", error);
});

// Serve static files from the project directory
app.use(express.static(path.join(__dirname, "public")));

// New route for custom health check endpoint
app.get("/healthcheck", (req, res) => {
  // Log the incoming health check request
  console.log("Received health check request");
  // Respond with a simple 200 OK for health checks
  res.status(200).send("OK");
});

app.use((req, res, next) => {
  if (req.path.endsWith(".js")) {
    res.type("application/javascript");
  }
  next();
});

// Enable CORS for all routes
app.use((req, res, next) => {
  res.header("Access-Control-Allow-Origin", "*"); // Allow requests from any origin
  res.header("Access-Control-Allow-Methods", "GET, POST, OPTIONS");
  res.header(
    "Access-Control-Allow-Headers",
    "Origin, X-Requested-With, Content-Type, Accept"
  );

  // Set Content-Security-Policy header
  res.header("Content-Security-Policy", "default-src 'self'"); // Allow scripts only from the same origin

  next();
});

app.use((req, res, next) => {
  res.setHeader(
    "Content-Security-Policy",
    `default-src 'self'; script-src 'self'; connect-src 'self';`
  );
  next();
});

// Define the path to your JavaScript file
const checkedListFilePath = path.join(__dirname, "/api/checkedListAI.js");

// Serve checkedList.js with the correct Content-Type
app.get("/api/checkedListAI.js", (req, res) => {
  res.setHeader("Content-Type", "application/javascript");

  // Send the file
  res.sendFile(checkedListFilePath, (err) => {
    if (err) {
      console.error("Error sending checkedList.js:", err);
      res.status(500).send("Internal Server Error");
    }
  });
});

// Expose an API endpoint for the client to interact with
app.post("/api/checkedListAI", async (req, res) => {
  try {
    // Extract jsonData and frames from the request
    const { jsonData, frames } = req.body;

    // Call checkedList function
    const content = await checkedListAI(jsonData, frames);

    // Send the content as the API response
    res.status(200).json({ content });
  } catch (error) {
    console.error("Error in checkedListAI API endpoint:", error);
    res.status(500).json({ error: "Internal Server Error" });
  }
});

server.on("upgrade", (request, socket, head) => {
  const allowedOrigins = [
    "https://rarbit.com",
    "https://www.rarbit.com",
    "https://rarbit.tech",
    "http://0.0.0.0:3001",
    "http://localhost:3000",
    "http://localhost:3001",
    "https://rarbitarcookingapp.vercel.app",
    "https://rarbit.com:3001",
    "http://rarbit.com:3001",
    "http://18.222.93.182",
    "http://18.222.93.182:3001",
    "http://ec2-18-222-93-182.us-east-2.compute.amazonaws.com",
    "http://ec2-18-222-93-182.us-east-2.compute.amazonaws.com:3001",
  ];

  // Allow all connections if the request doesn't have the Origin header
  // if (!request.headers.origin) {
  //   wss.handleUpgrade(request, socket, head, (ws) => {
  //     wss.emit("connection", ws, request);
  //   });
  //   return;
  // }

  const origin = request.headers.origin;

  if (origin) {
    const requestHost = new URL(origin).host;
    if (allowedOrigins.some(allowedOrigin => allowedOrigin.includes(requestHost))) {
      wss.handleUpgrade(request, socket, head, (ws) => {
        wss.emit("connection", ws, request);
      });
      return;
    }
  }
});

server.listen(port, "0.0.0.0", () => {
  console.log(`Server listening at http://0.0.0.0:${port}`);
});
