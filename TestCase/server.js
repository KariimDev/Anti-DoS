const express = require('express');
const app = express();
const PORT = 3000;

// This is the "Route". When someone goes to the homepage ('/'), say Hi.
app.get('/', (req, res) => {
    console.log("Someone just visited the server!"); // This shows in your terminal
    res.send('Hi, welcome to Project 1!'); // This shows in the browser
});

// Start the server
app.listen(PORT, () => {
    console.log(`Server is running! Open your browser to http://localhost:${PORT}`);
});