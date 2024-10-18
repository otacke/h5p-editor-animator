import Util from '@services/util.js';
import DragNBarWrapper from '@models/drag-n-bar-wrapper.js';
import Dialog from '@components/dialog/dialog.js';
import ElementArea from './element-area/element-area.js';
import { ZOOM_LEVEL_MAX } from './element-area/element-area.js';
import Element from './element-area/element.js';
import ToolbarMain from './toolbar/toolbar-main.js';
import ToolbarGroup from './toolbar/toolbar-group.js';
import Sidebar from './sidebar/sidebar.js';
import ListElements from './sidebar/list-elements.js';
import ListAnimations from './sidebar/list-animations.js';

import './board.scss';

/** @constant {string} KEY_SHORTCUTS_ZOOM_IN Key shortcut for zooming in. */
export const KEY_SHORTCUTS_ZOOM_IN = '+';

/** @constant {string} KEY_SHORTCUTS_ZOOM_OUT Key shortcut for zooming out. */
export const KEY_SHORTCUTS_ZOOM_OUT = '-';

export default class Board {

  constructor(params = {}, callbacks = {}) {
    this.params = Util.extend({
      elements: [],
      animations: [],
    }, params);

    this.callbacks = Util.extend({
      onChanged: () => {}
    }, callbacks);

    this.elements = [];

    this.dom = document.createElement('div');
    this.dom.classList.add('h5p-editor-animator-board');

    this.elementArea = new ElementArea(
      {},
      {
        onZoomChanged: (zoom) => {
          this.handleZoomChanged(zoom);
        }
      }
    );

    this.dialog = new Dialog({ dictionary: this.params.dictionary });

    this.dnb = new DragNBarWrapper(
      {
        buttons: this.params.subContentOptions.map((option) => this.createButton(option)),
        dialogContainer: this.elementArea.getDOM(),
        elementArea: this.elementArea.getElementArea(),
      },
      {
        onStoppedMoving: (index, x, y) => {
          // TODO: Remove this callback if we don't need it
        },
        onReleased: (index) => {
          this.edit(this.elements[index]);
        },
        onMoved: (index, x, y) => {
          this.updateElementPosition(
            index,
            this.convertToPercent({ x: x }),
            this.convertToPercent({ y: y })
          );
        },
        onResized: (index, left, top, width, height) => {
          this.updateElementSize(
            index,
            this.convertToPercent({ x: width }),
            this.convertToPercent({ y: height })
          );

          this.updateElementPosition(
            index,
            this.convertToPercent({ x: left }),
            this.convertToPercent({ y: top })
          );
        }
      }
    );

    const dnbWrapper = document.createElement('div');
    this.dnb.attach(dnbWrapper);

    const contentButtons = new ToolbarGroup(
      {
        dnbDOM: dnbWrapper,
        a11y: {
          toolbarLabel: this.params.dictionary.get('a11y.toolbarLabelContents')
        },
        ariaControlsId: this.elementArea.getID()
      }, {
        onKeydown: (createdElement) => {
          const element = this.elements.find((element) => element.getDOM() === createdElement);
          if (!element) {
            return;
          }

          this.edit(element);
        }
      }
    );

    const toolbarButtons = [
      {
        id: 'list-view',
        tooltip: this.params.dictionary.get('l10n.toolbarButtonListView'),
        type: 'toggle',
        a11y: {
          active: this.params.dictionary.get('a11y.buttonListViewInActive'),
          inactive: this.params.dictionary.get('a11y.buttonListviewInInactive'),
        },
        onClick: () => {
          this.toggleSidebar();
        }
      },
      {
        id: 'zoom-in',
        tooltip: this.params.dictionary.get('l10n.toolbarButtonZoomIn'),
        type: 'pulse',
        a11y: {
          active: this.params.dictionary.get('a11y.buttonZoomInActive'),
          inactive: this.params.dictionary.get('a11y.buttonZoomInInactive'),
        },
        keyshortcuts: KEY_SHORTCUTS_ZOOM_IN,
        onClick: () => {
          this.elementArea.zoomIn();
        }
      },
      {
        id: 'zoom-out',
        tooltip: this.params.dictionary.get('l10n.toolbarButtonZoomOut'),
        type: 'pulse',
        a11y: {
          active: this.params.dictionary.get('a11y.buttonZoomOutActive'),
          inactive: this.params.dictionary.get('a11y.buttonZoomOutInactive'),
        },
        keyshortcuts: KEY_SHORTCUTS_ZOOM_OUT,
        onClick: () => {
          this.elementArea.zoomOut();
        }
      },
      {
        id: 'preview',
        tooltip: this.params.dictionary.get('l10n.toolbarButtonPreview'),
        type: 'pulse',
        a11y: {
          active: this.params.dictionary.get('a11y.buttonPreview'),
        },
        onClick: () => {
          // TODO: Implement preview
        }
      }
    ];

    this.actionButtons = new ToolbarGroup({
      buttons: toolbarButtons,
      className: 'h5p-editor-animator-toolbar-action',
      a11y: {
        toolbarLabel: this.params.dictionary.get('a11y.toolbarLabelActions')
      },
      ariaControlsId: this.elementArea.getID()
    }, {});

    this.toolbar = new ToolbarMain(
      {
        contentButtonsDOM: contentButtons.getDOM(),
        actionButtonsDOM: this.actionButtons.getDOM()
      },
      {
      }
    );
    this.dom.append(this.toolbar.getDOM());

    window.addEventListener('keydown', (event) => {
      if (event.target.tagName === 'INPUT' || event.target.tagName === 'TEXTAREA') {
        return;
      }

      if (KEY_SHORTCUTS_ZOOM_IN.split(' ').includes(event.key)) {
        this.elementArea.zoomIn();
      }
      else if (KEY_SHORTCUTS_ZOOM_OUT.split(' ').includes(event.key)) {
        this.elementArea.zoomOut();
      }
    });

    const mainArea = document.createElement('div');
    mainArea.classList.add('h5p-editor-animator-board-main-area');
    mainArea.append(this.elementArea.getDOM());
    this.dom.append(mainArea);

    // TODO ...
    this.listElements = new ListElements(
      {
        dictionary: this.params.dictionary,
        title: this.params.dictionary.get('l10n.elements'),
      },
      {
        toggleHighlightElement: (subContentId, state) => {
          this.toggleHighlightElement(subContentId, state);
        },
        changeElementZPosition: (sourceIndex, moveOffset, active) => {
          return this.changeElementZPosition(sourceIndex, moveOffset, active);
        },
        edit: (subContentId) => {
          this.edit(this.elements.find((element) => element.getSubContentId() === subContentId));
        },
        remove: (subContentId) => {
          this.removeIfConfirmed(this.elements.find((element) => element.getSubContentId() === subContentId));
        }
      }
    );

    this.listAnimations = new ListAnimations({
      dictionary: this.params.dictionary,
      title: this.params.dictionary.get('l10n.animations'),
    });

    this.sidebar = new Sidebar({
      subComponents: [this.listElements, this.listAnimations]
    }, {});
    mainArea.append(this.sidebar.getDOM());

    this.dom.appendChild(this.dialog.getDOM());

    this.params.elements.forEach((elementParams) => {
      this.createElement(elementParams);
    });

    this.toggleSidebar(false);

    window.requestAnimationFrame(() => {
      this.dnb.setContainerEm(parseFloat(window.getComputedStyle(this.elementArea.getDOM()).fontSize));
    });
  }

  /**
   * Get DOM.
   * @returns {HTMLElement} DOM.
   */
  getDOM() {
    return this.dom;
  }

  /**
   * Resize board.
   */
  resize() {
    window.clearTimeout(this.pinWrapperTimeout);
    this.pinWrapperTimeout = window.requestAnimationFrame(() => {
      this.elementArea.pinWrapperHeight();
    });
  }

  toggleSidebar(state) {
    this.isListViewActive = state ?? !this.isListViewActive;

    if (this.isListViewActive) {
      this.sidebar.show();
    }
    else {
      this.sidebar.hide();
    }

    this.resize();
    this.params.globals.get('resize')();
  }

  /**
   * Handle zoom was changed.
   * @param {number} zoomLevelIndex Zoom level index.
   */
  handleZoomChanged(zoomLevelIndex) {
    window.requestAnimationFrame(() => {
      if (zoomLevelIndex === 0) {
        this.actionButtons.disableButton('zoom-out');
      }
      else if (zoomLevelIndex === ZOOM_LEVEL_MAX) {
        this.actionButtons.disableButton('zoom-in');
      }
      else {
        this.actionButtons.enableButton('zoom-in');
        this.actionButtons.enableButton('zoom-out');
      }

      this.dnb.updateCoordinates();
    });
  }

  /**
   * Set background color.
   * @param {string} color Color as CSS unit.
   */
  setBackgroundColor(color) {
    this.elementArea.setBackgroundColor(color);
  }

  /**
   * Set background image.
   * @param {string|null} url URL of the image or null to remove the image.
   */
  setBackgroundImage(url) {
    this.elementArea.setBackgroundImage(url);
  }

  /**
   * Set aspect ratio.
   * @param {number} aspectRatio Aspect ratio.
   */
  setAspectRatio(aspectRatio) {
    this.elementArea.setAspectRatio(aspectRatio);
    this.resize();
    this.params.globals.get('resize')();
  }

  /**
   * Create button for toolbar.
   * @param {object} [params] Parameters of H5P library.
   * @returns {object} Button object for DragNBar.
   */
  createButton(params = {}) {
    // Button configuration is set by DragNBar :-/

    const title = params.title.toLowerCase();

    return {
      id: title,
      title: this.params.dictionary.get(`l10n.toolbarButton-${title}`),
      createElement: () => {
        return this.createElement({
          contentType: {
            library: params.uberName,
            params: {}
          }
        });
      }
    };
  }

  /**
   * Create element for element area.
   * @param {object} params Parameters.
   * @returns {H5P.jQuery} DOM element. JQuery, because of DragNBar.
   */
  createElement(params = {}) {
    const index = this.elements.length;

    const element = new Element(
      {
        globals: this.params.globals,
        index: index,
        elementParams: params,
        elementFields: this.params.elementsFields,
        dnb: this.dnb
      },
      {
        onEdited: (element) => {
          this.edit(element);
        },
        onRemoved: (element) => {
          this.removeIfConfirmed(element);
        },
        onBroughtToFront: (element) => {
          this.bringToFront(element);
        },
        onSentToBack: (element) => {
          this.sendToBack(element);
        },
        onChanged: (index, elementParams) => {
          this.params.elements[index] = elementParams;
          this.callbacks.onChanged({ elements: this.params.elements });
        },
        getPosition: (element) => {
          const elementRect = element.getBoundingClientRect();
          const elementAreaRect = this.elementArea.getDOM().getBoundingClientRect();
          const left = elementRect.left - elementAreaRect.left + this.elementArea.getDOM().scrollLeft;
          // eslint-disable-next-line no-magic-numbers
          const top = elementRect.top - elementAreaRect.top + 2 * this.elementArea.getDOM().scrollTop;

          return { left: left, top: top };
        }
      }
    );

    // TODO: Rename this.elements to something better
    // Important: The order of these must not be changed
    this.elements.push(element);
    this.elementArea.appendElement(element.getDOM());

    const elementParams = this.params.elements[index];

    const contentTypeName = elementParams.contentType.library.split(' ')[0].split('.').pop();

    const title =
      elementParams.contentType?.metadata?.title ??
      H5PEditor.t('core', 'untitled').replace(':libraryTitle', contentTypeName);

    this.listElements.add({
      title: title,
      details: contentTypeName,
      subContentId: elementParams.contentType.subContentId
    });

    return element.getData().$element;
  }

  /**
   * Update element position
   * @param {number} index Map element index.
   * @param {number} x X position as percentage value.
   * @param {number} y Y position as percentage value.
   */
  updateElementPosition(index, x, y) {
    if (typeof x !== 'number' || typeof y !== 'number') {
      return;
    }

    // eslint-disable-next-line no-magic-numbers
    x = Math.max(0, Math.min(100, x));
    // eslint-disable-next-line no-magic-numbers
    y = Math.max(0, Math.min(100, y));

    this.elements[index].updateParams({ x: x, y: y });
  }

  /**
   * Update element size.
   * @param {number} index Map element index.
   * @param {number} width Width as percentage value.
   * @param {number} height Height as percentage value.
   */
  updateElementSize(index, width, height) {
    this.elements[index].updateParams({ width: width, height: height });
  }

  /**
   * Convert px to respective % for map.
   * @param {object} [value] Value to convert.
   * @param {number} [value.x] X value to convert.
   * @param {number} [value.y] Y value to convert.
   * @returns {number} Percentage for map.
   */
  convertToPercent(value = {}) {
    if (typeof value.x === 'number') {
      // eslint-disable-next-line no-magic-numbers
      return value.x * 100 / this.elementArea.getSize().width;
    }

    if (typeof value.y === 'number') {
      // eslint-disable-next-line no-magic-numbers
      return value.y * 100 / this.elementArea.getSize().height;
    }

    return 0;
  }

  /**
   * Remove element after confirmation.
   * @param {Element} element Element to be removed.
   */
  removeIfConfirmed(element) {
    this.deleteDialog = new H5P.ConfirmationDialog({
      headerText: this.params.dictionary.get('l10n.confirmationDialogRemoveHeader'),
      dialogText: this.params.dictionary.get('l10n.confirmationDialogRemoveDialog'),
      cancelText: this.params.dictionary.get('l10n.confirmationDialogRemoveCancel'),
      confirmText: this.params.dictionary.get('l10n.confirmationDialogRemoveConfirm')
    });
    this.deleteDialog.on('confirmed', () => {
      this.remove(element);
    });

    this.deleteDialog.appendTo(this.dom.closest('.h5peditor-animator'));
    this.deleteDialog.show();
  }

  /**
   * Remove map element.
   * @param {Element} element Element to be removed.
   */
  remove(element) {
    const subContentId = element.getSubContentId();

    this.listElements.remove(subContentId);

    const removeIndex = element.getIndex();

    // Remove element
    element.remove();
    this.elements.splice(removeIndex, 1);

    this.params.elements = this.params.elements.filter((paramsElement) => {
      return paramsElement.contentType.subContentId !== subContentId;
    });

    // Re-index elements
    this.elements.forEach((element, elementIndex) => {
      element.setIndex(elementIndex);
    });

    this.dnb.blurAll();

    this.callbacks.onChanged({ elements: this.params.elements });
  }

  /**
   * Bring element to front.
   * @param {Element} element Map element to be brought to front.
   */
  bringToFront(element) {
    const elementIndex = this.elements.indexOf(element);
    this.params.elements.push(this.params.elements.splice(elementIndex, 1)[0]);

    this.elementArea.bringToFront(elementIndex);
    this.listElements.bringToFront(elementIndex);

    this.callbacks.onChanged({ elements: this.params.elements });
  }

  /**
   * Send element to back
   * @param {Element} element Element to be sent to back.
   */
  sendToBack(element) {
    const elementIndex = this.elements.indexOf(element);
    this.params.elements.unshift(this.params.elements.splice(elementIndex, 1)[0]);

    this.elementArea.sendToBack(elementIndex);
    this.listElements.sendToBack(elementIndex);

    this.callbacks.onChanged({ elements: this.params.elements });
  }

  /**
   * Edit map element.
   * @param {Element} element Map element to be edited.
   */
  edit(element) {
    this.toolbar.hide();
    this.elementArea.hide();
    this.sidebar.hide();

    this.dialog.showForm({
      form: element.getData().form,
      returnFocusTo: document.activeElement,
      doneCallback: () => {
        const isValid = this.validateFormChildren(element);

        if (isValid) {
          this.toolbar.show();
          this.elementArea.show();
          if (this.isListViewActive) {
            this.sidebar.show();
          }

          const elementParams = this.params.elements[element.getIndex()];
          element.updateParams(elementParams);

          this.listElements.update(
            element.getSubContentId(),
            { title: elementParams.contentType.metadata.title }
          );
        }

        return isValid;
      },
      removeCallback: () => {
        this.toolbar.show();
        this.elementArea.show();
        if (this.isListViewActive) {
          this.sidebar.show();
        }
        this.removeIfConfirmed(element);
      }
    });

    setTimeout(() => {
      this.dnb.blurAll();
    }, 0);
  }

  /**
   * Validate form children.
   * @param {Element} element Mapelement that the form belongs to.
   * @returns {boolean} True if form is valid, else false.
   */
  validateFormChildren(element) {
    /*
     * `some` would be quicker than `every`, but all fields should display
     * their validation message
     */
    return element.getData().children.every((child) => {
      // Accept incomplete subcontent, but not no subcontent
      if (child instanceof H5PEditor.Library && !child.validate()) {
        if (child.$select.get(0).value !== '-') {
          return true; // Some subcontent is selected at least
        }

        const errors = element.getData().form
          .querySelector('.field.library .h5p-errors');

        if (errors) {
          errors.innerHTML = `<p>${this.params.dictionary.get('l10n.contentRequired')}</p>`;
        }

        return false;
      }

      return child.validate() ?? true; // Some widgets return `undefined` instead of true
    });
  }

  /**
   * Toggle highlight of element.
   * @param {string} subContentId Subcontent ID.
   * @param {boolean} state True to highlight, false to remove highlight.
   */
  toggleHighlightElement(subContentId, state) {
    const element = this.elements.find((element) => element.getSubContentId() === subContentId);
    if (!element) {
      return;
    }

    element.toggleHighlight(state);
    this.listElements.toggleHighlightElement(subContentId, state);
  }

  /**
   * Handle document mouse down.
   * @param {MouseEvent} event Mouse event.
   */
  handleDocumentMouseDown(event) {
    this.listElements.handleDocumentMouseDown(event);
  }

  /**
   * Change elements' z-position.
   * @param {number} indexSource Index of source element.
   * @param {number} indexTarget Index of target element.
   * @param {boolean} [active] If true, active element.
   */
  changeElementZPosition(indexSource, indexTarget, active = true) {
    if (
      typeof indexSource !== 'number' || indexSource < 0 || indexSource > this.params.elements.length - 1 ||
      typeof indexTarget !== 'number' || indexTarget < 0 || indexTarget > this.params.elements.length - 1
    ) {
      return;
    }

    this.elementArea.swapElements(indexSource, indexTarget);
    this.listElements.swapElements(indexSource, indexTarget, !active);

    [this.params.elements[indexSource], this.params.elements[indexTarget]] =
      [this.params.elements[indexTarget], this.params.elements[indexSource]];

    this.callbacks.onChanged({ elements: this.params.elements });
  }
}
