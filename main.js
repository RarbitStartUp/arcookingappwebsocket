// main.js
import { displayChecklist } from "./public/displayCheckedList.js";

// Wrap the code in a window load event listener
window.addEventListener("load", () => {
  // Fetch data from the API endpoint
  fetchData("/api/data")
    .then((result) => {
      // Log the entire result object to the console
      console.log(result);

      // Call specific functions based on the task
      displayChecklist(result);
      // Call other functions as needed
      // exampleFunction(result);
    })
    .catch((error) => {
      console.error("Error fetching result from server:", error);
      document.getElementById("result-container").textContent =
        "Error fetching result from server";
    });
});
