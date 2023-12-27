// checkedList.js
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

    const frames = await captureFrames(); // Function to capture frames from webcam

    // Send frames to Vertex AI for detection
    const filePart = {
      file_data: {
        file_content: frames, // Send frames as the content
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
    console.error("Error:", error);
    return "Error generating content";
  }
}

// Function to capture frames from webcam using TensorFlow.js
async function captureFrames() {
  const video = document.createElement("video");
  document.body.appendChild(video);

  const stream = await navigator.mediaDevices.getUserMedia({ video: true });
  video.srcObject = stream;

  return new Promise((resolve) => {
    video.onloadedmetadata = () => {
      const frames = [];
      const canvas = document.createElement("canvas");
      const context = canvas.getContext("2d");
      canvas.width = video.videoWidth;
      canvas.height = video.videoHeight;

      const interval = setInterval(() => {
        context.drawImage(video, 0, 0, video.videoWidth, video.videoHeight);
        const imageData = context.getImageData(
          0,
          0,
          video.videoWidth,
          video.videoHeight
        );
        frames.push(imageData);

        // Limit the number of frames to send (adjust as needed)
        if (frames.length === 10) {
          clearInterval(interval);
          video.srcObject.getTracks().forEach((track) => track.stop());
          document.body.removeChild(video);
          resolve(frames);
        }
      }, 100); // Adjust the interval as needed
    };
  });
}
