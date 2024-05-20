// server.js
import express from "express";
// import https from "https";
import cors from 'cors';
import http from "http";
import { Server } from "socket.io";
import path from "path"; // Import join from path
import bodyParser from 'body-parser';
import { fileURLToPath } from "url";
import { checkedListAI } from "./api/checkedListAI.js";
import { uploadVideo } from "./api/uploadVideo.js";

const app = express();

const server = http.createServer(app);
const io = new Server(server);
const port = process.env.PORT || 3001;

// Get the directory path using import.meta.url
const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);

// Enable CORS for all routes
app.use(cors());
// Serve static files from the project directory
app.use(express.static(path.join(__dirname, "public")));

// New route for custom health check endpoint
app.get("/healthcheck", (req, res) => {
  // Log the incoming health check request
  console.log("Received health check request");
  // Respond with a simple 200 OK for health checks
  res.status(200).send("OK");
});

// Use middleware to parse JSON and URL-encoded bodies
app.use(bodyParser.json());
app.use(bodyParser.urlencoded({ extended: true }));

app.use((req, res, next) => {
  if (req.path.endsWith(".js")) {
    res.type("application/javascript");
  }
  next();
});

// Define the route to handle the upload video request
app.post('/api/uploadVideo', uploadVideo);

// Define the route to handle the upload video request
// app.post('/api/uploadVideo', async (req, res) => {
//   try {
//     // console.log('request:', req);
//     console.log('request body:', req.body);
//     const { inputLink } = req.body;

//     // For demonstration purposes, we'll just log the inputLink
//     console.log('Received input link in server.js :', inputLink);

//     // Respond with a success message
//     res.status(200).json({ message: 'Video uploaded successfully' });
//   } catch (error) {
//     console.error('Error uploading video:', error);
//     // If an error occurs, respond with an error message
//     res.status(500).json({ message: 'Internal Server Error' });
//   }
// });

// Define variables to track incoming data
let jsonDataReceived = false;
let framesReceived = 0;
let framesArray = [];
let latestJsonData;
let frameTimestamps = []; // Array to track timestamps of received frames
const windowSize = 10; // Reasonable window size for averaging the frame rate

 async function passToAI(frameBatch, jsonData){
    try{
        console.log("Entering passToAI function");
        console.log("jsonData:", jsonData);
     // Check if jsonData is received and framesBatch has at least one frame
    //  if (jsonDataReceived && framesBatch.length > 16) {
        console.log("frameBatch:",frameBatch);
    

          // Both jsonData and at least one frame received, trigger checkedListAI
          // Log the data being sent to the AI API endpoint
          console.log("Sending data to AI API endpoint:", { jsonData, frameBatch });
          const fullChecklist = await checkedListAI(jsonData, frameBatch);
          console.log("fullChecklist in server.js :", fullChecklist);
          const fullChecklistString = JSON.stringify(fullChecklist);
          console.log("fullChecklistString in server.js :", fullChecklistString);
              try{
                // Send the content to all connected Socket.IO clients
                io.emit('fullChecklistString', fullChecklistString);
                console.log("fullChecklistString already sent to client.");
                // Reset flags after processing
                // jsonDataReceived = false;
                // framesArray = []; // Reset frames batch
                framesReceived = 0;
              }catch (error) {
                console.error("Error processing frames asynchronously:", error);
              }
     
            //   jsonData = null;

    //   }
    } catch (error) {
        console.error("Error passing to AI :", error);
    }
 };

io.on("connect", async (socket) => {

   
   console.log("WebSocket connection opened in server.js");

   // Event handler for receiving jsonData
   socket.on("jsonData", (jsonData) => {
     try{
         console.log("Received jsonData:", jsonData);
         latestJsonData = jsonData;
         jsonDataReceived = true;
         console.log("jsonDataReceived is now true");
     }catch (error) {
         console.error("Error handling jsonData:", error);
       }
   });


  // Event handler for receiving frames
  socket.on("frame", (frame) => {
    try{
        console.log("Received frame data:", frame);
        framesArray.push(frame);
        console.log("framesArray:",framesArray);
        framesReceived++;
        frameTimestamps.push(Date.now()); // Record the current timestamp
        console.log("jsonDataReceived:", jsonDataReceived);
        console.log("framesReceived:", framesReceived);

        // Remove old timestamps that fall outside the window size
        if (frameTimestamps.length > windowSize) {
          frameTimestamps.shift();
        }
  
        // Calculate frame rate ( fps ) using consecutive timestamps
        if (frameTimestamps.length > 1) {
          const intervals = [];
          for (let i = 1; i < frameTimestamps.length; i++) {
            intervals.push(frameTimestamps[i] - frameTimestamps[i - 1]);
          }
          const averageInterval = intervals.reduce((a, b) => a + b, 0) / intervals.length;
          const frameRate = 1000 / averageInterval; // Convert interval to fps
          console.log(`Current frame rate: ${frameRate.toFixed(2)} fps`);
        }

        // console.log("latestJsonData inside frame scope:",latestJsonData);
        // Check if jsonData is received and framesBatch has at least one frame
    if (jsonDataReceived && framesArray.length > 3) {
        // Process frames in batches of 16
        const frameBatch = framesArray.splice(0, 1); // Extract first 16 frames
        console.log("frameBatch:",frameBatch);
        passToAI(frameBatch,latestJsonData);
        console.log("passToAI function is called");
    }
    }catch (error) {
        console.error("Error handling frame:", error);
      }
  });

  socket.on("close", (code, reason) => {
    console.log(`WebSocket closed with code: ${code}, reason: ${reason}`);
  });
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

server.listen(port, "0.0.0.0", () => {
  console.log(`Server listening at http://0.0.0.0:${port}`);
});
