import Util from '@services/util.js';
import Runnable from '@models/runnable.js';

import './element.scss';

/** @constant {number} DEFAULT_ASPECT_RATIO_VIDEO Default aspect ratio for videos. */
// eslint-disable-next-line no-magic-numbers
const DEFAULT_ASPECT_RATIO_VIDEO = 16 / 9;

/** @constant {number} HORIZONTAL_CENTER Horizontal center. */
const HORIZONTAL_CENTER = 50;

/** @constant {number} VERTICAL_CENTER Vertical center. */
const VERTICAL_CENTER = 50;

const DEFAULT_SIZE_PERCENT = {
  width: 50,
  height: 50
};

export default class Element {
  /**
   * @class
   * @param {object} [params] Parameters.
   * @param {object} [callbacks] Callbacks.
   * @param {function} [callbacks.onClick] Callback for click on button.
   */
  constructor(params = {}, callbacks = {}) {
    params.elementParams = Util.extend({
      // eslint-disable-next-line no-magic-numbers
      x: `${HORIZONTAL_CENTER - DEFAULT_SIZE_PERCENT.width / 2}`,
      // eslint-disable-next-line no-magic-numbers
      y: `${VERTICAL_CENTER - DEFAULT_SIZE_PERCENT.height * 0.5 / 2}`,
      width: `${DEFAULT_SIZE_PERCENT.width}`,
      height: `${DEFAULT_SIZE_PERCENT.height}`,
    }, params.elementParams);

    this.params = Util.extend({
    }, params);

    this.callbacks = Util.extend({
      onEdited: () => {},
      onRemoved: () => {},
      onBroughtToFront: () => {},
      onSentToBack: () => {},
      onChanged: () => {},
      getPosition: () => {}
    }, callbacks);

    this.buildDOM();

    H5P.jQuery(this.dom).data('id', this.params.index); // DnB tradeoff

    this.form = this.generateForm(
      this.params.elementFields,
      this.params.elementParams
    );
    this.form.$element = H5P.jQuery(this.dom);
    this.form.$element.position = () => {
      return {
        left: parseFloat(this.dom.style.left),
        top: parseFloat(this.dom.style.top)
      };
    };

    this.updateParams(this.params.elementParams);
  }

  /**
   * Build DOM.
   */
  buildDOM() {
    this.dom = document.createElement('div');
    this.dom.classList.add('h5p-editor-animator-element');

    const instanceWrapper = document.createElement('div');
    instanceWrapper.classList.add('h5p-editor-animator-element-instance-wrapper');
    this.dom.appendChild(instanceWrapper);

    this.clickBlocker = document.createElement('div');
    this.clickBlocker.classList.add('h5p-editor-animator-element-click-blocker');
    instanceWrapper.appendChild(this.clickBlocker);

    this.dom.addEventListener('click', (event) => {
      Util.doubleClick(event, () => {
        this.callbacks.onEdited(this);
      });
    });
  }

  /**
   * Constructor.
   * @param {object} library Library Parameters.
   */
  updateRunnable(library) {
    if (!library) {
      return;
    }

    if (this.instanceHolder) {
      this.instanceHolder.remove();
    }

    this.instanceHolder = document.createElement('div');
    this.instanceHolder.classList.add('h5p-editor-animator-element-instance');
    this.clickBlocker.parentNode.insertBefore(this.instanceHolder, this.clickBlocker);

    const runnable = new Runnable({
      library: library,
      contentID: this.params.globals.get('contentId'),
      eventDispatcher: this.params.globals.get('mainInstance')
    });

    if (!runnable) {
      return;
    }

    const instance = runnable.getInstance();

    // H5P.Shape needs extra treatment. It sets its own size for line types, and
    // some values need to be set based on what shape was displayed before.
    if (instance.libraryInfo.machineName === 'H5P.Shape') {
      const currentShapeType = library.params.type;

      if (this.previousShapeType === 'vertical-line' && currentShapeType !== 'vertical-line') {
        // Ensure the width is reset
        this.dom.style.maxWidth = '';
        this.params.elementParams.width = DEFAULT_SIZE_PERCENT.width;
      }
      else if (this.previousShapeType === 'horizontal-line' && currentShapeType !== 'horizontal-line') {
        // Ensure the height is reset
        this.dom.style.maxHeight = '';
        this.params.elementParams.height = DEFAULT_SIZE_PERCENT.height;
      }
      else if (this.previousShapeType !== 'cirle' && currentShapeType === 'circle') {
        // Ensure that circle is a circle
        const aspectRatio = this.params.globals.get('aspectRatio');

        if (this.params.elementParams.width > this.params.elementParams.height) {
          this.params.elementParams.height = this.params.elementParams.width * aspectRatio;
        }
        else {
          this.params.elementParams.width = this.params.elementParams.height / aspectRatio;
        }
      }

      this.previousShapeType = currentShapeType;

      // H5P.Shape needs extra treatment. It sets its own size for line types.
      instance.on('set-size', (event) => {
        if (event.data.maxWidth) {
          this.dom.style.maxWidth = event.data.maxWidth;
        }
        if (event.data.maxHeight) {
          this.dom.style.maxHeight = event.data.maxHeight;
        }
      });
    }

    runnable.attach(this.instanceHolder);

    this.createDNBElement(this.params.elementParams);
  }

  /**
   * Get DOM.
   * @returns {HTMLElement} DOM.
   */
  getDOM() {
    return this.dom;
  }

  /**
   * Set index.
   * @param {number} index Index of map element.
   */
  setIndex(index) {
    this.form.$element.data('id', index); // DragNBar compromise
    this.params.index = index;
  }

  /**
   * Get index.
   * @returns {number} index Index of map element.
   */
  getIndex() {
    return this.params.index;
  }

  /**
   * Get form data.
   * @returns {object} Form data.
   */
  getData() {
    return this.form;
  }

  /**
   * Get element parameters.
   * @returns {object} Element parameters.
   */
  getParams() {
    return this.params.elementParams;
  }

  /**
   * Update parameters. Assuming all properties to use percentage.
   * @param {object} [params] Parameters.
   */
  updateParams(params = {}) {
    if (params.contentType) {
      this.updateRunnable(params.contentType);
    }

    ['x', 'y'].forEach((prop) => {
      if (typeof params[prop] === 'number') {
        // eslint-disable-next-line no-magic-numbers
        params[prop] = Math.max(0, Math.min(params[prop], 100));
        this.params.elementParams[prop] = params[prop];
      }
    });

    if (params.width) {
      this.params.elementParams.width = params.width;
    }

    if (params.height) {
      this.params.elementParams.height = params.height;
    }

    this.params.elementParams = this.fitIntoArea(this.params.elementParams);

    this.dom.style.left = `${this.params.elementParams.x}%`;
    this.dom.style.top = `${this.params.elementParams.y}%`;
    this.dom.style.width = `${this.params.elementParams.width}%`;
    this.dom.style.height = `${this.params.elementParams.height}%`;

    this.callbacks.onChanged(this.params.index, this.params.elementParams);
  }

  /**
   * Remove map element from DOM.
   */
  remove() {
    this.dom.remove();
  }

  /**
   * Create DragNBar element.
   * @param {object} elementParams Parameters for element.
   */
  createDNBElement(elementParams) {
    const machineName = elementParams.contentType.library.split(' ')[0];

    const options = {
      disableResize: false,
      lock: ['H5P.Image', 'H5P.Video'].includes(machineName),
      cornerLock: ['H5P.Image', 'H5P.Shape'].includes(machineName),
    };

    if (machineName === 'H5P.Shape') {
      if (elementParams.contentType.params.type === 'vertical-line') {
        options.directionLock = 'vertical';
        options.minSize = 3;
      }
      else if (elementParams.contentType.params.type === 'horizontal-line') {
        options.directionLock = 'horizontal';
        options.minSize = 3;
      }
      else {
        options.cornerLock = false;
        options.minSize = 10;
      }
    }

    if (this.dnbElement) {
      this.params.dnb.remove(this.dnbElement);
      delete this.dnbElement;
    }

    const $element = this.getData().$element;
    // Overriding position method as zooming is not supported in DnB
    $element.position = () => {
      return this.callbacks.getPosition($element.get(0));
    };

    this.dnbElement = this.params.dnb.add($element, '', options);

    this.dnbElement.contextMenu.on('contextMenuEdit', () => {
      this.callbacks.onEdited(this);
    });

    this.dnbElement.contextMenu.on('contextMenuRemove', () => {
      this.dnbElement.blur();
      this.callbacks.onRemoved(this);
    });

    this.dnbElement.contextMenu.on('contextMenuBringToFront', () => {
      this.callbacks.onBroughtToFront(this);
    });

    this.dnbElement.contextMenu.on('contextMenuSendToBack', () => {
      this.callbacks.onSentToBack(this);
    });
  }

  /**
   * Generate form.
   * @param {object} semantics Semantics for form.
   * @param {object} params Parameters for form.
   * @returns {object} Form object with DOM and H5P widget instances.
   */
  generateForm(semantics, params) {
    const form = document.createElement('div');

    H5PEditor.processSemanticsChunk(
      semantics,
      params,
      H5P.jQuery(form),
      this.params.globals.get('elementsGroupInstance')
    );

    const elementsGroupInstance = this.params.globals.get('elementsGroupInstance');
    const libraryWidget = H5PEditor.findField('contentType', elementsGroupInstance);

    // H5PEditor.library widget does not feature an error field. Inject one.
    const library = form.querySelector('.field.library');
    if (library) {
      const errors = document.createElement('div');
      errors.classList.add('h5p-errors');
      library.appendChild(errors);

      if (libraryWidget) {
        libraryWidget.changes.push(() => {
          errors.innerHTML = ''; // Erase once a library is selected
        });
      }
    }

    if (libraryWidget) {
      if (!libraryWidget.children) {
        libraryWidget.changes.push(() => {
          this.handleLibraryChanged(libraryWidget, params);
        });
      }
      else {
        this.handleLibraryChanged(libraryWidget, params);
      }
    }

    return {
      form: form,
      children: elementsGroupInstance.children
    };
  }

  /**
   * Handle editor library widget changed (or loaded).
   * @param {H5PEditor.Library} libraryWidget Library widget.
   */
  handleLibraryChanged(libraryWidget) {
    const machineName = libraryWidget.$select.get(0).value.split(' ')[0];
    if (!machineName) {
      return;
    }

    if (machineName === 'H5P.Image') {
      const imageWidget = H5PEditor.findField('file', libraryWidget);
      if (!imageWidget) {
        return;
      }

      imageWidget.changes.push((fileParams = {}) => {
        this.setMediaSize(fileParams, 'image');
      });
    }
    else if (machineName === 'H5P.Video') {
      const videoWidget = H5PEditor.findField('sources', libraryWidget);
      if (!videoWidget) {
        return;
      }

      videoWidget.changes.push((fileParams = {}) => {
        this.setMediaSize(fileParams, 'video');
      });
    }
  }

  /**
   * Ensure that element fits into element area.
   * @param {object} telemetry Telemetry data.
   * @returns {object} Fitted telemetry data.
   */
  fitIntoArea(telemetry = {}) {
    const aspectRatio = this.params.globals.get('aspectRatio');
    if (
      // eslint-disable-next-line no-magic-numbers
      telemetry.width > 100 || telemetry.height > 100) {
      // eslint-disable-next-line no-magic-numbers
      const scaleFactor = (aspectRatio > 1) ? 100 / telemetry.height : 100 / telemetry.width;

      telemetry.width = telemetry.width * scaleFactor;
      telemetry.height = telemetry.height * scaleFactor;
    }

    // eslint-disable-next-line no-magic-numbers
    if (telemetry.x + telemetry.width > 100) {
      // eslint-disable-next-line no-magic-numbers
      telemetry.x = 100 - telemetry.width;
    }
    // eslint-disable-next-line no-magic-numbers
    if (telemetry.y + telemetry.height > 100) {
      // eslint-disable-next-line no-magic-numbers
      telemetry.y = 100 - telemetry.height;
    }

    return telemetry;
  }

  /**
   * Set media element size to natural aspect ratio once file is loaded.
   * @param {object} fileParams File parameters.
   * @param {string} type [image|video] Type of media.
   */
  setMediaSize(fileParams = {}, type = 'image') {
    if (type === 'image' && (!fileParams.width || !fileParams.height)) {
      return;
    }

    const elementParams = this.getParams();
    const aspectRatio = this.params.globals.get('aspectRatio');

    const mediaAspectRatio = (type === 'image') ?
      fileParams.width / fileParams.height :
      (fileParams.aspectRatio || DEFAULT_ASPECT_RATIO_VIDEO);

    let width, height;
    if (mediaAspectRatio > 1) { // Landscape
      width = elementParams.width;
      height = elementParams.width / mediaAspectRatio * aspectRatio;
    }
    else { // Portrait
      height = elementParams.height;
      width = elementParams.height * mediaAspectRatio / aspectRatio;
    }

    this.updateParams({ width: width, height: height });
  }
}
