/* 01/02 共用的发行权限模型：页面只消费能力，不自行推断企业身份。 */
(function registerPublisherAccessPolicy(scope) {
  'use strict';

  const qualificationStatuses = new Set(['unsubmitted', 'pending', 'rejected', 'approved', 'delisted']);

  const derive = ({ authenticated = false, qualification = {} } = {}) => {
    const signedIn = authenticated === true;
    const requestedStatus = typeof qualification === 'string' ? qualification : qualification?.status;
    const qualificationStatus = qualificationStatuses.has(requestedStatus) ? requestedStatus : 'unsubmitted';
    const enterpriseApproved = signedIn && qualificationStatus === 'approved';
    const suspended = signedIn && qualificationStatus === 'delisted';
    const canPrepare = signedIn && !suspended;

    return Object.freeze({
      authenticated: signedIn,
      qualificationStatus,
      accountKind: enterpriseApproved ? 'enterprise' : suspended ? 'suspended' : 'personal',
      canCreateGameDraft: canPrepare,
      canEditReleaseDraft: canPrepare,
      canSubmitRelease: enterpriseApproved,
      canViewReleaseHistory: signedIn,
      canManageGameQualifications: enterpriseApproved,
      canManageVendor: enterpriseApproved,
      canViewPublisherData: enterpriseApproved || suspended,
      isPublisherReadOnly: suspended,
    });
  };

  scope.PublisherAccessPolicy = Object.freeze({ derive });
})(window);
