const fs = require('fs');
const readline = require('readline');

const availableMemory = 50 * 1024 * 1024; // ОЗУ
const lineSize = 200; // Сколько байтов весит одна строка

let globalIndex = {};
let vsego = 0;

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
        vsego++;
        lines.push(line);

        if (lines.length >= chunkSize) {
            lines.sort();
            globalIndex[chunkCount] = lines[0];
            const tempFilePath = `${chunkCount}.txt`;
            fs.writeFileSync(tempFilePath, lines.join('\n') + '\n', { flag: 'a' });

            lines = [];
            chunkCount++;
        }
    });

    rl.on('close', async () => {
        if (lines.length > 0) {
            lines.sort();
            globalIndex[chunkCount] = lines[0];
            const tempFilePath = `${chunkCount}.txt`;
            fs.writeFileSync(tempFilePath, lines.join('\n') + '\n', { flag: 'a' });

            lines = [];
            chunkCount++;
        }
        readStream.close();
        await mergeChunks(chunkCount, outputFilePath);

        console.log('Отсортирован');
    });
}

async function deleteLineInChunk(chunk) {
    return new Promise((resolve, reject) => {
        const tempFilePath = `${chunk}.txt`;
        const newFilePath = `${chunk}_new.txt`;

        const lines = [];
        let nextLine = null;

        const readStream = fs.createReadStream(tempFilePath);

        const rl = readline.createInterface({
            input: readStream,
            crlfDelay: Infinity
        });

        rl.on('line', (line) => {
            lines.push(line);
        });

        rl.on('close', () => {
            if (lines.length > 0) {
                lines.shift();
                if (lines.length) {
                    nextLine = lines[0];
                }
            } else {
                nextLine = null;
            }

            const newData = lines.join('\n');
            fs.writeFileSync(newFilePath, newData, { encoding: 'utf8' });

            // Закрытие потока чтения
            readStream.close();

            // Удаление исходного файла
            fs.unlink(tempFilePath, (error) => {
                if (error) {
                    console.error('Ошибка при удалении исходного файла:', error);
                }
            });

            // Переименование нового файла в исходное имя файла
            fs.rename(newFilePath, tempFilePath, (error) => {
                if (error) {
                    console.error('Ошибка при переименовании файла:', error);
                }
            });
            if (nextLine === null || nextLine === undefined) {
                delete globalIndex[chunk];
            } else {
                globalIndex[chunk] = nextLine;
            }
            resolve();
        });
    });
}

let ost = 0;

async function mergeChunks(chunkCount, outputFilePath) {
    const writeStream = fs.createWriteStream(outputFilePath);

    while (Object.keys(globalIndex).length !== 0) {
        console.log(globalIndex);
        console.log(`${(ost / vsego) * 1000} %`);
        const entries = Object.entries(globalIndex);
        const [chunk, minValue] = entries.reduce((min, entry) => (entry[1] < min[1] ? entry : min));
        writeStream.write(minValue + '\n');
        ost++;
        await deleteLineInChunk(chunk);
    }

    writeStream.close();
}

const inputFilePath = 'input.txt';
const outputFilePath = 'sorted_output.txt';

sortFile(inputFilePath, outputFilePath)
    .catch((error) => {
        console.error('Ошибка:', error);
    });
