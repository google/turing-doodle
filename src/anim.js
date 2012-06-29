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
 * @fileoverview Lightweight helper library for animation.
 * @author jered@google.com (Jered Wierzbicki)
 */

goog.provide('turing.anim');

goog.require('turing.sprites');
goog.require('turing.util');


/**
 * Iff true, do not schedule any more animations.
 * @type {boolean}
 * @private
 */
turing.anim.stopped_ = true;


/**
 * A list of pending animation frames.
 * @type {Array.<Object>}
 * @private
 */
turing.anim.queue_ = [];


/**
 * True iff there were more frames queued this tick and the queue needs to be
 * resorted.
 * @type {boolean}
 * @private
 */
turing.anim.queueDirty_ = false;


/**
 * The current animation tick.
 * @type {number}
 * @private
 */
turing.anim.curTick_ = 0;


/**
 * The next event id.
 * @private
 * @type {number}
 */
turing.anim.eventId_ = 1;


/**
 * The time when the last animation tick started.
 * @type {number}
 * @private
 */
turing.anim.lastTickStartTime_ = 0;


/**
 * A count of recent ticks which were were longer than the current target.
 * @type {number}
 * @private
 */
turing.anim.tooSlowTicks_ = 0;


/**
 * Inverse of the maximum frame rate (60 Hz).
 * @type {number}
 * @private
 * @const
 */
turing.anim.MAX_FPS_MS_ = 1000 / 60;


/**
 * Inverse of the minimum frame rate (20 Hz).
 * The game is functional, but really laggy to play below this frame rate. We'll
 * never schedule animations slower than this.
 * @type {number}
 * @private
 * @const
 */
turing.anim.MIN_FPS_MS_ = 1000 / 20;


/**
 * The interval at which the next frame will be rescheduled. This is controlled
 * by throttleFrameRate_.
 * @type {number}
 * @private
 */
turing.anim.msPerFrame_ = turing.anim.MAX_FPS_MS_;


/**
 * The name of the CSS3 transition property, or undefined if transitions are
 * unsupported.
 * @type {string|undefined}
 * @private
 */
turing.anim.transitionPropertyName_ = turing.util.getVendorCssPropertyName(
    'transition');


/**
 * Map from CSS properties we know how to animate to the units we expect will be
 * attached. Used to trim units off and add them back when interpolating values.
 * @type {Object.<string, string>}
 */
turing.anim.UNITS = {
  'top': 'px',
  'left': 'px'
};


/**
 * How to schedule the next animation frame.
 * @type {function(function())}
 */
window['requestAnimationFrame'] = (function() {
  return window['requestAnimationFrame'] ||
      window['webkitRequestAnimationFrame'] ||
      window['mozRequestAnimationFrame'] ||
      window['oRequestAnimationFrame'] ||
      window['msRequestAnimationFrame'] ||
      function(callback) {
        // Binding this on window because Chrome gets cross if we do not.
        // If we have nothing better, just do a setTimeout; the caller should be
        // careful to check turing.anim.stopped_. It is not checked here because
        // it'd be weird to export that behavior.
        window.setTimeout(callback, turing.anim.msPerFrame_);
      };
})();


/**
 * @param {number} duration A duration in ms.
 * @return {number} The corresponding number of ticks at the current frame rate.
 * @private
 */
turing.anim.getNumTicks_ = function(duration) {
  return Math.ceil(duration / turing.anim.msPerFrame_);
};


/**
 * Schedules callback to be run after a duration in ms.
 * @param {function()} callback The function to call when delay is elapsed.
 * @param {number} duration How long to wait in ms.
 * @return {number} An id for the event to be delayed.
 */
turing.anim.delay = function(callback, duration) {
  // Count ticks to wait based on the current frame rate.
  return turing.anim.delayTicks(callback,
      turing.anim.getNumTicks_(duration));
};


/**
 * Schedules callback to be run after a duration in animation ticks.
 * @param {function()} callback The function to call when delay is elapsed.
 * @param {number} ticksToWait How long to wait in animation loop ticks.
 * @return {number} An id for the event to be delayed.
 */
turing.anim.delayTicks = function(callback, ticksToWait) {
  var eventId = turing.anim.eventId_++;
  turing.anim.queue_.push({
    ticks: turing.anim.curTick_ + ticksToWait,
    call: callback,
    eventId: eventId
  });
  turing.anim.queueDirty_ = true;
  return eventId;
};


/**
 * Cancels a pending event previously scheduled with some delay.
 * @param {number} eventId The id of the event in the animation queue.
 */
turing.anim.cancel = function(eventId) {
  for (var i = 0; i < turing.anim.queue_.length; i++) {
    if (turing.anim.queue_[i].eventId == eventId) {
      turing.anim.queue_.splice(i, 1);
      return;
    }
  }
};


/**
 * Animates CSS properties on an element.
 * @param {Element} elem The element to animate.
 * @param {Object.<string, string>} properties CSS property names -> new values.
 * @param {number} duration How long the animation should run.
 * @param {function()=} opt_doneCallback Called when animation is done.
 */
turing.anim.animate = function(elem, properties, duration, opt_doneCallback) {
  var initialValue = {};
  var finalValue = {};
  for (var name in properties) {
    initialValue[name] = parseFloat(elem.style[name] || 0);
    finalValue[name] = parseFloat(properties[name]);
  }
  // Schedule ticks based on the current frame rate.
  var numTicks = turing.anim.getNumTicks_(duration);
  for (var tick = 0; tick <= numTicks; tick++) {
    var progress = Math.min(1, tick / numTicks);
    for (var name in properties) {
      turing.anim.delayTicks(goog.bind(function(progress) {
        var interp = (1 - progress) * initialValue[name] +
            progress * finalValue[name];
        var value = interp + (turing.anim.UNITS[name] || '');
        elem.style[name] = value;
      }, window, progress), tick);
    }
  }
  if (opt_doneCallback) {
    turing.anim.delayTicks(opt_doneCallback, numTicks);
  }
};


/**
 * Sets the CSS3 transition property for an element or does nothing if
 * transitions aren't supported.
 * @param {Element} elem The element to set transition for.
 * @param {string} transitionValue The css value for transition.
 */
turing.anim.setTransitionStyle = function(elem, transitionValue) {
  if (turing.anim.transitionPropertyName_) {
    elem.style[turing.anim.transitionPropertyName_] = transitionValue;
  }
};


/**
 * Clears CSS3 transitions on elem.
 * @param {Element} elem The element to clear transitions for.
 */
turing.anim.clearTransitionStyle = function(elem) {
  // Opera doesn't seem to completely support removing an animation
  // (setting it to 'none' still causes a delay when changing the left
  // offset), so instead set a dummy property to animate for.
  turing.anim.setTransitionStyle(elem, 'clear 0ms linear');
};


/**
 * Animates changing the sprite used for an element background.  Goes through
 * the background list, retrieving the sprite background, and then calls
 * animateThroughBackgrounds.
 * @param {Element} elem The element to animate.
 * @param {Array.<string>} spriteNames The names of the desired elements in the
 *     sprite to iterate through.
 * @param {number} duration How long the animation should run.
 * @param {function()=} opt_doneCallback Called when animation is done.
 */
turing.anim.animateFromSprites = function(elem, spriteNames, duration,
    opt_doneCallback) {
  var backgrounds = [];
  for (var i = 0; i < spriteNames.length; i++) {
    backgrounds[i] = turing.sprites.getBackground(spriteNames[i]);
  }
  turing.anim.animateThroughBackgrounds(
      elem, backgrounds, duration, opt_doneCallback);
};


/**
 * Animates changing the backgrounds of an element.
 * @param {Element} elem The element to animate.
 * @param {Array.<string>} backgrounds The CSS backgrounds to iterate through.
 * @param {number} duration How long the animation should run.
 * @param {function()=} opt_doneCallback Called when animation is done.
 */
turing.anim.animateThroughBackgrounds = function(elem, backgrounds, duration,
    opt_doneCallback) {
  // Schedule ticks based on the current frame rate.
  var numTicks = turing.anim.getNumTicks_(duration);
  for (var tick = 0; tick <= numTicks; tick++) {
    var progress = Math.min(1, tick / numTicks);
    turing.anim.delayTicks(goog.bind(function(progress) {
      elem.style.background = backgrounds[
          Math.min(backgrounds.length - 1,
                   Math.floor(progress * backgrounds.length))];
    }, window, progress), tick);
  }
  if (opt_doneCallback) {
    turing.anim.delayTicks(opt_doneCallback, numTicks);
  }
};


/**
 * A monolithic animation loop implemented using requestAnimationFrame. At each
 * tick, it runs any functions deferred til this tick.
 *
 * All deferred calls are scheduled to run from this loop so that the game
 * simulation and animation update synchronously without being explicitly
 * stitched together through callbacks everywhere.
 *
 * We also tried an asynchronous approach, using CSS3 transitions and
 * requestAnimationFrame to update animations and separate setTimeout calls to
 * run the game. This performed better, but degraded poorly; there were odd
 * skips in animation, and weird behavior when changing browser tabs since
 * requestAnimationFrame and setTimeout turn down differently. With this
 * approach, the game slows down uniformly under load.
 *
 * @private
 */
turing.anim.loop_ = function() {
  window.requestAnimationFrame(function step() {
    if (turing.anim.stopped_) {
      return;
    }
    // Note we must do this even when using requestAnimationFrame, because it
    // isn't 60 Hz everywhere, and we may need to throttle down to its actual
    // rate for our delays to make sense.
    turing.anim.throttleFrameRate_();
    if (turing.anim.queueDirty_) {
      // We'd like to keep frames in a priority queue but don't want to bother,
      // so just sort the frame queue when it changes.
      turing.anim.queue_.sort(function(a, b) {
        if (a.ticks == b.ticks) {
          // Guarantee the sort is stable.
          return a.eventId - b.eventId;
        }
        return a.ticks - b.ticks;
      });
      turing.anim.queueDirty_ = false;
    }
    var numFrames = 0;
    for (var i = 0, frame; frame = turing.anim.queue_[i]; i++) {
      if (frame.ticks <= turing.anim.curTick_) {
        frame.call();
        numFrames++;
      } else {
        break;
      }
    }
    turing.anim.queue_.splice(0, numFrames);
    turing.anim.curTick_++;
    window.requestAnimationFrame(step);
  });
};


/**
 * Measures and controls the interval between frames.
 * @private
 */
turing.anim.throttleFrameRate_ = function() {
  var tickStartTime = new Date().getTime();
  // At the start of the doodle, wait until things stabilize a bit (i.e. the
  // page finishes loading) before throttling the frame rate. Arbitrarily guess
  // this happens after 30 frames (which is nominally ~0.5 seconds).
  // Also check that lastTickStartTime is non-zero, since it will be reset to
  // zero if the animation loop is stopped for any reason (and then tickLength
  // below would be invalid).
  if (turing.anim.curTick_ > 30 && turing.anim.lastTickStartTime_) {
    var tickLength = tickStartTime - turing.anim.lastTickStartTime_;
    if (tickLength >= 1.05 * turing.anim.msPerFrame_) {
      // The last tick was too slow.
      turing.anim.tooSlowTicks_++;
    } else {
      // The last tick was within tolerance.
      turing.anim.tooSlowTicks_ = turing.anim.tooSlowTicks_ >> 1;
    }
    if (turing.anim.tooSlowTicks_ > 20) {
      // Animation consistently isn't making our target frame rate; slow down
      // frame rate by 20% up to a minimum frame rate.
      turing.anim.msPerFrame_ = Math.min(turing.anim.MIN_FPS_MS_,
          turing.anim.msPerFrame_ * 1.2);
      turing.anim.tooSlowTicks_ = 0;
    }
  }
  turing.anim.lastTickStartTime_ = tickStartTime;
};


/**
 * Start animation loop.
 */
turing.anim.start = function() {
  turing.anim.stopped_ = false;
  turing.anim.loop_();
};


/**
 * Resets controller state for frames-per-second throttling.
 * @private
 */
turing.anim.resetFpsController_ = function() {
  turing.anim.tooSlowTicks_ = 0;
  // Wait for a tick before measuring the interval between two ticks.
  turing.anim.lastTickStartTime_ = 0;
};


/**
 * Emergency brake; stop animation loop next time through.
 */
turing.anim.stop = function() {
  turing.anim.stopped_ = true;
  turing.anim.resetFpsController_();
};


/**
 * Stops the animation loop and cancels any queued animations.
 */
turing.anim.reset = function() {
  turing.anim.stop();
  turing.anim.queue_ = [];
  turing.anim.curTick_ = 0;
  turing.anim.queueDirty_ = false;
  turing.anim.eventId_ = 1;
  turing.anim.msPerFrame_ = turing.anim.MAX_FPS_MS_;
  turing.anim.resetFpsController_();
};


/**
 * @return {boolean} True iff animations are stopped.
 */
turing.anim.isStopped = function() {
  return turing.anim.stopped_;
};
