const fs = require('fs');
const readline = require('readline');
const { promisify } = require('util');
const stream = require('stream');

const availableMemory = 50 * 1024 * 1024; // ОЗУ
const lineSize = 200; // Сколько байтов весит одна строка

async function sortFile(inputFilePath, outputFilePath) {
    const chunkSize = Math.floor(availableMemory / lineSize); // Количество строк во временном файле

    const readStream = fs.createReadStream(inputFilePath);
    const rl = readline.createInterface({
        input: readStream,
        crlfDelay: Infinity
    });

    let lines = [];
    let chunkCount = 0;

    rl.on('line', (line) => {
        lines.push(line);

        if (lines.length === chunkSize) {
            lines.sort();

            const tempFilePath = `temp_${chunkCount}.txt`;
            const writeStream = fs.createWriteStream(tempFilePath, { flags: 'a' });
            writeStream.write(lines.join('\n') + '\n');
            writeStream.end();

            lines = [];
            chunkCount++;
        }
    });

    rl.on('close', () => {
        if (lines.length > 0) {
            lines.sort();

            const tempFilePath = `temp_${chunkCount}.txt`;
            const writeStream = fs.createWriteStream(tempFilePath, { flags: 'a' });
            writeStream.write(lines.join('\n') + '\n');
            writeStream.end();

            lines = [];
            chunkCount++;
        }

        mergeChunks(chunkCount, outputFilePath);
    });
}

async function mergeChunks(chunkCount, outputFilePath) {
    const readStreams = [];

    for (let i = 0; i < chunkCount; i++) {
        const tempFilePath = `temp_${i}.txt`;
        const readStream = fs.createReadStream(tempFilePath);
        readStreams.push(readStream);
    }

    const writeStream = fs.createWriteStream(outputFilePath);
    const mergeStream = new stream.PassThrough();

    let isFinished = false;

    mergeStream.on('drain', () => {
        if (!isFinished) {
            readNextLine();
        }
    });

    mergeStream.pipe(writeStream);

    let currentStreamIndex = 0;
    let currentLine = '';

    function readNextLine() {
        const currentStream = readStreams[currentStreamIndex];
        const rl = readline.createInterface({
            input: currentStream,
            crlfDelay: Infinity
        });

        rl.on('line', (line) => {
            if (currentLine === '') {
                currentLine = line;
            } else {
                if (currentLine <= line) {
                    mergeStream.write(currentLine + '\n');
                    currentLine = line;
                } else {
                    mergeStream.write(line + '\n');
                }
            }
        });

        rl.on('close', () => {
            currentStreamIndex++;
            if (currentStreamIndex < readStreams.length) {
                readNextLine();
            } else {
                if (currentLine !== '') {
                    mergeStream.write(currentLine + '\n');
                }
                mergeStream.end();
                isFinished = true;
            }
        });
    }

    readNextLine();

    await new Promise((resolve, reject) => {
        mergeStream.on('finish', resolve);
        mergeStream.on('error', reject);
    });

    readStreams.forEach((readStream) => {
        readStream.close();
        fs.unlinkSync(readStream.path);
    });

    console.log('Файл отсортирован');
}

const inputFilePath = 'input.txt';
const outputFilePath = 'sorted_output.txt';

sortFile(inputFilePath, outputFilePath)
    .catch((error) => {
        console.error('Ошибка:', error);
    });
