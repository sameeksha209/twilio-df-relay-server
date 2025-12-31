const express = require("express");
const router = express.Router();
const jwt = require("jsonwebtoken");
const JWT_SECRET = process.env.STREAM_JWT_SECRET; // store in Cloud Run env
const JWT_EXPIRY = "20s"; // short lived
const StreamingUrl = 'wss://istha-twilio-streaming-server-100251281488.us-central1.run.app/streaming'
router.get("/", (req, res) => res.send("send successfully"));

router.get("/call-start", (req, res) => res.send("OK"));

router.post("/call-start", async (req, res) => {
  console.log("Twilio call-start webhook hit",req,res);
  		
  const jwtPayload = { callSid: 'acmsdifvdifh2234efsdcvsrd' };
  const token = generateStreamToken(jwtPayload)
    const twiml = `
<Response>
  <Start>
    <Stream url="${StreamingUrl}">
      <Parameter name="token" value="${token}" />
    </Stream>
  </Start>
  <Say>Streaming started!</Say>
</Response>
`;
  console.log('send twiml')
 
res.set("Content-Type", "text/xml");
res.send(twiml);

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
