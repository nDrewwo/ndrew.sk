document.getElementById('generatorForm').addEventListener('submit', async function(event) {
    event.preventDefault();
    const url = document.getElementById('linktoqr').value;

    try {
        const response = await fetch('http://localhost:3002/generate-qr', {
            method: 'POST',
            headers: {
                'Content-Type': 'application/json',
            },
            body: JSON.stringify({ url }),
        });

        const data = await response.json();
        if (data.qrCode) {
            const windowDiv = document.createElement('div');
            windowDiv.className = 'window';
            
            const topbarDiv = document.createElement('div');
            topbarDiv.className = 'topbar';
            
            const nametagDiv = document.createElement('div');
            nametagDiv.className = 'nametag';
            
            const h1 = document.createElement('h1');
            h1.textContent = 'Generated QR Code';
            
            nametagDiv.appendChild(h1);
            topbarDiv.appendChild(nametagDiv);
            
            const exitImg = document.createElement('img');
            exitImg.src = 'data/assets/exit.png';
            exitImg.alt = 'imagegoezhere';
            exitImg.className = 'exiticon';
            
            topbarDiv.appendChild(exitImg);
            windowDiv.appendChild(topbarDiv);
            
            const windowContentDiv = document.createElement('div');
            windowContentDiv.className = 'windowContent';
            
            const img = document.createElement('img');
            img.src = data.qrCode;
            
            windowContentDiv.appendChild(img);
            windowDiv.appendChild(windowContentDiv);
            
            document.body.appendChild(windowDiv);
        } else {
            console.error('Error generating QR code:', data.error);
        }
    } catch (error) {
        console.error('Error:', error);
    }
});