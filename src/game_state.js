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
 * @fileoverview Saves and restores persistent game state.
 * @author jered@google.com (Jered Wierzbicki)
 */

goog.provide('turing.GameState');


/**
 * The localStorage key for the current program.
 * @type {string}
 * @const
 * @private
 */
turing.CUR_PROGRAM_KEY_ = 'doodle-turing-p';


/**
 * Minimum valid value for curProgram_.
 * @type {number}
 * @const
 * @private
 */
turing.MIN_VALID_PROGRAM_ = 1;


/**
 * Maximum valid value for curProgram_.
 * @type {number}
 * @const
 * @private
 */
turing.MAX_VALID_PROGRAM_ = 12;



/**
 * The current game state.
 * @constructor
 */
turing.GameState = function() {
  /**
   * Index of the current program.
   * @type {number}
   * @private
   */
  this.curProgram_ = turing.MIN_VALID_PROGRAM_;
};


/**
 * @return {number} Index of current program.
 */
turing.GameState.prototype.getCurProgram = function() {
  return this.curProgram_;
};


/**
 * Sets index of current program.
 * @param {number} curProgram The index of the current program.
 */
turing.GameState.prototype.setCurProgram = function(curProgram) {
  this.curProgram_ = curProgram;
  this.save();
};


/**
 * Saves state using localStorage.
 */
turing.GameState.prototype.save = function() {
  if (window.localStorage && window.localStorage.setItem) {
    window.localStorage.setItem(turing.CUR_PROGRAM_KEY_, this.curProgram_);
  }
};


/**
 * Restores state using localStorage.
 */
turing.GameState.prototype.restore = function() {
  if (window.localStorage && window.localStorage[turing.CUR_PROGRAM_KEY_]) {
    this.curProgram_ = parseInt(
        window.localStorage[turing.CUR_PROGRAM_KEY_], 10) || 0;  // NaN -> 0.
    if (this.curProgram_ < turing.MIN_VALID_PROGRAM_ ||
        this.curProgram_ > turing.MAX_VALID_PROGRAM_) {
      // If curProgram_ is corrupted, start from the first program.
      this.curProgram_ = turing.MIN_VALID_PROGRAM_;
    }
  }
};
