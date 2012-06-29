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
 * @fileoverview Animates a Turing machine tape.
 * @author jered@google.com (Jered Wierzbicki)
 */

goog.require('turing.anim');
goog.require('turing.sprites');
goog.require('turing.util');

goog.provide('turing.Tape');


/**
 * How many squares of the tape are visible.
 * Should be odd so that the read/write head is centered.
 * @type {number}
 * @const
 */
turing.NUM_VISIBLE_SQUARES = 9;


/**
 * How many squares of the tape are left of the read/write head.
 * @type {number}
 * @const
 */
turing.NUM_VISIBLE_LEFT_SQUARES = (turing.NUM_VISIBLE_SQUARES - 1) / 2;


/**
 * How many squares of the tape are right of the read/write head and may
 * scroll into view.  Note that this is the number currently visible plus
 * up to target.length (5) extra squares.  This is because when we check for
 * equality, we start at the beginning of the string and scrollRight until we've
 * reached the end of the string, possibly revealing an extra 5 squares.
 * @type {number}
 * @const
 */
turing.NUM_VISIBLE_RIGHT_SQUARES = (turing.NUM_VISIBLE_SQUARES - 1) / 2 + 5;


/**
 * Number of extra squares to draw left and right of the fully visible tape
 * squares. This must be at least two, since we show part of the left neighbor
 * of the leftmost square while scanning right.
 * @type {number}
 * @const
 */
turing.NUM_MARGIN_SQUARES = 2;


/**
 * How many total squares are on screen, visible or in the margins?
 * @type {number}
 * @const
 */
turing.NUM_SQUARES = turing.NUM_VISIBLE_SQUARES + 2 * turing.NUM_MARGIN_SQUARES;


/**
 * The index of the tape square div under the read/write head when the tape is
 * stationary. When the tape moves, this div slides left or right, then pops
 * back into its original position showing a new symbol.
 * @type {number}
 * @const
 */
turing.HEAD_SQUARE = turing.NUM_MARGIN_SQUARES +
    turing.NUM_VISIBLE_LEFT_SQUARES;


/**
 * Z-index of the tape squares.
 * @type {number}
 * @const
 */
turing.SQUARE_ZINDEX = 400;


/**
 * Left offset for the tape.
 * @type {number}
 * @const
 */
turing.TAPE_LEFT = 63;


/**
 * Top offset for the tape.
 * @type {number}
 * @const
 */
turing.TAPE_TOP = 74;


/**
 * How many pixels of the tape to either side of the visible portion are
 * partially visible through the slot.
 * @type {number}
 * @const
 */
turing.VISIBLE_FEED_WIDTH = 7;


/**
 * Height of the shadow at the bottom of the tape.
 * @type {number}
 * @const
 */
turing.TAPE_SHADOW_HEIGHT = 4;


/**
 * Duration in ms of scan animation when tape is seeking.
 * @type {number}
 * @const
 */
turing.SEEK_MS = 50;


/**
 * Map from tape symbol to its sprite name.
 * @type {Object.<string, string>}
 * @const
 */
turing.TAPE_SYMBOLS = {
  '': 'tape_', '_': 'tape_', ' ': 'tape_',
  '0': 'tape0', '1': 'tape1'
};


/**
 * Sprite sequences to animate symbols being printed.
 * @type {Object.<string, Array.<string>>}
 * @const
 */
turing.PRINT_ANIMATIONS = {
  '0': ['tape_', 'tape0a', 'tape0b', 'tape0c', 'tape0d', 'tape0'],
  '1': ['tape_', 'tape1a', 'tape1b', 'tape1c', 'tape1d', 'tape1']
};


/**
 * Sprite sequences to animate symbols being erased.
 * @type {Object.<string, Array.<string>>}
 * @const
 */
turing.ERASE_ANIMATIONS = {
  '0': turing.PRINT_ANIMATIONS['0'].slice(0).reverse(),
  '1': turing.PRINT_ANIMATIONS['1'].slice(0).reverse()
};



/**
 * A Turing machine tape.
 * @constructor
 */
turing.Tape = function() {
  /**
   * The symbols currently on the tape.
   * @type {Object.<number, string>}
   * @private
   */
  this.contents_ = {};

  /**
   * The position of the read/write head.
   * @type {number}
   * @private
   */
  this.pos_ = 0;

  /**
   * The maximum written tape position.
   * @type {number}
   * @private
   */
  this.maxWrittenPosition_ = 0;

  /**
   * The location on the tape that the current program started from.
   * @type {number}
   * @private
   */
  this.lastStartPos_ = 0;

  /**
   * Divs for each visible tape square plus one off each edge.
   * @type {Array.<Element>}
   * @private
   */
  this.squares_ = [];

  /**
   * A div that holds all the square divs. It is wider than the pane.
   * @type {Element}
   * @private
   */
  this.squareHolder_;

  /**
   * A div which the square holder moves around inside.
   * @type {Element}
   * @private
   */
  this.pane_;

  /**
   * A div representing the read/write head.
   * @type {Element}
   * @private
   */
  this.readWriteHead_;

  /**
   * A div holding the tape squares and head.
   * @type {Element}
   * @private
   */
  this.tapeDiv_;

  /**
   * A div showing the hole where the left of the tape emerges.
   * @type {Element}
   * @private
   */
  this.slotLeft_;

  /**
   * A div showing the hole where the right of the tape emerges.
   * @type {Element}
   * @private
   */
  this.slotRight_;

  /**
   * A div with a shadow to show over the left of the tape.
   * @type {Element}
   * @private
   */
  this.shadowLeft_;

  /**
   * A div with a shadow to show over the right of the tape.
   * @type {Element}
   * @private
   */
  this.shadowRight_;

  /**
   * Position currently seeking to, or null if none.
   * @type {?number}
   * @private
   */
  this.seekPos_ = null;

  /**
   * Is the tape currently scanning left or right?
   * @type {boolean}
   * @private
   */
  this.scanning_ = false;
};


/**
 * Attaches tape DOM tree to element.
 * @param {Element} elem The parent for the tape.
 */
turing.Tape.prototype.attachTo = function(elem) {
  this.redrawTape_();
  elem.appendChild(this.tapeDiv_);
  elem.appendChild(this.slotLeft_);
  elem.appendChild(this.slotRight_);
  elem.appendChild(this.shadowLeft_);
  elem.appendChild(this.shadowRight_);
};


/**
 * Create DOM nodes for the tape.
 */
turing.Tape.prototype.create = function() {
  var squareSize = turing.sprites.getSize('tape_');
  var paneWidth = turing.NUM_VISIBLE_SQUARES * squareSize.width +
      2 * turing.VISIBLE_FEED_WIDTH + 2;
  this.pane_ = turing.sprites.getEmptyDiv();
  this.pane_.style.width = paneWidth + 'px';
  this.pane_.style.height = squareSize.height + 'px';
  this.pane_.style.overflow = 'hidden';
  this.pane_.style.left = '0';
  this.pane_.style.top = '0';
  this.pane_.style.zIndex = turing.SQUARE_ZINDEX;
  var holderWidth = turing.NUM_SQUARES * squareSize.width;
  this.squareHolder_ = turing.sprites.getEmptyDiv();
  this.squareHolder_.style.width = holderWidth + 'px';
  this.squareHolder_.style.left =
      -turing.NUM_MARGIN_SQUARES * squareSize.width +
      turing.VISIBLE_FEED_WIDTH + 'px';
  // Create visible squares plus extra squares for padding when scrolling.
  for (var i = 0; i < turing.NUM_SQUARES; i++) {
    this.squares_[i] = turing.sprites.getDiv('tape_');
    this.squares_[i].style.display = 'inline-block';
    this.squares_[i].style.position = '';
    this.squareHolder_.appendChild(this.squares_[i]);
  }
  this.pane_.appendChild(this.squareHolder_);
  var headSize = turing.sprites.getSize('head');
  var extraHeadHeight = headSize.height - squareSize.height;
  var extraHeadWidth = headSize.width - squareSize.width;
  this.readWriteHead_ = turing.sprites.getDiv('head');
  this.readWriteHead_.style.top = (-extraHeadHeight / 2 - 2) + 'px';
  this.readWriteHead_.style.left = turing.VISIBLE_FEED_WIDTH +
      (turing.NUM_VISIBLE_LEFT_SQUARES * squareSize.width) -
      extraHeadWidth / 2 + 1 + 'px';
  this.readWriteHead_.style.zIndex = turing.SQUARE_ZINDEX + 1;
  this.tapeDiv_ = turing.sprites.getEmptyDiv();
  this.tapeDiv_.style.top = turing.TAPE_TOP + 'px';
  this.tapeDiv_.style.left = turing.TAPE_LEFT + 'px';
  this.tapeDiv_.appendChild(this.pane_);
  this.tapeDiv_.appendChild(this.readWriteHead_);
  this.slotLeft_ = this.createSlot_('slot-left', turing.TAPE_LEFT, -1,
      squareSize.height);
  this.slotRight_ = this.createSlot_('slot-right', turing.TAPE_LEFT + paneWidth,
      0, squareSize.height);

  this.shadowLeft_ = this.createShadow_('tape-shadow-l', turing.TAPE_LEFT);
  this.shadowRight_ = this.createShadow_('tape-shadow-r',
      turing.TAPE_LEFT + paneWidth -
      turing.sprites.getSize('tape-shadow-r').width);
};


/**
 * Creates a dom node for a tape slot (a black oval on either side of the tape
 * where it emerges onto the page).
 * @param {string} spriteName The sprite to use.
 * @param {number} leftEdge The left offset of the edge of the tape closest to
 *     this slot.
 * @param {number} leftBump A small amount by which to move the left coordinate.
 *     Needed because the sizes don't round evenly.
 * @param {number} squareHeight The height of a tape square.
 * @return {Element} The slot div.
 * @private
 */
turing.Tape.prototype.createSlot_ = function(spriteName, leftEdge,
    leftBump, squareHeight) {
  var size = turing.sprites.getSize(spriteName);
  var slot = turing.sprites.getDiv(spriteName);
  slot.style.zIndex = turing.SQUARE_ZINDEX - 1;  // Behind tape.
  // On Windows, browsers seem to round 57.5 up to the next pixel right,
  // which looks wrong, so floor here to match cross platform.
  slot.style.left = Math.floor(leftEdge - leftBump - size.width / 2) + 'px';
  slot.style.top = (turing.TAPE_TOP - turing.TAPE_SHADOW_HEIGHT / 2 +
      squareHeight / 2 - size.height / 2) + 'px';
  return slot;
};


/**
 * Creates a dom node for a tape slot shadow next to the black oval slots.
 * @param {string} spriteName The sprite to use.
 * @param {number} leftEdge The left offset of the edge of the tape closest to
 *     this slot.
 * @return {Element} The slot div.
 * @private
 */
turing.Tape.prototype.createShadow_ = function(spriteName, leftEdge) {
  var slot = turing.sprites.getDiv(spriteName);
  slot.style.zIndex = turing.SQUARE_ZINDEX + 1;  // Above tape.
  slot.style.left = leftEdge + 'px';
  slot.style.top = turing.TAPE_TOP + 'px';
  return slot;
};


/**
 * Unbind event listeners, stop timers and tear down DOM.
 */
turing.Tape.prototype.destroy = function() {
  for (var i = 0; i < this.squares_.length; i++) {
    turing.util.removeNode(this.squares_[i]);
  }
  this.squares_.splice(0);
  turing.util.removeNode(this.squareHolder_);
  this.squareHolder_ = null;
  turing.util.removeNode(this.pane_);
  this.pane_ = null;
  turing.util.removeNode(this.readWriteHead_);
  this.readWriteHead_ = null;
  turing.util.removeNode(this.tapeDiv_);
  this.tapeDiv_ = null;
  turing.util.removeNode(this.slotLeft_);
  this.slotLeft_ = null;
  turing.util.removeNode(this.slotRight_);
  this.slotRight_ = null;
  turing.util.removeNode(this.shadowLeft_);
  this.shadowLeft_ = null;
  turing.util.removeNode(this.shadowRight_);
  this.shadowRight_ = null;
};


/**
 * Scrolls the tape to the left.
 * @param {number} waitTime Delay before scanning starts in ms.
 * @param {number} scanTime Duration for scan animation in ms.
 */
turing.Tape.prototype.scanLeft = function(waitTime, scanTime) {
  this.scanning_ = true;
  this.pos_--;
  var squareSize = turing.sprites.getSize('tape_');
  var newLeft = -(turing.NUM_MARGIN_SQUARES - 1) * squareSize.width +
      turing.VISIBLE_FEED_WIDTH;
  turing.anim.delay(goog.bind(function() {
    turing.anim.animate(this.squareHolder_, {'left': newLeft + 'px'},
        scanTime, goog.bind(this.redrawTape_, this));
  }, this), waitTime);
};


/**
 * Scrolls the tape to the right.
 * @param {number} waitTime Delay before scanning starts in ms.
 * @param {number} scanTime Duration for scan animation in ms.
 */
turing.Tape.prototype.scanRight = function(waitTime, scanTime) {
  this.scanning_ = true;
  this.pos_++;
  var squareSize = turing.sprites.getSize('tape_');
  var newLeft = -(turing.NUM_MARGIN_SQUARES + 1) * squareSize.width +
      turing.VISIBLE_FEED_WIDTH;
  turing.anim.delay(goog.bind(function() {
    turing.anim.animate(this.squareHolder_, {'left': newLeft + 'px'},
        scanTime, goog.bind(this.redrawTape_, this));
  }, this), waitTime);
};


/**
 * Scans the tape until it reaches a particular position. This is done by
 * calling scanLeft/scanRight repeatedly.
 * @private
 */
turing.Tape.prototype.seek_ = function() {
  if (this.seekPos_ == null) {
    return;
  }
  if (this.pos_ < this.seekPos_) {
    this.scanRight(0, turing.SEEK_MS);
  } else if (this.pos_ > this.seekPos_) {
    this.scanLeft(0, turing.SEEK_MS);
  } else {
    // We've arrived at the seek position. Nuke everything except the currently
    // visible portion of the tape.
    this.seekPos_ = null;
    this.clearOutsideRange_(
        this.pos_ - turing.NUM_VISIBLE_LEFT_SQUARES,
        this.pos_ + turing.NUM_VISIBLE_RIGHT_SQUARES);
  }
};


/**
 * Clears tape squares not in the range [start, end].
 * @param {number} start The position of the first square to keep.
 * @param {number} end The position of the last square to keep.
 * @private
 */
turing.Tape.prototype.clearOutsideRange_ = function(start, end) {
  for (var i in this.contents_) {
    i = /** @type {number} */(i);  // Reassure the compiler.
    if (i < start || i > end) {
      this.contents_[i] = '';
    }
  }
};


/**
 * Prints a symbol at the read/write head position.
 * @param {string} symbol Symbol to print.
 * @param {number} eraseTime Duration in ms for erasing old symbol.
 * @param {number} printTime Duration in ms for printing new symbol.
 */
turing.Tape.prototype.print = function(symbol, eraseTime, printTime) {
  var oldSymbol = this.contents_[this.pos_];
  this.contents_[this.pos_] = symbol;
  this.maxWrittenPosition_ = Math.max(this.pos_, this.maxWrittenPosition_);
  // Always erase the old symbol and then print a new symbol, instead of
  // animating changing a 0 directly to a 1 or vice versa.
  this.showErase_(oldSymbol, eraseTime,
      goog.bind(this.showPrint_, this, symbol, printTime));
};


/**
 * Shows a symbol being erased from the tape.
 * @param {string} symbol The symbol to erase.
 * @param {number} time Duration in ms for erasing animation.
 * @param {function()} onDone Function to call when done erasing.
 * @private
 */
turing.Tape.prototype.showErase_ = function(symbol, time, onDone) {
  if (symbol == '0' || symbol == '1') {
    turing.anim.animateFromSprites(this.squares_[turing.HEAD_SQUARE],
        turing.ERASE_ANIMATIONS[symbol], time, onDone);
  } else {
    // Square is already blank. Delay before calling onDone anyway so that
    // there is a pause between when a print operation circle is lit and when we
    // show a symbol being printed.
    turing.anim.delay(onDone, time);
  }
};


/**
 * Shows a symbol being printed on the tape.
 * @param {string} symbol The symbol to print.
 * @param {number} time Duration in ms for printing animation.
 * @private
 */
turing.Tape.prototype.showPrint_ = function(symbol, time) {
  if (symbol == '0' || symbol == '1') {
    turing.anim.animateFromSprites(this.squares_[turing.HEAD_SQUARE],
        turing.PRINT_ANIMATIONS[symbol], time,
        goog.bind(this.redrawSquare_, this, turing.HEAD_SQUARE));
  }
  // Otherwise, assume square has already been erased by showErase_.
};


/**
 * Gets the symbol under the read/write head.
 * @return {string} The symbol, or '_' if none.
 */
turing.Tape.prototype.getCurSymbol = function() {
  return this.contents_[this.pos_] || '_';
};


/**
 * Appends a string one visible tape width past the last written position on
 * the tape and scans to there. Used to set up initial tape for a program after
 * another program has been running for a while.
 * @param {string} str The desired initial contents of the tape.
 */
turing.Tape.prototype.setString = function(str) {
  this.maxWrittenPosition_ += turing.NUM_SQUARES;
  var start = this.maxWrittenPosition_;
  // Save this start position so we can reset to the same string if this next
  // program run is not correct.
  this.lastStartPos_ = start;
  this.writeString_(str, start);
  // We wrote str.length more characters.
  this.maxWrittenPosition += str.length;
  this.reinitializePositionOnTape_(str, start);
};


/**
 * Similar to setString but resets to the last program start in-place.
 * @param {string} str The desired initial contents of the tape.
 */
turing.Tape.prototype.resetString = function(str) {
  var start = this.lastStartPos_;
  this.writeString_(str, start);
  // Clear everything to the left or right of the string.
  this.clearOutsideRange_(start, start + str.length - 1);
  this.reinitializePositionOnTape_(str, start);
};


/**
 * Write the given string to the tape.
 * @param {string} str The desired contents of the tape.
 * @param {number} start The position to start writing the string on the tape.
 * @private
 */
turing.Tape.prototype.writeString_ = function(str, start) {
  // Reset the symbols on the tape.
  for (var i = 0; i < str.length; i++) {
    this.contents_[start + i] = str.charAt(i);
  }
};


/**
 * Move to the middle of the current string on the tape.
 * @param {string} str The current string on the tape.
 * @param {number} start The start position of the current string on the tape.
 * @private
 */
turing.Tape.prototype.reinitializePositionOnTape_ = function(str, start) {
  this.seekPos_ = start + Math.floor(str.length / 2);
  if (!this.scanning_) {
    // If the tape is already scanning, redrawTape will get called when that
    // animation finishes, and will call seek_ to scan.
    this.redrawTape_();
  }
};


/**
 * @return {number} The index of the first symbol on the tape.
 * @private
 */
turing.Tape.prototype.getIndexOfFirstSymbol_ = function() {
  var minValidPos = null;
  for (var i in this.contents_) {
    i = /** @type {number} */(i);  // Reassure the compiler.
    if (this.contents_[i] && this.contents_[i] != '_' &&
        this.contents_[i] != ' ') {
      if (minValidPos == null) {
        minValidPos = i;
      }
      minValidPos = Math.min(minValidPos, i);
    }
  }
  if (minValidPos == null) {
    return -1;
  }
  return minValidPos;
};


/**
 * Trigger a scan to the square that's offset spaces from the beginning of the
 * string on the tape and return the contents of that square.
 * @param {number} offset The number of spaces from the beginning of the string.
 * @return {string} The contents of the square or the empty string.
 */
turing.Tape.prototype.scanToAndGetSymbol = function(offset) {
  var index = this.getIndexOfFirstSymbol_() + offset;
  if (index == -1) {
    return '';
  }
  this.seekPos_ = index;
  this.seek_();
  return this.contents_[index];
};


/**
 * Updates the visible portion of the tape.
 * @private
 */
turing.Tape.prototype.redrawTape_ = function() {
  this.scanning_ = false;
  var squareSize = turing.sprites.getSize('tape_');
  // Also set up the invisible squares just off the edges of the tape.
  for (var i = 0; i < turing.NUM_SQUARES; i++) {
    this.redrawSquare_(i);
  }
  this.squareHolder_.style.left =
      -turing.NUM_MARGIN_SQUARES * squareSize.width +
      turing.VISIBLE_FEED_WIDTH + 'px';
  this.seek_();
};


/**
 * Redraws one square on the tape.
 * @param {number} i Index among _drawn_ squares.
 * @private
 */
turing.Tape.prototype.redrawSquare_ = function(i) {
  var offs = (i + this.pos_) - turing.HEAD_SQUARE;
  var symbol = this.contents_[offs] || '';
  var spriteName = turing.TAPE_SYMBOLS[symbol];
  this.squares_[i].style.background =
      turing.sprites.getBackground(spriteName);
};


/**
 * Slides the entire tape assembly up to the top of the display area.
 * Used to make room for larger programs in bonus mode.
 */
turing.Tape.prototype.slideUp = function() {
  // 7px from the bottom of the tooltip.
  turing.anim.animate(this.tapeDiv_, {'top': '27px'}, 200);
  turing.anim.animate(this.shadowLeft_, {'top': '27px'}, 200);
  turing.anim.animate(this.shadowRight_, {'top': '27px'}, 200);
  turing.anim.animate(this.slotLeft_, {'top': '21px'}, 200);
  turing.anim.animate(this.slotRight_, {'top': '21px'}, 200);
};
