import IPFS from 'ipfs-core';
import express from 'express';
import all from 'it-all';
import mime from 'mime-types';
import { utimesSync } from 'fs';

IPFS.create().then(async ipfs => {
  const app = express();
  app.get('/ipfs/*', async (req, res) => {
    const cid = req.path;
    try {
      const items = await all(ipfs.ls(cid));
      if (items.length > 1) {
        const returns: {[keyof: string]: string} = {};
        for (const item of items) {
          returns[item.name] = item.path;
        }
        res.send(returns);
      } else {
        const [ item ] = items;
        const filename = req.query.filename?.toString() || item.name;
        res.set({
          'Content-Type': mime.lookup(filename) || 'application/octet-stream',
          'Content-Disposition': `inline; filename="${filename}"`
        });

        res.send(Buffer.concat(await all(ipfs.cat(cid))));
      }
    }
    catch (error) {
      if (error.code === 'ERR_NOT_FOUND') {
        res.status(404).send('not found')
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

  app.listen(process.env.PORT || 4000, () => console.log('online'));
});
