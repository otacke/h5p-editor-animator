import './submenu.scss';
import Util from '@services/util.js';

export default class SubMenu extends H5P.EventDispatcher {
  constructor(params = {}) {
    super();

    this.params = Util.extend({
      options: []
    }, params);

    this.options = {};
    this.parent = null;
    this.baseClass = 'submenu-popup';

    this.handleClosed = this.handleClosed.bind(this);
    this.handleKeyDown = this.handleKeyDown.bind(this);

    // Build DOM
    this.dom = document.createElement('div');
    this.dom.classList.add(this.baseClass);
    this.dom.classList.add('display-none');

    const title = document.createElement('div');
    title.classList.add(`${this.baseClass}-title`);
    title.innerText = this.params.dictionary.get('l10n.options');
    this.dom.appendChild(title);

    const optionsWrapper = document.createElement('div');
    optionsWrapper.classList.add(`${this.baseClass}-options`);
    optionsWrapper.setAttribute('role', 'menu');

    this.params.options.forEach((option) => {
      const subMenuOption = document.createElement('button');
      subMenuOption.classList.add(`${this.baseClass}-option`);
      subMenuOption.classList.add(`${this.baseClass}-option-${option.id}`);
      subMenuOption.setAttribute('role', 'menuitem');
      subMenuOption.setAttribute('tabindex', '-1');
      subMenuOption.innerText = option.label;

      subMenuOption.addEventListener('click', () => {
        option.onClick(this.parent);
        this.hide(option.keepFocus);
      });

      optionsWrapper.appendChild(subMenuOption);
      this.options[option.id] = (subMenuOption);
    });

    this.dom.appendChild(optionsWrapper);
  }

  /**
   * Get DOM for sub menu.
   * @returns {HTMLElement} DOM for sub menu.
   */
  getDOM() {
    return this.dom;
  }

  /**
   * Set parent.
   * @param {HTMLElement} parent Parent element.
   */
  setParent(parent) {
    this.parent = parent;
  }

  /*
   * Determine whether the element belongs to the sub menu.
   * @param {HTMLElement} element Element.
   * @returns {boolean} True if the element belongs to the sub menu.
   */
  owns(element) {
    return this.dom.contains(element);
  }

  /**
   * Toggle options.
   * @param {object} [capabilities] Capabilities.
   */
  toggleOptions(capabilities = {}) {
    for (const capability in capabilities) {
      this.toggleOption(capability, capabilities[capability]);
    }
  }

  /**
   * Toggle option.
   * @param {string} id Option id.
   * @param {boolean} state State. False to show.
   */
  toggleOption(id, state) {
    if (!this.options[id] || typeof state !== 'boolean') {
      return;
    }

    this.options[id].classList.toggle('display-none', !state);
  }

  /**
   * Show.
   * @param {object} [params] Parameters.
   * @param {object} [params.css] CSS parameters.
   * @param {boolean} [params.showActive] If true, show initial option active.
   */
  show(params = {}) {
    this.focusId = null;

    for (const attribute in (params.css || {})) {
      this.dom.style[attribute] = params.css[attribute];
    }

    this.dom.classList.remove('display-none');
    this.dom.classList.toggle('keyboard', params.showActive ?? false);
    document.body.addEventListener('click', this.handleClosed);

    this.visibleOptions = this.getVisibleOptions();

    this.focusOption(0);
    this.dom.addEventListener('keydown', this.handleKeyDown);

    this.isOpen = true;
    this.trigger('shown');
  }

  /**
   * Hide.
   * @param {boolean} [keepFocus] If true, request to not grab focus.
   */
  hide(keepFocus = false) {
    if (!this.isOpen) {
      return;
    }

    this.setParent(null);

    this.dom.classList.add('display-none');
    document.body.removeEventListener('click', this.handleClosed);
    this.dom.removeEventListener('keydown', this.handleKeyDown);

    this.isOpen = false;
    this.trigger('hidden', { keepFocus: keepFocus });
  }

  /**
   * Set sub menu option label.
   * @param {string} id Id of sub menu option.
   * @param {string} label Label to set.
   */
  setLabel(id, label) {
    if (!this.options[id] || typeof label !== 'string') {
      return;
    }

    this.options[id].innerText = label;
  }

  /**
   * Get visible options.
   * @returns {HTMLElement[]} Visible options.
   */
  getVisibleOptions() {
    const visibleOptions = [];

    // Running over params to retain order of options.
    for (let i = 0; i < this.params.options.length; i++) {
      const id = this.params.options[i].id;
      if (!this.options[id].classList.contains('display-none')) {
        visibleOptions.push(this.options[id]);
      }
    }

    return visibleOptions;
  }

  /**
   * Focus option.
   * @param {number} [offset] Offset.
   */
  focusOption(offset = 0) {
    if (typeof offset !== 'number') {
      return;
    }

    offset = offset % this.visibleOptions.length;

    if (this.focusId === null) {
      this.focusId = 0;
    }
    else {
      this.focusId = (this.focusId + this.visibleOptions.length + offset) %
        this.visibleOptions.length;
    }

    this.visibleOptions[this.focusId].focus();
  }

  /**
   * Handle key down.
   * @param {KeyboardEvent} event Keyboard event.
   */
  handleKeyDown(event) {
    if (event.key === 'ArrowUp') {
      event.preventDefault();
      this.focusOption(-1);
    }
    else if (event.key === 'ArrowDown') {
      event.preventDefault();
      this.focusOption(1);
    }
    else if (event.key === 'Escape') {
      event.preventDefault();
      this.hide();
    }
    else if (event.key === 'Tab') {
      event.preventDefault();
      this.hide();
    }
  }

  /**
   * Handle closed.
   */
  handleClosed() {
    this.hide();
  }
}
