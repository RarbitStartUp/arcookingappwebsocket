// server.js
import express from "express";
import http from "http";
import { WebSocketServer } from "ws";
import cors from "cors";
import path from "path";
import { fileURLToPath } from "url";
import { checkedListAI } from "./api/checkedListAI.js";

// import { ACM } from "@aws-sdk/client-acm";
// import https from "https";

// const acm = new ACM({ region: "us-east-2" }); // Set your desired AWS region here
// const certificateArn =
//   // "arn:aws:acm:region:account-id:certificate/certificate-id";
//   "arn:aws:acm:us-east-2:006409069470:certificate/b957a3c0-e5a3-42d1-9ab2-e4622a15dd32";

// acm.describeCertificate(
//   { CertificateArn: certificateArn },
//   async (err, data) => {
//     if (err) {
//       console.error("Error retrieving ACM certificate:", err);
//       return;
//     }

//     const { Certificate } = data;

//     const options = {
//       cert: Certificate.CertificateBody,
//       key: Certificate.CertificatePrivateKey,
//       // Add any other necessary options
//     };

//     const server = https.createServer(options, app);

//     server.listen(443, () => {
//       console.log("Server running on https://localhost:443/");
//     });
//   }
// );

const app = express();
const server = http.createServer(app);
const port = process.env.PORT || 3000;

// const getNgrokSubdomain = async () => {
//   const response = await fetch("http://localhost:4040/api/tunnels");
//   const data = await response.json();
//   const tunnelUrl = data.tunnels[0].public_url;
//   const subdomain = tunnelUrl.replace("https://", "").split(".")[0];
//   return subdomain;
// };

// const subdomain = await getNgrokSubdomain();
// console.log("Ngrok Subdomain:", subdomain);
// const ngrokOrigin = `https://${subdomain}.ngrok-free.app`;

// WebSocket server setup using 'ws'
const wss = new WebSocketServer({ noServer: true });

// Attach the WebSocket server to the existing HTTP server
wss.server = server;

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

            const content = checkedListAI(jsonData, frames);

            // Send the content to all connected WebSocket clients
            clients.forEach((client) => {
              if (client.readyState === WebSocket.OPEN) {
                client.send(content);
              }
            });
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

  // Handle ping/pong
  ws.on("ping", () => {
    console.log("Received ping from client");
  });

  ws.on("pong", () => {
    console.log("Received pong from client");
  });

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
      "http://0.0.0.0:3000",
      "http://localhost:3000",
      "http://127.0.0.1:8080",
      "http://localhost:4040",
      "http://localhost:443",
      // ngrokOrigin,
    ],
    optionsSuccessStatus: 200,
  })
);

process.on("unhandledRejection", (error) => {
  console.error("Unhandled Promise Rejection:", error);
});

// Get the directory path using import.meta.url
const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);

// Serve static files from the project directory
app.use(express.static(path.join(__dirname, "public")));

// New route for custom health check endpoint
app.get("/healthcheck", (req, res) => {
  // Respond with a simple 200 OK for health checks
  res.status(200).send("OK");
});

// console.log("Before unhandledRejection listener setup");
// process.on("unhandledRejection", (error) => {
//   console.error("Unhandled Promise Rejection:", error);
// });
// console.log("After unhandledRejection listener setup");

// Middleware to set the correct MIME type for JavaScript files
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
    `default-src 'self'; script-src 'self'; connect-src 'self' ${ngrokOrigin};`
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

server.on("upgrade", (request, ws, head) => {
  const allowedOrigins = [
    "http://0.0.0.0:3000",
    "http://localhost:3000",
    "http://127.0.0.1:8080",
    "http://localhost:4040",
    "http://localhost:443",
    // ngrokOrigin,
  ];
  const origin = request.headers.origin;

  // if (allowedOrigins.includes(origin) || allowedOrigins.includes(ngrokOrigin)) {
  if (allowedOrigins.includes(origin)) {
    wss.handleUpgrade(request, ws, head, (ws) => {
      wss.emit("connection", ws, request);
    });
  } else {
    ws.destroy();
    console.error("WebSocket connection upgrade failed: Origin not allowed");
  }
});

server.listen(port, "0.0.0.0", () => {
  console.log(`Server listening at http://0.0.0.0:${port}`);
});

// console.log("Before unhandledRejection listener setup");
// process.on("unhandledRejection", (error) => {
//   console.error("Unhandled Promise Rejection:", error);
// });
// console.log("After unhandledRejection listener setup");
