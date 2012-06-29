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
 * @fileoverview Shows the desired contents of the tape.
 * @author jered@google.com (Jered Wierzbicki)
 */

goog.provide('turing.Target');

goog.require('turing.anim');
goog.require('turing.sprites');
goog.require('turing.sprites.numberplate');
goog.require('turing.util');


/**
 * The left offset of the target number plate.
 * @type {string}
 * @const
 */
turing.NUMBER_PLATE_LEFT = '280px';


/**
 * The top offset of the target number plate.
 * @type {string}
 * @const
 */
turing.NUMBER_PLATE_TOP = '21px';


/**
 * The top offset of the track from the tape to the target number plate.
 * @type {string}
 * @const
 */
turing.TRACK_TO_NUMBER_PLATE_TOP = '40px';


/**
 * The left offset of the track from the tape to the target number plate.
 * @type {string}
 * @const
 */
turing.TRACK_TO_NUMBER_PLATE_LEFT = '383px';


/**
 * The top offset of the equal indicator.
 * @type {string}
 * @const
 */
turing.EQUAL_INDICATOR_TOP = '25px';


/**
 * The left offset of the equal indicator.
 * @type {string}
 * @const
 */
turing.EQUAL_INDICATOR_LEFT = '411px';


/**
 * The amount of time it takes to blink the equal sign once.
 * @type {number}
 * @const
 */
turing.EQUAL_BLINK_DURATION = 400;



/**
 * A plate showing the desired state of the tape.
 * @constructor
 */
turing.Target = function() {
  /**
   * Div for the plate with numbers the user is trying to match.
   * @type {Element}
   * @private
   */
  this.numberPlate_;

  /**
   * The current value of the target number plate.
   * @type {string}
   * @private
   */
  this.curValue_ = '';

  /**
   * A track segment leading from the tape to the target number plate.
   * @type {Element}
   * @private
   */
  this.trackToNumberPlate_;

  /**
   * The equivalence indicator shown on the track segment that leads to the
   * number plate.
   * @type {Element}
   * @private
   */
  this.equalIndicator_;

  /**
   * A click event listener bound on the equals indicator.
   * @type {Function}
   * @private
   */
  this.equalClickListener_;

  /**
   * A callback called when the equals indicator is clicked.
   * @type {?function()}
   * @private
   */
  this.equalClickCallback_;
};


/**
 * Creates dom nodes.
 */
turing.Target.prototype.create = function() {
  this.numberPlate_ = turing.sprites.getDiv('target-blank');
  this.numberPlate_.style.top = turing.NUMBER_PLATE_TOP;
  this.numberPlate_.style.zIndex = 400;
  this.numberPlate_.style.left = turing.NUMBER_PLATE_LEFT;
  this.trackToNumberPlate_ = turing.sprites.getDiv('track');
  var trackToNumberPlateStyle = this.trackToNumberPlate_.style;
  trackToNumberPlateStyle.top = turing.TRACK_TO_NUMBER_PLATE_TOP;
  trackToNumberPlateStyle.left = turing.TRACK_TO_NUMBER_PLATE_LEFT;
  // We're repurposing the track icon but only showing a small part of it.
  trackToNumberPlateStyle.height = '9px';
  trackToNumberPlateStyle.width = '40px';
  trackToNumberPlateStyle.zIndex = 398;  // Behind tape and number plate.
  this.equalIndicator_ = turing.sprites.getDiv('eq-dim');
  this.equalIndicator_.style.top = turing.EQUAL_INDICATOR_TOP;
  this.equalIndicator_.style.left = turing.EQUAL_INDICATOR_LEFT;
  this.equalIndicator_.style.zIndex = 399;  // Above trackToNumberPlate.
  this.equalClickListener_ = goog.bind(this.onClickEqual_, this);
  turing.util.listen(this.equalIndicator_, 'click', this.equalClickListener_);
};


/**
 * Cleans up dom nodes.
 */
turing.Target.prototype.destroy = function() {
  turing.util.removeNode(this.numberPlate_);
  this.numberPlate_ = null;
  turing.util.removeNode(this.trackToNumberPlate_);
  this.trackToNumberPlate_ = null;
  turing.util.unlisten(this.equalIndicator_, 'click', this.equalClickListener_);
  this.equalClickListener_ = null;
  turing.util.removeNode(this.equalIndicator_);
  this.equalIndicator_ = null;
  this.curValue_ = '';
};


/**
 * Attaches dom nodes.
 * @param {Element} elem Where to attach.
 */
turing.Target.prototype.attachTo = function(elem) {
  elem.appendChild(this.numberPlate_);
  elem.appendChild(this.trackToNumberPlate_);
  elem.appendChild(this.equalIndicator_);
};


/**
 * Sets the value on the target number plate.
 * @param {string} str The desired bit string, or the empty string for a blank
 *     target.
 * @param {number} duration The amount of time to animate for.
 */
turing.Target.prototype.setValue = function(str, duration) {
  if (!str && !this.curValue_) {
    // Don't switch sheets!  It causes flashing!  So just pick the first
    // blank target in the deferred sheet.
    this.numberPlate_.style.background = turing.sprites.getBackground(
        'scroll-01011-18');
    return;
  }
  var backgrounds;
  if (!str) {
    // We're switching to blank so animate the current value scrolling away.
    backgrounds = turing.sprites.numberplate.getScrollingTarget(
        this.curValue_, false);
  } else {
    // We're switching to the given string, so animate it scrolling in.
    backgrounds = turing.sprites.numberplate.getScrollingTarget(str, true);
  }

  if (!duration) {
    this.numberPlate_.style.background = backgrounds[backgrounds.length - 1];
  } else {
    turing.anim.animateThroughBackgrounds(
        this.numberPlate_, backgrounds, duration);
  }
  this.curValue_ = str;
};


/**
 * Sets the equal indicator.
 * @param {string} str One of 'dim', 'eq', or 'neq'.
 * @param {number=} opt_blinkDelay If specified, the amount of time to blink
 *     the equal display.
 */
turing.Target.prototype.setEqual = function(str, opt_blinkDelay) {
  if (!opt_blinkDelay || opt_blinkDelay < turing.EQUAL_BLINK_DURATION) {
    this.equalIndicator_.style.background = turing.sprites.getBackground(
        'eq-' + str);
  } else {
    var backgrounds = [];
    var remainingDelay = opt_blinkDelay;
    while (remainingDelay > turing.EQUAL_BLINK_DURATION) {
      backgrounds.push('eq-dim');
      backgrounds.push('eq-' + str);
      remainingDelay = remainingDelay - turing.EQUAL_BLINK_DURATION;
    }
    backgrounds.push('eq-dim');
    turing.anim.animateFromSprites(
        this.equalIndicator_, backgrounds, opt_blinkDelay);
  }
};


/**
 * Highlights the given space on the number plate.
 * @param {string} str The desired bit string.
 * @param {number} index The index of the number to highlight, or 5 which is
 *     the length of the target, to highlight the entire number plate.
 * @param {number} duration The amount of time to highlight for.
 */
turing.Target.prototype.highlightAt = function(str, index, duration) {
  if (index > str.length) {
    return;
  }
  var lowlit = turing.sprites.numberplate.getLitTargetForDigit(
      str, index, false);
  var lit = turing.sprites.numberplate.getLitTargetForDigit(
      str, index, true);
  var unlit = turing.sprites.numberplate.getUnlitNumberPlate(str);
  turing.anim.animateThroughBackgrounds(this.numberPlate_,
      [unlit, lowlit, lit, lit, lit, lit, lowlit, unlit], duration);
};


/**
 * Pops up a bunny in the equals indicator and makes it clickable.
 * @param {function()} onClick Callback to call when clicked.
 * @param {string} color The color for the bunny background.
 */
turing.Target.prototype.showBonusBunny = function(onClick, color) {
  this.setEqual('bunny-' + color);
  this.equalIndicator_.style.cursor = 'pointer';
  this.equalClickCallback_ = onClick;
};


/**
 * Click handler for the equal indicator.
 * @private
 */
turing.Target.prototype.onClickEqual_ = function() {
  if (this.equalClickCallback_) {
    this.equalClickCallback_();
  }
};


/**
 * Hides the bunny in the equals indicator and makes it non-clickable.
 */
turing.Target.prototype.hideBonusBunny = function() {
  this.equalClickCallback_ = null;
  this.equalIndicator_.style.cursor = 'default';
  this.setEqual('dim');
};
