import express from 'express';
import apiApp from './api/index.ts';

const app = express();
app.use(apiApp);
app.listen(3001, () => {
    console.log("running 3001");
});
