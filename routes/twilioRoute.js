const express = require("express");
const router = express.Router();
const jwt = require("jsonwebtoken");
const twilio = require('twilio')
const JWT_SECRET = process.env.STREAM_JWT_SECRET; // store in Cloud Run env
const JWT_EXPIRY = "20s"; // short lived
const StreamingUrl = 'wss://istha-twilio-streaming-server-100251281488.us-central1.run.app/streaming'
const twiml = new twilio.twiml.VoiceResponse();

router.get("/", (req, res) => res.send("send successfully"));

router.get("/call-start", (req, res) => res.send("OK"));

router.post("/call-start", async (req, res) => {
  console.log("Twilio call-start webhook hit", req.body, req.body.callsid);
  		
  const jwtPayload = { callSid: req.body.callsid };
  const token = generateStreamToken(jwtPayload);
   const connect = twiml.connect();

  // STREAM URL (no quotes)
  const stream = connect.stream({
    url: StreamingUrl,
    token: token
  });

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
  console.log('send twiml',stream);
 
res.set("Content-Type", "text/xml");
res.send('done',stream);

});

function generateStreamToken(payload) {
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
