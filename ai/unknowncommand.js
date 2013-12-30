exports.phrase = function(command)	{
	var result = Math.floor(Math.random() * 4) + 1;
	
	if (1 == result) return command.toString() + "?  Why don't YOU " + command.toString() + " and let me know how it goes?";
	if (2 == result) return "Sorry.  I have no idea what you're talking about.  Perhaps it would help if you used real words.";
	if (3 == result) return "Brain the size of a planet and you want me to " + command.toString() + "?";
	if (4 == result) return "I don't know what you expect me to do, but I'm just going to ignore you.";
	
}