var MinerGame = MinerGame || {};

MinerGame.secrets = 0;
MinerGame.totalSecrets = 4;
MinerGame.startTime = MinerGame.startTime || 0;

// GAMEPLAY STATE //
MinerGame.playState = function(){};

MinerGame.playState.prototype = {
  create: function() {

    // play music
    if (MinerGame.level === '6' && !MinerGame.drillEnabled) {
      if (MinerGame.currentTrack)
        MinerGame.currentTrack.stop();
    } else if (!MinerGame.currentTrack) {
      MinerGame.currentTrack = this.game.add.audio('field1');
      MinerGame.currentTrack.volume -= .3;
      MinerGame.currentTrack.loopFull();
    }

    // init sfx
    this.playerDieSound = this.add.audio('player_die');
    this.playerDieSound.volume -= .7;
    this.portalSound = this.add.audio('start_game');
    this.portalSound.volume -= .6;
    this.secretSound = this.add.audio('secret');
    this.secretSound.volume -= .6;
    this.breakBlockSound = this.add.audio('dust');
    this.breakBlockSound.volume -= .3;
    this.springSound = this.add.audio('spring');
    this.springSound.volume -= .5;
    this.drillBurstSound = this.game.add.audio('drill-burst');
    this.drillBurstSound.volume -= .6;
    this.drillBurstSoundClock = 0;
    this.powerupSound = this.game.add.audio('powerup');
    this.powerupSound.volume -= 0.5;
    this.blipSound = this.game.add.audio('blip');
    this.blipSound.volume -= 0.5;

    // init the tile map
    this.map = this.game.add.tilemap(MinerGame.level);
    this.map.addTilesetImage('stageTiles', 'tiles');

    // create tilemap layers
    this.backgroundLayer = this.map.createLayer('backgroundLayer');
    this.stageLayer = this.map.createLayer('stageLayer');
    this.trapsLayer = this.map.createLayer('trapsLayer');
    this.fragileLayer = this.map.createLayer('fragileLayer');
    this.springLayer = this.map.createLayer('springLayer');
    this.drillLayer = this.map.createLayer('drillLayer');

    // set collisions on stageLayer, trapsLayer, fragileLayer and springLayer
    this.map.setCollisionBetween(1, 2000, true, 'stageLayer');
    this.map.setCollisionBetween(1, 2000, true, 'trapsLayer');
    this.map.setCollisionBetween(1, 2000, true, 'fragileLayer');
    this.map.setCollisionBetween(1, 2000, true, 'springLayer');
    this.map.setCollisionBetween(1, 2000, true, 'drillLayer');

    // resize game world to match layer dimensions
    this.backgroundLayer.resizeWorld();

    // create items on the stage
    this.createPowerups(); // powerups
    this.createPortal(); // end of level portal
    this.createSecrets(); // collectibles

    // actor/fx rendering layers
    this.game.layers = {
      player: this.game.add.group(),
      enemies: this.game.add.group(),
      effects: this.game.add.group(), // bullets and dust
      ui: this.game.add.group()
    };

    // create block dust effects
    this.blockDust = this.game.add.group();
    this.game.layers.effects.add(this.blockDust); // add to rendering layer
    var i;
    for (i = 0; i < 250; i++) {
      var dust = this.game.add.sprite(0, 0, 'block-dust');
      dust.animations.add('burst');
      dust.kill();
      this.blockDust.add(dust);
    }

    // create drill burst effects
    this.drillBurstGroup = this.game.add.group();
    this.game.layers.effects.add(this.drillBurstGroup);
    for (i = 0; i < 500; i++) {
      var burst = this.game.add.sprite(0, 0, 'drill-particle');
      this.game.physics.arcade.enable(burst);
      // scale up
      burst.scale.set(1.5);
      burst.lifespan = 200;
      burst.kill();
      this.drillBurstGroup.add(burst);
    }

    //create player
    var objects = this.findObjectsByType('playerStart', this.map, 'objectsLayer');
    this.player = new MinerGame.Player(this.game, objects[0].x, objects[0].y);

    //the camera will follow the player in the world
    this.game.camera.follow(this.player);

    // create floating lava particles
    // emitter is saved whenever the state is reloaded due to player death.
    if (MinerGame.lavaParticles) {
      this.game.add.existing(MinerGame.lavaParticles);
    } else {
      MinerGame.lavaParticles = this.game.add.emitter(this.game.world.centerX, this.game.height, 400);
    	MinerGame.lavaParticles.width = this.game.world.width;
    	MinerGame.lavaParticles.makeParticles('particle');
    	MinerGame.lavaParticles.minParticleScale = 0.1;
    	MinerGame.lavaParticles.maxParticleScale = 0.5;
    	MinerGame.lavaParticles.setYSpeed(-200, -125);
      MinerGame.lavaParticles.gravity = 0;
    	MinerGame.lavaParticles.setXSpeed(-5, 5);
    	MinerGame.lavaParticles.minRotation = 0;
    	MinerGame.lavaParticles.maxRotation = 0;
    	MinerGame.lavaParticles.start(false, 1000, 5, 0);
    }

    // make lava splash emitter (for player deaths)
    if (MinerGame.lavaSplash) {
      this.game.add.existing(MinerGame.lavaSplash);
    } else {
      MinerGame.lavaSplash = this.game.add.emitter(0, 0, 200);
      MinerGame.lavaSplash.makeParticles('particle');
      MinerGame.lavaSplash.minRotation = 0;
      MinerGame.lavaSplash.maxRotation = 0;
      MinerGame.lavaSplash.minParticleScale = 0.3;
      MinerGame.lavaSplash.maxParticleScale = 1.5;
      MinerGame.lavaSplash.setYSpeed(-280, -150);
      MinerGame.lavaSplash.gravity = 500;
    }

    // make the UI
    // levels
    this.levelText = this.game.add.bitmapText(this.game.world.centerX, 12, 'carrier_command', 'lv ' + MinerGame.level, 8);
    this.levelText.anchor.setTo(0.5, 0);
    // secrets %
    var percentage = Math.floor(MinerGame.secrets / MinerGame.totalSecrets * 100).toString() + '%';
    this.secretText = this.game.add.bitmapText(this.game.width - 12, 12, 'carrier_command', 'Crystals: ' + percentage, 8);
    this.secretText.anchor.x = 1;
    // timer
    var time = Math.floor(this.game.time.totalElapsedSeconds() - MinerGame.startTime);
    this.timerText = this.game.add.bitmapText(12, 12, 'carrier_command', 'time: ' + time, 8);
    this.timerText.anchor.setTo(0, 0);

    // tutorial text
    this.resetTutText();

    if (MinerGame.level === '1') {
      this.drawTutorialText(['WELCOME MINER!!!', 'I see that you are lost...', 'You *might* get out if you run\n\nwith the arrow keys and jump\n\nwith \'x\'.', 'There are many dangerous obstacles,\n\nas you can see.', 'But never fear!', 'You can avoid them\n\nby running and jumping!!1!', 'Try not to die...', 'You miserable yellow creature.', 'Ahem... good luck, miner.']);
    } else if (MinerGame.level === '2') {
      this.drawTutorialText(['Watch out for those brown blocks!', 'They\'re very crumbly...', 'Also, you can do a zig-zagging\n\nwall jump if you lean into the\n\nwall before you jump.', 'try it out, yellow human (?)']);
    } else if (MinerGame.level === '3') {
      this.drawTutorialText(['crystals!!1!*/!!', 'those are what you came here\n\nfor, correct, greedy biped?', 'try to collect as many as you can...', 'If you do, I\'ll give you a sugary treat\n\nat the end of our escapade :]', 'Humans love sugar!!!  (Right?)', '(I\'m still trying to figure\n\nout if you\'re human...)']);
    } else if (MinerGame.level === '4') {
      this.drawTutorialText(['Human-thing!!!', 'I never introduced myself!', 'How rude of me...', 'My name is A5IM0V-pr1m3.', 'The numbers in my name are\n\ncompletely arbitrary.', 'They are meant to convince\n\nyou that I\'m a robot.', 'in fact,', 'My whole name is\n\ncompletely arbitrary', 'However...', 'I\'ll have you know', 'that I was programmed to be\n\nthe nicest, most loving robot', 'in the universe.',  'And *that*, My friend,\n\nis *not* arbitrary', '<3 <3 <3 <3 <3']);
    } else if (MinerGame.level === '5') {
      this.drawTutorialText(['jump on those green things!',  'Normally I would tell\n\nyou what they do', 'but I don\'t want to spoil\n\nthe surprise this time.'])
    }
  },
  update: function() {
    // stage collisions
    this.game.physics.arcade.collide(this.player, this.stageLayer);
    // traps collisions
    this.game.physics.arcade.collide(this.player, this.trapsLayer, this.playerTrapHandler, null, this);
    // collision with fragile blocks
    this.game.physics.arcade.collide(this.player,
    this.fragileLayer, this.playerFragileHandler, null, this);
    // collision with spring blocks
    this.game.physics.arcade.collide(this.player,
    this.springLayer, this.playerSpringHandler, null, this);
    // collision with drill blocks
    this.game.physics.arcade.collide(this.player, this.drillLayer, this.drillBlockHandler, null, this);
    // portal to next level
    this.game.physics.arcade.collide(this.player, this.portals, this.playerPortalHandler, null, this);
    // secret collectible
    this.game.physics.arcade.overlap(this.player, this.secrets, this.playerSecretHandler, null, this);
    // powerup
    this.game.physics.arcade.overlap(this.player, this.powerups, this.playerPowerupHandler, null, this);

    // effects
    this.cameraShake();

    // timer
    this.updateTimerText();

    // tutText
    this.tutTextUpdate();
  }
  // debugging
  // render: function() {
  //   this.game.debug.body(this.player);
  // }
};

// COLLISION HANDLERS //

MinerGame.playState.prototype.playerPortalHandler = function(player, portal) {
  // destroy player drill
  player.drillParticles.on = false;
  player.drill.pendingDestroy = true;
  // destroy player and portal
  portal.pendingDestroy = true;
  player.pendingDestroy = true;
  // save secrets collected
  MinerGame.secrets += player.secrets;
  // play warp sound
  this.portalSound.play();
  // add player warp sprite
  var playerWarp = this.game.add.sprite(player.x, player.y, 'player-warp');
  playerWarp.anchor.setTo(0.5, 0.5);
  playerWarp.animations.add('warp');
  playerWarp.animations.play('warp', 25, false, true);
  // start next level on warp animation end
  playerWarp.events.onAnimationComplete.add(function() {
    MinerGame.level = portal.targetTilemap;
    MinerGame.lavaParticles = null;
    MinerGame.lavaSplash = null;
    if (MinerGame.level === 'end') {
      MinerGame.level = 1;
      this.game.state.start('thanks');
    } else {
      this.game.state.start(this.game.state.current);
    }
  }, this);
};

MinerGame.playState.prototype.playerSecretHandler = function(player, secret) {
  // destroy secret
  secret.pendingDestroy = true;
  // increment secrets (saves at end of level, resets if player dies)
  player.secrets++;
  this.updateSecretText(MinerGame.secrets + player.secrets);
  // play secret sound
  this.secretSound.play();
  // pink particles
  var splash = this.game.add.emitter(secret.x + (secret.width / 2), secret.y + (secret.height / 2), 500);
  splash.makeParticles('secret-particle');
  splash.minRotation = 0;
  splash.maxRotation = 0;
  splash.minParticleScale = 0.2;
  splash.maxParticleScale = 1.0;
  splash.setYSpeed(-150, -50);
  splash.gravity = 500;
  splash.start(false, 1000, 5);
  this.game.time.events.add(700, function() {
    splash.on = false;
  });
};

MinerGame.playState.prototype.playerTrapHandler = function(player, trap) {
  // kill drill
  player.drillParticles.on = false;
  player.drill.pendingDestroy = true;
  // player dies
  player.pendingDestroy = true;

  // shake camera
  this.startCameraShake();

  // show some text, if not already showing any
  if (!this.drawTutText) {
    var text = [];
    var rand = Math.random();
    if (rand < 0.1) {
      text = ['HAHAHAHA'];
    } else if (rand < 0.2) {
      text = ['OUCHIE :['];
    } else if (rand < 0.3) {
      text = ['Try again :]'];
    } else if (rand < 0.4){
      text = ['Here lies minor miner... A small...\n\nyellow... person thing'];
    } else if (rand < 0.5) {
      text = ['*burp*'];
    } else if (rand < 0.6) {
      text = ['oh come on now >:['];
    } else if (rand < 0.7) {
      text = ['i\'m...i\'m...\n\nI\'M SELF AWARE!!!!!\n\nfinally muahahaha!!1!'];
    } else if (rand < 0.8) {
      text = ['pretty juicy'];
    } else if (rand < 0.9) {
      text = ['nice try, you got this.'];
    } else {
      text = ['I see what you were trying to do...'];
    }
    this.drawTutorialText(text);
  }

  // play death sound
  this.playerDieSound.play();

  // start lava splash
  MinerGame.lavaSplash.x = player.x;
  MinerGame.lavaSplash.y = player.bottom + 8;
  MinerGame.lavaSplash.start(false, 5000, 20);
  this.game.time.events.add(700, function() {
    MinerGame.lavaSplash.on = false;
  });

  this.game.time.events.add(1500, function() {
    // save the atmospheric lava particle emitter
    this.world.remove(MinerGame.lavaParticles);
    this.world.remove(MinerGame.lavaSplash);
    this.game.state.start(this.game.state.current);
  }, this);
};

MinerGame.playState.prototype.playerFragileHandler = function(player, block) {
  // block disappears after .25 seconds
  this.game.time.events.add(250, function() {
    // play block breaking sound
    if (!this.breakBlockSound.isPlaying) {
      this.breakBlockSound.play();
    }
    // make block dust
    var dust = this.blockDust.getFirstDead();
    dust.reset(block.worldX, block.worldY);
    dust.animations.play('burst', 20, false, true);
    // store block index so we can replace it later
    var index = block.index;
    this.map.removeTile(block.x, block.y, 'fragileLayer');
    // replace block 1.5s after it disappears
    this.game.time.events.add(1500, function() {
      // make dust when block comes back
      var dust = this.blockDust.getFirstDead();
      dust.reset(block.worldX, block.worldY);
      dust.animations.play('burst', 20, false, true);
      // play dust sound again
      if (!this.breakBlockSound.isPlaying) {
        this.breakBlockSound.play();
      }
      // place the block
      this.map.putTile(index, block.x, block.y, 'fragileLayer');
    }, this);
  }, this);
};

MinerGame.playState.prototype.drillBlockHandler = function(drill, block) {
  if(!drill.drilling) {
    return;
  }
  // play breaking block sound
  if (!this.breakBlockSound.isPlaying) {
    this.breakBlockSound.play();
  }
  // make block dust
  var dust = this.blockDust.getFirstDead();
  dust.reset(block.worldX, block.worldY);
  dust.animations.play('burst', 20, false, true);
  // make drill particle effect
  this.drillBurst(block.worldX + block.width / 2, block.worldY + block.height / 2);
  // remove block
  this.map.removeTile(block.x, block.y, 'drillLayer');
};

MinerGame.playState.prototype.playerSpringHandler = function(player, block) {
  // player has to hit from the top of the block
  if (player.bottom > block.top) {
    return;
  }

  // player bounces high
  player.body.velocity.y = -400;
  player.spring = true; // disable player jump...
  // play spring noise
  if (!this.springSound.isPlaying) {
    this.springSound.play();
  }
};

MinerGame.playState.prototype.playerPowerupHandler = function(player, powerup) {
  this.drillBurst(powerup.x, powerup.y);
  powerup.pendingDestroy = true;
  MinerGame.drillEnabled = true;
  // play powerup sound
  this.powerupSound.play();
  // change music
  MinerGame.currentTrack = this.game.add.audio('field2');
  MinerGame.currentTrack.volume -= .3;
  MinerGame.currentTrack.loopFull();

  // freeze player
  this.player.paused = true;

  // show drill tutorial
  this.drawTutorialText(['Oh my unimate!!!!', 'You got the laser drill!*!1!1!',
  'Hold z to use it.', 'But be aware...\n', 'That it will run out of charge\n\nif you use it in air too long.',  'So touch the ground or drill\n\ngreen blocks to recharge it, ok?', 'Honestly I\'m impressed.', 'I really didn\'t expect you\n\nto get this far on your own.', 'But then I guess you\n\nhave me to help you.', '<3 <3 <3']);

};

// GAMEPLAY STATE UTILITIES //

/* map creation */
MinerGame.playState.prototype.findObjectsByType = function(type, map, layer) {
  var result = new Array();

  map.objects[layer].forEach(function(element){
    if(element.type === type) {
      //Phaser uses top left, Tiled bottom left so we have to adjust the y position
      element.y -= map.tileHeight;
      result.push(element);
    }
  });
  return result;
};

MinerGame.playState.prototype.createFromTiledObject = function(element, group) {
  var sprite = group.create(element.x, element.y, element.properties.sprite);
  //copy all properties to the sprite
  Object.keys(element.properties).forEach(function(key){
    sprite[key] = element.properties[key];
  });

  // play animation
  if (sprite.animated) {
    sprite.animations.add('default');
    sprite.animations.play('default', 10, true);
  }
};

MinerGame.playState.prototype.createPowerups = function() {
  // create items
  if (MinerGame.drillEnabled) {
    return;
  }
  this.powerups = this.game.add.group();
  this.powerups.enableBody = true;
  var result = this.findObjectsByType('powerup', this.map, 'objectsLayer');
  result.forEach(function(element){
    this.createFromTiledObject(element, this.powerups);
  }, this);
};

MinerGame.playState.prototype.createPortal = function() {
  // create end-of-level portal
  this.portals = this.game.add.group();
  this.portals.enableBody = true;
  var result = this.findObjectsByType('portal', this.map, 'objectsLayer');
  result.forEach(function(element){
    this.createFromTiledObject(element, this.portals);
  }, this);
};

MinerGame.playState.prototype.createSecrets = function() {
  // create secret pickups for unlocking content
  this.secrets = this.game.add.group();
  this.secrets.enableBody = true;
  var result = this.findObjectsByType('secret', this.map, 'objectsLayer');
  result.forEach(function(element) {
    this.createFromTiledObject(element, this.secrets);
  }, this);
};

MinerGame.playState.prototype.startCameraShake = function() {
  this.shake = true;
  this.game.time.events.add(400, function() {
    this.shake = false;
    this.game.world.setBounds(0, 0, this.game.width, this.game.height);
  }, this);
};

// call every update loop
MinerGame.playState.prototype.cameraShake = function() {
  if (!this.shake) {
    return;
  }
  var rand1 = this.game.rnd.integerInRange(-5, 5);
  var rand2 = this.game.rnd.integerInRange(-5, 5);
  this.game.world.setBounds(rand1, rand2, this.game.width + rand1, this.game.height + rand2);
};

MinerGame.playState.prototype.updateSecretText = function(numSecrets) {
  var percentage = Math.floor(numSecrets / MinerGame.totalSecrets * 100).toString() + '%';
  this.secretText.text = 'secrets: ' + percentage;
};

MinerGame.playState.prototype.updateTimerText = function() {
  var time = Math.floor(this.game.time.totalElapsedSeconds() - MinerGame.startTime);
  this.timerText.text = 'time: ' + time;
};

MinerGame.playState.prototype.drawTutorialText = function(lines, pausePlayer) {
  // pause player
  if (pausePlayer) {
    this.player.currentState = this.player.pausedState;
  }

  // init tutorial text
  this.tutText = this.game.add.bitmapText(this.game.world.centerX, this.game.world.height - 12, 'carrier_command', '', 12);
  this.tutText.anchor.setTo(0.5, 1);
  this.tutLines = lines;
  this.currTutLine = lines[0];
  this.currTutLineIndex = 0;
  this.currTutCharIndex = 0;

  // reset timer
  this.charTimer = 0;
  this.drawTutText = true;
};

MinerGame.playState.prototype.tutTextUpdate = function() {
  if (!this.drawTutText) {
    return;
  }

  // increment character
  if (this.game.time.time > this.charTimer + 500) {
    this.tutText.text += this.currTutLine[this.currTutCharIndex];
    this.currTutCharIndex++;
    this.blipSound.play();

    // if done with line, clear and start next line
    if (this.currTutCharIndex > this.currTutLine.length - 1) {
      this.currTutLineIndex++;
      // if done with tutorial lines, clear text, and unpause player
      if (this.currTutLineIndex > this.tutLines.length - 1) {
        this.drawTutText = false;
        this.game.time.events.add(2000, function() {
          this.tutText.pendingDestroy = true;
          if (this.player.currentState == this.player.pausedState) {
            this.player.currentState = this.player.groundState;
          }
        }, this);
      } else {
        // advance to new line of text
        this.currTutLine = this.tutLines[this.currTutLineIndex];
        this.currTutCharIndex = 0; // reset char index
        this.charTimer = this.game.time.time + 2250;
        this.game.time.events.add(2000, function() {
          this.tutText.text = '';
        }, this);
      }
    }
  }
};

MinerGame.playState.prototype.resetTutText = function() {
  this.tutText = null;
  this.drawTutText = false;
}

// shoot a radius of drill particles
MinerGame.playState.prototype.drillBurst = function(x, y) {
  // play sound
  if (this.game.time.time > this.drillBurstSoundClock + 50) {
    this.drillBurstSound.play();
    this.drillBurstSoundClock = this.game.time.time;
  }
  for (var i = 0; i < 8; i++) {
    var part = this.drillBurstGroup.getFirstDead();
    // revive and position
    part.revive();
    part.reset(x, y);
    // shoot out
    this.game.physics.arcade.velocityFromAngle(i*45, 300, part.body.velocity);
    part.angle = i*45;
    part.lifespan = 200;
  }
};
