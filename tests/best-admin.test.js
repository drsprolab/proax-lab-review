const assert = require('node:assert/strict');
const fs = require('node:fs');
const path = require('node:path');
const test = require('node:test');
const vm = require('node:vm');

test('BEST authorization fails closed and accepts only the separate admin password', () => {
  const properties = { BEST_ADMIN_PASSWORD: 'private-admin-secret' };
  const context = vm.createContext({ Date, Object, String });
  context.PropertiesService = { getScriptProperties: () => ({ getProperty: key => properties[key] || null }) };
  context.LockService = { getScriptLock: () => ({ waitLock() {}, releaseLock() {} }) };
  vm.runInContext(fs.readFileSync(path.join(__dirname, '../apps-script/Code.gs'), 'utf8'), context);

  assert.throws(() => context.requireBestAdmin({ best_key: 'shared-viewer-password' }), /BEST_AUTH/);
  assert.throws(() => context.requireBestAdmin({ best_key: 'wrong' }), /BEST_AUTH/);
  assert.doesNotThrow(() => context.requireBestAdmin({ best_key: 'private-admin-secret' }));
  assert.throws(() => context.requireBestAdminForWrite({ data: { best_of_week: true }, key: 'shared-viewer-password' }), /BEST_AUTH/);
  assert.doesNotThrow(() => context.requireBestAdminForWrite({ data: { best_of_week: true }, best_key: 'private-admin-secret' }));
  assert.doesNotThrow(() => context.requireBestAdminForWrite({ data: { paper_title: 'ordinary submission' } }));
  delete properties.BEST_ADMIN_PASSWORD;
  assert.throws(() => context.requireBestAdmin({ best_key: 'private-admin-secret' }), /BEST_AUTH/);
});
