// Function to display the form and handle form submission
export function displayUploadForm() {
  const formContainer = document.getElementById("uploadFormContainer");
  formContainer.innerHTML = `
    <label for="videoLinkInput">Paste your video link (e.g., YouTube link):</label>
    <input type="text" id="videoLinkInput" required />
    <button onclick="window.uploadVideoGS()">Upload</button>
  `;
}

// // Function to handle video upload
// export async function uploadVideoGS() {
//   try {
//     // Get the video link from the input field
//     const videoLinkInput = document.getElementById("videoLinkInput");
//     const videoLink = videoLinkInput.value;

//     // Make a fetch request to the server to handle the video upload
//     const response = await fetch("/api/uploadVideo", {
//       method: "POST",
//       headers: {
//         "Content-Type": "application/json",
//       },
//       body: JSON.stringify({ videoLink }),
//     });

//     if (!response.ok) {
//       throw new Error(`HTTP error! Status: ${response.status}`);
//     }

//     // Parse the JSON response
//     const result = await response.json();

//     // Log or display the result as needed
//     console.log("Upload result:", result);
//   } catch (error) {
//     console.error("Error uploading video:", error);
//     // Handle the error (e.g., display an error message to the user)
//   }
// }
