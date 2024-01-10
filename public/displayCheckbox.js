// displayCheckbox.js
import { cameraFunctions } from "./camera.js";
import { displayCheckedList } from "./displayCheckedList.js";

// Define an array to store added items
let addedItems = [];
let onRemoveItem; // Declare onRemoveItem at the module level
// Declare isCapturing outside any function or block
let isCapturing = false;

// Create a single WebSocket instance
const socket = new WebSocket("wss://9324-156-146-51-130.ngrok-free.app");

socket.addEventListener("error", (error) => {
  console.error("WebSocket error:", error);
  // Handle the error, e.g., display an error message to the user
});

socket.addEventListener("message", (event) => {
  if (isCapturing) {
    // Process messages only when capturing frames
    const aiResult = JSON.parse(event.data);
    console.log("Received AI result during capturing frames:", aiResult);
    displayCheckedList(aiResult);
  } else {
    // Handle messages differently when not capturing frames
    console.log("Received WebSocket message:", event.data);
  }
});

export async function displayCheckbox(apiResponse, onAddItem) {
  const resultContainer = document.createElement("div");
  resultContainer.id = "result-container";
  document.body.appendChild(resultContainer);

  // Log the received API response
  console.log("Received API Response:", apiResponse);

  // A helper function for safely parsing JSON
  function safeJsonParse(jsonString) {
    try {
      return JSON.parse(jsonString);
    } catch (error) {
      console.error("Error parsing JSON:", error);
      console.error("JSON String causing the error:", jsonString);
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
                  } />
                </li>
              `
            )
            .join("")}
          <li>
            <input type="text" class="new-input" id="newActionInput" placeholder="Add new action"/>
            <button onclick="addNewItem('actionList', 'newActionInput')">Add</button>
          </li>
        </ul>
      </div>
      <button onclick="window.resetChecklist()">Reset Checklist</button>
      <button id="submitBtn">Submit Checklist</button>
    </div>
  `;

    // Store added items for later use
    addedItems = [];

    // ...

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

        const newItemElement = document.createElement("li");
        newItemElement.innerHTML = `
      ${newItemIndex}. 
      <span>${newItemInput.value}</span>
      <input type="checkbox" checked ${
        jsonData.checklist[listId === "objectList" ? "objects" : "actions"][
          newItem
        ]
          ? "checked"
          : ""
      }/>
      <button onclick="removeNewItem('${listId}', '${newItem}')">Remove</button>
    `;

        itemList.appendChild(newItemElement);

        // Add new item to jsonData
        jsonData.checklist[listId === "objectList" ? "objects" : "actions"][
          newItem
        ] = true;

        // Store the added item
        addedItems.push(newItem);

        // Log the jsonData before submitting
        console.log("before submit1:", jsonData);

        // Call the onAddItem callback with the added items
        if (onAddItem) {
          onAddItem(addedItems);
        }

        // Log the jsonData before submitting
        console.log("before submit2:", jsonData);
        return jsonData;
      } catch (error) {
        console.error("Error adding new items:", error);
        alert("Error adding new items. Please try again.");
      }
    };

    // Function to remove newly added items
    window.removeNewItem = (listId, item) => {
      try {
        const itemList = document.getElementById(listId);

        // Remove the item from the DOM
        const itemToRemove = Array.from(itemList.children).find(
          (li) =>
            li.querySelector("span") &&
            li.querySelector("span").textContent.toLowerCase() === item
        );

        if (itemToRemove) {
          itemList.removeChild(itemToRemove);

          // Remove the item from jsonData
          delete jsonData.checklist[
            listId === "objectList" ? "objects" : "actions"
          ][item];

          // Remove the item from the addedItems array
          const itemIndex = addedItems.indexOf(item);
          if (itemIndex !== -1) {
            addedItems.splice(itemIndex, 1);
          }

          // Log the jsonData after removal
          console.log("after removal:", jsonData);

          // Check if onRemoveItem is defined before calling it
          if (typeof onRemoveItem === "function") {
            // Call the onRemoveItem callback with the removed item
            onRemoveItem(item);
          }
        }
      } catch (error) {
        console.error("Error removing item:", error);
        alert("Error removing item. Please try again.");
      }
    };

    // // Helper function to save the checklist
    // window.saveChecklist = () => {
    //   try {
    //     // Prepare the updated JSON data based on user input
    //     const updatedJsonData = {
    //       checklist: {
    //         objects: {},
    //         actions: {},
    //       },
    //     };

    //     // Iterate over the objects list and update the JSON data
    //     const objectList = document.getElementById("objectList");
    //     Array.from(objectList.children).forEach((item, index) => {
    //       const checkbox = item.querySelector("input[type=checkbox]");
    //       const textElement = item.querySelector("span");

    //       // Check if textElement is not null before accessing its textContent
    //       const text = textElement ? textElement.textContent : null;

    //       if (text) {
    //         updatedJsonData.checklist.objects[text] = checkbox.checked;
    //       }
    //     });

    //     // Iterate over the actions list and update the JSON data
    //     const actionList = document.getElementById("actionList");
    //     Array.from(actionList.children).forEach((item, index) => {
    //       const checkbox = item.querySelector("input[type=checkbox]");
    //       const textElement = item.querySelector("span");

    //       // Check if textElement is not null before accessing its textContent
    //       const text = textElement ? textElement.textContent : null;

    //       if (text) {
    //         updatedJsonData.checklist.actions[text] = checkbox.checked;
    //       }
    //     });

    //     // Log the updated JSON data
    //     console.log("Updated JSON Data:", updatedJsonData);

    //     // Display the updated checklist
    //     displayCheckedList(updatedJsonData);
    //   } catch (error) {
    //     console.error("Error saving checklist:", error);
    //     alert("Error saving checklist. Please try again.");
    //   }
    // };

    // Helper function to reset the checklist
    window.resetChecklist = () => {
      console.log("before try, Reset Checklist button clicked");
      try {
        console.log("after try,Reset Checklist button clicked");
        // Reset the added items in the UI
        addedItems.forEach((item) => {
          const listElement = document.getElementById(item.list);
          const listItem = listElement?.children[item.index];

          // Check if listItem is truthy before attempting to remove it
          if (listItem) {
            listItem.remove();

            // Remove the item from jsonData
            delete jsonData.checklist[
              item.list === "objectList" ? "objects" : "actions"
            ][item.item];

            // Log the jsonData after removal
            console.log("after removal:", jsonData);

            // Call the onRemoveItem callback with the removed item
            if (onRemoveItem) {
              onRemoveItem(item);
            }
          }
        });

        // Clear the added items array
        addedItems = [];
      } catch (error) {
        console.error("Error resetting checklist:", error);
        alert("Error resetting checklist. Please try again.");
      }
    };

    // Create and append the "Submit Checklist" button
    const submitButton = document.getElementById("submitBtn");
    submitButton.onclick = async () => {
      try {
        const wsMessage = JSON.stringify({
          type: "ping",
          jsonData, // Include jsonData in the message
        });
        // Send the WebSocket message
        socket.send(wsMessage);

        const { startCaptureFrames, captureFrames, displayFrames, initCamera } =
          cameraFunctions;

        // Initialize the camera before capturing frames
        await initCamera();

        // Pause briefly to ensure the camera is initialized before capturing frames
        await new Promise((resolve) => setTimeout(resolve, 500));
        // Initialize frames as an empty array
        let frames = [];

        // Capture frames
        frames = await captureFrames(frames);
        // Capture frames
        displayFrames(frames);

        // Remove the submit button if it's still in the DOM
        if (submitButton.parentNode) {
          submitButton.parentNode.removeChild(submitButton);
        }

        // Add a "Start Capturing" button
        const startCaptureButton = document.createElement("button");
        startCaptureButton.textContent = "Start Capturing Frames";
        startCaptureButton.onclick = async () => {
          try {
            // Initialize the camera before capturing frames
            await initCamera();

            // Pause briefly to ensure the camera is initialized before capturing frames
            await new Promise((resolve) => setTimeout(resolve, 500));

            // Initialize frames as an empty array
            let frames = [];

            // Capture frames
            frames = await captureFrames(frames);

            // Display frames
            displayFrames(frames);

            // Call startCaptureFrames to start capturing frames
            isCapturing = true;
            startCaptureFrames(socket);
          } catch (error) {
            console.error("Error starting capture:", error);
          }
        };

        resultContainer.appendChild(startCaptureButton);

        // Add a "Stop Capturing" button
        const stopCaptureButton = document.createElement("button");
        stopCaptureButton.textContent = "Stop Capturing Frames";
        stopCaptureButton.onclick = async () => {
          // Call stopCaptureFrames to stop capturing frames
          isCapturing = false;
        };

        resultContainer.appendChild(stopCaptureButton);
      } catch (error) {
        console.error("Error updating checklist:", error);
        document.getElementById("result-container").textContent =
          "Error updating checklist. Please try again.";
      }
    };

    // Log the jsonData before submitting
    console.log("before submit:", jsonData);
    return jsonData;
  } catch (error) {
    console.error("Error displaying Checkbox:", error);
    alert("Error displaying Checkbox. Please try again.");
  }
}
