import Dictionary from '@services/dictionary.js';
import Globals from '@services/globals.js';
import Util from '@services/util.js';
import Main from '@components/main.js';

import '@styles/h5peditor-animator.scss';

/** @constant {string} DEFAULT_ASPECT_RATIO Default aspect ratio. */
const DEFAULT_ASPECT_RATIO = '16/9';

/** @constant {number} BASE_WIDTH_PX Base width for font size computation. */
const BASE_WIDTH_PX = 640;

/** @constant {number} BASE_FONT_SIZE_PX Base font size. */
const BASE_FONT_SIZE_PX = 16;

/** Class for Animator H5P widget */
export default class Animator extends H5P.EventDispatcher {

  /**
   * @class
   * @param {object} parent Parent element in semantics.
   * @param {object} field Semantics field properties.
   * @param {object} params Parameters entered in editor form.
   * @param {function} setValue Callback to set parameters.
   */
  constructor(parent, field, params, setValue) {
    super();

    this.parent = parent;
    this.field = field;
    this.params = Util.extend({
      elements: [],
      animations: []
    }, params);
    this.setValue = setValue;

    this.dictionary = new Dictionary();
    this.fillDictionary();

    this.globals = new Globals();
    this.globals.set('mainInstance', this);
    this.globals.set('contentId', H5PEditor.contentId); // Will be undefined if new content
    this.globals.set('aspectRatio', this.retrieveAspectRatio(this.params.aspectRatio));
    this.globals.set('showConfirmationDialog', (params) => {
      this.showConfirmationDialog(params);
    });
    this.globals.set('resize', () => {
      this.trigger('resize');
    });

    // Callbacks to call when parameters change
    this.changes = [];

    // Let parent handle ready callbacks of children
    this.passReadies = true;

    // Instantiate original field (or create your own and call setValue)
    this.fieldInstance = new H5PEditor.widgets[this.field.type](
      this.parent, this.field, this.params, this.setValue
    );

    // DOM
    this.dom = this.buildDOM();
    this.$container = H5P.jQuery(this.dom); // TODO: Replace once H5P Group removes jQuery from H5P core

    this.buildMain();

    document.addEventListener('mousedown', (event) => {
      this.main?.handleDocumentMouseDown(event);
    });

    window.addEventListener('resize', () => {
      this.main?.resize();
    });

    this.parent.ready(() => {
      this.passReadies = false;

      this.initFieldHandlers();
    });
  }

  /**
   * Initialize handlers of H5P editor fields outside of this widget.
   * Can be called multiple times by different init functions running asynchronously.
   */
  initFieldHandlers() {
    if (!this.backgroundColorFieldInstance) {
      this.backgroundColorFieldInstance = H5PEditor.findField('background/backgroundColor', this.parent);
      this.backgroundColorFieldInstance?.changes.push(() => {
        this.setBackgroundColor(this.backgroundColorFieldInstance.getColor());
      });
    }

    if (!this.backgroundImageFieldInstance) {
      this.backgroundImageFieldInstance = H5PEditor.findField('background/backgroundImage', this.parent);
      this.backgroundImageFieldInstance?.changes.push((imageData) => {
        this.setBackgroundImage(imageData);
      });
    }

    if (!this.audioFieldInstance) {
      this.audioFieldInstance = this.audioFieldInstance ?? H5PEditor.findField('audio/audio', this.parent);
    }

    if (!this.aspectRatioFieldInstance) {
      this.aspectRatioFieldInstance = H5PEditor.findField('behaviour/aspectRatio', this.parent);
      this.aspectRatioFieldInstance?.change(() => {
        this.setAspectRatio(this.aspectRatioFieldInstance.value);
      });
    }

    if (!this.hideControlsFieldInstance) {
      this.hideControlsFieldInstance = H5PEditor.findField('behaviour/hideControls', this.parent);
    }

    if (this.aspectRatioFieldInstance) {
      this.setAspectRatio(this.aspectRatioFieldInstance.value);
    }

    if (this.backgroundColorFieldInstance) {
      this.setBackgroundColor(this.backgroundColorFieldInstance.getColor());
    }

    if (this.backgroundImageFieldInstance) {
      this.setBackgroundImage(this.backgroundImageFieldInstance.params);
    }
  }

  /**
   * Set background color.
   * @param {string} color Color as CSS unit.
   */
  setBackgroundColor(color) {
    this.main?.setBackgroundColor(color);
  }

  /**
   * Set background image.
   * @param {object} imageData Paremeters from H5P editor image widget.
   */
  setBackgroundImage(imageData) {
    const contentPath = imageData?.path;
    if (!contentPath) {
      this.main?.setBackgroundImage(null);
      return;
    }

    this.main?.setBackgroundImage(H5P.getPath(contentPath, this.globals.get('contentId')));
  }

  /**
   * Set aspect ratio.
   * @param {number|string} value Aspect ratio.
   */
  setAspectRatio(value) {
    const aspectRatio = this.retrieveAspectRatio(value);
    this.globals.set('aspectRatio', aspectRatio);
    this.main?.setAspectRatio(aspectRatio);
  }

  /**
   * Retrieve aspect ratio.
   * @param {number|string} aspectRatio Aspect ratio.
   * @returns {number} Aspect ratio.
   */
  retrieveAspectRatio(aspectRatio) {
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
  }

  /**
   * Build main component.
   */
  async buildMain() {
    // Create instance for elements group field
    const elementsGroup = this.field.fields.find((field) => field.name === 'elements').field;
    const elementsFields = H5P.cloneObject(elementsGroup.fields, true);

    this.globals.set('elementsGroupInstance', new H5PEditor.widgets[elementsGroup.type](
      this, elementsGroup, this.params.elements, () => {} // No setValue needed
    ));

    const animationsGroup = this.field.fields.find((field) => field.name === 'animations').field;
    const animationsFields = H5P.cloneObject(animationsGroup.fields, true);

    this.globals.set('animationsGroupInstance', new H5PEditor.widgets[animationsGroup.type](
      this, animationsGroup, this.params.animations, () => {} // No setValue needed
    ));

    this.main = new Main(
      {
        dictionary: this.dictionary,
        globals: this.globals,
        elements: this.params.elements,
        elementsFields: elementsFields,
        animations: this.params.animations,
        animationsFields: animationsFields,
        subContentOptions: await this.getSubcontentOptions(),
        baseWidth: BASE_WIDTH_PX,
        baseFontSize: BASE_FONT_SIZE_PX
      },
      {
        onChanged: (values) => {
          this.setValues(values);
        },
        getPreviewParams: () => {
          return ({
            a11y: this.parent.commonFields[this.getUberName()].a11y.params,
            audio: {
              audio: this.audioFieldInstance?.params
            },
            background: {
              backgroundColor: this.backgroundColorFieldInstance?.getColor(),
              backgroundImage: this.backgroundImageFieldInstance?.params
            },
            behaviour: {
              aspectRatio: this.globals.get('aspectRatio'),
              hideControls: this.hideControlsFieldInstance?.value
            },
            editor: {
              elements: this.params.elements,
              animations: this.params.animations
            }
          });
        }
      }
    );
    this.dom.append(this.main.getDOM());

    this.initFieldHandlers();
  }

  /**
   * Get subcontent options from H5P library list cache.
   * @async
   * @returns {object[]} Subcontent options.
   */
  async getSubcontentOptions() {
    const subContentOptions = await this.determineValidSubContentOptions();

    // For sorting in the toolbar
    const subContentPriorities = {
      'H5P.AdvancedText': 0,
      'H5P.Image': 1,
      'H5P.Video': 2,
      'H5P.Shape': 3
    };
    const nextPriority = Math.max(...Object.values(subContentPriorities)) + 1;

    return subContentOptions.sort((current, previous) => {
      const priorityCurrent = subContentPriorities[current.name] ?? nextPriority;
      const priorityPrevious = subContentPriorities[previous.name] ?? nextPriority;

      if (priorityCurrent !== priorityPrevious) {
        return priorityCurrent - priorityPrevious;
      }

      return priorityCurrent.localeCompare(priorityPrevious);
    });
  }

  /**
   * Determine valid subcontent options.
   * @async
   * @returns {object[]} Valid subcontent options.
   */
  async determineValidSubContentOptions() {
    const contentTypeField = H5PEditor.findSemanticsField('contentType', this.field);
    const subContentOptions = contentTypeField?.options ?? [];

    const libraries = await new Promise((resolve) => {
      H5PEditor.LibraryListCache.getLibraries(subContentOptions, resolve);
    });

    return libraries.filter((library) =>
      !library.isRestricted && subContentOptions.includes(library.uberName)
    );
  }

  /**
   * Append field to wrapper. Invoked by H5P core.
   * @param {H5P.jQuery} $wrapper Wrapper.
   */
  appendTo($wrapper) {
    $wrapper.get(0).append(this.$container.get(0));
  }

  /**
   * Validate current values. Invoked by H5P core.
   * @returns {boolean} True, if current value is valid, else false.
   */
  validate() {
    return this.fieldInstance.validate();
  }

  /**
   * Remove self. Invoked by H5P core.
   */
  remove() {
    this.$container.get(0).remove();
  }

  /**
   * Ready handler.
   * @param {function} ready Ready callback.
   */
  ready(ready) {
    if (!this.passReadies) {
      ready();
      return;
    }

    this.parent.ready(ready);
  }

  /**
   * Handle change of field.
   */
  handleFieldChange() {
    this.params = this.fieldInstance.params;
    this.changes.forEach((change) => {
      change(this.params);
    });
  }

  /**
   * Build DOM.
   * @returns {HTMLElement} DOM for this class.
   */
  buildDOM() {
    const dom = document.createElement('div');
    dom.classList.add('h5peditor-animator');

    return dom;
  }

  /**
   * Fill Dictionary.
   */
  fillDictionary() {
    // Convert H5PEditor language strings into object.
    const plainTranslations = H5PEditor.language['H5PEditor.Animator'].libraryStrings || {};
    const translations = {};

    for (const key in plainTranslations) {
      let current = translations;
      // Assume string keys separated by . or / for defining path
      const splits = key.split(/[./]+/);
      const lastSplit = splits.pop();

      // Create nested object structure if necessary
      splits.forEach((split) => {
        if (!current[split]) {
          current[split] = {};
        }
        current = current[split];
      });

      // Add translation string
      current[lastSplit] = plainTranslations[key];
    }

    this.dictionary.fill(translations);
  }

  /**
   * Get uber name of Animator library.
   * @returns {string} Uber name of Animator library.
   */
  getUberName() {
    return Object.keys(
      H5PEditor.libraryLoaded).find((library) => library.split(' ')[0] === 'H5P.Animator'
    );
  }

  /**
   * Set values and store them.
   * @param {object} values Values to set for respective keys.
   */
  setValues(values) {
    for (const key in values) {
      this.params[key] = values[key];
    }

    this.findInconsistencies();

    this.setValue(this.field, this.params);
  }

  findInconsistencies() {
    this.params.animations.forEach((animation) => {
      const subcontentId = animation.subContentId;
      const ok = this.params.elements.some((element) => element.contentType?.subContentId === subcontentId);
      if (!ok) {
        console.error(`Animation with subcontent ID ${subcontentId} does not have a corresponding element.`);
        debugger
      }
    });
  }

  /**
   * Show confirmation dialog.
   * @param {object} [params] Parameters.
   */
  showConfirmationDialog(params = {}) {
    const confirmationDialog = new H5P.ConfirmationDialog({
      headerText: params.headerText,
      dialogText: params.dialogText,
      cancelText: params.cancelText,
      confirmText: params.confirmText,
      hideCancel: !params.cancelText,
    });
    confirmationDialog.on('confirmed', () => {
      params.callbackConfirmed?.();
    });
    confirmationDialog.on('canceled', () => {
      params.callbackCanceled?.();
    });

    confirmationDialog.appendTo(this.dom);
    confirmationDialog.show();
  }
}
