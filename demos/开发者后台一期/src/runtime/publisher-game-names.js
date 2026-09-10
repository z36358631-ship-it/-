/* 游戏名称：可选支持语种、默认语种与独立名称；设置确认前不改业务数据。 */
(function () {
  'use strict';
  const languages = [
    ['zh', '简体中文', 'Simplified Chinese'], ['zh-Hant', '繁体中文', 'Traditional Chinese'], ['en', '英语', 'English'],
    ['ja', '日语', 'Japanese'], ['ko', '韩语', 'Korean'], ['id', '印尼语', 'Indonesian'], ['th', '泰语', 'Thai'],
    ['pt', '葡萄牙语', 'Portuguese'], ['vi', '越南语', 'Vietnamese'], ['hi', '印地语', 'Hindi'], ['ms', '马来语', 'Malay'],
    ['fr', '法语', 'French'], ['de', '德语', 'German'], ['es', '西班牙语', 'Spanish'], ['ru', '俄语', 'Russian'], ['ar', '阿拉伯语', 'Arabic'],
  ];
  const codes = languages.map(item => item[0]);
  const copy = {
    zh: { title: '游戏名称', settings: '多语言设置', default: '默认', defaultLanguage: '默认语言', name: '游戏名称', placeholder: '请输入该语种的游戏名称', selected: '已选', items: '项', clear: '清除', cancel: '取消', confirm: '确认', remove: '移除', required: '必填', optional: '选填', defaultHint: '默认语言必须保留；移除语种会保留已填写内容。' },
    en: { title: 'Game name', settings: 'Language settings', default: 'Default', defaultLanguage: 'Default language', name: 'Game name', placeholder: 'Enter the game name in this language', selected: 'Selected', items: 'languages', clear: 'Clear', cancel: 'Cancel', confirm: 'Confirm', remove: 'Remove', required: 'Required', optional: 'Optional', defaultHint: 'The default language must remain selected. Removing a language keeps its saved content.' },
  };
  const escape = value => String(value ?? '').replace(/[&<>"']/g, character => ({ '&': '&amp;', '<': '&lt;', '>': '&gt;', '"': '&quot;', "'": '&#39;' }[character]));
  const runtime = new WeakMap();
  const identities = new WeakMap();
  let nextIdentity = 0;
  const label = (code, language = 'zh') => languages.find(item => item[0] === code)?.[language === 'en' ? 2 : 1] || code;
  function createData(source = {}) {
    const gameNames = Object.fromEntries(Object.entries(source.gameNames || {}).filter(([code]) => codes.includes(code)).map(([code, value]) => [code, String(value ?? '')]));
    if (!('en' in gameNames) && source.gameNameEn) gameNames.en = String(source.gameNameEn);
    if (!('zh' in gameNames) && source.gameNameZh) gameNames.zh = String(source.gameNameZh);
    const requestedDefault = source.storeLocales?.default || source.default || source.defaultNameLanguage;
    const defaultNameLanguage = codes.includes(requestedDefault) ? requestedDefault : 'en';
    if (!(defaultNameLanguage in gameNames) && source.gameName && !Object.keys(source.gameNames || {}).length) gameNames[defaultNameLanguage] = String(source.gameName);
    const configured = source.storeLocales?.enabled || source.enabled || source.nameLanguages;
    const nameLanguages = [...new Set((Array.isArray(configured) ? configured : ['en']).filter(code => codes.includes(code)))];
    if (!nameLanguages.includes(defaultNameLanguage)) nameLanguages.unshift(defaultNameLanguage);
    nameLanguages.forEach(code => { if (!(code in gameNames)) gameNames[code] = ''; });
    const requestedCurrent = source.storeLocales?.current || source.current || source.currentNameLanguage;
    const currentNameLanguage = nameLanguages.includes(requestedCurrent) ? requestedCurrent : defaultNameLanguage;
    return { gameNames, nameLanguages, defaultNameLanguage, currentNameLanguage, storeLocales: { enabled: nameLanguages, default: defaultNameLanguage, current: currentNameLanguage } };
  }
  function sync(draft) {
    Object.assign(draft, createData(draft));
    draft.gameNameEn = draft.gameNames.en || '';
    draft.gameNameZh = draft.gameNames.zh || '';
    draft.gameName = draft.gameNames[draft.defaultNameLanguage] || '';
    draft.storeLocales = { enabled: draft.nameLanguages, default: draft.defaultNameLanguage, current: draft.currentNameLanguage };
    return draft;
  }
  function inner(draft, language, options) {
    if (!identities.has(draft)) identities.set(draft, `pgn-${++nextIdentity}`);
    const id = options.idPrefix ? `pgn-${String(options.idPrefix).replace(/[^A-Za-z0-9_-]/g, '-')}` : identities.get(draft);
    const text = copy[language === 'en' ? 'en' : 'zh'];
    const current = draft.currentNameLanguage;
    const required = current === draft.defaultNameLanguage || (options.requiredLanguages || []).includes(current);
    const selectionHint = (options.requiredLanguages || []).length ? language === 'en' ? 'The default language and languages required for this release must remain selected. Removing a language keeps its saved content.' : '默认语言及当前发行必需的语种必须保留；移除语种会保留已填写内容。' : text.defaultHint;
    const error = typeof options.error === 'object' ? options.error[current] || '' : current === draft.defaultNameLanguage ? options.error || '' : '';
    return `<header class="pgn-header"><h4>${escape(options.title || (options.hideInput ? language === 'en' ? 'Asset languages' : '素材语言' : text.title))} ${options.hideInput ? '' : '<span class="pgn-required" aria-hidden="true">*</span>'}</h4><button type="button" class="pgn-settings" data-name-settings${options.readonly ? ' disabled' : ''}>${language === 'en' ? 'Manage languages' : '管理多语言'}</button></header>
      <div class="pgn-tabs" role="tablist" aria-label="${text.title}">${draft.nameLanguages.map(code => `<button type="button" role="tab" id="${id}-tab-${code}" data-name-language="${code}" aria-controls="${id}-panel" aria-selected="${current === code}" tabindex="${current === code ? '0' : '-1'}">${escape(label(code, language))}${code === draft.defaultNameLanguage ? `<small class="pgn-default">${text.default}</small>` : ''}</button>`).join('')}</div>
      ${options.hideInput ? '' : `<div class="pgn-field" id="${id}-panel" role="tabpanel" aria-labelledby="${id}-tab-${current}" data-name-field="${current}"><label for="${id}-input">${text.name} · ${escape(label(current, language))}${required ? ' <span class="pgn-required" aria-hidden="true">*</span>' : ` <small>${text.optional}</small>`}</label><input id="${id}-input" type="text" maxlength="100" dir="${current === 'ar' ? 'rtl' : 'auto'}" value="${escape(draft.gameNames[current])}" placeholder="${text.placeholder}" data-game-name-input="${current}" aria-required="${required}" aria-invalid="${Boolean(error)}" aria-describedby="${id}-error"${options.readonly ? ' disabled' : ''}><p class="pgn-count"><span data-name-count>${String(draft.gameNames[current] || '').length}</span> / 100</p><p class="pgn-error" id="${id}-error" data-name-error${error ? ' role="alert"' : ' hidden'}>${escape(error)}</p></div>`}
      <dialog class="pgn-dialog" data-name-dialog aria-labelledby="${id}-dialog-title"><header><h3 id="${id}-dialog-title">${text.settings}</h3></header><div class="pgn-default-row"><label for="${id}-default">${text.defaultLanguage}</label><select id="${id}-default" data-name-default>${languages.map(([code]) => `<option value="${code}">${escape(label(code, language))}</option>`).join('')}</select></div><div class="pgn-picker-columns"><section class="pgn-picker-panel"><header><label><input type="checkbox" data-name-select-all><span>${languages.length} ${text.items}</span></label></header><div class="pgn-options">${languages.map(([code]) => `<label><input type="checkbox" value="${code}" data-name-option="${code}"><span>${escape(label(code, language))}</span></label>`).join('')}</div></section><section class="pgn-picker-panel"><header><strong>${text.selected} <span data-name-selected-count></span> ${text.items}</strong><button type="button" data-name-clear>${text.clear}</button></header><div class="pgn-selected" data-name-selected></div></section></div><p class="pgn-dialog-hint">${selectionHint}</p><footer class="pgn-dialog-actions"><button type="button" class="pgn-cancel" data-name-cancel>${text.cancel}</button><button type="button" class="pgn-confirm" data-name-confirm>${text.confirm}</button></footer></dialog>`;
  }
  function render(draft, language = 'zh', options = {}) {
    sync(draft);
    return `<div class="publisher-game-names" data-game-names>${inner(draft, language, options)}</div>`;
  }
  function bind(container, { draft, language = 'zh', readonly = false, error = '', requiredLanguages = [], hideInput = false, title = '', idPrefix = '', onInput = () => {}, onChange = () => {} }) {
    const root = container.matches('[data-game-names]') ? container : container.querySelector('[data-game-names]');
    if (!root) return;
    const options = { readonly, error, requiredLanguages, hideInput, title, idPrefix };
    const state = { root, draft, language, options, onInput, onChange, staged: null };
    runtime.set(root, state);
    if (root.__gameNamesBound) { state.showLanguage = root.__showNameLanguage; return; }
    root.__gameNamesBound = true;
    const currentState = () => runtime.get(root);
    const protectedLanguages = state => [...new Set([state.staged?.defaultLanguage || state.draft.defaultNameLanguage, ...(state.options.requiredLanguages || [])].filter(code => codes.includes(code)))];
    function redraw(selector) {
      const state = currentState();
      const scrollers = [];
      for (let node = root; node; node = node.parentElement) if (node.scrollTop || node.scrollLeft) scrollers.push([node, node.scrollTop, node.scrollLeft]);
      const windowPosition = [scrollX, scrollY];
      const tabScroll = root.querySelector('.pgn-tabs')?.scrollLeft || 0;
      root.innerHTML = inner(state.draft, state.language, state.options);
      root.querySelector('.pgn-tabs').scrollLeft = tabScroll;
      root.querySelector(selector)?.focus({ preventScroll: true });
      scrollers.forEach(([node, top, left]) => node.scrollTo({ top, left, behavior: 'instant' }));
      window.scrollTo({ left: windowPosition[0], top: windowPosition[1], behavior: 'instant' });
    }
    function showLanguage(code, focusInput = false) {
      const state = currentState();
      if (!state.draft.nameLanguages.includes(code)) return;
      state.draft.currentNameLanguage = code;
      redraw(focusInput ? '[data-game-name-input]' : `[data-name-language="${code}"]`);
    }
    function updateDialog() {
      const state = currentState(); const selected = state.staged; const text = copy[state.language === 'en' ? 'en' : 'zh'];
      const protectedCodes = protectedLanguages(state);
      selected.languages = [...new Set([...selected.languages, ...protectedCodes])];
      root.querySelector('[data-name-default]').value = selected.defaultLanguage;
      root.querySelectorAll('[data-name-option]').forEach(input => { input.checked = selected.languages.includes(input.value); input.disabled = protectedCodes.includes(input.value); });
      const all = root.querySelector('[data-name-select-all]'); all.checked = selected.languages.length === languages.length; all.indeterminate = selected.languages.length > 0 && !all.checked;
      root.querySelector('[data-name-selected-count]').textContent = selected.languages.length;
      root.querySelector('[data-name-clear]').disabled = selected.languages.every(code => protectedCodes.includes(code));
      root.querySelector('[data-name-selected]').innerHTML = selected.languages.map(code => `<div class="pgn-selected-item"><span>${escape(label(code, state.language))}${protectedCodes.includes(code) ? `<small class="pgn-default">${code === selected.defaultLanguage ? text.default : text.required}</small>` : ''}</span>${protectedCodes.includes(code) ? '' : `<button type="button" data-name-remove="${code}" aria-label="${text.remove} ${escape(label(code, state.language))}">×</button>`}</div>`).join('');
    }
    root.addEventListener('input', event => {
      if (!event.target.matches('[data-game-name-input]')) return;
      const state = currentState(); if (state.options.readonly) return;
      const code = event.target.dataset.gameNameInput;
      state.draft.gameNames[code] = event.target.value;
      sync(state.draft);
      event.target.setAttribute('aria-invalid', 'false');
      const error = root.querySelector('[data-name-error]'); error.hidden = true; error.removeAttribute('role');
      root.querySelector('[data-name-count]').textContent = event.target.value.length;
      if (typeof state.options.error === 'object') state.options.error = { ...state.options.error, [code]: '' }; else state.options.error = '';
      state.onInput(code, event.target.value);
    });
    root.addEventListener('click', event => {
      const state = currentState();
      const tab = event.target.closest('[data-name-language]');
      if (tab) { showLanguage(tab.dataset.nameLanguage); state.onChange(); return; }
      if (state.options.readonly) return;
      if (event.target.closest('[data-name-settings]')) {
        state.staged = { languages: [...state.draft.nameLanguages], defaultLanguage: state.draft.defaultNameLanguage };
        updateDialog(); root.querySelector('[data-name-dialog]').showModal(); root.querySelector('[data-name-default]').focus({ preventScroll: true });
      } else if (event.target.closest('[data-name-cancel]')) {
        state.staged = null; root.querySelector('[data-name-dialog]').close(); root.querySelector('[data-name-settings]').focus({ preventScroll: true });
      } else if (event.target.closest('[data-name-confirm]')) {
        if (!state.staged) return;
        state.draft.nameLanguages = [...state.staged.languages]; state.draft.defaultNameLanguage = state.staged.defaultLanguage;
        if (!state.draft.nameLanguages.includes(state.draft.currentNameLanguage)) state.draft.currentNameLanguage = state.draft.defaultNameLanguage;
        state.draft.storeLocales = { enabled: [...state.draft.nameLanguages], default: state.draft.defaultNameLanguage, current: state.draft.currentNameLanguage };
        sync(state.draft); state.staged = null; root.querySelector('[data-name-dialog]').close();
        redraw('[data-name-settings]'); state.onChange();
      } else if (event.target.closest('[data-name-clear]') && state.staged) { state.staged.languages = protectedLanguages(state); updateDialog(); }
      else if (event.target.closest('[data-name-remove]') && state.staged) {
        const code = event.target.closest('[data-name-remove]').dataset.nameRemove;
        if (!protectedLanguages(state).includes(code)) state.staged.languages = state.staged.languages.filter(item => item !== code);
        updateDialog();
      }
    });
    root.addEventListener('change', event => {
      const state = currentState(); if (state.options.readonly || !state.staged) return;
      if (event.target.matches('[data-name-default]')) {
        state.staged.defaultLanguage = event.target.value;
        if (!state.staged.languages.includes(event.target.value)) state.staged.languages.push(event.target.value);
      } else if (event.target.matches('[data-name-option]')) {
        const code = event.target.value;
        if (event.target.checked && !state.staged.languages.includes(code)) state.staged.languages.push(code);
        else if (!event.target.checked && !protectedLanguages(state).includes(code)) state.staged.languages = state.staged.languages.filter(item => item !== code);
      } else if (event.target.matches('[data-name-select-all]')) state.staged.languages = event.target.checked ? [...codes] : protectedLanguages(state);
      else return;
      updateDialog();
    });
    root.addEventListener('keydown', event => {
      const tab = event.target.closest('[data-name-language]');
      if (!tab || !['ArrowLeft', 'ArrowRight', 'Home', 'End'].includes(event.key)) return;
      event.preventDefault(); const { draft } = currentState(); const list = draft.nameLanguages; const index = list.indexOf(tab.dataset.nameLanguage);
      showLanguage(list[event.key === 'Home' ? 0 : event.key === 'End' ? list.length - 1 : (index + (event.key === 'ArrowRight' ? 1 : -1) + list.length) % list.length]);
      currentState().onChange();
    });
    root.addEventListener('cancel', event => {
      if (!event.target.matches('[data-name-dialog]')) return;
      currentState().staged = null;
      root.querySelector('[data-name-settings]').focus({ preventScroll: true });
    }, true);
    state.showLanguage = showLanguage;
    root.__showNameLanguage = showLanguage;
  }
  function focus(container, code, { scroll = true } = {}) {
    const root = container.matches('[data-game-names]') ? container : container.querySelector('[data-game-names]');
    const state = root && runtime.get(root); if (!state) return;
    state.showLanguage(code || state.draft.defaultNameLanguage, true);
    if (scroll) root.querySelector('[data-game-name-input]')?.scrollIntoView({ block: 'center', behavior: 'instant' });
  }
  window.PublisherGameNames = { languages, codes, label, createData, sync, render, bind, focus };
})();
