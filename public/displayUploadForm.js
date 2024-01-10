// displayUploadForm.js
import { displayCheckbox } from "./displayCheckbox.js";

// Function to display the form and handle form submission
export function displayUploadForm(uploadVideoGS) {
  // Create form container element
  const formContainer = document.createElement("div");
  formContainer.id = "uploadFormContainer";
  formContainer.textContent = "Paste your video link (e.g., YouTube link):";

  // Create form element
  const form = document.createElement("form");

  // Create input field
  const videoLinkInput = document.createElement("input");
  videoLinkInput.type = "text";
  videoLinkInput.id = "videoLinkInput";
  videoLinkInput.required = true;
  form.appendChild(videoLinkInput);

  // Create upload button
  const uploadButton = document.createElement("button");
  uploadButton.textContent = "Upload";
  // uploadButton.onclick = () => uploadVideoGS();
  uploadButton.type = "submit";
  form.appendChild(uploadButton);

  // Update the event listener for form submission
  form.addEventListener("submit", async (event) => {
    // Prevent the default form submission behavior
    event.preventDefault();

    // Call the uploadVideoGS function
    await uploadVideoGS();
  });

  // Add a keydown event listener to the input field
  videoLinkInput.addEventListener("keydown", (event) => {
    // Check if the pressed key is "Enter" (key code 13)
    if (event.key === "Enter") {
      // Trigger the click event on the upload button
      uploadButton.click();
    }
  });

  // Append the form to the form container
  formContainer.appendChild(form);

  // Append the form container to the document body or any other desired parent element
  document.body.appendChild(formContainer);
}

// Your asynchronous code here
document.addEventListener("DOMContentLoaded", async () => {
  // Step 1: Define a variable to store the checklist data
  let jsonData;

  // Step 2: Define the function to upload video
  const uploadVideoGS = async () => {
    try {
      // If jsonData is not defined, make the initial API call
      if (!jsonData) {
        // Get the video link from the input field
        const videoLinkInput = document.getElementById("videoLinkInput");
        const videoLink = videoLinkInput.value;

        // Make a fetch request to the server to handle the video upload
        const response = await fetch("/api/uploadVideo", {
          method: "POST",
          headers: {
            "Content-Type": "application/json",
          },
          body: JSON.stringify({ videoLink }),
        });

        if (!response.ok) {
          throw new Error(`HTTP error! Status: ${response.status}`);
        }

        // Parse the JSON response
        jsonData = await response.json();

        // Log or display the result as needed
        console.log("Script.js result before displayCheckbox:", jsonData);
      }

      // You need to await the displayCheckbox function, as it's an asynchronous function
      await displayCheckbox(jsonData);
    } catch (error) {
      console.error("Error:", error);
      // Handle errors
    }
  };

  // Step 3: Display the upload form with dynamic event binding
  displayUploadForm(uploadVideoGS);
});
