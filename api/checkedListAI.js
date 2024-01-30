// checkedListAI.js (server-side logic for processing checked lists)
import { VertexAI } from "@google-cloud/vertexai";
import { GoogleAuth } from 'google-auth-library';
import { Storage } from "@google-cloud/storage";
import sharp from 'sharp';

// const credential = JSON.parse(
//   Buffer.from(process.env.GOOGLE_SERVICE_KEY.replace(/"/g, ""), "base64").toString().replace(/\n/g,"")
// )
// Use the default authentication provided by google-auth-library
const auth = new GoogleAuth({
  keyFilename: "google_service_key.json", // Load the key file from the environment variable
  scopes: ['https://www.googleapis.com/auth/cloud-platform'], 
});
console.log("auth:", auth);
const authClient = await auth.getClient();
console.log("authClient:", authClient);

async function getCredentials(authClient) {
  // Fetch the credentials using the auth client
  return new Promise((resolve, reject) => {
    authClient.getAccessToken().then(
      (response) => {
        // Extract the access token from the response
        const accessToken = response.token;
        // Create a simple object with the access token
        const credentials = { access_token: accessToken };
        resolve(credentials);
      },
      (error) => {
        reject(error);
      }
    );
  });
}

// Get the credentials from the auth client
const credentials = await getCredentials(authClient);
console.log("credentials:", credentials);

const project = "arcookingapp";
const location = "us-central1"; 
const vertex_ai = new VertexAI({ project, location});
console.log("vertex_ai :",vertex_ai)

const projectId = "arcookingapp";
const storageClient = new Storage({
  projectId,
  keyFilename: "google_service_key.json",
  // credentials: {
  //   client_email: credential.client_email,
  //   private_key: credential.private_key,
  // },
});
const bucketName = "rarbit_livestream";

const generativeVisionModel = vertex_ai.preview.getGenerativeModel({
  model: "gemini-pro-vision",
});

export async function checkedListAI(jsonData, frames) {
  return new Promise(async (resolve, reject) => {
    console.log("Entering checkedListAI function");
    console.log("jsonData:", jsonData);
    const userCheckList = JSON.stringify(jsonData);
    console.log("userCheckList:", userCheckList);

    let fileUri = "";
    const bucket = storageClient.bucket(bucketName);

    // Add a delay function to pause execution for a specified time
function delay(ms) {
  return new Promise(resolve => setTimeout(resolve, ms));
}

    try {
      if (frames.length === 0) {
        console.error('No frames to save.');
      } else {
        for (let i = 0; i < frames.length; i++) {
          const pixels = frames[i].flat().map(value => Array.isArray(value) ? value.flat().map(Number) : Number(value));
          const roundedPixels = pixels.map(channelValues => channelValues.map(value => Math.round(value)));
          const flattenedPixels = roundedPixels.flat();
          const clampedPixels = flattenedPixels.map(value => Math.max(0, Math.min(255, value)));
          const buffer = Buffer.from(clampedPixels);
          const width = 224;
          const height = 224;
          const jpegBuffer = await sharp(buffer, { raw: { width, height, channels: 3 } }).toFormat('jpeg').toBuffer();
          const destination = `received_image_${i + 1}.jpg`;
          const file = bucket.file(destination);

          await file.save(jpegBuffer, {
            metadata: {
              contentType: 'image/jpeg',
            },
          });

          fileUri = `gs://${bucketName}/${destination}`;
          console.log("fileUri inside scope :", fileUri);
        }

        console.log("fileUri outside scope :", fileUri);

        const filePart = {
          file_data: {
            file_uri: fileUri,
            mime_type: "image/jpeg",
          },
        };

        const prompt = `
          You are an action detection AI, 
          check if the objects and actions in the user's JSON checklist are detected in the live stream from the camera,
          User's JSON CheckList :
          ( only check the objects and actions marked "true", you don't need to check the objects and actions marked false )
          ${userCheckList}

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

        const textPart = { text: prompt };
        const request = {
          contents: [{ role: "user", parts: [textPart, filePart] }],
        };

        console.log("Request object:", request);
        console.log("Contents parts:", request.contents[0].parts);

        console.log("Before generativeVisionModel.generateContentStream");

         // Introduce a delay (e.g., 1000 milliseconds) to avoid rate limits
         await delay(1000);

        const streamingResp = await generativeVisionModel.generateContentStream(request);
        console.log("streamingResp:", streamingResp);
        console.log("After generativeVisionModel.generateContentStream");

        const aggregatedResponse = await streamingResp.response;

        console.log("After awaiting response from AI API");
        resolve(aggregatedResponse.candidates[0].content);
      }
    } catch (error) {
      console.error("Error in generativeVisionModel.generateContentStream:", error);
      console.error("Error details:", error.response?.data || error.message);
      reject(error);

      if (error.response && error.response.data) {
        console.log("Error response data:", error.response.data);
      } else {
        console.log("Error details:", error.message);
      }
    }
  });
}
