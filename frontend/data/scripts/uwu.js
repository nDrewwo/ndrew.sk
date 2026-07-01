const url = new URL(window.location.href);
const params = new URLSearchParams(url.search);

switch (params.get('uwu')) {
    case 'true':
        localStorage.setItem('uwu', 'true');
        break;
    case 'false':
        localStorage.setItem('uwu', 'false');
        break;
    default:
        break;
}

const uwu = localStorage.getItem('uwu') === 'true';

if (uwu) {
    const walker = document.createTreeWalker(document.body, NodeFilter.SHOW_TEXT, null, false);
    let node;
    while (node = walker.nextNode()) {
        node.nodeValue = node.nodeValue
            .replace(/r/g, 'w')
            .replace(/l/g, 'w')
            .replace(/R/g, 'W')
            .replace(/L/g, 'W')
            .replace(/you/g, 'uwu')
            .replace(/You/g, 'Uwu')
            .replace(/the/g, 'da')
            .replace(/The/g, 'Da')
            .replace(/this/g, 'dis')
            .replace(/This/g, 'Dis')
            .replace(/that/g, 'dat')
            .replace(/That/g, 'Dat')
            .replace(/with/g, 'wif')
            .replace(/With/g, 'Wif')
            .replace(/for/g, 'fow')
            .replace(/For/g, 'Fow');
    }
}