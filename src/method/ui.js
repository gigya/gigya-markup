import _ from 'lodash';
import UiRule from 'model/ui-rule.js';

/**
 * Re-render screensets with a form when login status changes.
 *
 * @param {Object} oldAccount
 * @param {Object} account
 * @param {jQueryElement} $el
 */
function screensetCheckForRender({ oldAccount, account, $el }) {
  if(oldAccount.UID !== account.UID && $el.find('form').length && (account.isRegistered === true || account.UID === undefined)) {
    return true;
  }
}

const rules = _.map([
  { name: 'login', method: 'gigya.socialize.showLoginUI', defaults: { hideGigyaLink: true, version: 2 } },
  { name: 'feed', method: 'gigya.socialize.showFeedUI' },
  { name: 'chat', method: 'gigya.chat.showChatUI' },
  { name: 'share-bar', method: 'gigya.socialize.showShareBarUI', defaults: { userAction: {} } },
  { name: 'comments', method: 'gigya.comments.showCommentsUI', defaults: { width: '100%' } },
  { name: 'rating', method: 'gigya.comments.showRatingUI' },
  { name: 'screen-set', method: 'gigya.accounts.showScreenSet', defaults: { width: '100%' }, checkForRender: screensetCheckForRender },
  { name: 'achievements', method: 'gigya.gm.showAchievementsUI' },
  { name: 'challenge-status', method: 'gigya.gm.showChallengeStatusUI' },
  { name: 'leaderboard', method: 'gigya.gm.showLeaderboardUI' },
  { name: 'user-status', method: 'gigya.gm.showUserStatusUI' },
  { name: 'account-info', method: 'gy.showAccountInfoUI' }
], (rule) => new UiRule(_.merge(rule, { element: 'gy-ui' })));

/**
 * Bind to all elements in container (existing now or in future).
 *
 * @param {jQueryElement} $container
 */
module.exports = function bindUi($container) {
  _.each(rules, (rule) => {
    rule.bind($container);
  });
}
module.exports.rules = rules;