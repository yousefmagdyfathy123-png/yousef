import { resolve } from 'node:path';
import { buildCatalog } from './import';
const args = process.argv.slice(2);
let source = '../Database'; let out = 'private/catalog';
for (let i=0; i<args.length; i+=2) {
  if (!args[i+1] || !['--source','--out'].includes(args[i])) throw new Error('Expected --source <Database> and optional --out <private directory>');
  if (args[i] === '--source') source = args[i+1]; else out = args[i+1];
}
const manifest = await buildCatalog(resolve(source),resolve(out));
const kinds = manifest.files.reduce<Record<string,number>>((counts,file) => { counts[file.kind]=(counts[file.kind]??0)+1; return counts; },{});
console.log(JSON.stringify({ revision: manifest.revision, sourceFileCount: manifest.sourceFileCount, sourceBytes: manifest.sourceBytes, kinds, classifiedTablesWithIssues: manifest.files.filter(f=>f.classification?.issues.length).map(f=>({ id:f.id, issues:f.classification!.issues })) },null,2));
