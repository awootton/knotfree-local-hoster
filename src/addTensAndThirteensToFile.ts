import * as fs from 'fs';

// npx tsx src/addTensAndThirteensToFile.ts

const filePath = 'samplehttpget.txt'; // Replace with your actual file path

const outputfilePath = 'samplehttpget_escaped.bin'; // Replace with your actual file path

try {
    // 1. Open and read the file
    const fileContent = fs.readFileSync(filePath, 'utf-8');

    // 2. Replace every occurrence of \r with char 13
    // Because \r literally evaluates to char 13, you can replace it with itself, 
    // or use String.fromCharCode(13)
    // I can't beleive how hard this is. 
    // const updatedContent = fileContent.replace(/\r/g, String.fromCharCode(13));

    const charCodeBackslash: number = "\\".charCodeAt(0);
    const charCodeN: number = "n".charCodeAt(0);
    const charCodeR: number = "r".charCodeAt(0);

    // make buffer with a one byte in it.
    const char13Buffer = Buffer.from([13]);
    const char10Buffer = Buffer.from([10]);

    // make fileContent into a buffer, and replace every occurrence of \n with char 10, and then write it to outputfilePath 
    const buffer = Buffer.from(fileContent, 'utf-8');
    let updatedBuffer = Buffer.from("");
    for (let i = 0; i < buffer.length - 1; i++) {
        let currentChar = buffer[i];
        let nextChar = buffer[i + 1];
        if (currentChar === charCodeBackslash && nextChar === charCodeR) {
            updatedBuffer = Buffer.concat([updatedBuffer, char13Buffer]);
            i ++; // skip the next char because we already processed it
        } else if (currentChar === charCodeBackslash && nextChar === charCodeN) {
            updatedBuffer = Buffer.concat([updatedBuffer, char10Buffer]);
            i ++; // skip the next char because we already processed it
        } else {
            updatedBuffer = Buffer.concat([updatedBuffer, Buffer.from([buffer[i]])]);
        }
    }

    // 3. Write the updated contents back to the file
    fs.writeFileSync(outputfilePath, updatedBuffer, 'utf-8');

    console.log('Successfully replaced all \\r with char 13 in the file.');
} catch (error) {
    console.error('An error occurred:', error);
}
