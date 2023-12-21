// server.js
import express from "express";
import { checkedList } from "./api/checkedList.js";
import { checkbox } from "./api/checkbox.js";

const app = express();
const port = 3000;

app.use(
  express.static("public", {
    extensions: ["html", "js"],
    type: "application/javascript",
  })
);

app.get("/", (req, res) => {
  res.sendFile(__dirname + "/public/index.html");
});

// Step 1. get CHECKBOX FINAL Checklist
app.get("/api/checkbox", async (req, res) => {
  try {
    const result = await checkbox();
    res.json(result);
  } catch (error) {
    console.error("Error:", error);
    res.status(500).json({ error: "Internal Server Error" });
  }
});

// Step 2. post Final CheckList to checkedList API
app.post("/api/checkedList", express.json(), async (req, res) => {
  const { jsonData } = req.body; // Assuming the client sends jsonData in the request body

  try {
    const result = await checkedList(jsonData);
    res.json(result);
  } catch (error) {
    console.error("Error:", error);
    res.status(500).json({ error: "Internal Server Error" });
  }
});

// Step 3. get the checked List ( tick / x ) from checkedList API
app.get("/api/checkedList", async (req, res) => {
  try {
    const result = await checkedList();
    res.json(result);
  } catch (error) {
    console.error("Error:", error);
    res.status(500).json({ error: "Internal Server Error" });
  }
});

app.listen(port, () => {
  console.log(`Server listening at http://localhost:${port}`);
});
