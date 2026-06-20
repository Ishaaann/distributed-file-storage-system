const { error } = require('console');
const http = require('http');
const port = parseInt(process.argv[2]) || 4000;
const fileRegistry = new Map()

const storageNodes = process.argv.slice(3); 
let nextInd = 0;

function parseBody(req){
    return new Promise((resolve, reject) => {
        const chunks = [];
        req.on('data', (chunk) => chunks.push(chunk));
        req.on('end', () =>{
            try{
                const body = Buffer.concat(chunks).toString();
                resolve(body? JSON.parse(body):{});
            }
            catch (err){
                reject (err);
            }
        });
        req.on('error', reject);
    });
}

const server = http.createServer(async(req, res) =>{
    const parts = req.url.split('/');
    if(req.method === 'POST' && parts[1] === 'allocate'){
        try{
            const body = await parseBody(req);
            const { chunkCount } = body;
            const allocations = [];

            for(let i=0; i<chunkCount; i++){
                allocations.push(getNextNode());
            }
        
        res.writeHead(200, {"content-type": "application/json"});
        res.end(JSON.stringify({allocations}));
        }
        catch (err){
            res.writeHead(400, {"content-type": "application/json"});
            res.end(JSON.stringify({error: err.message}));
        }
        return;
    }

    if(req.method === 'POST' && parts[1]==='files'){
        try{
            const body = await parseBody(req);
            const { fileName, chunks, fileSize } = body;

            fileRegistry.set(fileName, {fileName, chunks, fileSize, uploadedAt: new Date().toISOString()});
            res.writeHead(201, {"content-type": "application/json"});
            res.end(JSON.stringify({status: 'registered', fileName}));
        }
        catch (err){
            res.writeHead(400, {"content-type": "application/json"});
            res.end(JSON.stringify({error: err.message}));
        }
        return;
    }

    if(req.method === 'GET' && parts[1] === 'files' && !parts[2]){
        const files = Array.from(fileRegistry.values()).map((f) =>({
            filename: f.fileName,
            totalsize: f.fileSize,
            chunkCount: f.chunks.length,
            uploadedAt: f.uploadedAt,
        }));
    

        res.writeHead(200, {"content-type": "application/json"});
        res.end(JSON.stringify({files}));
        return;
    }

    if(req.method === 'GET' && parts[1] === 'files' && parts[2]){
        const filename = decodeURIComponent(parts[2]);
        const file = fileRegistry.get(filename);

        if(!file){
            res.writeHead(404, {"content-type": "application/json"});
            res.end(JSON.stringify({error: "File not found"}));
            return;
        }

        res.writeHead(201, {"content-type": "application/json"});
        res.end(JSON.stringify(file));
        return;
    }

    if(req.method === 'GET' && parts[1] === 'health'){
        res.writeHead(200, {"content-type": "application/json"});
        res.end(JSON.stringify({
            status: 'healthy',
            registered_files: fileRegistry.size,
            storageNodes,
        }))
        return;
    }

    res.writeHead(404, {"content-type": "application/json"});
    res.end(JSON.stringify({error: 'not found'}));
});

server.listen(port, () => {
    console.log(`coordinator/controller running on port ${port}`);
    console.log(`storage nodes: ${storageNodes.join(', ')}`);
})

function getNextNode(){
    const node = storageNodes[nextInd];
    nextInd = (nextInd+1)%storageNodes.length;
    return node;
}

