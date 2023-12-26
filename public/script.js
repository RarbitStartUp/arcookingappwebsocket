// script.js
import { displayCheckbox } from "./displayCheckbox.js";
import { displayUploadForm } from "./displayUploadForm.js";

// Define a variable to store the checklist data
let jsonData;

// Display the upload form on window load
window.addEventListener("load", displayUploadForm);

// Step 1: Handle video upload and get the result to display checkbox
window.uploadVideoGS = async () => {
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
      // you are declaring a new jsonData variable inside the if statement, which is overshadowing the outer jsonData variable. To fix this, remove the const keyword from the line inside the if statement:
      // This way, you will be updating the outer jsonData variable.
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
