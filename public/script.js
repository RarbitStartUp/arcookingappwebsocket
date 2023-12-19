import { displayCheckedList } from "./displayCheckedList.js";
// Wrap the code in a window load event listener
window.addEventListener("load", () => {
  // Fetch data from the API endpoint
  fetch("/api/data")
    .then((response) => {
      if (!response.ok) {
        throw new Error(`HTTP error! Status: ${response.status}`);
      }
      return response.json();
    })
    .then((result) => {
      // Log the entire result object to the console
      console.log(result);

      // Display the checklist in the result container
      displayCheckedList(result);
    })
    .catch((error) => {
      console.error("Error fetching result from server:", error);
      document.getElementById("result-container").textContent =
        "Error fetching result from server";
    });
});
