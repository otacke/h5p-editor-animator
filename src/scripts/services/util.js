import { decode } from 'he';

/** @constant {number} DOUBLE_CLICK_COUNT Double click count. */
const DOUBLE_CLICK_COUNT = 2;

/** @constant {number} DOUBLE_CLICK_TIME Double click time in ms. */
const DOUBLE_CLICK_TIME = 300;

/** @constant {number} DEFAULT_ELEMENT_OFFSET_PROCENT_MIN Minimum offset when pasting in procent. */
const DEFAULT_ELEMENT_OFFSET_PROCENT_MIN = 2.5;

/** @constant {number} DEFAULT_ELEMENT_OFFSET_PROCENT_MAX Maximum offset when pasting in procent. */
const DEFAULT_ELEMENT_OFFSET_PROCENT_MAX = 10;

/** @constant {string} DEFAULT_ASPECT_RATIO Default aspect ratio. */
const DEFAULT_ASPECT_RATIO = '16/9';

/**
 * Get random offset in procent.
 * @param {number} min Minimum offset.
 * @param {number} max Maximum offset.
 * @returns {number} Random offset.
 */
export const getRandomOffset = (min = DEFAULT_ELEMENT_OFFSET_PROCENT_MIN, max = DEFAULT_ELEMENT_OFFSET_PROCENT_MAX) => {
  // eslint-disable-next-line no-magic-numbers
  const direction = Math.random() < 0.5 ? -1 : 1;
  return direction * (Math.random() * (max - min) + min);
};

/**
 * Retrieve aspect ratio.
 * @param {number|string} aspectRatio Aspect ratio.
 * @returns {number} Aspect ratio.
 */
export const parseAspectRatio = (aspectRatio) => {
  if (typeof aspectRatio === 'number') {
    aspectRatio = aspectRatio.toString();
  }

  if (typeof aspectRatio !== 'string') {
    aspectRatio = DEFAULT_ASPECT_RATIO;
  }

  if (aspectRatio.match(/^\d+(.\d+)?$/)) {
    aspectRatio = `${aspectRatio}/1`;
  }

  if (!(aspectRatio.match(/^\d+(.\d+)?[:/]\d+(.\d+)?$/))) {
    aspectRatio = DEFAULT_ASPECT_RATIO;
  }

  const [width, height] = aspectRatio.includes(':') ?
    aspectRatio.split(':') :
    aspectRatio.split('/');

  return parseFloat(width) / parseFloat(height);
};

/** Class for utility functions */
export default class Util {
  /**
   * Extend an array just like JQuery's extend.
   * @returns {object} Merged objects.
   */
  static extend() {
    for (let i = 1; i < arguments.length; i++) {
      for (let key in arguments[i]) {
        if (Object.prototype.hasOwnProperty.call(arguments[i], key)) {
          if (
            typeof arguments[0][key] === 'object' &&
            typeof arguments[i][key] === 'object'
          ) {
            this.extend(arguments[0][key], arguments[i][key]);
          }
          else {
            arguments[0][key] = arguments[i][key];
          }
        }
      }
    }
    return arguments[0];
  }

  /**
   * Add mixins to a class, useful for splitting files.
   * @param {object} [master] Master class to add mixins to.
   * @param {object[]|object} [mixins] Mixins to be added to master.
   */
  static addMixins(master = {}, mixins = []) {
    if (!master.prototype) {
      return;
    }

    if (!Array.isArray(mixins)) {
      mixins = [mixins];
    }

    const masterPrototype = master.prototype;

    mixins.forEach((mixin) => {
      const mixinPrototype = mixin.prototype;
      Object.getOwnPropertyNames(mixinPrototype).forEach((property) => {
        if (property === 'constructor') {
          return; // Don't need constructor
        }

        if (Object.getOwnPropertyNames(masterPrototype).includes(property)) {
          return; // property already present, do not override
        }

        masterPrototype[property] = mixinPrototype[property];
      });
    });
  }

  /**
   * Double click handler.
   * @param {Event} event Regular click event.
   * @param {function} callback Function to execute on doubleClick.
   */
  static doubleClick(event, callback) {
    if (!event || typeof callback !== 'function') {
      return;
    }

    if (isNaN(event.target.count)) {
      event.target.count = 1;
    }
    else {
      event.target.count++;
    }

    setTimeout(() => {
      if (event.target.count === DOUBLE_CLICK_COUNT) {
        callback();
      }
      event.target.count = 0;
    }, DOUBLE_CLICK_TIME);
  }

  /**
   * Swap two DOM elements.
   * @param {HTMLElement} element1 Element 1.
   * @param {HTMLElement} element2 Element 2.
   */
  static swapDOMElements(element1, element2) {
    const parent1 = element1.parentNode;
    const parent2 = element2.parentNode;

    if (!parent1 || !parent2) {
      return;
    }

    const replacement1 = document.createElement('div');
    const replacement2 = document.createElement('div');

    parent1.replaceChild(replacement1, element1);
    parent2.replaceChild(replacement2, element2);
    parent1.replaceChild(element2, replacement1);
    parent2.replaceChild(element1, replacement2);
  }

  /**
   * Call callback function once dom element gets visible in viewport.
   * @async
   * @param {HTMLElement} dom DOM element to wait for.
   * @param {function} callback Function to call once DOM element is visible.
   * @param {object} [options] IntersectionObserver options.
   * @returns {IntersectionObserver} Promise for IntersectionObserver.
   */
  static async callOnceVisible(dom, callback, options = {}) {
    if (typeof dom !== 'object' || typeof callback !== 'function') {
      return; // Invalid arguments
    }

    options.threshold = options.threshold || 0;

    return await new Promise((resolve) => {
      // iOS is behind ... Again ...
      const idleCallback = window.requestIdleCallback ?? window.requestAnimationFrame;
      idleCallback(() => {
        // Get started once visible and ready
        const observer = new IntersectionObserver((entries) => {
          if (entries[0].isIntersecting) {
            observer.unobserve(dom);
            observer.disconnect();

            callback();
          }
        }, {
          ...(options.root && { root: options.root }),
          threshold: options.threshold,
        });
        observer.observe(dom);

        resolve(observer);
      });
    });
  }

  /**
   * HTML decode and strip HTML.
   * @param {string|object} html html.
   * @returns {string} html value.
   */
  static purifyHTML(html) {
    if (typeof html !== 'string') {
      return '';
    }

    let text = decode(html);
    const div = document.createElement('div');
    div.innerHTML = text;
    text = div.textContent || div.innerText || '';

    return text;
  }
}
