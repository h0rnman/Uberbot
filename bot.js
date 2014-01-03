// Node-specific requires:
var fs = require('fs');

var PlugAPI = require('./plugapi');
var CONFIG = require('./config.js');

var ROOM = CONFIG.room;
var UPDATECODE;
var COMMAND_PREFIX = CONFIG.commandPrefix;


// Create AI objects. These will be loaded later by buildAI() to help with AI reloading
var random_number_ai;
var bad_command_ai;

var hasVoted = false;
var currentDJ;
var PlugRoom = null;
var Suspend_Queue = null;

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
	  UPDATE_CODE = updateCode;
      } else {
        console.log(error);
      }
    });

	
	// Set up the bot
	var bot = new PlugAPI(auth, UPDATECODE);
	var RECONNECT = function() {bot.connect(ROOM);};
	buildAI();
	
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
		//console.log("Joined " + ROOM + ": ", data);
		console.log("Joined " + ROOM);
		console.log("There are currently " + data.room.population.toString() + " users in the room");
		console.log("Autowoot is " + CONFIG.autoWoot.toString());
		console.log("Self woot is " + CONFIG.selfProps.toString());
		staff=data.room.staff;
		currentDJ = data.room.currentDJ;
		PlugRoom = data;
		
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
    if ('emote' == data.type)
        console.log(data.from+data.message)
    else
        console.log(data.from+"> "+data.message)
	
	
	if ( isStaff(data.fromID) && (data.message.substring(0,COMMAND_PREFIX.length) == COMMAND_PREFIX) ) 
		{
			var cmdline = data.message.substring(COMMAND_PREFIX.length);
			var tokens = cmdline.split(" ");
			var command = tokens[0];
			var parameters = new Array();
			for (var i=1; i < tokens.length; i++)
				parameters.push(tokens[i]);
				
			
			switch (getCommandAlias(command))
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
						
							console.log("Roomscore: " + JSON.stringify(bot.getRoomScore()));
							console.log("Waitlist: " + JSON.stringify(bot.getWaitList()));
						
						}
					case 'reload':
						if (data.fromID == '50aeaedd3e083e18fa2d01be')
							canUseCommand(1,1);
						break;
					case 'suspend':
					//  TODO: Implement this
						break;
					case ' ':
					case '':
						break;
					default:
						// I implemented the logic for this in the external file as an exported function rather than a variable list. It was the best way to be able to parse the command word
						// to provide a more "intelligent" response.  It might be worthwhile to implement all AI responses in separate files, but it's more of a consistency issue than a
						// performance issue.
						var ai_text = bad_command_ai.phrase(command, parameters, data.from, data.fromID);
						bot.chat(ai_text);
						break;
				};
		}

	});
	
	bot.on('userJoin', function (data)	{
	
	if (data.username != 'Marvin-Uberbot')
		delayedMessage("Greetings, " + (CONFIG.pingGreeting ? "@" : "") + data.username + ".  Welcome to the FunHouse!", 5);
	
	});
	
	bot.on('djAdvance', function (data)	{
	
		hasVoted = false;
		if (data.currentDJ != undefined)	{
			currentDJ = data.currentDJ;
			bot.chat('/me ' + bot.getUser(data.currentDJ).username + " is now playing: " + data.media.title + " by " + data.media.author + ".");
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
	}
	
	function delayedMessage(message, delay)	{
	
	/*
		function delayedMessage
		@params:
			message: string
			delay: int
		@returns void
	*/
	
	// Thin wrapper function to save some typing since delayed messages are pretty common
	
		setTimeout( function() {bot.chat(message);}, delay * 1000);
	
	}
	
	
	function getRandomNumber(sides)	{
	
	/*
		function getRandomNumber
		@params:
			sides: int
		@returns string
	*/
	
	// TODO:  This could be better implemented to include handling for multiple parameters to designate the number of random selections
	// That said, I think that's something that could be put off indefinitely unless someone really has a hankering to implement.
	
	if (isNaN(parseInt(sides[0],10))) 	{
		var ai_text = random_number_ai.phrases[(Math.floor(Math.random() * random_number_ai.phrases.length) )];
		return ai_text;
	}
	else return (Math.floor((Math.random() * parseInt(sides[0],10)) + 1)).toString();
	
	}
	
	function isStaff(user) {
	
	/*
		function isStaff
		@params:
			user:  string
		@returns bool
	*/
	
	for (var key in staff)
		if (key == user) return true;
	
	}
	
	function getSecurityValue(user) {
	
	/*
		function getSecurityValue
		@params:
			user: string
		@returns string
	*/
	
		for (key in staff)
			if (user == key) return staff[key].toString();
	
	}
	
	function decode_security(value)	{
	
	/*
		function decode_security
		@params:
			value: int
		@returns string
	*/
	
		if ('4' == value) return "Host";
		if ('3' == value) return "Manager";
		if ('2' == value) return "Bouncer";
		if ('1' == value) return "Resident DJ";
		return "Unknown Staff Type";
	
	}
	
	function getCommandAlias(command)	{
	
	/*
		function getCommandAlias
		@params
			command: string
		@returns string
	*/
	
	var speak = new Array("speak","holla","talk","bark");
	var roll = new Array("roll","dice","random");
	var props = new Array("props","woot","upvote","dance","boogie");
	
	if (speak.indexOf(command) > -1) return "speak";
	else if (roll.indexOf(command) > -1) return "roll";
	else if (props.indexOf(command) > -1) return "props";
	else return command;
	
	}
	
	function canUseCommand(command, userid)	{
	
		//  map alias to allowed users
		console.log("Audience: " + JSON.stringify(bot.getAudience()));
		console.log("DJs: " + JSON.stringify(bot.getDJs()));
		console.log("Users: " + JSON.stringify(bot.getUsers()));
		console.log("Staff: " + JSON.stringify(bot.getStaff()));
	
	}
	
});