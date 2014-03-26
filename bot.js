// Node-specific requires and CONSTS:
var fs = require('fs');


//  Set up mail/SMS system
var nodeMailer = require("nodemailer");
var botMailer = nodeMailer.createTransport();
var providers = require("./extras/SMS/providers.js");
var SMSUsers = require("./extras/SMS/SMSUsers.js");

var Entities = require('html-entities').XmlEntities;
entities = new Entities();

// Bot-specific requires and CONSTS:
var PlugAPI = require('./plugapi');
var CONFIG = require('./config.js');

var ROOM = CONFIG.room;
var UPDATECODE = "h90"; //
var COMMAND_PREFIX = CONFIG.commandPrefix;


// Create AI objects. These will be loaded later by buildAI() to help with AI reloading
var random_number_ai = null;
var bad_command_ai = null;
var eightball_ai = null;
var props_aliases = null;
var roll_aliases = null;
var eightball_aliases;
var marvins_aliases = ['marvin','marv','marvey','marvey-baby'];
var ALLOWED_COMMANDS = ['8ball','roll','props','txtme'];

var hasVoted = false;
var currentDJ = null;
var PlugRoom = null;
var Suspend_Queue = null;
var numUsers = 0;

//  Do some fuckery with Twitter Auth strings to get the AuthCode AND the UPDATECODE.
//  Note that if UPDATECODE is wrong, the bot will stop talking to the room.
	
PlugAPI.getAuth({
    username: CONFIG.twitter_username,
    password: CONFIG.twitter_password
}, function(err, auth) { // if err is defined, an error occurred, most likely incorrect login
    if(err) {
        console.log("An error occurred: " + err);
        return;
    }
    
	PlugAPI.getUpdateCode(auth, ROOM, function(error, updateCode) {
      if(error === false) {
	  UPDATECODE = updateCode;
      } else {
        console.log(error);
      }
    });

	
	// Set up the bot
	UPDATECODE = "h90";	// Have to manually specify this for now due to plug changes.
	var bot = new PlugAPI(auth, UPDATECODE);
	var RECONNECT = function() {bot.connect(ROOM);};
	buildAI();
	
	var botIdentity = CONFIG.botIdentity;
	
	bot.on('close', RECONNECT);
	bot.on('error', RECONNECT);
	bot.multiLine = true;
	bot.multiLineLimit = 5;
	
	setInterval( function() {refreshConfig();}, CONFIG.refreshDelay * 1000);
	setInterval( function() {refreshAI();}, CONFIG.aiRefreshDelay * 1000);
	
	// Not sure if these will ever be useful, but they are arrays that will hold UserIDs of the different Moderator types
	var resident_djs = new Array();
	var bouncers = new Array();
	var managers = new Array();
	var hosts = new Array();
	
	// This object will be used to contain the entire STAFF list, including resident DJs
	var staff;
	
	// This connects to Plug AND joins the indicated ROOM, automagically triggering the roomJoin event
    bot.connect(ROOM);
	
    bot.on('roomJoin', function(data) {
        // data object has information on the room - list of users, song currently playing, etc.
		console.log("Joined " + ROOM + ": ", data);
		staff=data.room.staff;
		currentDJ = data.room.currentDJ;
		PlugRoom = data;
		numUsers = data.room.population;
		console.log("Joined " + ROOM + " with update code: " + UPDATECODE);
		console.log("There are currently " + numUsers.toString() + " users in the room");
		console.log("Autowoot is " + CONFIG.autoWoot.toString());
		console.log("Self woot is " + CONFIG.selfProps.toString());
		
		for (var key in staff)
			{
				switch (staff[key])	{
					case '1':
						resident_djs.push(key);
						break;
					case '2':
						bouncers.push(key);
						break;
					case '3':
						managers.push(key);
						break;
					case '4':
						hosts.push(key);
						break;
					default:
						break;
					}
			}

    });

	
	bot.on('chat', function(data) {
	
	if (data.from == 'Marvin-Uberbot') return;
	
    if ('emote' == data.type)
        console.log(data.from+data.message)
    else
        console.log(data.from+"> "+data.message)
		
	var messageObject = parseIncomingMessage(data.message, data.from, data.fromID);
	
	if (messageObject.valid)
		{

			var command = messageObject.command;
			var parameters = messageObject.tokens;

			console.log("command: " + command + " tokens: " + parameters.toString());
			
			switch (command)
				{
					case 'speak':
						bot.chat('Doge says woof');
						break;
					case 'sec':
						bot.chat(getSecurityValue(data.fromID));
						break;
					case 'dec':
						bot.chat( decode_security(getSecurityValue(data.fromID) ) );
						break;
					case 'roll':
						bot.chat( getRandomNumber(parameters));
						break;
					case 'props':	
						giveProps(data.fromID);
						break;
					case 'info':
						if (data.fromID == '50aeaedd3e083e18fa2d01be')	{
						
							console.log( (CONFIG.commandPrefix).toUpperCase());
						
						}
					case 'reload':
						if (data.fromID == '50aeaedd3e083e18fa2d01be')
							canUseCommand(1,1);
						break;
					case 'suspend':
					//  TODO: Implement this
						break;
					case 'help':
						getHelp(parameters);
						break;
					case '8ball':
						eightBall(command, parameters, data.from, data.fromID);
						break;
					case 'txtme':
						console.log(bot.room.media.cid);
						
						
						break;
					case ' ':
					case '':
						break;
					default:
						var ai_text = bad_command_ai.phrase(command, parameters, data.from, data.fromID);
						bot.chat(entities.decode(ai_text));
						break;
				};
		}

	});
	
	bot.on('userJoin', function (data)	{

	if (data.username != 'Marvin-Uberbot')	{
		
		var greeting = "Greetings, " + (CONFIG.pingGreeting ? "@" : "") + data.username + ".";
		
		if (CONFIG.greetWithWelcomeMessage)
			greeting += "  " + PlugRoom.room.description;
		else
			greeting += "  Welcome to the FunHouse!";
		
		delayedMessage(entities.decode(greeting), 5);
	}
	numUsers++;
	console.log("User: " + data.username + " joined the room.  Current user count: " + numUsers + ".");
	
	});
	
	bot.on('djAdvance', function (data)	{
	
		hasVoted = false;
		if (data.currentDJ != undefined)	{
			currentDJ = data.currentDJ;
			bot.chat(entities.decode('/me ' + bot.getUser(data.currentDJ).username + " is now playing: " + data.media.title + " by " + data.media.author + "."));
			console.log("Song: " + data.media.title + " by " + data.media.author);
			console.log("Title: " + data.media.title + "   id: " + data.media.cid + " format_ID: " + data.media.id);
			
			if (CONFIG.autoWoot)	{
				setTimeout( function() {bot.woot();}, CONFIG.autoWootDelay * 1000);
				hasVoted = true;
			}		
		}
	
	});
	
	
	bot.on('userUpdate', function(data)	{
	
		console.log("userUpdate: " + JSON.stringify(data));
		console.log("getUser: " + JSON.stringify(bot.getUser(data.id)));
	
	});
	
	bot.on('userLeave', function(data)	{

		numUsers--;
		console.log("User: " + data.id + " left the room.  Current user count: " + numUsers + ".");
	
	});
	
	function giveProps(userID)	{
	
	if (currentDJ == userID && !CONFIG.selfProps)
		{
			bot.chat("Sorry. Self-woot is currently disabed.");
			return;
		}
	
		if (!hasVoted)	{
			hasVoted = true;
			bot.woot();
			bot.chat("Fine. I'll vote.  It's not like the points mean anything.");
		}
		else	{
			bot.chat("If you were paying attention, you would see that I already voted.");
		}
		
	}
	
	function refreshConfig()	{
		console.log("Reloading config.js. Current refresh interval is: " + CONFIG.refreshDelay.toString() + " seconds.");
		delete require.cache[require.resolve('./config.js')]
		CONFIG = require('./config.js');
		
		COMMAND_PREFIX = CONFIG.commandPrefix;
	}
	
	function refreshAI()	{
		fs.readdir("./ai", function(err, files)	{
			if (files != 'undefined')	{
				for (var i in files)	{
					console.log("Reloading AI file: " + files[i] + ".  Current refresh interval is: " + CONFIG.aiRefreshDelay.toString() + " seconds.");
					delete require.cache[require.resolve('./ai/'+files[i])]
				}
				buildAI();
			}
		
		});
	}
	
	function buildAI()	{
		
		random_number_ai = require('./ai/randomnumber.js');
		bad_command_ai = require('./ai/unknowncommand.js');
		eightball_ai = require('./ai/8ball.js');
		props_aliases = require('./ai/propsaliases.js');
		roll_aliases = require('./ai/rollaliases.js');
		eightball_aliases = require('./ai/eightballaliases.js');
		
	}
	
	function delayedMessage(message, delay)	{
	
		setTimeout( function() {bot.chat(message);}, delay * 1000);
	
	}
	
	
	function getRandomNumber(sides)	{
	
	// TODO:  This could be better implemented to include handling for multiple parameters to designate the number of random selections
	// That said, I think that's something that could be put off indefinitely unless someone really has a hankering to implement.
	
	if (isNaN(parseInt(sides[0],10))) 	{
		var ai_text = random_number_ai.phrases[(Math.floor(Math.random() * random_number_ai.phrases.length) )];
		return ai_text;
	}
	else return (Math.floor((Math.random() * parseInt(sides[0],10)) + 1)).toString();
	
	}
	
	function isStaff(user) {
	
		for (var key in staff)
			if (key == user) return true;
			
		return false;
	
	}
	
	function getSecurityValue(user) {
	
		for (key in staff)
			if (user == key) return staff[key].toString();
		
		return "0";
	
	}
	
	function decode_security(value)	{
	
		if ('4' == value) return "Host";
		if ('3' == value) return "Manager";
		if ('2' == value) return "Bouncer";
		if ('1' == value) return "Resident DJ";
		return "Unknown Staff Type";
	
	}
	
	function getCommandAlias(command)	{
		
	var speak = new Array("speak","holla","talk","bark");
	
	if (speak.indexOf(command) > -1) return "speak";
	else if (roll_aliases.indexOf(command) > -1) return "roll";
	else if (props_aliases.indexOf(command) > -1) return "props";
	else if (eightball_aliases.indexOf(command) > -1) return "8ball";
	else return command;
	
	}
	
	function canUseCommand(command, userid)	{
	
		//  map alias to allowed users - right now this function serves no purpose
		console.log("Audience: " + JSON.stringify(bot.getAudience()));
		console.log("DJs: " + JSON.stringify(bot.getDJs()));
		console.log("Users: " + JSON.stringify(bot.getUsers()));
		console.log("Staff: " + JSON.stringify(bot.getStaff()));
	
	}
	
	function eightBall(command, parameters, from, fromID)	{
		
		var ai_text = eightball_ai.phrase(command, parameters, from, fromID);
		bot.chat(entities.decode(ai_text));
		
	}
	
	function parseIncomingMessage(message, from, fromID)	{

		var cmd;
		var tkns = new Array();
		var possibleCommand = false;
		var isCommand = false;
		var returnVal;

		
		message = message.replace(/[\.,\/#!$%\^&\*;:{}=_`~()?]/g,"");
		message = message.replace(/\s{2,}/g," ");
		
		var newmessage = message.split(" ");
		
		for (var aliases in marvins_aliases)	{
		
			for (var i = 0; i < newmessage.length; i++)	{
			
				if (marvins_aliases[aliases].toUpperCase() == newmessage[i].toUpperCase())	{
						possibleCommand = true;
				}
				
			}
			
		}
		
		if (!possibleCommand) 
			return returnVal = {valid : false, command : "", tokens : ""};
		
		
		for (var word = 0; word < newmessage.length; word++)	{
			
			var resolved_alias = getCommandAlias(newmessage[word]);
			
			if (ALLOWED_COMMANDS.indexOf(resolved_alias) > -1)	{
				cmd = resolved_alias;
				tkns = newmessage.slice(word + 1);
				isCommand = true;

			}
		}

		return returnVal = {valid : isCommand, command : cmd, tokens : tkns };
		
	}
	
	function getHelp(parameters)	{

		if (parameters.length == 0)
			bot.chat("The following commands are available:  woot, 8ball, roll.  Use " + COMMAND_PREFIX + "help <command> for aliases.");
		else
			{
			var prefix = "You can use the following aliases for " + parameters[0] + ": "
				switch (parameters[0])	{
					case "woot":
						bot.chat(prefix + props_aliases.toString());
						break;
					case "8ball":
						bot.chat(prefix + eightball_aliases.toString());
						break;
					case "roll":
						bot.chat(prefix + roll_aliases.toString());
						break;
			}
		}
	
	}
	
	function getSMSDestination(fromID)	{

		for (var i = 0; i < SMSUsers.length; i++)	{
			
			if (SMSUsers[i].user_id == fromID)
				return getSMSAddress(SMSUsers[i].provider).replace('%s',SMSUsers[i].number);
				
		}

	}

	function getSMSAddress(providername)	{

		for (var i = 0; i < providers.length; i++)	{
			if (providers[i].provider == providername)
				return providers[i].address;
		
		}

	}
	
	function sendSMS(recipient, message)	{
	
		var destination = getSMSDestination(recipient);
		var SMSMessage = {
			from: botIdentity,
			to: destination,
			text: message
		}
		
		botmailer.sendMail(SMSMessage, function (error, response)	{
		
			console.log("Sending SMS: " + JSON.stringify(SMSMessage));
			
			if (error)	{
				console.log(error);
				return;
			}
		
		});
	
	}
	
});