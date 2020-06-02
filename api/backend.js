const express = require("express");
const tb = require("./bot");

const app = express();
const bot = new tb.Bot();

app.post("*",bot.handle_request);
bot.on("message",(text)=>{
	bot.sendMessage("");
});
