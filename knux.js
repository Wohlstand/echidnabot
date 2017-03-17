var Discord = require("discord.js");
var bot = new Discord.Client();


// Important config vars
var ownerId = put your user id here
var loginId = "Insert login key here"


// Other stuff
const fs = require("fs");
var responses = JSON.parse(fs.readFileSync('responses.json', 'utf8'));
var keywords = JSON.parse(fs.readFileSync('keywords.json', 'utf8'));

var prevAuthor = null;

var lastAndTime = -5000
var andCount = Math.floor((Math.random() * 3) + 3);

var canPostInGeneral = false
var channelsAllowed = {["beep-boop"]:true}
var deleteAll = false

var ttsActive = false

var mood = "neutral";  // proud, happy, neutral, angry, confused

var sayUser = new Array(0);
var sayMember = new Array(0);
var sayMessage = new Array(0);

var emoteReacts = {default: ["✊"], threat: ["greendemo:231283304958001154", "gravytea:232183775549849600", "😡", "😠", "🔥", "😏", "👎"], brag: ["somedork:231283305272705024", "😎", "💪", "👍", "🥇", "👌", "🤘"], precious: ["💎", "💰", "💲", "💵"]};


// Set up regexp stuff
var keywordRegex = {_thing:true}
updateRegex()


function getArrayRandom(array)
{
	if  (array == null)
		return {index:null, value:null}
	else
	{
		var id = Math.floor(Math.random() * (array.length));
		var val = array[id];
		return {index:id, value:val}
	}
}

function reactFromArray (message, array)
{
	if  (array == null)
		array = emoteReacts.default

	var emote = getArrayRandom(array).value
	if  (emote != null)
		message.react(emote);
}


function getResponse(category) 
{
    var randString = "";
	var array = responses[category];
	if  (array == null)
	{
		array = responses["error"];
		
		randString = array[Math.floor(Math.random() * (array.length))] + "```Could not find response category: "+category+"```";
	}
	else
		randString = array[Math.floor(Math.random() * (array.length))];

	return randString;
}


function updateRegex()
{
	for (var k in keywords)
	{
		keywordRegex[k] = new RegExp(keywords[k], 'img');
		//console.log ("Updated regex " + k + ": "+keywordRegex[k].toString())
	}
}


function ttsMessage (channel, message)
{
	if  (ttsActive)
		channel.sendMessage(message, {tts:true})
	else
		channel.sendMessage(message)
}




bot.on("messageReactionAdd", (reactionRef, userRef) => {
	console.log ("REACTION: "+reactionRef.emoji.toString()+", "+reactionRef.emoji.id+", "+reactionRef.emoji.identifier+", "+reactionRef.emoji.name)
});


bot.on("message", msg => {

	try {
		// Don't process own messages the same way as others'
		if  (msg.author !== bot.user)
		{
			// Don't respond to messages outside of #beep-boop
			if (channelsAllowed[msg.channel.name] != true) return;

			// Log the message
			if  (msg.member != null)
				console.log(msg.member.displayName+" said: "+msg.cleanContent);
			else
				console.log("[unknown] said: "+msg.cleanContent);

			// Authority check
			var authorized = (msg.author.id == ownerId  ||  msg.member.roles.has(msg.guild.roles.find("name", "mods").id))

			// direct commands
			if (msg.cleanContent.startsWith("/knux "))
			{
				if (msg.cleanContent.startsWith("/knux and"))
					ttsMessage(msg.channel, "& Knuckles")

				if (msg.cleanContent.startsWith("/knux delcmd"))
				{
					if  (deleteAll == false)
					{
						deleteAll = true;
						ttsMessage(msg.channel, "[Deleting all commands enabled]")
					}
					else
					{
						deleteAll = false;
						ttsMessage(msg.channel, "[Deleting all commands disabled]")
					}
				}

				if (msg.cleanContent.startsWith("/knux tts"))
				{
					if  (ttsActive == false)
					{
						ttsActive = true;
						msg.channel.sendMessage("/tts [Text to speech enabled]");
					}
					else
					{
						ttsActive = false;
						msg.channel.sendMessage("[Text to speech disabled]");
					}
				}

				else if (msg.cleanContent.startsWith("/knux regex"))
				{
					if (authorized)
					{
						var setStr = msg.cleanContent.substring(12);
						ttsMessage(msg.channel, "Regular expression for "+setStr+": ```"+keywordRegex[setStr].toString()+"```")
					}
				}
				
				else if (msg.cleanContent.startsWith("/knux setgame"))
				{
					var setStr = msg.cleanContent.substring(14);
					bot.user.setGame(setStr);
				}

				else if (msg.cleanContent.startsWith("/knux react"))
				{
					for (i = 0; i < 5; i++)
					{
						var emoteStr = "";
						var emoteCategory = emoteReacts.threat;
						if (Math.random() > 0.5)
							emoteCategory = emoteReacts.brag;
						reactFromArray(msg, emoteCategory);
					}
				}

				
				else if (msg.cleanContent.startsWith("/knux say"))
				{
					// Get substring to say
					var setStr = msg.cleanContent.substring(10);
					
					// Replace phrase tags with the corresponding phrase
					setStr = setStr.replace(/\^[^\^]*\^/gi, function myFunction(x){
							var noCarrots = x.substring(1,x.length-1);
							return getResponse(noCarrots);
						});
					
					var thisChannel = msg.channel;
					sayMember.splice(0, 0, msg.member);
					sayUser.splice(0, 0, msg.member.user);
					sayMessage.splice(0, 0, setStr);
					msg.delete(0);

					ttsMessage(thisChannel, setStr)
				}
				
				else if (msg.cleanContent.startsWith("/knux ping"))
				{
					var setStr = "Pong! `\n"+(Date.now() - msg.createdTimestamp + 37300).toString()+" ms`";
					ttsMessage(msg.channel, setStr)
				}
				
				else if (msg.cleanContent.startsWith("/knux reveal"))
				{
					if  (sayMember.length > 0)
					{
						var authorUser = sayUser[0];
						var authorMember = sayMember[0];
						var authorStr = authorUser.username + " (A.K.A. " + authorMember.displayName + ")";
						var contentStr = sayMessage[0];
						ttsMessage(msg.channel, "```["+authorStr+" made me say:\n"+contentStr+"]```");
					}
					else
						ttsMessage(msg.channel, "```[No say commands since I last logged in.]```");
				}
				
				else if (msg.cleanContent.startsWith("/knux learn"))
				{
					responses = JSON.parse(fs.readFileSync('responses.json', 'utf8'));
					keywords = JSON.parse(fs.readFileSync('keywords.json', 'utf8'));
					updateRegex();
					ttsMessage(msg.channel, getResponse("learning"));
				}
				
				else if (msg.cleanContent.startsWith("/knux avatar"))
				{
					var newAvatar = getResponse("avatar");
					bot.user.setAvatar(newAvatar);
					ttsMessage(msg.channel, "`[Avatar changed to `<"+newAvatar+">`]`");
				}

				else if (msg.cleanContent.startsWith("/knux error"))
				{
					if (authorized)
						butt;
					else
					{
						ttsMessage(msg.channel, getResponse("decline"));
					}
				}

				else if (msg.cleanContent.startsWith("/knux general"))
				{
					if (authorized)
					{
						if  (channelsAllowed.general == true)
						{
							ttsMessage(msg.channel, "[Posting in #general disabled]");
							channelsAllowed.general = false;
						}
						else
						{
							ttsMessage(msg.channel, "[Posting in #general enabled]");
							channelsAllowed.general = true;
							var myChannel = bot.channels.find('name', 'general');
							ttsMessage(msg.channel, getResponse("enter"));
						}
					}
					else
						ttsMessage(msg.channel, getResponse("decline"));
				}

				else if (msg.cleanContent.startsWith("/knux channel"))
				{
					if (authorized)
					{
						var setStr = msg.cleanContent.substring(14);
						if  (setStr == "beep-boop")
							ttsMessage(msg.channel, getResponse("decline"));
						else
						{
							if  (channelsAllowed[setStr] == true)
							{
								ttsMessage(msg.channel, "[Posting in #"+setStr+" disabled]");
								channelsAllowed[setStr] = false;
							}
							else
							{
								ttsMessage(msg.channel, "[Posting in #"+setStr+" enabled]");
								channelsAllowed[setStr] = true;
								var myChannel = bot.channels.find('name', setStr);
								if  (myChannel != null)
									ttsMessage(myChannel, getResponse("enter"));
							}
						}
					}
					else
						ttsMessage(msg.channel, getResponse("decline"));
				}

				else if (msg.cleanContent.startsWith("/knux shutdown"))
				{
					if (authorized)
					{
						bot.user.setStatus("invisible")
						ttsMessage(msg.channel, getResponse("exit"));
						console.log("Shutting down");
						
						bot.setTimeout(function(){
							process.exit(1);
						}, 100);
					}
					else
						ttsMessage(msg.channel, getResponse("decline"));
				}

				else
				{
					var categoryStr = msg.cleanContent.substring(6)
					if (responses[categoryStr] != null  &&  categoryStr != "exit")
						ttsMessage(msg.channel, getResponse(categoryStr));
					else
					{
					ttsMessage(msg.channel, getResponse("decline"));
						console.log("Tried to call a category that doesn't exist");
					}
				}
				
				if  (deleteAll == true  &&  msg != null)
					msg.delete(0);
			}



			else
			{
				// Parse message
				var aboutMe = false;
				var messageStr = msg.cleanContent.toLowerCase();
				var words = msg.cleanContent.toLowerCase().split(" ");
				var detectedTypes = {}
				
				// Remove every /knux from the string
				messageStr = messageStr.replace(/\/knux/g, "");
				
				// Count matches
				for (var k in keywords)
				{
					detectedTypes[k] = 0;
					
					var matches = messageStr.match(keywordRegex[k])
					if  (matches != null)
					{
						detectedTypes[k] = matches.length;
						console.log ("Matched category "+k+": "+detectedTypes[k].toString())
					}
				}

				// Special handling
				if (msg.cleanContent.endsWith("?"))
					detectedTypes.about += 1;
				if (msg.cleanContent.endsWith("!"))
				{
					if  (detectedTypes.threat > detectedTypes.brag)
						detectedTypes.threat += 1;
					else
						detectedTypes.brag += 1;
				}

				// Get highest values
				var highestNum = 1;
				var highestTied = new Array(0);
				var highestRandString = ""
				var logString = "Top sentiments: "
				for (var k in detectedTypes)
				{
					var val = detectedTypes[k];
					if (val > highestNum) highestNum = val;
				}
				for (var k in detectedTypes)
				{
					var val = detectedTypes[k];
					if (val == highestNum  &&  k != "indirect"  &&  k != "bot")
					{
						highestTied.push(k);
						logString = logString + k + ",";
					}
				}
				console.log(logString);


				// Choose random category from the ones that tied
				if (highestTied.length > 0)
					highestRandString = highestTied[Math.floor(Math.random() * (highestTied.length))];
				else
					highestRandString = "brag";


				// Check if the message is directed at or about the bot
				aboutMe = (msg.isMentioned(bot.user) == true  ||  detectedTypes.bot > 0  ||  (prevAuthor == bot.user && detectedTypes.indirect > 0));
				
				// If at or about the bot...
				if (aboutMe)
				{
					console.log("Ooh, this message is about me!");
					
					// Initialize sentiment analysis vars
					var tone = "neutral";  // neutral, insult, challenge, question, praise, request

					// Either reply with an emoji reaction or response message
					if (Math.random() > 0.5  &&  emoteReacts[highestRandString] != null)
					{
						var emoteCategory = emoteReacts[highestRandString];
						reactFromArray(msg, emoteCategory);
					}
					else
						ttsMessage(msg.channel, getResponse(highestRandString));
				}


				// If not about or directed at the bot
				else
				{
					// React to precious keyword with gem
					if (Math.random() > 0.8  &&  highestRandString != "threat"  &&  emoteReacts[highestRandString] != null)  
					{
						var emoteCategory = emoteReacts[highestRandString];
						reactFromArray(msg, emoteCategory);
					}

					// Occasionally respond with "& Knuckles" anyway
					andCount -= 1;
					console.log("And count: " + andCount.toString());
					if  (andCount <= 0)
					{
						var timeSinceLastAnd = bot.uptime - lastAndTime;
						if  (timeSinceLastAnd > 1000*20)
						{
							lastAndTime = bot.uptime
							ttsMessage(msg.channel, "& Knuckles");
							andCount = Math.floor((Math.random() * 35) + 15);
						}
						else
							console.log("Time since last and: " + timeSinceLastAnd.toString());
					}
				}
			}	
		}
		console.log(" ");
		prevAuthor = msg.author;

	}
	catch(err) {
		ttsMessage(msg.channel, getResponse("error"));
		msg.channel.sendMessage("```"+err+"```");
		console.log(err);
	}
});

bot.on('ready', () => {
	bot.user.setStatus("online")
	bot.user.setGame("protecting the Master Emerald");
	var myChannel = bot.channels.find('name', 'beep-boop');
	var myChannelB = bot.channels.find('name', 'dank');
	var introString = getResponse("enter");
	myChannel.sendMessage(introString);
	//myChannelB.sendMessage(introString);



	console.log('READY; '+introString);
	console.log(' ');
});



bot.login(loginId);