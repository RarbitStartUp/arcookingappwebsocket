// api.js
import { VertexAI } from "@google-cloud/vertexai";
// import {getGCPCredentials} from "./getGCPCredentials"
import { getGoogleServiceAccountKey } from "./getGoogleServiceAccountKey.js"

export async function uploadVideoAI(fileUri) {
  try {
    // const credential = getGCPCredentials();
    const secret = await getGoogleServiceAccountKey();
    // console.log("secret:",secret);

    // Parse the secret JSON string
    const { client_email, private_key } = JSON.parse(secret);

    // Create a credentials object
    // const credentials = {
    //     client_email,
    //     private_key,
    // };
    const authOptions = {
      credentials: {
        client_email,
        private_key
      }
    }
    // console.log("credentials:", authOptions);

    // const googleAuth = new GoogleAuth({
    //   // credentials : credential,
    //   // credentials : {credentials},
    //   credentials : credentials,
    //   // keyFilename: "google_service_key.json", // Load the key file from the environment variable
    //   scopes: [
    //   'https://www.googleapis.com/auth/cloud-platform',
    //   'https://www.googleapis.com/auth/aiplatform',
    //   'https://www.googleapis.com/auth/aiplatform.jobs',
    // ], 
    //   });



    const vertex_ai = new VertexAI({
      project: "arcookingapp",
      location: "us-central1",
      // apiEndpoint : "us-central1-aiplatform.googleapis.com/v1/projects/arcookingapp/locations/us-central1/publishers/google/models/gemini-pro-vision:streamGenerateContent",
      apiEndpoint: "us-central1-aiplatform.googleapis.com",
      // googleAuthOptions: {
      //   googleAuth: googleAuth,
      // },
      googleAuthOptions: authOptions,
    });

    console.log("vertex_ai :", vertex_ai)

    const generativeVisionModel = vertex_ai.preview.getGenerativeModel({
      model: "gemini-pro-vision",
    });

    const prompt = `
    You are an action detection AI, 
    detect the objects and actions in the video,
    and give me the timestamp of each step,
    in the language of English.
    
    Generate a JSON response as text that includes a checklist.
    Each checklist item should include a timestamp and details about objects and actions.
    The objects and actions should be represented as boolean values. 
    
    Examples of
    objects : chicken, bowl, 1/2 of the lemon juice, salt etc
    actions : Place chicken in a bowl; pour 1/2 of the lemon juice over chicken and season with salt. etc

    Ensure that the total response token count does not exceed 4096 tokens to prevent truncation of the response, maintaining its integrity.
    Trim away any markup or formatting, provide only plain text response without JSON markup but in JSON format for API.

    Example:
    {"checklist": 
      [
        {
          "timestamp": "00:00:00",
          "objects": {"chicken": true, "bowl": true, "lemon juice": true, "salt": true},
          "actions": {"place": true, "pour": true, "season": true}
        },
        {
          "timestamp": "00:01:30",
          "objects": {"bowl": true, "water": true},
          "actions": {"fill": true}
        }
      ]
    }
    `;

    console.log("prompt:", prompt);
    // Assuming fileUri is the path to the video file

    // const bucketName = "users_uploads";
    // const storageClient = new Storage(getGCPCredentials());


    // const chunkSize = 250 * 1024;  // Set your desired chunk size in bytes
    // // Get a reference to the bucket
    // const bucket = storageClient.bucket(bucketName);
    // const fileName = path.basename(fileUri);
    // console.log("filename:",fileName);
    // // Get a reference to the file
    // const file = bucket.file(fileName);
    // console.log("Downloading file from:", file);

    // // Read the file
    // const fileContents = await file.download();
    // console.log("File downloaded successfully.");
    // console.log("fileContents:", fileContents);

    // // Now you can work with the file contents
    // const fileBuffer = fileContents[0];
    // console.log("fileBuffer:",fileBuffer);
    // // Split the file into chunks
    // // const chunks = [];
    // // for (let i = 0; i < fileBuffer.length; i += chunkSize) {
    // //   const chunk = fileBuffer.slice(i, i + chunkSize);
    // //   chunks.push(chunk);
    // // }

    // // Split the file into chunks
    // const chunks = [];
    // for (let i = 0; i < fileBuffer.length; i += chunkSize) {
    //   const start = i;
    //   const end = Math.min(i + chunkSize, fileBuffer.length);
    //   const chunk = fileBuffer.subarray(start, end);
    //   chunks.push(chunk);
    // }
    // console.log("chunks:",chunks);

    // // Prepare the first request with the first chunk
    // const firstChunk = chunks.shift();
    // console.log("firstChunk:",firstChunk);

    // const firstFilePart = {
    //   inline_data: {
    //     data: firstChunk.toString('base64'),
    //     mime_type: "video/mp4",
    //   },
    // };
    // console.log("firstFilePart:",firstFilePart);

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
    console.log("streamingResp:", streamingResp);

    // Continue sending requests for the remaining chunks
    // for (const chunk of chunks) {
    //   const filePart = {
    //     inline_data: {
    //       data: chunk.toString('base64'),
    //       mime_type: "video/mp4",
    //     },
    //   };
    //   const request = {
    //     contents: [{ role: "user", parts: [textPart, filePart] }],
    //   };
    //   await streamingResp.write(JSON.stringify(request));
    // }

    const aggregatedResponse = await streamingResp.response;

    console.log("Aggregated Response:", aggregatedResponse);

    if (
      !aggregatedResponse.candidates ||
      aggregatedResponse.candidates.length === 0
    ) {
      throw new Error("Invalid or empty candidates in the response.");
    }

    const text = aggregatedResponse.candidates[0].content.parts[0].text;

    console.log("Aggregated Response text before markup removed :", text);

    if (!text) {
      throw new Error("Invalid text in the response.");
    }

    // function removeMarkup(inputText) {
    //   const index = inputText.indexOf('{');
    //   return inputText.slice(index);
    // }

    function removeMarkup(inputText) {
      const startIndex = inputText.indexOf('{'); // Find the index of the first opening curly brace
      const endIndex = inputText.lastIndexOf('}'); // Find the index of the last closing curly brace

      // Check if both necessary indices are found
      if (startIndex === -1 || endIndex === -1) {
        throw new Error('Invalid input text.');
      }

      // Extract the content between the first opening curly brace and the closing triple backticks after the last closing curly brace
      return inputText.slice(startIndex, endIndex + 1);
    }

    const result = removeMarkup(text);

    console.log("Aggregated Response text with markup removed :", result);

    return result;
  } catch (error) {
    console.error("Error in checkbox function:", error);
    throw error; // rethrow the error to handle it in the calling function
  }
}
