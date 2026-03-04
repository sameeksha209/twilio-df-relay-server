const express = require("express");
const router = express.Router();
const jwt = require("jsonwebtoken");
const twilio = require('twilio')
const { loadSecrets } = require("../utils/secretManager");
//const JWT_SECRET = process.env.STREAM_JWT_SECRET; // store in Cloud Run env
const JWT_EXPIRY = "20s"; // short lived

router.get("/", (req, res) => res.send("send successfully"));

router.get("/call-start", (req, res) => res.send("OK"));

router.post("/call-start", async (req, res) => {
  const callSid = req.body.CallSid;
  console.log(`[${callSid}] Twilio call-start Webhook hit`, req.body);

  try {
    const start = Date.now();
    const twiml = new twilio.twiml.VoiceResponse();
    const jwtPayload = { callSid };

    const token = await generateStreamToken(jwtPayload, callSid);


    // const connect = twiml.connect();
    // connect.stream({
    //   url: StreamingUrl,
    //   token,
    //   statusCallback: 'https://csrservice-7670-dev.twil.io/checkCallbackStatus',
    //   statusCallbackMethod: 'POST'
    // });

    // res.type("text/xml");
    res.type("text/plain");
    // res.send(twiml.toString());
    res.send(token);

    // const jwtPayload = { callSid: req.body.callsid };
    // const token = generateStreamToken(jwtPayload);
    //  const connect = twiml.connect();

    // // STREAM URL (no quotes)
    // connect.stream({
    //   url: StreamingUrl,
    //   token: token,
    //   statusCallback: 'https://csrservice-7670-dev.twil.io/checkCallbackStatus',
    //   statusCallbackMethod: 'POST'
    // });

    //     const twiml = `
    // <Response>
    //   <Start>
    //     <Stream url="${StreamingUrl}">
    //       <Parameter name="token" value="${token}" />
    //     </Stream>
    //   </Start>
    //   <Say>Streaming started!</Say>
    // </Response>
    // `;
    console.log(`[${callSid}] send TwiML`, twiml.toString());
    // res.send('<?xml version="1.0" encoding="UTF-8"?><Response><Say>Hello</Say></Response>');
    const end = Date.now(); // End time after sending response
    console.log(`[${callSid}] TwiML sent. Duration: ${end - start} ms`);
    // res.set("Content-Type", "text/xml");
    // res.send(twiml.toString());
  } catch (error) {
    console.error(`[${callSid}] Error in call-start webhook:`, error);
    res.status(500).send("Internal Server Error");
  };
});

router.post('/checkCallbackStatus', (req, res) => {
  console.log('Twilio Stream Status Callback received');

  console.log({
    CallSid: req.body.CallSid,
    StreamSid: req.body.StreamSid,
    StreamEvent: req.body.StreamEvent,
    StreamError: req.body.StreamError,
    Timestamp: req.body.Timestamp,
  });
  res.send('ok');
});

async function generateStreamToken(payload, callSid) {
  console.log(`[${callSid}] [Token] Generating token...`);
  const secrets = await loadSecrets(callSid);
  console.log(`[${callSid}] [Token] Secrets loaded:`, Object.keys(secrets));
  const { JWT_SECRET } = secrets;
  return jwt.sign(
    payload,
    JWT_SECRET,
    {
      expiresIn: JWT_EXPIRY,
      issuer: "relay-server",
      audience: "twilio-stream"
    }
  );
}

module.exports = router;
