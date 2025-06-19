// Use event delegation to handle clicks on any .exiticon, even if added later
document.addEventListener('click', function(event) {
    if (event.target.classList.contains('exiticon')) {
        const windowElement = event.target.closest('.window');
        if (!windowElement) return;
        const windowContent = windowElement.querySelector('.widowContent');
        if (!windowContent) return;

        if (windowContent.style.display === 'none') {
            windowContent.style.display = '';
            event.target.src = 'data/assets/exit.png';
        } else {
            windowContent.style.display = 'none';
            event.target.src = 'data/assets/square.png';
        }
    }
});