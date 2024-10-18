import Util from '@services/util.js';
import './element-area.scss';

/** @constant {number[]} ZOOM_FACTORS Available zoom factors. */
// eslint-disable-next-line no-magic-numbers
const ZOOM_FACTORS = [1, 1.1, 1.33, 1.4, 1.5, 1.75, 2, 2.5, 3, 4, 5];

/** @constant {number} ZOOM_LEVEL_MIN Minimum zoom level available */
export const ZOOM_LEVEL_MIN = 0;

/** @constant {number} ZOOM_LEVEL_MAX Maximum zoom level available */
export const ZOOM_LEVEL_MAX = ZOOM_FACTORS.length - 1;

export default class ElementArea {

  constructor(params = {}, callbacks = {}) {
    this.params = Util.extend({}, params);

    this.callbacks = Util.extend({
      onChanged: () => {},
      onZoomChanged: () => {}
    }, callbacks);

    this.dom = document.createElement('div');
    this.dom.classList.add('h5p-editor-animator-element-area-wrapper-inner');

    this.lastKnownScrollPosition = 0;
    this.ticking = false;

    this.dom.addEventListener('wheel', (event) => {
      if ((event.deltaY ?? 0) === 0) {
        return;
      }

      event.preventDefault();

      const rect = this.dom.getBoundingClientRect();
      const mouseX = -rect.left + event.clientX;
      const mouseY = -rect.top + event.clientY;

      if (event.deltaY < 0) {
        this.zoomIn();
      }
      else {
        this.zoomOut();
      }

      // Calculate new scroll positions based on the mouse position
      const newScrollLeft = mouseX * ZOOM_FACTORS[this.zoomLevelIndex] - mouseX;
      const newScrollTop = mouseY * ZOOM_FACTORS[this.zoomLevelIndex] - mouseY;

      // Adjust scroll position
      this.dom.scrollLeft = newScrollLeft;
      this.dom.scrollTop = newScrollTop;

      // Ensure the scroll position is within bounds
      this.dom.scrollLeft = Math.max(0, Math.min(this.dom.scrollWidth - this.dom.clientWidth, this.dom.scrollLeft));
      this.dom.scrollTop = Math.max(0, Math.min(this.dom.scrollHeight - this.dom.clientHeight, this.dom.scrollTop));
    });

    this.elementArea = document.createElement('div');
    this.elementArea.classList.add('h5p-editor-animator-element-area');
    this.setZoomFactor(1);

    this.id = H5P.createUUID();
    this.dom.setAttribute('id', this.id);
    this.dom.append(this.elementArea);
  }

  /**
   * Get DOM.
   * @returns {HTMLElement} DOM.
   */
  getDOM() {
    return this.dom;
  }

  /**
   * Get DOM of actual element area.
   * @returns {HTMLElement} DOM of element area.
   */
  getElementArea() {
    return this.elementArea;
  }

  /**
   * Get current zoom factor.
   * @returns {number} Zoom factor.
   */
  getZoomFactor() {
    return ZOOM_FACTORS[this.zoomLevelIndex];
  }

  /**
   * Get element area ID.
   * @returns {string} ID.
   */
  getID() {
    return this.id;
  }

  /**
   * Show.
   */
  show() {
    this.dom.classList.remove('display-none');
  }

  /**
   * Hide.
   */
  hide() {
    this.dom.classList.add('display-none');
  }

  /**
   * Bring element to front.
   * @param {number} index Index of element to bring to front.
   */
  bringToFront(index) {
    this.elementArea.append(this.elementArea.children[index]);
  }

  /**
   * Send element to back.
   * @param {number} index Index of element to send to back.
   */
  sendToBack(index) {
    this.elementArea.prepend(this.elementArea.children[index]);
  }

  /**
   * Append to DOM.
   * @param {HTMLElement} dom DOM element.
   */
  appendElement(dom) {
    this.elementArea.append(dom);
  }

  swapElements(index1, index2) {
    const dom1 = this.elementArea.children[index1];
    const dom2 = this.elementArea.children[index2];

    Util.swapDOMElements(dom1, dom2);
  }

  /**
   * Set background color.
   * @param {string} color Color as CSS unit.
   */
  setBackgroundColor(color) {
    this.dom.style.setProperty('--backgroundColor', color);
  }

  /**
   * Set background image.
   * @param {string|null} url URL of the image or null to remove the image.
   */
  setBackgroundImage(url) {
    if (!url) {
      this.dom.style.removeProperty('--backgroundImageURL');
      return;
    }

    this.dom.style.setProperty('--backgroundImageURL', `url(${url})`);
  }

  /**
   * Set aspect ratio.
   * @param {number} aspectRatio Aspect ratio
   */
  setAspectRatio(aspectRatio) {
    this.dom.style.setProperty('--aspectRatio', aspectRatio);
  }

  /**
   * Get board size.
   * @returns {object} Height and width of board.
   */
  getSize() {
    const clientRect = this.elementArea.getBoundingClientRect();
    return { height: clientRect.height, width: clientRect.width };
  }

  zoomIn() {
    this.setZoomFactor(ZOOM_FACTORS[this.zoomLevelIndex + 1]);
  }

  zoomOut() {
    this.setZoomFactor(ZOOM_FACTORS[this.zoomLevelIndex - 1]);
  }

  /**
   * Set reuested zoom factor.
   * @param {number} zoomFactor Zoom factor requested to be set.
   */
  setZoomFactor(zoomFactor) {
    if (typeof zoomFactor !== 'number' || zoomFactor < ZOOM_LEVEL_MIN || zoomFactor > ZOOM_LEVEL_MAX) {
      return;
    }

    let bestFitIndex = 0;
    let bestFitDistance = Math.abs(ZOOM_FACTORS[0] - zoomFactor);
    for (let i = 1; i < ZOOM_FACTORS.length; i++) {
      const distance = Math.abs(ZOOM_FACTORS[i] - zoomFactor);
      if (distance < bestFitDistance) {
        bestFitIndex = i;
        bestFitDistance = distance;
      }
    }

    this.zoomLevelIndex = bestFitIndex;

    // eslint-disable-next-line no-magic-numbers
    this.elementArea.style.setProperty('--zoom', `${100 * this.getZoomFactor()}%`);

    this.dom.classList.toggle('overflow-scroll', this.getZoomFactor() > 1);

    this.callbacks.onZoomChanged(this.zoomLevelIndex);
  }
}
