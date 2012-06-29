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
 * @fileoverview Offsets for the number plate sprite.
 * @author corrieann@google.com (Corrie Scalisi)
 */

goog.provide('turing.sprites.numberplate');

goog.require('turing.sprites');
goog.require('turing.sprites.offsets');


/**
 * The width of the number plate.
 * @type {number}
 * @const
 * @private
 */
turing.sprites.numberplate.WIDTH_ = 129;


/**
 * Gets the CSS background for the given unlit number plate.
 * @param {string} target The target.
 * @return {string} The CSS background string.
 */
turing.sprites.numberplate.getUnlitNumberPlate = function(target) {
  return turing.sprites.getBackground('light-' + target + '-0');
};


/**
 * Return the background for the given number target and digit combination.
 * If the length of the target (5) is passed in, then the sprite representing
 * the entire string will be returned.
 * @param {string} target The target.
 * @param {number} digit The digit we care about right now.
 * @param {boolean} fullyLit Whether the digit should be fully lit.
 * @return {string} The CSS background string.
 */
turing.sprites.numberplate.getLitTargetForDigit = function(
    target, digit, fullyLit) {
  // The column number of the unlit version of that digit.
  // We always add at least 1 because the first column has no digits lit.
  var digitXOffset = digit * 2 + (fullyLit ? 2 : 1);
  return turing.sprites.getBackground('light-' + target + '-' + digitXOffset);
};


/**
 * Get an array of backgrounds used to animate scrolling of the given target.
 * Grabs the first one from the main sprite and triggers a load of the sprites
 * with the other number plates.
 * @param {string} target The target.
 * @param {boolean} scrollIn Whether the target should scroll in, scrolls out if
 *     false.
 * @return {Array.<string>} The CSS backgrounds.
 */
turing.sprites.numberplate.getScrollingTarget = function(target, scrollIn) {
  var backgrounds = [];
  for (var i = 0;
       i <= turing.deferredsprites.offsets.MIDDLE_SCROLL_FRAME; i++) {
    var col =
        scrollIn ? i : turing.deferredsprites.offsets.MIDDLE_SCROLL_FRAME + i;
    backgrounds.push(turing.sprites.getBackground(
        'scroll-' + target + '-' + col));
  }
  return backgrounds;
};
