
const fs = require('fs');
const content = fs.readFileSync('app/page.tsx', 'utf8');
const lines = content.split('\n');
let balance = 0;
lines.forEach((line, i) => {
    const opens = (line.match(/{/g) || []).length;
    const closes = (line.match(/}/g) || []).length;
    balance += opens;
    balance -= closes;
    console.log(`L${i+1} [${opens}/${closes}] Bal: ${balance}: ${line.trim().slice(0, 40)}`);
});
