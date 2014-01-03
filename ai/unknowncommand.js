exports.phrase = function(command, parameters, from, fromID)	{
	var result = Math.floor(Math.random() * 4) + 1;
	
	switch (result)	{
		case 1:
			return command.toString() + "?  Why don't YOU " + command.toString() + " and let me know how it goes?";
			break;
		case 2:
			return "Sorry.  I have no idea what you're talking about.  Perhaps it would help if you used real words.";
			break;
		case 3:
			return "Brain the size of a planet and you want me to " + command.toString() + "?";
			break;
		case 4:
			return "I don't know what you expect me to do, but I'm just going to ignore you.";
			break;
	}
	
}