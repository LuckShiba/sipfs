import IPFS from 'ipfs-core';
import express, { Response } from 'express';
import all from 'it-all';
import mime from 'mime-types';

IPFS.create().then(async ipfs => {
  const app = express();

  const sendByCid = async (cid: string, filename: string, res: Response) => {
    res.set({
      'Content-Type': mime.lookup(filename) || 'application/octet-stream',
      'Content-Disposition': `inline; filename="${filename}"`
    });
    res.send(Buffer.concat(await all(ipfs.cat(cid))));
  }

  app.get('/ipfs/file/:cid/:filename', async (req, res) => {
    try {
      const { cid, filename } = req.params;
      await sendByCid(cid, filename, res);
    }
    catch(error) {
      if (error.code === 'ERR_NOT_FOUND') {
        res.status(404).send('not found');
      }
      else {
        res.status(500).send((error.message));
      }
    }
  })

  app.get('/ipfs/*', async (req, res) => {    
    const cid = decodeURIComponent(req.path);
    try {
      const items = await all(ipfs.ls(cid));
      if (items.length > 1) {
        const returns: {[keyof: string]: string} = {};
        for (const item of items) {
          returns[item.name] = item.path;
        }
        res.send(returns);
      } else {
        const filename = req.query.filename?.toString() || items[0].name;
        await sendByCid(cid, filename, res);
      }
    }
    catch (error) {
      if (error.code === 'ERR_NOT_FOUND') {
        res.status(404).send('not found');
      }
      else {
        res.status(500).send((error.message));
      }
    }
  });
  app.get('/*', (req, res) => {
    let query = '';
    const { filename } = req.query;
    if (req.query.filename) {
      query = `?filename=${filename}` 
    }
    res.redirect('/ipfs' + req.path + query);
  })
  const PORT = process.env.PORT || 4000;
  app.listen(PORT, () => console.log(`online at port ${PORT}`));
});
