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
 * @fileoverview A small collection of helpers.
 * @author jered@google.com (Jered Wierzbicki)
 */

goog.provide('turing.util');


/**
 * Browser vendor name prefixes, used for looking up vendor-specific properties.
 * Other known vendor prefixes include 'Khtml' and 'Icab', but I'm excluding
 * these because I don't have them available to test.
 * @type {Array.<string>}
 * @const
 */
turing.VENDOR_PREFIXES = ['Moz', 'Webkit', 'O', 'ms'];


/**
 * Removes an element from its dom parent.
 * @param {Element} elem The element to remove.
 */
turing.util.removeNode = function(elem) {
  if (elem && elem.parentNode) {
    elem.parentNode.removeChild(elem);
  }
};


/**
 * Chooses the value after value in arr, or null if not in arr.
 * @param {Array} arr An array to search in.
 * @param {*} value The value to search for.
 * @return {*} The value after the searched one, or null if none.
 */
turing.util.getNextValue = function(arr, value) {
  for (var i = 0, arrValue; arrValue = arr[i]; i++) {
    if (arrValue == value) {
      break;
    }
  }
  var nextValue = i == arr.length - 1 ? arr[0] : arr[i + 1];
  return i == arr.length ? null : nextValue;
};


/**
 * Gets the vendor-specific name of a CSS property.
 * Adapted from https://gist.github.com/556448
 * @param {string} property The standard name of a CSS property.
 * @return {string|undefined} The name of this property as implemented in the
 *     current browser, or undefined if not implemented.
 */
turing.util.getVendorCssPropertyName = function(property) {
  var body = document.body || document.documentElement;
  var style = body.style;

  if (typeof style == 'undefined') {
    // No CSS support. Something is badly wrong.
    return undefined;
  }

  if (typeof style[property] == 'string') {
    // The standard name is supported.
    return property;
  }

  // Test for vendor specific names.
  var capitalizedProperty = property.charAt(0).toUpperCase() +
      property.substr(1);
  for (var i = 0, prefix; prefix = turing.VENDOR_PREFIXES[i++]; ) {
    if (typeof style[prefix + capitalizedProperty] == 'string') {
      return prefix + capitalizedProperty;
    }
  }
};


/**
 * Calls either addEventListener or attachEvent depending on what's
 * available.
 * @param {(Document|Element|Window)} element The object to listen on.
 * @param {string} eventName The event to listen to, such as 'click'.
 * @param {Function} listener The listener function to trigger.
 */
turing.util.listen = function(element, eventName, listener) {
  if (element.addEventListener) {
    element.addEventListener(eventName, listener, false);
  } else {
    element.attachEvent('on' + eventName, listener);
  }
};


/**
 * Stops listening to the specified event on the given target.
 * @param {(Document|Element|Window)} element The object that we were listening
 *     on.
 * @param {string}  eventName The event we were listening to, such as 'click'.
 * @param {Function} listener The listener function to remove.
 */
turing.util.unlisten = function(element, eventName, listener) {
  if (!element || !listener) {
    return;
  }
  if (element.removeEventListener) {
    element.removeEventListener(eventName, listener, false);
  } else if (element.detachEvent) {
    element.detachEvent('on' + eventName, listener);
  }
};


/**
 * Sets the opacity of a node (x-browser).
 * @param {Element} el Elements whose opacity has to be set.
 * @param {number|string} alpha Opacity between 0 and 1 or an empty string
 *     {@code ''} to clear the opacity.
 */
turing.util.setOpacity = function(el, alpha) {
  var style = el.style;
  if ('opacity' in style) {
    style.opacity = alpha;
  } else if ('MozOpacity' in style) {
    style.MozOpacity = alpha;
  } else if ('filter' in style) {
    if (alpha === '') {
      style.filter = '';
    } else {
      style.filter = 'alpha(opacity=' + alpha * 100 + ')';
    }
  }
};
