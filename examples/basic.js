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
	p.suits = [IR,IN,RO,TR];//sprite order
	
	p.dom_messages = null;
	p.debug = false;
	p.game = null;
	
	/** Constructor */
	p.initialize = function(options)
	{
		
    	this.canvasInitialize(options);
    
    	this.dom_messages = $('#messages');
	};

    p.game = {
        players:
            {"1":{"name":"BeaT Adrian","cards":8},
            "2":{"name":"Mafalda","cards":8},
            "3":{"name":"Bella","cards":7},
            "4":{"name":"Casandra","cards":7}},
        table:[],
        table_current_player:1,
        my_hand:[
            {"card":9,"suit":0,"disposed":0,"blocked":0,"id":0},
            {"card":8,"suit":1,"disposed":0,"blocked":1,"id":1},
            {"card":10,"suit":1,"disposed":0,"blocked":0,"id":2},
            {"card":12,"suit":1,"disposed":0,"blocked":1,"id":3},
            {"card":15,"suit":1,"disposed":0,"blocked":1,"id":4},
            {"card":9,"suit":2,"disposed":0,"blocked":1,"id":5},
            {"card":10,"suit":2,"disposed":0,"blocked":0,"id":6},
            {"card":13,"suit":3,"disposed":0,"blocked":1,"id":7}],
        my_id:1,
        hand_player:3,
        status:5,
        progress:19,
        scores:{"1":0,"2":-520,"3":-120,"4":-80},
        game_winner:null,
        actions:[]
    };
	
	/** ************************************************************************************
	
				G A M E   O P T I O N S 
				
	****************************************************************************************/

	p.options = {
		shuffle : true,
		auto_sort_table : true,
		animations : true,
		long_autocollect : true
	};


	/** ************************************************************************************
	
				U S E R   I N T E R A C T I O N 
				
	****************************************************************************************/

    //when true allows the player to hit a card
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
				
		//do the action on server side (socket or ajax call)
		game.animatorLastCallback = '';//'Ajax.send(Actions.card,{card : '+card.id+'},false,true);';
		
		if (game.options.auto_sort_table)
		{
			game.animatorLastCallback = game.animatorLastCallback + 'game.canvasTableArrange();' ;
		}
		
		game.canvasAnimateThrow(game.game.my_id,card.id);
	};


//add it to namespace
bcard.game = game;
}());

