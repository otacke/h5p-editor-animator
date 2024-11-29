import { getRandomOffset } from '@services/util.js';
import Util from '@services/util.js';

/** @constant {string} MAIN_MACHINENAME Content type main machine name. */
const MAIN_MACHINENAME = 'H5PEditor.Animator';

export default class DragNBarWrapper {

  constructor(params = {}, callbacks = {}) {
    this.params = Util.extend({
      subContentOptions: [],
      buttons: []
    }, params);

    this.callbacks = Util.extend({
      onStoppedMoving: () => {},
      onReleased: () => {},
      onMoved: () => {},
      onResized: () => {},
      createElement: () => {}
    }, callbacks);

    this.dnb = new H5P.DragNBar(
      this.params.buttons,
      H5P.jQuery(this.params.elementArea),
      H5P.jQuery(this.params.dialogContainer),
      { enableCopyPaste: true }
    );

    this.dnb.stopMovingCallback = (x, y) => {
      this.callbacks.onStoppedMoving(
        // Seems there's no better way to get hold of element added
        this.dnb.dnd.$element.data('id'), x, y
      );
    };

    this.dnb.dnd.releaseCallback = () => {
      if (this.dnb.newElement) {
        setTimeout(() => {
          // Seems there's no better way to get hold of element added
          this.callbacks.onReleased(this.dnb.dnd.$element.data('id'));
        }, 1);
      }
    };

    this.dnb.dnd.moveCallback = (x, y, $element) => {
      this.callbacks.onMoved(
        $element.data('id'),
        Math.round(parseFloat($element.css('left'))),
        Math.round(parseFloat($element.css('top')))
      );
    };

    this.dnb.dnr.on('stoppedResizing', (event) => {
      const $element = this.dnb.$element;

      this.callbacks.onResized(
        $element.data('id'),
        parseFloat($element.css('left')),
        parseFloat($element.css('top')),
        parseFloat($element.css('width')),
        parseFloat($element.css('height')),
      );
    });

    // Listen for H5P content being copied to clipboard
    H5P.externalDispatcher.on('datainclipboard', (event) => {
      if (!this.params.subContentOptions.length || event.data?.reset) {
        return;
      }

      this.updatePasteButton();
    });

    this.dnb.on('paste', (event) => {
      this.handlePaste(event.data);
    });
  }

  /**
   * Attach DnB toolbar to DOM.
   * @param {HTMLElement} dom DOM element to attach to.
   */
  attach(dom) {
    this.parentDOM = dom;

    this.dnb.attach(H5P.jQuery(dom));
    this.updatePasteButton();
  }

  /**
   * Get parent DOM.
   * @returns {HTMLElement} Parent DOM.
   */
  getParentDOM() {
    return this.parentDOM;
  }

  /**
   * Relay `add` to DnB toolbar.
   * @param {H5P.jQuery} $element Element.
   * @param {string} [clipboardData] Clipboard data.
   * @param {object} [options] Options.
   * @param {H5P.DragNBarElement} [options.dnbElement] Register new element with dnbelement.
   * @param {boolean} [options.disableResize] If true, disable resize.
   * @param {boolean} [options.lock] If true, lock ratio during resize.
   * @returns {H5P.DragNBarElement} Reference to added dnbelement.
   */
  add($element, clipboardData, options) {
    return this.dnb.add($element, clipboardData, options);
  }

  /**
   * Remove element from DnB toolbar that needs to be replaced.
   * @param {object} dnbElement DnB element.
   */
  remove(dnbElement) {
    this.dnb.elements.splice(this.dnb.elements.indexOf(dnbElement), 1);
  }

  /**
   * Focus element in DnB toolbar.
   * @param {Element} element Element.
   */
  focus(element) {
    this.dnb.focus(element.getData().$element);
  }

  /**
   * Relay `blurAll` to DnB toolbar.
   */
  blurAll() {
    this.dnb.blurAll();
  }

  /**
   * Set container font size in em. Required for DnR for resizing.
   * @param {number} fontSize Font size.
   */
  setContainerEm(fontSize) {
    // Must set containerEm for resizing
    this.dnb.dnr.setContainerEm(fontSize);
  }

  /**
   * Update coordinates of DnB toolbar.
   */
  updateCoordinates() {
    this.dnb.updateCoordinates();
  }

  /**
   * Update paste button.
   */
  updatePasteButton() {
    this.dnb.setCanPaste(this.canPaste(H5P.getClipboard()));
  }

  /**
   * Determine whether the content can be pasted.
   * @param {object} clipboard Clipboard content (usually from H5P.getClipboard()).
   * @returns {boolean} True if content can be pasted, else false.
   */
  canPaste(clipboard) {
    if (!clipboard) {
      return false;
    }

    const isSubContentSupported = this.isSubContentSupported(clipboard.generic?.library);

    if (clipboard.from === MAIN_MACHINENAME && (!clipboard.generic || isSubContentSupported)) {
      return true; // Content comes from the same version of compound content type
    }
    else if (clipboard.generic && isSubContentSupported) {
      return true; // Supported library from another content type
    }

    return false;
  };

  /**
   * Determine whether subcontent library is supported.
   * @param {string} uberName Uber name of content type library.
   * @returns {boolean} True if supported, else false.
   */
  isSubContentSupported(uberName) {
    return !!this.params.subContentOptions.find((option) => option.uberName === uberName);
  };

  /**
   * Handle pasted from clipboard and create new element if possible.
   * @param {object} pasted Pasted content.
   */
  handlePaste(pasted = {}) {
    if (!pasted.generic || !this.isSubContentSupported(pasted.generic.library)) {
      this.params.globals.get('showConfirmationDialog')({
        headerText: H5PEditor.t('core', 'pasteError'),
        dialogText: H5PEditor.t('H5P.DragNBar', 'unableToPaste'),
        confirmText: this.params.dictionary.get('l10n.ok')
      });

      return; // Unsupported library
    }

    let $element;
    if (pasted.from === MAIN_MACHINENAME) {
      if (pasted.specific.x) {
        pasted.specific.x = String(parseFloat(pasted.specific.x) + getRandomOffset());
      }
      if (pasted.specific.y) {
        pasted.specific.y = String(parseFloat(pasted.specific.y) + getRandomOffset());
      }

      $element = this.callbacks.createElement(pasted.specific);
    }
    else {
      const elementAreaRect = this.params.elementArea.getBoundingClientRect();
      $element = this.callbacks.createElement({
        contentType: pasted.generic,
        generic: 'contentType',
        // eslint-disable-next-line no-magic-numbers
        ...(pasted.width && { width: Math.min(pasted.width, 100) }),
        // eslint-disable-next-line no-magic-numbers
        ...(pasted.height && { height: Math.min(pasted.height * elementAreaRect.width / elementAreaRect.height, 100) }),
      });
    }

    window.requestAnimationFrame(() => {
      this.dnb.focus($element);
    });
  }
}
