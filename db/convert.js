const fs = require('fs');
const path = require('path');

const srcDir = path.join(__dirname, 'templates');
const destDir = path.join(__dirname, 'views');

if (!fs.existsSync(destDir)) fs.mkdirSync(destDir);

const files = fs.readdirSync(srcDir);

files.forEach(file => {
    if (!file.endsWith('.html')) return;
    
    let content = fs.readFileSync(path.join(srcDir, file), 'utf8');

    // {{ var }} to <%= var %>
    content = content.replace(/\{\{\s*(.*?)\s*\}\}/g, '<%= $1 %>');

    // url_for
    content = content.replace(/<%=\s*url_for\('static',\s*filename='(.*?)'\)\s*%>/g, '/static/$1');

    // {% for item in items %} to <% for(let item of items) { %>
    content = content.replace(/\{%\s*for\s+(\w+)\s+in\s+(\w+)\s*%\}/g, '<% for(let $1 of $2) { %>');

    // {% endfor %} to <% } %>
    content = content.replace(/\{%\s*endfor\s*%\}/g, '<% } %>');

    // {% if cond %} to <% if (cond) { %>
    // Replace "request.path" logic with typical locals boolean evaluation if needed, or simple JS
    content = content.replace(/\{%\s*if\s+(.*?)\s*%\}/g, '<% if ($1) { %>');

    // {% endif %} to <% } %>
    content = content.replace(/\{%\s*endif\s*%\}/g, '<% } %>');

    // Fix Jinja "request.path == '/' " to Javascript "locals.request.path === '/'"
    content = content.replace(/request\.path == '(.*?)'/g, "locals.request && locals.request.path === '$1'");

    // Includes / extends / block stuff is trickier to regex safely but we try a basic approach:
    // {% extends 'base.html' %} => We will change base.html approach to use EJS include
    content = content.replace(/\{%\s*extends\s+['"]base\.html['"]\s*%\}/g, '<%- include("base") %>');
    
    // Jinja blocks {% block content %} ... {% endblock %}
    // Since base.html acts as a shell, in EJS we usually do <%- include('header') %> ... content ... <%- include('footer') %>
    // For this simple project, we will just manually strip out block tags where base is included.
    content = content.replace(/\{%\s*block\s+content\s*%\}/g, '');
    content = content.replace(/\{%\s*endblock\s*%\}/g, '');
    content = content.replace(/\{%\s*block\s+title\s*%\}.*?\{%\s*endblock\s*%\}/g, '');

    // Write to .ejs
    const newName = file.replace('.html', '.ejs');
    fs.writeFileSync(path.join(destDir, newName), content);
});

console.log("Templates converted.");
