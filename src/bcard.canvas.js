/**
 * The main - low level layer, one that contains the logic that works with easelJS.
 * Connects the game with the canvas library/framework.
 *
 * @package BCard
 * @type {Object}
 */

//namespace
this.bcard = this.bcard||{};


(function() {

var canvas = function(options) {
  //this.initialize(options);
};
var p = canvas.prototype;

	// The actual <canvas> element as dom element
	p.canvas_dom = null;
    // The layers of the canvas, easelJS stages
	p.canvas_stages = {
	    back : null,
	    deck : null
	};

	//cards as easelJS elements
	p.canvas_deck_sprite = null;//instance of SpriteSheet
    p.canvas_suits = [IR,IN,RO,TR];//suits in sprite order
	p.canvas_deck = [A,2,3,4,5,6,7,8,9,10,J,Q,K];//order in sprite
	p.canvas_deck_sprite_data = {
		images : null,
		frames : {width:null,height:null},
		animations : {}
	};
	
	//back cards as canvas elements
	p.canvas_back_sprite = null;//instance of SpriteSheet
	p.canvas_back_sprite_data = {
        images : null,
        frames : {width:null,height:null},
        animations : {}
	};

    //can declare here more elements of the game like Player images, money etc
	
	//easel containers for each player
	p.canvas_players_containers = {};
	p.canvas_table_container = null;//down cards table

    /** Each element size is based on its parent and so on.
     * Change these according with number of players and cards in a container.
     * Overwrite this object in your game.
     **/
    p.canvas_ratios = {
        //containers % from stage = canvas size
        cont_p1_modifier :1.3, //current player container will be bigger
        cont_width       :0.30, //width of player container = % of stage width
        cont_height_width:0.7, //height = ratio * width

        //cards width % from its containers size
        card_player      :0.2, //width of player hard card
        card_bot         :0.35, //the other players cards
        card_table       :0.4, //table cards
        card_collected   :0.2//upside down cards, already collected
    };


    /** **********************************************************************************************************
	
	
				I N I T 			 O N E   T I M E
				
				
	*************************************************************************************************************/


    /**
     * Initialize the canvas, layers, cards and basic containers.
     * @param options
     * @example game.canvasInitialize({dom:document.getElementById('canvas_game')});
     */
	p.canvasInitialize  = function(options)
	{
		//init EASELJS canvas and
    	this.canvas_dom = options['dom'] || null;
    	
    	createjs.Ticker.addListener(this);//to call the this.tick function always

        //for each hardcoded layer we instantiate an easelJSStage()
    	for (var stage in this.canvas_stages)
    	{
    		this.canvas_stages[stage] = new createjs.Stage(this.canvas_dom);    		
    		this.canvas_stages[stage].name = stage;
            //we keep our own internal sizes, framework doesn't support them
            //we will use them to ratio/size all other elements
    		this.canvas_stages[stage].width = $(this.canvas_dom).width();
    		this.canvas_stages[stage].height = $(this.canvas_dom).height();
    	}
        //if disabled, the canvas will contain "shadows" after each animation
    	this.canvas_stages.back.autoClear = false;
        //we need mouse events on cards and containers
    	this.canvas_stages.deck.enableMouseOver(25);

        this.canvas_back_sprite_data.images = [options['cards_image']];
        this.canvas_back_sprite_data.images.frames.width = [options['cards_width']];
        this.canvas_back_sprite_data.images.frames.height = [options['cards_height']];

        this.canvas_back_sprite_data.images = [options['back_image']];
        this.canvas_back_sprite_data.images.frames.width = [options['back_width']];
        this.canvas_back_sprite_data.images.frames.height = [options['back_height']];

        //call other internal One time init functions
        this.canvasInitTableContainer();
    	this.canvasInitCards();
	};

	p.canvasInitTableContainer = function()
	{
        var c = new createjs.Container();
        this.canvas_table_container = c;
        c.name = "table";
        c.game = this; //shortcut of instance, need it on Mouse events

        this.canvas_stages.deck.addChild(c);//container in stage

        c.width = parseInt(c.getStage().width * 0.23);
        c.height = parseInt(c.getStage().height * 0.23);

        //make the drawing point in center, we can position it more easily
        c.regX = parseInt(c.width / 2);
        c.regY = parseInt(c.height / 2);

        c.x = parseInt(c.getStage().width / 2);
        c.y = parseInt(c.getStage().height * 0.45);//player container will be bigger, so table will be above center

        //put a hidden text that appears at mouse over
        c.text = new createjs.Text('Click to sort','12px "Trebuchet MS", Helvetica, sans-serif','#FFF');
        c.text.y = 0;
        c.text.visible = false;
        c.addChild(c.text);
	   
        //text for collected Press message
        c.text_coll = new createjs.Text('Auto collect in X seconds.','15px "Trebuchet MS", Helvetica, sans-serif','#FFF');
        c.text_coll.x = c.width / 2 - c.text_coll.getMeasuredWidth() / 2;//center horriz
        c.text_coll.y = 20;
        c.text_coll.visible = false;
        c.addChild(c.text_coll);

        //workaround for easelJS, in order to mouse events to work to an invisible container we need this
        c.fake = new createjs.Shape();
        c.addChild(c.fake);
        c.fake.hitArea = new createjs.Shape();
        c.fake.hitArea.graphics.beginFill("#000").drawRect(0, 0, c.width,c.height).endFill();
 		
        c.onMouseOver = function()
        {
            //display the text
            this.text.visible = true;
            if (this.getStage())
                this.getStage().update();

            return true;
        };
        c.onMouseOut = function()
        {
            this.text.visible = false;
            if (this.getStage())
                this.getStage().update();

            return true;
        };
        c.onClick = function()
        {
            if (this.game.animatorIsRunning())
            {
                return false;
            }

            this.game.canvasTableArrange();
            return true;
        };

        if (this.debug)
        {
            this.canvasDebugAddContainerBorder(this.canvas_table_container);
        }

        return this;
    };//end init table


    /**
     * Creates the cards as spriteSheet()
     * The sprite data options are already completed in the initialize method.
     */
	p.canvasInitCards = function()
	{
	
        //we need to prepare the canvas_deck_sprite first, to make the animations array
        this.canvas_deck_sprite_data.animations = {};
        var pos = 0;
        for (var suits_index in this.canas_suits)
            for (var card_index in this.canvas_deck)
            {
                var suit = this.suits[suits_index];
                var card = this.canvas_deck[card_index];

                this.canvas_deck_sprite_data.animations[suit + '_' + card] = pos;
                pos++;
            }

		//initialize the spriteSheets()
        this.canvas_deck_sprite = new createjs.SpriteSheet(this.canvas_deck_sprite_data);
        //back
        this.canvas_back_sprite = new createjs.SpriteSheet(this.canvas_back_sprite_data);

        return this;
	};
	
	
	
	
	
	
	
	/** **********************************************************************************************************
	
	
				I N I T 			 P E R    G  A M  E
				
				
	*************************************************************************************************************/
	
	
	/** 
		Creates and draws the card containers for each player 
	*/
	p.canvasInitContainers = function()
	{
        //remove previous created containers (from an old game ?)
        for (var old_i in this.canvas_players_containers)
        {
            this.canvas_players_containers[old_i].removeAllChildren();
        }

        this.canvas_players_containers = {};

        for (var i in this.data.players)
        {
            this.canvasCreatePlayerContainer(i);
        }
	};

	/** 
		Adds to the table another bot container and its childs 
	*/
	p.canvasCreatePlayerContainer = function(player_id)
	{

        var c = new createjs.Container();
        c.name = "player_" + player_id;
        this.canvas_players_containers[player_id] = c;
        this.canvas_stages.deck.addChild(c);//container in stage

        //some internal variables and pointers, that will help as along the way
        c.player_id = player_id;
        c.game = this;

        //the base properties
        c.width = parseInt(c.getStage().width * this.canvas_ratios['cont_width']);
        //special treatemant for current player
        if (this.data.my_id == player_id)
            c.width = parseInt(c.width * this.canvas_ratios.cont_p1_modifier);
        c.height = c.width * this.canvas_ratios['cont_height_width'];

        //to calculate the position easier, the drawing point is in its center
        c.regX = parseInt(c.width / 2);
        c.regY = parseInt(c.height / 2);

        //now the properties based on the player / seat
        var seat = this.canvasContainerGetTableSeat(player_id,c);
        c.x = seat.x;
        c.y = seat.y;
        c.rotation = seat.rotation;

        //array where we keep the cards from the hand
        c.cards = [];

        /** Create the collected cards container, from the table */
        c.collected = new createjs.Container();
        c.addChild(c.collected);
        c.collected.name = "bot_collected_" + player_id;
        c.collected.x = c.width * 0.55;
        c.collected.y = 0;
        c.collected.width  = c.width * 0.10;
        c.collected.height = c.width * 0.10;

        c.crown_container = new createjs.Container();
        c.addChild(c.crown_container);

        //the crown - is the first player at this contract ?
        c.crown = new createjs.BitmapAnimation(this.canvas_chip_sprite);
        c.crown.gotoAndStop('contract');
        c.crown.x = parseInt(c.width / 2 + this.canvas_chip_sprite_data.frames.width * 2);
        c.crown.y = 0;//this.canvas_chip_sprite_data.frames.height;
        c.crown.visible = false;
        c.crown.shadow = new createjs.Shadow('#000',5,5,10);
        c.crown_container.addChild(c.crown);

        //mini crown the current hand first player ?
        c.minicrown = new createjs.BitmapAnimation(this.canvas_chip_sprite);
        c.minicrown.gotoAndStop('hand');
        c.minicrown.x = parseInt(c.width / 2 + this.canvas_chip_sprite_data.frames.width);
        c.minicrown.y = 0;//this.canvas_chip_sprite_data.frames.height;
        c.minicrown.visible = false;
        c.minicrown.shadow = new createjs.Shadow('#000',5,5,10);
        c.crown_container.addChild(c.minicrown);

        //player name
        var name = new createjs.Text(this.data.players[player_id].name,'14px Georgia, serif','white');
        c.addChild(name);


        /** Mouse over actions */

        c.fake = new createjs.Shape();
        c.addChild(c.fake);
        c.fake.hitArea = new createjs.Shape();
        c.fake.hitArea.graphics.beginFill("#000").drawRect(0, 0, c.width,c.height).endFill();

        c.onMouseOver = function()
        {
            if (this.game.data.status != STATUS_WAIT_HAND)
                return false;

            return true;
        };

        c.onMouseOut = function()
        {

            return true;
        };

        if (this.debug)
        {
            this.canvasDebugAddContainerBorder(c);
            this.canvasDebugAddContainerBorder(c.collected);
        }

        return this;
	};
	
	/**
     * Calculates the seats on the table, based on the number of players.
     * We presume the table is always round and the player 1 is at the bottom (for UI perspective)
		@return object with specific properties (x,y,rotation) that must be applied onto containers
	*/
	p.canvasContainerGetTableSeat = function(player,c)
	{
		if (!player)
			return false;

        //default result
		var result = {
			x : 0,
			y : 0,
			rotation : 0
		};
		
		//we need some variables for formulas
		var w = c.getStage().width;
		var h = c.getStage().height;
		
		//make a circle, split it, find out the point
		var origin = new createjs.Point(parseInt(w/2),parseInt(h/2));
        //radius of the table as a circle
        var r = parseInt(Math.min(w, h) / 2);

        //we split the circle ..
        var no_players = Object.keys(this.players).length;
        var step = parseInt(360 / no_players);

        //player 1 has always the bottom seat = 180 degrees
        var angle = ((player - 1 ) * step + 180) % 360;//make sure 450 = 90

		result.x = parseInt(origin.x + r * Math.cos(angle));
		result.y = parseInt(origin.y + r * Math.sin(angle));
		result.rotation = parseInt(angle);

		return result;
	};
	
	
	/** **********************************************************************************************************
	
	
				S I Z E    R A T I O S 
				
				
	*************************************************************************************************************/


	/** 
		Set the size of cards within the card container 
	*/
	p.canvasGetCardWidthTable = function()
	{
		return parseInt(this.canvas_table_container.width * this.canvas_ratios.card_table);
	};
	

	/** 
		Sets how big the bots cards are 
	*/
	p.canvasGetCardWidthBot = function()
	{
		return parseInt(this.canvas_players_containers[2].width * this.canvas_ratios.card_bot);
	};
	
	p.canvasGetCardWidthBotCollected = function()
	{
		return parseInt(this.canvas_players_containers[2].width * this.canvas_ratios.card_collected);
	}
		
	/** 
		Sets the width of the cards from the players hand
	*/
	p.canvasGetCardWidthPlayer = function()
	{
		return parseInt(this.canvas_players_containers[1].width * this.canvas_ratios.card_player);
	};
	
	
	
	
	
	/** **********************************************************************************************************
	
	
				D R A W (PAINT)   C A R D S
				
				
	*************************************************************************************************************/
	
	

	/** 
		Draws my cards 
		Paints the player 1 hand cards.
	*/
	p.canvasDrawMyCards = function()
	{	
	    var point_x = this.canvasGetCardWidthPlayer(); //start to right corner going to left (0) 
    
		//we need my cards
		var array = [];
		var count = 0;
			for (var i in this.game.my_hand)
			{
				if (this.game.my_hand[i].disposed)
					continue;
				count++;
			}
		var c = this.canvas_players_containers[1];
		
		//no need to draw ? 
		if (count == c.cards.length)
		{
			var fast_draw = true;///Auto fast draw, the best option ever
		}
		else
		{
			//log('drawed my cards because ',count,'!=',this.canvas_players_containers[1].cards.length);
			var fast_draw = false;
		}
		
		
		if (fast_draw)
		{
			//if fast draw, we need to check if we really need to redraw
			//the only thing that can change is the availability / blocked status
			var need_to_draw = false;//we presume the best
			
			for (var i in this.game.my_hand)
			{
				var card_bitmap = c.getChildByName('player_card' + i);	
				
				//the card must exists but still..
				if (!card_bitmap)
				{
					//log('error in mycards fast draw checking blocked need');
					need_to_draw = true;
					break;
				}
				
				if (this.game.my_hand[i].blocked != card_bitmap.card_game.blocked)
				{
					need_to_draw = true;
				}
			}
			
			if (need_to_draw == false)
			{
				//log('skipped draw succesfully');
				return this;	
			}
		}
		
		//remove all already drawed stuff
		this.canvasClearContainers(1,fast_draw ? true : false);
		

	    //adjust the starting angle depeneding on the remaining cards
	    var angle = (-11 * Math.floor(count / 2)) - 22;
	    
		for (var i in this.game.my_hand)
		{
			var card_game = this.game.my_hand[i];
			
			if (card_game.disposed)
				continue;
			
			//create the card as bitmap
			var card_bitmap = this.canvasCreateCard(card_game.suit,card_game.card);
			card_bitmap.name = 'player_card'+i;
			card_bitmap.game = this;//game instance object needd in onclick
				
			card_bitmap = this.canvasApplyScaleCard(card_bitmap,this.canvasGetCardWidthPlayer(),false);
			card_bitmap.card_game = card_game;//keep internal card data
			
			//draw stuff	
			angle += 11;//angle increased to right
	        point_x -= Math.round(card_bitmap.width / count);//the registration point moves to left
	
	        //origin point, we hide the cards then with an animation bring them to front
	        card_bitmap.regX = 0;
	        card_bitmap.regY = 0;
	        card_bitmap.to_regX = point_x;
	        card_bitmap.to_regY = card_bitmap.height + 30;//registration point always outside of height

	        card_bitmap.to_rotation = angle;
	        //middle of card on center of container
	        card_bitmap.x = c.width/1.8 - point_x;
	        card_bitmap.y = c.height;
	
	
			//if the card cannot be hit/lay down
			if (card_game.blocked)
			{
				//var blurFilter = new createjs.AlphaMapFilter (1,0, 3);
				//var margins = blurFilter.getBounds();
				//card_bitmap.filters = [blurFilter];
				//card_bitmap.cache(margins.x,margins.y,card_bitmap.width+margins.width,card_bitmap.height+margins.height);
				var filter = new createjs.ColorFilter(0.4,0.4,0.4,1)
				card_bitmap.filters = [filter];
				//filter.adjustBrightness(-100);
				card_bitmap.cache(0,0,card_bitmap.width*2,card_bitmap.height*2)
			}
			
			
			//mouse over stuff
			card_bitmap.onMouseOver = function()
			{
				//dont do anything if animation is in motion
				//usually is a BUG - press a card, start moving it, the mouse remain still
				//but now is hovering the left card, so making the moving card invisible
				//if (this.parent.game && this.parent.game.animatorIsRunning())
				if (this.allow_hit == false)
					return false;
				
				//find my index in the parent, then get my big brother
				var index = this.parent.getChildIndex(this);
				
				if (typeof(this.parent.children[index+1]) != 'undefined')
				{
					this.big_brother = this.parent.children[index+1];
					this.big_brother.alpha = 0.3;
					this.shadow = new createjs.Shadow('#ffffff',-2,-2,5);
					if (this.getStage())
						this.getStage().update();
				}
			};
			card_bitmap.onMouseOut = function()
			{
				if (this.big_brother)
				{
					this.big_brother.alpha = 1;
					this.shadow = null;
					if(this.getStage())
						this.getStage().update();
				}
			};
			

	        c.addChild(card_bitmap);
	        c.cards.push(card_bitmap);
	        array.push(card_bitmap);
	        //log(card_bitmap);
	        
	        card_bitmap.onClick = this.onClickCard;
		}
        for (var i in array)
            {
               var tw = createjs.Tween.get(array[i], {loop:false,paused:true})
                                .wait(fast_draw ? 0 : 10)
                                .to({
                                    x: array[i].x,
                                    y: this.canvas_players_containers[1].height * 0.6,
                                    regX:array[i].to_regX,
                                    regY:array[i].to_regY,
                                    rotation:array[i].to_rotation,
                                    auto_start : fast_draw ? true : false
                                    },
                                 fast_draw ? 0 : 100,
                                 createjs.Ease.sineInOut);

                    this.animatorAdd(tw);
            }

		if (!fast_draw)
    		this.canvas_stages.deck.update(); 
    		
		return this;
	};
	
	
	/**
		Draw if necessary the bots cards, as backs
		
	*/
	p.canvasDrawBotsCards = function(force_full_hand)
	{
		/* force_full_hand 
			this flag covers a bug resulted in the application flow
			if the draw is done at shuffle, all the bots before the player at turn
			will draw its actual cards(7) and the animation Hit card will take another card
			so will be 6 cards left at those bots, resulting in a crash */
		
		//log('canvasDrawBotsCards');
		for (var p in this.game.players)
		{
			if (p == 1)
				continue;//player is special
				
			var count = force_full_hand ? 8 : this.game.players[p].cards;
			var c = this.canvas_players_containers[p];
			if (c.cards.length < count)
			{
				//log('c.cards.length',c.cards.length,count);
				//remove all previous cards, if any
				this.canvasClearContainers(p);

				//fresh empty list of cards
				c.cards = [];
				//log('draw ',count,'cards for bot ',p,'at size',this.canvasGetCardWidthBot());
				
				//this set how the cards are arranged on horizontal on bots
				//we need to center the cards in the container
				var overlaing_factor = 4.5; //how much of a card width the cards should overlap
				var card_x = (c.width / 2) - (this.canvasGetCardWidthBot() / overlaing_factor) * parseInt(count / 2);
				
				//now we add cards
				for (var i = 1;i<=count;i++)
				{
					//log('draw card ' + i + ' out of ' + count + ' for bot ' + p);
					var card_bitmap = this.canvasCreateBack();
					//log('card_bitmap',card_bitmap);
					card_bitmap.name = "bot_" + p + '_card_'+i;
					card_bitmap = this.canvasApplyScaleCard(card_bitmap,this.canvasGetCardWidthBot(),true); 
					
					card_bitmap.x = card_x;
					card_bitmap.y = c.height / 2;
					card_x += parseInt(card_bitmap.width / overlaing_factor);
					
					c.addChild(card_bitmap);
					c.cards.push(card_bitmap);
					c.getStage().update();
				}				
			}
		}//player for
		
		return this;
	};

    /**
     * Draw (paint) the cards from the table.
     */
	p.canvasDrawTableCards = function()
	{
		if (!this.game.table)
			return this;
		//log('canvasDrawTableCards');
		
		
		/** Here you can add exceptions for different game types*/
		//if (this.game.contract_current == CR)
		//{
		//	return this.canvasDrawTableCardsRentz();
		//}
		
		//we need to draw only if the number of cards already displayed are different from the game object count
		var count = Object.keys(this.game.table).length;
		
		var real_count = 0;
		for (var i in this.canvas_table_container.children)
		{
			//if (this.canvas_table_container.children[i] instanceof createjs.BitmapAnimation)
            if (this.canvas_table_container.children[i].is_card)
				real_count++;
		}
		
		if (count == real_count)
		{
			return this;//no need to redraw the cards, are there and healthy
		}
		
		this.canvasClearTable();
			
		//log('this.game.table',this.game.table);
		for (var i in this.game.table)
		{
			var card_game = this.game.table[i];
			
			//create the card as bitmap
			var card_bitmap = new createjs.BitmapAnimation(this.canvas_deck_sprite);
			card_bitmap.gotoAndStop(card_game.suit + '_' + card_game.card);
			card_bitmap.name = 'card_table_' + card_game.suit + '_' + card_game.card;
			//make to fit the container
			card_bitmap = this.canvasApplyScaleCard(card_bitmap,this.canvasGetCardWidthTable(),true);
			
			//randomize its position and angle
			card_bitmap.x = this.random(this.canvas_table_container.width * 0.1, this.canvas_table_container.width * 0.9);
			card_bitmap.y = this.random(this.canvas_table_container.width * 0.1, this.canvas_table_container.width * 0.9);
			card_bitmap.rotation = this.random(-100,100);
			
			this.canvas_table_container.addChild(card_bitmap);
		}

    	this.canvas_stages.deck.update(); 
    	return this;
	};

	
	/** **********************************************************************************************************
	
	
				A N I M A T I O N S
				
				
	*************************************************************************************************************/
	
	
	
	/**
     * Animate a throwing card from the hand of a player to the table
     * @param  player number
     * @param card number The number of the card
     * //TODO join the animate throw player+bot functions
	 */
	p.canvasAnimateThrow = function(player,card)
	{
		//hide my card
		//log('canvasAnimateThrow');
		var found_card = null;
		for(var i in this.canvas_players_containers[player].children)
		{
			var children = this.canvas_players_containers[player].children[i];
			if (children.name == 'player_card'+card)
			{
				found_card = children;
				//this.canvas_players_containers[player].removeChild(children);
				break;//we found the card
			}
		}
		if (found_card == null)
		{
			//log('error : canvasAnimateThrow card not found');
			return this;
		}
		//throw the card
		this.canvasAnimateCardToContainer(found_card,this.canvas_table_container,this.canvasGetCardWidthTable());

        return this;
	};

	/** Animate a throwing card from the hand to the table  card = false = bots first card
     * Transforms the card as a back to a real card, then animate down.
     * @param player number Number of player
     * @param suit number What type of card will become
     * @param card number What number card will be
     * //TODO join the animate throw player+bot functions
	 */
	p.canvasAnimateThrowBot = function(player,suit,card)
	{
		//log('canvasAnimateThrowBot',player);
		//take its last card
		
		var cc = this.canvas_players_containers[player].children;
		//log('cc kids before ',cc.length);
		for(var i = cc.length; i > 1; i-- )
			if (cc[i] instanceof createjs.BitmapAnimation)
			{
				var found_card = cc[i];
				this.canvas_players_containers[player].removeChildAt(i);
				break;
			}
		//log('cc kids between',cc.length);
		
		if (found_card == undefined)
		{
			//log('error canvasAnimateThrowBot but bot is empty');
			return false;
		}

		//transform from a BACK to the actual card
		found_card = this.canvasCardTransformToCard(found_card,suit,card);
		
		//add it back to container, so the animate can work
		this.canvas_players_containers[player].addChild(found_card);
		//log('cc kids after',cc.length);
		//throw the card
		this.canvasAnimateCardToContainer(found_card,this.canvas_table_container,this.canvasGetCardWidthTable());
	};
	

	
	/**
     * Collect all the table cards and put them to the player container
	*/
	p.canvasAnimateCollectCards = function(player_id)
	{
		//log('canvasAnimateCollectCards',player_id);
		var txt = this.canvas_table_container.text_coll;
        //TODO move the text outside
		txt.text = 'Auto collect in ' + (this.options.long_autocollect ? 5 : 2) 
					+ ' seconds (to ' + this.game.players[player_id].name + ')';
		txt.x = txt.parent.width / 2 - txt.getMeasuredWidth() / 2;				
		txt.visible = true;
		this.canvas_table_container.getStage().update();
		
		var to_c = this.canvas_players_containers[player_id].collected;
		//log('collecting for player '+player_id,this.canvas_table_container.children);
		for(var i in this.canvas_table_container.children)
		{
			var card_bitmap = this.canvas_table_container.children[i];
			if (card_bitmap instanceof createjs.BitmapAnimation)
			{
				card_bitmap.ignore_disable_animation = true;
				this.canvasAnimateCardToContainer(card_bitmap,to_c,this.canvasGetCardWidthBotCollected()
										,800,false,true,(this.options.long_autocollect ? 5 : 2) * 1000);
			}
		}
	};


	/**
     * Creates 8 x players back cards, shuffle them to player containers.
     * Then deletes all the cards as bitmaps and call the draw functions.
	*/
	p.canvasShuffle = function()
	{
		//log('started shuffle');
		
		//trick, we need to start shuffling the cards from the TOP of the deck to bottom
		var cards_added = 0;
		
		var auto_start_delay = 500;
		var duration = 300;
		
		for(var i=0;i < 8;i++)		
		for(var j in this.canvas_players_containers)
		{
			var c = this.canvas_players_containers[j];

			var card_bitmap = this.canvasCreateBack();
			card_bitmap.name = "shuffle";
			this.canvas_table_container.addChildAt(card_bitmap,this.canvas_table_container.getNumChildren()-1-cards_added);
			cards_added++;
			
			card_bitmap = this.canvasApplyScaleCard(card_bitmap,this.canvasGetCardWidthTable(),true);
			
			//apply some cool effect to simulate a deck
			card_bitmap.x = this.canvas_table_container.width / 2 + i;
			card_bitmap.y = this.canvas_table_container.height / 2;
			
			//we keep the dimensions, because otherwise will ruin the estethics of the shuffling
						
			card_bitmap.getStage().update();
			
			//delay the animation
			auto_start_delay += 100;

			//we will put the card in the center of the container c			
			var center = c.localToLocal(
                        c.width / 2,
                        c.height / 2,this.canvas_table_container);
                        
	        var tw = createjs.Tween.get(card_bitmap, {loop:false,paused:false})
	        		.wait(auto_start_delay)
			        .to({
	                    x	:center.x + this.random(-c.width/5,c.width/5)
	                    ,y	:center.y + this.random(-c.height/5,c.height/5)
	                    ,rotation:(100) + this.random(-100,100)
	                    ,regX : card_bitmap.width/2
	                    ,regY : card_bitmap.height/2
	                    },
	                    duration,createjs.Ease.quartIn);

         	tw.name = 'shuffle';
			         
	        //add the animation to the big queue         
	        this.animatorAdd(tw);        
		}
		
		//now in order to shuffle to work, we need to add a fake regular tween that does NOTHING
		//just wait for the real shuffle to finish, this is because shuffle animations must auto start
        //ALL of them about in the same time, so the Animator doesn't know when all is done.
        //so instead of adding an exception we create a fake empty animation.
		this.animatorAdd(createjs.Tween.get({}).wait(500 + duration + ((duration-100) * cards_added)));
		
		return this;
	};





    /** **********************************************************************************************************


     A N I M A T I O N S     B A S E    F U N C T I O N S


     *************************************************************************************************************/



    /**
     Visual moves a card from a container to another
     */
    p.canvasAnimateCardToContainer = function (object, to_container, new_width, custom_time, dont_move, auto_start, auto_start_delay)
    {
        var center = to_container.localToLocal(
            to_container.width / 2,
            to_container.height / 2, object.parent);
        var scale = new_width / this.canvas_deck_sprite_data.frames.width;

        //disable any specific properties
        object.onClick = null;
        object.onmouseover = null;
        object.onmouseout = null;
        object.alpha = 1;
        object.shadow = null;

        //based in new scale, we need to recalculate the width and height

        object.width = this.canvas_deck_sprite_data.frames.width * scale;
        object.height = this.canvas_deck_sprite_data.frames.height * scale;

        object.regX = parseInt(object.width / 2);
        object.regY = parseInt(object.height / 2);
        object.getStage().update();

        //log('object.height/2',object.height,object.width);

        var tw = createjs.Tween.get(object, {loop:false, paused:true})
            .wait(auto_start_delay ? auto_start_delay : 0)
            .to({
                    x:center.x + rdm(-to_container.width / 3,
                                     to_container.width / 3), y:center.y + rdm(-to_container.height / 3,
                                                                               to_container.height / 3), rotation:(100) + rdm(-160,
                                                                                                                              160)
                    //put the center in center ..rotation is in the middle
                    //also the drawing point

                    , scaleX:scale, scaleY:scale
                },
                custom_time ? custom_time : 700, createjs.Ease.sineInOut);

        if (auto_start) {
            tw.auto_start = auto_start;
        }

        //if the flag isnt set, we actual move the card to the container
        if (!dont_move)
            tw.call(this.canvasAnimateCardToContainerAfter, [object, to_container]);

        //add the animation to the big queue
        this.animatorAdd(tw);
        //show the card,
        object.parent.getStage().update();

        return this;
    };

    /*
     After a moving animation, we must move the card as a JS object too
     */
    p.canvasAnimateCardToContainerAfter = function(object, to_container)
    {
        object.alpha = 1;

        //already moved ? speed animation do these things
        if (object.parent == null)
            return this;

        //we need the current drawing point
        var old_pt = new createjs.Point(object.x, object.y);
        //transform it from the old container points to the new one
        var new_pt = object.parent.localToLocal(
            old_pt.x,
            old_pt.y,
            to_container
        );

        //if it was a card, we must remove it from the parent cards internal array too
        if (object.parent.cards) {
            var index = object.parent.cards.indexOf(object);
            if (index != -1)
                object.parent.cards.splice(index, 1);
        }
        //move the obj
        object.parent.removeChild(object);

        //add to its new parent
        to_container.addChild(object);
        //from the user point of view, it never moved
        object.x = new_pt.x;
        object.y = new_pt.y;

        //update the stage
        if (to_container.getStage())
            to_container.getStage().update();

        return this;
    };



    /** **********************************************************************************************************
	
	
				G E N E R A L    F U N C T I O N S 
				
				
	*************************************************************************************************************/

	
	/** 
		Use to calculate and apply scale,width and regX properties
		Uses the original size of cards from the SPRITE
     @param object the card bitmap instance
     @param new_width Height will be calculated on the card sprite ratio
     @param set_draw_center Set the origin point int he middle of the card.
     @return Object The received object with the new properties.
	*/
	p.canvasApplyScaleCard = function(object,new_width,set_draw_center)
	{
		object.scaleY = object.scaleX = (new_width / this.canvas_deck_sprite_data.frames.width).toFixed(2);

		//calculate its real sizes, after scaling
		object.width = this.canvas_deck_sprite_data.frames.width * object.scaleX;
		object.height = this.canvas_deck_sprite_data.frames.height * object.scaleY;
		
		//make the drawing point at its middle
		if (set_draw_center)
		{
			object.regX = parseInt(object.width / 2);
			object.regY = parseInt(object.height / 2);
		}
		
		return object;
	};
	
	/**
     * Creates a back card instance of bitmap animation
     * @return createjs.BitmapAnimation
	*/
	p.canvasCreateBack = function()
	{
		var card_bitmap = new createjs.BitmapAnimation(this.canvas_back_sprite);
		card_bitmap.gotoAndStop('green');
		card_bitmap.name = "back";
        card_bitmap.is_card = true;
        card_bitmap.is_back = true;
		return card_bitmap;
	};

	/**
     * Creates a card bitmap instance
     * @param suit
     * @param card Number of cards (see constants.js for special cards)
     * @return createjs.BitmapAnimation
	*/
	p.canvasCreateCard = function(suit,card)
	{
		var card_bitmap = new createjs.BitmapAnimation(this.canvas_deck_sprite);
		card_bitmap.gotoAndStop(suit + '_' + card);
		card_bitmap.name = "card_" + suit + '_' + card;
		card_bitmap.suit = suit;
		card_bitmap.card = card;
        card_bitmap.is_card = true;
        card_bitmap.is_back = false;
		return card_bitmap;
	};
	
	/**
     * Transform a card, from a back to regular card. It keeps the transformations (properties)
     * @param card_bitmap the back card instance
     * @param suit
     * @param card
     * @return boolean || createjs.BitmapAnimation
	*/
	p.canvasCardTransformToCard = function(card_bitmap,suit,card)
	{
		if (typeof(card_bitmap) == 'undefined')
		{
			//log('error canvasCardTransformToCard called w/o a card wtf');
			return false;
		}
		
		//keep its properties that can change
		var trans = {
			width 	: card_bitmap.width ? card_bitmap.width : null,
			height 	: card_bitmap.height ? card_bitmap.height : null,
			scaleX 	: card_bitmap.scaleX,
			scaleY 	: card_bitmap.scaleY,
			x 		: card_bitmap.x,
			y 		: card_bitmap.y,
			regX	: card_bitmap.regX,
			regY	: card_bitmap.regY,
			name	: card_bitmap.name, //r u sure ?
			parent  : card_bitmap.parent
		};

		//make a new object
		card_bitmap = this.canvasCreateCard(suit,card);
		//apply the old properties
        for (var i in trans)
        {
            card_bitmap[i] = trans[i];
        }
		//thats it ?
		return card_bitmap;
	};
	
	
	/**
     * Used in debug mode, adds a border to a container
     * @param c The container must be instance of createjs.displayobject (or its derived classes) and have
      properties width and height
     * @return boolean
	*/
	p.canvasDebugAddContainerBorder = function(c)
	{
        if (!c.width || !c.height)
            return false;

		var debug = new createjs.Shape();
		c.addChild(debug);//add debug square inside the container

       debug.graphics
            .setStrokeStyle(1)
            .beginStroke('#000')
            .drawRect(0,0,c.width,c.height);

       return true;
	};

	
	//easeljs tick
	p.tick = function()
	{
		//redraw ? 
		this.canvas_stages.deck.update();
	};
	
	/**
     * Delete all cards from the player containers , including collected ones
     * @param only_one_player Number of player, or false for all
     * @param no_collect Leave the collected cards
     * @return this
	*/
	p.canvasClearContainers = function(only_one_player, no_collect)
	{
		//log('clear containers',only_one_player);
		for (var p in this.canvas_players_containers)
		{
			if (only_one_player && only_one_player != p)
				continue;
			
			var c = this.canvas_players_containers[p];
			for (var i=0;i<c.children.length;i++)
			{
				var child = c.children[i];
				//if (child instanceof createjs.BitmapAnimation)
                if (child.is_card)
				{
					c.removeChildAt(i);
					i--;
				}
			}
			
			//reset the inner array
			if (c.cards.length)
				c.cards = [];
			
			if (!no_collect)
                //remove all collected cards
                for (var i=0;i<c.collected.children.length;i++)
                {
                    var child = c.collected.children[i];
                    //if (child instanceof createjs.BitmapAnimation)
                    if (child.is_card)
                    {
                        c.collected.removeChildAt(i);
                        i--;
                    }
                }
			
			c.getStage().update();
		}
		return this;
	};
	
	
	/** 
		Arrange all player containers collected cards and flip them to backs
	*/
	p.canvasCollectedArrange = function(only_one_player)
	{
		this.canvas_table_container.text_coll.visible = false;
		this.canvas_table_container.getStage().update();
		
		//log('clear containers',only_one_player);
		for (var p in this.canvas_players_containers)
		{
			if (only_one_player && only_one_player != p)
				continue;
				
			var c = this.canvas_players_containers[p].collected;
			//clear the container and remember how many cards were there
			var count = this.game.contract_collected[p] * 8;
			
			if (count == 0)
				continue;//he is poor player, nothing to arrange
			
			//if we have just now collected cards, delete them
			c.removeAllChildren();
			
			var card_width = this.canvasGetCardWidthBotCollected();//p == this.game.my_id ? this.canvasGetCardWidthPlayer() : 
									
			for (var i = 0;i < count; i++)
			{
				var card_bitmap = this.canvasCreateBack();
				card_bitmap = this.canvasApplyScaleCard(card_bitmap,card_width,true);
				card_bitmap.name = 'collected_card_player_' + p;
				
				//center in container
				card_bitmap.x = parseInt(c.width / 2) + rdm(-3,3);
				card_bitmap.y = parseInt(c.height / 2) + rdm(-3,3);
				
				//randomize a bit in order to appreacite visually the number of cards
				card_bitmap.rotation = 90 + rdm(-20,20);
				
				c.addChild(card_bitmap);
			}
			
			
			c.getStage().update();
		}
		return this;
	};
	
	/**
		Delete all the cards from the table
	*/
	p.canvasClearTable = function()
	{
		//log('clear table');
		var c = this.canvas_table_container;

		//remove all collected cards
		for (var i=0;i<c.children.length;i++)		
		{
			var child = c.children[i];
            //if (child instanceof createjs.BitmapAnimation)
            if (child.is_card)
			{
				c.removeChildAt(i);
				i--;
			}
		}
		
		c.getStage().update();
		
		return this;
	};
	
	/** 
		Arrange the cards from the table beautiful
	*/
	p.canvasTableArrange = function()
	{
		//log('canvasTableArrange');
		var c = this.canvas_table_container;
		   	
   		//we can to sort them by suit and card
   		//c.sortChildren(this.sortCards); don't use this if your order counts !
		   	
   		var x = parseInt(c.width / 7);
   		var y = parseInt(c.height / 2);
		//order the cards from the table, just mess with the X and Y and rotation	
   		for (var i in c.children)
   		{
   			var child = c.children[i];
   			if (child.is_card)
   			{	//if we found a card
   				child.rotation = 0;
   				child.x = x;
   				child.y = y;
   				
   				child.regX = child.width / 2;
   				child.regY = child.height / 2;
   				
   				x += parseInt(c.width / 7);
   			}
   		}

		c.getStage().update();
   		return this;	
	};
	
	/**
		Used for a list of card bitmaps, based on their suit and number
	*/
	p.sortCards = function(a,b)
	{
		if (a.suit == b.suit)
		{
			switch (true)
			{
				case (a.card < b.card) : return -1;break;
				case (a.card > b.card) : return 1;break;
				default : return 0;break;
			}
		}
		else
		{
			switch (true)
			{
				case (a.suit < b.suit) : return -1;break;
				case (a.suit > b.suit) : return 1;break;
				default : return 0;break;
			}
		}
	};


    /** random inclusive 2 integer positive numbers */
    p.random = function(min, max)
    {
        return (Math.floor(Math.random() * max + 1) + min);
    };
	
	
//add it to namespace
bcard.canvas = canvas;
}());
