var Discord = require("discord.js");
var bot = new Discord.Client();
const fs = require("fs");
var exec = require('child_process').execFile;

// ==== Auth URL ====
//https://discordapp.com/oauth2/authorize?client_id={Put%20your%20ID%20here}&scope=bot&permissions=67169280

// Important config vars
var mconfig = JSON.parse(fs.readFileSync('config.json', 'utf8'));

var ownerId       = mconfig.ownerId;
var loginId       = mconfig.loginId;
var modRoleId     = mconfig.modRoleId;
var authorizeData = mconfig.authIds;

if  (authorizeData == null)
	authorizeData = {}

// Not-so-important config vars
//var emoteReacts = {default: ["✊"], threat: [message.guild.emojis.get('231283304958001154'), message.guild.emojis.get('232183775549849600'), message.guild.emojis.get('273610959094808576'), message.guild.emojis.get('231273731132096513'), "😡", "😠", "🔥", "😏", "👎"], brag: [message.guild.emojis.get('231283305272705024'), "😎", "💪", "👍", "🥇", "👌", "🤘"], precious: ["💎", "💰", "💲", "💵"]};

var emoteReacts = {default: ["✊"], threat: ["somedork:231283304958001154", "gravytea:232183775549849600", "thonkang:273610959094808576", "suspicious:231273731132096513", "😡", "😠", "🔥", "😏", "👎", "☠", "⚔"], brag: ["somedork:231283305272705024", "😎", "💪", "👍", "🥇", "👌", "🤘"], precious: ["💎", "💰", "💲", "💵"]};

//var emoteReacts = {default: [":fist:", ":fist:"], threat: ["somedork:231283304958001154", "gravytea:232183775549849600", "thonkang:273610959094808576", "suspicious:231273731132096513", ":rage:", ":angry:", ":fire:", ":smirk:", ":thumbsdown:", ":skull_crossbones:", ":crossed_swords:"], brag: ["somedork:231283305272705024", ":sunglasses:", ":thumbsup:", ":first_place:", ":ok_hand:", ":metal:", ":crown:"], precious: [":gem:", ":moneybag:", ":dollar:", ":heavy_dollar_sign:"]};


// Other stuff
var commands    = JSON.parse(fs.readFileSync('commands.json', 'utf8'));
delete commands["_example"]

var responses   = JSON.parse(fs.readFileSync('responses.json', 'utf8'));
var keywords    = JSON.parse(fs.readFileSync('keywords.json', 'utf8'));
var userdata    = JSON.parse(fs.readFileSync('userdata.json', 'utf8'));

var prevAuthor = null;

var lastAndTime = -5000
var andCount = Math.floor((Math.random() * 3) + 3);

var canPostInGeneral = false
var channelsAllowed = {["beep-boop"]:true, ["dank"]:true}
var deleteAll = false

var ttsActive = false

var sayUser = new Array(0);
var sayMember = new Array(0);
var sayMessage = new Array(0);



// Set up regexp stuff
var keywordRegex = {_thing:true}
updateRegex()


function getArrayRandom(array)
{
	if  (array == null)
	{
		//console.log ("Cannot get a random element from a null array")
		return {index:null, value:null}
	}
	else
	{
		var id = Math.floor(Math.random() * (array.length));
		//console.log("position: "+id.toString())
		var val = array[id];
		return {index:id, value:val}
	}
}


function reactFromArray (message, array)
{
	if  (array == null)
	{
		array = emoteReacts.default
		//console.log("No valid array provided, attempting to use default emote array")
	}
	//console.log("Array values: "+array.toString())

	var emote = getArrayRandom(array).value
	if  (emote != null)
	{
		//console.log("Attempting to react with "+emote.toString())
		message.react(emote);

		/*
		if  (emote.startsWith(":"))
			message.react(emote);
		else
			message.react(message.guild.emojis.get(emote));
		*/

	}
	else
		console.log("Couldn't get a valid emoji string")
}


function getResponse(category)
{
	var randString = "";
	var array = responses[category];
	if  (array == null)
	{
		array = responses["error"];

		randString = array[Math.floor(Math.random() * (array.length))] + "```Could not find response category: '"+category+"'```";
	}
	else
		randString = array[Math.floor(Math.random() * (array.length))];

	return randString;
}


function updateJson(data, name)
{
	localStorage.setItem(name, JSON.stringify(data))
}


function updateRegex()
{
	for (var k in keywords)
	{
		keywordRegex[k] = new RegExp(keywords[k], 'img');
		//console.log ("Updated regex " + k + ": "+keywordRegex[k].toString())
	}
}

function sendMsg(channel, msg)
{
  channel.startTyping()
  setTimeout(function()
  {
    channel.stopTyping()
    setTimeout(function()
	{
      channel.send(msg, {tts:(ttsActive==true)})
    },300)
  },msg.length*15)
}


// ---------- NEW COMMAND SYSTEM FUNCTIONS ----------------
function sendError (channel, str)
{
	
}



var helpCategories = {}

function buildHelpCategories ()
{
	console.log("START CREATING COMMAND LISTS FOR HELP");
	helpCategories = {}
	for (var item in commands)
	{
		var cmdProps = commands[item]
		if (cmdProps != null)
		{
			if  (cmdProps.category != null)
			{
				if  (helpCategories[cmdProps.category] == null)
				{
					helpCategories[cmdProps.category] = []
					console.log("ADDING CATEGORY " + cmdProps.category);
				}

				helpCategories[cmdProps.category].push(item)
				console.log("ADDING COMMAND " + item + " TO CATEGORY " + cmdProps.category);
			}
		}
		else
			console.log("UNABLE TO GET PROPERTIES FOR " + item);
	}
	console.log("DONE CREATING COMMAND LISTS");
}


var cmdFuncts = {}
cmdFuncts.sendResponse = function (msg, cmdStr, argStr, props)
{
	var randString = "";
	var array = props["phrases"];
	if  (array == null)
	{
		randString = "[Error: Could not find response category: `"+cmdStr+"`]";
	}
	else
		randString = getArrayRandom(props.phrases).value;

	sendMsg (msg.channel, randString);
}

cmdFuncts.toggleTTS = function (msg, cmdStr, argStr, props)
{
	if  (ttsActive == false)
	{
		ttsActive = true;
		sendMsg(msg.channel, "[Text to speech enabled]");
	}
	else
	{
		ttsActive = false;
		sendMsg(msg.channel, "[Text to speech disabled]");
	}
}


cmdFuncts.gitPull = function (msg, cmdStr, argStr, props)
{
	console.log("Pulling a git");
	exec('git', ["pull", "origin", "master"], function(err, data)
	{
		if(err == null)
			sendMsg(msg.channel, "git pull origin master\n```\n" + data.toString() + "\n```\n");
		else
		{
			sendMsg(msg.channel, "ERROR of git pull origin master```\n" + err + "\n\n" + data.toString() + "\n```\n");
			exec('git', ["merge", "--abort"], function(err, data){});
		}
	});
}

cmdFuncts.shutDown = function (msg, cmdStr, argStr, props)
{
	bot.user.setStatus("invisible")
	msg.channel.send(getArrayRandom(props.phrases).value, {tts:(ttsActive==true)})
	console.log("Shutting down");

	bot.setTimeout(function(){
			process.exit(1);
		}, 1000);
}


cmdFuncts.updateAndRestart = function (msg, cmdStr, argStr, props)
{
	console.log("Pulling a git");
	exec('git', ["pull", "origin", "master"], function(err, data)
	{
		if(err == null)
		{
			sendMsg(msg.channel, "git pull origin master\n```\n" + data.toString() + "\n```\n");

			bot.user.setStatus("invisible")
			sendMsg(msg.channel, getResponse("exit"));
			console.log("Shutting down");

			bot.setTimeout(function() {process.exit(1);}, 1000);
		}
		else
		{
			sendMsg(msg.channel, "ERROR of git pull origin master```\n" + err + "\n\n" + data.toString() + "\n```\n");
			exec('git', ["merge", "--abort"], function(err, data){});
		}
	});
}


cmdFuncts.reactionSpam = function (msg, cmdStr, argStr, props)
{
	var numReacts = 3+Math.floor(Math.random()*5)
	for (i = 0; i < numReacts; i++)
	{
		var emoteStr = "";
		var emoteCategory = "threat";
		if (Math.random() > 0.5)
			emoteCategory = "brag";

		console.log ("emote category: "+emoteCategory)
		reactFromArray(msg, emoteReacts[emoteCategory]);
	}
}

cmdFuncts.setGame = function (msg, cmdStr, argStr, props)
{
	bot.user.setGame(argStr);
}

cmdFuncts.revealSay = function (msg, cmdStr, argStr, props)
{
	if  (sayMember.length > 0)
	{
		var authorUser = sayUser[0];
		var authorMember = sayMember[0];
		var authorStr = authorUser.username + " (A.K.A. " + authorMember.displayName + ")";
		var contentStr = sayMessage[0];
		sendMsg(msg.channel, "```["+authorStr+" made me say:\n"+contentStr+"]```");
	}
	else
		sendMsg(msg.channel, "```[No say commands since I last logged in.]```");
}

cmdFuncts.forceSay = function (msg, cmdStr, argStr, props)
{
	// Get substring to say
	var setStr = argStr

	// Replace phrase tags with the corresponding phrase
	setStr = setStr.replace(/\^[^\^]*\^/gi, function myFunction(x){
			var noCarrots = x.substring(1,x.length-1);
			return getResponse(noCarrots);
		});

	sayMember.splice(0, 0, msg.member);
	sayUser.splice(0, 0, msg.member.user);
	sayMessage.splice(0, 0, setStr);
	msg.delete(0);

	sendMsg(msg.channel, setStr)
}

cmdFuncts.toggleChannel = function (msg, cmdStr, argStr, props)
{
	var setStr = argStr;
	if  (setStr == "beep-boop")
		sendMsg(msg.channel, getResponse("decline"));
	else
	{
		if  (channelsAllowed[setStr] == true)
		{
			sendMsg(msg.channel, "[Posting in #"+setStr+" disabled]");
			channelsAllowed[setStr] = false;
		}
		else
		{
			sendMsg(msg.channel, "[Posting in #"+setStr+" enabled]");
			channelsAllowed[setStr] = true;
			var myChannel = bot.channels.find('name', setStr);
			if  (myChannel != null)
				sendMsg(myChannel, getResponse("enter"));
		}
	}
}

cmdFuncts.toggleDelCmd = function (msg, cmdStr, argStr, props)
{
	if  (deleteAll == false)
	{
		deleteAll = true;
		sendMsg(msg.channel, "[Deleting all commands enabled]")
	}
	else
	{
		deleteAll = false;
		sendMsg(msg.channel, "[Deleting all commands disabled]")
	}
}


cmdFuncts.setAvatar = function (msg, cmdStr, argStr, props)
{
	var newAvatar = getArrayRandom(props.phrases).value;
	bot.user.setAvatar(newAvatar);
	sendMsg(msg.channel, "`[Avatar changed to `<"+newAvatar+">`]`");
}

cmdFuncts.callHelp = function (msg, cmdStr, argStr, props)
{

	var newEmbed = {"color": 16733525, "fields": []}
	var sendHelp = false

	// Show a specific command's help post
	if  (argStr != "")
	{
		var newProps = commands[argStr]
		var deny = true

		if  (newProps != null)
		{
			var authStr = newProps.auth
			if  (authStr == null)
				authStr = "everyone"

			if  (newProps.info != null)
			{
				newEmbed["fields"] = [{
				                       name: "Command info: "+argStr,
				                       value: "\nAuthorization group: "+authStr+"\n"+newProps.info
				                      }]
				sendHelp = true
				deny = false
			}
		}

		if  (deny)
			cmdFuncts.sendResponse(msg, "nocmd", "", commands["nocmd"])
	}

	// Show the general help post
	else
	{
		newEmbed["fields"] = [{
		                      name: "Echidnabot help",
		                      value: "To perform a command, prefix it with `/knux ` (for example, `/knux jam`)\n\nTo get info on a command, prefix it with `/knux help ` (type just `/knux help` to display this post.)\n\nCrossed-out commands are currently broken."
		                     }]

		for (var item in helpCategories)
		{
			var listStr = ""
			for (var item2 in helpCategories[item])
			{
				if (listStr != "")
					listStr = listStr + ", "

				var cmdStr = helpCategories[item][item2]
				var functName = commands[cmdStr]["function"]
				if  (functName == null)
					functName = "sendResponse"

				if  (cmdFuncts[functName] == null)
					listStr = listStr + "~~`" + cmdStr + "`~~"
				else
					listStr = listStr + "`" + cmdStr + "`"
			}
			newEmbed["fields"].push({name: item+" commands:", value: listStr})
			sendHelp = true
		}
	}

	if (sendHelp)
		msg.channel.send({embed: newEmbed});
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
			var authorized = ((ownerId.indexOf(msg.author.id) != -1) || msg.member.roles.has(modRoleId))
			var authordata = userdata[msg.author.id.toString()]
			if  (authordata != null)
			{
				if  (authordata["authorized"] == true)
					authorized = true
			}



			// Temporarily brute-forcing old important commands
			if (msg.cleanContent.startsWith("/knux oldshutdown"))
			{
				if (authorized)
				{
					bot.user.setStatus("invisible")
					sendMsg(msg.channel, getResponse("exit"));
					console.log("Shutting down");

					bot.setTimeout(function(){
						process.exit(1);
					}, 100);
				}
				else
					sendMsg(msg.channel, getResponse("decline"));
			}

			else if (msg.cleanContent.startsWith("/knux oldgitpull"))
			{
				if (authorized)
				{
					console.log("Pulling a git");
					exec('git', ["pull", "origin", "master"], function(err, data)
					{
						if(err == null)
							sendMsg(msg.channel, "git pull origin master\n```\n" + data.toString() + "\n```\n");
						else
						{
							sendMsg(msg.channel, "ERROR of git pull origin master```\n" + err + "\n\n" + data.toString() + "\n```\n");
							exec('git', ["merge", "--abort"], function(err, data){});
						}
					});
				}
				else
					sendMsg(msg.channel, getResponse("decline"));
			}



			// New direct commands
			else if (msg.cleanContent.startsWith("/knux "))
			{
				var cleanMsg = msg.cleanContent
				var inputStr = cleanMsg.substr (6)

				var cmdStr   = inputStr
				var argStr   = ""
				if (inputStr.indexOf(' ') != -1)
				{
					cmdStr = inputStr.substr (0, inputStr.indexOf(' '))
					argStr = inputStr.substr (inputStr.indexOf(' ')+1)
				}

				if (commands[cmdStr] != null)
				{
					var props = commands[cmdStr]
					var authLevel = props["auth"]
					var matchesAuthLevel = true
					var functPtr = cmdFuncts["sendResponse"]
					var functStr = ""

					if  (authLevel != null)
					{
						matchesAuthLevel = false
						var authTable = authorizeData[authLevel]
						if (authTable == null)
							authTable = modRoleId
						
						if (authTable.indexOf(msg.author.id) != -1)
							matchesAuthLevel = true
					}

					if  (props["function"] != null)
					{
						functStr = props["function"]
						functPtr = cmdFuncts[functStr]
					}

					if  (matchesAuthLevel  ||  authorized)
					{
						if  (functPtr != null)
							functPtr(msg, cmdStr, argStr, props)
						else if (functStr != "")
							sendMsg(msg.channel, "[Command is broken.  Function not found: " + functStr + "]")
					}
					else
					{
						cmdFuncts.sendResponse(msg, "decline", "", commands["decline"]);
					}
				}
				else
					cmdFuncts.sendResponse(msg, "decline", "", commands["decline"]);

				/*
				if (msg.cleanContent.startsWith("/knux and"))
					sendMsg(msg.channel, "& Knuckles")

				if (msg.cleanContent.startsWith("/knux delcmd"))
				{
					if  (deleteAll == false)
					{
						deleteAll = true;
						sendMsg(msg.channel, "[Deleting all commands enabled]")
					}
					else
					{
						deleteAll = false;
						sendMsg(msg.channel, "[Deleting all commands disabled]")
					}
				}

				if (msg.cleanContent.startsWith("/knux authorize"))
				{
					if (authorized)
					{
						// Get username substring
						var nameStr = msg.cleanContent.substring(16);

						// Check if a valid user was specified
						var targetUser = null

						var gMembers = msg.guild.members
						for (var m in gMembers)
						{
							var mUser = m.user
							var mUsername = m.user.username
							if  (mUsername == nameStr)
							{
								sendMsg(msg.channel, "["+mUsername+" (A.K.A. "+m.displayName+") is now authorized to use mod commands]")
								targetUser = mUser
								break;
							}
						}

						if  (targetUser != null)
						{
							var userKey = targetUser.id.toString()
							if  (userdata[userKey] == null)
								userdata[userKey] = {}
							userdata[userKey].authorized = true
							updateJson(userdata, 'userdata')
						}
						else
						{
							sendMsg(msg.channel, "[User not found, please specify a valid username for a member of this server]")
						}
					}
				}

				if (msg.cleanContent.startsWith("/knux submit"))
				{
					var setStr = msg.cleanContent.substring(13);

					if  (setStr != null)
					{
						var userKey = msg.author.id.toString()
						if  (userdata[userKey] == null)
							userdata[userKey] = {}
						if  (userdata[userKey].submissions == null)
							userdata[userKey].submissions = []
						userdata[userKey].submissions.push(setStr)
						updateJson(userdata, 'userdata')
						msg.channel.sendMessage("[`"+setStr+"` added to "+msg.author.username+"'s list of submissions for my host to review.]");
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
						sendMsg(msg.channel, "Regular expression for "+setStr+": ```"+keywordRegex[setStr].toString()+"```")
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

					sendMsg(thisChannel, setStr)
				}

				else if (msg.cleanContent.startsWith("/knux ping"))
				{
					var setStr = "Pong! `\n"+(Date.now() - msg.createdTimestamp + 37300).toString()+" ms`";
					sendMsg(msg.channel, setStr)
				}

				else if (msg.cleanContent.startsWith("/knux reveal"))
				{
					if  (sayMember.length > 0)
					{
						var authorUser = sayUser[0];
						var authorMember = sayMember[0];
						var authorStr = authorUser.username + " (A.K.A. " + authorMember.displayName + ")";
						var contentStr = sayMessage[0];
						sendMsg(msg.channel, "```["+authorStr+" made me say:\n"+contentStr+"]```");
					}
					else
						sendMsg(msg.channel, "```[No say commands since I last logged in.]```");
				}

				else if (msg.cleanContent.startsWith("/knux learn"))
				{
					responses = JSON.parse(fs.readFileSync('responses.json', 'utf8'));
					keywords = JSON.parse(fs.readFileSync('keywords.json', 'utf8'));
					updateRegex();
					sendMsg(msg.channel, getResponse("learning"));
				}

				else if (msg.cleanContent.startsWith("/knux avatar"))
				{
					var newAvatar = getResponse("avatar");
					bot.user.setAvatar(newAvatar);
					sendMsg(msg.channel, "`[Avatar changed to `<"+newAvatar+">`]`");
				}

				else if (msg.cleanContent.startsWith("/knux error"))
				{
					if (authorized)
						butt;
					else
					{
						sendMsg(msg.channel, getResponse("decline"));
					}
				}

				else if (msg.cleanContent.startsWith("/knux general"))
				{
					if (authorized)
					{
						if  (channelsAllowed.general == true)
						{
							sendMsg(msg.channel, "[Posting in #general disabled]");
							channelsAllowed.general = false;
						}
						else
						{
							sendMsg(msg.channel, "[Posting in #general enabled]");
							channelsAllowed.general = true;
							var myChannel = bot.channels.find('name', 'general');
							sendMsg(msg.channel, getResponse("enter"));
						}
					}
					else
						sendMsg(msg.channel, getResponse("decline"));
				}

				else if (msg.cleanContent.startsWith("/knux channel"))
				{
					if (authorized)
					{
						var setStr = msg.cleanContent.substring(14);
						if  (setStr == "beep-boop")
							sendMsg(msg.channel, getResponse("decline"));
						else
						{
							if  (channelsAllowed[setStr] == true)
							{
								sendMsg(msg.channel, "[Posting in #"+setStr+" disabled]");
								channelsAllowed[setStr] = false;
							}
							else
							{
								sendMsg(msg.channel, "[Posting in #"+setStr+" enabled]");
								channelsAllowed[setStr] = true;
								var myChannel = bot.channels.find('name', setStr);
								if  (myChannel != null)
									sendMsg(myChannel, getResponse("enter"));
							}
						}
					}
					else
						sendMsg(msg.channel, getResponse("decline"));
				}

				else if (msg.cleanContent.startsWith("/knux help") || msg.cleanContent.startsWith("/knux info") || msg.cleanContent.startsWith("/knux cmd") || msg.cleanContent.startsWith("/knux command"))
				{
					var setStr = ""
					var cleanMsg = msg.cleanContent
					if       (cleanMsg.startsWith("/knux help ")  ||  cleanMsg.startsWith("/knux info "))
					{
						if  (cleanMsg.length > 10)
							setStr = cleanMsg.substring(11);
					}
					else if  (cleanMsg.startsWith("/knux cmd "))
					{
						if  (cleanMsg.length > 9)
							setStr = cleanMsg.substring(10);
					}
					else if  (cleanMsg.startsWith("/knux command "))
					{
						if  (cleanMsg.length > 13)
							setStr = cleanMsg.substring(14);
					}

					if  (setStr == null  ||  setStr == "")
						callHelp(msg)
					else
					{
						if  (responses["helpcmd"][setStr] != null)
							callCmdHelp(msg, setStr)
						else
							sendMsg(msg.channel, getResponse("help missing"))
					}
				}

				else if (msg.cleanContent.startsWith("/knux shutdown"))
				{
					if (authorized)
					{
						bot.user.setStatus("invisible")
						sendMsg(msg.channel, getResponse("exit"));
						console.log("Shutting down");

						bot.setTimeout(function(){
							process.exit(1);
						}, 100);
					}
					else
						sendMsg(msg.channel, getResponse("decline"));
				}

				else if (msg.cleanContent.startsWith("/knux gitpull"))
				{
					if (authorized)
					{
						console.log("Pulling a git");
						exec('git', ["pull", "origin", "master"], function(err, data)
						{
							if(err == null)
								sendMsg(msg.channel, "git pull origin master\n```\n" + data.toString() + "\n```\n");
							else
							{
								sendMsg(msg.channel, "ERROR of git pull origin master```\n" + err + "\n\n" + data.toString() + "\n```\n");
								exec('git', ["merge", "--abort"], function(err, data){});
							}
						});
					}
					else
						sendMsg(msg.channel, getResponse("decline"));
				}

				else
				{
					var categoryStr = msg.cleanContent.substring(6)
					if (responses[categoryStr] != null  &&  categoryStr != "exit")
						sendMsg(msg.channel, getResponse(categoryStr));
					else
					{
					sendMsg(msg.channel, getResponse("decline"));
						console.log("Tried to call a category that doesn't exist");
					}
				}
				*/

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
					console.log("I think I'll respond to this message.");

					// Initialize sentiment analysis vars
					var tone = "neutral";  // neutral, insult, challenge, question, praise, request

					// Either reply with an emoji reaction or response message
					
					if (Math.random() > 0.5  &&  emoteReacts[highestRandString] != null)
					{
						var emoteCategory = emoteReacts[highestRandString];
						console.log ("emote category: "+highestRandString)
						reactFromArray(msg, emoteCategory);
					}
					else
						sendMsg(msg.channel, getResponse(highestRandString));
				}


				// If not about or directed at the bot
				else
				{
					// React to precious keyword with gem
					if (Math.random() > 0.8  &&  highestRandString != "threat"  &&  emoteReacts[highestRandString] != null)
					{
						var emoteCategory = emoteReacts[highestRandString];
						console.log("emote category: " + highestRandString);
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
							sendMsg(msg.channel, "& Knuckles");
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
		sendMsg(msg.channel, getResponse("error"));
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

	buildHelpCategories ()

	console.log('READY; '+introString);
	console.log(' ');
});



bot.login(loginId);
