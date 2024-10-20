import Board from '@components/board/board.js';
import Dialog from '@components/dialog/dialog.js';
import Util from '@services/util.js';

import './main.scss';

export default class Main {
  constructor(params = {}, callbacks = {}) {
    this.params = params;
    this.callbacks = Util.extend({
      onChanged: () => {},
    });

    this.dom = document.createElement('div');
    this.dom.classList.add('h5p-editor-animator-main');

    this.board = new Board(
      this.params,
      {
        onChanged: (values) => {
          this.callbacks.onChanged(values);
        },
        showFormDialog: (params) => {
          this.dialog.showForm(params);
        }
      }
    );
    this.dom.append(this.board.getDOM());

    this.dialog = new Dialog({ dictionary: this.params.dictionary });
    this.dom.appendChild(this.dialog.getDOM());
  }

  getDOM() {
    return this.dom;
  }

  resize(params) {
    this.board.resize(params);
  }

  handleDocumentMouseDown(event) {
    this.board.handleDocumentMouseDown(event);
  }

  /**
   * Set background color.
   * @param {string} color Color as CSS unit.
   */
  setBackgroundColor(color) {
    this.board.setBackgroundColor(color);
  }

  /**
   * Set background image.
   * @param {object} imageData Paremeters from H5P editor image widget.
   */
  setBackgroundImage(imageData) {
    this.board.setBackgroundImage(imageData);
  }

  /**
   * Set aspect ratio.
   * @param {number|string} value Aspect ratio.
   */
  setAspectRatio(value) {
    this.board.setAspectRatio(value);
  }
}
