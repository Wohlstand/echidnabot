let Discord = require("discord.js");
let bot = new Discord.Client();
const fs = require("fs");
let exec = require('child_process').execFile;

// WatchDog for SystemD
let notify = null;
if (process.platform === 'linux')
    notify = require('sd-notify');

// ==== Auth URL ====
//https://discordapp.com/oauth2/authorize?client_id={Put%20your%20ID%20here}&scope=bot&permissions=67169280

// Important config vars
let mconfig = JSON.parse(fs.readFileSync('config.json', 'utf8'));

let ownerId             = mconfig.ownerId;
let loginId             = mconfig.loginId;
let modRoleId           = mconfig.modRoleId;
let startingChannelId   = mconfig.startingChannel;
let startingGuildId     = mconfig.startingGuild;
let authorizeData       = mconfig.authIds;

if (authorizeData == null)
    authorizeData = {};

// Not-so-important config vars
//let emoteReacts = {default: ["✊"], threat: [message.guild.emojis.get('231283304958001154'), message.guild.emojis.get('232183775549849600'), message.guild.emojis.get('273610959094808576'), message.guild.emojis.get('231273731132096513'), "😡", "😠", "🔥", "😏", "👎"], brag: [message.guild.emojis.get('231283305272705024'), "😎", "💪", "👍", "🥇", "👌", "🤘"], precious: ["💎", "💰", "💲", "💵"]};

let emoteReacts = {
    default: ["✊"],
    threat: ["somedork:231283304958001154", "gravytea:232183775549849600", "thonkang:273610959094808576", "suspicious:231273731132096513", "😡", "😠", "🔥", "😏", "👎", "☠", "⚔"],
    brag: ["somedork:231283305272705024", "😎", "💪", "👍", "🥇", "👌", "🤘"],
    precious: ["💎", "💰", "💲", "💵"]
};

//let emoteReacts = {default: [":fist:", ":fist:"], threat: ["somedork:231283304958001154", "gravytea:232183775549849600", "thonkang:273610959094808576", "suspicious:231273731132096513", ":rage:", ":angry:", ":fire:", ":smirk:", ":thumbsdown:", ":skull_crossbones:", ":crossed_swords:"], brag: ["somedork:231283305272705024", ":sunglasses:", ":thumbsup:", ":first_place:", ":ok_hand:", ":metal:", ":crown:"], precious: [":gem:", ":moneybag:", ":dollar:", ":heavy_dollar_sign:"]};


// Other stuff
let commands = JSON.parse(fs.readFileSync('commands.json', 'utf8'));
delete commands["_example"];

let responses = JSON.parse(fs.readFileSync('responses.json', 'utf8'));
let keywords = JSON.parse(fs.readFileSync('keywords.json', 'utf8'));

if(!fs.existsSync("userdata.json"))
    fs.writeFileSync("userdata.json", "{}", "utf8");
let userdata = JSON.parse(fs.readFileSync("userdata.json", "utf8"));

if(!fs.existsSync("serverdata.json"))
    fs.writeFileSync("serverdata.json", "{}", "utf8");
let serverdata = JSON.parse(fs.readFileSync("serverdata.json", "utf8"));

let prevAuthor = null;

let lastAndTime = -5000;
let andCount = Math.floor((Math.random() * 3) + 3);

let channelsAllowed = {[mconfig.startingChannel] : true};
let deleteAll = false;

let ttsActive = false;

let sayUser = new Array(0);
let sayMember = new Array(0);
let sayMessage = new Array(0);

// Set up regexp stuff
let keywordRegex = {_thing: true};
updateRegex();

function isChannelAllowed(channel)
{
    let chId = channel.id.toString();
    if(chId in channelsAllowed)
        return channelsAllowed[chId] === true;
    else
        return false;
}

function setChannelAllowed(channel, isAllowed)
{
    let chId = channel.id.toString();
    channelsAllowed[chId] = isAllowed;
    serverdata.channelsAllowed = channelsAllowed;
}

function getChannelByName(guild, channelName)
{
    return guild.channels.find(x => x.name === channelName);
}

let msgFailedAttempts = 0;
function msgSendError(error, message)
{
    if (error)
    {
        console.log("Fail to send message: " + message);
        let ErrorText = "Can't send message because: " + error;
        console.log(ErrorText);
        if (++msgFailedAttempts > 2)
        {
            console.log("Trying to relogin...");
            bot.login(loginId).catch(msgSendError);
            msgFailedAttempts = 0;
        }
    }
    else
    {
        msgFailedAttempts = 0;
    }
}

function getArrayRandom(array)
{
    if (array == null)
    {
        //console.log ("Cannot get a random element from a null array")
        return {index: null, value: null}
    }
    else
    {
        let id = Math.floor(Math.random() * (array.length));
        //console.log("position: "+id.toString())
        let val = array[id];
        return {index: id, value: val}
    }
}


function reactFromArray(message, array)
{
    if (array == null)
    {
        array = emoteReacts.default
        //console.log("No valid array provided, attempting to use default emote array")
    }
    //console.log("Array values: "+array.toString())

    let emote = getArrayRandom(array).value;
    if (emote != null)
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
    let randString = "";
    let array = responses[category];
    if (array == null)
    {
        array = responses["error"];

        randString = array[Math.floor(Math.random() * (array.length))] + "```Could not find response category: '" + category + "'```";
    }
    else
        randString = array[Math.floor(Math.random() * (array.length))];

    return randString;
}


function updateJson(data, name)
{
    console.log("UPDATING JSON: " + name);
    fs.writeFileSync(name + ".json", JSON.stringify(data));
}

function updateServerData(guild)
{
    console.log("UPDATING SERVER DATA: " + guild.name);
    if (serverdata[guild.id] == null)
    {
        serverdata[guild.id] = {};
    }
    let guildEntry = serverdata[guild.id];

    // Basic data
    guildEntry.name = guild.name;


    // Initialize different categories
    let categories = ["polls", "channels", "channelsAllowed"];
    for (let j in categories)
    {
        let val = categories[j];
        if (guildEntry[val] == null)
            guildEntry[val] = {};
    }

    // Channel data
    guild.channels.forEach(channel =>
    {
        console.log("UPDATING SERVER'S CHANNEL DATA: " + channel.id.toString() + "(" + channel.name + ")");

        if (guildEntry.channels[channel.id] == null)
            guildEntry.channels[channel.id] = {};
        let channelEntry = guildEntry.channels[channel.id];

        channelEntry.name = channel.name;
        channelEntry.type = channel.type;

        /*
        switch (channel.type)
        {
            case "text":
                break;
            case "voice":
                break;
        }
        */
    });

    updateJson(serverdata, 'serverdata');
}

function updateUserData(user)
{
    if (user == null)
    {
        console.log("ATTEMPTED TO UPDATE USER DATA BUT INVALID USER GIVEN");
        return;
    }

    console.log("UPDATING USER DATA");// + user.username);
    if (userdata[user.id] == null)
    {
        userdata[user.id] = {};
    }
    let userEntry = userdata[user.id];

    userEntry.username = user.username;

    if (user.dmChannel)
        userEntry.dmChannelId = user.dmChannel.id;

    updateJson(userdata, 'userdata');
}

function updateRegex()
{
    for (let k in keywords)
    {
        keywordRegex[k] = new RegExp(keywords[k], 'img');
        //console.log ("Updated regex " + k + ": "+keywordRegex[k].toString())
    }
}

function sendMsg(channel, msg)
{
    channel.startTyping();
    setTimeout(function ()
    {
        channel.stopTyping();
        setTimeout(function ()
        {
            channel.send(msg, {tts: (ttsActive === true)})
        }, 300)
    }, msg.length * 15)
}


// ---------- NEW COMMAND SYSTEM FUNCTIONS ----------------
function sendError(channel, str)
{

}


let helpCategories = {};

function buildHelpCategories()
{
    console.log("START CREATING COMMAND LISTS FOR HELP");
    helpCategories = {};
    for (let item in commands)
    {
        let cmdProps = commands[item];
        if (cmdProps != null)
        {
            if (cmdProps.category != null)
            {
                if (helpCategories[cmdProps.category] == null)
                {
                    helpCategories[cmdProps.category] = [];
                    console.log("ADDING CATEGORY " + cmdProps.category);
                }

                helpCategories[cmdProps.category].push(item);
                console.log("ADDING COMMAND " + item + " TO CATEGORY " + cmdProps.category);
            }
        }
        else
            console.log("UNABLE TO GET PROPERTIES FOR " + item);
    }
    console.log("DONE CREATING COMMAND LISTS");
}


let cmdFuncts = {};
cmdFuncts.sendResponse = function (msg, cmdStr, argStr, props)
{
    let randString = "";
    let array = props["phrases"];
    if (array == null)
    {
        randString = "[Error: Could not find response category: `" + cmdStr + "`]";
    }
    else
        randString = getArrayRandom(props.phrases).value;

    sendMsg(msg.channel, randString);
};

cmdFuncts.toggleTTS = function (msg, cmdStr, argStr, props)
{
    if (ttsActive === false)
    {
        ttsActive = true;
        sendMsg(msg.channel, "[Text to speech enabled]");
    }
    else
    {
        ttsActive = false;
        sendMsg(msg.channel, "[Text to speech disabled]");
    }
};


cmdFuncts.gitPull = function (msg, cmdStr, argStr, props)
{
    console.log("Pulling a git");
    exec('git', ["pull", "origin", "master"], function (err, data)
    {
        if (err == null)
            sendMsg(msg.channel, "git pull origin master\n```\n" + data.toString() + "\n```\n");
        else
        {
            sendMsg(msg.channel, "ERROR of git pull origin master```\n" + err + "\n\n" + data.toString() + "\n```\n");
            exec('git', ["merge", "--abort"], function (err, data)
            {
            });
        }
    });
};

/*
cmdFuncts.emojiCommands = function (msg, cmdStr, argStr, props)
{
	let setStr = argStr;
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
			let myChannel = bot.channels.find('name', setStr);
			if  (myChannel != null)
				sendMsg(myChannel, getResponse("enter"));
		}
	}
	bot.user.setStatus("invisible")
	msg.channel.send(getArrayRandom(props.phrases).value, {tts:(ttsActive==true)})
	console.log("Shutting down");

	bot.setTimeout(function(){
			process.exit(1);
		}, 1000);
}
*/


let lastReactClearedId = serverdata.lastReactClearedId

function clearReactionsInMessage(msg, id)
{
    msg.channel.fetchMessage(id)
        .then(message => message.clearReactions());
}


cmdFuncts.quote = function (msg, cmdStr, argStr, props)
{
    msg.channel.fetchMessage(argStr)
        .then(message => sendMsg(msg.channel, "[" + argStr + ": " + message.cleanContent + "]"));
};

cmdFuncts.clearReactsOne = function (msg, cmdStr, argStr, props)
{
    msg.channel.fetchMessage(argStr)
        .then(message => message.clearReactions());
};

cmdFuncts.shutDown = function (msg, cmdStr, argStr, props)
{
    bot.user.setStatus("invisible");
    msg.channel.send(getArrayRandom(props.phrases).value, {tts: (ttsActive === true)});
    console.log("Shutting down");

    bot.setTimeout(function ()
    {
        process.exit(1);
    }, 1000);
};


let cleanupTrigger = "🇶";
let cleanupEmojis = new Array(0);

cmdFuncts.setCleanupTrigger = function (msg, cmdStr, argStr, props)
{
    let cleanupTrigger = argStr.trim();
    sendMsg(msg.channel, "[Authorized users may now add " + cleanupTrigger + " to a message to remove all of that message's reactions.]");
};


function clearReactsUpTo(msg, argList)
{
    let msgId = argList[0];
    argList.shift();
    let debugString = "EMOJI NAME LIST: ";

    for (i = 0; i < argList.length; i++)
    {
        argList[i] = argList[i].replace(/\/:/g, "");
        debugString += argList[i] + ","
    }

    debugString += "; " + argList.length.toString() + " total";
    console.log(debugString);

    let messageCounter = 0;
    let matchedMessageCount = 0;
    let matchedReactionsCount = 0;

    msg.channel.fetchMessages({before: msgId, limit: 100})
        .then((messages) =>
        {
            let messageArr = messages.array();
            for (i = 0; i < messageArr.length; i++)
            {
                let message = messageArr[i];
                console.log("MESSAGE: " + message.content);
                messageCounter++;
                let matchCounter = 0;
                let reactionArray = message.reactions.array();
                for (i2 = 0; i2 < reactionArray.length; i2++)
                {
                    let reaction = reactionArray[i2];
                    console.log("REACTION FOUND: name=" + reaction.emoji.name + ", tostring=" + reaction.emoji.toString());
                    if (argList.includes(reaction.emoji.name))
                    {
                        console.log("REACTION MATCH");
                        matchCounter++;
                        matchedReactionsCount++;
                    }
                }
                if (matchCounter === argList.length)
                {
                    console.log("ALL MATCHED");
                    message.clearReactions();
                    lastReactClearedId = message.id;
                    if (i % 10 === 0 || i === messageArr.length - 1)
                    {
                        serverdata.lastReactClearedId = lastReactClearedId;
                        updateJson(serverdata, 'serverdata')
                    }
                    matchedMessageCount++
                }
            }
            sendMsg(msg.channel, "[" + messageCounter.toString() + " messages scanned, " + matchedMessageCount.toString() + " were flagged as matches, " + matchedReactionsCount.toString() + " total reaction matches.]");

        })
        .catch(err =>
        {
            console.error(err);
        });
}


cmdFuncts.cleanupReactions = function (msg, cmdStr, argStr, props)
{
    let argList = argStr.split(" ");
    let mainArg = argList[0];
    argList.shift();

    switch (mainArg)
    {
        case "idlist":
            for (i = 0; i < argList.length; i++)
            {
                let id = argList[i];
                console.log("ATTEMPTING TO CLEAR MESSAGE " + id);
                clearReactionsInMessage(msg, id);
            }
            break;

        case "upto":
            clearReactsUpTo(msg, argList);
            break;

        case "resume":
            argList.unshift(serverdata.lastReactClearedId);
            clearReactsUpTo(msg, argList);
            break;
    }

};


cmdFuncts.updateAndRestart = function (msg, cmdStr, argStr, props)
{
    console.log("Pulling a git");
    exec('git', ["pull", "origin", "master"], function (err, data)
    {
        if (err == null)
        {
            sendMsg(msg.channel, "git pull origin master\n```\n" + data.toString() + "\n```\n");

            bot.user.setStatus("invisible");
            sendMsg(msg.channel, getResponse("exit"));
            console.log("Shutting down");

            bot.setTimeout(function ()
            {
                process.exit(1);
            }, 1000);
        }
        else
        {
            sendMsg(msg.channel, "ERROR of git pull origin master```\n" + err + "\n\n" + data.toString() + "\n```\n");
            exec('git', ["merge", "--abort"], function (err, data)
            {
            });
        }
    });
};


cmdFuncts.reactionSpam = function (msg, cmdStr, argStr, props)
{
    let numReacts = 3 + Math.floor(Math.random() * 5);
    for (i = 0; i < numReacts; i++)
    {
        let emoteStr = "";
        let emoteCategory = "threat";
        if (Math.random() > 0.5)
            emoteCategory = "brag";

        console.log("emote category: " + emoteCategory);
        reactFromArray(msg, emoteReacts[emoteCategory]);
    }
};

cmdFuncts.setGame = function (msg, cmdStr, argStr, props)
{
    bot.user.setActivity(argStr);
};

cmdFuncts.revealSay = function (msg, cmdStr, argStr, props)
{
    if (sayMember.length > 0)
    {
        let authorUser = sayUser[0];
        let authorMember = sayMember[0];
        let authorStr = authorUser.username + " (A.K.A. " + authorMember.displayName + ")";
        let contentStr = sayMessage[0];
        sendMsg(msg.channel, "```[" + authorStr + " made me say:\n" + contentStr + "]```");
    }
    else
        sendMsg(msg.channel, "```[No say commands since I last logged in.]```");
};

cmdFuncts.forceSay = function (msg, cmdStr, argStr, props)
{
    // Get substring to say
    let setStr = argStr;

    // Replace phrase tags with the corresponding phrase
    setStr = setStr.replace(/\^[^\^]*\^/gi, function myFunction(x)
    {
        let noCarrots = x.substring(1, x.length - 1);
        return getResponse(noCarrots);
    });

    sayMember.splice(0, 0, msg.member);
    sayUser.splice(0, 0, msg.member.user);
    sayMessage.splice(0, 0, setStr);
    msg.delete(0);

    sendMsg(msg.channel, setStr)
};

cmdFuncts.toggleChannel = function (msg, cmdStr, argStr, props)
{
    let setStr = argStr;
    let chan = getChannelByName(msg.guild, setStr);
    if (chan)
    {
        if (isChannelAllowed(chan))
        {
            sendMsg(msg.channel, "[Posting in #" + setStr + " disabled]");
            setChannelAllowed(chan, false);
        }
        else
        {
            sendMsg(msg.channel, "[Posting in #" + setStr + " enabled]");
            setChannelAllowed(chan, true);
            sendMsg(chan, getResponse("enter"));
        }
        updateJson(serverdata, 'serverdata');
    }
    else
    {
        console.log("Attempting to toggle posting in nonexistent channel.");
        sendMsg({
            channel: msg.channel,
            msg: "Why do you think I'm a fool? I can see that this channel isn't exists!"
        });
    }
};

cmdFuncts.toggleDelCmd = function (msg, cmdStr, argStr, props)
{
    if (deleteAll === false)
    {
        deleteAll = true;
        sendMsg(msg.channel, "[Deleting all commands enabled]")
    }
    else
    {
        deleteAll = false;
        sendMsg(msg.channel, "[Deleting all commands disabled]")
    }
};


cmdFuncts.setAvatar = function (msg, cmdStr, argStr, props)
{
    let newAvatar = getArrayRandom(props.phrases).value;
    bot.user.setAvatar(newAvatar);
    sendMsg(msg.channel, "`[Avatar changed to `<" + newAvatar + ">`]`");
};

cmdFuncts.callHelp = function (msg, cmdStr, argStr, props)
{

    let newEmbed = {"color": 16733525, "fields": []};
    let sendHelp = false;

    // Show a specific command's help post
    if (argStr !== "")
    {
        let newProps = commands[argStr];
        let deny = true;

        if (newProps != null)
        {
            let authStr = newProps.auth;
            if (authStr == null)
                authStr = "everyone";

            if (newProps.info != null)
            {
                newEmbed["fields"] = [{
                    name: "Command info: " + argStr,
                    value: "\nAuthorization group: " + authStr + "\n" + newProps.info
                }];
                sendHelp = true;
                deny = false
            }
        }

        if (deny)
            cmdFuncts.sendResponse(msg, "nocmd", "", commands["nocmd"])
    }

    // Show the general help post
    else
    {
        newEmbed["fields"] = [{
            name: "Echidnabot help",
            value: "To perform a command, prefix it with `/knux ` (for example, `/knux jam`)\n\nTo get info on a command, prefix it with `/knux help ` (type just `/knux help` to display this post.)\n\nCrossed-out commands are currently broken."
        }];

        for (let item in helpCategories)
        {
            let listStr = "";
            for (let item2 in helpCategories[item])
            {
                if (listStr !== "")
                    listStr = listStr + ", ";

                let cmdStr = helpCategories[item][item2];
                let functName = commands[cmdStr]["function"];
                if (functName == null)
                    functName = "sendResponse";

                if (cmdFuncts[functName] == null)
                    listStr = listStr + "~~`" + cmdStr + "`~~";
                else
                    listStr = listStr + "`" + cmdStr + "`"
            }
            newEmbed["fields"].push({name: item + " commands:", value: listStr});
            sendHelp = true
        }
    }

    if (sendHelp)
        msg.channel.send({embed: newEmbed});
};

/*
bot.on("raw", async event => {
	if (event.t !== 'MESSAGE_REACTION_ADD') return;

	const { d: data } = event;
	const channel = bot.channels.get(data.channel_id);

	if (channel.messages.has(data.message_id)) return;

	const user = bot.users.get(data.user_id);
	const message = await channel.fetchMessage(data.message_id);

	const emojiKey = (data.emoji.id) ? `${data.emoji.name}:${data.emoji.id}` : data.emoji.name;
	const reaction = message.reactions.get(emojiKey);

	bot.emit('messageReactionAdd', reaction, user);
});
*/

bot.on("messageReactionAdd", (reactionRef, userRef) =>
{
    if (userRef !== bot.user)
    {
        // Get guild member of the person who reacted
        let gMembers = reactionRef.message.guild.members;
        let member;
        let message = reactionRef.message;
        for (let m in gMembers)
        {
            let mUser = m.user;
            if (mUser === userRef)
            {
                member = m;
                break;
            }
        }

        // Check for authorization
        let authorized = ((ownerId.indexOf(userRef.id) !== -1) || member.roles.has(modRoleId));
        let authordata = userdata[userRef.id.toString()];
        if (authordata != null)
        {
            if (authordata["authorized"] === true)
                authorized = true
        }

        let usernameStr = userRef.username;
        if (authorized)
            usernameStr = "AUTHORIZED USER " + userRef.username;

        console.log("REACTION ADDED BY " + usernameStr + ": " + reactionRef.emoji.toString() + ", " + reactionRef.emoji.id + ", " + reactionRef.emoji.identifier + ", " + reactionRef.emoji.name);

        if (reactionRef.emoji.toString() === cleanupTrigger)
        {
            console.log("Matches cleanup trigger");
            if (authorized)
            {
                console.log("Cleanup triggered by authorized user");
                // Start comparing emojis
                /*
                let message = reactionRef.message
                let matchCounter = 0
                for (let reaction in message.reactions)
                {
                    if  (cleanupEmojis.includes(reaction.emoji.name))
                    {
                        matchCounter++;
                    }
                }
                if  (matchCounter == cleanupEmojis.length)
                {
                    message.reactions.deleteAll();
                }
                */
                message.clearReactions();
                //message.reactions.deleteAll();
            }
        }
    }
});


bot.on("message", msg =>
{

    try
    {
        // Don't process own messages the same way as others'
        if (msg.author !== bot.user)
        {

            // Log the message
            if (msg.member != null)
                console.log(msg.member.displayName + " said: " + msg.cleanContent);
            else
                console.log("[unknown] said: " + msg.cleanContent);

            // Authority check
            let authorized = ((ownerId.indexOf(msg.author.id) !== -1) || msg.member.roles.has(modRoleId));
            let authordata = userdata[msg.author.id.toString()];
            if (authordata != null)
            {
                if (authordata["authorized"] === true)
                    authorized = true
            }


            // Temporarily brute-forcing old important commands
            if (msg.cleanContent.startsWith("/knux oldshutdown"))
            {
                if (authorized)
                {
                    bot.user.setStatus("invisible");
                    sendMsg(msg.channel, getResponse("exit"));
                    console.log("Shutting down");

                    bot.setTimeout(function ()
                    {
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
                    exec('git', ["pull", "origin", "master"], function (err, data)
                    {
                        if (err == null)
                            sendMsg(msg.channel, "git pull origin master\n```\n" + data.toString() + "\n```\n");
                        else
                        {
                            sendMsg(msg.channel, "ERROR of git pull origin master```\n" + err + "\n\n" + data.toString() + "\n```\n");
                            exec('git', ["merge", "--abort"], function (err, data)
                            {
                            });
                        }
                    });
                }
                else
                    sendMsg(msg.channel, getResponse("decline"));
            }



            // New direct commands
            else if (msg.cleanContent.startsWith("/knux "))
            {
                let cleanMsg = msg.cleanContent;
                let inputStr = cleanMsg.substr(6);

                let cmdStr = inputStr;
                let argStr = "";
                if (inputStr.indexOf(' ') !== -1)
                {
                    cmdStr = inputStr.substr(0, inputStr.indexOf(' '));
                    argStr = inputStr.substr(inputStr.indexOf(' ') + 1)
                }

                if (commands[cmdStr] != null)
                {
                    let props = commands[cmdStr];
                    let authLevel = props["auth"];
                    let matchesAuthLevel = true;
                    let functPtr = cmdFuncts["sendResponse"];
                    let functStr = "";

                    updateUserData(msg.author);

                    if (authLevel != null)
                    {
                        matchesAuthLevel = false;
                        let authTable = authorizeData[authLevel];
                        if (authTable == null)
                            authTable = modRoleId;

                        if (authTable.indexOf(msg.author.id) !== -1)
                            matchesAuthLevel = true
                    }

                    if (props["function"] != null)
                    {
                        functStr = props["function"];
                        functPtr = cmdFuncts[functStr]
                    }

                    if (matchesAuthLevel || authorized)
                    {
                        if (functPtr != null)
                            functPtr(msg, cmdStr, argStr, props);
                        else if (functStr !== "")
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
                        let nameStr = msg.cleanContent.substring(16);

                        // Check if a valid user was specified
                        let targetUser = null

                        let gMembers = msg.guild.members
                        for (let m in gMembers)
                        {
                            let mUser = m.user
                            let mUsername = m.user.username
                            if  (mUsername == nameStr)
                            {
                                sendMsg(msg.channel, "["+mUsername+" (A.K.A. "+m.displayName+") is now authorized to use mod commands]")
                                targetUser = mUser
                                break;
                            }
                        }

                        if  (targetUser != null)
                        {
                            let userKey = targetUser.id.toString()
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
                    let setStr = msg.cleanContent.substring(13);

                    if  (setStr != null)
                    {
                        let userKey = msg.author.id.toString()
                        if  (userdata[userKey] == null)
                            userdata[userKey] = {}
                        if  (userdata[userKey].submissions == null)
                            userdata[userKey].submissions = []
                        userdata[userKey].submissions.push(setStr)
                        updateJson(userdata, 'userdata')
                        msg.channel.send("[`"+setStr+"` added to "+msg.author.username+"'s list of submissions for my host to review.]");
                    }
                }

                if (msg.cleanContent.startsWith("/knux tts"))
                {
                    if  (ttsActive == false)
                    {
                        ttsActive = true;
                        msg.channel.send("/tts [Text to speech enabled]");
                    }
                    else
                    {
                        ttsActive = false;
                        msg.channel.send("[Text to speech disabled]");
                    }
                }

                else if (msg.cleanContent.startsWith("/knux regex"))
                {
                    if (authorized)
                    {
                        let setStr = msg.cleanContent.substring(12);
                        sendMsg(msg.channel, "Regular expression for "+setStr+": ```"+keywordRegex[setStr].toString()+"```")
                    }
                }

                else if (msg.cleanContent.startsWith("/knux setgame"))
                {
                    let setStr = msg.cleanContent.substring(14);
                    bot.user.setActivity(setStr);
                }

                else if (msg.cleanContent.startsWith("/knux react"))
                {
                    for (i = 0; i < 5; i++)
                    {
                        let emoteStr = "";
                        let emoteCategory = emoteReacts.threat;
                        if (Math.random() > 0.5)
                            emoteCategory = emoteReacts.brag;
                        reactFromArray(msg, emoteCategory);
                    }
                }


                else if (msg.cleanContent.startsWith("/knux say"))
                {
                    // Get substring to say
                    let setStr = msg.cleanContent.substring(10);

                    // Replace phrase tags with the corresponding phrase
                    setStr = setStr.replace(/\^[^\^]*\^/gi, function myFunction(x){
                            let noCarrots = x.substring(1,x.length-1);
                            return getResponse(noCarrots);
                        });

                    let thisChannel = msg.channel;
                    sayMember.splice(0, 0, msg.member);
                    sayUser.splice(0, 0, msg.member.user);
                    sayMessage.splice(0, 0, setStr);
                    msg.delete(0);

                    sendMsg(thisChannel, setStr)
                }

                else if (msg.cleanContent.startsWith("/knux ping"))
                {
                    let setStr = "Pong! `\n"+(Date.now() - msg.createdTimestamp + 37300).toString()+" ms`";
                    sendMsg(msg.channel, setStr)
                }

                else if (msg.cleanContent.startsWith("/knux reveal"))
                {
                    if  (sayMember.length > 0)
                    {
                        let authorUser = sayUser[0];
                        let authorMember = sayMember[0];
                        let authorStr = authorUser.username + " (A.K.A. " + authorMember.displayName + ")";
                        let contentStr = sayMessage[0];
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
                    let newAvatar = getResponse("avatar");
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
                            let myChannel = bot.channels.find('name', 'general');
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
                        let setStr = msg.cleanContent.substring(14);
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
                                let myChannel = bot.channels.find('name', setStr);
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
                    let setStr = ""
                    let cleanMsg = msg.cleanContent
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
                    let categoryStr = msg.cleanContent.substring(6)
                    if (responses[categoryStr] != null  &&  categoryStr != "exit")
                        sendMsg(msg.channel, getResponse(categoryStr));
                    else
                    {
                    sendMsg(msg.channel, getResponse("decline"));
                        console.log("Tried to call a category that doesn't exist");
                    }
                }
                */

                if (deleteAll === true && msg != null)
                    msg.delete(0);
            }


            else
            {
                // Don't respond to messages outside of permitted channels
                if (isChannelAllowed(msg.channel) !== true)
                    return;

                // Parse message
                let aboutMe = false;
                let messageStr = msg.cleanContent.toLowerCase();
                let words = msg.cleanContent.toLowerCase().split(" ");
                let detectedTypes = {};

                // Remove every /knux from the string
                messageStr = messageStr.replace(/\/knux/g, "");

                // Count matches
                for (let k in keywords)
                {
                    detectedTypes[k] = 0;

                    let matches = messageStr.match(keywordRegex[k]);
                    if (matches != null)
                    {
                        detectedTypes[k] = matches.length;
                        console.log("Matched category " + k + ": " + detectedTypes[k].toString())
                    }
                }

                // Special handling
                if (msg.cleanContent.endsWith("?"))
                    detectedTypes.about += 1;
                if (msg.cleanContent.endsWith("!"))
                {
                    if (detectedTypes.threat > detectedTypes.brag)
                        detectedTypes.threat += 1;
                    else
                        detectedTypes.brag += 1;
                }

                // Get highest values
                let highestNum = 1;
                let highestTied = new Array(0);
                let highestRandString = "";
                let logString = "Top sentiments: ";
                for (let k in detectedTypes)
                {
                    let val = detectedTypes[k];
                    if (val > highestNum) highestNum = val;
                }
                for (let k in detectedTypes)
                {
                    let val = detectedTypes[k];
                    if (val === highestNum && k !== "indirect" && k !== "bot")
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
                aboutMe = (msg.isMentioned(bot.user) === true || detectedTypes.bot > 0 || (prevAuthor === bot.user && detectedTypes.indirect > 0));

                // If at or about the bot...
                if (aboutMe)
                {
                    console.log("I think I'll respond to this message.");

                    // Initialize sentiment analysis vars
                    let tone = "neutral";  // neutral, insult, challenge, question, praise, request

                    // Either reply with an emoji reaction or response message

                    if (Math.random() > 0.5 && emoteReacts[highestRandString] != null)
                    {
                        let emoteCategory = emoteReacts[highestRandString];
                        console.log("emote category: " + highestRandString);
                        reactFromArray(msg, emoteCategory);
                    }
                    else
                        sendMsg(msg.channel, getResponse(highestRandString));
                }


                // If not about or directed at the bot
                else
                {
                    // React to precious keyword with gem
                    if (Math.random() > 0.8 && highestRandString !== "threat" && emoteReacts[highestRandString] != null)
                    {
                        let emoteCategory = emoteReacts[highestRandString];
                        console.log("emote category: " + highestRandString);
                        reactFromArray(msg, emoteCategory);
                    }

                    // Occasionally respond with "& Knuckles" anyway
                    andCount -= 1;
                    console.log("And count: " + andCount.toString());
                    if (andCount <= 0)
                    {
                        let timeSinceLastAnd = bot.uptime - lastAndTime;
                        if (timeSinceLastAnd > 1000 * 20)
                        {
                            lastAndTime = bot.uptime;
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
    catch (err)
    {
		// why did I ever think it was a good idea to have errors posted as messages in the same channel again
		
        //sendMsg(msg.channel, getResponse("error"));
        //msg.channel.send("```" + err + "```");
        console.log(err);
    }
});

bot.on('ready', () =>
{
    if (process.platform === 'linux')
    {
        notify.ready();
        const watchdogInterval = 2800;
        console.log('Initializing SystemD WatchDog with ' + watchdogInterval + ' millseconds internal ...');
        notify.startWatchdogMode(watchdogInterval);
    }

    bot.user.setStatus("online").catch(msgSendError);
    bot.user.setActivity("protecting the Master Emerald").catch(msgSendError);
    let myGuild = bot.guilds.get(startingGuildId);
    if(!myGuild)
    {
        let perms = 130112;
        let url = "https://discordapp.com/oauth2/authorize?client_id=" + bot.user.id + "&scope=bot&permissions=" + perms;
        console.log("I'm not at the server!!! INVITE ME PLEASE!!! (Then, restart)\n" + url);
        return;
    }

    let myChannel = myGuild.channels.get(startingChannelId);
    if(!myChannel)
    {
        console.log("I don't know this channel! IT'S NOSENSE!");
        return;
    }

    let sDataCA = serverdata[myChannel.guild.id] ? serverdata[myChannel.guild.id].channelsAllowed : undefined;
    if (!sDataCA || (Object.keys(sDataCA).length === 0 && sDataCA.constructor === Object))
        channelsAllowed = {[startingChannelId]: true};
    else
        channelsAllowed = sDataCA;

    updateServerData(myChannel.guild);

    let introString = getResponse("enter");
    if (introString != null && myChannel != null)
        myChannel.send(introString);

    buildHelpCategories();

    console.log('READY; ' + introString);
    console.log(' ');
});


bot.login(loginId).catch(msgSendError);

setInterval(function()
{
    if(global.gc)
    {
        global.gc();
    } else {
        console.log('Garbage collection unavailable.  Pass --expose-gc '
            + 'when launching node to enable forced garbage collection.');
    }
    console.log('Memory usage:', process.memoryUsage());
}, 1800000); //Every half of hour
