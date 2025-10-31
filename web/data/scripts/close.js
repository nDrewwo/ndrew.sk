// Use event delegation to handle clicks on any .exiticon, even if added later
document.addEventListener('click', function(event) {
    if (event.target.classList.contains('exiticon')) {
        const windowElement = event.target.closest('.window');
        if (!windowElement) return;
        const windowContent = windowElement.querySelector('.widowContent');
        if (!windowContent) return;

        if (windowContent.style.display === 'none') {
            windowContent.style.display = '';
            event.target.src = 'https://cdn.ndrew.sk/icons/ndrew.sk/exit.png';
        } else {
            windowContent.style.display = 'none';
            event.target.src = 'https://cdn.ndrew.sk/icons/ndrew.sk/square.png';
        }
    }
});