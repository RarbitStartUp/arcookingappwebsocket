// server.js
import express from "express";
// import https from "https";
import http from "http";
import { WebSocketServer, WebSocket } from "ws";
// import fs from "fs";
// import cors from "cors";
import path from "path"; // Import join from path
import bodyParser from 'body-parser';
import { fileURLToPath } from "url";
import { checkedListAI } from "./api/checkedListAI.js";
import { uploadVideo } from "./api/uploadVideo.js";

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

// Parse URL-encoded bodies (as sent by HTML forms)
app.use(bodyParser.urlencoded({ extended: true }));
// Parse JSON bodies (as sent by API clients)
app.use(bodyParser.json());
// Define the route to handle the upload video request
app.post('/api/uploadVideo', uploadVideo);
// Define the route to handle the upload video request
app.post('/api/uploadVideo', async (req, res) => {
  try {
    console.log('request:', req);
    console.log('request body:', req.body);
    const { inputLink } = req.body;

    // Perform any necessary processing with the inputLink
    // For example, you can make another request to a video processing service

    // For demonstration purposes, we'll just log the inputLink
    console.log('Received input link in server.js :', inputLink);

    // Respond with a success message
    res.status(200).json({ message: 'Video uploaded successfully' });
  } catch (error) {
    console.error('Error uploading video:', error);
    // If an error occurs, respond with an error message
    res.status(500).json({ message: 'Internal Server Error' });
  }
});

wss.on("connection", (ws) => {

  // Add the newly connected client to the set
  clients.add(ws);
  // Define variables to track incoming data
  let jsonDataReceived = false;
  let framesReceived = 0;
  let framesBatch = [];
  let frames;
  let jsonData;

  console.log("WebSocket connection opened in server.js");

  ws.on("message", async (message) => {
    console.log(`Received raw message: ${message}`);

    // Check if the message is valid JSON before parsing
    try {
      const data = JSON.parse(message);
      // console.log("data :", data)

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
        try {
          // Handle live stream frames
          // console.log("data.frames :", data.frames)
          frames = data.frames;
          framesBatch.push(frames);
          // console.log("framesBatch:",framesBatch);
          framesReceived++;
          console.log("jsonDataReceived:", jsonDataReceived);
          console.log("framesReceived:", framesReceived);
        } catch (error) {
          console.error("Error handling frames:", error);
        }
      } else if (data.type === "stopRetryFrames") {
        try {
          let stopRetryFrames = true; // Define stopRetryFrames locally
          await checkedListAI(jsonData, [], stopRetryFrames);
          console.log("Received stopRetryFrames message. Stopping retry frames.");
        } catch (error) {
          console.error("Error handling stopRetryFrames:", error);
        }
      }

      // Create a promise queue
      const queue = [];

      // Define variables to track rate limiting
      let requestCount = 0;
      let lastResetTime = Date.now();

      // Function to check if the rate limit has been reached
      function isRateLimitReached() {
        // Get the current time
        const currentTime = Date.now();

        // Check if a minute has passed since the last reset
        if (currentTime - lastResetTime >= 60000) { // 60000 milliseconds = 1 minute
          // Reset the request count and update the last reset time
          requestCount = 0;
          lastResetTime = currentTime;
        }

        // Check if the request count exceeds the limit
        return requestCount >= 60; // 60 requests per minute
      }

      // Function to make a request
      async function makeRequest(jsonData, batchFrames, stopRetryFrames) {
        // Check if the rate limit has been reached
        if (isRateLimitReached()) {
          console.log("Rate limit reached. Please wait before making more requests.");
          return;
        }

        // Increment the request count
        requestCount++;

        // Proceed with making the request
        try {
          // Your request logic here
          console.log("Request successful in server.js.");
          // Call the function to process the batch
          await processBatch(jsonData, batchFrames, stopRetryFrames);
        } catch (error) {
          console.error("Error making request:", error);
        }
      }

      // Define stopRetryFrames in the scope where processData is defined
      let stopRetryFrames = false;

      // This function continuously checks for new data and processes it if conditions are met
      function processData() {
        // Check if jsonData is received and framesBatch has at least one frame
        if (jsonDataReceived && framesBatch.length > 3) {
          // Calculate the number of frames to process in the batch
          const batchSize = Math.min(framesBatch.length, 3);
          // console.log("batchSize:",batchSize);
          // Process frames in batches of 16
          // const batchFrames = framesBatch.splice(0, 16); // Extract first 16 frames
          // const batchFrames = framesBatch.splice(0, 16); // Extract first 16 frames
          const batchFrames = framesBatch.splice(0, batchSize); // Extract first 16 frames
          // console.log("batchFrames:",batchFrames); //you will log may frames array, so I comment out
          try {
            // Call the function to process the batch
            // processBatch(jsonData, batchFrames);
            // Make a request to process the batch
            makeRequest(jsonData, batchFrames, stopRetryFrames = false);
          } catch (error) {
            console.error('Error processing frames batch:', error);
            // Handle the error as needed (e.g., logging, notifying the user)
          }
        }
      }
      // Call this function again after a delay to continuously check for new data
      //  setTimeout(processData, 1000); // Adjust the delay as needed

      // // Start the process
      // processData();
      // Set a timer to process frames every second
      setInterval(processData, 1000);

      //If you want to continuously check for new data every second, 
      //you should use setInterval. 
      //If you only want to check for new data once every second,
      //you should use setTimeout.

      async function processBatch(jsonData, batchFrames, stopRetryFrames) {
        // Add a promise to the queue
        const promise = new Promise(async (resolve, reject) => {
          try {
            const fullChecklist = await checkedListAI(jsonData, batchFrames, stopRetryFrames);
            // Resolve the promise with the result
            resolve(fullChecklist);
          } catch (error) {
            // Reject the promise with the error
            reject(error);
          } finally {
            // Remove the processed frames from the framesBatch array
            const index = framesBatch.indexOf(batchFrames);
            if (index !== -1) {
              framesBatch.splice(index, 1);
            }
          }
        });

        // Add the promise to the queue
        queue.push(promise);

        // If this is the only promise in the queue, process it immediately
        if (queue.length === 1) {
          processNextBatch();
        }
      }

      async function processNextBatch() {
        // If there are no promises in the queue, return
        if (queue.length === 0) {
          return;
        }

        // Get the first promise from the queue
        const promise = queue[0];

        try {
          // Wait for the promise to resolve
          const fullChecklist = await promise;
          const fullChecklistString = JSON.stringify(fullChecklist);
          console.log("fullChecklistString in server.js :", fullChecklistString);

          // Log the data being sent to the AI API endpoint
          console.log("fullChecklistString before ws send to client :", fullChecklistString);
          // Send the content to all connected WebSocket clients
          clients.forEach((client) => {
            if (client.readyState === WebSocket.OPEN) {
              client.send(fullChecklistString);
            }
          });
          console.log("fullChecklistString already sent to client.");

          // Reset flags after processing
          queue.shift(); // Remove the processed promise from the queue
          processNextBatch(); // Process the next batch
        } catch (error) {
          console.error("Error processing frames asynchronously:", error);
          // Remove the failed promise from the queue and process the next batch
          queue.shift();
          processNextBatch();
        }
      }

      //  // Check if jsonData is received and framesBatch has at least one frame
      // if (jsonDataReceived && framesBatch.length > 16) {
      //   // Process frames in batches of 16

      //     const batchFrames = framesBatch.splice(0, 16); // Extract first 16 frames
      //     // console.log("batchFrames:",batchFrames);

      //     // Both jsonData and at least one frame received, trigger checkedListAI
      //     // Log the data being sent to the AI API endpoint
      //     console.log("Sending data to AI API endpoint:", { jsonData, batchFrames });
      //     const fullChecklist = await checkedListAI(jsonData, batchFrames);
      //     console.log("fullChecklist in server.js :", fullChecklist);
      //     const fullChecklistString = JSON.stringify(fullChecklist);
      //     console.log("fullChecklistString in server.js :", fullChecklistString);
      //         try{
      //           // Log the data being sent to the AI API endpoint
      //           console.log("fullChecklistString before ws send to client :", fullChecklistString);
      //           // Send the content to all connected WebSocket clients
      //           clients.forEach((client) => {
      //             if (client.readyState === WebSocket.OPEN) {
      //               client.send(fullChecklistString);
      //             }
      //           });      
      //           console.log("fullChecklistString already sent to client.");
      //           // Reset flags after processing
      //           // jsonDataReceived = false;
      //           framesBatch = []; // Reset frames batch
      //           framesReceived = 0;
      //         }catch (error) {
      //           console.error("Error processing frames asynchronously:", error);
      //         }
      // jsonData = null;

      // } else {
      //   // Handle other types of messages
      // }
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

// app.use((req, res, next) => {
//   res.setHeader(
//     "Content-Security-Policy",
//     `default-src 'self'; script-src 'self'; connect-src 'self';`
//   );
//   next();
// });

// Define the path to your JavaScript file
// const checkedListFilePath = path.join(__dirname, "/api/checkedListAI.js");

// // Serve checkedList.js with the correct Content-Type
// app.get("/api/checkedListAI.js", (req, res) => {
//   res.setHeader("Content-Type", "application/javascript");

//   // Send the file
//   res.sendFile(checkedListFilePath, (err) => {
//     if (err) {
//       console.error("Error sending checkedList.js:", err);
//       res.status(500).send("Internal Server Error");
//     }
//   });
// });

// const checkedboxFilePath = path.join(__dirname, "/api/checkedboxAI.js");
// app.get("/api/checkedboxAI.js", (req, res) => {
//   res.setHeader("Content-Type", "application/javascript");

//   // Send the file
//   res.sendFile(checkedboxFilePath, (err) => {
//     if (err) {
//       console.error("Error sending checkedboxAI.js:", err);
//       res.status(500).send("Internal Server Error");
//     }
//   });
// });

// // Expose an API endpoint for the client to interact with
// app.post("/api/checkedListAI", async (req, res) => {
//   try {
//     // Extract jsonData and frames from the request
//     const { jsonData, frames } = req.body;

//     // Call checkedList function
//     const content = await checkedListAI(jsonData, frames);

//     // Send the content as the API response
//     res.status(200).json({ content });
//   } catch (error) {
//     console.error("Error in checkedListAI API endpoint:", error);
//     res.status(500).json({ error: "Internal Server Error" });
//   }
// });

server.on("upgrade", (request, socket, head) => {
  const allowedOrigins = "*"; // Allow connections from all origins

  // Allow all connections if the request doesn't have the Origin header
  if (!request.headers.origin || request.headers.origin === "null") {
    wss.handleUpgrade(request, socket, head, (ws) => {
      wss.emit("connection", ws, request);
    });
    return;
  }

  const origin = request.headers.origin;

  if (allowedOrigins === "*" || origin.includes(allowedOrigins)) {
    wss.handleUpgrade(request, socket, head, (ws) => {
      wss.emit("connection", ws, request);
    });
    return;
  }
});

server.listen(port, "0.0.0.0", () => {
  console.log(`Server listening at http://0.0.0.0:${port}`);
});
