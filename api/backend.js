const express = require("express");
const tb = require("./bot");

const app = express();
const bot = new tb.Bot(process.env.BOT_TOKEN);

app.post("*",bot.handle_request);

bot.on(new RegExp("/start"),(text)=>"Welcome "+bot.username);
bot.on("photo",(file_id)=>"Thanks for uploading a photo");
bot.on("message",(text)=>{
	sendMessage(bot.chat_id,"Received: "+text)
});
