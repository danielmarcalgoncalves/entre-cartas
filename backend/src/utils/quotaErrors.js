/**
 * Centralized Free/Pro plan quota error builder.
 * Standardized structured response for Free plan limits with explicit upgrade guidance.
 */

function buildPlanLimitError({
  feature,
  resourceLabel,
  currentUsage,
  freePlanLimit,
  proPlanLimit,
  isPremium = false,
}) {
  const planName = isPremium ? 'Pro' : 'Free';
  const effectiveLimit = isPremium ? proPlanLimit : freePlanLimit;
  const proCapacityText =
    proPlanLimit === null || proPlanLimit === undefined || proPlanLimit === Infinity
      ? `unlimited ${resourceLabel}`
      : `up to ${proPlanLimit} ${resourceLabel}`;

  const upgradeGuidance = isPremium
    ? `You have reached the maximum capacity of ${effectiveLimit} ${resourceLabel} included in the Pro Sender Club.`
    : `The Free Plan allows up to ${freePlanLimit} ${resourceLabel} (current usage: ${currentUsage}/${freePlanLimit}). Upgrade to the Pro Sender Club at /clube-pro to unlock ${proCapacityText}.`;

  const message = isPremium
    ? `Limit reached for ${resourceLabel}: ${currentUsage}/${effectiveLimit} on the Pro Plan.`
    : `Free Plan limit reached for ${resourceLabel} (${currentUsage}/${freePlanLimit}). Upgrade to Pro Sender Club to unlock ${proCapacityText}!`;

  return {
    error: message,
    code: 'PLAN_LIMIT_REACHED',
    message,
    feature,
    currentUsage,
    freePlanLimit,
    proPlanLimit: proPlanLimit ?? null,
    limit: effectiveLimit,
    limite: effectiveLimit,
    isLimitReached: true,
    upgradeAvailable: !isPremium,
    upgradeToPremium: !isPremium,
    upgradeDestination: '/clube-pro',
    details: {
      feature,
      resource: resourceLabel,
      currentUsage,
      freePlanLimit,
      proPlanLimit: proPlanLimit ?? null,
      limit: effectiveLimit,
      plan: planName,
      upgradeAvailable: !isPremium,
      upgradeDestination: '/clube-pro',
    },
    upgrade: !isPremium
      ? {
          available: true,
          plan: 'Pro',
          price: 14.90,
          destination: '/clube-pro',
          message: upgradeGuidance,
        }
      : null,
  };
}

module.exports = {
  buildPlanLimitError,
};
