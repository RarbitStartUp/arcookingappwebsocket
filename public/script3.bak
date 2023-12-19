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
      displayChecklist(result);
    })
    .catch((error) => {
      console.error("Error fetching result from server:", error);
      document.getElementById("result-container").textContent =
        "Error fetching result from server";
    });

  function displayChecklist(result) {
    const resultContainer = document.getElementById("result-container");

    // Example: Apply different styles based on JSON data
    if (
      result.parts &&
      Array.isArray(result.parts) &&
      result.parts.length > 0 &&
      result.parts[0].text
    ) {
      resultContainer.style.backgroundColor = "lightgreen";

      try {
        // Parse the JSON-formatted string
        const jsonData = JSON.parse(result.parts[0].text);

        // Display the structured content
        resultContainer.innerHTML = `
          <div>
            <h1>Checklist</h1>
            <div>
              <h2>Objects</h2>
              <ul>
                ${Object.keys(jsonData.checklist.objects)
                  .map((object, index) => `<li>${index + 1}. ${object}</li>`)
                  .join("")}
              </ul>
            </div>
            <div>
              <h2>Actions</h2>
              <ul>
                ${Object.keys(jsonData.checklist.actions)
                  .map((action, index) => `<li>${index + 1}. ${action}</li>`)
                  .join("")}
              </ul>
            </div>
          </div>
        `;
      } catch (parseError) {
        console.error("Error parsing JSON:", parseError);
        resultContainer.textContent = "Error parsing JSON data.";
      }
    } else {
      resultContainer.style.backgroundColor = "lightcoral";
      resultContainer.textContent = "Invalid or missing data in the response.";
    }
  }
});
