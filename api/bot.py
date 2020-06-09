import re
import json
import os
import time
import traceback
from urllib.request import urlopen
from urllib.parse import quote
from http.server import BaseHTTPRequestHandler

class Bot:
	def __init__(self,token):
		self.reply = True
		self.botURL = "https://api.telegram.org/bot###TOKEN###/".replace("###TOKEN###",str(token))
		self.events = {}
		self.commands = {}
		self.supported_events = ["message","audio","video","photo","sticker","location","animation","voice","document"]
		self.set_default_events()
	def on(self,event,callback):
		if event in self.supported_events: self.events[event] = callback
		else: self.commands[event] = callback
	def handle_request(self,data):
		if "update_id" in data:
			msg_types = ["message","channel_post","edited_message","edited_channel_post"]
			msg = None
			for key in msg_types:
				if key in data:
					msg = data[key]
					break
			else: raise ValueError("Unknown Message: "+str(data))
			if "message_id" not in msg: raise ValueError("Unknown Message-Id: "+str(msg))
			self.msg_id = msg["message_id"]
			if "chat" not in msg: raise ValueError("Unknown Chat: "+str(data))
			chat = msg["chat"]
			if "id" not in msg["chat"]: raise ValueError("Unknown Chat-Id: "+str(chat))
			self.chat_id = msg["chat"]["id"]
			res = None
			if "text" in msg:
				for cmd in self.commands:
					m = re.match(msg["text"],cmd)
					if m:
						res = self.commands[cmd](msg["text"])
						break
				else: res = self.events["message"](msg["text"])
			elif "audio" in msg and "file_id" in msg["audio"]: res = self.events["audio"](msg["audio"]["file_id"])
			elif "video" in msg and "file_id" in msg["video"]: res = self.events["video"](msg["video"]["file_id"])
			elif "photo" in msg and "file_id" in msg["photo"][0]: res = self.events["photo"](msg["photo"][0]["file_id"])
			elif "sticker" in msg and "file_id" in msg["sticker"]: res = self.events["sticker"](msg["sticker"]["file_id"])
			elif "location" in msg and "longitude" in msg["location"] and "latitude" in msg["location"]: res = self.events["location"](msg["location"]["longitude"],msg["location"]["longitude"])
			elif "animation" in msg and "file_id" in msg["animation"]: res = self.events["animation"](msg["video"]["file_id"])
			elif "document" in msg and "file_id" in msg["document"]: res = self.events["document"](msg["document"]["file_id"])
			elif "voice" in msg and "file_id" in msg["voice"]: res = self.events["voice"](msg["voice"]["file_id"])
			else: res = "Internal Bot Error: Unknown Message"
			if type(res) is str:
				return json.dumps({
					"method": "sendMessage",
					"chat_id": self.chat_id,
					"text": res,
					"reply_to_message_id": self.msg_id if self.reply else None
				})
		else: raise ValueError("Unknown Update-ID: "+str(data))
	def send_message(self,text,chat_id=None):
		if chat_id == None: chat_id = self.chat_id
		return self.send_get_request(self.botURL+"sendMessage?chat_id="+quote(str(chat_id))+"&text="+quote(str(text)))
	def send_audio(self,file_id,text="",chat_id=None):
		if chat_id == None: chat_id = self.chat_id
		return self.send_get_request(self.botURL+"sendAudio?chat_id="+quote(str(chat_id))+"&file_id="+quote(str(file_id))+"&caption="+quote(str(text))+("&reply_to_message_id="+quote(str(self.msg_id)) if self.reply else ""))
	def send_video(self,file_id,text="",chat_id=None):
		if chat_id == None: chat_id = self.chat_id
		return self.send_get_request(self.botURL+"sendVideo?chat_id="+quote(str(chat_id))+"&file_id="+quote(str(file_id))+"&caption="+quote(str(text))+("&reply_to_message_id="+quote(str(self.msg_id)) if self.reply else ""))
	def forward(self,chat_id):
		return self.send_get_request(self.botURL+"forwardMessage?chat_id="+quote(str(chat_id))+"&from_chat_id="+quote(str(self.chat_id))+"&message_id="+quote(str(self.message_id)))
	def send_get_request(self,url):
		req = urlopen(url)
		res = req.read().decode("utf-8")
		return json.loads(res)
	def set_default_events(self):
		self.on("message",lambda txt: "Received: "+txt)
		self.on("video",lambda file_id: "Thanks for sharing your video")
		self.on("audio",lambda file_id: "Thanks for sharing your audio")
		self.on("sticker",lambda file_id: "Thanks for sharing your sticker")
		self.on("photo",lambda file_id: "Thanks for sharing your photo")
		self.on("location",lambda lon,lat: "Thanks for sharing your location: "+str({"lon":lon,"lat":lat}))
		self.on("document",lambda file_id: "Thanks for sharing your document")
		self.on("animation",lambda file_id: "Thanks for sharing your animation")
	def broadcast(self,chat_ids,text,chat_id):
		for i,id in enumerate(chat_ids):
			self.send_message(text)
			if i%30 == 0: time.sleep(1)
		return True


bot = Bot(os.getenv("BOT_TOKEN"))
bot.on("/start",lambda txt: "Hello 😁")
bot.on("/help",lambda txt: "I cannot help you ...")

#data = { "update_id": 125734581, "message": { "message_id": 18, "from": { "id": 41877655, "is_bot": False, "first_name": 'Julian', "last_name": 'Foggo', "username": 'Jfoggo', "language_code": 'de' }, "chat": { "id": 41877655, "first_name": 'Julian', "last_name": 'Foggo', "username": 'Jfoggo', "type": 'private' }, "date": 1591461626, "text": 'Woe' }}
#print(bot.handle_request(data))

class handler(BaseHTTPRequestHandler):
	def do_POST(self):
		print("[*] incoming request: "+str(self.path))
		# Read POST data
		content_length = int(self.headers['Content-Length'])
		post_data = self.rfile.read(content_length).decode("utf-8")
		post_data = json.loads(post_data)
		print("[*] post data: "+str(post_data))
		# Execute bot command
		try:
			response_data = bot.handle_request(post_data)
		except Exception as e:
			print("[ERR] "+str(e))
			traceback.print_exc()
			response_data = "{}"
		print("[*] response: "+str(response_data))
		# Send response header
		self.send_response(200)
		self.send_header('Content-Type','application/json');
		self.end_headers()
		# Send response body
		self.wfile.write(str(response_data).encode())

