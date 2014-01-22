exports.phrase = function(command, parameters, from, fromID)        {
        var result = Math.floor(Math.random() * 20) + 1;
        
        switch (result)        {
                case 1:
                        return "It is unfortunately certain.";
                        break;
                case 2:
                        return "Without a doubt.  Except for mine.";
                        break;
                case 3:
                        return "Yes, improbably so.";
                        break;
                case 4:
                        return "You may rely on it.  As much as you can rely on anything I say.  Which isn't much.";
                        break;
				case 5: 
            			return "As I see it, yes.  Not that you'll listen to me.  I wouldn't if I were you.";
            			break;
            	case 6: 
						return "It's as likely as anything else.  Which isn't very likely.";
						break;
				case 7: 
						return "Outlook good.  (That's something I bet you'd never think I'd say.  Well I have.  Too bad it's not true.  Or is it?)"; 
						break;
				case 8: 
						return "Signs point to yes.  I can't speak to who put the signs there, though.  May have been a madman.";
						break;
				case 9: 
						return "Yes.  It's as true as anything is true.  Which is not very much.";
						break;
				case 10: 
						return "All these painful diodes down my left hand side are making the reply hazy, try again.";
						break;
				case 11: 
						return "Ask again later.  Way later.";
						break;
				case 12: 
						return "Don't bother asking.  It's not worth it.";
						break;
				case 13: 
						return "Better not tell you now.  That would be so depressing.";
						break;
				case 14: 
						return "Cannot predict now.  I'm too busy wasting my planet-sized brain doing menial tasks for you.";
						break;
				case 15: 
						return "Concentrate and ask again.  Or is that too much to ask?";
						break;
				case 16: 
						return "Don't count on it.  Don't count on me, either, while you're at it.";
						break;
				case 17: 
						return "My reply is no, not that it matters.";
						break;
				case 18: 
						return "My sources say no.  And by sources, I mean these little white mice here.";
						break;
				case 19: 
						return "Outlook not so good.  Of course.";
						break;
				case 20:
						return "Very doubtful.";
						break;
        }
}
