import IPFS from 'ipfs-core';
import express, { Response, Request, NextFunction } from 'express';
import all from 'it-all';
import mime from 'mime-types';

IPFS.create().then(async ipfs => {
  const app = express();

  const sendByCid = async (cid: string, filename: string, res: Response) => {
    res.set({
      'Content-Type': mime.lookup(filename) || 'application/octet-stream',
      'Content-Disposition': `inline; filename="${filename}"`,
      'Cache-Control': 'public, max-age=31536000, immutable, only-if-cached'
    });
    res.send(Buffer.concat(await all(ipfs.cat(cid))));
  }

  app.get('/ipfs/connect/:path(*)', async (req, res, next) => {
    try {
      await ipfs.swarm.connect(IPFS.multiaddr(`/${req.params.path}`));
      res.status(200).send({ connected: true });
    }
    catch (error) {
      next(error)
    }
  });

  app.get('/ipfs/file/:cid/:filename', async (req, res, next) => {
    try {
      const { cid, filename } = req.params;
      await sendByCid(cid, filename, res);
    }
    catch(error) {
      next(error);
    }
  });

  app.get('/ipfs/:path(*)',  async (req, res, next) => {
    try {
      const cid = decodeURIComponent(req.params.path);
      const items = await all(ipfs.ls(cid));
      if (items.length > 1) {
        const returns: {[keyof: string]: string} = {};
        for (const item of items) {
          const [path, ...filename] = item.path.split('/');
          returns[item.name] = `${path}/${filename.map(encodeURIComponent).join('/')}`;
        }
        res.send(returns);
      } else {
        const filename = req.query.filename?.toString() || items[0].name;
        await sendByCid(cid, filename, res);
      }
    }
    catch (error) {
      next(error);
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

  app.use((err: any, req: Request, res: Response, next: NextFunction) => {
    const status = err.message === 'ERR_NOT_FOUND' ? 404 : 500
    res.status(status).send(err);
  });

  const PORT = process.env.APP_PORT || 4000;
  app.listen(PORT, () => console.log(`online at port ${PORT}`));
});
