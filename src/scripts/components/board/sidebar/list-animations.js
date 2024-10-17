import Util from '@services/util.js';
import DraggableElement from './draggable-element/draggable-element.js';

import './list-animations.scss';

export default class ListAnimations {

  constructor(params = {}, callbacks = {}) {
    this.params = Util.extend({}, params);
    this.callbacks = Util.extend({}, callbacks);

    this.dom = document.createElement('div');
    this.dom.classList.add('h5p-editor-animator-sidebar-list-animations');

    const element1 = new DraggableElement({ dictionary: this.params.dictionary, title: 'Shape', details: 'Fly in \u2022 with previous \u2022 10.00s' });
    const element2 = new DraggableElement({ dictionary: this.params.dictionary, title: 'Shape', details: 'Rotate \u2022 after previous \u2022 3.20s' });
    const element3 = new DraggableElement({ dictionary: this.params.dictionary, title: 'Text', details: 'Fade in \u2022 after previous \u2022 1.00s' });
    const element4 = new DraggableElement({ dictionary: this.params.dictionary, title: 'Text', details: 'Rotate \u2022 with previous \u2022 3.00s' });
    const element5 = new DraggableElement({ dictionary: this.params.dictionary, title: 'Text', details: 'Fly out \u2022 after previous \u2022 9.00s' });

    this.dom.appendChild(element1.getDOM());
    this.dom.appendChild(element2.getDOM());
    this.dom.appendChild(element3.getDOM());
    this.dom.appendChild(element4.getDOM());
    this.dom.appendChild(element5.getDOM());
  }

  /**
   * Get DOM element.
   * @returns {HTMLElement} DOM element.
   */
  getDOM() {
    return this.dom;
  }

  /**
   * Get title.
   * @returns {string} Title.
   */
  getTitle() {
    return this.params.title;
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
}
