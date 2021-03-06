import _ from 'lodash';
import $ from 'jquery';
import MethodRule from 'model/method-rule.js';
import account from 'singleton/account.js';
import logger from 'method/logger.js';

/**
 * Renders UI using attached method on elements.
 */
class UiRule extends MethodRule {
  /**
   * @param {Function} checkForRender
   */
  constructor({ checkForRender }) {
    super(arguments[0]);
    this._checkForRender = checkForRender;
  }

  /**
   * Parse parameters from element attributes.
   *
   * @param {JQueryElement} $el
   * @return {Object}
   */
  _params({ $el }) {
    const params = super._params({ $el });

    // Add containerID parameter.
    params.containerID = $el.attr('id');

    // Automatically set width/height based on box model if not manually set.
    if(params.width === undefined) {
      params.width = $el.outerWidth();
      if(params.width === 0) {
        delete params.width;
      }
    }
    if(params.height === undefined) {
      params.height = $el.outerHeight();
      if(params.height === 0) {
        delete params.height;
      }
    }

    return params;
  }

  /**
   * @param {JQueryElement} $container
   */
  bind($container) {
    // Find all elements that match our rule selector.
    $(this._selector(), $container).each((i, el) => {
      const $el = $(el);

      // The bind method can be called to refresh state, so ensure we don't bind events multiple times.
      if(!$el.data('gyUiBound')) {
        $el.data('gyUiBound', true);
        logger('Binding to UI element', $el);

        // All UI elements must have IDs, assign if necessary.
        if($el.attr('id') === undefined) {
          $el.attr('id', _.uniqueId('gy-ui-'));
        }

        // If element is blank, re-render when account status changes.
        // Elements may not be rendered initially if the account isn't initialized or they are hidden.
        // Additionally, Gigya login/registration screensets need to be re-rendered after logging in or logging.
        // The user may toggle back and forth between being logged in and logging out.
        const isRerenderEnabled = $el.data('rerender') !== false;
        $el.data('initialHtml', $el.html());
        const checkForRender = (event) => {
          const html = $el.html();
          if((!html || html === $el.data('initialHtml')) && !gigya._.plugins.instances[$el.attr('id')]) {
            logger('Re-rendering UI elements because was previously hidden.', $el);
            this._render({ $el });
          } else if(this._checkForRender && isRerenderEnabled && event && event.account) {
            if(this._checkForRender({ oldAccount: event.oldAccount, account: event.account, $el })) {
              logger('Re-rendering UI element on checkForRender trigger.', $el, event);
              this._render({ $el, reRender: true });
            }
          }
        };
        const debouncedCheckForRender = _.debounce(checkForRender, 100);

        // If the viewport size changes, breakpoints in the CSS may cause previously hidden elements to be displayed.
        $('window').on('resize', debouncedCheckForRender);

        // If the user clicks something, previously hidden element may be displayed.
        $('body').on('click', function() {
          // Check a bunch of times because sometimes the screen may be delayed by an animation or other loading.
          debouncedCheckForRender();
          for (const delay of [250, 500, 750, 1000, 1250, 1500]) {
            setTimeout(() => checkForRender(), delay);
          }
        });

        // If the Gigya account changes, previously hidden elements may be displayed via gy-if rules.
        account.on('changed', checkForRender);

        // Render element.
        this._render({ $el });
      }
    });
  }

  /**
   * Used to render UI.
   *
   * @param {JQueryElement} $el
   */
  _render({ $el }) {
    // Do not render if account is not yet initialized or in hidden container.
    if(!account.isInitialized() || $el.is(':hidden') === true) {
      return;
    }

    // Do not start another render if element is currently rendering.
    if($el.data('gyLoadStatus') === 'loading') {
      return;
    }

    // onLoad handler and fallback if never triggered.
    const onLoad = () => {
      $el.data('gyLoadStatus', 'loaded');
    };

    // onError handler.
    const onError = (err) => {
      logger.error('UI render onError', $el.attr('id'), err);
    };

    // Call Gigya method attached to the clicked element to render UI.
    $el.data('gyLoadStatus', 'loading');
    if(this.method({ $el, overrideParams: { onLoad, onError } }) === false) {
      // Returns false if the method fails to execute. Typically means Gigya SDK is not available.
      return this._failed({ $el });
    }

    // Wait for UI to load.
    let attempts = 0;
    const waitForLoad = () => {
      setTimeout(() => {
        if($el.data('gyLoadStatus') === 'loaded') {
          // Done.
        } else if(attempts <= 20) {
          attempts++;
          waitForLoad();
        } else {
          this._failed({ $el });
        }
      }, 500);
    }
    waitForLoad();
  }

  /**
   * Triggered when UI cannot be rendered.
   *
   * @param {JQueryElement} $el
   */
  _failed({ $el }) {
    const params = this._params({ $el });
    const errorMessage = params.errorMessage || 'An error has occurred. Please try again later.';
    $el.text(errorMessage);
  }
}

module.exports = UiRule;