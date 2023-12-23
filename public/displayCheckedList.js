export async function displayCheckedList(result) {
  const resultContainer = document.getElementById("result-container");

  // Example: Apply different styles based on JSON data
  if (
    result.parts &&
    Array.isArray(result.parts) &&
    result.parts.length > 0 &&
    result.parts[0].text
  ) {
    try {
      // Parse the JSON-formatted string
      const jsonData = JSON.parse(result.parts[0].text);

      console.log("final checklist:", jsonData);

      // Display the structured content with tick icons
      resultContainer.innerHTML = `
          <div>
            <h1>Checklist</h1>
            <div>
              <h2>Objects</h2>
              <ul>
                ${Object.keys(jsonData.checklist.objects)
                  .map(
                    (object, index) =>
                      `<li>${index + 1}. ${object} ${
                        jsonData.checklist.objects[object] ? "✓" : "✗"
                      }</li>`
                  )
                  .join("")}
              </ul>
            </div>
            <div>
              <h2>Actions</h2>
              <ul>
                ${Object.keys(jsonData.checklist.actions)
                  .map(
                    (action, index) =>
                      `<li>${index + 1}. ${action} ${
                        jsonData.checklist.actions[action] ? "✓" : "✗"
                      }</li>`
                  )
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
    resultContainer.textContent = "Invalid or missing data in the response.";
  }
}
