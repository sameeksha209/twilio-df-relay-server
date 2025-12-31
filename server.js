'use strict';
require("dotenv").config();
const twilioRoutes = require("../../routes/twilioRoutes");

const express = require("express");
const app = express();
 
app.use(express.urlencoded({ extended: false }));

// Logging middleware
app.use((req, res, next) => {
  console.log("Incoming Request:", req.method, req.url);
  next();
});

// Load Routes
app.use("/", twilioRoutes);

// Start Server + WebSocket
const port = process.env.PORT || 8080;
const server = app.listen(port, "0.0.0.0", () =>
  console.log(`Server listening on port ${port}`)
);

// WebSocket handler
require("./websocket/mediasocket")(server);
