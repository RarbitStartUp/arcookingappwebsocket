// displayCheckbox.js
import { displayCheckedList } from "./displayCheckedList.js";
// Define an array to store added items
let addedItems = [];

export async function displayCheckbox(apiResponse, onAddItem) {
  const resultContainer = document.getElementById("result-container");

  // Log the received API response
  console.log("Received API Response:", apiResponse);

  // A helper function for safely parsing JSON
  function safeJsonParse(jsonString) {
    try {
      return JSON.parse(jsonString);
    } catch (error) {
      console.error("Error parsing JSON:", error);
      throw new Error("Invalid JSON format");
    }
  }

  // Extract the JSON-formatted string from the API response
  const jsonString = apiResponse.result.parts[0].text;

  // Parse the JSON-formatted string
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

  try {
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
      <button id="submitBtn">Submit Checklist</button>
    `;

    // Define functions to add new items
    window.addNewItem = async (listId, inputId) => {
      try {
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
          <input type="checkbox" checked ${
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

        // Store the added item
        addedItems.push(newItem);

        // Log the jsonData before submitting
        console.log("before submit:", jsonData);

        // Call the onAddItem callback with the added items
        if (onAddItem) {
          onAddItem(addedItems);
        }

        return jsonData;
      } catch (error) {
        console.error("Error adding new items:", error);
        alert("Error adding new items. Please try again.");
      }
    };

    // Create and append the "Submit Checklist" button
    const submitButton = document.getElementById("submitBtn");
    submitButton.onclick = async () => {
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

        // Remove the submit button if it's still in the DOM
        if (submitButton.parentNode) {
          submitButton.parentNode.removeChild(submitButton);
        }
      } catch (error) {
        console.error("Error updating checklist:", error);
        document.getElementById("result-container").textContent =
          "Error updating checklist. Please try again.";
      }
    };

    return jsonData;
  } catch (error) {
    console.error("Error displaying Checkbox:", error);
    alert("Error displaying Checkbox. Please try again.");
  }
}
