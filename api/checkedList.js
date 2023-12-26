// api.js
import { VertexAI } from "@google-cloud/vertexai";

const project = "arcookingapp";
const location = "us-central1";
const vertex_ai = new VertexAI({ project, location });

const generativeVisionModel = vertex_ai.preview.getGenerativeModel({
  model: "gemini-pro-vision",
});

// Export the multiPartContent function
export async function checkedList(jsonData) {
  try {
    const preview = JSON.stringify(jsonData);
    console.log("API updatedJsonData:", preview);
    // Construct the prompt using jsonData
    const prompt = `
      You are an action detection AI, 
      
      check if the objects and actions in the user's JSON checklist are detected in the video link in file_uri,

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

    // Make the API request
    const filePart = {
      file_data: {
        file_uri: "gs://ar-image/Screenshot 2023-12-18 at 9.29.47 PM.png",
        mime_type: "image/png",
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
    console.error("Error:", error);
    return "Error generating content";
  }
}
