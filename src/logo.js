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
 * @fileoverview Shows the Google logo.
 * @author jered@google.com (Jered Wierzbicki)
 */

goog.provide('turing.Logo');

goog.require('turing.anim');
goog.require('turing.sprites');
goog.require('turing.util');


/**
 * The names of letters in the logo, in order, corresponding to sprites.
 * @type {Array.<string>}
 * @const
 */
turing.LOGO_LETTERS = ['G', 'o1', 'o2', 'g', 'l', 'e'];


/**
 * The left offset of the logo container.
 * @type {string}
 * @const
 */
turing.LOGO_LEFT = '79px';


/**
 * The top offset of the logo container.
 * @type {string}
 * @const
 */
turing.LOGO_TOP = '24px';


/**
 * The tops of each letter so that they line up correctly vertically.
 * @type {Array.<string>}
 * @const
 * @private
 */
turing.LETTER_TOPS_ = ['1px', '11px', '11px', '11px', '0', '11px'];


/**
 * The lefts of each letter so that they line up correctly.
 * @type {Array.<string>}
 * @const
 * @private
 */
turing.LETTER_LEFTS_ = ['0', '33px', '57px', '79px', '100px', '111px'];


/**
 * The number of animation frames used to light up the logo letters.
 * @type {number}
 * @const
 * @private
 */
turing.NUM_LETTER_ANIMATION_FRAMES_ = 8;



/**
 * A Google logo where each letter can light up or dim individually.
 * @constructor
 */
turing.Logo = function() {
  /**
   * Divs for each letter.
   * @type {Array.<Element>}
   * @private
   */
  this.letters_ = [];

  /**
   * Container div holding all letters.
   * @type {Element}
   * @private
   */
  this.container_;
};


/**
 * Attaches the logo under a dom element.
 * @param {Element} elem Parent element.
 */
turing.Logo.prototype.attachTo = function(elem) {
  elem.appendChild(this.container_);
};


/**
 * Creates the dom elements for the logo letters.
 * @param {number} numLettersOn How many letters are initially on.
 */
turing.Logo.prototype.create = function(numLettersOn) {
  this.container_ = turing.sprites.getEmptyDiv();
  this.container_.style.left = turing.LOGO_LEFT;
  this.container_.style.top = turing.LOGO_TOP;
  for (var i = 0, letter; letter = turing.LOGO_LETTERS[i]; i++) {
    var spriteName = i < numLettersOn ?
        letter + (turing.NUM_LETTER_ANIMATION_FRAMES_ - 1) : letter + '0';
    this.letters_[i] = turing.sprites.getDiv(spriteName);
    this.letters_[i].style.left = turing.LETTER_LEFTS_[i];
    this.letters_[i].style.top = turing.LETTER_TOPS_[i];
    this.container_.appendChild(this.letters_[i]);
    var letterSize = turing.sprites.getSize(spriteName);
  }
};


/**
 * Destroys the dom elements for logo letters.
 */
turing.Logo.prototype.destroy = function() {
  turing.util.removeNode(this.container_);
  this.container_ = null;
  for (var i = 0, letter; letter = this.letters_[i++]; ) {
    turing.util.removeNode(letter);
  }
  this.letters_.splice(0);
};


/**
 * Return an array of backgrounds we can use to animate the hightlighting or
 * dimming of the given letter.
 * @param {string} letter The letter to animate.
 * @param {boolean} startDim If true, we dim the letter instead of highlighting.
 * @return {Array.<string>} The backgrounds which can be used to animate it.
 * @private
 */
turing.Logo.prototype.getAnimationBackgrounds_ = function(letter, startDim) {
  var backgrounds = [];
  for (var i = 0; i < turing.NUM_LETTER_ANIMATION_FRAMES_; i++) {
    backgrounds[i] = turing.sprites.getBackground(
        letter + (startDim ? i : turing.NUM_LETTER_ANIMATION_FRAMES_ - 1 - i));
  }
  return backgrounds;
};


/**
 * Lights up the letter at the given position.
 * @param {number} pos The index of the letter to light up.
 * @param {number=} opt_duration The duration to animate lighting the logo
 *     letter.
 */
turing.Logo.prototype.lightLetterAtPosition = function(pos, opt_duration) {
  if (!this.letters_[pos]) {
    return;
  }
  var letter = turing.LOGO_LETTERS[pos];
  if (!opt_duration) {
    this.letters_[pos].style.background = turing.sprites.getBackground(
        letter + (turing.NUM_LETTER_ANIMATION_FRAMES_ - 1));
  } else {
    turing.anim.animateThroughBackgrounds(this.letters_[pos],
        this.getAnimationBackgrounds_(letter, true), opt_duration);
  }
};


/**
 * Dims the letter at the given position.
 * @param {number} pos The index of the letter to dim.
 * @param {number=} opt_duration The duration to animate dimming the logo
 *     letter.
 */
turing.Logo.prototype.dimLetterAtPosition = function(pos, opt_duration) {
  var letterDiv = this.letters_[pos];
  if (!letterDiv) {
    return;
  }
  var letter = turing.LOGO_LETTERS[pos];
  if (!opt_duration) {
    letterDiv.style.background =
        turing.sprites.getBackground(letter + '0');
  } else {
    turing.anim.animateThroughBackgrounds(letterDiv,
        this.getAnimationBackgrounds_(letter, false), opt_duration);
  }
};


/**
 * Dims all letters.
 * @param {number=} opt_duration The duration to animate dimming the logo
 *     letters.
 */
turing.Logo.prototype.dim = function(opt_duration) {
  for (var i = 0; i < this.letters_.length; i++) {
    turing.anim.delay(
        goog.bind(this.dimLetterAtPosition, this, i, opt_duration), 250);
  }
};


/**
 * Successively dim each letter of the logo from the last to the first.
 * @param {function()=} opt_doneCallback Called when the logo is dim again.
 */
turing.Logo.prototype.deluminate = function(opt_doneCallback) {
  var numLetters = turing.LOGO_LETTERS.length;
  for (var i = 0; i < numLetters; i++) {
    turing.anim.delay(
        goog.bind(this.dimLetterAtPosition, this, numLetters - (i + 1), 500),
        250 * i);
  }
  turing.anim.delay(
      goog.bind(function() {
        this.dim();
        opt_doneCallback();
      }, this), 250 * (1 + turing.LOGO_LETTERS.length) + 500);
};
