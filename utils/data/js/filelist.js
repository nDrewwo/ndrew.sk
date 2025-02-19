document.getElementById('fileButton').addEventListener('click', function() {
    document.getElementById('fileInput').click();
});

document.getElementById('fileInput').addEventListener('change', function() {
    const fileList = document.getElementById('fileList');
    fileList.innerHTML = ''; // Clear previous file names
    for (const file of this.files) {
        const listItem = document.createElement('div');
        listItem.textContent = file.name;
        fileList.appendChild(listItem);
    }
});