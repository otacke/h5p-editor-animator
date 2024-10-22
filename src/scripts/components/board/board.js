import Util from '@services/util.js';
import DragNBarWrapper from '@models/drag-n-bar-wrapper.js';
import ElementArea from './element-area/element-area.js';
import { ZOOM_LEVEL_MAX } from './element-area/element-area.js';
import Animation from '@models/animation.js';
import Element from './element-area/element.js';
import ToolbarMain from './toolbar/toolbar-main.js';
import ToolbarGroup from './toolbar/toolbar-group.js';
import Sidebar from './sidebar/sidebar.js';
import DraggablesList from './sidebar/draggables-list.js';

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
      onChanged: () => {},
      togglePreview: () => {}
    }, callbacks);

    this.elements = [];
    this.animations = [];

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
    this.dnb = new DragNBarWrapper(
      {
        dictionary: this.params.dictionary,
        globals: this.params.globals,
        subContentOptions: this.params.subContentOptions,
        buttons: this.params.subContentOptions.map((option) => this.createButton(option)),
        dialogContainer: this.elementArea.getDOM(),
        elementArea: this.elementArea.getElementArea(),
      },
      {
        onStoppedMoving: (index, x, y) => {
          // TODO: Remove this callback if we don't need it
        },
        onReleased: (index) => {
          this.editElement(this.elements[index]);
        },
        onMoved: (index, x, y, w, h) => {
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
        },
        createElement: (params) => {
          return this.createElement(params);
        }
      }
    );

    const dnbWrapper = document.createElement('div');
    this.dnb.attach(dnbWrapper);

    // TODO: Shouldn't this be in the toolbar?
    const contentButtons = new ToolbarGroup(
      {
        a11yContentTypeWrapper: this.params.dictionary.get('a11y.contentTypeWrapper'),
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

          this.editElement(element);
        }
      }
    );

    const toolbarButtons = [
      {
        id: 'list-view',
        tooltip: this.params.dictionary.get('l10n.toolbarButtonListView'),
        type: 'toggle',
        a11y: {
          active: this.params.dictionary.get('a11y.buttonListViewActive'),
          inactive: this.params.dictionary.get('a11y.buttonListViewInactive'),
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
          disabled: this.params.dictionary.get('a11y.buttonZoomInDisabled'),
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
          disabled: this.params.dictionary.get('a11y.buttonZoomOutDisabled'),
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
          this.dnb.blurAll();
          this.callbacks.togglePreview();
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

    this.mainArea = document.createElement('div');
    this.mainArea.classList.add('h5p-editor-animator-board-main-area');
    this.mainArea.append(this.elementArea.getDOM());
    this.dom.append(this.mainArea);

    this.listElements = new DraggablesList(
      {
        dictionary: this.params.dictionary,
        title: this.params.dictionary.get('l10n.elements'),
        reversed: true,
        canToggleVisibility: true,
      },
      {
        highlight: (subContentId, state) => {
          this.toggleHighlightElement(subContentId, state);
        },
        move: (sourceIndex, moveOffset, active) => {
          this.changeElementZPosition(sourceIndex, moveOffset, active);
        },
        edit: (subContentId) => {
          this.editElement(this.getElementBySubContentId(subContentId));
        },
        remove: (subContentId) => {
          this.removeElementIfConfirmed(this.getElementBySubContentId(subContentId));
        },
        toggleVisibility: (subContentId) => {
          this.toggleElementVisibility(subContentId);
        }
      }
    );

    this.listAnimations = new DraggablesList(
      {
        dictionary: this.params.dictionary,
        title: this.params.dictionary.get('l10n.animations'),
        addButtonLabel: this.params.dictionary.get('a11y.addAnimation'),
      },
      {
        highlight: (id, state) => {
          const animation = this.animations.find((animation) => animation.getId() === id);
          this.toggleHighlightElement(animation.getSubContentId(), state, id);
        },
        move: (sourceIndex, moveOffset, active) => {
          this.changeAnimationOrder(sourceIndex, moveOffset, active);
        },
        edit: (id) => {
          this.editAnimation(id);
        },
        remove: (id) => {
          this.removeAnimationIfConfirmed(id);
        }
      }
    );

    this.sidebar = new Sidebar({
      subComponents: [this.listElements, this.listAnimations]
    }, {});
    this.mainArea.append(this.sidebar.getDOM());

    this.params.elements.forEach((elementParams) => {
      this.createElement(elementParams);
    });

    this.params.animations.forEach((animationParams) => {
      this.createAnimation(animationParams);
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
   * @param {object} [params] Parameters.
   * @param {number} [params.baseWidth] Base width in px.
   */
  resize(params = {}) {
    if (params.baseWidth && params.baseFontSize) {
      const baseFontFactor = this.mainArea.getBoundingClientRect().width / params.baseWidth || 1;
      const baseFontSize = params.baseFontSize * baseFontFactor;
      this.mainArea.style.setProperty('--baseFontSize', `${baseFontSize}px`);

      this.dnb.setContainerEm(baseFontSize);
    }

    window.clearTimeout(this.pinWrapperTimeout);
    this.pinWrapperTimeout = window.requestAnimationFrame(() => {
      this.dom.style.setProperty('--boardMaxHeight', `${this.elementArea.getSize().height}px`);
      this.sidebar.resize();
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
   * Toggle element visibility.
   * @param {string} subContentId Subcontent Id of element to toggle.
   */
  toggleElementVisibility(subContentId) {
    const element = this.getElementBySubContentId(subContentId);
    const newState = element.toggleVisibility();
    if (newState) {
      this.dnb.focus(element);
    }

    this.listElements.toggleVisibility(subContentId, newState);
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
          this.editElement(element);
        },
        onRemoved: (element) => {
          this.removeElementIfConfirmed(element);
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
    // Important: The order of these must not be changed, find things by subcontent id, not index
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
      id: elementParams.contentType.subContentId
    });

    return element.getData().$element;
  }

  getElementInFocus() {
    return this.elements.find((element) => element.hasFocus());
  }

  createAnimation(params = {}) {
    const animation = new Animation(
      {
        id: H5P.createUUID(),
        semantics: this.params.animationsFields,
        params: params,
        originalInstance: this.params.globals.get('animationsGroupInstance')
      },
      {
        onChanged: (id, elementParams) => {
          const index = this.animations.findIndex((animation) => animation.getId() === id);
          this.params.animations[index] = elementParams;
          this.callbacks.onChanged({ animations: this.params.animations });
        }
      }
    );

    this.animations.push(animation);

    const element = this.getElementBySubContentId(params.subContentId);
    const details = [
      this.params.dictionary.get(`l10n.animation.${params.effect}`),
      this.params.dictionary.get(`l10n.animation.${params.startWith}`),
      `${params.duration}s`
    ].join(' \u00b7 ');

    this.listAnimations.add({
      title: element.getTitle(),
      details: details,
      id: animation.getId()
    });

    return animation;
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
  removeElementIfConfirmed(element) {
    this.params.globals.get('showConfirmationDialog')({
      headerText: this.params.dictionary.get('l10n.confirmationDialogRemoveElementHeader'),
      dialogText: this.params.dictionary.get('l10n.confirmationDialogRemoveElementDialog'),
      cancelText: this.params.dictionary.get('l10n.confirmationDialogRemoveElementCancel'),
      confirmText: this.params.dictionary.get('l10n.confirmationDialogRemoveElementConfirm'),
      callbackConfirmed: () => {
        this.removeElement(element);
      }
    });
  }

  /**
   * Remove animation after confirmation.
   * @param {string} id Id of the animation to be removed.
   */
  removeAnimationIfConfirmed(id) {
    this.params.globals.get('showConfirmationDialog')({
      headerText: this.params.dictionary.get('l10n.confirmationDialogRemoveAnimationHeader'),
      dialogText: this.params.dictionary.get('l10n.confirmationDialogRemoveAnimationDialog'),
      cancelText: this.params.dictionary.get('l10n.confirmationDialogRemoveAnimationCancel'),
      confirmText: this.params.dictionary.get('l10n.confirmationDialogRemoveAnimationConfirm'),
      callbackConfirmed: () => {
        this.removeAnimation(id);
      }
    });
  }

  /**
   * Remove map element.
   * @param {Element} elementToRemove Element to be removed.
   */
  removeElement(elementToRemove) {
    const subContentId = elementToRemove.getSubContentId();

    this.listElements.remove(subContentId);

    // Remove element
    elementToRemove.remove();
    this.elements = this.elements.filter((element) => element !== elementToRemove);
    this.params.elements = this.params.elements.filter((paramsElement) => {
      return paramsElement.contentType.subContentId !== subContentId;
    });

    // Re-index elements
    this.elements.forEach((element, elementIndex) => {
      element.setIndex(elementIndex);
    });

    this.dnb.blurAll();

    // Remove animations that are linked to this element
    this.animations
      .filter((animation) => animation.getSubContentId() === subContentId)
      .map((animation) => animation.getId())
      .forEach((id) => {
        this.removeAnimation(id);
      });

    this.callbacks.onChanged({
      elements: this.params.elements,
      animations: this.params.animations
    });
  }

  /**
   * Remove animation.
   * @param {string} id Id of the animation to be removed.
   */
  removeAnimation(id) {
    this.listAnimations.remove(id);
    const deleteIndex = this.animations.findIndex((animation) => animation.getId() === id);
    this.animations.splice(deleteIndex, 1);
    this.params.animations.splice(deleteIndex, 1);

    this.callbacks.onChanged({ animations: this.params.animations });
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
  editElement(element) {
    this.callbacks.showFormDialog({
      headline: this.params.dictionary.get('l10n.editElement'),
      form: element.getData().form,
      children: element.getData().children,
      returnFocusTo: document.activeElement,
      onDone: () => {
        const subContentId = element.getSubContentId();
        const elementParams = this.params.elements.find(
          (element) => element.contentType.subContentId === subContentId
        );
        element.updateParams(elementParams);

        this.listElements.update(element.getSubContentId(), {
          title: element.getTitle(),
          id: element.getSubContentId()
        });
      },
      onRemoved: () => {
        this.removeElementIfConfirmed(element);
      }
    });

    setTimeout(() => {
      this.dnb.blurAll();
    }, 0);
  }

  /**
   * Edit animation.
   * @param {string} id Id of animation to be edited.
   */
  editAnimation(id) {
    let animation = this.animations.find((animation) => animation.getId() === id);
    if (!animation) {
      const element = this.getElementInFocus();
      if (element) {
        animation = this.createAnimation({
          subContentId: element.getSubContentId()
        });
        id = animation.getId();
      }
    }

    if (!animation) {
      return;
    }

    this.callbacks.showFormDialog({
      headline: this.params.dictionary.get('l10n.editAnimation'),
      form: animation.getForm(),
      children: animation.getChildren(),
      returnFocusTo: document.activeElement,
      onDone: () => {
        const params = animation.getParams();
        animation.updateParams(params);

        const element = this.getElementBySubContentId(params.subContentId);

        const details = [
          this.params.dictionary.get(`l10n.animation.${params.effect}`),
          this.params.dictionary.get(`l10n.animation.${params.startWith}`),
          `${params.duration}s`
        ].join(' \u00b7 ');

        this.listAnimations.update(
          animation.getId(),
          {
            title: element.getTitle(),
            details: details,
          }
        );
      },
      onRemoved: () => {
        this.removeAnimationIfConfirmed(id);
      }
    });

    setTimeout(() => {
      this.dnb.blurAll();
    }, 0);
  }

  /**
   * Show.
   */
  show() {
    this.toolbar.show();
    this.elementArea.show();
    if (this.isListViewActive) {
      this.sidebar.show();
    }
  }

  /**
   * Hide.
   */
  hide() {
    this.toolbar.hide();
    this.elementArea.hide();
    this.sidebar.hide();
  }

  /**
   * Toggle highlight of element.
   * @param {string} subContentId Subcontent ID.
   * @param {boolean} state True to highlight, false to remove highlight.
   * @param {number} id Animation ID.
   */
  toggleHighlightElement(subContentId, state, id) {
    const element = this.getElementBySubContentId(subContentId);
    if (!element) {
      return;
    }

    if (state) {
      this.dnb.focus(element);
    }

    this.listElements.toggleHighlightElement(subContentId, state);
    if (id) {
      this.listAnimations.toggleHighlightElement(id, state);
    }
  }

  /**
   * Get element by subcontent ID.
   * @param {string} subContentId SubContentId.
   * @returns {Element} Element.
   */
  getElementBySubContentId(subContentId) {
    return this.elements.find((element) => element.getSubContentId() === subContentId);
  }

  /**
   * Handle document mouse down.
   * @param {MouseEvent} event Mouse event.
   */
  handleDocumentMouseDown(event) {
    if (event.target !== this.sidebar.getDOM() && !this.sidebar.getDOM().contains(event.target)) {
      this.listAnimations.toggleHighlightElement(null, false);
      this.listElements.toggleHighlightElement(null, false);
    }

    this.listAnimations.handleDocumentMouseDown(event);
    this.listElements.handleDocumentMouseDown(event);

    const dnbFocusTimeout = 100; // TODO: DnB requires some time before it updates the focus, find a better way
    window.setTimeout(() => {
      if (this.getElementInFocus()) {
        this.listAnimations.enableAddButton();
      }
      else {
        this.listAnimations.disableAddButton();
      }
    }, dnbFocusTimeout);
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

  changeAnimationOrder(indexSource, indexTarget, active = true) {
    if (
      typeof indexSource !== 'number' || indexSource < 0 || indexSource > this.params.animations.length - 1 ||
      typeof indexTarget !== 'number' || indexTarget < 0 || indexTarget > this.params.animations.length - 1
    ) {
      return;
    }
    this.listAnimations.swapElements(indexSource, indexTarget, !active);

    [this.params.animations[indexSource], this.params.animations[indexTarget]] =
      [this.params.animations[indexTarget], this.params.animations[indexSource]];

    this.callbacks.onChanged({ animations: this.params.animations });
  }
}
