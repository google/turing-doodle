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
 * @fileoverview Samples points on cubic Bézier curves.
 * @author jered@google.com (Jered Wierzbicki)
 */

goog.provide('turing.CubicBezier');


/**
 * How many points to pre-compute for evaluating curves.
 * This can be a fairly low number, since a 1 second animation at 60Hz will
 * update only about 60 times, and most of our animations are short.
 * @type {number}
 * @const
 */
turing.BEZIER_SAMPLES = 120;


/**
 * The resolution for numerically solving the "x" polynomial when sampling.
 * I picked this value by staring at curves until they looked smooth.
 * @type {number}
 * @const
 */
turing.BEZIER_EPSILON = 0.0001;


/**
 * How to evaluate curves. Different platforms have widely varying floating
 * point and Javascript performance. Here are times (in us) for some different
 * platforms for each of these methods:
 * Platform     Solve   Linear  Nearest
 * MacBook Pro  150     88      18
 * iPad1        3939    1258    692
 * Nexus S      1074    616     252
 * @enum {number}
 */
turing.BezierEvaluation = {
  SOLVE: 0,
  NEAREST_INTERP: 1,
  LINEAR_INTERP: 2
};



/**
 * Evaluates a cubic Bézier curve,
 *   B(t) = (1-t)^3 P0 + 3(1-t)^2 t P1 + 3(1-t) t^2 P2 + t^3 P3, t in [0,1],
 * at positions x in [0,1] given P0=(0,0), P3=(1,1), and P1 and P2 specified.
 * Used for animation timing in browsers that do not support CSS transitions.
 * Based on WebKit:
 * trac.webkit.org/browser/trunk/Source/WebCore/platform/graphics/UnitBezier.h
 * @param {number} p1x x-coordinate of P1.
 * @param {number} p1y y-coordinate of P1.
 * @param {number} p2x x-coordinate of P2.
 * @param {number} p2y y-coordinate of P2.
 * @param {turing.BezierEvaluation} evalMode How to evaluate.
 * @constructor
 */
turing.CubicBezier = function(p1x, p1y, p2x, p2y, evalMode) {
  /**
   * Coefficients of the x polynomial.
   * @type {Array.<number>}
   * @private
   */
  this.xCoefs_ = this.getCoefs_(p1x, p2x);

  /**
   * Coefficients of the y polynomial.
   * @type {Array.<number>}
   * @private
   */
  this.yCoefs_ = this.getCoefs_(p1y, p2y);

  /**
   * How to evaluate the curve.
   * @type {turing.BezierEvaluation}
   * @private
   */
  this.evalMode_ = evalMode;

  /**
   * Sampled points on the curve.
   * @type {Array.<number>}
   * @private
   */
  this.samples_ = this.evalMode_ != turing.BezierEvaluation.SOLVE ?
      this.precompute_() : [];
};


/**
 * Converts parametric form to an explicit polynomial.
 * @param {number} p1 The first parameteric point.
 * @param {number} p2 The second parameteric point.
 * @return {Array.<number>} Coefficients for an explicit polynomial.
 * @private
 */
turing.CubicBezier.prototype.getCoefs_ = function(p1, p2) {
  var c = 3 * p1;
  var b = 3 * (p2 - p1) - c;
  var a = 1 - c - b;
  return [a, b, c];
};


/**
 * Precomputes a table of (x, y) positions on the curve.
 * @return {Array.<number>} y coordinates on the curve for x positions in [0,1],
 *     with indices of x * BEZIER_SAMPLES.
 * @private
 */
turing.CubicBezier.prototype.precompute_ = function() {
  var samples = [];
  for (var i = 0; i < turing.BEZIER_SAMPLES; i++) {
    var x = i / turing.BEZIER_SAMPLES;
    samples[i] = this.evaluate_(this.yCoefs_, this.solve_(x));
  }
  return samples;
};


/**
 * Samples the curve.
 * @param {number} x The x value to evaluate.
 * @return {number} The y value near there.
 */
turing.CubicBezier.prototype.sample = function(x) {
  if (this.evalMode_ == turing.BezierEvaluation.NEAREST_INTERP) {
    return this.sampleNearest_(x);
  } else if (this.evalMode_ == turing.BezierEvaluation.LINEAR_INTERP) {
    return this.sampleLinear_(x);
  } else {
    return this.evaluate_(this.yCoefs_, this.solve_(x));
  }
};


/**
 * Picks the nearest precomputed sample to get the y value of the curve near x
 * in [0,1].
 * @param {number} x The x value to evaluate.
 * @return {number} The y value near there.
 * @private
 */
turing.CubicBezier.prototype.sampleNearest_ = function(x) {
  var s = Math.floor(x * turing.BEZIER_SAMPLES);
  return s < 0 ? 0 : (s >= turing.BEZIER_SAMPLES ? 1 : this.samples_[s]);
};


/**
 * Uses linear interpolation between precomputed samples to get the y value of
 * the curve near x in [0,1].
 * @param {number} x The x value to evaluate.
 * @return {number} The y value near there.
 * @private
 */
turing.CubicBezier.prototype.sampleLinear_ = function(x) {
  var s = x * turing.BEZIER_SAMPLES;  // The sample number.
  var sLeft = Math.floor(s);
  var sRight = Math.ceil(s);
  if (sLeft < 0) {
    // x < 0: The leftmost point is fixed at (0,0).
    return 0;
  } else if (sLeft >= turing.BEZIER_SAMPLES) {
    // x >= 1: The rightmost point is fixed at (1,1).
    return 1;
  } else if (sLeft == sRight) {
    // x is exactly on a sample.
    return this.samples_[sLeft];
  } else {
    // Linearly interpolate between the nearest samples to x.
    return ((sRight - s) * this.samples_[sLeft] +
            (s - sLeft) * this.samples_[sRight]);
  }
};


/**
 * Evaluates a t^3 + b t^2 + c t expanded using Horner's rule.
 * @param {Array.<number>} coefs Coefficients [a, b, c].
 * @param {number} t Input for polynmoial.
 * @return {number} The value of the polynomial.
 * @private
 */
turing.CubicBezier.prototype.evaluate_ = function(coefs, t) {
  return ((coefs[0] * t + coefs[1]) * t + coefs[2]) * t;
};


/**
 * Evaluates the derivative of a t^3 + b t^2 + c t.
 * @param {Array.<number>} coefs Coefficients [a, b, c].
 * @param {number} t Input for polynmoial.
 * @return {number} The value of the derivative polynomial.
 * @private
 */
turing.CubicBezier.prototype.evaluateDerivative_ = function(coefs, t) {
  return (3 * coefs[0] * t + 2 * coefs[1]) * t + coefs[2];
};


/**
 * Solves a t^3 + b t^2 + c t = x for t.
 * @param {number} x x position to solve for.
 * @return {number} The t (parameter) value corresponding to a given x.
 * @private
 */
turing.CubicBezier.prototype.solve_ = function(x) {
  var t0;
  var t1;
  var t2;
  var x2;
  var d2;
  var i;

  // First try a few iterations of Newton's method -- normally very fast.
  for (t2 = x, i = 0; i < 8; i++) {
    x2 = this.evaluate_(this.xCoefs_, t2) - x;
    if (Math.abs(x2) < turing.BEZIER_EPSILON) {
      return t2;
    }
    d2 = this.evaluateDerivative_(this.xCoefs_, t2);
    if (Math.abs(d2) < 1e-6) {
      break;
    }
    t2 = t2 - x2 / d2;
  }

  // Fall back to the bisection method for reliability.
  t0 = 0.0;
  t1 = 1.0;
  t2 = x;

  if (t2 < t0) {
    return t0;
  }
  if (t2 > t1) {
    return t1;
  }

  while (t0 < t1) {
    x2 = this.evaluate_(this.xCoefs_, t2);
    if (Math.abs(x2 - x) < turing.BEZIER_EPSILON) {
      return t2;
    }
    if (x > x2) {
      t0 = t2;
    } else {
      t1 = t2;
    }
    t2 = (t1 - t0) * .5 + t0;
  }

  // Failure.
  return t2;
};
