// displayCheckedList.js
export async function displayCheckedList(aiResult) {
  const resultContainer = document.getElementById("result-container");

  try {
    // Display the structured content with default checkboxes (all blank)
    resultContainer.innerHTML = `
      <div>
        <h1>Checklist</h1>
        <div>
          <h2>Objects</h2>
          <ul>
            ${Object.keys(aiResult.checklist.objects)
              .map((object, index) => `<li>${index + 1}. ${object}</li>`)
              .join("")}
          </ul>
        </div>
        <div>
          <h2>Actions</h2>
          <ul>
            ${Object.keys(aiResult.checklist.actions)
              .map((action, index) => `<li>${index + 1}. ${action}</li>`)
              .join("")}
          </ul>
        </div>
      </div>
    `;

    // Update the checkboxes based on AI results
    updateCheckboxes(aiResult);
  } catch (parseError) {
    console.error("Error parsing combined data:", parseError);
    resultContainer.textContent = "Error parsing combined data.";
  }
}

function updateCheckboxes(aiResult) {
  try {
    // Update the UI based on real-time AI results
    Object.keys(aiResult.checklist.objects).forEach((object) => {
      const checkbox = document.querySelector(`input[data-object="${object}"]`);
      if (checkbox) {
        checkbox.checked = aiResult.checklist.objects[object];
      }
    });

    Object.keys(aiResult.checklist.actions).forEach((action) => {
      const checkbox = document.querySelector(`input[data-action="${action}"]`);
      if (checkbox) {
        checkbox.checked = aiResult.checklist.actions[action];
      }
    });
  } catch (parseError) {
    console.error("Error parsing AI results JSON:", parseError);
    // Handle the error, e.g., display an error message to the user
  }
}
