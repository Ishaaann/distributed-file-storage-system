const http = require('node:http');
const fs = require('node:fs');
const path = require('node:path');

const port = parseInt(process.argv[2]) || 3000;
const storageDir = process.argv[3] || `./storage-data-${port}`;

if(!fs.existsSync(storageDir)) {
    fs.mkdirSync(storageDir, { recursive: true });
}

const server = http.createServer((req, res) => {
    const parts = req.url.split('/');

    if(req.method==='PUT' && parts[1]==='chunks' && parts[2]){
        const chunkId = parts[2];
        const filePath = path.join(storageDir, chunkId);
        const writeStream = fs.createWriteStream(filePath);
        req.pipe(writeStream);
    
        writeStream.on('finish', () =>{
            res.writeHead(201, {'content-type': 'application/json'});
            res.end(JSON.stringify({status: 'stored', chunkId}));
        });

        writeStream.on('error', (err) =>{
            res.writeHead(500, {'content-type': 'application/json'});
            res.end(JSON.stringify({error: err.message}));
        });
        return;
    }

    if(req.method==='GET' && parts[1]==='chunks' && parts[2]){
        const chunkId = parts[2];
        const filePath = path.join(storageDir, chunkId);

        if(!fs.existsSync(filePath)){
            res.writeHead(404, {'content-type': 'application/json'});
            res.end(JSON.stringify({'error': 'Chunk not found.'}));
            return;
        }
        const stat = fs.statSync(filePath);
        res.writeHead(200, {
            'content-type': 'application/octet-stream',
            'content-length': stat.size,
        });

        const readStream = fs.createReadStream(filePath);
        readStream.pipe(res);
        return;
    }

    if(req.method==='GET' && parts[1] ==='health'){
        res.writeHead(200, {'content-type':'application/json'});
        res.end(JSON.stringify({'status': 'healthy', port: port}));
        return;
    }

    res.writeHead(404, {'content-type': 'application/json'});
    res.end(JSON.stringify({error: 'not found'}));
});

server.listen(port,()=>{
    console.log(`Storage node running on port ${port}`);
    console.log(`Storing chunks in : ${path.resolve(storageDir)}`);
});