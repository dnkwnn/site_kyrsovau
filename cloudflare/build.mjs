import {cp,mkdir,writeFile} from "node:fs/promises";
import {build} from "../hosted/node_modules/esbuild/lib/main.js";
await mkdir("cloudflare/dist",{recursive:true});
await cp("cloudflare/public","cloudflare/dist",{recursive:true});
await build({entryPoints:["cloudflare/worker.ts"],bundle:true,format:"esm",platform:"browser",target:"es2022",external:["cloudflare:workers"],outfile:"cloudflare/dist/_worker.js"});
await writeFile("cloudflare/dist/_routes.json",JSON.stringify({version:1,include:["/api/*"],exclude:[]}));
console.log("DevSphere Pages build ready");
