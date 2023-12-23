// script.js
import { displayCheckedList } from "./displayCheckedList.js";
import { displayCheckbox } from "./displayCheckbox.js";
import { displayUploadForm } from "./displayUploadForm.js";

// Display the upload form on window load
window.addEventListener("load", displayUploadForm);

// Step 1: Handle video upload and get the result to display checkbox
window.uploadVideoGS = async () => {
  try {
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
    const result = await response.json();

    // Log or display the result as needed
    console.log("Upload result:", result);

    // Step 2: Display the checkbox data and get the jsonData
    const jsonData = await displayCheckbox(result);

    // Log the jsonData before sending it to the server
    console.log("jsonData:", jsonData);
    return jsonData;
  } catch (error) {
    console.error("Error:", error);
    // Handle errors
  }
};

// Now, the update logic will be moved to submitChecklist function
window.submitChecklist = async () => {
  const jsonData = await uploadVideoGS();

  try {
    // Send jsonData to the server using fetch or another method
    const checkedListResponse = await fetch("/api/checkedList", {
      method: "POST",
      headers: {
        "Content-Type": "application/json",
      },
      body: JSON.stringify({ jsonData }),
    });

    if (!checkedListResponse.ok) {
      throw new Error(`HTTP error! Status: ${checkedListResponse.status}`);
    }

    const checkedListResult = await checkedListResponse.json();

    // Handle the checkedList result if needed
    console.log("checkedListResult:", checkedListResult);

    // Display the checked list in the result container
    displayCheckedList(checkedListResult);

    // Remove the submit button
    const submitButton = document.querySelector("button");
    submitButton.parentNode.removeChild(submitButton);
  } catch (error) {
    console.error("Error updating checklist:", error);
    document.getElementById("result-container").textContent =
      "Error updating checklist. Please try again.";
  }
};
