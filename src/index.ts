import express from 'express';
import flowGen from './routes/flow-gen';
import flowUpdate from './routes/flow-update';
import flowTest from './routes/flow-test';
import { logger } from './utils/log';

const app = express();
app.use(express.json());

app.get('/status', (_req: express.Request, res: express.Response) => { res.json({ status: 'ok' }); });
app.use(flowGen);
app.use(flowUpdate);
app.use(flowTest);

const port = process.env.PORT || 3000;
app.listen(port, () => {
  logger.info(`ai-service listening on port ${port}`);
});

