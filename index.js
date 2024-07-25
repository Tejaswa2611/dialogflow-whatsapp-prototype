// const express = require('express');
// const bodyParser = require('body-parser');
// const axios = require('axios');

// const app = express();
// app.use(bodyParser.json());
// //
// const phoneNumberId = "136213639578430"; // Replace with your phone number ID
// const accessToken = "EAAJPOGJfim8BO3CuaNt0wq9JEUn4OlyTrZAwEKXsIr4ANt3uavxHswbVcPYu2ECZCSuf2vDBrkGGZBFdecWD8AdzZAP0VtOqxl5XUUZBjOQsmUZArQYSE6TRlylo6YnvF9rq1pBZCmuUKJgN8gH3VzZAI4wfnkRhA5sJN9KBkvRsGDY6U9GTX3wgvbrGcGB2Qvmj7uVRlrJMG8coZA6vO7nUhrorw4wjGz4DveZCFY1Hx9YjZBW";

// const verifyToken = "apple"
// app.post('/sendMessage', (req, res) => {
//     const { to, templateName, languageCode } = req.body;

//     // Check if all required parameters are provided
//     if (!to || !templateName || !languageCode) {
//         return res.status(400).json({ status: false, message: 'Missing required parameters' });
//     }

//     const url = `https://graph.facebook.com/v17.0/${phoneNumberId}/messages`;
//     const data = {
//         messaging_product: 'whatsapp',
//         to: to,
//         type: 'template',
//         template: {
//             name: templateName,
//             language: {
//                 code: languageCode
//             }
//         }
//     };
//     const headers = {
//         'Content-Type': 'application/json',
//         'Authorization': `Bearer ${accessToken}`
//     };
//     axios.post(url, data, { headers })
//         .then(response => {
//             res.status(200).json({ status: true, respondData: response.data });
//         })
//         .catch(error => {
//             res.status(500).json({ status: false, error: error.response ? error.response.data : error.message });
//         });
// });

// app.get('/webhook', (req, res) => {
//     console.log('Received webhook verification request:', req.query);
//     const mode = req.query['hub.mode'];
//     const challenge = req.query['hub.challenge'];
//     const token = req.query['hub.verify_token'];

//     if (mode && token) {
//         if (mode === 'subscribe' && token === verifyToken) {
//             res.status(200).send(challenge);
//         } else {
//             res.status(403).send('Forbidden');
//         }
//     } else {
//         res.status(400).send('Bad Request');
//     }
// });

// // Webhook endpoint to handle incoming messages
// app.post('/webhook', (req, res) => {
//     console.log('Received webhook payload:', req.body);

//     // Log incoming message details
//     const messages = req.body.entry[0]?.changes[0]?.value?.messages;
//     if (messages && messages[0]) {
//         const from = messages[0].from;
//         const messageBody = messages[0].text.body;
//         console.log(`Message from ${from}: ${messageBody}`);
//     }

//     // Send a 200 OK response to Meta
//     res.sendStatus(200);
// });

// const PORT = 3000;
// app.listen(PORT, () => {
//     console.log(`Server is running on port ${PORT}`);
// });


// using dialogflow

const express = require('express');
const bodyParser = require('body-parser');
const axios = require('axios');
const { SessionsClient } = require('@google-cloud/dialogflow');
const uuid = require('uuid');
require('dotenv').config();
const fs = require('fs');

const app = express();
app.use(bodyParser.json());

// Replace with your values
const projectId = 'dialogbot-430415';
const whatsappToken = 'EAAJPOGJfim8BO0fXY97UflMMNadiSa4xmiwZCWLZCxrepGVIXtuoUC5r5Fj8mDZB4dqIRGdngeqsy6PLR7yWGzrZALrg8bSiaSzTU69aubTIb9QrKcy4e5vzc0uaB4qojZCmLXgPinnoQrnzWAiuOfI865fpnY9h6BOxfnyElJ0ZCLonqjFtpi0hUKWgT1AqbBNIqHUwtQm7Qvo0XSmlvb1YLXQvYZD';
const phoneNumberId = "136213639578430"; // Replace with your phone number ID
const verifyToken = "mango";

// Dialogflow client
const keyFilePath = process.env.FILE_PATH;

const client = new SessionsClient({
    keyFilename: keyFilePath // Replace with the path to your service account key
});
if (!keyFilePath) {
    console.error('Environment variable FILE_PATH is not set.');
}
console.log("env: ", keyFilePath)

if (!fs.existsSync(keyFilePath)) {
    console.error(`Service account key file not found at path: ${keyFilePath}`);
    process.exit(1);
}


// Webhook verification endpoint
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

// Incoming message processing endpoint
app.post('/webhook', async (req, res) => {
    const messages = req.body.entry[0]?.changes[0]?.value?.messages;
    if (!messages || !messages[0]) {
        console.log('No messages found in the request');
        return res.sendStatus(200);
    }

    const sender = messages[0].from;
    const messageBody = messages[0].text.body;
    console.log(`Message from ${sender}: ${messageBody}`);

    // Generate a session ID
    const sessionId = uuid.v4();
    console.log('Session ID:', sessionId);
    // Create session path
    const sessionPath = client.sessionPath(projectId, sessionId);


    // Detect intent in Dialogflow
    const request = {
        session: sessionPath,
        queryInput: {
            text: {
                text: messageBody,
            },
        },
    };

    try {
        const responses = await client.detectIntent(request);
        console.log('Dialogflow response:', responses);
        const result = responses[0].queryResult;
        const fulfillmentText = result.fulfillmentText;
        console.log('Fulfillment text:', fulfillmentText);

        // Send response to WhatsApp
        await sendWhatsAppMessage(sender, fulfillmentText);

        res.sendStatus(200);
    } catch (error) {
        console.error('Error:', error);
        res.status(500).send('Error processing request');
    }
});

// Function to send WhatsApp messages
async function sendWhatsAppMessage(recipient, message) {
    const url = `https://graph.facebook.com/v20.0/${phoneNumberId}/messages`;
    const data = {
        messaging_product: 'whatsapp',
        to: recipient,
        text: {
            body: message
        },
    };
    const headers = {
        'Content-Type': 'application/json',
        'Authorization': `Bearer ${whatsappToken}`
    };

    try {
        const response = await axios.post(url, data, { headers });
        console.log('Message sent successfully:', response.data);
    } catch (error) {
        console.error('Error sending WhatsApp message:', error);
    }
}

const PORT = 3000;
app.listen(PORT, () => {
    console.log(`Server is running on port ${PORT}`);
});
