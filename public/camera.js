export const cameraFunctions = {
  captureFrames,
  displayFrames,
  startCaptureFrames,
  stopCaptureFrames,
};

let capturingFrames = false;
let framesCallback;
// Function to start capturing frames
async function startCaptureFrames() {
  const { captureFrames, displayFrames, stopCaptureFrames } = cameraFunctions;

  // Clear any previous frames and display the live stream
  displayFrames(stopCaptureFrames);

  // Start capturing frames continuously
  capturingFrames = true;
  while (capturingFrames) {
    const frames = await captureFrames(1); // Capture one frame at a time
    framesCallback(frames);
  }
}

// Function to stop capturing frames
async function stopCaptureFrames() {
  capturingFrames = false;
}

// Function to display frames
async function displayFrames() {
  const container = document.getElementById("camera-feed");
  const video = document.getElementById("videoElement");

  if (!video) {
    console.error("Video element not found.");
    return;
  }

  // Load the camera.js script dynamically
  const script = document.createElement("script");
  script.src = "camera.js";
  document.body.appendChild(script);

  // Clear the container before displaying anything
  container.innerHTML = "";

  // Display the live stream video
  container.appendChild(video);
}

async function captureFrames(captureInterval = 100) {
  const video = document.getElementById("videoElement");
  const stream = await navigator.mediaDevices.getUserMedia({ video: true });
  video.srcObject = stream;

  await new Promise((resolve) => (video.onloadedmetadata = resolve));
  const { videoWidth, videoHeight } = video;

  const frames = [];

  return new Promise(async (resolve) => {
    video.play();

    const captureFrame = async () => {
      const canvas = document.createElement("canvas");
      canvas.width = videoWidth;
      canvas.height = videoHeight;

      const context = canvas.getContext("2d");
      context.drawImage(video, 0, 0, videoWidth, videoHeight);

      const imageData = context.getImageData(0, 0, videoWidth, videoHeight);
      frames.push(imageData);

      // Call the captureFrame function recursively after the captureInterval
      setTimeout(captureFrame, captureInterval);
    };

    // Start capturing frames
    captureFrame();

    // You can add a mechanism to stop the continuous capture, for example, by setting a flag
    // For demonstration purposes, I'm adding a stopCaptureFrames function that you can call to stop capturing
    const stopCaptureFrames = () => {
      // Clear the timeout to stop capturing frames
      clearTimeout(timeoutId);
      resolve(frames);
    };

    // Return the stopCaptureFrames function
    resolve(stopCaptureFrames);
  });
}
