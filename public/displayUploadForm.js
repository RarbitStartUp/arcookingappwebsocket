// Function to display the form and handle form submission
export function displayUploadForm() {
  const formContainer = document.getElementById("uploadFormContainer");
  formContainer.innerHTML = `
    <label for="videoLinkInput">Paste your video link (e.g., YouTube link):</label>
    <input type="text" id="videoLinkInput" required />
    <button onclick="window.uploadVideoGS()">Upload</button>
  `;
}
