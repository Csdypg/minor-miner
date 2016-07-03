var MinerGame = MinerGame || {};

// THANKS FOR PLAYING DEMO STATE //
MinerGame.thanksState = function(){};

MinerGame.thanksState.prototype = {
  create: function() {
    this.game.add.bitmapText(this.game.world.centerX, this.game.world.centerY, 'carrier_command', 'THANKS FOR PLAYING THE DEMO\n\nPLEASE SEND FEEDBACK TO ALEX\n\nr.alex.morris.3@gmail.com\n\n@ramorris_3\n\nhttp://ralexmorris.com/blog', 12).anchor.setTo(0.5, 0.5);

    // create menu text
    var startText = this.game.add.bitmapText(this.game.world.centerX, this.game.height - 150, 'carrier_command', 'PRESS \'X\' TO RESTART', 12);
    startText.anchor.setTo(0.5, 0.5);

    // start button
    var startKey = this.game.input.keyboard.addKey(Phaser.Keyboard.X);
    startKey.onDown.add(function() {
      if (MinerGame.currentTrack) {
        MinerGame.currentTrack.stop();
      }
      var startSound = this.add.audio('start_game');
      startSound.volume -= .5;
      startSound.play();
      // menu text fade in and out for 1.5 sec
      var startTween = this.game.add.tween(startText).to({ alpha: 0 }, 100, "Linear", true, 0, -1, true);
      // after 1.5 sec, transition to next state
      this.game.time.events.add(700, function() {
          this.game.state.start('menu');
      }, this);
    }, this);
  }
}
