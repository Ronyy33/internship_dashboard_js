const fs = require('fs');
const path = require('path');

const viewsDir = path.join(__dirname, 'views');
const files = fs.readdirSync(viewsDir);

files.forEach(file => {
    if (!file.endsWith('.ejs')) return;
    
    let content = fs.readFileSync(path.join(viewsDir, file), 'utf8');

    // Remove old include lines
    content = content.replace(/<%-\s*include\("base"\)\s*%>/g, '');

    // Remove leftover block definitions
    content = content.replace(/\{%\s*block\s+[^%]+%\}/g, '');
    content = content.replace(/\{%\s*endblock\s*%\}/g, '');

    fs.writeFileSync(path.join(viewsDir, file), content);
});

console.log("Cleanup done.");
