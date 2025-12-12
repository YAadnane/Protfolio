
import fs from 'fs';

const css = fs.readFileSync('style.css', 'utf8');

let line = 1;
let col = 1;

const stack = [];
let balance = 0;
let inComment = false;

for (let i = 0; i < css.length; i++) {
    const char = css[i];
    
    if (inComment) {
        if (char === '*' && css[i+1] === '/') {
            inComment = false;
            i++;
        }
    } else {
        if (char === '/' && css[i+1] === '*') {
            inComment = true;
            i++;
        } else if (char === '{') {
            balance++;
            stack.push(line);
        } else if (char === '}') {
            balance--;
            stack.pop();
            if (balance < 0) {
                console.log(`Error: Unexpected '}' at line ${line}`);
                process.exit(1);
            }
        }
    }

    if (char === '\n') {
        line++;
        col = 1;
    } else {
        col++;
    }
}

if (balance !== 0) {
    console.log(`Error: Unbalanced braces. Balance: ${balance}. Missing '}' for '{' opened at line ${stack.pop()}`);
} else if (inComment) {
    console.log("Error: Unclosed comment.");
} else {
    console.log("CSSBraces & Comments seem balanced.");
}
