// Vercel serverless function entry (catch-all) providing API + optional static fallback
import express from 'express';
import path from 'path';
import fs from 'fs';
import { createApiRouter, initData } from '../sharedApi.js';

let app;

function build(){
  const inst = express();
  inst.use(express.json({ limit: '1mb' }));
  inst.use((req,_res,next)=>{ if(!req._logged){ console.log('[api] url:', req.url); req._logged=true; } next(); });
  const router = createApiRouter();
  inst.use('/api', router);
  inst.use(router); // root-level compatibility

  // Static built client if present (dist after build)
  const clientDist = path.join(process.cwd(),'dist');
  if (fs.existsSync(clientDist)){
    inst.use(express.static(clientDist));
    inst.get('*', (req,res,next)=>{
      if (req.path.startsWith('/api/')) return next();
      const indexPath = path.join(clientDist,'index.html');
      if (fs.existsSync(indexPath)) return res.sendFile(indexPath);
      return next();
    });
  }

  inst.use((req,res)=> res.status(404).json({ error:'Not found', path:req.url }));
  // eslint-disable-next-line no-unused-vars
  inst.use((err,_req,res,_next)=>{ console.error('[api] error:', err); res.status(500).json({ error:'Server error', detail: err.message }); });
  return inst;
}

export default async function handler(req,res){
  try { await initData(); } catch(e){ console.error('initData failed', e); }
  if (!app) app = build();
  return app(req,res);
}

