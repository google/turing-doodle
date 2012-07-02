// Copyright 2012 Google Inc. All Rights Reserved.
//
// Licensed under the Apache License, Version 2.0 (the "License");
// you may not use this file except in compliance with the License.
// You may obtain a copy of the License at
//
//     http://www.apache.org/licenses/LICENSE-2.0
//
// Unless required by applicable law or agreed to in writing, software
// distributed under the License is distributed on an "AS IS" BASIS,
// WITHOUT WARRANTIES OR CONDITIONS OF ANY KIND, either express or implied.
// See the License for the specific language governing permissions and
// limitations under the License.

/**
 * @fileoverview An interactive doodle for Alan Turing's 100th birthday.
 * @author jered@google.com (Jered Wierzbicki)
 */

goog.provide('turing');

goog.require('turing.Controls');
goog.require('turing.GameState');
goog.require('turing.Logo');
goog.require('turing.Program');
goog.require('turing.Simulator');
goog.require('turing.Tape');
goog.require('turing.Target');
goog.require('turing.anim');
goog.require('turing.sprites');
goog.require('turing.util');


/**
 * The container where our dom modifications will be contained.
 * @type {string}
 * @const
 */
turing.LOGO_CONTAINER_ID = 'logo';


/**
 * The maximum number of steps a game program can run. This should be just high
 * enough so that all halting programs can run fully, and all cyclic programs do
 * something that checks wrong before we kill them; but low enough so that users
 * don't get bored if they make a trivial infinite loop.
 * @type {number}
 * @const
 */
turing.GAME_PROGRAM_STEP_LIMIT = 40;


/**
 * How many failed attempts at current puzzle before we slow down execution.
 * @type {number}
 * @const
 */
turing.FAILURES_BEFORE_SLOWING = 2;


/**
 * Assembles a program from strings.
 * @param {...string} var_args One string for each program track.
 * @return {Object.<string, Array.<Array.<string>>>} An object with correct and
 *    incorrect array of op arrays for each track.
 * @private
 */
turing.assemble_ = function(var_args) {
  var ops = {};
  for (var pass = 0; pass <= 1; pass++) {
    // Make two passes through each program to save incorrect and correct
    // copies. We need correct copies to animate stepping through solved puzzles
    // when the game is over.
    var tracks = [];
    for (var i = 0; i < arguments.length; i++) {
      // Split on whitespace and copy the resulting array (/ +/ matches one or
      // more spaces.)
      var trackOps = arguments[i].split(/ +/).slice(0);
      for (var j = 0; j < trackOps.length; j++) {
        if (trackOps[j] == '.') {
          // No-ops are represented internally with the empty string.
          trackOps[j] = '';
        } else if (/\(.*\)/.test(trackOps[j])) {
          // /\(.*\)/ matches a parenthesized expression inside the op
          // description. These are corrections for ops initially set to a wrong
          // value for the game.
          if (pass == 0) {
            // Keep only the correction. (The re below matches the whole op
            // string, but captures only the part in parentheses.)
            trackOps[j] = trackOps[j].replace(/.*\((.*)\).*/, '$1');
          } else {
            // Eliminate the correction.
            trackOps[j] = '*' + trackOps[j].replace(/\(.*\)/, '');
          }
        } else if (pass == 0 && trackOps[j] && trackOps[j][0] == '*') {
          // Some buttons are clickable but do not have explicit corrections
          // since they are not needed to solve the program. These are just
          // marked with a *. Remove it if present so they are not clickable
          // when playing through the solved program on game over.
          trackOps[j] = trackOps[j].substr(1);
        }
      }
      tracks.push(trackOps);
    }
    if (pass == 0) {
      ops.correct = tracks;
    } else {
      ops.incorrect = tracks;
    }
  }
  return ops;
};


/**
 * One of the doodle's programs.
 * @typedef {{tape: string, goal: string, ops: Object.<string, Array>}}
 */
turing.ProgramDef;


/**
 * The set of programs which the user must complete in order to relight the
 * Google logo, along with an initial demo/demos to show off the machine.
 * @type {Array.<turing.ProgramDef>}
 * @const
 */
turing.PROGRAMS = [
  // Demo program shown when the doodle loads.
  {
    // This program counts forever in binary starting at 1.
    tape: '',
    goal: '',
    ops: turing.assemble_('D0 D_ 0  L  B4',
                          '.  1  R  U_ B2')
  },

  // First quest: The following six programs are four basic tutorial programs
  // and two interesting but not especially challenging programs. We hope most
  // people can get through these with no trouble.
  {
    tape: '00010',
    goal: '01011',
    // A really gentle intro to the basic operations: just moves and prints.
    // - Tried L L *0, but most users clicked through without understanding.
    // - Tried L L 1(0) R R R R 0(1) with the tape 11010. Needing to click two
    //   things reduced random click throughs, but some users were stuck here
    //   when buttons cycled L/R/0/1 (so now they cycle 0/1).
    // - Considered the above program with the tape _101_ to make printing more
    //   obvious, but decided the first program needs to start with a five bit
    //   string on the tape for clear correspondence with the number plate.
    // - Revised to this program because we want the leftmost bit to be correct
    //   so at first the user sees one bit check correct and then one wrong.
    ops: turing.assemble_('L 0(1) R R R 0(1)'),
    tutorial: true,
    logoLetterIndex: 0,
    highlight: 'b'
  },
  {
    tape: '0_011',
    goal: '00011',
    // Introduces conditional branching between tracks, the down-if operation
    // and the notation we use to mean a blank square.
    // - The extra L is supposed to give users time to notice the program is
    //   running.
    // - We tried 0 *D0 followed by some Ls and Rs on each track. Users clicked
    //   through but were generally confused about our notation, so we didn't
    //   learn much. Also we had aesthetic complaints about branching on
    //   something just written.
    ops: turing.assemble_('L D0(D_) 1',
                          '. 0'),
    tutorial: true,
    logoLetterIndex: 1,
    highlight: 'r'
  },
  {
    tape: '01011',
    goal: '00011',
    // Introduces backwards branches. The goal is to line up with the correct
    // conditional. The extra Rs are supposed to show there is an incorrect
    // alternative path; hopefully this is not confusing.
    // - We tried a more elaborate program with a loop where one had to pick the
    //   correct exit. This was too complex. Users had trouble noticing the
    //   backwards arcing tracks, which this program really emphasizes visually
    //   since it lines up with the descending track from the D1 ops.
    ops: turing.assemble_('D1 D1 D1 L B2(B4)',
                          '0  R  R  R'),
    tutorial: true,
    logoLetterIndex: 2,
    highlight: 'y'
  },
  {
    tape: '11011',
    goal: '01011',
    // Introduces loops. Finds the first bit and changes it.
    ops: turing.assemble_('L D1(D_) B2',
                          '. R      0'),
    tutorial: true,
    logoLetterIndex: 3,
    highlight: 'b'
  },
  {
    tape: '0_001',
    goal: '01001',
    // Replaces a single blank with 1s.
    // This would be more challenging if the D1 exit were changeable.
    ops: turing.assemble_('L L D0(D_) R  D1 B3',
                          '. . 1      U1'),
    logoLetterIndex: 4,
    highlight: 'g'
  },
  {
    tape: '01111',
    goal: '10000',
    // Inverts the string on the tape.
    // This is an actual interesting program with a clear task. Two different
    // solutions work to make the program do inverting; on track 2, 0 -> 1,
    // U0 -> U1; or on track 1, D0 -> D1, 0 -> 1.
    ops: turing.assemble_('L L D0(D1) 0(1) R   D_ B4',
                          '. . *0     .    *U0'),
    logoLetterIndex: 5,
    highlight: 'r'
  },

  // Second quest: These more interesting programs are here for users who
  // really like this sort of thing and want more challenge/interest.
  {
    tape: '11010',
    goal: '01011',
    // Uses loops to find the first and last bits and change them.
    ops: turing.assemble_('L D_ B2 . R(L)   1',
                          '. R  0  R U0(U_) B2'),
    logoLetterIndex: 0,
    highlight: 'b'
  },
  {
    tape: '01_01',
    goal: '00011',
    // Adds two base one numbers, sort of, not really.
    ops: turing.assemble_('L D_(D1) B2 . L      1  L 0',
                          '. .      0  R U_(U1) B2 . .'),
    logoLetterIndex: 1,
    highlight: 'r'
  },
  {
    tape: '00111',
    goal: '00011',
    // A maze of conditionals. This is maybe sort of insane.
    ops: turing.assemble_('D_(D1) 1  L      D_(D1) 1 L      D_(D0) 1',
                          '1      R  U_(U1) 0      R U_(U1) 0      *U_'),
    logoLetterIndex: 2,
    highlight: 'y'
  },
  {
    tape: '01011',
    goal: '01011',
    // A goofy easy one to break up the tension. So easy it actually does
    // nothing. This is an homage to the Konami code.
    ops: turing.assemble_('.  .  D_ D_ L R L R',
                          'U_ U_ .  .  . . 1 0'),
    tutorial: true,
    logoLetterIndex: 3,
    highlight: 'b'
  },
  {
    tape: '0_00_',
    goal: '01001',
    // Replaces zeroes followed by blanks with 1s.
    // This is meant to be sort of challenging. The main challenge is to avoid
    // infinite loops and reason about what makes the program terminate
    // properly.
    ops: turing.assemble_('L L D_(D0) 1  R D1(D_) B4',
                          '. R U0(U_) B2'),
    logoLetterIndex: 4,
    highlight: 'g'
  },
  {
    tape: '00001',
    goal: '10000',
    // Shifts the one to left.
    ops: turing.assemble_('D0(D1) R . D0(D_) B4',
                          '0      L 1 L      U_(U0)'),
    stepLimit: 80,
    logoLetterIndex: 5,
    highlight: 'r'
  }
];


/**
 * A bonus program displayed only in a special mode which the user can trigger
 * after winning the game. This program prints the rabbit sequence, which is a
 * bitstring with many beautiful relationships to Fibonacci numbers and the
 * golden ratio. More immediately, it implements the substitution system with
 * rules 1 -> 10, 0 -> 1.
 * @type {Array.<Array.<string>>}
 * @const
 */
turing.BONUS_PROGRAM = turing.assemble_(
    '1 . D1 . .  .  . _  R  D_ B2',
    'R U _  R D_ B2 . 1  B8 1  D_ L  B2',
    'U . B2 . 1  R  0 U_ L  B2 0  B9').correct;


/**
 * Current game state.
 * @type {turing.GameState}
 * @private
 */
turing.state_ = new turing.GameState();


/**
 * True iff the game has ended.
 * @type {boolean}
 * @private
 */
turing.gameOver_ = false;


/**
 * How many times has the user failed to solve the current puzzle?
 * @type {number}
 * @private
 */
turing.numFailures_ = 0;


/**
 * The time when the current program was first set up.
 * @type {number}
 * @private
 */
turing.startProgramTime_ = 0;


/**
 * The tape.
 * @type {turing.Tape}
 * @private
 */
turing.tape_;


/**
 * The letters of the Google logo.
 * @type {turing.Logo}
 * @private
 */
turing.logo_ = new turing.Logo();


/**
 * The program display.
 * @type {turing.Program}
 * @private
 */
turing.program_;


/**
 * An overlay which covers the doodle initially.
 * @type {turing.Overlay}
 * @private
 */
turing.overlay_ = new turing.Overlay();


/**
 * Helper to simulate programs.
 * @type {turing.Simulator}
 * @private
 */
turing.simulator_ = new turing.Simulator();


/**
 * Controls to start and stop program execution.
 * @type {turing.Controls}
 * @private
 */
turing.controls_ = new turing.Controls();


/**
 * A board to display the desired target for the current game program.
 * @type {turing.Target}
 * @private
 */
turing.target_ = new turing.Target();


/**
 * The main container for the doodle.
 * @type {Element}
 * @private
 */
turing.logoContainer_ = null;


/**
 * @return {boolean} True iff current program is a tutorial.
 * @private
 */
turing.inTutorial_ = function() {
  return turing.PROGRAMS[turing.state_.getCurProgram()].tutorial;
};


/**
 * @param {Element} img An img element.
 * @return {boolean} True iff an image is already loaded.
 * @private
 */
turing.isImageReady_ = function(img) {
  return img['complete'] || img['readyState'] == 'complete';
};


/**
 * Starts up demo mode.
 * @private
 */
turing.startDemo_ = function() {
  turing.logo_.attachTo(turing.logoContainer_);
  turing.tape_.attachTo(turing.logoContainer_);
  turing.program_.attachTo(turing.logoContainer_);
  turing.overlay_.attachTo(turing.logoContainer_, turing.startGame_);
  turing.controls_.attachTo(turing.logoContainer_);
  turing.target_.attachTo(turing.logoContainer_);
  // Remove the base overlay image which we show while our sprite preloads.
  turing.logoContainer_.style.background = '';
  turing.startSleepTimer_();
  turing.program_.setInteractive(false);
  turing.program_.change(turing.PROGRAMS[0].ops.correct, true  /* Hidden. */);
  turing.simulator_.run(turing.program_, turing.tape_,
      turing.SpeedSetting.FAST);
};


/**
 * Changes into game mode.
 * @private
 */
turing.startGame_ = function() {
  // Begin loading the deferred sprite sheet.
  var deferredSprite = turing.sprites.preload(
      turing.sprites.DEFERRED_SPRITE_PATH);
  turing.simulator_.stop();
  turing.simulator_.setStepLimit(turing.GAME_PROGRAM_STEP_LIMIT);
  if (turing.PROGRAMS[turing.state_.getCurProgram()].logoLetterIndex == 0) {
    // Only dim the logo if the user hasn't solved any programs yet, i.e., they
    // are on the 'G' program; otherwise we'll pick up where they left off.
    turing.logo_.dim(500);
  }
  if (turing.isImageReady_(deferredSprite)) {
    // If the deferred sprite was cached or loaded very fast, go right to the
    // game.
    turing.destroySleepTimer_();
    turing.anim.delay(function() {
      turing.setupProgram_(turing.state_.getCurProgram());
    }, 500);
  } else {
    // Otherwise, if we're waiting for the deferred sprite, treat the tape as a
    // progress bar and sit scrolling it until the sprite loads.
    var loaded = false;
    turing.anim.delay(function() {
      if (!loaded) {
        turing.tape_.scanRight(100, 100);
        turing.anim.delay(/** @type {function()} */(arguments.callee), 300);
      }
    }, 300);
    deferredSprite.onload = function() {
      loaded = true;
      turing.destroySleepTimer_();
      turing.setupProgram_(turing.state_.getCurProgram());
    };
  }
};


/**
 * Sets up the game for a given program.
 * Things change in the order: Target, tape, program (top to bottom).
 * @param {number} index The program to enter.
 * @private
 */
turing.setupProgram_ = function(index) {
  var program = turing.PROGRAMS[index];
  turing.startProgramTime_ = new Date().getTime();
  if (program.stepLimit) {
    turing.simulator_.setStepLimit(program.stepLimit);
  }
  // Make the program vanish and the target scroll away.
  turing.program_.change([[], []]);
  turing.target_.setValue('', 800);
  turing.target_.setEqual('dim');
  turing.anim.delay(turing.callIfNotInBonusMode_(function() {
    turing.tape_.setString(program.tape);
  }), 800);

  turing.anim.delay(turing.callIfNotInBonusMode_(function() {
    turing.target_.setValue(program.goal, 800);
  }), 2200);
  turing.anim.delay(turing.callIfNotInBonusMode_(function() {
    if (!turing.gameOver_) {
      turing.program_.change(program.ops.incorrect);
      turing.makeInteractive_(0, 500);
    } else {
      turing.program_.change(program.ops.correct);
      // The bunny takes you to bonus mode!
      turing.target_.showBonusBunny(turing.enterBonusMode_,
                                    program.highlight);
      turing.setOpHighlightColor(program.highlight);
      turing.simulator_.run(turing.program_, turing.tape_,
          turing.SpeedSetting.FAST,
          turing.callIfNotInBonusMode_(function() {
            turing.winLevel_(index);
          }));
    }
  }), 3200);
};


/**
 * Changes program and makes the play button pressable after the tape is set up.
 * @param {number} popOutPlayDelay ms to delay before popping button out.
 * @param {number} lightOpsDelay ms to delay before lighting clickable buttons.
 * @private
 */
turing.makeInteractive_ = function(popOutPlayDelay, lightOpsDelay) {
  turing.target_.setEqual('dim');
  turing.anim.delay(function() {
    turing.controls_.popOutPlayButton(function() {
      turing.program_.setInteractive(false);
      turing.controls_.pushInPlayButton();
      // Pause between lighting the play button and lighting the first
      // operation to make it clear these are two separate things happening.
      turing.anim.delay(function() {
        // Speed picks up a little after the initial programs, but slows back
        // down if the user has trouble.
        var speed = turing.inTutorial_() ? turing.SpeedSetting.TUTORIAL :
            turing.SpeedSetting.NORMAL;
        if (turing.numFailures_ >= turing.FAILURES_BEFORE_SLOWING) {
          // Having a hard time.
          speed = turing.inTutorial_() ? turing.SpeedSetting.SLOW :
              turing.SpeedSetting.TUTORIAL;
        }
        // Note: I tried dropping back down to SLOW if there are twice as many
        // failures, but this is just too slow for looping programs.
        turing.simulator_.run(turing.program_, turing.tape_, speed,
            turing.finishProgramRun_);
      }, 600);
    });
    // Light up clickable ops a little after the play button pops out so that
    // people will first notice the play button, then things to click.
    turing.anim.delay(function() {
      turing.program_.setInteractive(true);
    }, lightOpsDelay);
  }, popOutPlayDelay);
};


/**
 * Ends the game after the user has won.
 * This method is called twice:
 *   - once to signal that the user has finished the game and start an
 *     animation of the play-through.
 *   - then, it is called again but instead navigates to serp.
 * @private
 */
turing.endGame_ = function() {
  turing.tape_.setString('');
  turing.program_.change([[], []]);
  turing.program_.reset();
  turing.target_.setValue('', 800);
  if (!turing.gameOver_) {
    if (turing.state_.getCurProgram() == turing.PROGRAMS.length - 1) {
      // Reset current program so the next playthrough will start over.
      turing.state_.setCurProgram(1);
    } else {
      // On next playthrough, begin at a new set of programs.
      turing.state_.setCurProgram(turing.state_.getCurProgram() + 1);
    }
    turing.gameOver_ = true;
    turing.anim.delay(
        goog.bind(turing.logo_.deluminate, turing.logo_,
            turing.replaySolutionsInSequence_),
        1000);
  } else {
    window.location.href = '/search?q=Alan+Turing';
  }
  turing.target_.setEqual('dim');
};


/**
 * Plays through solved programs in sequence.
 * @private
 */
turing.replaySolutionsInSequence_ = function() {
  // Because gameOver is now set, setupProgram_ will just step through programs
  // until the last.
  // We have already set up the new value of curProgram for the next game. Count
  // back six programs, wrapping, to figure out which program began this game,
  // so we can replay from the correct place.
  var firstProgramInNextGame = turing.state_.getCurProgram();
  var firstProgramInThisGame = firstProgramInNextGame == 1 ?
      turing.PROGRAMS.length - 6 : firstProgramInNextGame - 6;
  turing.setupProgram_(firstProgramInThisGame);
};


/**
 * Sets up a more complicated, interesting program after the game is done.
 * @private
 */
turing.enterBonusMode_ = function() {
  turing.simulator_.stop();
  turing.logo_.destroy();
  turing.controls_.destroy();
  turing.target_.destroy();
  turing.program_.destroy();
  turing.switchProgramsToBonusMode();
  turing.setOpHighlightColor('y');
  turing.startSleepTimer_();
  turing.tape_.slideUp();
  turing.anim.delay(function() {
    // There may be another setString queued, so wait a while and then clear
    // the tape to be sure it starts out blank.
    turing.tape_.setString('');
    turing.anim.delay(function() {
      turing.program_ = new turing.Program();
      turing.program_.create();
      turing.program_.attachTo(turing.logoContainer_);
      turing.program_.change(turing.BONUS_PROGRAM);
      turing.simulator_.setStepLimit(0);
      turing.simulator_.run(turing.program_, turing.tape_,
          turing.SpeedSetting.FAST);
    }, 2000);
  }, 2000);
};


/**
 * Wraps a function with a test to check for bonus mode prior to calling.
 * @param {function()} func The function to call.
 * @return {function()} A function which first tests for bonus mode.
 * @private
 */
turing.callIfNotInBonusMode_ = function(func) {
  return function() {
    if (!turing.isInBonusMode()) {
      func();
    }
  }
};


/**
 * Called when a program is finished running.
 * @private
 */
turing.finishProgramRun_ = function() {
  // Let the last operation light remain off for a while to make it clear the
  // program is done.
  turing.anim.delay(function() {
    // First dim, but do not pop out the play button.
    turing.controls_.dimPlayButton();
    // Give the user just long enough to notice the play button before starting
    // to check the tape.
    turing.anim.delay(turing.checkTape_, 1000);
  }, 700);
};


/**
 * Checks to see whether the tape is correct
 * @private
 */
turing.checkTape_ = function() {
  // -1 seeks one position left of the first square to attract attention to
  // checking before it starts.
  turing.checkNextSquare_(-1, turing.winLevel_, turing.failLevel_);
};


/**
 * Called when the user wins a level (the tape checks correct).
 * @param {number=} opt_index Iff present, use this as the index of the program
 *   just completed.
 * @private
 */
turing.winLevel_ = function(opt_index) {
  turing.numFailures_ = 0;
  var index = opt_index || turing.state_.getCurProgram();
  var letterIndex = turing.PROGRAMS[index].logoLetterIndex;
  // Change the current letter to be lit up.
  turing.logo_.lightLetterAtPosition(letterIndex, 500);
  if (!turing.isInBonusMode() && letterIndex == 5  /* 'e'. */) {
    // End the game when the 'e' program is solved.
    turing.anim.delay(turing.endGame_, 500);
  } else if (opt_index) {
    // Run new program but don't update state; used for end-game animation.
    turing.anim.delay(turing.callIfNotInBonusMode_(function() {
      turing.setupProgram_(/** @type {number} */(opt_index) + 1);
    }), 500);
  } else {
    // Update state.
    turing.anim.delay(turing.callIfNotInBonusMode_(function() {
      turing.state_.setCurProgram(index + 1);
      turing.setupProgram_(turing.state_.getCurProgram());
    }), 500);
  }
};


/**
 * Called when the user fails the level (tape doesn't check.)
 * @private
 */
turing.failLevel_ = function() {
  // Reset the tape and try again.
  turing.numFailures_++;
  var program = turing.PROGRAMS[turing.state_.getCurProgram()];
  turing.anim.delay(function() {
    turing.tape_.resetString(program.tape);
    turing.anim.delay(function() {
      turing.makeInteractive_(0, 100);
      turing.program_.reset();
    }, 400);
  }, 300);
};


/**
 * Check the square in the tape pointed to by the index arg.
 * If it's past the last symbol on the tape and in the target, then
 * trigger success.
 * If it doesn't match the target's symbol at index, then trigger failure.
 * Otherwise wait a bit and check the next square.
 * @param {number} index The index to check.
 * @param {function()} successCallback What to do if all squares match
 *     the target.
 * @param {function()} failureCallback What to do if there is a mismatch.
 * @private
 */
turing.checkNextSquare_ =
    function(index, successCallback, failureCallback) {
  var symbol = turing.tape_.scanToAndGetSymbol(index);
  var program = turing.PROGRAMS[turing.state_.getCurProgram()];
  if (index == -1) {
    // First scan one square to the left of the solution to get people to
    // look up to the tape.
    turing.anim.delay(
        goog.partial(turing.checkNextSquare_, index + 1,
                     successCallback, failureCallback), 600);
    return;
  }
  if (!symbol && !program.goal[index]) {
    turing.target_.highlightAt(program.goal, index, 1600);
    turing.target_.setEqual('eq', 1600);
    // Success.  We've gone off the end of both strings.
    turing.anim.delay(successCallback, 2000);
  } else if (symbol != program.goal[index]) {
    turing.target_.highlightAt(program.goal, index, 1600);
    turing.target_.setEqual('neq', 1600);
    // Fail!
    turing.anim.delay(failureCallback, 2000);
  } else {
    // Speed up checking after we've passed the intro programs.
    var duration = turing.inTutorial_() ? 1000 : 500;
    turing.target_.highlightAt(program.goal, index, duration);
    turing.target_.setEqual('eq', duration - 200);
    turing.anim.delay(
        goog.partial(turing.checkNextSquare_, index + 1,
                     successCallback, failureCallback), duration);
  }
};


/**
 * Id for a timer which puts the doodle to sleep due to inactivity.
 * @type {?number}
 * @private
 */
turing.sleepTimerId_ = null;


/**
 * True iff we saw the mouse move since the last sleep timer callback.
 * @type {boolean}
 * @private
 */
turing.sawMouseMove_ = false;


/**
 * Period in ms of a timer which checks if it should put the doodle to sleep.
 * Note this means the doodle must be inactive for [t, 2*t] before going to
 * sleep.
 * @type {number}
 * @const
 */
turing.SLEEP_TIMEOUT = 20000;


/**
 * Sets up a timer to put the doodle to sleep after a period of inactivity.
 * @private
 */
turing.startSleepTimer_ = function() {
  // Inactivity is defined as no mouse movement for a period of the sleep timer.
  turing.sawMouseMove_ = false;
  turing.util.listen(document, 'mousemove', turing.mouseMoveListener_);
  turing.util.listen(document, 'touchstart', turing.touchStartListener_);
  // Put the doodle to sleep when simulator is running with no user activity.
  turing.sleepTimerId_ = window.setTimeout(turing.sleepIfInactive_,
      turing.SLEEP_TIMEOUT);
};


/**
 * Event listener for mouse movements on the document element. Used to detect
 * long periods of inactivity and put the doodle to sleep.
 * @private
 */
turing.mouseMoveListener_ = function() {
  turing.sawMouseMove_ = true;
  if (turing.anim.isStopped()) {
    // Wake the doodle up immediately so the user doesn't see it paused.
    turing.anim.start();
    turing.simulator_.resumeIfPaused();
    turing.sleepTimerId_ = window.setTimeout(turing.sleepIfInactive_,
        turing.SLEEP_TIMEOUT);
  }
};


/**
 * Event listener for touchstart events.
 * @private
 */
turing.touchStartListener_ = function() {
  turing.program_.setTouchDevice();
  turing.mouseMoveListener_();
};


/**
 * Called periodically to put the doodle to sleep if it is inactive.
 * @private
 */
turing.sleepIfInactive_ = function() {
  if (turing.simulator_.isRunning() && !turing.simulator_.hasStepLimit() &&
      !turing.sawMouseMove_) {
    // Only sleep if the simulator is running forever; the game settles down to
    // an idle steady state when playing.
    turing.simulator_.pause();
    turing.anim.stop();
  } else {
    turing.sleepTimerId_ = window.setTimeout(turing.sleepIfInactive_,
        turing.SLEEP_TIMEOUT);
  }
  // This will be reset in onmousemove if the user is mousing.
  turing.sawMouseMove_ = false;
};


/**
 * Tears down the sleep timeout timer.
 * @private
 */
turing.destroySleepTimer_ = function() {
  turing.util.unlisten(document, 'mousemove', turing.mouseMoveListener_);
  turing.util.unlisten(document, 'touchstart', turing.touchStartListener_);
  if (turing.sleepTimerId_ != null) {
    window.clearTimeout(turing.sleepTimerId_);
    turing.sleepTimerId_ = null;
  }
};


/**
 * Preloads sprite, creates dom elements and binds event listeners.
 */
turing.init = function() {
  turing.logoContainer_ = document.getElementById(turing.LOGO_CONTAINER_ID);
  if (!turing.logoContainer_) {
    // Do not show if the logo container is missing.
    return;
  }
  var mainSprite = turing.sprites.preload(turing.sprites.PATH);
  turing.state_.restore();
  turing.anim.reset();
  turing.anim.start();
  // In case we were previously in bonus mode.
  turing.switchProgramsToNormalMode();
  turing.setOpHighlightColor('y');
  turing.program_ = new turing.Program();
  turing.gameOver_ = false;
  turing.numFailures_ = 0;
  turing.overlay_.create(turing.logoContainer_);
  // If the user has not solved the 'G' program, light the entire logo
  // initially, else light as many letters as they have solved.
  var curProgram = turing.state_.getCurProgram();
  var letterIndex = turing.PROGRAMS[curProgram].logoLetterIndex;
  turing.logo_.create(letterIndex == 0 ? 6 : letterIndex);
  turing.tape_ = new turing.Tape();
  turing.tape_.create();
  turing.program_.create();
  turing.controls_.create();
  turing.target_.create();

  // Start the demo when we have the image for the main sprite.
  // Set up the handlers after we've initialized everything above as
  // the handler does use some of those objects.
  if (turing.isImageReady_(mainSprite)) {
    turing.startDemo_();
  } else {
    mainSprite.onload = turing.startDemo_;
  }
};


/**
 * Cleans up dom elements and listeners.
 */
turing.destroy = function() {
  turing.state_.save();
  turing.destroySleepTimer_();
  turing.anim.reset();
  turing.simulator_.stop();
  turing.target_.destroy();
  turing.overlay_.destroy();
  if (turing.program_) {
    turing.program_.destroy();
    turing.program_ = null;
  }
  if (turing.tape_) {
    turing.tape_.destroy();
    turing.tape_ = null;
  }
  turing.logo_.destroy();
  turing.controls_.destroy();
};
