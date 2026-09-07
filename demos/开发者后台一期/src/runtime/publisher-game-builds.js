/* 02 版本发布中的 PC 包体上传、基础版本约束与列表展示。 */
(function (global) {
  'use strict';

  const PLATFORMS = ['Windows', 'macOS', 'Linux'];
  const TYPES = ['full', 'incremental'];
  const TEST_STATUSES = ['not_submitted', 'pending', 'testing', 'passed', 'failed'];
  const esc = value => String(value ?? '').replace(/[&<>"']/g, character => ({ '&': '&amp;', '<': '&lt;', '>': '&gt;', '"': '&quot;', "'": '&#39;' }[character]));
  const clone = value => value == null ? value : structuredClone(value);
  const copy = (lang, zh, en) => lang === 'en' ? en : zh;
  const fileRecord = file => file && typeof file === 'object' ? file : null;
  const validFile = file => Boolean(file && file.blob instanceof Blob && file.blob.size > 0 && file.size === file.blob.size);
  const isParsedFull = build => build?.type === 'full' && build?.status === 'parsed' && validFile(build.file);
  const formatSize = bytes => {
    const size = Number(bytes || 0);
    if (size >= 1024 ** 3) return `${(size / 1024 ** 3).toFixed(2)} GB`;
    return `${(size / 1024 ** 2).toFixed(2)} MB`;
  };
  const defaultUpload = () => ({ open: false, type: 'full', platform: 'Windows', baseBuildId: '', file: null, executable: '', launchArgs: '', version: '', changelog: '', errors: {} });

  function createPackages(values = []) {
    return (Array.isArray(values) ? values : []).map((value, index) => ({
      id: value.id || `BUILD-LEGACY-${String(index + 1).padStart(3, '0')}`,
      source: value.source || 'local',
      platform: PLATFORMS.includes(value.platform) ? value.platform : 'Windows',
      type: TYPES.includes(value.type) ? value.type : 'full',
      baseBuildId: value.baseBuildId || '',
      file: fileRecord(value.file),
      executable: value.executable || '',
      launchArgs: value.launchArgs || '',
      version: value.version || '',
      changelog: value.changelog || '',
      status: value.status || 'parsed',
      testStatus: TEST_STATUSES.includes(value.testStatus) ? value.testStatus : 'not_submitted',
      testReason: value.testReason || '',
      tester: value.tester || '',
      testedAt: value.testedAt || '',
      testRevision: Number(value.testRevision || 0),
      createdAt: value.createdAt || new Date().toISOString(),
    }));
  }

  function ensureState(draft) {
    draft.buildPackages = createPackages(draft.buildPackages);
    draft.ui ||= {};
    draft.ui.buildUpload = { ...defaultUpload(), ...(draft.ui.buildUpload || {}), errors: { ...(draft.ui.buildUpload?.errors || {}) } };
    draft.ui.buildLibraryNotice = Boolean(draft.ui.buildLibraryNotice);
    return draft;
  }

  const parsedFullBuilds = (draft, platform = '') => createPackages(draft?.buildPackages).filter(build => isParsedFull(build) && (!platform || build.platform === platform));
  const hasParsedFullBuild = draft => parsedFullBuilds(draft).length > 0;
  const buildById = (draft, id) => createPackages(draft?.buildPackages).find(build => build.id === id);
  const submitForTest = build => build.testStatus === 'not_submitted'
    ? { ...build, testStatus: 'pending', testReason: '', tester: '', testedAt: '', testRevision: Math.max(1, Number(build.testRevision || 0) + 1) }
    : build;
  const prepareForSubmission = builds => createPackages(builds).map(submitForTest);
  const testCopy = (status, lang) => ({
    not_submitted: copy(lang, '待提审', 'Not submitted'),
    pending: copy(lang, '待测试', 'Pending test'),
    testing: copy(lang, '测试中', 'Testing'),
    passed: copy(lang, '测试通过', 'Test passed'),
    failed: copy(lang, '测试不通过', 'Test failed'),
  }[status] || copy(lang, '待提审', 'Not submitted'));

  function validateUpload(upload, draft) {
    const errors = {};
    if (!PLATFORMS.includes(upload.platform)) errors.platform = 'platformRequired';
    if (!TYPES.includes(upload.type)) errors.type = 'typeRequired';
    if (!validFile(upload.file)) errors.file = 'fileRequired';
    if (!String(upload.executable || '').trim()) errors.executable = 'executableRequired';
    if (!String(upload.version || '').trim()) errors.version = 'versionRequired';
    if (!String(upload.changelog || '').trim()) errors.changelog = 'changelogRequired';
    if (String(upload.changelog || '').length > 500) errors.changelog = 'changelogTooLong';
    if (upload.type === 'incremental') {
      const base = buildById(draft, upload.baseBuildId);
      if (!base || !isParsedFull(base) || base.platform !== upload.platform) errors.baseBuildId = 'baseRequired';
    }
    return errors;
  }

  function createBuild(upload, draft) {
    const sequence = createPackages(draft.buildPackages).length + 1;
    const stamp = new Date().toISOString().slice(0, 10).replaceAll('-', '');
    return {
      id: `BUILD-${stamp}-${String(sequence).padStart(3, '0')}`,
      source: 'local', platform: upload.platform, type: upload.type,
      baseBuildId: upload.type === 'incremental' ? upload.baseBuildId : '',
      file: upload.file, executable: String(upload.executable).trim(), launchArgs: String(upload.launchArgs || '').trim(),
      version: String(upload.version).trim(), changelog: String(upload.changelog).trim(), status: 'parsed', testStatus: 'not_submitted', testReason: '', tester: '', testedAt: '', testRevision: 0, createdAt: new Date().toISOString(),
    };
  }

  function render(draft, lang = 'zh', options = {}) {
    ensureState(draft);
    const readonly = Boolean(options.readonly);
    const builds = draft.buildPackages;
    const rows = builds.map(build => {
      const base = build.type === 'incremental' ? buildById(draft, build.baseBuildId) : null;
      const reason = build.testStatus === 'failed' && build.testReason
        ? `<p class="pgb-test-reason" data-build-test-reason><b>${copy(lang, '不通过原因', 'Failure reason')}：</b>${esc(build.testReason)}</p>` : '';
      return `<article class="pgb-build-row" data-build-row="${esc(build.id)}" data-build-test-status="${esc(build.testStatus)}"><div class="pgb-build-row__main"><span class="pgb-platform">${esc(build.platform)}</span><div><strong>${esc(build.version)}</strong><small>${esc(build.id)} · ${esc(build.file?.name || '包体文件不可用')}</small></div></div><dl><div><dt>${copy(lang, '类型', 'Type')}</dt><dd>${copy(lang, build.type === 'full' ? '游戏整包' : '增量上传', build.type === 'full' ? 'Full package' : 'Incremental')}</dd></div><div><dt>${copy(lang, '基础版本', 'Base build')}</dt><dd>${build.type === 'full' ? '—' : esc(base ? `${base.version} · ${base.id}` : build.baseBuildId || '—')}</dd></div><div><dt>${copy(lang, '文件大小', 'File size')}</dt><dd>${esc(formatSize(build.file?.size))}</dd></div><div><dt>${copy(lang, '解析状态', 'Parse status')}</dt><dd><span class="pgb-status is-parsed">${copy(lang, '解析通过', 'Parsed')}</span></dd></div><div><dt>${copy(lang, '测试状态', 'Test status')}</dt><dd><span class="pgb-status is-test-${esc(build.testStatus)}">${esc(testCopy(build.testStatus, lang))}</span></dd></div></dl>${reason}</article>`;
    }).join('');
    const notice = draft.ui.buildLibraryNotice ? `<p class="pgb-inline-notice" role="status" data-build-library-placeholder>${copy(lang, '包体库选择流程待后续 PRD 补充，本 Demo 暂不展开。', 'Build-library selection will be defined in a later PRD and is not expanded in this demo.')}</p>` : '';
    return `<section class="pgb-module" data-profile-builds><header class="pgp-module-intro"><div><h3>${copy(lang, 'PC 包体', 'PC builds')}</h3><p>${copy(lang, '解析通过后可关联 SKU；提交发布后由平台测试，全部必测包体通过才可发布。', 'Parsed builds can be linked to SKUs. After submission, every required build must pass platform testing before release.')}</p></div><div class="pgb-module-actions"><button type="button" class="pgp-button" data-build-library-select${readonly ? ' disabled' : ''}>${copy(lang, '从包体库选择', 'Choose from build library')}</button><button type="button" class="pgp-button pgp-button--primary" data-build-local-open${readonly ? ' disabled' : ''}>${copy(lang, '从本地上传', 'Upload from computer')}</button></div></header>${notice}${draft.errors?.['buildPackages.readyFull'] ? `<p class="pgp-error" role="alert" data-profile-error="buildPackages.readyFull">${copy(lang, '请至少上传 1 个已解析通过的游戏整包。', 'Upload at least one parsed full package.')}</p>` : ''}${rows ? `<div class="pgb-build-list">${rows}</div>` : `<div class="pgb-empty"><span aria-hidden="true">⇧</span><strong>${copy(lang, '尚未上传 PC 包体', 'No PC build uploaded')}</strong><p>${copy(lang, '首次发布前需要至少上传一个游戏整包。', 'Upload at least one full package before the first release.')}</p></div>`}${renderModal(draft, lang, readonly)}</section>`;
  }

  function renderModal(draft, lang, readonly) {
    const upload = ensureState(draft).ui.buildUpload;
    if (!upload.open) return '';
    const fullBuilds = parsedFullBuilds(draft, upload.platform);
    const errorZh = { platformRequired: '请选择平台。', typeRequired: '请选择上传类型。', fileRequired: '请从本地选择包体文件。', executableRequired: '请填写可执行文件或启动项。', versionRequired: '请填写版本号。', changelogRequired: '请填写更新日志。', changelogTooLong: '更新日志最多 500 字。', baseRequired: '增量上传必须选择同平台、已解析通过的整包作为基础版本。' };
    const errorEn = { platformRequired: 'Select a platform.', typeRequired: 'Select an upload type.', fileRequired: 'Choose a package file from your computer.', executableRequired: 'Enter the executable or launch item.', versionRequired: 'Enter a version.', changelogRequired: 'Enter release notes.', changelogTooLong: 'Release notes must be 500 characters or fewer.', baseRequired: 'Choose a parsed full package for the same platform as the base build.' };
    const error = key => `<p class="pgp-error" data-build-upload-error="${key}"${upload.errors[key] ? ' role="alert"' : ' hidden'}>${esc(copy(lang, errorZh[upload.errors[key]] || '', errorEn[upload.errors[key]] || ''))}</p>`;
    const fileName = upload.file?.name;
    return `<div class="pgb-modal-backdrop" data-build-modal-backdrop><section class="pgb-modal" role="dialog" aria-modal="true" aria-labelledby="pgb-modal-title"><header><h3 id="pgb-modal-title">${copy(lang, `上传 ${upload.platform} 包`, `Upload ${upload.platform} build`)}</h3><button type="button" data-build-upload-close aria-label="${copy(lang, '关闭', 'Close')}">×</button></header><div class="pgb-modal-body"><fieldset class="pgb-choice"><legend>${copy(lang, '平台', 'Platform')} <span>*</span></legend><div>${PLATFORMS.map(platform => `<label class="${upload.platform === platform ? 'is-selected' : ''}"><input type="radio" name="build-platform" value="${platform}" data-build-upload-field="platform"${upload.platform === platform ? ' checked' : ''}${readonly ? ' disabled' : ''}><span>${platform}</span></label>`).join('')}</div>${error('platform')}</fieldset><fieldset class="pgb-choice"><legend>${copy(lang, '上传类型', 'Upload type')} <span>*</span></legend><div>${[['full', '游戏整包', 'Full package'], ['incremental', '增量上传', 'Incremental']].map(([value, zh, en]) => `<label class="${upload.type === value ? 'is-selected' : ''}"><input type="radio" name="build-type" value="${value}" data-build-upload-field="type"${upload.type === value ? ' checked' : ''}${readonly ? ' disabled' : ''}><span>${copy(lang, zh, en)}</span></label>`).join('')}</div>${error('type')}</fieldset>${upload.type === 'incremental' ? `<div class="pgb-field"><label>${copy(lang, '基础整包', 'Base full package')} <span>*</span></label><select data-build-upload-field="baseBuildId"${readonly || !fullBuilds.length ? ' disabled' : ''}><option value="">${copy(lang, fullBuilds.length ? '请选择已解析整包' : '当前平台暂无可用整包', fullBuilds.length ? 'Choose a parsed full package' : 'No parsed full package for this platform')}</option>${fullBuilds.map(build => `<option value="${esc(build.id)}"${upload.baseBuildId === build.id ? ' selected' : ''}>${esc(build.version)} · ${esc(build.id)}</option>`).join('')}</select>${error('baseBuildId')}</div>` : ''}<div class="pgb-upload-file"><label>${copy(lang, '包体文件', 'Package file')} <span>*</span></label><label class="pgb-file-picker"><input type="file" data-build-upload-file${readonly ? ' disabled' : ''}><span aria-hidden="true">⇧</span><strong>${fileName ? esc(fileName) : copy(lang, '选择本地文件', 'Choose local file')}</strong><small>${fileName ? esc(formatSize(upload.file.size)) : copy(lang, '支持 ZIP、7Z 或平台约定的包体格式', 'ZIP, 7Z, or the package format agreed for the platform')}</small></label>${error('file')}</div><div class="pgb-form-grid"><div class="pgb-field"><label>${copy(lang, '可执行文件／启动项', 'Executable / launch item')} <span>*</span></label><input data-build-upload-field="executable" value="${esc(upload.executable)}" placeholder="${upload.platform === 'Windows' ? 'Game.exe' : upload.platform === 'macOS' ? 'Game.app' : './game'}">${error('executable')}</div><div class="pgb-field"><label>${copy(lang, '游戏启动参数', 'Launch arguments')}</label><input data-build-upload-field="launchArgs" value="${esc(upload.launchArgs)}" placeholder="${copy(lang, '选填', 'Optional')}"></div><div class="pgb-field"><label>${copy(lang, '版本号', 'Version')} <span>*</span></label><input data-build-upload-field="version" value="${esc(upload.version)}" placeholder="1.0.0">${error('version')}</div><div class="pgb-field pgb-field--wide"><label>${copy(lang, '更新日志', 'Release notes')} <span>*</span></label><textarea maxlength="500" rows="4" data-build-upload-field="changelog" placeholder="${copy(lang, '请填写本次上传版本的更新内容', 'Describe the changes in this build')}">${esc(upload.changelog)}</textarea><small class="pgb-count"><span data-build-changelog-count>${String(upload.changelog).length}</span> / 500</small>${error('changelog')}</div></div></div><footer><button type="button" class="pgp-button" data-build-upload-close>${copy(lang, '取消', 'Cancel')}</button><button type="button" class="pgp-button pgp-button--primary" data-build-upload-save${readonly ? ' disabled' : ''}>${copy(lang, '保存包体', 'Save build')}</button></footer></section></div>`;
  }

  function bind(root, { draft, readonly = false, onChanged = () => {}, repaint = () => {} } = {}) {
    ensureState(draft);
    const upload = draft.ui.buildUpload;
    const clearError = key => { delete upload.errors[key]; };
    root.querySelector('[data-build-library-select]')?.addEventListener('click', () => {
      if (readonly) return;
      draft.ui.buildLibraryNotice = true;
      repaint('[data-build-library-placeholder]');
    });
    root.querySelector('[data-build-local-open]')?.addEventListener('click', () => {
      if (readonly) return;
      draft.ui.buildLibraryNotice = false;
      draft.ui.buildUpload = defaultUpload();
      draft.ui.buildUpload.open = true;
      repaint('[data-build-upload-file]');
    });
    root.querySelectorAll('[data-build-upload-close]').forEach(button => button.addEventListener('click', () => {
      draft.ui.buildUpload = defaultUpload();
      repaint('[data-build-local-open]');
    }));
    root.querySelector('[data-build-modal-backdrop]')?.addEventListener('click', event => {
      if (event.target !== event.currentTarget) return;
      draft.ui.buildUpload = defaultUpload();
      repaint('[data-build-local-open]');
    });
    root.querySelectorAll('[data-build-upload-field]').forEach(control => control.addEventListener(control.tagName === 'TEXTAREA' || control.tagName === 'INPUT' && control.type !== 'radio' ? 'input' : 'change', () => {
      const key = control.dataset.buildUploadField;
      upload[key] = control.value;
      clearError(key);
      if (key === 'platform') upload.baseBuildId = '';
      if (key === 'type') upload.baseBuildId = '';
      if (key === 'platform' || key === 'type') repaint(`[data-build-upload-field="${key}"][value="${control.value}"]`);
      const count = root.querySelector('[data-build-changelog-count]');
      if (count && key === 'changelog') count.textContent = control.value.length;
    }));
    root.querySelector('[data-build-upload-file]')?.addEventListener('change', event => {
      const file = event.currentTarget.files?.[0];
      if (!file) return;
      upload.file = { name: file.name, type: file.type || 'application/octet-stream', size: file.size, blob: file };
      clearError('file');
      repaint('[data-build-upload-file]');
    });
    root.querySelector('[data-build-upload-save]')?.addEventListener('click', () => {
      upload.errors = validateUpload(upload, draft);
      if (Object.keys(upload.errors).length) { repaint('[data-build-upload-error][role="alert"]'); return; }
      const build = createBuild(upload, draft);
      draft.buildPackages.push(build);
      draft.ui.buildUpload = defaultUpload();
      delete draft.errors?.['buildPackages.readyFull'];
      onChanged('buildPackages');
      repaint(`[data-build-row="${build.id}"]`);
    });
  }

  global.PublisherGameBuilds = { PLATFORMS, TYPES, TEST_STATUSES, createPackages, ensureState, parsedFullBuilds, hasParsedFullBuild, prepareForSubmission, validateUpload, createBuild, render, bind, validFile, isParsedFull };
})(window);
