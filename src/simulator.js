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
 * @fileoverview Simulates a Turing machine program running.
 * @author jered@google.com (Jered Wierzbicki)
 */

goog.provide('turing.Simulator');

goog.require('turing.Program');
goog.require('turing.Tape');
goog.require('turing.anim');


/**
 * Speed settings the simulator can run at.
 * @enum {number}
 */
turing.SpeedSetting = {
  SLOW: 0,
  TUTORIAL: 1,
  NORMAL: 2,
  FAST: 3,
  LUDICROUS: 4
};


/**
 * Configuration for a simulator speed setting.
 * - stepTime: ms between simulation steps that do something.
 * - emptyStepTime: ms between no-op steps.
 * - tapeTime: ms for a tape operation.
 * - branchTime: ms for a branch operation.
 * @typedef {{stepTime: number, tapeTime: number, emptyStepTime: number,
 *            branchTime: number}}
 * @private
 */
turing.Speeds;


/**
 * The definitions for speed settings.
 * @type {Object.<turing.SpeedSetting, turing.Speeds>}
 * @const
 */
turing.SPEED_CONFIG = {
  0 /* SLOW */: {
    stepTime: 750,
    tapeTime: 600,
    emptyStepTime: 400,
    branchTime: 850
  },
  1 /* TUTORIAL */: {
    stepTime: 650,
    tapeTime: 500,
    emptyStepTime: 200,
    branchTime: 750
  },
  2 /* NORMAL */: {
    stepTime: 450,
    tapeTime: 300,
    emptyStepTime: 200,
    branchTime: 550
  },
  3 /* FAST */: {
    stepTime: 250,
    tapeTime: 200,
    emptyStepTime: 100,
    branchTime: 250
  },
  4 /* LUDICROUS */: {
    stepTime: 100,
    tapeTime: 50,
    emptyStepTime: 100,
    branchTime: 100
  }
};


/**
 * How many times an operation can be repeated before it gets somewhat boring.
 * @type {number}
 * @const
 */
turing.SOMEWHAT_BORING_REPEAT_COUNT = 4;


/**
 * How many times an operation can be repeated before it gets very boring.
 * @type {number}
 * @const
 */
turing.VERY_BORING_REPEAT_COUNT = 6;



/**
 * Simulates programs.
 * @constructor
 */
turing.Simulator = function() {
  /**
   * The currently running program.
   * @type {turing.Program}
   * @private
   */
  this.program_ = null;

  /**
   * The currently simulating tape.
   * @type {turing.Tape}
   * @private
   */
  this.tape_ = null;

  /**
   * The id of the timeout which will step the program forward one step.
   * @type {number}
   * @private
   */
  this.stepTimerId_ = -1;

  /**
   * Function to call when the program is done.
   * @type {?function()}
   * @private
   */
  this.doneCallback_ = null;

  /**
   * Steps this program has run.
   * @type {number}
   * @private
   */
  this.stepCount_ = 0;

  /**
   * Steps the program may run before we terminate it.
   * @type {number}
   * @private
   */
  this.stepLimit_ = 0;

  /**
   * Maps from program locations to how many time operations at that location
   * have been run.
   * @type {Object.<string, number>}
   * @private
   */
  this.runCount_ = {};

  /**
   * How fast the simulation is going.
   * @type {turing.Speeds}
   * @private
   */
  this.speeds_ = turing.SPEED_CONFIG[turing.SpeedSetting.NORMAL];

  /**
   * True iff simulation is currently paused.
   * @type {boolean}
   * @private
   */
  this.paused_ = false;
};


/**
 * Returns whether the simulator is stepping the program.
 * @return {boolean} True iff the program is currently running.
 */
turing.Simulator.prototype.isRunning = function() {
  return this.stepTimerId_ != -1;
};


/**
 * Sets a limit for the number of steps a program may execute.
 * @param {number} limit The number of steps, or 0 for no limit.
 */
turing.Simulator.prototype.setStepLimit = function(limit) {
  this.stepLimit_ = limit;
};


/**
 * Used to check if the simulator will run until explicitly stopped, which is
 * the case in demo mode and when showing the bonus program.
 * @return {boolean} True iff the simulator has a step limit, false if it may
 *     run forever.
 */
turing.Simulator.prototype.hasStepLimit = function() {
  return this.stepLimit_ != 0;
};


/**
 * Starts running a program.
 * @param {turing.Program} program Program to run.
 * @param {turing.Tape} tape Tape for I/O.
 * @param {turing.SpeedSetting} speed How fast to run.
 * @param {function()=} opt_doneCallback Function to call when program halts or
 *     times out.
 */
turing.Simulator.prototype.run = function(program, tape, speed,
    opt_doneCallback) {
  if (this.isRunning()) {
    return;
  }
  // Start at the first instruction.
  program.setNextPos(0, 0);
  this.speeds_ = turing.SPEED_CONFIG[speed];
  this.stepCount_ = 0;
  this.runCount_ = {};
  this.stepTimerId_ = turing.anim.delay(goog.bind(this.step, this), 0);
  this.program_ = program;
  this.tape_ = tape;
  this.doneCallback_ = opt_doneCallback || null;
};


/**
 * Immediately stops running the current program, if running.
 */
turing.Simulator.prototype.stop = function() {
  if (this.stepTimerId_ != -1) {
    turing.anim.cancel(this.stepTimerId_);
  }
  this.stepTimerId_ = -1;
  this.program_ = null;
  this.tape_ = null;
  if (this.doneCallback_) {
    this.doneCallback_();
    this.doneCallback_ = null;
  }
};


/**
 * Pauses simulation: cancels the next step call, but does not reset any state.
 */
turing.Simulator.prototype.pause = function() {
  if (this.stepTimerId_ != -1) {
    turing.anim.cancel(this.stepTimerId_);
  }
  this.stepTimerId_ = -1;
  this.paused_ = true;
};


/**
 * Resumes simulation at the next step.
 */
turing.Simulator.prototype.resumeIfPaused = function() {
  if (this.paused_) {
    this.stepTimerId_ = turing.anim.delay(goog.bind(this.step, this), 0);
  }
  this.paused_ = false;
};


/**
 * Advances program simulation by one step.
 */
turing.Simulator.prototype.step = function() {
  if (!this.tape_ || !this.program_ || this.stepTimerId_ == -1) {
    return;
  }
  this.stepTimerId_ = -1;
  // Dim the current instruction and highlight the next (if not at end). Note
  // that this only changes the value of the current pos, not the next pos;
  // the next pos here is set by setNextPos from the previous call.
  this.program_.goToNextPos();
  if (this.program_.isNextPosEnd() ||
      (this.stepLimit_ > 0 && this.stepCount_ > this.stepLimit_)) {
    // Simulation stops when we try to move to an invalid position or run for
    // more than a maximum number of steps.
    // We must explicitly dim the current lit up op in case we exceeded the step
    // count (the Program object doesn't know this, so it will still be lit
    // after the goToNextPos call above.)
    this.program_.dimCurOp();
    this.stop();
    return;
  }
  if (this.stepLimit_ > 0) {
    // Only accelerate boring loops when they might be unintentional infinite
    // loops (i.e., when a step limit is set).
    this.speedUpBoringLoops_();
  }
  this.stepCount_++;
  var op = this.program_.getCurOp();
  if (op && op.charAt(0) == '*') {
    op = op.substr(1);
  }
  var implicitStep = true;  // Most ops implicitly step one position.
  // Tape ops update tape state immediately, but take speeds_.tapeTime ms
  // to animate. Spend half the total animation time setting up (erasing before
  // printing or delaying before moving) and the other half animating, so that
  // there's a delay between when the op is lit and when it seems to happen.
  var tapeWaitTime = this.speeds_.tapeTime / 2;
  var tapeExecuteTime = this.speeds_.tapeTime / 2;
  if (op == '0' || op == '1' || op == '_') {
    this.tape_.print(op, tapeWaitTime, tapeExecuteTime);
  } else if (op == 'L') {
    this.tape_.scanLeft(tapeWaitTime, tapeExecuteTime);
  } else if (op == 'R') {
    this.tape_.scanRight(tapeWaitTime, tapeExecuteTime);
  } else if (/B[2-9]/.test(op)) {
    // Regexp matches a B followed by a digit from 2 to 9, which are allowable
    // branch offsets. Normal game programs only use B2-4, but our bonus program
    // needs longer branch offsets.
    this.program_.setNextPos(this.program_.getCurTrack(),
        this.program_.getCurTrackPos() - parseInt(op.charAt(1), 10));
    implicitStep = false;
  } else if (/^D/.test(op)) {
    // 'Dx' jumps down one track if the current symbol is 'x'. 'D' by itself
    // jumps down unconditionally.
    if (op.length == 1 || this.tape_.getCurSymbol() == op.charAt(1)) {
      this.program_.setNextPos(this.program_.getCurTrack() + 1,
          this.program_.getCurTrackPos());
      implicitStep = false;
    }
  } else if (/^U/.test(op)) {
    // 'Ux' jumps up one track if the current symbol is 'x'. 'U' by itself jumps
    // up unconditionally.
    if (op.length == 1 || this.tape_.getCurSymbol() == op.charAt(1)) {
      this.program_.setNextPos(this.program_.getCurTrack() - 1,
          this.program_.getCurTrackPos());
      implicitStep = false;
    }
  }
  if (implicitStep) {
    this.program_.setNextPos(this.program_.getCurTrack(),
        this.program_.getCurTrackPos() + 1);
  }
  var stepTime = this.speeds_.stepTime;
  if (!op) {
    stepTime = this.speeds_.emptyStepTime;
  } else if (/^[UDB]/.test(op)) {
    // /^[UDB]/ matches a U, D or B at the start of op, which are branch
    // operations.
    stepTime = this.speeds_.branchTime;
  }
  this.stepTimerId_ = turing.anim.delay(goog.bind(this.step, this), stepTime);
};


/**
 * Detects if the program has gotten stuck in a boring loop, and speeds up if
 * so. A loop is "somewhat boring" when the same operation has been repeated
 * more than 4 times (since game programs are only supposed to change 5 squares
 * on the tape, this is about right), and "very boring" when it has been
 * repeated more than 6 times. This speed boost only applies to the current
 * run() call, and speeds and operation run counts are reset at the beginning of
 * the next run.
 * @private
 */
turing.Simulator.prototype.speedUpBoringLoops_ = function() {
  var pc = this.program_.getCurTrack() + ',' + this.program_.getCurTrackPos();
  var count = this.runCount_[pc] || 0;
  this.runCount_[pc] = count + 1;
  if (count > turing.VERY_BORING_REPEAT_COUNT) {
    // We have to go straight to ludicrous speed.
    this.speeds_ = turing.SPEED_CONFIG[turing.SpeedSetting.LUDICROUS];
  } else if (count > turing.SOMEWHAT_BORING_REPEAT_COUNT) {
    // This is getting boring, speed it up.
    this.speeds_ = turing.SPEED_CONFIG[turing.SpeedSetting.FAST];
  }
};
