const express = require('express');
const app = express();
const apiApp = require('./dist/api/index.js').default || require('./dist/api/index.js');
app.use(apiApp);
app.listen(3001, () => {
    console.log("running 3001");
});
