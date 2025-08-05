// index.js
const express = require('express');
const app = express();

app.get('/oauth/callback', (req, res) => {
    // You can log the code or token here
    console.log("OAuth Callback Query Params:", req.query);
    res.send('OAuth redirect successful! You can close this tab.');
});

const PORT = process.env.PORT || 3000;
app.listen(PORT, () => console.log(`Running on port ${PORT}`));
