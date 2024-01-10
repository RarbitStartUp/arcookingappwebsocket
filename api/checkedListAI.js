// checkedListAI.js (server-side logic for processing checked lists)

import { VertexAI } from "@google-cloud/vertexai";

const project = "arcookingapp";
const location = "us-central1";
const vertex_ai = new VertexAI({ project, location });

const generativeVisionModel = vertex_ai.preview.getGenerativeModel({
  model: "gemini-pro-vision",
});

// Function to process checked list and return the result
export async function checkedListAI(jsonData, frames) {
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

    // Convert frames to base64
    const base64Frames = frames.map((frame) =>
      arrayBufferToBase64(frame.data.buffer)
    );

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
    console.error("Error in checkedListAI function:", error);

    if (error.response && error.response.data) {
      console.log("Error response data:", error.response.data);
    } else {
      console.log("Error details:", error.message);
    }
    return "Error generating content";
  }
}

// Function to convert array buffer to base64
function arrayBufferToBase64(buffer) {
  let binary = "";
  const bytes = new Uint8Array(buffer);
  for (let i = 0; i < bytes.byteLength; i++) {
    binary += String.fromCharCode(bytes[i]);
  }
  return btoa(binary);
}
