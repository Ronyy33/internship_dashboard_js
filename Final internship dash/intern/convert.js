const fs = require('fs');
const path = require('path');

const srcDir = path.join(__dirname, 'templates');
const destDir = path.join(__dirname, 'views');

if (!fs.existsSync(destDir)) fs.mkdirSync(destDir);

const files = fs.readdirSync(srcDir);

files.forEach(file => {
    if (!file.endsWith('.html')) return;
    
    let content = fs.readFileSync(path.join(srcDir, file), 'utf8');

  
    content = content.replace(/\{\{\s*(.*?)\s*\}\}/g, '<%= $1 %>');

  
    content = content.replace(/<%=\s*url_for\('static',\s*filename='(.*?)'\)\s*%>/g, '/static/$1');

    content = content.replace(/\{%\s*for\s+(\w+)\s+in\s+(\w+)\s*%\}/g, '<% for(let $1 of $2) { %>');

  
    content = content.replace(/\{%\s*endfor\s*%\}/g, '<% } %>');


    content = content.replace(/\{%\s*if\s+(.*?)\s*%\}/g, '<% if ($1) { %>');


    content = content.replace(/\{%\s*endif\s*%\}/g, '<% } %>');


    content = content.replace(/request\.path == '(.*?)'/g, "locals.request && locals.request.path === '$1'");


    content = content.replace(/\{%\s*extends\s+['"]base\.html['"]\s*%\}/g, '<%- include("base") %>');

    content = content.replace(/\{%\s*block\s+content\s*%\}/g, '');
    content = content.replace(/\{%\s*endblock\s*%\}/g, '');
    content = content.replace(/\{%\s*block\s+title\s*%\}.*?\{%\s*endblock\s*%\}/g, '');

    const newName = file.replace('.html', '.ejs');
    fs.writeFileSync(path.join(destDir, newName), content);
});

console.log("Templates converted.");
