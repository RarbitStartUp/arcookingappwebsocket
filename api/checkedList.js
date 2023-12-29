// checkedList.js
import { VertexAI } from "@google-cloud/vertexai";
import { WebSocket } from "ws";

const project = "arcookingapp";
const location = "us-central1";
const vertex_ai = new VertexAI({ project, location });

const generativeVisionModel = vertex_ai.preview.getGenerativeModel({
  model: "gemini-pro-vision",
});

// WebSocket functionality for receiving live stream frames
const wss = new WebSocket.Server({ noServer: true });

let frameCallback;

wss.on("connection", (ws) => {
  console.log("WebSocket connection opened");

  // Set up frame callback to receive frames from WebSocket
  frameCallback = (frames) => {
    // Process frames as needed (e.g., send to Vertex AI for detection)
    processFrames(frames);
  };

  // Handle WebSocket connection closed
  ws.on("close", () => {
    console.log("WebSocket connection closed");

    // Clean up frame callback
    frameCallback = null;
  });
});

// Function to process frames (replace this with your frame processing logic)
function processFrames(frames) {
  // Convert frames to base64
  const base64Frames = frames.map((frame) =>
    arrayBufferToBase64(frame.data.buffer)
  );
}
// Export the multiPartContent function
export async function checkedList(jsonData, frames) {
  try {
    const prompt = `
      You are an action detection AI, 
      check if the objects and actions in the user's JSON checklist are detected in the live stream from the camera,
      User's JSON CheckList :
      ( only check the objects and actions marked "true", you don't need to check the objects and actions marked false )
      ${JSON.stringify(jsonData)}

      and return the new checklist below JSON format :
      {
        checklist: {
          objects:{
            "objects": true | false
          },
          actions:{
            "actions": true | false
          }
        },
      }
    `;

    // // Convert frames to base64
    // const base64Frames = frames.map((frame) =>
    //   arrayBufferToBase64(frame.data.buffer)
    // );

    // Send base64-encoded frames to Vertex AI for detection
    const filePart = {
      file_data: {
        file_content: base64Frames, // Send frames as base64-encoded content
        mime_type: "image/jpeg", // Adjust the mime type as needed
      },
    };

    const textPart = { text: prompt };
    const request = {
      contents: [{ role: "user", parts: [textPart, filePart] }],
    };

    const streamingResp = await generativeVisionModel.generateContentStream(
      request
    );
    const aggregatedResponse = await streamingResp.response;

    // Return the generated content
    return aggregatedResponse.candidates[0].content;
  } catch (error) {
    console.error("Error in checkedList function:", error);

    if (error.response && error.response.data) {
      console.log("Error response data:", error.response.data);
    } else {
      console.log("Error details:", error.message);
    }
    return "Error generating content";
  }
}

// Export the WebSocket server for integration
export { wss };

// Function to convert array buffer to base64
function arrayBufferToBase64(buffer) {
  let binary = "";
  const bytes = new Uint8Array(buffer);
  for (let i = 0; i < bytes.byteLength; i++) {
    binary += String.fromCharCode(bytes[i]);
  }
  return btoa(binary);
}
