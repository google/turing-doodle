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
 * @fileoverview A clickable overlay covering the entire doodle area.
 * @author jered@google.com (Jered Wierzbicki)
 */

goog.provide('turing.Overlay');

goog.require('turing.sprites');
goog.require('turing.util');


/**
 * The z-index for the overlay div. Should be on top of everything else.
 * @type {number}
 * @const
 */
turing.OVERLAY_ZINDEX = 500;



/**
 * An invisible div on top of the doodle in its passive mode.
 * @constructor
 */
turing.Overlay = function() {
  /**
   * An empty div element which fills its parent.
   * @type {Element}
   * @private
   */
  this.div_;

  /**
   * Event listener for clicks.
   * @type {?function()}
   * @private
   */
  this.clickHandler_;

  /**
   * Called to report a click to an observer.
   * @type {function()}
   * @private
   */
  this.callback_;
};


/**
 * Creates overlay div and registers a click event listener on it.
 * @param {Element} logoContainer Element to overlay; used for sizing.
 */
turing.Overlay.prototype.create = function(logoContainer) {
  this.div_ = turing.sprites.getEmptyDiv();
  this.div_.style.width = logoContainer.offsetWidth + 'px';
  this.div_.style.height = logoContainer.offsetHeight + 'px';
  this.div_.style.cursor = 'pointer';
  this.div_.style.zIndex = turing.OVERLAY_ZINDEX;
  this.clickHandler_ = goog.bind(this.onClick, this);
  turing.util.listen(this.div_, 'click', this.clickHandler_);
};


/**
 * Destroys dom elements and cleans up event listeners.
 */
turing.Overlay.prototype.destroy = function() {
  turing.util.unlisten(this.div_, 'click', this.clickHandler_);
  turing.util.removeNode(this.div_);
  this.clickHandler_ = null;
  this.div_ = null;
};


/**
 * Attaches to dom and sets click action.
 * @param {Element} elem Parent.
 * @param {function()} callback Called on a click.
 */
turing.Overlay.prototype.attachTo = function(elem, callback) {
  elem.appendChild(this.div_);
  this.callback_ = callback;
};


/**
 * Event listener for clicks on the overlay.
 */
turing.Overlay.prototype.onClick = function() {
  this.destroy();
  this.callback_();
};
