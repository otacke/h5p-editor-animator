import Util from '@services/util.js';

import './sidebar.scss';

export default class Sidebar {

  /**
   * @class
   * @param {params} params Parameters.
   */
  constructor(params = { subComponents: [] }) {
    this.params = Util.extend({}, params);

    this.dom = document.createElement('div');
    this.dom.classList.add('h5p-editor-animator-sidebar');

    this.chooserButtons = [];

    this.chooser = document.createElement('div');
    this.chooser.classList.add('chooser');
    this.dom.appendChild(this.chooser);

    this.params.subComponents.forEach((subComponent, index) => {
      const chooserButton = document.createElement('button');
      chooserButton.classList.add('chooser-button');
      chooserButton.textContent = subComponent.getTitle();
      chooserButton.addEventListener('click', () => {
        this.activate(index);
      });
      this.chooser.append(chooserButton);

      this.chooserButtons.push(chooserButton);
      this.dom.appendChild(subComponent.getDOM());
    });

    this.activate(0);
  }

  /**
   * Get DOM element.
   * @returns {HTMLElement} DOM element.
   */
  getDOM() {
    return this.dom;
  }

  /**
   * Show sidebar.
   */
  show() {
    this.dom.classList.remove('display-none');
  }

  /**
   * Hide sidebar.
   */
  hide() {
    this.dom.classList.add('display-none');
  }

  /**
   * Activate subcomponent incl. button.
   * @param {number} index Index of subcomponent to activate.
   */
  activate(index) {
    this.params.subComponents.forEach((subComponent, i) => {
      if (i === index) {
        subComponent.show();
      }
      else {
        subComponent.hide();
      }
    });

    this.chooserButtons.forEach((button, i) => {
      button.classList.toggle('active', i === index);
    });
  }

  resize() {
    const rect = this.chooser.getBoundingClientRect();
    this.dom.style.setProperty('--chooserHeight', `${rect.height}px`);
  }
}
