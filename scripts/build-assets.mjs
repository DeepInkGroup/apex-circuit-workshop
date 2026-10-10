import {readFileSync,writeFileSync} from 'node:fs';

// Preserve cascade order while serving one local stylesheet on Pages.
const sheets=['style','tracer','analysis','studio','workshop','scenery','release8','friendly','building-options','race-setup','return-openings','barrier-update','finish-update','structure-design','flush-joins','crossing-repair'];
const css=sheets.map(name=>`/* ${name}.css */\n`+readFileSync(`dist/${name}.css`,'utf8').replace(/^@import url\([^\n]+\);\s*/,'')).join('\n');
writeFileSync('dist/app.css',css);
console.log(`Built one stylesheet from ${sheets.length} source files.`);
