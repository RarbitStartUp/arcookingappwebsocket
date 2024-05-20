import { Storage } from "@google-cloud/storage";
import { uploadVideoAI } from "../lib/uploadVideoAI.js";
import ytdl from "ytdl-core";
import { getGoogleServiceAccountKey } from "../lib/getGoogleServiceAccountKey.js"

export async function uploadVideo(req, res) {
  try {
    console.log("inputlink in uploadVideo.js :", req.body);

    const { inputLink } = req.body;

    // Now you can use inputLink as needed
    console.log("Received input link in uploadVideo.js:", inputLink);

    const bucketName = "users_uploads";
    // console.log("credentials:", credentials);
    const secret = await getGoogleServiceAccountKey();
    console.log("secret:", secret);

    // Parse the secret JSON string
    const { client_email, private_key } = JSON.parse(secret);

    // Create a credentials object
    const credentials = {
      client_email,
      private_key,
    };
    console.log("credentials:", credentials)

    const storageClient = new Storage({
      projectId: "arcookingapp",
      credentials: credentials,
      // keyFilename: "google_service_key.json",
    });
    console.log("storageClient:", storageClient);

    let totalFileSize = 0; // Initialize fileSize to zero
    let totalBytesTransferred = 0;

    const filename = `video_${Date.now()}.mp4`;
    const file = storageClient.bucket(bucketName).file(filename);
    console.log("Uploading file:", filename);

    const writeStream = file.createWriteStream();

    const videoStream = ytdl(inputLink, { filter: "audioandvideo" });

    videoStream.on("progress", (_, totalBytes, totalBytesExpected) => {
      totalBytesTransferred = totalBytes;
      totalFileSize = totalBytesExpected;

      const progress = (totalBytesTransferred / totalFileSize) * 100;
      console.log("Progress:", progress.toFixed(2) + "%");

      // Pass progress to the API endpoint
      // sendProgressToEndpoint(progress);
    });

    videoStream.pipe(writeStream);

    await new Promise((resolve, reject) => {
      writeStream.on("finish", () => {
        // clearInterval(progressEmitter);
        console.log("Upload complete");
        resolve();
      });
      writeStream.on("error", (error) => {
        // clearInterval(progressEmitter);
        console.error("Error uploading file:", error);
        reject(error);
      });
    });

    const fileUri = `gs://${bucketName}/${filename}`;
    console.log("File uploaded to:", fileUri);

    const apiResponse = await uploadVideoAI(fileUri);
    console.log("Checkbox AI response:", apiResponse);

    // Delete the uploaded video after processing
    await file.delete();

    // Parse the text property to extract the JSON data
    const responseData = JSON.parse(apiResponse);

    // Now you can access the JSON data
    console.log("Parsed JSON data:", responseData);

    // return apiResponse;
    res.status(200).send(responseData);
  } catch (error) {
    console.error("Error uploading video:", error);
    res.status(500).send("Internal server error");
  }
}

// async function sendProgressToEndpoint(progress) {
//   try {
//     const response = await fetch('api/progress', {
//       headers:{
//         Accept: 'application/json',
//         method: 'POST',
//         // body: JSON.stringify({ progress }),
//         body: progress.toString()
//       }
//     });
//     if (!response.ok) {
//       throw new Error('Failed to send progress to the API endpoint');
//     }
//   } catch (error) {
//     console.error('Error sending progress to endpoint:', error);
//   }
// }
// async function sendProgressToEndpoint(progress) {
//   try {
//     const response = await fetch('http://localhost:3000/api/progress', {
//       method: 'POST',
//       headers: { 
//         'Content-Type': 'application/json',
//       },
//       body: JSON.stringify({ progress }),
//     });
//     if (!response.ok) {
//       throw new Error('Failed to send progress to the API endpoint');
//     }
//   } catch (error) {
//     console.error('Error sending progress to endpoint:', error);
//   }
// }