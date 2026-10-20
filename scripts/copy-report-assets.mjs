import {mkdir,copyFile} from 'node:fs/promises';
const target=new URL('../dist/assets/',import.meta.url);
await mkdir(target,{recursive:true});
for(const name of ['DejaVuSans.ttf','DejaVu-LICENSE.txt']){
  await copyFile(new URL('../server/assets/'+name,import.meta.url),new URL(name,target));
}
console.log('Copied report font and license to dist/assets.');
