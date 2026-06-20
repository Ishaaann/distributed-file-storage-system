const http = require('http');
const fs = require('fs')
const path = require('path')
const crypto = require('crypto');
const { hostname } = require('os');

const coordinator_url = 'http://localhost:4000';
const chunk_size = 1024*1024;

function httpReq(url, options = {}){
    return new Promise((resolve, reject) =>{
        const parsedURL = new URL(url);
        const reqOptions = {
            hostname: parsedURL.hostname,
            port: parsedURL.port,
            path: parsedURL.pathname+parsedURL.search,
            method: options.method || 'GET',
            headers: options.headers || {},
        };

        const req = http.request(reqOptions, (res) => {
            const chunks = [];
            res.on('data', (chunk) => chunks.push(chunk));
            res.on('end', () => {
                const body = Buffer.concat(chunks)
                resolve({statusCode: res.statusCode, body});
            });
        });

        req.on('error', reject);
        if(options.body){
            req.write(options.body);
        }
        req.end();
    });
}

//sends data to the storage node and returns the response
function sendChunk(nodeURL, chunkId, chunkData){
    return new Promise((resolve, reject) =>{
        const url = new URL(`${nodeURL}/chunks/${chunkId}`);
        const reqOptions = {
            hostname: url.hostname,
            port: url.port,
            path: url.pathname + url.search,
            method: 'PUT',
            headers: {'Content-Length': chunkData.length},
        };

        const req = http.request(reqOptions, (res) =>{
            const chunks = [];
            res.on('data', (chunk) => chunks.push(chunk));
            res.on('end', () =>{
                const body = Buffer.concat(chunks).toString();
                resolve(JSON.parse(body));
            });
        });

        req.on('error', reject);
        req.write(chunkData);
        req.end();
  });
}

async function upload(filePath){
    const fullpath = path.resolve(filePath);

    if(!fs.existsSync(fullpath)){
        console.error(`File not found: ${fullpath}`);
        process.exit(1);
    }

    const filedata = fs.readFileSync(fullpath);
    const fileSize = filedata.length;
    const fileName = path.basename(fullpath);

    console.log(`Uploading file: ${fileName} (${fileSize} bytes)`);

    const chunkdataList = [];
    for(let i=0; i<fileSize; i+=chunk_size){
        chunkdataList.push(filedata.slice(i, i+chunk_size));
    }

    console.log(`File split into ${chunkdataList.length} chunks.`);

    const allocationResponse = await httpReq(`${coordinator_url}/allocate`, {method: 'POST', body: JSON.stringify({chunkCount: chunkdataList.length}), headers: {'Content-Type': 'application/json'}});
    const { allocations } = JSON.parse(allocationResponse.body.toString())

    const chunks = [];
    for(let i=0; i<chunkdataList.length; i++){
        const chunkData = chunkdataList[i];
        const hash = crypto.createHash('sha256').update(chunkData).digest('hex');
        const chunkId = `${fileName}-chunk-${i}-${hash.slice(0,8)}`;
        const nodeURL = allocations[i];

        await sendChunk(nodeURL, chunkId, chunkData);
        console.log(`Chunk ${i} uploaded to ${nodeURL} with ID: ${chunkId} and length: ${chunkData.length} bytes`);
        chunks.push({index: i, chunkId, nodeURL, size: chunkData.length, hash});
    }

    await httpReq(`${coordinator_url}/files`, {method: 'POST', body: JSON.stringify({fileName, chunks, fileSize}), headers: {'Content-Type': 'application/json'}});

    cosnole.log(`File ${fileName} uploaded successfully with ${chunks.length} chunks.`);
}

function downloadChunk(nodeUrl, chunkId){
    return new Promise((resolve, reject) =>{
        const parsedURL = new URL(`${nodeUrl}/chunks/${chunkId}`);
        const reqOptions = {
            hostname: parsedURL.hostname,
            path: parsedURL.pathname,
            port: parsedURL.port,
            method: 'GET',
        };

        const req = http.request(reqOptions,(res) =>{
            if(res.statusCode!==200){
                reject(new Error(`HTTP ${res.statusCode}`));
                res.resume;
                return;
            }
            const chunks = [];
            res.on('data', (chunk) => chunks.push(chunk));
            res.on('end', () => resolve(Buffer.concat(chunks)));
        });

        res.on('error', reject);
        res.end();
    });
}

