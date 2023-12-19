const express = require("express");
const {
  VertexAI,
  HarmCategory,
  HarmBlockThreshold,
} = require("@google-cloud/vertexai");
const app = express();
const port = 3000;

const project = "arcookingapp";
const location = "us-central1";
const vertex_ai = new VertexAI({ project: project, location: location });

const prompt = `
You are an action detection AI, make sure the following checklist and actions are fulfilled, reply in the following JSON format as text

JSON format:
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

Objects:
1. knife
2. hand
3. leek

Actions:
1. cutting a leek
`;

const generativeVisionModel = vertex_ai.preview.getGenerativeModel({
  model: "gemini-pro-vision",
});

app.use(express.static("public"));

app.get("/", (req, res) => {
  res.sendFile(__dirname + "/public/index.html");
});

app.get("/api/data", async (req, res) => {
  try {
    const result = await multiPartContent();
    res.json(result);
  } catch (error) {
    console.error("Error:", error);
    res.status(500).json({ error: "Internal Server Error" });
  }
});

async function multiPartContent() {
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

app.listen(port, () => {
  console.log(`Server listening at http://localhost:${port}`);
});
