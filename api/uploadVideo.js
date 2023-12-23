import { Storage } from "@google-cloud/storage";
import { checkbox } from "./checkbox.js";
import ytdl from "ytdl-core";

const storage = new Storage();
const bucketName = "users_uploads";

export async function uploadVideo(req, res) {
  try {
    const { videoLink } = req.body;

    // Validate the video link or perform any necessary checks

    // Generate a unique filename for the uploaded video
    const filename = `video_${Date.now()}.mp4`;

    // Download the YouTube video
    const videoStream = ytdl(videoLink, { filter: "audioandvideo" });
    const writeStream = storage
      .bucket(bucketName)
      .file(filename)
      .createWriteStream();

    // Pipe the video stream to the write stream
    videoStream.pipe(writeStream);

    // Wait for the video to be uploaded
    await new Promise((resolve, reject) => {
      writeStream.on("finish", resolve);
      writeStream.on("error", reject);
    });

    // Construct the file URI for the uploaded video
    const fileUri = `gs://${bucketName}/${filename}`;

    // Call checkbox function with the fileUri
    const result = await checkbox(fileUri);

    console.log("upload Video result :", result);

    // You can return the file URI if needed
    res.json({ result });
  } catch (error) {
    console.error("Error uploading video:", error);
    res.status(500).json({ error: "Internal Server Error" });
  }
}
