// Shared Express router for Vercel function and local usage
import express from 'express';
import { init, getSnapshot, writeSnapshot, exportBytes, importBytes } from './api/db.js';

export async function initData(){ await init(); }

export function createApiRouter(){
  const r = express.Router();
  r.get('/api/health', (_req,res)=> res.json({ ok: true }));

  // Snapshot fetch
  r.get('/api/snapshot', (_req,res)=> {
    try { res.json(getSnapshot()); }
    catch (e){ res.status(500).json({ error: e.message }); }
  });

  // Snapshot write
  r.post('/api/snapshot', (req,res)=>{
    try { writeSnapshot(req.body); res.json({ ok: true }); }
    catch (e){ res.status(400).json({ error: e.message }); }
  });

  // Raw DB download
  r.get('/api/db', (_req,res)=>{
    try { const bytes = exportBytes(); res.setHeader('Content-Type','application/octet-stream'); res.setHeader('Content-Disposition','attachment; filename="migration_tracking.sqlite"'); res.send(Buffer.from(bytes)); }
    catch(e){ res.status(500).json({ error: e.message }); }
  });

  // Raw DB upload (replace)
  r.put('/api/db', async (req,res)=>{
    try {
      const chunks = []; for await (const chunk of req) chunks.push(Buffer.isBuffer(chunk)?chunk:Buffer.from(chunk));
      const buf = Buffer.concat(chunks); if (!buf.length) return res.status(400).json({ error: 'Empty body' });
      importBytes(new Uint8Array(buf));
      res.json({ ok: true, bytes: buf.length });
    } catch(e){ res.status(500).json({ error: e.message }); }
  });

  return r;
}

