const fs = require('fs');
const crypto = require('crypto');

function generateRandomString(length) {
    return crypto.randomBytes(length).toString('hex');
}

function generateFile(filePath, fileSize) {
    const targetSize = fileSize * 1024 * 1024; 
    let currentSize = 0;

    const writeStream = fs.createWriteStream(filePath);

    while (currentSize < targetSize) {
        const randomString = generateRandomString(100); 
        writeStream.write(randomString + '\n');
        currentSize += Buffer.byteLength(randomString + '\n');
    }

    writeStream.end();

    console.log(`Файл ${filePath} успешно создан.`);
}

const filePath = 'input.txt'; 
const fileSize = 500; 

generateFile(filePath, fileSize);
