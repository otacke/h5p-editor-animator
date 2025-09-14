export default class Runnable {

  /**
   * Constructor.
   * @param {object} params Parameters.
   * @param {object} params.library Library.
   * @param {number|string} params.contentID Content ID.
   * @param {HTMLElement} [params.target] Target DOM element.
   * @param {H5P.EventDispatcher} [params.eventDispatcher] Event dispatcher to link resizing to.
   */
  constructor(params = {}) {
    this.instance = new H5P.newRunnable(
      params.library,
      params.contentID,
      params.target ? H5P.jQuery(params.target) : undefined,
      !params.target,
    );

    if (!this.instance || !params.eventDispatcher) {
      return;
    }

    // Resize parent when children resize
    this.bubbleUp(this.instance, 'resize', params.eventDispatcher);

    // Resize children to fit inside parent
    this.bubbleDown(params.eventDispatcher, 'resize', [this.instance]);
  }

  /**
   * Attach instance to HTML element.
   * @param {HTMLElement} target Target HTML element.
   */
  attach(target) {
    this.instance.attach(H5P.jQuery(target));
  }

  /**
   * Get H5P instance.
   * @returns {H5P.ContentType|undefined} H5P instance.
   */
  getInstance() {
    return this.instance;
  }

  /**
   * Bubble events from child to parent.
   * @param {H5P.EventDispatcher} origin Origin of event.
   * @param {string} eventName Name of event.
   * @param {H5P.EventDispatcher} target Target to trigger event on.
   */
  bubbleUp(origin, eventName, target) {
    origin.on(eventName, (event) => {
      // Prevent target from sending event back down
      target.bubblingUpwards = true;

      // Trigger event
      target.trigger(eventName, event);

      // Reset
      target.bubblingUpwards = false;
    });
  }

  /**
   * Bubble events from parent to children.
   * @param {H5P.EventDispatcher} origin Origin of event.
   * @param {string} eventName Name of event.
   * @param {H5P.EventDispatcher[]} targets Targets to trigger event on.
   */
  bubbleDown(origin, eventName, targets) {
    origin.on(eventName, (event) => {
      if (origin.bubblingUpwards) {
        return; // Prevent sending event back down
      }

      targets.forEach((target) => {
        target.trigger(eventName, event);
      });
    });
  }
}
