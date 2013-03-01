
//namespace
this.bcard = this.bcard||{};


/** ***************************************************************************************************************

	Abstract class, Handles the animations tweenjs flow.
	
	DRAFT Version !
	
	*/


(function() {
	
var animator = function(options) {
  //this.initialize(options);
};
var p = animator.prototype;

	//current list of animations, on progress
	p.animatorTimeline = [];
	
	//this callback is used in game, after ALL animations of actions are finished
	p.animatorLastCallback = '';
	
	/**
		Adds a new animation in the timeline, auto start if necessary.
		Tween must be paused at creation !
	*/
	p.animatorAdd = function(tween)
	{
		//skip recursive function by using a setTimeout('myAnimatior.animatorNext()');
		tween.call(this.animatorNext,[],this);
				
		//add the tween
		this.animatorTimeline.push(tween);
		
		//autostart ! , if empty start right away
		if (this.animatorTimeline.length == 1
			|| tween.auto_start === true)//or has the auto start flag
		{
			this.animatorNext();
			tween.setPaused(false);
		}
	}

	p.animatorNext = function()
	{
		if (typeof(this.animatorTimeline) == 'undefined'
			|| this.animatorTimeline == undefined)
			return false;		

		
		//log('animatorNext called');
		// and start the next one
		if (this.animatorTimeline && typeof(this.animatorTimeline[0]) != 'undefined')
		{
			var tween = this.animatorTimeline[0];
			
			//automatically remove the first tween,
			this.animatorTimeline.shift();
			
			//start the tween
			tween.setPaused(false);
			//keep the tween instance in the target object, for future references or manual control the tween
			tween.target.tween = tween;
			
			//skip animation all ? 
			if (this.options.animations == false && !tween.target.ignore_disable_animation)
			{
				//log('skip an',this.animatorTimeline[0].duration);
				tween.setPosition(tween.duration);
			}
		}
		else
		//after all tweens are over ..do the callback
		if (this.animatorLastCallback.length)
		{
			//log('called animatorLastCallback');
			var to_run = this.animatorLastCallback;
			this.animatorLastCallback = '';
			setTimeout(to_run,0);
		}
		
		//this.tick();
	}
	
	/** 
		Return true if any animation is in the queue or running
	*/
	p.animatorIsRunning = function()
	{
		var found = false;
		
		for(var i in createjs.Tween._tweens)
		{
			var tween = createjs.Tween._tweens;
			if (tween.duration > tween.position)
			{
				//log('found running animation',tween,tween.duration,tween.position)
				found = true;//at least an animation is runing
				break;
			}
		}
		
		
		return 0 != this.animatorTimeline.length || found == true;
	}


//add it to namespace
bcard.animator = animator;
}());

