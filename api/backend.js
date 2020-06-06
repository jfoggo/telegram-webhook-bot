const express = require('express');
const helmet = require('helmet');
const moment = require('moment');
const request = require("request");
const tb = require("./bot");

const app = express();
app.use(helmet());
app.use(express.json());

const bot = new tb.Bot(process.env.BOT_TOKEN);

app.post("*",bot.handle_request);
