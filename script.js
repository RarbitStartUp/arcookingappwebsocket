// script.js
import { displayCheckedList } from "./displayCheckedList.js";
import { displayCheckbox } from "./displayCheckbox.js";

// Step 1 : Get result to display checkbox
// Wrap the code in a window load event listener
window.addEventListener("load", async () => {
  try {
    // Fetch data from the API endpoint
    const response = await fetch("/checkbox", {
      method: "GET",
      headers: {
        "Content-Type": "application/json",
      },
    });

    if (!response.ok) {
      throw new Error(`HTTP error! Status: ${response.status}`);
    }

    // Parse the JSON response
    const result = await response.json();

    // Log the entire result object to the console
    console.log("result pass to sciprt.js : ", result);

    // Step 2. get the result to pass to displayCheckbox to get jsonData back
    //         and pass to checkedList.js API to detect and compare

    // Display the checklist in the result container if result is defined
    if (result) {
      // Display the checkbox data and get the jsonData
      const jsonData = await displayCheckbox(result);

      // Log the jsonData before sending it to the server
      console.log("jsonData:", jsonData);

      // Now, the update logic will be moved to submitChecklist function
      window.submitChecklist = async () => {
        try {
          // Send jsonData to the server using fetch or another method
          const checkedListResponse = await fetch("/checkedList", {
            method: "POST",
            headers: {
              "Content-Type": "application/json",
              // No need to set Content-Type, as it will be set automatically by FormData
              // when sending FormData, you should set the "Content-Type" header to "multipart/form-data" instead of "application/json". FormData is used for sending binary data, including files, and it uses a different content type.
              // By omitting the "Content-Type" header, the browser will automatically set it to "multipart/form-data" when FormData is used in the body. This is the appropriate content type for sending a mixture of text and binary data, such as when uploading files.
            },
            body: JSON.stringify({ jsonData }),
            // body: formData,
          });

          if (!checkedListResponse.ok) {
            throw new Error(
              `HTTP error! Status: ${checkedListResponse.status}`
            );
          }

          const checkedListResult = await checkedListResponse.json();

          // Handle the checkedList result if needed
          console.log("checkedListResult:", checkedListResult);

          // Display the checked list in the result container
          displayCheckedList(checkedListResult);

          // // Step 3. fetch comparative checklist from Vertex AI API to display result ( tick / cross )
          // // Fetch and display the checked list
          // const checkedListApiResponse = await fetch("/api/checkedList");

          // if (!checkedListApiResponse.ok) {
          //   throw new Error(
          //     `HTTP error! Status: ${checkedListApiResponse.status}`
          //   );
          // }

          // console.log(
          //   "return comparation from Vertex AI:",
          //   checkedListApiResponse
          // );
          // const checkedListResultApi = await checkedListApiResponse.json();
          // // Log the entire checked list result object to the console
          // console.log(
          //   "return comparation from Vertex AI:",
          //   checkedListResultApi
          // );

          // // Display the checked list in the result container
          // displayCheckedList(checkedListResultApi);

          // Remove the submit button
          const submitButton = document.querySelector("button");
          submitButton.parentNode.removeChild(submitButton);
        } catch (error) {
          console.error("Error updating checklist:", error);
          document.getElementById("result-container").textContent =
            "Error updating checklist. Please try again.";
        }
      };
    } else {
      console.error("Error: API response is undefined");
      document.getElementById("result-container").textContent =
        "Error: API response is undefined";
    }
  } catch (error) {
    console.error("Error:", error);
    document.getElementById("result-container").textContent =
      "Error fetching or processing data from the server";
  }
});
