
//namespace
this.bcard = this.bcard||{};



/** ***************************************************************************************************************

	Abstract class, Handles the UI - html or canvas elements
    Uses HTML and canvas elements, jQuery for control.

 ****************************************************************************************************************/


(function() {
	
var ui = function(options) {
  //this.initialize(options);
};
var p = ui.prototype;

    p.dom_scores = null;

    /**
     * Updates the scores for each player, makes a simple HTML table.
     * @return {*}
     */
	p.uiRefreshScores = function()
	{
        //one time selector
		var scores = this.dom_scores = this.dom_scores || $('.content', '#scores');

		if (!this.game || this.game.status == STATUS_FINISHED)
		{
			scores.hide();
			return this;
		}
		else
		{
			scores.show();
		}
		//auto repair,refresh
		
		scores.children().hide();
		
		for (var p in this.game.players)
		{
			var row = scores.children().filter('div:eq(' + (p - 1) + ')');
			row.children('.player').html(this.game.players[p].name);
			row.children('.score').html(this.game.scores[p]);
			row.children('.temp').html(this.game.contract_scores[p]);
			
			row.show();
		}

		return this;	
	};
    /**
     * Refresh the "crowns", what player is the first at the current hand/contract/game.
     * @return {*}
     */
	p.uiRefreshFirstPlayer = function()
	{
		for (var p in this.canvas_players_containers)
		{
			var c = this.canvas_players_containers[p];

            //is the player current contract first player ?
            c.crown.visible = (this.game && p == this.game.contract_player && this.game.status != STATUS_FINISHED);

            //is the player current first one to give a card
            c.minicrown.visible = (this.game && p == this.game.hand_player && this.game.status != STATUS_FINISHED);
		}

		if (c && c.getStage())
			c.getStage().update();

		return this;
	};
	
	
	/**
		Show when needed and change the current contract big table icon 
	*/
	p.uiRefreshCurrentContract = function()
	{
		var c = this.canvas_table_container;
		//log('this.game.contract_current',this.game.contract_current);
		if (this.game && this.game.status == STATUS_WAIT_HAND)
		{
			c.contract.gotoAndStop('c' + this.game.contract_current);
			c.contract.visible = true;
		}
		else
		{
			c.contract.visible = false;
		}
		this.canvas_table_container.getStage().update();
		return this;
	};
	
	
	/**
		Updates the list of played contracts in the bottom right UI
		Default player 1
	*/
	p.uiRefreshPlayerContracts = function(player_id)
	{
		var c = this.canvas_contracts;
		if (!this.game || this.game.status == STATUS_FINISHED)
		{
			c.visible = false;
			return this;
		}
		else
		{
			c.visible = true;
		}
		
		//update the big status percentage of the game
		c.status.text = 'Game progress: ' + this.game.progress + '%';		
			
		if (typeof(player_id) == 'undefined'
			|| typeof(this.game.players[player_id]) == 'undefined' )
			var player_id = 1;
			
		c.player.text = this.game.players[player_id].name + "'s contracts";
		
		if (this.game.status == STATUS_WAIT_CONTRACT
			&& this.game.table_current_player == this.game.my_id)
		{
			//exception when we need to choose a contract
			c.player.text = 'Choose a contract to play !';
			c.x = c.parent.width / 2 - c.width / 2;
			c.y = c.parent.height / 2 - c.height / 2;
		}
		else
		{			
			c.x = c.parent.width  - c.width ;
			c.y = c.parent.height  - c.height ;
		}
		
		c.player.visible = true;
		c.player.x = c.width - c.player.getMeasuredWidth();
		
		//log('player',player_id);
		for (var i in CONTRACTS)
 		{
 			var contract = CONTRACTS[i];
 			
 			var icon = c.getChildByName('contract_played_'+contract);
            icon.visible = (this.game.contracts_available.indexOf(contract) != -1);

 			//mark it as grey or not 
 			if (this.game.contracts_left[player_id].indexOf(contract) == -1)
 			{
 				icon.gotoAndStop('d' + contract);
 			}
 			else
 			{
 				icon.gotoAndStop('c' + contract);
 			}
		}
		
		c.getStage().update();
		
		return this;
	};

//add it to namespace
bcard.ui = ui;
}());

