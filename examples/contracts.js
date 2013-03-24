/** types of actions, must be same on server and client side */
var ACTION_CONTRACT = 0;
/** player choose a contract */
var ACTION_CARD = 1;
/** throw a card */
var ACTION_HAND = 2;
/** take a hand from table */
var ACTION_SHUFFLE = 3;
/** shuffle cards */
var ACTION_START = 4;
/** start game */
var ACTION_FINISH = 5;
/** finished game */


//namespace
this.bcard = this.bcard||{};



/** ***************************************************************************************************************

	Abstract class, used as the base for Mine/Farm/Adventure maps
	
	*/


(function() {
	
var game = function(options) {
  this.initialize(options);
};
var p = game.prototype;

	//cards as gameplay
	p.deck = [A,2,3,4,5,6,7,8,9,10,J,Q,K];
	p.suits = [IR,IN,RO,TR];//in ordinea din sprite
	
	p.dom_messages = null;
	p.debug = false;
	p.game = null;
	
	/** Constructor */
	p.initialize = function(options)
	{
		
    	this.canvasInitialize();
    
    	this.dom_messages = $('#messages');
    	if (options.user_settings)
    		this.changeOptions(options.user_settings,true);
	}
	
	/** ************************************************************************************
	
				G A M E   O P T I O N S 
				
	****************************************************************************************/

	p.options = {
		shuffle : true,
		auto_sort_table : true,
		animations : true,
		long_autocollect : true,
	}
	
	p.changeOptions = function(user_settings,dont_save)	
	{
		
		//get from external
		if (typeof(user_settings) == 'undefined')
		{
			var temp = $('#userSettings').serializeArray();
			var user_settings = {};
			//from [{name:shuffle,value:1}] TO {shuffle:1}
			for(var i in temp)
			{
				user_settings[temp[i].name] = (temp[i].value == '1' || temp[i].value == 1 ? true : false);
			}
		}
		//log('user_settings',user_settings);
		
		//save in current session
		for (var i in user_settings)
		{
			//log("his.options[i]",this.options[i]);
			//if the option exists, and is false
			if (typeof(this.options[i]) != 'undefined' && user_settings[i] != this.options[i])
			{
				this.options[i] = user_settings[i];
			}
			
		}		
		if (dont_save)
			return this;
			
		//auto save them in the account database
		Ajax.send(Actions.settings,{settings : JSON.stringify(this.options)});
		
		this.onClickHideOptions();
		
		return this;
	}
	
	p.onClickShowOptions = function()
	{
		for(var i in this.options)
		{
			//only changed it to false if needed
			if (this.options[i] == false)
				$('input[name="' + i + '"]:eq(1)').prop('checked',true);
		}
		
		$('#userOptions').show();
	}
	
	p.onClickHideOptions = function()
	{
		$('#userOptions').hide();
	}
	
	
	
	
	/** ************************************************************************************
	
				U S E R   I N T E R A C T I O N 
				
	****************************************************************************************/
	
	p.allow_hit = false;
	p.onClickCard = function()
	{
		//this is not the game, is the element clicked
		var game = this.game;
		
		if (game.allow_hit == false)
			return false;
			
		//get game data about the card
		var card = this.card_game;
		
		
		if (game.animatorIsRunning())
		{
			//log('error cannot accept new command, busy');
			return false;
		}
		if (game.game.status != STATUS_WAIT_HAND || 
				game.game.table_current_player != game.game.my_id)
		{
			return false;
		}
		
		//log('card clicked',card,'this',this);
		
		//if allowed to click
		if (card.disposed || card.blocked)
			return false;
		
		game.allow_hit = false;	
				
		//do the action
		game.animatorLastCallback = 'Ajax.send(Actions.card,{card : '+card.id+'},false,true);';
		
		if (game.options.auto_sort_table || game.game.contract_current == CR)
		{
			game.animatorLastCallback = game.animatorLastCallback + 'game.canvasTableArrange();' ;
		}
		
		game.canvasAnimateThrow(game.game.my_id,card.id);
					
	}
	
	p.onClickContract = function(contract)
	{
		//not it choosing mode ?
		if (this.game.status != STATUS_WAIT_CONTRACT || 
				this.game.table_current_player != this.game.my_id)
			return false;
		
		//if available (not played ?)
		if (this.game.contracts_left[1].indexOf(contract) == -1)
		{
			return false;
		}
		
		//do the action
		Ajax.send(Actions.card,{contract : contract});
		
		//refresh the current icons for my available contracts
		this.uiRefreshPlayerContracts();
		
		this.chooseContractHide();
	}
	
	
	
	/** ************************************************************************************
	
				D A T A   F R O M    S E R V E R
				
	****************************************************************************************/
	
	
	//data = the game from server side
	p.refresh = function(game)
	{
	
		this.game = game;
		
		//auto init some stuff
		this.canvasInitContainers();
		
		//if the bots have cards, and they are not drawed
		this.canvasDrawBotsCards();
		
		//if we have actions, means is not the init draw
		this.actions();
		
		//if we have special scores to show
		if (game.rentz_last_ranking && game.rentz_last_ranking.length)
		{
			
			var text = 'Last rentz rankings : '
			for (var i in game.rentz_last_ranking)
			{
				text += '<br />' + parseInt(parseInt(i) + 1) + '. ' + game.players[game.rentz_last_ranking[i]].name;
			}
			msg.ok(text);
		}
		
		if (game.game_winner)
		{
			if (game.game_winner == game.my_id)
				var text = 'Congratulations ! You won the game !';
			else
				var text = ('Sorry, ' + this.game.players[game.game_winner].name + ' won the game.<br />');
			
			var leader = [];
			
			for (var i in game.scores)
			{
				leader.push({player:i,score:game.scores[i]});
			}
			//sort them 
			leader.sort(function(x,y){return parseInt(y.score) - parseInt(x.score)});
			
			for (var i in leader)
			{
				text += '<br />' + (parseInt(i) + 1) + '. ' 
						+ game.players[leader[i].player].name 
						+ ' <b>' + leader[i].score + '</b> points' ;
			}
			
			msg.ok(text); 
		}
	}
	
	/** Process the list of actions from the game */
	p.actions_count = 0;
	p.actions = function(next)
	{
		if (this.game == false || this.game.actions.length == 0)
		{
			return this.waitAction();
		}
		
		this.actions_count++;
	//	while (this.game.actions.length)
	//	{
		var action = this.game.actions.shift();
		//log('actions found ',action);
		
		if (action == undefined)
			return false;
		
		//make sure after the animations, the flow returns here
		this.animatorLastCallback = 'game.actions();';
		
		//now do the action
		switch (action.type)
		{
			case ACTION_CARD : 
				
				//ignore if player hit
				if (action.player != this.game.my_id)
				{				
					
					//QUICK FIX BUG DISSAPEARING CARDS 
					//draw the bots cards
					this.canvasDrawBotsCards();
					//log('action card ',action.player);
					//transform the last back card from his hand to the actual card				
					//put down a bot card
					this.canvasAnimateThrowBot(action.player,action.result.suit,action.result.card);
					
					if (this.options.auto_sort_table || this.game.contract_current == CR)
					{
						this.animatorLastCallback = this.animatorLastCallback + 'game.canvasTableArrange();';
					}
		
					return true;	
				}	
				break;
			case ACTION_CONTRACT : 
			
				this.uiAddMessage('AUTO-SAVING ...');
				//clear all cards 
				this
					.canvasClearTable()
					.canvasClearContainers()
					.uiRefreshCurrentContract()
					.uiRefreshFirstPlayer()
					.uiRefreshScores();
				
				//we skip the animations ? 
				if (this.options.shuffle === false)
				{
					this.canvasDrawBotsCards(true)
						.canvasDrawMyCards()
						.canvasClearTable()
						.actions();
					return true;
				}
				
			
				//shuffle
				this.canvasShuffle();
				
				//after shuffle we need a special function to call in order to clear the shuffled cards
				//and draw them as normal, so we do a Tiganie
				this.animatorLastCallback = 
								 this.animatorLastCallback
								+ 'game.canvasClearTable();' 
								+ 'game.canvasDrawBotsCards(true);'
							 	+ 'game.canvasDrawMyCards();'
								;
								
				return true;
				break;
			case ACTION_FINISH : 
				//finish game !
				
				this.canvasClearContainers()
					.canvasClearTable()
					.uiRefreshPlayerContracts()
					.uiRefreshCurrentContract()
					.uiRefreshFirstPlayer()
					.uiRefreshScores();
				
				break;
			case ACTION_HAND : 
				
				//we need to arrange, to see who and what did where and how
				this.canvasTableArrange();
				this.canvasAnimateCollectCards(action.player);
				//update who is first
				this.uiRefreshFirstPlayer();
				//scores, every hand modifies it 
				this.uiRefreshScores();
				
				//make sure to flip the cards after the motion animation
				this.animatorLastCallback  = this.animatorLastCallback + 'game.canvasCollectedArrange();';
				return true;
				break;
				
			case ACTION_FINISHEARLY : 
				this.canvasClearContainers();
				this.canvasClearTable();
				this.uiAddMessage('Contract ended ealier.');
				
				
				//return true;
				break;
				
			case ACTION_RESETZERO : 
				this.uiAddMessage('Zero score reset: ' + this.game.players[action.player].name);
				//return true;
				break;
				
			///////////////////////// rentz special actions 		
			case ACTION_RENTZ_ACE : 
				this.uiAddMessage('Ace (double hit): ' + this.game.players[action.player].name);
				break;
			case ACTION_RENTZ_SEVEN : 
				this.uiAddMessage('Low card: ' + this.game.players[action.player].name 
							+ ' skip turn: ' + this.game.players[action.result].name);
				break;
			case ACTION_RENTZ_FINISHED : 
				this.uiAddMessage('Finished : ' + this.game.players[action.player].name);
				break;	
			case ACTION_RENTZ_SKIP : 
				this.uiAddMessage('Auto skip turn: ' + this.game.players[action.player].name);
				break;	
		}
		
		//default move to the next action
		//log('action skipeed !');
		this.actions();
		
	//	}
		return true;
	}
	
	
	p.waitAction = function()
	{
			
		//what are we doing now ? 
		//if (this.game.status == STATUS_WAIT_CONTRACT && 
		//		this.game.table_current_player == this.game.my_id)
		//{
		//	//WE must select a contract
		//	this.chooseContract();
		//	return true;
		//}
		//else
		//{
		//	this.chooseContractHide();
		//}
		
		
		//update the contrat and overall scores
		this.uiRefreshScores();
		
		//update who is first
		this.uiRefreshFirstPlayer();
		
		//show the current contract icon
		this.uiRefreshCurrentContract();
		
		//refresh the current icons for my available contracts
		this.uiRefreshPlayerContracts();
		
		if (!this.game)
			return false;
		
		
		
		//this one covers the first load of the page..
		if (this.actions_count == 0)
		{
			//we just started the game, refresh the page or whatever
			
			//draw the table cards, if no cards are flying trough the table
			if (this.animatorIsRunning() == false)
			{
				//log('draw table cards, wefinished');
				this.canvasDrawTableCards();
			}
			
			//draw the bots cards
			this.canvasDrawBotsCards();
			
				
		}
		
				
		
		if (this.game.status == STATUS_WAIT_HAND && 
				this.game.table_current_player == this.game.my_id)
		{
			//WE Must select a card !
			this.allow_hit = true;
			
			//draw my cards
			this.canvasDrawMyCards();
		
			if (this.options.auto_sort_table || this.game.contract_current == CR)
			{
				//this.animatorLastCallback = 'game.canvasTableArrange();' + this.animatorLastCallback;
				this.canvasTableArrange();
			}
		}
		else
		{
			this.allow_hit = false;
		}
	}
	
	//enter in choose contract mode
	p.chooseContract = function()
	{
		/*//hide all contracts
		$('.contract','#contracts').not('.none').addClass('none');
		
		//show the available ones and disable them
		for(var i in this.game.contracts_available)
		{
			$('#contract' + this.game.contracts_available[i]).removeClass('none').addClass('disabled');
		}
		
		//make clickable the NOT played ones
		for(var i in this.game.contracts_left[this.game.my_id])
		{
			$('#contract'+this.game.contracts_left[this.game.my_id][i]).removeClass('disabled');
		}
		
		
		$('#contracts').show();*/
		
		this.uiRefreshPlayerContracts(1);
		
	}
	p.chooseContractHide = function()
	{
		//$('#contracts').hide();
	}
	
	p.chooseCard = function()
	{
		this.canvasDrawMyCards();
	}
	
	p.chooseCardHide = function()
	{
		
	}
	
	
	/** ************************************************************************************
	
				N E W   G A M E  
				
	****************************************************************************************/
	
	p.onClickStart = function()
	{
		$('#startGame').show();		
	}
	
	p.startNew = function()
	{
		var players = parseInt($('input[name="startGamePlayers"]:checked').val());
		var contracts = parseInt($('input[name="startGameContracts"]:checked').val());
		var blind = parseInt($('input[name="startGameBlind"]:checked').val());
		var reset = parseInt($('input[name="startGameReset"]:checked').val());
		var seven = parseInt($('input[name="startGameSeven"]:checked').val());
		var ace = parseInt($('input[name="startGameAce"]:checked').val());
		
		if (players < 4 || players > 6)
		{
			msg.error('Wrong number of players.');
			return false;
		}
		if (contracts < 1 || contracts > 3)
		{
			msg.error('Wrong contracts.');
			return false;
		}
		
		var result = Ajax.send(Actions.start,{
			new_players : players,
			new_contracts : contracts,
			new_blind : blind,
			new_reset : reset,
			new_seven : seven,
			new_ace : ace
		},false,true);
		
		if (result === true)
		{
			$('#startGame').hide();	
		}
		else
		{
			//msg.error(result);
		}
	}
	
	
	/** ************************************************************************************
	
				Q U I T   G A M E 
				
	****************************************************************************************/
	
	p.onClickQuit = function()
	{
		Ajax.send(Actions.quit);
	}
	
	p.onClickSave = function()
	{
		if (Ajax.send(Actions.save,false,false,true))
			msg.ok('Game session saved in database.');
	}
	
	
	/** 
		Add a temporal message to the interface that its auto deleting
	*/
	p.uiAddMessage = function(text)
	{
		$('<div>'+text+'</div>')
			.prependTo(this.dom_messages)
			.show(100)
			.delay(3000 + (this.dom_messages.children().length * 700))//we must add time of lots of messages are on
			.hide(200)
			.queue(function(){
				$(this).stop(true,true).remove();
			});
	}
	

//add it to namespace
bcard.game = game;
}());

