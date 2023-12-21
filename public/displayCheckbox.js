// displayCheckbox.js

export async function displayCheckbox(result) {
  const resultContainer = document.getElementById("result-container");

  try {
    // Log the raw API response
    console.log("API Response:", result);

    // Check if the result is defined
    if (!result || !result.parts || result.parts.length === 0) {
      console.error("Error: Invalid API response");
      alert("Error: Invalid API response. Please try again.");
      return;
    }

    function safeJsonParse(fixedJsonString) {
      try {
        return JSON.parse(fixedJsonString);
      } catch (error) {
        console.error("Error parsing JSON:", error);
        throw new Error("Invalid JSON format");
      }
    }

    // Parse the JSON-formatted string using a safer method
    const jsonString = result.parts[0].text;
    const jsonData = safeJsonParse(jsonString);

    // Check if the expected structure exists
    if (
      !jsonData ||
      !jsonData.checklist ||
      !jsonData.checklist.objects ||
      !jsonData.checklist.actions
    ) {
      console.error("Error: Invalid JSON structure");
      alert("Error: Invalid JSON structure. Please try again.");
      return;
    }

    // Log the parsed JSON data
    console.log("Parsed JSON Data:", jsonData);

    // Display the structured content with checkbox icons and input boxes
    resultContainer.innerHTML = `
      <div>
        <h1>Checklist</h1>
        <div>
          <h2>Objects</h2>
          <ul class="item-list" id="objectList">
            ${Object.keys(jsonData.checklist.objects)
              .map(
                (object, index) => `
                  <li>
                    ${index + 1}. 
                    <span>${object}</span>
                    <input type="checkbox" ${
                      jsonData.checklist.objects[object] ? "checked" : ""
                    }/ >
                  </li>
                `
              )
              .join("")}
            <li>
              <input type="text" class="new-input" id="newObjectInput" placeholder="Add new object"/>
              <button onclick="addNewItem('objectList', 'newObjectInput')">Add</button>
            </li>
          </ul>
        </div>
        <div>
          <h2>Actions</h2>
          <ul class="item-list" id="actionList">
            ${Object.keys(jsonData.checklist.actions)
              .map(
                (action, index) => `
                  <li>
                    ${index + 1}. 
                    <span>${action}</span>
                    <input type="checkbox" ${
                      jsonData.checklist.actions[action] ? "checked" : ""
                    }/ >
                  </li>
                `
              )
              .join("")}
            <li>
              <input type="text" class="new-input" id="newActionInput" placeholder="Add new action" />
              <button onclick="addNewItem('actionList', 'newActionInput')">Add</button>
            </li>
          </ul>
        </div>
      </div>
    `;

    // Define functions to add new items
    window.addNewItem = (listId, inputId) => {
      const newItemInput = document.getElementById(inputId);
      const itemList = document.getElementById(listId);

      const newItem = newItemInput.value.toLowerCase(); // Convert to lowercase for case-insensitive comparison

      // Check if the item is already in the list
      if (
        Object.keys(
          jsonData.checklist[listId === "objectList" ? "objects" : "actions"]
        ).some((item) => item.toLowerCase() === newItem)
      ) {
        alert("The item is already added!");
        return;
      }

      // Add new item to the list
      const newItemIndex =
        Object.keys(
          jsonData.checklist[listId === "objectList" ? "objects" : "actions"]
        ).length + 1;

      itemList.innerHTML += `
        <li>
          ${newItemIndex}. 
          <span>${newItemInput.value}</span>
          <input type="checkbox" ${
            jsonData.checklist[listId === "objectList" ? "objects" : "actions"][
              newItem
            ]
              ? "checked"
              : ""
          }/>
        </li>
      `;

      // Add new item to jsonData
      jsonData.checklist[listId === "objectList" ? "objects" : "actions"][
        newItem
      ] = true;
    };

    // Log the jsonData before submitting
    console.log("before submit:", jsonData);

    return jsonData;
  } catch (error) {
    console.error("Error displaying checkbox:", error);
    alert("Error displaying checkbox. Please try again.");
  }
}
