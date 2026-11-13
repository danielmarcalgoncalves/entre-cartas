/**
 * Centralized Free/Pro plan quota error builder.
 * Ensures every quota-enforcing controller returns a consistent,
 * machine-readable PLAN_LIMIT_REACHED payload alongside legacy fields
 * (limite, upgradeToPremium) for backwards compatibility.
 */

function buildPlanLimitError({
  resource,
  current,
  limit,
  isPremium,
  proLimitText,
}) {
  const planName = isPremium ? 'Pro' : 'Free';
  const upgradeMessage = isPremium
    ? `You have reached the Pro plan capacity of ${limit} ${resource}.`
    : `Upgrade to Pro to unlock ${proLimitText}.`;

  const message = isPremium
    ? `You have reached the Pro plan limit of ${limit} ${resource}.`
    : `You have reached the Free plan limit of ${limit} ${resource}. ${upgradeMessage}`;

  return {
    error: 'PLAN_LIMIT_REACHED',
    message,
    details: {
      resource,
      current,
      limit,
      plan: planName,
      upgradeAvailable: !isPremium,
    },
    upgrade: !isPremium
      ? {
          plan: 'Pro',
          message: upgradeMessage,
        }
      : null,
    // Backwards-compatible fields
    limite: limit,
    upgradeToPremium: !isPremium,
  };
}

module.exports = {
  buildPlanLimitError,
};
