let video;

export const cameraFunctions = {
  initCamera,
  captureFrames,
  displayFrames,
  startCaptureFrames,
};

video = document.createElement("video");
video.id = "videoElement";

const container = document.createElement("div");
container.id = "camera-feed";
document.body.appendChild(container);

async function initCamera() {
  let isCameraInitialized = false;

  if (isCameraInitialized) {
    console.log("Camera is already initialized");
    return;
  }

  try {
    isCameraInitialized = true;
    const stream = await navigator.mediaDevices.getUserMedia({ video: true });

    video.srcObject = stream;

    // Attach event listener for loadedmetadata
    video.addEventListener("loadedmetadata", () => {
      console.log("Video metadata loaded");
      console.log("Initializing camera...");
    });
  } catch (error) {
    console.error("Error initializing camera:", error);
  }
}

async function displayFrames(frames) {
  try {
    // Create #camera-feed dynamically if it doesn't exist
    container.innerHTML = "";

    // Display the live stream video
    container.appendChild(video);

    // Display each frame one by one
    for (const frame of frames) {
      const canvas = document.createElement("canvas");
      canvas.width = video.videoWidth;
      canvas.height = video.videoHeight;

      const context = canvas.getContext("2d");
      context.putImageData(frame, 0, 0);

      container.appendChild(canvas);

      // Pause briefly to display each frame
      await new Promise((resolve) => setTimeout(resolve, 100)).catch(
        (error) => {
          console.error("Error pausing to display frame:", error);
          // Handle the error, e.g., display an error message to the user or take appropriate action
        }
      );
    }
  } catch (error) {
    console.error("Error displaying frames:", error);
  }
}

async function captureFrames(frames, captureInterval = 100) {
  try {
    // Wait for the loadedmetadata event before accessing video dimensions
    await new Promise((resolve) => {
      const checkDimensions = () => {
        const video = document.getElementById("videoElement");

        if (video && video.videoWidth && video.videoHeight) {
          resolve();
        } else {
          requestAnimationFrame(checkDimensions);
        }
      };

      checkDimensions();
    }).catch((error) => {
      console.error("Error checking video dimensions:", error);
      // Handle the error, e.g., display an error message to the user or take appropriate action
    });

    const { videoWidth, videoHeight } = video;

    const canvas = document.createElement("canvas");
    canvas.width = videoWidth;
    canvas.height = videoHeight;

    const context = canvas.getContext("2d");

    return new Promise(async (resolve, reject) => {
      try {
        await video.play();
        resolve();
      } catch (error) {
        console.error("Error playing video:", error);
        reject(error);
      }

      const captureFrame = async () => {
        try {
          context.drawImage(video, 0, 0, videoWidth, videoHeight);

          const imageData = context.getImageData(0, 0, videoWidth, videoHeight);

          // Ensure that frames is an array before pushing to it
          if (!Array.isArray(frames)) {
            frames = []; // Initialize frames as an array if it's not
          }
          frames.push(imageData);

          // Call the captureFrame function recursively after the captureInterval
          setTimeout(captureFrame, captureInterval);
        } catch (error) {
          console.error("Error capturing frame:", error);
          resolve(frames); // Resolve with the captured frames if an error occurs
        }
      };

      // Start capturing frames
      captureFrame();
    });
  } catch (error) {
    console.error("Error capturing frames:", error.message);
  }
}

export async function startCaptureFrames(socket) {
  if (!socket) {
    socket = new WebSocket("wss://9324-156-146-51-130.ngrok-free.app");

    socket.addEventListener("error", (error) => {
      console.error("WebSocket error:", error);
      // Handle the error, e.g., display an error message to the user
    });

    socket.addEventListener("message", (event) => {
      const aiResult = JSON.parse(event.data);
      console.log(
        "user submitted checklist in displayCheckedList.js :",
        aiResult
      );
      // Assuming you have a displayCheckedList function to handle AI results
      // displayCheckedList(aiResult);
    });

    // Other WebSocket event listeners can be added here
  }

  try {
    // Clear any previous frames and display the live stream
    await displayFrames([]); // Pass an empty array as frames

    isCapturing = true; // Set capturing flag to true

    // Start capturing frames continuously
    async function captureAndCallback() {
      if (isCapturing) {
        const frames = await captureFrames([], 1); // Pass an empty array as frames

        // Display the frames
        displayFrames(frames);

        // Call the WebSocket server to handle frames
        if (socket && socket.readyState === WebSocket.OPEN) {
          socket.send(JSON.stringify({ type: "frames", frames }));
        }

        // Continue capturing frames
        setTimeout(captureAndCallback, 0);
      }
    }

    // Start the recursive capturing
    captureAndCallback();
  } catch (error) {
    console.error("Error starting capture:", error);
  }
}
