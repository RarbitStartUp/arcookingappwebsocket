// api.js
import { VertexAI } from "@google-cloud/vertexai";

const project = "arcookingapp";
const location = "us-central1";
const vertex_ai = new VertexAI({ project, location });

const generativeVisionModel = vertex_ai.preview.getGenerativeModel({
  model: "gemini-pro-vision",
});

const prompt = `
You are an action detection AI, detect the objects and actions with the corresponding objects from egocentric view , reply in the following JSON format as text

JSON format :
{
  checklist: {
    objects:{
        "objects" : true | false
    },
    actions:{
        "actions" : true | false
    }
  },
}
`;

export async function checkbox(fileUri) {
  try {
    const filePart = {
      file_data: {
        file_uri: fileUri,
        mime_type: "video/mp4",
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

    console.log("Aggregated Response:", aggregatedResponse);

    if (
      !aggregatedResponse.candidates ||
      aggregatedResponse.candidates.length === 0
    ) {
      throw new Error("Invalid or empty candidates in the response.");
    }

    const content = aggregatedResponse.candidates[0].content;

    console.log("Aggregated Response Content:", content);

    if (!content) {
      throw new Error("Invalid content in the response.");
    }

    return content;
  } catch (error) {
    console.error("Error in checkbox function:", error);
    throw error; // rethrow the error to handle it in the calling function
  }
}
