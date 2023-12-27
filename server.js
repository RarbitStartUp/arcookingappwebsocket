// server.js
import express from "express";
import { fileURLToPath } from "url"; // Import fileURLToPath function
import { checkedList } from "./api/checkedList.js";
import { uploadVideo } from "./api/uploadVideo.js";

import path from "path";

const app = express();
const port = 3000;

// Get the directory path using import.meta.url
const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);

app.use(
  express.static(path.join(__dirname, "public"), {
    // Use path.join to join __dirname and "public"
    extensions: ["html", "js"],
    type: "application/javascript",
  })
);

app.get("/", (req, res) => {
  res.sendFile(path.join(__dirname, "public", "index.html")); // Use path.join to join __dirname, "public", and "index.html"
});

// Step 0. Handle video upload
// Handle video upload
app.post("/api/uploadVideo", express.json(), uploadVideo);

// Step 1. get CHECKBOX FINAL Checklist
app.get("/api/uploadVideo", async (req, res) => {
  try {
    const result = await uploadVideo();
    console.error("Server Step 1 :", result);
    res.json(result);
  } catch (error) {
    console.error("Error:", error);
    res.status(500).json({ error: "Internal Server Error" });
  }
});

// Step 2. post Final CheckList to checkedList API and return result
app.post("/api/checkedList", express.json(), async (req, res) => {
  const { jsonData } = req.body; // Assuming the client sends jsonData in the request body

  try {
    const result = await checkedList(jsonData);
    console.error("Server Step 2 :", result);
    res.json(result);
  } catch (error) {
    console.error("Error:", error);
    res.status(500).json({ error: "Internal Server Error" });
  }
});

app.listen(port, "0.0.0.0", () => {
  // console.log(`Server listening at http://localhost:${port}`);
  // console.log(`Server is running on port ${port}`);
  console.log("Server listening at http://0.0.0.0:3000");
});
