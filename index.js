const express = require('express');
const bodyParser = require('body-parser');
const axios = require('axios');

const app = express();
app.use(bodyParser.json());

const phoneNumberId = "136213639578430"; // Replace with your phone number ID
const accessToken = "EAAJPOGJfim8BO3CuaNt0wq9JEUn4OlyTrZAwEKXsIr4ANt3uavxHswbVcPYu2ECZCSuf2vDBrkGGZBFdecWD8AdzZAP0VtOqxl5XUUZBjOQsmUZArQYSE6TRlylo6YnvF9rq1pBZCmuUKJgN8gH3VzZAI4wfnkRhA5sJN9KBkvRsGDY6U9GTX3wgvbrGcGB2Qvmj7uVRlrJMG8coZA6vO7nUhrorw4wjGz4DveZCFY1Hx9YjZBW";

const verifyToken = "apple"
app.post('/sendMessage', (req, res) => {
    const { to, templateName, languageCode } = req.body;

    // Check if all required parameters are provided
    if (!to || !templateName || !languageCode) {
        return res.status(400).json({ status: false, message: 'Missing required parameters' });
    }

    const url = `https://graph.facebook.com/v17.0/${phoneNumberId}/messages`;
    const data = {
        messaging_product: 'whatsapp',
        to: to,
        type: 'template',
        template: {
            name: templateName,
            language: {
                code: languageCode
            }
        }
    };
    const headers = {
        'Content-Type': 'application/json',
        'Authorization': `Bearer ${accessToken}`
    };
    axios.post(url, data, { headers })
        .then(response => {
            res.status(200).json({ status: true, respondData: response.data });
        })
        .catch(error => {
            res.status(500).json({ status: false, error: error.response ? error.response.data : error.message });
        });
});

app.get('/webhook', (req, res) => {
    console.log('Received webhook verification request:', req.query);
    const mode = req.query['hub.mode'];
    const challenge = req.query['hub.challenge'];
    const token = req.query['hub.verify_token'];

    if (mode && token) {
        if (mode === 'subscribe' && token === verifyToken) {
            res.status(200).send(challenge);
        } else {
            res.status(403).send('Forbidden');
        }
    } else {
        res.status(400).send('Bad Request');
    }
});

// Webhook endpoint to handle incoming messages
app.post('/webhook', (req, res) => {
    console.log('Received webhook payload:', req.body);

    // Log incoming message details
    const messages = req.body.entry[0]?.changes[0]?.value?.messages;
    if (messages && messages[0]) {
        const from = messages[0].from;
        const messageBody = messages[0].text.body;
        console.log(`Message from ${from}: ${messageBody}`);
    }

    // Send a 200 OK response to Meta
    res.sendStatus(200);
});

const PORT = 3000;
app.listen(PORT, () => {
    console.log(`Server is running on port ${PORT}`);
});
