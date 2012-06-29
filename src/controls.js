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
 * @fileoverview Shows playback controls for running programs.
 * @author jered@google.com (Jered Wierzbicki)
 */

goog.provide('turing.Controls');

goog.require('turing.anim');
goog.require('turing.sprites');
goog.require('turing.util');


/**
 * The left offset of the play button.
 * @type {string}
 * @const
 * @private
 */
turing.PLAY_BUTTON_LEFT_ = '55px';


/**
 * The top offset of the play button.
 * @type {string}
 * @const
 * @private
 */
turing.PLAY_BUTTON_TOP_ = '127px';


/**
 * The z-index for controls. On top of everything, since they're clickable.
 * @type {number}
 * @const
 * @private
 */
turing.CONTROL_ZINDEX_ = 499;


/**
 * How long for the play button to push in when the user presses it.
 * @type {number}
 * @const
 * @private
 */
turing.PLAY_PUSH_DELAY_ = 20;



/**
 * Controls for program execution.
 * @constructor
 */
turing.Controls = function() {
  /**
   * A button to start running the program.
   * @type {Element}
   * @private
   */
  this.play_;

  /**
   * True iff the play button is currently actively being pushed down by the
   * user (as opposed to just passively being stuck in its "in" state.)
   * @type {boolean}
   * @private
   */
  this.playIsBeingPushedNow_ = false;

  /**
   * The mouse down event listener for the play button.
   * @type {?function(Event)}
   * @private
   */
  this.playMouseDownListener_ = null;

  /**
   * The mouse up event listener for the play button.
   * @type {?function(Event)}
   * @private
   */
  this.playMouseUpListener_ = null;

  /**
   * The mouse out event listener for the play button.
   * @type {?function(Event)}
   * @private
   */
  this.playMouseOutListener_ = null;

  /**
   * Function to call when play is clicked.
   * @type {?function()}
   * @private
   */
  this.playCallback_ = null;
};


/**
 * Creates dom elements and event listeners.
 */
turing.Controls.prototype.create = function() {
  this.play_ = turing.sprites.getDiv('play-flat');
  this.play_.style.left = turing.PLAY_BUTTON_LEFT_;
  this.play_.style.top = turing.PLAY_BUTTON_TOP_;
  this.play_.style.zIndex = turing.CONTROL_ZINDEX_;
  this.play_.style.cursor = 'pointer';
  this.playMouseDownListener_ = goog.bind(this.onMouseDownPlay_, this);
  turing.util.listen(this.play_, 'mousedown', this.playMouseDownListener_);
  turing.util.listen(this.play_, 'touchstart', this.playMouseDownListener_);
  this.playMouseUpListener_ = goog.bind(this.onMouseUpPlay_, this);
  turing.util.listen(this.play_, 'mouseup', this.playMouseUpListener_);
  this.playMouseOutListener_ = goog.bind(this.onMouseOutPlay_, this);
  turing.util.listen(this.play_, 'mouseout', this.playMouseOutListener_);
  turing.util.listen(this.play_, 'touchmove', this.playMouseOutListener_);
};


/**
 * Cleans up dom/event listeners.
 */
turing.Controls.prototype.destroy = function() {
  turing.util.unlisten(this.play_, 'mousedown', this.playMouseDownListener_);
  turing.util.unlisten(this.play_, 'touchstart', this.playMouseDownListener_);
  turing.util.unlisten(this.play_, 'mouseup', this.playMouseUpListener_);
  turing.util.unlisten(this.play_, 'mouseout', this.playMouseOutListener_);
  turing.util.unlisten(this.play_, 'touchmove', this.playMouseOutListener_);
  this.playMouseDownListener_ = null;
  this.playMouseUpListener_ = null;
  this.playMouseOutListener_ = null;
  turing.util.removeNode(this.play_);
  this.play_ = null;
};


/**
 * Attaches to dom.
 * @param {Element} elem Parent element.
 */
turing.Controls.prototype.attachTo = function(elem) {
  elem.appendChild(this.play_);
};


/**
 * Pops the play button out so it is clickable.
 * @param {?function()} onClick Called when the play button is clicked.
 */
turing.Controls.prototype.popOutPlayButton = function(onClick) {
  this.playCallback_ = onClick;
  this.play_.style.background = turing.sprites.getBackground('play-out');
  this.play_.style.cursor = 'pointer';
};


/**
 * Pushes the play button in, so that it won't be pushable again until it pops
 * back out.
 */
turing.Controls.prototype.pushInPlayButton = function() {
  this.playCallback_ = null;
  this.play_.style.background = turing.sprites.getBackground('play-in');
  this.play_.style.cursor = 'default';
};


/**
 * Event handler dispatched on mousedown over the play button.
 * @param {Event} event mousedown event.
 * @private
 */
turing.Controls.prototype.onMouseDownPlay_ = function(event) {
  if (!this.playCallback_ || this.playIsBeingPushedNow_) {
    // The program is running or mousedown happened twice somehow.
    return;
  }
  turing.anim.animateFromSprites(this.play_,
      ['play-out', 'play-flat'], turing.PLAY_PUSH_DELAY_);
  this.playIsBeingPushedNow_ = true;
};


/**
 * Event handler dispatched on mouseup over the play button.
 * @param {Event} event mouseup event.
 * @private
 */
turing.Controls.prototype.onMouseUpPlay_ = function(event) {
  if (this.playIsBeingPushedNow_ && this.playCallback_) {
    this.playCallback_.call();
  }
  this.playIsBeingPushedNow_ = false;
};


/**
 * Event handler dispatched on mouseout over the play button.
 * @param {Event} event mouseout event.
 * @private
 */
turing.Controls.prototype.onMouseOutPlay_ = function(event) {
  if (this.playIsBeingPushedNow_) {
    // Assume the user wanted to cancel pushing down the play button so moved
    // off of it.
    this.playIsBeingPushedNow_ = false;
    this.popOutPlayButton(this.playCallback_);
  }
};


/**
 * Render the play button in its disabled state (the state which it is in when
 * the doodle initially loads).
 */
turing.Controls.prototype.dimPlayButton = function() {
  this.play_.style.background = turing.sprites.getBackground('play-flat');
  this.play_.style.cursor = 'default';
};
