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

