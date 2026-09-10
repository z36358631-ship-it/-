import test from 'node:test';
import assert from 'node:assert/strict';
import fs from 'node:fs';
import vm from 'node:vm';

const scope = { window: {} };
vm.runInNewContext(
  fs.readFileSync(new URL('../../demos/开发者后台一期/src/runtime/publisher-access-policy.js', import.meta.url), 'utf8'),
  scope,
);
const rules = scope.window.PublisherAccessPolicy;

const cases = [
  ['signed-out', false, 'unsubmitted', false, false, false, false, false, false],
  ['personal', true, 'unsubmitted', true, true, false, false, false, true],
  ['pending', true, 'pending', true, true, false, false, false, true],
  ['rejected', true, 'rejected', true, true, false, false, false, true],
  ['enterprise', true, 'approved', true, true, true, true, false, true],
  ['suspended', true, 'delisted', false, false, false, false, true, true],
];

for (const [name, authenticated, status, canCreate, canEdit, canSubmit, canManage, readOnly, canViewHistory] of cases) {
  test(`${name} publisher access`, () => {
    const access = rules.derive({ authenticated, qualification: { status } });
    assert.equal(access.canCreateGameDraft, canCreate);
    assert.equal(access.canEditReleaseDraft, canEdit);
    assert.equal(access.canSubmitRelease, canSubmit);
    assert.equal(access.canManageGameQualifications, canManage);
    assert.equal(access.canManageVendor, canManage);
    assert.equal(access.isPublisherReadOnly, readOnly);
    assert.equal(access.canViewReleaseHistory, canViewHistory);
    assert.equal(Object.isFrozen(access), true);
  });
}

test('unknown qualification state is treated as unsubmitted without mutating input', () => {
  const input = { authenticated: true, qualification: { status: 'unexpected' } };
  const access = rules.derive(input);

  assert.equal(access.qualificationStatus, 'unsubmitted');
  assert.equal(access.accountKind, 'personal');
  assert.equal(access.canSubmitRelease, false);
  assert.equal(input.qualification.status, 'unexpected');
});
