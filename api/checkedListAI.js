// checkedListAI.js (server-side logic for processing checked lists)
import { VertexAI } from "@google-cloud/vertexai";
import { Storage } from "@google-cloud/storage";
import { SecretsManagerClient, GetSecretValueCommand } from "@aws-sdk/client-secrets-manager";
import sharp from 'sharp';

const secret = await getGoogleServiceAccountKey();
// console.log("secret:", secret);
const { client_email, private_key } = JSON.parse(secret);

const authOptions = {
  credentials: {
    client_email,
    private_key
  }
}

// console.log("authOptions:", authOptions);

const vertex_ai = new VertexAI({
  project: "arcookingapp",
  location: "us-central1",
  apiEndpoint: "us-central1-aiplatform.googleapis.com",
  googleAuthOptions: authOptions,
});
// console.log("vertex_ai :", vertex_ai)

const credentials = {
  client_email,
  private_key,
};

const storageClient = new Storage({
  projectId: "arcookingapp",
  credentials: credentials
});
const bucketName = "rarbit_livestream";

const generativeVisionModel = vertex_ai.preview.getGenerativeModel({
  model: "gemini-pro-vision",
});

// Define a global variable to track retry status
let stopRetryFrames = false;
let stepIndex = 0;
let currentStepIndex = 0; // Initialize current step index
let retryCount = 0; // Counter for retry attempts
const maxRetryAttempts = 1000; // Maximum number of retry attempts

export async function checkedListAI(jsonData, batchFrames, stopRetryFrames) {

  return new Promise(async (resolve, reject) => {

    console.log("Entering checkedListAI function");

    // Create an empty array to store pending frames
    const pendingFrames = [];

    // Push the frame into the pending frames array
    // pendingFrames.push(batchFrames); // it will only push 16 frames into 1 frame
    pendingFrames.push(...batchFrames); // it will push 16 frames individually

    // console.log("pendingFrames:", pendingFrames);
    console.log("pendingFrames Length:", pendingFrames.length);

    const bucket = storageClient.bucket(bucketName);

    let allObjectsAndActionsDetected = false;
    // Declare aiResult with a default value
    let aiResult = { checklist: { objects: {}, actions: {} } };
    let resultList = { checklist: { objects: {}, actions: {} } };
    // Initialize uiResult with a deep copy of aiResult
    let uiResult = JSON.parse(JSON.stringify(aiResult));
    let fullChecklist = { current: { timestamp: {}, checklist: {} }, next: {} };
    // Declare a variable to store the previous fullChecklist result
    let previousFullChecklist;
    // let base64Data; // Define base64Data outside the loop
    // Define a variable to keep track of the index of the last processed frame
    let lastProcessedFrameIndex = 0;

    while (pendingFrames.length > 0 && !allObjectsAndActionsDetected && stepIndex < jsonData.length && retryCount < maxRetryAttempts) {
      //   // Wait until data processing is completed
      //   await delay(1000);
      try {
        console.log(`Entering Step ${stepIndex + 1}`);
        console.log("Step index inside loop:", stepIndex);
        // Reset resultList for the next step
        resultList = { checklist: { objects: {}, actions: {} } };
        const stepData = jsonData[stepIndex];
        const timestamp = stepData.timestamp;
        const userChecklist = (JSON.stringify(stepData) + '').replace(/`/g, '\\`');
        console.log("userChecklist:", userChecklist);

        console.log(`Processing Step ${stepIndex + 1} at timestamp ${timestamp}`);
        const nextStepIndex = stepIndex + 1;
        const nextStepData = nextStepIndex < jsonData.length ? jsonData[nextStepIndex] : null;
        let nextUserChecklist = nextStepData ? nextStepData : { timestamp: {}, objects: {}, actions: {} };
        console.log("nextUserChecklist :", nextUserChecklist);

        let objectsDetected = false;
        let actionsDetected = false;

        // for (let i = 0; i < pendingFrames.length; i++) {    
        // Inside your while loop or processing logic
        for (let i = lastProcessedFrameIndex; i < pendingFrames.length; i++) {

          console.log("stepIndex inside for loop:", stepIndex);
          console.log("currentStepIndex inside for loop :", currentStepIndex);
          // Get the first frame from the array
          // const frame = pendingFrames.shift();
          const frame = pendingFrames[i];
          const pixels = frame.flat().map(value => Array.isArray(value) ? value.flat().map(Number) : Number(value));
          const roundedPixels = pixels.map(channelValues => channelValues.map(value => Math.round(value)));
          const flattenedPixels = roundedPixels.flat();
          const clampedPixels = flattenedPixels.map(value => Math.max(0, Math.min(255, value)));
          const buffer = Buffer.from(clampedPixels);
          // console.log("Pixels:", pixels);
          // console.log("Rounded Pixels:", roundedPixels);
          // console.log("Flattened Pixels:", flattenedPixels);
          // console.log("Clamped Pixels:", clampedPixels);
          // console.log("buffer:", buffer);

          // base64Data = buffer.toString('base64');
          // console.log("Base64 encoded data:", base64Data);

          const width = 224;
          const height = 224;
          const jpegBuffer = await sharp(buffer, { raw: { width, height, channels: 3 } }).toFormat('jpeg').toBuffer();
          // const destination = `received_image_${i + 1}.jpg`;
          const createTime = Date.now(); // Get the current timestamp
          const destination = `received_image_${createTime}.jpg`; // Use the timestamp in the filename
          console.log("destination:", destination);
          // const destination = `received_image.jpg`;
          const file = bucket.file(destination);

          await file.save(jpegBuffer, {
            metadata: {
              contentType: 'image/jpeg',
            },
          });

          const fileUri = `gs://${bucketName}/${destination}`;
          console.log("fileUri inside scope :", fileUri);

          const filePart = {
            file_data: {
              file_uri: fileUri,
              mime_type: "image/jpeg",
            },
          };

          // const filePart = {
          //   inlineData: {
          //     mimeType: "image/jpeg",
          //     data: base64Data
          //     // mimeType: "image/*",
          //     // mimeType: "application/octet-stream",
          //   },
          // };

          const prompt = `
          You are an action detection AI, 
          check if the objects and actions in the user's JSON checklist are detected in the live stream from the camera,
          User's JSON Checklist: ${userChecklist},
          only check the objects and actions marked "true", you don't need to check the objects and actions marked false,

          Generate a JSON response that includes a checklist.
          The objects and actions should be represented as boolean values. 

          Ensure that the total response token count does not exceed 4096 tokens to prevent truncation of the response, maintaining its integrity.
          Trim away any markup or formatting, provide only plain text response without JSON markup but in JSON format for API.

          Example:
          {
              "checklist": {
                  "objects": {
                      "objects": true | false
                  },
                  "actions": {
                      "actions": true | false
                  }
              }
          }
      `;


          const promptReplace = prompt.replace(/`/g, '\\`');
          const escapedPrompt = promptReplace.replace(/\\/g, '\\\\');
          console.log("escapedPrompt:", escapedPrompt);
          const textPart = { text: escapedPrompt };
          const request = {
            contents: [{ role: "user", parts: [textPart, filePart] }],
          };
          // const request = {
          //   contents: [
          //     { role: "user", 
          //       parts: [
          //         { text: escapedPrompt,
          //           inline_data: {
          //             mime_type: "image/jpeg",
          //             data: base64Data
          //           }
          //         }
          //       ],
          // }]}
          // const countTokensResp = await generativeVisionModel.countTokens(request);
          // console.log("countTokensResp:", countTokensResp);

          // Introduce a 1-second delay before proceeding
          await delay(1000);

          console.log("stepIndex Before generativeVisionModel :", stepIndex);
          console.log("currentStepIndex Before generativeVisionModel :", currentStepIndex);

          console.log("Request object:", request);
          console.log("Contents parts:", request.contents[0].parts);

          console.log("Before generativeVisionModel.generateContentStream");

          console.log("stepIndex before makeRequest :", stepIndex);
          console.log("currentStepIndex before makeRequest :", currentStepIndex);

          // Inside your loop where you make the API call
          // Proceed with the API call
          if (stepIndex < currentStepIndex) {
            console.log("checking previousFullChecklist before resolve:", previousFullChecklist);
            // Return the previous fullChecklist result
            resolve(previousFullChecklist);
            // Exit the loop or continue to the next iteration as needed
          } else {
            const streamingResp = await makeRequest(
              // () => retryWithExponentialBackoff(
              () => generativeVisionModel.generateContentStream(request),
              100, // Max retry attempts
              2000 // Base delay in milliseconds
              // )
            );

            console.log("streamingResp:", streamingResp);
            console.log("After generativeVisionModel.generateContentStream");
            console.log("After generativeVisionModel.generateContentStream stepIndex:", stepIndex);
            console.log("After generativeVisionModel.generateContentStream currentStepIndex:", currentStepIndex);

            if (stepIndex < currentStepIndex) {
              console.log("checking previousFullChecklist before resolve:", previousFullChecklist);
              // Return the previous fullChecklist result
              resolve(previousFullChecklist);
              // Exit the loop or continue to the next iteration as needed
            } else {
              const aggregatedResponse = await streamingResp.response;

              console.log("aggregatedResponse:", aggregatedResponse);
              console.log("After awaiting response from AI API");
              const response = aggregatedResponse.candidates[0].content.parts[0].text;

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

              const jsonResponse = removeMarkup(response);
              console.log("jsonResponse:", jsonResponse);
              aiResult = JSON.parse(jsonResponse);
              console.log("aiResult:", aiResult);
              console.log("aiResult stepIndex:", stepIndex);
              console.log("aiResult currentStepIndex:", currentStepIndex);

              // Check if JSON format is valid
              if (aiResult.checklist.objects && aiResult.checklist.actions) {
                console.log(`Step ${stepIndex + 1} detected successfully`);
                //   resolve(aiResult);
              } else {
                console.log(`Objects or actions missing in Step ${stepIndex + 1}`);
                return reject(new Error(`Objects or actions missing in Step ${stepIndex + 1}`));
              }
              // Inside your loop where you process each frame batch and get aiResult
              storeResult(aiResult, resultList);

              console.log("resultList:", resultList);

              // Deep copy aiResult to uiResult
              uiResult = JSON.parse(JSON.stringify(aiResult));
              console.log("uiResult before modify:", uiResult);
              console.log("uiResult checklist before modify:", uiResult.checklist);
              console.log("uiResult checklist before-stepIndex:", stepIndex);
              console.log("uiResult checklist before-currentStepIndex:", currentStepIndex);

              // Loop through aiResult and resultList to update uiResult
              for (const category in uiResult.checklist) {
                for (const item in uiResult.checklist[category]) {
                  // Check if the item exists in resultList and is true
                  if (resultList.checklist[category][item]) {
                    // If the item exists and is true in resultList, set it to true in uiResult
                    uiResult.checklist[category][item] = true;
                  }
                }
              }
              console.log("uiResult after modify:", uiResult);
              console.log("uiResult checklist after modify:", uiResult.checklist);
              console.log("uiResult checklist after-stepIndex:", stepIndex);
              console.log("uiResult checklist after-currentStepIndex:", currentStepIndex);

              fullChecklist = { current: { stepIndex: stepIndex, timestamp, checklist: uiResult.checklist }, next: nextUserChecklist };
              console.log("fullChecklist after define:", fullChecklist);
              console.log("fullChecklist stepIndex:", stepIndex);
              console.log("fullChecklist currentStepIndex:", currentStepIndex);

              const allItemsAreTrue = allObjectsAndActionsAreTrue(uiResult);
              console.log("allItemsAreTrue before if() :", allItemsAreTrue);

              if (stepIndex < currentStepIndex) {
                console.log("s<c checking previousFullChecklist before resolve:", previousFullChecklist);
                // Return the previous fullChecklist result
                resolve(previousFullChecklist);
                // Exit the loop or continue to the next iteration as needed
              }

              // if (allObjectsAndActionsAreTrue(uiResult)) {
              if (allItemsAreTrue) {
                console.log("allItemsAreTrue inside if() :", allItemsAreTrue);
                console.log("currentStepIndex when all True:", currentStepIndex);
                console.log("stepIndex when all True:", stepIndex);
                // currentStepIndex = stepIndex; // Update currentStepIndex
                console.log(`Step ${stepIndex + 1} completed successfully`);
                allObjectsAndActionsDetected = true;
                // Increment stepIndex to move to the next step
                // stepIndex++;
                if (stepIndex < jsonData.length - 1) {
                  // Increment stepIndex to move to the next step
                  stepIndex++;
                  currentStepIndex = stepIndex; // Update currentStepIndex
                  console.log("stepIndex after increment inside the if():", stepIndex);
                  console.log("currentStepIndex after increment inside the if():", currentStepIndex);
                }
                console.log("stepIndex after increment after the if():", stepIndex);
                console.log("fullChecklist before resolve:", fullChecklist);
                // Find the index of the last processed frame
                const lastProcessedFrameIndex = pendingFrames.indexOf(frame) + 1;
                // After processing all frames, remove the processed frames from the pendingFrames array
                pendingFrames.splice(0, lastProcessedFrameIndex);
                previousFullChecklist = fullChecklist;
                console.log("updated to previousFullChecklist before resolve:", previousFullChecklist);
                resolve(fullChecklist);
              } else {
                console.log(`Step ${stepIndex + 1} detection ongoing`);
                resolve(fullChecklist);
              }
              // } else {
              //   // Tokens are not available, retry mechanism will handle rate limiting
              //   // Insufficient tokens available, need to wait or handle accordingly
              //   console.log('Insufficient tokens. Please wait or handle accordingly.');
              // }// tokenBucket
            } //if (stepIndex <= currentStepIndex) { #2
          } //if (stepIndex <= currentStepIndex) { #1
        }// for loop
        console.log("Step index outside for loop:", stepIndex); // stepIndex will be next stepIndex here
      } catch (error) {
        console.error("Error in object and action detection:", error);
        // Reject the promise for other errors
        reject(error);
      } // try block
    }// while loop// for loop
  } // end of Promise constructor 
  )
}

function storeResult(aiResult, resultList) {
  // Loop through the objects and actions in aiResult
  for (const category in aiResult.checklist) {
    for (const item in aiResult.checklist[category]) {
      // If the item is true, set it to true in the corresponding category in the resultList
      if (aiResult.checklist[category][item]) {
        resultList.checklist[category][item] = true;
      }
    }
  }
}

function allObjectsAndActionsAreTrue(uiResult) {
  const { objects, actions } = uiResult.checklist;

  // Check if all objects are true
  for (const item in objects) {
    if (!objects[item]) {
      return false;
    }
  }

  // Check if all actions are true
  for (const item in actions) {
    if (!actions[item]) {
      return false;
    }
  }

  return true;
}

const maxDelay = 60000; // Maximum delay set to 60 seconds

async function retryWithExponentialBackoff(operation, maxAttempts, baseDelay) {
  let retryCount = 0;
  let delay = baseDelay;

  while (retryCount < maxAttempts) {
    try {
      if (stopRetryFrames && retryCount > 0) {
        throw new Error('Retry halted by user'); // Throw custom error to exit retry loop
      }
      return await operation();
    } catch (error) {
      console.error("Caught error:", error); // Log the entire error object
      console.log("error.stack:", error.stack); // Print stack trace
      if (stopRetryFrames) {
        console.log('Retry halted by user. Exiting retry loop.');
        break; // Exit the retry loop if retry is halted by the user
      }
      if (error.response && error.response.status === 429) {
        console.log("Received HTTP 429 - Too Many Requests. Retrying after delay...");
        await delay(delay); // Delay before next retry
        retryCount++;
        delay *= 2; // Exponential increase in delay
        delay = Math.min(delay, maxDelay); // Ensure delay does not exceed maxDelay
        console.log("Retry attempt:", retryCount);
      } else {
        console.error('Non-retryable error occurred:', error); // Log the non-retryable error
        throw error; // Throw error for non-retryable errors
      }
    }
  }
  throw new Error(`Operation failed after ${maxAttempts} attempts.`);
}

async function delay(ms) {
  return new Promise(resolve => setTimeout(resolve, ms));
}

async function getGoogleServiceAccountKey() {
  const secretName = "google_service_key.json";
  const client = new SecretsManagerClient({ region: "us-east-2" });

  try {
    const response = await client.send(
      new GetSecretValueCommand({
        SecretId: secretName,
        VersionStage: "AWSCURRENT"
      })
    );
    return response.SecretString;
  } catch (error) {
    console.error("Error retrieving secret:", error);
    throw error;
  }
}

// Define the TokenBucket class
class TokenBucket {
  constructor(capacity, refillRate) {
    this.capacity = capacity;
    this.tokens = capacity;
    this.refillRate = refillRate;
    this.lastRefillTime = Date.now();
  }

  refill() {
    const now = Date.now();
    const elapsedTime = now - this.lastRefillTime;
    const tokensToAdd = Math.floor(elapsedTime / this.refillRate);
    this.tokens = Math.min(this.capacity, this.tokens + tokensToAdd);
    this.lastRefillTime = now;
  }

  consume(tokens) {
    this.refill(); // Refill the token bucket before consuming tokens
    if (this.tokens >= tokens) {
      this.tokens -= tokens;
      return true; // Tokens available, can proceed with request
    } else {
      return false; // Insufficient tokens available, need to wait before proceeding with request
    }
  }
}

// Create an instance of TokenBucket with appropriate capacity and refill rate
// const tokenBucket = new TokenBucket(4096, 60000 / 60); // Capacity of 4096 tokens, refill rate based on 60 requests per minute

// Example usage
// if (tokenBucket.consumeToken()) {
//   // Make API request
//   const countTokensResp = await generativeModel.countTokens(request);
//   // Process the response and adjust token consumption accordingly
// } else {
//   // Wait and retry later
// }

// Create an empty array to store pending requests
const pendingRequests = [];
const tokenBucket = new TokenBucket(60, 60000 / 60); // Capacity of 60 tokens, refill rate based on 60 requests per minute

async function makeRequest(operation, maxAttempts, baseDelay) {

  console.log("makeRequest stepIndex:", stepIndex);
  console.log("makeRequest currentStepIndex:", currentStepIndex);
  // Check if there are enough tokens available in the token bucket
  if (!tokenBucket.consume(1)) {
    // Encapsulate the operation within a retry mechanism
    const operationWithRetry = retryWithExponentialBackoff(operation, maxAttempts, baseDelay);

    try {
      // Make the request
      const result = await operationWithRetry;
      console.log("Result of operationWithRetry:", result);

      // Track and log the request rate
      await trackRequestRate();

      return result;
    } catch (error) {
      // Handle error if retry mechanism fails
      console.error("Error in makeRequest:", error);
      throw new Error("Failed to make request with retry mechanism");
    } finally {
      // Remove the completed request from the pendingRequests array
      pendingRequests.shift();
    }
  } else {
    // There are enough tokens available, proceed with the operation
    try {
      // Make the request without encapsulating in a retry mechanism
      const result = await operation();

      // Track and log the request rate
      await trackRequestRate();

      console.log("makeRequest trackRequestRate stepIndex:", stepIndex);
      console.log("makeRequest trackRequestRate StepIndex:", currentStepIndex);

      return result;
    } catch (error) {
      // Handle error if operation fails
      console.error("Error in makeRequest:", error);
      throw new Error("Failed to make request without retry mechanism");
    }
  }
}

let requestCount = 0;
const requestStartTime = Date.now();
let lastRequestTime = Date.now(); // Declare lastRequestTime at the global scope;

// Function to track and log the rate of requests
async function trackRequestRate() {
  const currentTime = Date.now();
  const elapsedTimeSinceLastRequest = currentTime - lastRequestTime;

  // Update lastRequestTime to the current time
  lastRequestTime = currentTime;

  // If the elapsed time since the last request is less than 1 second, introduce a delay
  if (elapsedTimeSinceLastRequest < 1000) {
    const delayDuration = 1000 - elapsedTimeSinceLastRequest;
    console.log("elapsedTimeSinceLastRequest:", elapsedTimeSinceLastRequest);
    console.log("delayDuration:", delayDuration);
    await delay(delayDuration);
  }

  requestCount++;

  // Calculate the elapsed time since the first request
  const elapsedTimeInSeconds = (lastRequestTime - requestStartTime) / 1000;

  // Calculate the request rate
  const requestRate = requestCount / elapsedTimeInSeconds;

  console.log(`Request rate: ${requestRate.toFixed(2)} requests per second`);
}

// async function uploadToStorage(file, jpegBuffer) {
//   const maxAttempts = 100; // Maximum number of retry attempts
//   let attempt = 1;

//   while (attempt <= maxAttempts) {
//       try {
//           console.log(`Attempting to upload file (Attempt ${attempt})`);
//           await file.save(jpegBuffer, {
//               metadata: {
//                   contentType: 'image/jpeg',
//               },
//           });
//           console.log('File uploaded successfully');
//           return; // Exit the function after successful upload
//       } catch (error) {
//           console.error(`Error uploading file (Attempt ${attempt}):`, error);
//           if (attempt === maxAttempts) {
//               throw new Error('Retry limit exceeded. Upload failed.');
//           } else {
//               const backoffTime = Math.pow(2, attempt) * 2000; // Exponential backoff
//               console.log(`Retrying upload after ${backoffTime} milliseconds...`);
//               await delay(backoffTime); // Wait before retrying
//               attempt++;
//           }
//       }
//   }
// }