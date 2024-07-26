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
const whatsappToken = process.env.WHATSAPP_TOKEN;
const phoneNumberId = "136213639578430";
const verifyToken = "mango";
console.log("whatsappToken: ", whatsappToken);

// Dialogflow client setup
const CREDENTIALS = JSON.parse(process.env.CREDENTIALS);
const projectId = CREDENTIALS.project_id;
console.log("projectId: ", projectId);

const CONFIGURATION = {
    credentials: {
        private_key: CREDENTIALS['private_key'],
        client_email: CREDENTIALS['client_email']
    }
};

const client = new SessionsClient(CONFIGURATION);

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
    const sessionPath = client.projectAgentSessionPath(projectId, sessionId);

    // Detect intent in Dialogflow
    const request = {
        session: sessionPath,
        queryInput: {
            text: {
                text: messageBody,
                languageCode: 'en' // Set language code as needed
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

const PORT = process.env.PORT || 3000;
app.listen(PORT, () => {
    console.log(`Server is running on port ${PORT}`);
});
