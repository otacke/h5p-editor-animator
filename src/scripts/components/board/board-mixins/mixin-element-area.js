import ElementArea from '../element-area/element-area.js';
import { ZOOM_LEVEL_MAX } from '../element-area/element-area.js';

export default class MixinElementArea {
  /**
   * Build element area.
   */
  buildElementArea() {
    this.elementArea = new ElementArea(
      {},
      {
        onZoomChanged: (zoom) => {
          this.handleZoomChanged(zoom);
        },
      },
    );
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

      this.dnbWrapper.updateCoordinates();
    });
  }
}
