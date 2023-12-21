// api.js
import {
  VertexAI,
  HarmCategory,
  HarmBlockThreshold,
} from "@google-cloud/vertexai";

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

export async function checkbox() {
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
  return aggregatedResponse.candidates[0].content;
}
