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
 * @fileoverview Helpers for loading sprites.
 * @author jered@google.com (Jered Wierzbicki)
 */

goog.provide('turing.sprites');

goog.require('turing.deferredsprites.offsets');
goog.require('turing.sprites.offsets');


/**
 * Path to the main sprite.
 * @type {string}
 * @const
 */
turing.sprites.PATH = 'images/sprite.png';


/**
 * Path to the deferred sprite.
 * @type {string}
 * @const
 */
turing.sprites.DEFERRED_SPRITE_PATH = 'images/deferred_sprite.png';


/**
 * Gets the width and height of the named sprite.
 * @param {string} name A sprite name.
 * @return {{width: number, height: number}}
 */
turing.sprites.getSize = function(name) {
  var rect = turing.sprites.offsets.RECTS[name] ||
      turing.deferredsprites.offsets.RECTS[name];
  return {width: rect.width, height: rect.height};
};


/**
 * Gets a string with background: CSS to select a sprite.
 * @param {string} name The name of the desired sprite.
 * @return {string} background: CSS.
 */
turing.sprites.getBackground = function(name) {
  var rect = turing.sprites.offsets.RECTS[name] ||
      turing.deferredsprites.offsets.RECTS[name];
  if (!rect) {
    // For debugging purposes, make it easy to see the missing sprite.
    return 'red';
  }
  var deferred = !turing.sprites.offsets.RECTS[name] &&
      turing.deferredsprites.offsets.RECTS[name];
  var path =
      deferred ? turing.sprites.DEFERRED_SPRITE_PATH : turing.sprites.PATH;
  return 'url(' + path + ') ' +
      -rect.x + 'px ' +
      -rect.y + 'px no-repeat';
};


/**
 * Gets a div containing the requested sprite.
 * @param {string} name The name of the desired sprite.
 * @return {Element} The sprite div.
 */
turing.sprites.getDiv = function(name) {
  var div = turing.sprites.getEmptyDiv();
  var rect = turing.sprites.offsets.RECTS[name];
  // In practice, we should always have a sprite offset for a given name so we
  // shouldn't be using these fallback values, but if we don't we render a
  // 50x50 square and getBackground will return 'red' so that we can quickly
  // and easily see the missing sprite.
  div.style.width = rect ? (rect.width + 'px') : '50px';
  div.style.height = rect ? (rect.height + 'px') : '50px';
  div.style.background = turing.sprites.getBackground(name);
  div.style['webkitTapHighlightColor'] = 'rgba(0,0,0,0)';
  return div;
};


/**
 * Gets an empty, unselectable div.
 * @return {Element} The div.
 */
turing.sprites.getEmptyDiv = function() {
  var div = document.createElement('div');
  div.style.position = 'absolute';
  div.style.userSelect = 'none';
  div.style.webkitUserSelect = 'none';
  div.style['webkitTapHighlightColor'] = 'rgba(0,0,0,0)';
  div.style.MozUserSelect = 'none';
  div.unselectable = 'on';
  return div;
};


/**
 * Preloads sprites.
 * @param {string} path The path to the image to preload.
 * @return {Element} the image element used to preload the sprite.
 */
turing.sprites.preload = function(path) {
  var img = document.createElement('img');
  img.src = path;
  return img;
};
