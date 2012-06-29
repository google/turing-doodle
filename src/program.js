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
 * @fileoverview Shows Turing machine programs as rows of operations.
 * @author jered@google.com (Jered Wierzbicki)
 */

goog.provide('turing.Program');

goog.require('turing.anim');
goog.require('turing.sprites');
goog.require('turing.util');


/**
 * Number of rows of operations displayed in each mode.
 * @type {Object.<string, number>}
 * @const
 */
turing.NUM_PROGRAM_TRACKS = {
  normalMode: 2,
  bonusMode: 3
};


/**
 * Number of operations per track in each mode. Some may be blank.
 * @type {Object.<string, number>}
 * @const
 */
turing.NUM_OPS_PER_TRACK = {
  normalMode: 8,
  bonusMode: 13
};


/**
 * Left offset of program tracks.
 * @type {number}
 * @const
 */
turing.TRACK_LEFT = 74;


/**
 * Width of a bonus mode track. As wide as the doodle will allow.
 * @type {number}
 * @const
 */
turing.BONUS_TRACK_WIDTH = 500;


/**
 * Center vertical offsets of the buttons for each track.
 * @type {Array.<number>}
 * @const
 * @private
 */
turing.TRACK_BUTTON_VERTICAL_MIDDLE_ = [150, 194];


/**
 * Center vertical offsets of the buttons for each track in bonus mode.
 * @type {Array.<number>}
 * @const
 * @private
 */
turing.BONUS_TRACK_BUTTON_VERTICAL_MIDDLE_ = [100, 140, 180];


/**
 * Delay in ms for an op button to push in when pressed.
 * This ought to be short because the user has already done something.
 * @type {number}
 * @const
 */
turing.OP_PUSH_IN_DELAY = 20;


/**
 * Delay in ms for an op button to pop out when released.
 * @type {number}
 * @const
 */
turing.OP_POP_OUT_DELAY = 20;


/**
 * Pixels of padding left of the first circle on the track. This is subtracted
 * from total track width so that circles are centered in the non-padding area.
 * @type {number}
 * @const
 */
turing.TRACK_LEFT_PAD = 31;


/**
 * Pixels of padding right of the last circle on the track. This is subtracted
 * from total track width so that circles are centered in the non-padding area.
 * @type {number}
 * @const
 */
turing.TRACK_RIGHT_PAD = 9;


/**
 * Pixels of padding top above the track in the track image.
 * @type {number}
 * @const
 */
turing.TRACK_TOP_PAD = 4;


/**
 * The number of operations per program track in the current mode.
 * @type {number}
 * @private
 */
turing.numOpsPerTrack_ = turing.NUM_OPS_PER_TRACK.normalMode;


/**
 * The number of program tracks in the current mode.
 * @type {number}
 * @private
 */
turing.numTracks_ = turing.NUM_PROGRAM_TRACKS.normalMode;


/**
 * True if the game is done and we are running in bonus mode, else false if we
 * are in the normal mode.
 * @type {boolean}
 * @private
 */
turing.inBonusMode_ = false;


/**
 * Sets up program display for bonus mode.
 */
turing.switchProgramsToBonusMode = function() {
  turing.inBonusMode_ = true;
  turing.numTracks_ = turing.NUM_PROGRAM_TRACKS.bonusMode;
  turing.numOpsPerTrack_ = turing.NUM_OPS_PER_TRACK.bonusMode;
};


/**
 * Sets up program display for normal mode.
 */
turing.switchProgramsToNormalMode = function() {
  turing.inBonusMode_ = false;
  turing.numTracks_ = turing.NUM_PROGRAM_TRACKS.normalMode;
  turing.numOpsPerTrack_ = turing.NUM_OPS_PER_TRACK.normalMode;
};


/**
 * The current op highlight color.
 * @type {string}
 * @private
 */
turing.opHighlightColor_ = 'y';


/**
 * Sets the op highlight color.
 * @param {string} color One of 'b', 'r', 'y', 'g' to set the hilight color.
 */
turing.setOpHighlightColor = function(color) {
  if (/^[bryg]$/.test(color)) {
    // The color is valid.
    turing.opHighlightColor_ = color;
  } else {
    // Invalid color. Shouldn't happen. Fall back to yellow.
    turing.opHighlightColor_ = 'y';
  }
};


/**
 * @return {boolean} True iff program display is in bonus mode.
 */
turing.isInBonusMode = function() {
  return turing.inBonusMode_;
};


/**
 * A primitive step a program can do in one movement of the program counter.
 * @typedef {string}
 */
turing.Op;


/**
 * Map from operation strings used in stored programs to sprite names.
 * @type {Object.<turing.Op, string>}
 * @const
 */
turing.OP_SPRITES = {
  'L': 'o-left',
  'R': 'o-right',
  '0': 'o-print0',
  '1': 'o-print1',
  'D0': 'o-down0',
  'D1': 'o-down1',
  'D_': 'o-down_',
  'B2': 'o-back2',
  'B3': 'o-back3',
  'B4': 'o-back4',
  'RB2': 'o-rback2',
  'RB3': 'o-rback3',
  'RB4': 'o-rback4',
  'U0': 'o-up0',
  'U1': 'o-up1',
  'U_': 'o-up_',
  '': 'o-blank',
  // These operations are in the same spirit as the ones above, but are only
  // used in bonus mode, and are not part of normal gameplay.
  '_': 'o-x',
  'U': 'o-blank-up',
  'D': 'o-blank-down',
  'B8': 'o-back8',
  'B9': 'o-back9'
};



/**
 * A track is a row of program operations arranged from left to right in control
 * flow order.
 * @param {number} verticalPosition The vertical offset of the track center.
 * @param {boolean} loopTracksDown Iff true, the loop track points down, else
 *     up.
 * @constructor
 */
turing.Track = function(verticalPosition, loopTracksDown) {
  /**
   * The vertical offset of the middle of this track.
   * @type {number}
   * @private
   */
  this.verticalPosition_ = verticalPosition;

  /**
   * Iff true, loop branch tracks go down from the track, else up.
   * @type {boolean}
   * @private
   */
  this.loopTracksDown_ = loopTracksDown;

  /**
   * This track's ops.
   * @type {Array.<turing.Op>}
   */
  this.ops = [];

  /**
   * Holds the track and operation divs.
   * @type {Element}
   * @private
   */
  this.container_;

  /**
   * Divs for each operation on this track.
   * @type {Array.<Element>}
   * @private
   */
  this.opDivs_ = [];

  /**
   * A div showing the path of the first loop branch on this track.
   * @type {Element}
   * @private
   */
  this.loopBranchDiv_;

  /**
   * Index of the operation which is a loop branch, or null if none.
   * @type {?number}
   * @private
   */
  this.loopBranchIndex_ = null;

  /**
   * Mousedown handlers for operation circles.
   * @type {Array.<Function>}
   * @private
   */
  this.opMouseDownHandlers_ = [];

  /**
   * Touchstart handlers for operation circles.
   * @type {Array.<Function>}
   * @private
   */
  this.opTouchHandlers_ = [];

  /**
   * Mouseup handlers for operation circles.
   * @type {Array.<Function>}
   * @private
   */
  this.opMouseUpHandlers_ = [];

  /**
   * Mouseout handlers for operation circles.
   * @type {Array.<Function>}
   * @private
   */
  this.opMouseOutHandlers_ = [];

  /**
   * Whether each operation is pushed in.
   * @type {Array.<boolean>}
   * @private
   */
  this.opPushedIn_ = [];

  /**
   * Iff true, operations on this track are currently hidden.
   * @type {boolean}
   * @private
   */
  this.hidden_ = true;

  /**
   * If true, listen to clicks on operations, else ignore them.
   * @type {boolean}
   * @private
   */
  this.interactive_ = false;
};


/**
 * Creates DOM elements for the track and its operations.
 * - container: An overflow:hidden wrapper to hold everything.
 * -- trackDiv: A vertically centered horizontal line (i.e. the track)
 * -- ...ops: Individual ops, centered in equal-sized regions of track.
 */
turing.Track.prototype.create = function() {
  // Size container based on interactive state, which is larger.
  var opSize = turing.sprites.getSize('o-blank-i');
  var trackSize = turing.sprites.getSize('track');
  if (turing.inBonusMode_) {
    trackSize.width = turing.BONUS_TRACK_WIDTH;
  }
  this.container_ = turing.sprites.getEmptyDiv();
  this.container_.style.width = trackSize.width + 'px';
  this.container_.style.height = opSize.height + 'px';
  this.container_.style.zIndex = 400;
  for (var i = 0; i < turing.numOpsPerTrack_; i++) {
    this.createOp_(i);
  }
  if (!turing.inBonusMode_) {
    var loopBranchTrackSize = turing.sprites.getSize('track-l4');
    this.loopBranchDiv_ = turing.sprites.getDiv('track-l4');
    this.loopBranchDiv_.style.display = 'none';
    this.loopBranchDiv_.style.top = this.verticalPosition_ + 'px';
  }
  this.container_.style.zIndex = 399;  // Beneath buttons.
  this.container_.style.top =
      (this.verticalPosition_ - opSize.height / 2) + 'px';
  this.container_.style.left = turing.inBonusMode_ ?
      '0' : turing.TRACK_LEFT + 'px';
};


/**
 * Creates a single operation div and binds a lot of event listeners on it.
 * @param {number} i The index of the operation to create.
 * @private
 */
turing.Track.prototype.createOp_ = function(i) {
  this.opDivs_[i] = turing.sprites.getDiv('o-dim-s');
  var pos = this.getOpPosition('o-blank-s', i);
  this.opDivs_[i].style.left = pos.left + 'px';
  this.opDivs_[i].style.top = pos.top + 'px';
  if (!turing.inBonusMode_) {
    this.opMouseDownHandlers_[i] = goog.bind(this.pushInOp, this, i);
    this.opTouchHandlers_[i] = goog.bind(function() {
      this.opPushedIn_[i] = true;
      this.popOutOp(i, true);
    }, this);
    this.opMouseUpHandlers_[i] = goog.bind(this.popOutOp, this, i, true);
    this.opMouseOutHandlers_[i] = goog.bind(this.popOutOp, this, i, false);
    turing.util.listen(this.opDivs_[i], 'mousedown',
        this.opMouseDownHandlers_[i]);
    turing.util.listen(this.opDivs_[i], 'touchstart',
        this.opTouchHandlers_[i]);
    turing.util.listen(this.opDivs_[i], 'mouseup', this.opMouseUpHandlers_[i]);
    turing.util.listen(this.opDivs_[i], 'mouseout',
        this.opMouseOutHandlers_[i]);
  }
  this.opPushedIn_[i] = false;
  this.container_.appendChild(this.opDivs_[i]);
};


/**
 * Computes the offset of an operation inside the track's container div.
 * @param {string} spriteName The sprite used for this operation.
 * @param {number} i The index of the operation.
 * @return {{top: number, left: number}} The position for this operation.
 */
turing.Track.prototype.getOpPosition = function(spriteName, i) {
  // Interactive operations are bigger than static operations. The track is
  // sized to hold the bigger ones, and we center the smaller ones in the same
  // footprint.
  var bigOpSize = turing.sprites.getSize('o-blank-i');
  var trackSize = turing.sprites.getSize('track');
  if (turing.inBonusMode_) {
    trackSize.width = turing.BONUS_TRACK_WIDTH;
  }
  // Center the bonus mode on the track (use the same padding as we do on the
  // right, plus a few px to look correct).
  var leftPadding = turing.inBonusMode_ ?
      turing.TRACK_RIGHT_PAD + 4 : turing.TRACK_LEFT_PAD;
  var trackWidthPerOp = (trackSize.width - turing.TRACK_RIGHT_PAD -
      leftPadding) / turing.numOpsPerTrack_;
  var opSize = turing.sprites.getSize(spriteName);
  var xOffs = Math.ceil((bigOpSize.width - opSize.width) / 2);
  var yOffs = Math.ceil((bigOpSize.height - opSize.height) / 2);
  return { left: (leftPadding + Math.floor(i * trackWidthPerOp +
          trackWidthPerOp / 2 - opSize.width / 2) - xOffs),
           top: yOffs };
};


/**
 * Sets a flag indicating whether operations on this track are currently hidden.
 * If hidden, op divs are not redrawn as program execution proceeds.
 * @param {boolean} hidden True iff op divs are hidden.
 */
turing.Track.prototype.setHidden = function(hidden) {
  this.hidden_ = hidden;
};


/**
 * Sets whether the track is currently clickable.
 * No operations on the track should respond to clicks when a program is
 * running or when we are changing programs.
 * @param {boolean} interactive True iff track should be interactive.
 */
turing.Track.prototype.setInteractive = function(interactive) {
  this.interactive_ = interactive;
  this.redrawProgram();
};


/**
 * Gets the ith operation div in control flow order on a track.
 * @param {number} i Index into operations.
 * @return {Element} The operation div.
 */
turing.Track.prototype.getOpDiv = function(i) {
  return this.opDivs_[i];
};


/**
 * Gets the ith operation in control flow order on a track.
 * @param {number} i Index into operations.
 * @return {turing.Op} The operation.
 */
turing.Track.prototype.getOp = function(i) {
  return this.ops[i];
};


/**
 * Sets the value of the ith operation in control flow order on track.
 * @param {number} i Index into operations.
 * @param {turing.Op} value Desired value.
 */
turing.Track.prototype.setOp = function(i, value) {
  this.ops[i] = value;
};


/**
 * Conditional branch operations from a higher track to a lower one.
 * @type {Array.<turing.Op>}
 * @private
 * @const
 */
turing.COND_BRANCH_DOWN_OPS_ = ['D0', 'D1', 'D_'];


/**
 * Conditional branch operations from a lower track to a higher one.
 * @type {Array.<turing.Op>}
 * @private
 * @const
 */
turing.COND_BRANCH_UP_OPS_ = ['U0', 'U1', 'U_'];


/**
 * Loop branch operations.
 * @type {Array.<turing.Op>}
 * @private
 * @const
 */
turing.LOOP_BRANCH_OPS_ = ['B2', 'B3', 'B4'];


/**
 * Printing operations.
 * @type {Array.<turing.Op>}
 * @private
 * @const
 */
turing.PRINT_OPS_ = ['0', '1'];


/**
 * Tape movement operations.
 * @type {Array.<turing.Op>}
 * @private
 * @const
 */
turing.MOVE_OPS_ = ['L', 'R'];


/**
 * Cycle to next valid op in this op's group.
 * @param {number} i Index of relevant op.
 */
turing.Track.prototype.cycleOp = function(i) {
  if (!this.interactive_) {
    return;
  }
  var op = this.getOp(i);
  if (!op || op.charAt(0) != '*') {
    // This operation is not clickable.
    return;
  }
  op = op.substr(1);
  this.setOp(i, '*' + (
      turing.util.getNextValue(turing.COND_BRANCH_UP_OPS_, op) ||
      turing.util.getNextValue(turing.COND_BRANCH_DOWN_OPS_, op) ||
      turing.util.getNextValue(turing.LOOP_BRANCH_OPS_, op) ||
      turing.util.getNextValue(turing.PRINT_OPS_, op) ||
      turing.util.getNextValue(turing.MOVE_OPS_, op) || op));
};


/**
 * Push in an op button.
 * @param {number} i Index of the relevant op.
 * @param {Event} event mousedown or touchstart event.
 */
turing.Track.prototype.pushInOp = function(i, event) {
  var spec = this.getOp(i);
  if (!this.interactive_ || !spec || spec.charAt(0) != '*' ||
      this.opPushedIn_[i]) {
    // The button might still be pushed in if the pop-out animation from a
    // previous click is still playing.
    return;
  }
  this.opPushedIn_[i] = true;
  var baseName = turing.Track.prototype.getOpSpriteBaseName_(spec);
  turing.anim.animateFromSprites(this.opDivs_[i],
      [baseName + '-i-out', baseName + '-i', baseName + '-i-in'],
      turing.OP_PUSH_IN_DELAY);
};


/**
 * Pop out an op button.
 * @param {number} i Index of the relevant op.
 * @param {boolean} shouldChange True iff we should cycle the op button.
 * @param {Event} event mouseup or mouseout event.
 */
turing.Track.prototype.popOutOp = function(i, shouldChange, event) {
  var spec = this.getOp(i);
  if (!this.interactive_ || !spec || spec.charAt(0) != '*' ||
      !this.opPushedIn_[i]) {
    return;
  }
  if (shouldChange) {
    this.cycleOp(i);
  }
  spec = this.getOp(i);
  var baseName = turing.Track.prototype.getOpSpriteBaseName_(spec);
  turing.anim.animateFromSprites(this.opDivs_[i],
      [baseName + '-i-in', baseName + '-i', baseName + '-i-out'],
      turing.OP_POP_OUT_DELAY,
      goog.bind(function(i) {
        this.opPushedIn_[i] = false;
        this.redrawOp(i, false);
      }, this, i));
};


/**
 * Gets the base name of the sprite for the given operation.
 * @param {string} spec An operation spec like D_.
 * @return {string} The name of the sprite with no suffixes.
 * @private
 */
turing.Track.prototype.getOpSpriteBaseName_ = function(spec) {
  if (spec && spec.charAt(0) == '*') {
    spec = spec.substr(1);
  }

  if (this.loopTracksDown_ &&
      (spec == 'B2' || spec == 'B3' || spec == 'B4')) {
    // Appending R reverses the direction of the loop so that it looks like it's
    // pointing down to the lower track loop.
    spec = 'R' + spec;
  }
  return turing.OP_SPRITES[spec || ''];
};


/**
 * Sets the track's abstract operations, without updating or showing it.
 * Makes a copy of the given array so that it can be changed without changing
 * a constant program definition.
 * @param {Array.<turing.Op>} ops Program operations.
 */
turing.Track.prototype.setOps = function(ops) {
  this.ops = ops.slice(0);  // Copy ops.
  this.loopBranchIndex_ = null;
  for (var i = 0; i < this.ops.length; i++) {
    if (this.ops[i] && this.ops[i].match(/B/)) {
      // /B/ matches operation codes containing B. Loop branches are the only
      // such operations so this is a loop branch.
      this.loopBranchIndex_ = i;
      break;
    }
  }
};


/**
 * Changes the operations on a track (and animates it into its new state).
 * @param {Array.<turing.Op>} ops A list of new operations.
 */
turing.Track.prototype.change = function(ops) {
  this.setOps(ops);
  this.redrawProgram();
};


/**
 * Redraws the current program.
 */
turing.Track.prototype.redrawProgram = function() {
  if (!turing.inBonusMode_ && this.loopBranchIndex_ == null) {
    // If there is no loop branch, hide backwards pointing track.
    // (If there is a loop branch, it'll be shown from redrawOp below.)
    this.loopBranchDiv_.style.display = 'none';
  }
  for (var i = 0; i < turing.numOpsPerTrack_; i++) {
    this.redrawOp(i, false);
  }
};


/**
 * Updates the sprite for an operation.
 * @param {number} i The index of the operation on the track.
 * @param {boolean} lit Whether the operation is currently active.
 */
turing.Track.prototype.redrawOp = function(i, lit) {
  if (this.hidden_) {
    return;
  }
  var opDiv = this.getOpDiv(i);
  var spec = this.getOp(i) || '';
  var suffix = '';
  if (spec && spec.charAt(0) == '*') {
    // * means the operation is clickable.
    if (this.interactive_) {
      if (this.opPushedIn_[i]) {
        suffix = '-i-in';
      } else {
        suffix = '-i-out';
      }
      opDiv.style.cursor = 'pointer';
    } else {
      // The operation is clickable, but not right now. It should be flat.
      suffix = lit ? '-i-lit' : '-i';
      opDiv.style.cursor = 'default';
    }
  } else {
    // The operation is never clickable.
    suffix = lit ? '-s-lit-' + turing.opHighlightColor_ : '-s';
    opDiv.style.cursor = 'default';
  }
  var spriteName = this.getOpSpriteBaseName_(spec);
  var size = turing.sprites.getSize(spriteName + suffix);
  opDiv.style.background = turing.sprites.getBackground(
      spriteName + suffix);
  // Interactive buttons are bigger than static buttons, so we may need to
  // recenter the button.
  var pos = this.getOpPosition(spriteName + suffix, i);
  opDiv.style.left = pos.left + 'px';
  opDiv.style.top = pos.top + 'px';
  opDiv.style.width = size.width + 'px';
  opDiv.style.height = size.height + 'px';
  if (i == this.loopBranchIndex_) {
    this.redrawLoopBranchTrack_(spriteName + suffix);
  }
};


/**
 * Redraws the segment showing the path for a loop branch on this track.
 * @param {string} opSpriteName The sprite name for the loop branch operation
 *     where the segment begins.
 * @private
 */
turing.Track.prototype.redrawLoopBranchTrack_ = function(opSpriteName) {
  if (this.loopBranchIndex_ == null || turing.inBonusMode_) {
    return;
  }
  var spec = this.getOp(this.loopBranchIndex_);
  // /(\d)$/ extracts the last single digit in the operation code, which for
  // branches is the number of states to branch back (i.e. the distance).
  var branchDist = spec.match(/(\d)$/);
  var opSize = turing.sprites.getSize(opSpriteName);
  var pos = this.getOpPosition(opSpriteName, this.loopBranchIndex_);
  var loopBranchSprite = 'track-' + (this.loopTracksDown_ ? 'l' : 'u') +
      branchDist[1];
  var loopBranchSize = turing.sprites.getSize(loopBranchSprite);
  this.loopBranchDiv_.style.background = turing.sprites.getBackground(
      loopBranchSprite);
  this.loopBranchDiv_.style.left = Math.floor(turing.TRACK_LEFT + pos.left -
      loopBranchSize.width + opSize.width / 2 + 4) + 'px';

  var middleOfButtons = this.verticalPosition_;
  // For the top loop, its bottom should be aligned with the middle of the
  // buttons.
  var yOffs = this.loopTracksDown_ ? -3 : (-loopBranchSize.height + 2);
  this.loopBranchDiv_.style.top = Math.floor(middleOfButtons + yOffs) + 'px';
  this.loopBranchDiv_.style.width = loopBranchSize.width + 'px';
  this.loopBranchDiv_.style.height = loopBranchSize.height + 'px';
  this.loopBranchDiv_.style.display = 'block';
};


/**
 * Since we're a touch device, destroy mouse handlers.
 */
turing.Track.prototype.setTouchDevice = function() {
  this.destroyEventHandlers_(true);
};


/**
 * Destroy the event handlers.  Optionally save the touch events.  This allows
 * us to kill the mouse handlers if we're on a touch device.  Note that we
 * lazily check if we're a touch device by waiting for a touchstart event in
 * turing.js rather than doing useragent parsing.
 * @param {boolean=} opt_saveTouch Whether to preserve touch event handlers.
 * @private
 */
turing.Track.prototype.destroyEventHandlers_ = function(opt_saveTouch) {
  for (var i = 0; i < this.opMouseDownHandlers_.length; i++) {
    turing.util.unlisten(this.opDivs_[i], 'mousedown',
        this.opMouseDownHandlers_[i]);
  }
  this.opMouseDownHandlers_.splice(0);

  if (!opt_saveTouch) {
    for (var i = 0; i < this.opTouchHandlers_.length; i++) {
      turing.util.unlisten(this.opDivs_[i], 'touchstart',
                           this.opTouchHandlers_[i]);
    }
    this.opTouchHandlers_.splice(0);
  }

  for (var i = 0; i < this.opMouseUpHandlers_.length; i++) {
    turing.util.unlisten(this.opDivs_[i], 'mouseup',
        this.opMouseUpHandlers_[i]);
  }
  this.opMouseUpHandlers_.splice(0);

  for (var i = 0; i < this.opMouseOutHandlers_.length; i++) {
    turing.util.unlisten(this.opDivs_[i], 'mouseout',
        this.opMouseOutHandlers_[i]);
  }
  this.opMouseOutHandlers_.splice(0);
};


/**
 * Cleans up dom elements and removes event listeners.
 */
turing.Track.prototype.destroy = function() {
  this.destroyEventHandlers_();
  for (var i = 0; i < this.opDivs_.length; i++) {
    turing.util.removeNode(this.opDivs_[i]);
  }
  this.opDivs_.splice(0);
  turing.util.removeNode(this.container_);
  this.container_ = null;
  turing.util.removeNode(this.loopBranchDiv_);
  this.loopBranchDiv_ = null;
};


/**
 * Adds to dom.
 * @param {Element} elem dom parent.
 */
turing.Track.prototype.attachTo = function(elem) {
  elem.appendChild(this.container_);
  if (this.loopBranchDiv_) {
    // Not shown in bonus mode.
    elem.appendChild(this.loopBranchDiv_);
  }
};



/**
 * A Turing machine program shown as a set of tracks.
 * @constructor
 */
turing.Program = function() {
  /**
   * Tracks containing operations.
   * @type {Array.<turing.Track>}
   * @private
   */
  this.tracks_ = [];
  for (var i = 0; i < turing.numTracks_; i++) {
    this.tracks_[i] = new turing.Track(turing.inBonusMode_ ?
        turing.BONUS_TRACK_BUTTON_VERTICAL_MIDDLE_[i] :
        turing.TRACK_BUTTON_VERTICAL_MIDDLE_[i], i == 1);
  }


  /**
   * The div containing the track image.
   * @type {Element}
   * @private
   */
  this.trackDiv_;

  /**
   * Pieces of track joining the top track to the bottom track.
   * @type {Array.<Element>}
   * @private
   */
  this.trackDescenders_ = [];

  /**
   * How many tracks does the current program have?
   * @type {number}
   * @private
   */
  this.numActiveTracks_ = 0;

  /**
   * The current hilit operation's track number.
   * @type {number}
   * @private
   */
  this.curTrack_ = 0;

  /**
   * The current hilit operation's position on its track.
   * @type {number}
   * @private
   */
  this.curTrackPos_ = 0;

  /**
   * The next operation's track number.
   * @type {number}
   * @private
   */
  this.nextTrack_ = 0;

  /**
   * The next operation's position on its track.
   * @type {number}
   * @private
   */
  this.nextTrackPos_ = 0;

  /**
   * True iff the program should end on the next operation.
   * @type {boolean}
   * @private
   */
  this.nextPosIsEnd_ = true;

  /**
   * Are the program's operations hidden?
   * @type {boolean}
   * @private
   */
  this.hidden_ = true;

  /**
   * Can the user click on clickable operations right now?
   * @type {boolean}
   * @private
   */
  this.interactive_ = false;
};


/**
 * Creates dom elements for the program display.
 */
turing.Program.prototype.create = function() {
  for (var i = 0; i < this.tracks_.length; i++) {
    this.tracks_[i].create();
  }
  if (!turing.inBonusMode_) {
    var opSize = turing.sprites.getSize('o-blank-i');
    var middleOfTopTrack = turing.TRACK_BUTTON_VERTICAL_MIDDLE_[0];
    this.trackDiv_ = turing.sprites.getDiv('track');
    this.trackDiv_.style.left = turing.TRACK_LEFT + 'px';
    this.trackDiv_.style.top = middleOfTopTrack - turing.TRACK_TOP_PAD + 'px';

    // Bonus mode has no lines between tracks (they don't really fit).
    var trackDownSize = turing.sprites.getSize('track-vert');
    var trackSize = turing.sprites.getSize('track');
    var trackWidthPerOp = (trackSize.width - turing.TRACK_LEFT_PAD -
        turing.TRACK_RIGHT_PAD) / turing.numOpsPerTrack_;
    for (var i = 0; i < turing.numOpsPerTrack_; i++) {
      this.trackDescenders_[i] = turing.sprites.getDiv('track-vert');
      // Vertical lines between operations on a pair of tracks are centered
      // beneath those operations.
      this.trackDescenders_[i].style.left = Math.floor(turing.TRACK_LEFT_PAD +
          turing.TRACK_LEFT + i * trackWidthPerOp + trackWidthPerOp / 2 -
          trackDownSize.width / 2 - 1) + 'px';
      this.trackDescenders_[i].style.top = middleOfTopTrack + 'px';
      this.trackDescenders_[i].style.zIndex = 398;  // Behind operations.
      this.trackDescenders_[i].style.display = 'none';
    }
  }
};


/**
 * Cleans up dom elements and event listeners.
 */
turing.Program.prototype.destroy = function() {
  for (var i = 0; i < this.tracks_.length; i++) {
    this.tracks_[i].destroy();
  }
  turing.util.removeNode(this.trackDiv_);

  for (var i = 0; i < this.trackDescenders_.length; i++) {
    turing.util.removeNode(this.trackDescenders_[i]);
  }
  this.trackDescenders_.splice(0);
};


/**
 * Attaches dom nodes beneath elem.
 * @param {Element} elem Parent.
 */
turing.Program.prototype.attachTo = function(elem) {
  for (var i = 0; i < this.tracks_.length; i++) {
    this.tracks_[i].attachTo(elem);
  }
  if (!turing.inBonusMode_) {
    // Bonus mode doesn't have track lines.
    elem.appendChild(this.trackDiv_);

    for (var i = 0; i < this.trackDescenders_.length; i++) {
      elem.appendChild(this.trackDescenders_[i]);
    }
  }
};


/**
 * Dims any lit operations.
 */
turing.Program.prototype.reset = function() {
  for (var i = 0; i < turing.numTracks_; i++) {
    this.tracks_[i].redrawProgram();
  }
  if (!turing.inBonusMode_) {
    this.redrawDescenders_();
  }
};


/**
 * Draws lines connecting the tracks wherever there are up or down operations.
 * @private
 */
turing.Program.prototype.redrawDescenders_ = function() {
  for (var i = 0; i < turing.numOpsPerTrack_; i++) {
    this.trackDescenders_[i].style.background =
        turing.sprites.getBackground('track-vert');
    var hasBranch = false;
    for (var j = 0; j < turing.numTracks_; j++) {
      var spec = this.tracks_[j].getOp(i);
      if (!this.hidden_ && spec && spec.match(/D|U/)) {
        // /D|U/ matches any conditional down-if or up-if branches (those are
        // the only operations which contain 'D' or 'U').
        hasBranch = true;
      }
    }
    this.trackDescenders_[i].style.display = hasBranch ? 'block' : 'none';
  }
};


/**
 * Changes to a new program.
 * @param {Array.<Array.<turing.Op>>} trackOps The operations for each
 *     valid program track. Note: This code supports 1 or 2 track programs.
 * @param {boolean=} opt_hidden Iff true, change the program contents, but
 *     keep tracks hidden.
 */
turing.Program.prototype.change = function(trackOps, opt_hidden) {
  this.curTrack_ = 0;
  this.curTrackPos_ = 0;
  this.nextTrack_ = 0;
  this.nextTrackPos_ = 0;
  this.nextPosIsEnd_ = false;
  this.hidden_ = opt_hidden || false;
  this.numActiveTracks_ = trackOps.length;
  for (var i = 0; i < turing.numTracks_; i++) {
    this.tracks_[i].setOps(trackOps[i] || []);
    this.tracks_[i].setHidden(opt_hidden || false);
  }
  this.reset();
};


/**
 * Sets whether program tracks are currently accepting clicks.
 * @param {boolean} interactive True iff tracks should accept clicks.
 */
turing.Program.prototype.setInteractive = function(interactive) {
  this.interactive_ = interactive;
  for (var i = 0; i < turing.numTracks_; i++) {
    this.tracks_[i].setInteractive(interactive);
  }
};


/**
 * Gets the current track number.
 * @return {number} Current instruction's track.
 */
turing.Program.prototype.getCurTrack = function() {
  return this.curTrack_;
};


/**
 * Gets the current position on the current track.
 * @return {number} Current instruction's op index within track.
 */
turing.Program.prototype.getCurTrackPos = function() {
  return this.curTrackPos_;
};


/**
 * @return {boolean} True iff next position is past end of program.
 */
turing.Program.prototype.isNextPosEnd = function() {
  return this.nextPosIsEnd_;
};


/**
 * Sets the track and position for the next operation to be run. Stays put if
 * the new position is not a valid program position.
 * @param {number} track The new track.
 * @param {number} pos The new position.
 */
turing.Program.prototype.setNextPos = function(track, pos) {
  if (track >= 0 && track < this.numActiveTracks_ &&
      pos >= 0 && pos < turing.numOpsPerTrack_) {
    this.nextTrack_ = track;
    this.nextTrackPos_ = pos;
    this.nextPosIsEnd_ = false;
  } else {
    this.nextPosIsEnd_ = true;
  }
};


/**
 * Sets the current position to the next position and redraws highlights.
 */
turing.Program.prototype.goToNextPos = function() {
  this.dimCurOp();
  if (!this.nextPosIsEnd_) {
    this.curTrack_ = this.nextTrack_;
    this.curTrackPos_ = this.nextTrackPos_;
    this.lightCurOp_();
  }
};


/**
 * Dims the current active program operation.
 */
turing.Program.prototype.dimCurOp = function() {
  this.tracks_[this.curTrack_].redrawOp(this.curTrackPos_, false);
};


/**
 * Highlights the current active program operation.
 * @private
 */
turing.Program.prototype.lightCurOp_ = function() {
  this.tracks_[this.curTrack_].redrawOp(this.curTrackPos_, true);
};


/**
 * Gets the current program operation to execute.
 * @return {turing.Op} The current operation.
 */
turing.Program.prototype.getCurOp = function() {
  return this.tracks_[this.curTrack_].getOp(this.curTrackPos_);
};


/**
 * Notify the tracks that we're on a tablet.
 */
turing.Program.prototype.setTouchDevice = function() {
  for (var i = 0; i < turing.numTracks_; i++) {
    this.tracks_[i].setTouchDevice();
  }
};
