import React from 'react';
import { createRoot } from 'react-dom/client';
import { Workspace } from '../../src/workspace/Workspace';
import { parsePublicWorkResult } from '../../src/shared/public-schemas';
const boot=JSON.parse(document.getElementById('checkpoint-data')!.textContent!);
createRoot(document.getElementById('root')!).render(<Workspace initial={parsePublicWorkResult(boot.initial)} onAction={async action=>{
  const response=await fetch('/action',{method:'POST',headers:{'Content-Type':'application/json','X-Checkpoint-CSRF':boot.csrf},body:JSON.stringify(action)});
  if(!response.ok)throw new Error('The engineering action could not be completed.');return parsePublicWorkResult(await response.json());
}}/>);
