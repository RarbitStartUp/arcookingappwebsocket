const {VertexAI, HarmCategory, HarmBlockThreshold} = require('@google-cloud/vertexai');

const project = 'arcookingapp';
const location = 'us-central1';

const vertex_ai = new VertexAI({project: project, location: location});

const prompt =  `
You are a action detection AI, make sure the following checklist and action are fulfilled, reply in the following json format as text

json format:
{
  checklist: {
    "object": true | false
  },
  actionFulfilled: true | false
}

checklist:
1. knife
2. hand
3. leek

action:
cutting a leek

`;

// Instantiate models
const generativeModel = vertex_ai.preview.getGenerativeModel({
    model: 'gemini-pro',
    // The following parameters are optional
    // They can also be passed to individual content generation requests
    safety_settings: [{category: HarmCategory.HARM_CATEGORY_DANGEROUS_CONTENT, threshold: HarmBlockThreshold.BLOCK_MEDIUM_AND_ABOVE}],
    generation_config: {max_output_tokens: 256},
  });

const generativeVisionModel = vertex_ai.preview.getGenerativeModel({
    model: 'gemini-pro-vision',
});

async function multiPartContent() {
  const filePart = { file_data: {file_uri: "gs://ar-image/Screenshot 2023-12-18 at 9.29.47 PM.png", mime_type: "image/png"}};
  const textPart = { text: prompt };
  const request = {
      contents: [{role: 'user', parts: [textPart, filePart]}],
    };
  const streamingResp = await generativeVisionModel.generateContentStream(request);
  for await (const item of streamingResp.stream) {
    console.log('stream chunk: ', JSON.stringify(item));
  }
  const aggregatedResponse = await streamingResp.response;
  console.log(aggregatedResponse.candidates[0].content);
}

multiPartContent();



// async function multiPartContentImageString() {
//   // Replace this with your own base64 image string
//   const base64Image = 'iVBORw0KGgoAAAANSUhEUgAAAAEAAAABCAYAAAAfFcSJAAAADUlEQVR42mP8z8BQDwAEhQGAhKmMIQAAAABJRU5ErkJggg==';
//   const filePart = {inline_data: {data: base64Image, mime_type: 'image/jpeg'}};
//   const textPart = {text: 'What is this a picture of?'};
//   const request = {
//       contents: [{role: 'user', parts: [textPart, filePart]}],
//     };
//   const resp = await generativeVisionModel.generateContentStream(request);
//   const contentResponse = await resp.response;
//   console.log(contentResponse.candidates[0].content.parts[0].text);
// }

// multiPartContentImageString();


