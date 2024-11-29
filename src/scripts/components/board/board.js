import Util from '@services/util.js';
import DragNBarWrapper from '@models/drag-n-bar-wrapper.js';
import MixinAnimations from './board-mixins/mixin-animations.js';
import MixinElements from './board-mixins/mixin-elements.js';
import MixinElementArea from './board-mixins/mixin-element-area.js';
import MixinSidebar from './board-mixins/mixin-sidebar.js';
import MixinToolbar from './board-mixins/mixin-toolbar.js';

import './board.scss';

export default class Board {

  constructor(params = {}, callbacks = {}) {
    Util.addMixins(Board, [MixinElementArea, MixinElements, MixinAnimations, MixinSidebar, MixinToolbar]);

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

    this.buildComponents();

    this.dom = document.createElement('div');
    this.dom.classList.add('h5p-editor-animator-board');
    this.dom.append(this.toolbar.getDOM());
    this.dom.append(this.mainArea);

    this.params.elements.forEach((elementParams) => {
      this.createElement(elementParams);
    });

    this.params.animations.forEach((animationParams) => {
      this.createAnimation(animationParams);
    });

    this.elements.forEach((element) => {
      this.toggleElementVisibility(element.getSubContentId(), element.isVisible());
    });

    this.toggleSidebar(false);

    window.addEventListener('keydown', (event) => {
      this.handleKeyDown(event);
    });

    window.requestAnimationFrame(() => {
      this.dnbWrapper.setContainerEm(parseFloat(window.getComputedStyle(this.elementArea.getDOM()).fontSize));
    });
  }

  /**
   * Build components.
   */
  buildComponents() {
    this.buildElementArea();
    this.buildDragNBarWrapper();
    this.buildToolbar(this.dnbWrapper.getParentDOM());
    this.buildSidebar();

    // Main area
    this.mainArea = document.createElement('div');
    this.mainArea.classList.add('h5p-editor-animator-board-main-area');
    this.mainArea.append(this.elementArea.getDOM());
    this.mainArea.append(this.sidebar.getDOM());
  }

  /**
   * Build DragNBar wrapper.
   */
  buildDragNBarWrapper() {
    this.dnbWrapper = new DragNBarWrapper(
      {
        dictionary: this.params.dictionary,
        globals: this.params.globals,
        subContentOptions: this.params.subContentOptions,
        buttons: this.params.subContentOptions.map((option) => this.createButton(option)),
        dialogContainer: this.elementArea.getDOM(),
        elementArea: this.elementArea.getElementArea(),
      },
      {
        onReleased: (index) => {
          this.editElement(this.elements[index]);
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
        },
        createElement: (params) => {
          return this.createElement(params);
        }
      }
    );

    this.dnbWrapper.attach(document.createElement('div'));
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
    if (this.params.baseWidth && this.params.baseFontSize) {
      const baseFontFactor = this.elementArea.getSize().width / this.params.baseWidth || 1;
      const baseFontSize = this.params.baseFontSize * baseFontFactor;

      this.elementArea.setBaseFontSize(baseFontSize);
      this.dnbWrapper.setContainerEm(baseFontSize);
    }

    window.clearTimeout(this.pinWrapperTimeout);
    this.pinWrapperTimeout = window.requestAnimationFrame(() => {
      this.dom.style.setProperty('--boardMaxHeight', `${this.elementArea.getSize().height}px`);
      this.sidebar.resize();
    });

    this.params.globals.get('resize')();
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
}
