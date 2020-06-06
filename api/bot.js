const request = require("tiny-json-http");

class Bot {
	constructor(token,options){
		this.token = token;
		this.options = options;
		this.apiURL = "https://api.telegram.org/bot###TOKEN###/".replace("###TOKEN###",token);
		this.supported_events = ["message","video","photo","audio","voice","sticker","document","location","animation"];
		this.events = {};
		this.commands = {};
		this.setDefaultEvents();
	}
	on(event,callback){
		if (event instanceof RegExp){
			this.commands[event] = callback;
			return true;
		}
		else if (event instanceof String && this.supported_events.indexOf(event) !== -1) {
			this.events[event] = callback;
			return true;
		}
		else return false;
	}
	off(event){
		if (event instanceof String && this.events[event] !== undefined){
			delete this.events[event];
			return true;
		}
		else if (event instanceof RegExp && this.commands[event] !== undefined){
			delete this.commands[event];
			return true;
		}
		else return false;
	}
	handle_request(req,res){
		console.log("[*] Incoming request: ",req.body);
		this.req = req;
		this.res = res;
		var [event,...args] = this.determine_event(req.body);
		var response;
		console.log("[*] Event Type: ",event,", args: ",args);
		if (event !== undefined){
			if (this.events[event] !== undefined) {
				response = this.events[event](...args);
			}
			else if (this.commands[event] !== undefined) {
				response = this.commands[event](...args);
			}
			else {
				response = new Promise((a,b)=>a());
			}
		}
		else response = new Promise((a,b)=>a());

		if (response instanceof Promise){
			response.then(this.handle_response.bind(this)).catch(this.handle_response_error.bind(this));
		}
		else if (response instanceof String) this.handle_response(response).bind(this);
		else this.handle_response().bind(this);
	}
	determine_event(data){
		if (!isNaN(parseInt(data.update_id))) {
			var msg;
			var msg_keys = ["message","edited_message","chanel_post","edited_channel_post"];
			msg_keys.map(key => data[key] === undefined ? "" : msg=data[key]);
			if (msg === undefined) return [undefined];
			if (!isNaN(parseInt(msg.message_id)) && !isNaN(parseInt(msg.date)) && msg.chat !== undefined){
				var chat = msg.chat;
				this.chat_id = chat.id;
				this.message_id = msg.message_id;
				if (msg.text !== undefined && msg.text.length > 0) {
					var m;
					for (var regex in this.commands){
						if (m = msg.text.match(regex)) return [regex,m.slice(1)];
					}
					return ["message",msg.text];
				}
				else if (msg.audio !== undefined && !isNaN(parseInt(msg.audio.file_id))) return ["audio",msg.audio.file_id];
				else if (msg.video !== undefined && !isNaN(parseInt(msg.video.file_id))) return ["video",msg.video.file_id];
				else if (msg.voice !== undefined && !isNaN(parseInt(msg.voice.file_id))) return ["voice",msg.voice.file_id];
				else if (msg.photo !== undefined && msg.photo.length > 0 && !isNaN(parseInt(msg.photo[0].file_id))) return ["photo",msg.photo[0].file_id];
				else if (msg.animation !== undefined && !isNaN(parseInt(msg.animation.file_id))) return ["animation",msg.animation.file_id];
				else if (msg.document !== undefined && !isNaN(parseInt(msg.document.file_id))) return ["document",msg.document.file_id];
				else if (msg.sticker !== undefined && !isNaN(parseInt(msg.sticker.file_id))) return ["sticker",msg.sticker.file_id];
				else if (msg.location !== undefined && !isNaN(parseInt(msg.location.file_id))) return ["location",msg.location.longitude,msg.location.latitude];
				else return [undefined];
			}
		}
		else return [undefined];
	}
	handle_response(text){
		console.log("[*] Response: ",text);
		if (text instanceof String) {
			this.res.json({
				method: "sendMessage",
				chat_id: this.chat_id,
				text: text
			});
		}
		else this.res.json({ok:true});
	}
	handle_response_error(err){
		console.log(err);
		this.res.json({
			method: "sendMessage",
			chat_id: this.chat_id,
			text: "INTERNAL BOT ERROR: "+err
		});
	}
	sendMessage(text,chat_id,reply_to){
		return sendRequest(this.apiURL+"sendMessage?chat_id="+encodeURIComponent(chat_id)+"&text="+encodeURIComponent(text));
	}
	sendVideo(file_id,chat_id,reply_to,caption){
		return sendRequest(this.apiURL+"sendVideo?chat_id="+encodeURIComponent(chat_id)+"&file_id="+encodeURIComponent(file_id)+"&caption="+encodeURIComponent(caption));
	}
	sendPhoto(file_id,chat_id,reply_to,caption){
		return sendRequest(this.apiURL+"sendPhoto?chat_id="+encodeURIComponent(chat_id)+"&file_id="+encodeURIComponent(file_id)+"&caption="+encodeURIComponent(caption));
	}
	sendAudio(file_id,chat_id,reply_to,caption){
		return sendRequest(this.apiURL+"sendAudio?chat_id="+encodeURIComponent(chat_id)+"&file_id="+encodeURIComponent(file_id)+"&caption="+encodeURIComponent(caption)+"&caption="+encodeURIComponent(caption));
	}
	sendVoice(file_id,chat_id,reply_to,caption){
		return sendRequest(this.apiURL+"sendVoice?chat_id="+encodeURIComponent(chat_id)+"&file_id="+encodeURIComponent(file_id)+"&caption="+encodeURIComponent(caption));
	}
	sendLocation(longitude,latitude,chat_id,reply_to){
		return sendRequest(this.apiURL+"sendLocation?chat_id="+encodeURIComponent(chat_id)+"&longitude="+encodeURIComponent(longitude)+"&latitude="+encodeURIComponent(latitude));
	}
	forward(chat_id){
		return sendRequest(this.apiURL+"forwardMessage?chat_id="+encodeURIComponent(chat_id)+"&from_chat_id="+encodeURIComponent(this.chat_id)+"&message_id="+encodeURIComponent(this.message_id));
	}
	setDefaultEvents(){
		for (var i=0;i<this.supported_events.length;i++){
			var event = this.supported_events[i];
			if (event != "message") this.on(event,()=>"Thank you for uploading the "+event);
		}
		this.on("message",(text)=>"Received: "+text);
		this.on(new RegExp("/start"),(text)=>"Hello "+this.username);
	}
}

function sendRequest(url){
	console.log("sendRequest: "+url);
	return request.get(url);
}

module.exports.Bot = Bot;
