/**
 * Twilio Media Streams <-> Dialogflow CX Relay Server
 */
process.env.GOOGLE_APPLICATION_CREDENTIALS = "./service-account.json";


require('dotenv').config();
const WebSocket = require('ws');
const { SessionsClient } = require('@google-cloud/dialogflow-cx');

const PORT = process.env.PORT || 8080;
const PROJECT_ID = process.env.GOOGLE_PROJECT_ID;
const LOCATION = process.env.GOOGLE_LOCATION;
const AGENT_ID = process.env.DFCX_AGENT_ID;

// Google CX client
const sessionClient = new SessionsClient({
    apiEndpoint: `${LOCATION}-dialogflow.googleapis.com`
});

const wss = new WebSocket.Server({ port: PORT });

console.log("🚀 Twilio → Dialogflow Relay Running on port", PORT);

wss.on("connection", (ws) => {
    console.log("🔗 New Twilio stream connected");

    let streamSid = null;
    let detectIntentStream = null;

    const createDfcxStream = (sessionId) => {
        const sessionPath = sessionClient.projectLocationAgentSessionPath(
            PROJECT_ID,
            LOCATION,
            AGENT_ID,
            sessionId
        );

        console.log("🎤 Creating DFCX session:", sessionPath);

        const stream = sessionClient.streamingDetectIntent();

        // Handle DFCX data coming back
        stream.on("data", (data) => {

            // Speech recognition result
            if (data.recognitionResult && data.recognitionResult.transcript) {
                console.log("User:", data.recognitionResult.transcript);

                // BARGE IN: If user speaks, clear Twilio buffer
                const clearMessage = {
                    event: "clear",
                    streamSid: streamSid
                };
                ws.send(JSON.stringify(clearMessage));
            }

            // Bot audio response
            if (
                data.detectIntentResponse &&
                data.detectIntentResponse.outputAudio &&
                data.detectIntentResponse.outputAudio.length > 0
            ) {
                const audioBase64 = data.detectIntentResponse.outputAudio.toString("base64");

                const msg = {
                    event: "media",
                    streamSid: streamSid,
                    media: {
                        payload: audioBase64
                    }
                };

                if (ws.readyState === WebSocket.OPEN) ws.send(JSON.stringify(msg));
            }
        });

        stream.on("error", (err) => {
            console.error("❌ DFCX Stream Error:", err);
        });

        // Initial config
        stream.write({
            session: sessionPath,
            queryInput: {
                audio: {
                    config: {
                        audioEncoding: "AUDIO_ENCODING_MULAW",
                        sampleRateHertz: 8000,
                        singleUtterance: false
                    }
                },
                languageCode: "en-US"
            },
            outputAudioConfig: {
                audioEncoding: "OUTPUT_AUDIO_ENCODING_MULAW",
                sampleRateHertz: 8000
            }
        });

        return stream;
    };

    // Handle Twilio incoming messages
    ws.on("message", (message) => {
        const msg = JSON.parse(message);

        switch (msg.event) {
            case "start":
                console.log("📞 Stream started");
                streamSid = msg.start.streamSid;
                const sessionId = msg.start.callSid;

                detectIntentStream = createDfcxStream(sessionId);
                break;

            case "media":
                if (detectIntentStream) {
                    detectIntentStream.write({
                        queryInput: {
                            audio: {
                                audio: msg.media.payload
                            }
                        }
                    });
                }
                break;

            case "stop":
                console.log("🛑 Stream stopped");
                if (detectIntentStream) detectIntentStream.end();
                break;
        }
    });

    ws.on("close", () => {
        console.log("🔌 Twilio connection closed");
        if (detectIntentStream) detectIntentStream.end();
    });
});
