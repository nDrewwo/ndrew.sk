// Select all the window elements
const windows = document.querySelectorAll('.window');

// Loop through each window and add event listeners
windows.forEach(function(windowElement) {
    // Find the exit icon and window content within the current window
    const exitIcon = windowElement.querySelector('.exiticon');
    const windowContent = windowElement.querySelector('.widowContent');

    // Add a click event listener to the exit icon
    exitIcon.addEventListener('click', function() {
        // Toggle the display of the window content
        if (windowContent.style.display === 'none') {
            windowContent.style.display = ''; // Show the content
            exitIcon.src = 'assets/exit.png'; // Change back to original icon
        } else {
            windowContent.style.display = 'none'; // Hide the content
            exitIcon.src = 'assets/square.png'; // Change to a different icon
        }
    });
});
