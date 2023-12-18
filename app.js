const {VertexAI, HarmCategory, HarmBlockThreshold} = require('@google-cloud/vertexai');

const project = 'arcookingapp';
const location = 'us-central1';

const vertex_ai = new VertexAI({project: project, location: location});

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

async function multiPartContentImageString() {
  // Replace this with your own base64 image string
  const base64Image = 'iVBORw0KGgoAAAANSUhEUgAAAAEAAAABCAYAAAAfFcSJAAAADUlEQVR42mP8z8BQDwAEhQGAhKmMIQAAAABJRU5ErkJggg==';
  const filePart = {inline_data: {data: base64Image, mime_type: 'image/jpeg'}};
  const textPart = {text: 'What is this a picture of?'};
  const request = {
      contents: [{role: 'user', parts: [textPart, filePart]}],
    };
  const resp = await generativeVisionModel.generateContentStream(request);
  const contentResponse = await resp.response;
  console.log(contentResponse.candidates[0].content.parts[0].text);
}

multiPartContentImageString();