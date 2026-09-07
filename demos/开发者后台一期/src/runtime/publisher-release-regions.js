/* V2.5 发行范围单选与全球国家选择器。 */
(function () {
  'use strict';

  const codes = Object.freeze(['global', 'domestic']);
  const statuses = Object.freeze(['coming_soon', 'pre_registration', 'demo', 'released']);
  const catalog = Object.freeze([
    ['US', '美国', 'United States', 'NA'],
    ['CN', '中国大陆', 'Mainland China', 'AS'],
    ['RU', '俄罗斯', 'Russia', 'EU'],
    ['FR', '法国', 'France', 'EU'],
    ['DE', '德国', 'Germany', 'EU'],
    ['JP', '日本', 'Japan', 'AS'],
    ['IN', '印度', 'India', 'AS'],
    ['HK', '中国香港', 'Hong Kong, China', 'AS'],
    ['GB', '英国', 'United Kingdom', 'EU'],
    ['ID', '印度尼西亚', 'Indonesia', 'AS'],
    ['TH', '泰国', 'Thailand', 'AS'],
    ['AU', '澳大利亚', 'Australia', 'OC'],
    ['CA', '加拿大', 'Canada', 'NA'],
    ['BR', '巴西', 'Brazil', 'SA'],
    ['TR', '土耳其', 'Türkiye', 'EU'],
    ['PH', '菲律宾', 'Philippines', 'AS'],
    ['TW', '中国台湾', 'Taiwan, China', 'AS'],
    ['SG', '新加坡', 'Singapore', 'AS'],
    ['NL', '荷兰', 'Netherlands', 'EU'],
    ['IT', '意大利', 'Italy', 'EU'],
    ['MX', '墨西哥', 'Mexico', 'NA'],
    ['IQ', '伊拉克', 'Iraq', 'AS'],
    ['PK', '巴基斯坦', 'Pakistan', 'AS'],
    ['CO', '哥伦比亚', 'Colombia', 'SA'],
    ['EG', '埃及', 'Egypt', 'AF'],
    ['DZ', '阿尔及利亚', 'Algeria', 'AF'],
    ['AR', '阿根廷', 'Argentina', 'SA'],
    ['VN', '越南', 'Vietnam', 'AS'],
    ['VE', '委内瑞拉', 'Venezuela', 'SA'],
    ['MO', '中国澳门', 'Macao, China', 'AS'],
    ['KR', '韩国', 'South Korea', 'AS'],
  ].map(([code, zh, en, continent]) => Object.freeze({ code, zh, en, continent })));
  const globalCatalog = Object.freeze(catalog.filter(item => item.code !== 'CN'));
  const byCode = new Map(catalog.map(item => [item.code, item]));
  const continents = Object.freeze({
    AS: Object.freeze(['亚洲', 'Asia']),
    EU: Object.freeze(['欧洲', 'Europe']),
    NA: Object.freeze(['北美洲', 'North America']),
    SA: Object.freeze(['南美洲', 'South America']),
    AF: Object.freeze(['非洲', 'Africa']),
    OC: Object.freeze(['大洋洲', 'Oceania']),
  });
  const continentCodes = Object.freeze(Object.keys(continents));

  const copy = Object.freeze({
    zh: Object.freeze({
      scope: '发行范围',
      global: '全球服（中国大陆以外）',
      domestic: '国内服（中国大陆）',
      globalHint: '默认范围，可选择中国大陆以外的国家和地区',
      domesticHint: '发行地区固定为中国大陆，上架提审必须填写版号',
      globalScopeHint: '全球服不包含中国大陆，已选国家共用下方的发行状态和生效时间。',
      domesticScopeHint: '国内服仅发行至中国大陆，并使用中文资料和人民币定价。',
      globalTerritories: '全球发行国家和地区',
      mainlandChina: '中国大陆',
      mainlandFixed: '国内服固定发行地区',
      keyword: '国家／地区名称',
      search: '搜索国家／地区名称',
      continent: '洲',
      allContinents: '所有洲',
      clear: '清空筛选',
      selected: '已选择',
      selectedOf: '已选',
      empty: '没有匹配的国家／地区',
      emptyHint: '请调整国家／地区名称或洲筛选；筛选不会清除已经选择的地区。',
      coming_soon: '敬请期待',
      pre_registration: '预约',
      demo: '正式上线（试玩版）',
      released: '正式上线',
    }),
    en: Object.freeze({
      scope: 'Release scope',
      global: 'Global (outside mainland China)',
      domestic: 'Domestic (mainland China)',
      globalHint: 'Default scope; choose countries and regions outside mainland China',
      domesticHint: 'The region is fixed to mainland China; a publication approval number is required',
      globalScopeHint: 'The global release excludes mainland China. Selected countries share the release status and effective time below.',
      domesticScopeHint: 'The domestic release is limited to mainland China and uses Chinese store details and CNY pricing.',
      globalTerritories: 'Global release countries and regions',
      mainlandChina: 'Mainland China',
      mainlandFixed: 'Fixed domestic release region',
      keyword: 'Country / region name',
      search: 'Search countries / regions',
      continent: 'Continent',
      allContinents: 'All continents',
      clear: 'Clear filters',
      selected: 'Selected',
      selectedOf: 'selected',
      empty: 'No matching countries or regions',
      emptyHint: 'Change the country, region, or continent filter. Filtering preserves selected regions.',
      coming_soon: 'Coming soon',
      pre_registration: 'Pre-registration',
      demo: 'Released (demo)',
      released: 'Released',
    }),
  });

  const esc = value => String(value ?? '').replace(/[&<>"']/g, character => ({
    '&': '&amp;', '<': '&lt;', '>': '&gt;', '"': '&quot;', "'": '&#39;',
  })[character]);
  const hasOwn = (object, key) => Boolean(object) && Object.prototype.hasOwnProperty.call(object, key);
  const languageCode = value => value === 'en' ? 'en' : 'zh';
  const normalizeMode = (value, fallback = 'global') => codes.includes(value) ? value : fallback;
  const normalize = selected => {
    const values = Array.isArray(selected) ? selected : [selected];
    return codes.filter(code => values.includes(code));
  };
  const normalizeTerritoryCodes = selected => {
    const values = new Set((Array.isArray(selected) ? selected : [])
      .map(item => typeof item === 'string' ? item : item?.code)
      .filter(code => code !== 'CN' && byCode.has(code)));
    return globalCatalog.filter(item => values.has(item.code)).map(item => item.code);
  };
  const normalizeTerritories = selected => {
    const entries = new Map();
    for (const item of Array.isArray(selected) ? selected : []) {
      if (item && byCode.has(item.code) && statuses.includes(item.status) && !entries.has(item.code)) {
        entries.set(item.code, { code: item.code, status: item.status });
      }
    }
    return catalog.filter(item => entries.has(item.code)).map(item => entries.get(item.code));
  };
  const defaultTerritoryCodes = () => globalCatalog.map(item => item.code);
  const defaultTerritories = (status = 'coming_soon') => {
    const normalizedStatus = statuses.includes(status) ? status : 'coming_soon';
    return globalCatalog.map(item => ({ code: item.code, status: normalizedStatus }));
  };
  const regionsFor = (selected, { fallbackGlobal = true } = {}) => {
    if (selected && !Array.isArray(selected) && hasOwn(selected, 'mode')) return [normalizeMode(selected.mode)];
    const territories = normalizeTerritories(selected);
    if (!territories.length) return fallbackGlobal ? ['global'] : [];
    const values = new Set(territories.map(item => item.code === 'CN' ? 'domestic' : 'global'));
    return codes.filter(code => values.has(code));
  };
  const isChinese = value => {
    if (value && typeof value === 'object' && !Array.isArray(value)) return value.mode === 'domestic';
    return Array.isArray(value) ? value.includes('domestic') : value === 'domestic';
  };
  const label = (code, language = 'zh') => copy[languageCode(language)][code] || code;
  const territoryLabel = (code, language = 'zh') => byCode.get(code)?.[languageCode(language) === 'en' ? 'en' : 'zh'] || code;
  const continentLabel = (code, language = 'zh') => continents[code]?.[languageCode(language) === 'en' ? 1 : 0] || code;
  const statusLabel = (code, language = 'zh') => label(code, language);
  const filterDefaults = filters => {
    const target = filters && typeof filters === 'object' ? filters : {};
    target.keyword = String(target.keyword || '');
    target.continent = continentCodes.includes(target.continent) ? target.continent : '';
    return target;
  };

  function resolveState(input, options = {}) {
    const config = input && !Array.isArray(input) && typeof input === 'object'
      ? input
      : options.releaseConfig && typeof options.releaseConfig === 'object'
        ? options.releaseConfig
        : {};
    const legacySelected = Array.isArray(input) ? input : options.selectedCodes;
    const legacyTerritoriesProvided = hasOwn(options, 'releaseTerritories') || hasOwn(options, 'selections');
    const legacyTerritories = normalizeTerritories(options.releaseTerritories ?? options.selections ?? []);
    const configuredCodesProvided = hasOwn(config, 'globalTerritoryCodes') || hasOwn(options, 'globalTerritoryCodes');
    const configuredCodes = normalizeTerritoryCodes(config.globalTerritoryCodes ?? options.globalTerritoryCodes ?? []);
    const legacyGlobalCodes = normalizeTerritoryCodes(legacyTerritories);
    let mode = normalizeMode(config.mode ?? options.mode ?? options.releaseMode, '');
    if (!mode) mode = normalize(legacySelected).includes('domestic') && !normalize(legacySelected).includes('global') ? 'domestic' : 'global';

    let globalTerritoryCodes;
    if (configuredCodesProvided) globalTerritoryCodes = configuredCodes;
    else if (legacyTerritoriesProvided && (mode === 'global' || legacyGlobalCodes.length)) globalTerritoryCodes = legacyGlobalCodes;
    else globalTerritoryCodes = defaultTerritoryCodes();

    return {
      mode,
      globalTerritoryCodes,
      releaseStatus: statuses.includes(config.releaseStatus ?? options.releaseStatus)
        ? (config.releaseStatus ?? options.releaseStatus)
        : 'coming_soon',
      filters: filterDefaults(config.filters ?? options.filterState ?? options.filters),
    };
  }

  const payloadFor = state => ({
    mode: state.mode,
    globalTerritoryCodes: [...state.globalTerritoryCodes],
    releaseStatus: state.releaseStatus,
    filters: { ...state.filters },
  });
  const territoriesFor = state => state.mode === 'domestic'
    ? [{ code: 'CN', status: state.releaseStatus }]
    : state.globalTerritoryCodes.map(code => ({ code, status: state.releaseStatus }));

  function validate(value, releaseStatus) {
    if (value && !Array.isArray(value) && typeof value === 'object') {
      const mode = normalizeMode(value.mode, '');
      if (!mode) return { releaseMode: 'regionRequired' };
      const status = value.releaseStatus ?? releaseStatus;
      if (status !== undefined && !statuses.includes(status)) return { releaseTerritories: 'territoryInvalid' };
      if (mode === 'domestic') return {};
      if (!Array.isArray(value.globalTerritoryCodes) || !value.globalTerritoryCodes.length) return { releaseTerritories: 'territoryRequired' };
      if (normalizeTerritoryCodes(value.globalTerritoryCodes).length !== value.globalTerritoryCodes.length) return { releaseTerritories: 'territoryInvalid' };
      return {};
    }
    if (!Array.isArray(value) || !value.length) return { releaseTerritories: 'territoryRequired' };
    if (normalizeTerritories(value).length !== value.length) return { releaseTerritories: 'territoryInvalid' };
    if (releaseStatus !== undefined && (!statuses.includes(releaseStatus) || value.some(item => item.status !== releaseStatus))) {
      return { releaseTerritories: 'territoryInvalid' };
    }
    return {};
  }

  const scopeCardsHTML = (state, text, readonly, inputName) => `<div class="prr-scope-summary" role="radiogroup" aria-label="${esc(text.scope)}">${codes.map(code => {
    const selected = state.mode === code;
    return `<label class="prr-scope-card${selected ? ' is-selected' : ''}" data-release-service="${code}"><input type="radio" name="${esc(inputName)}" value="${code}" data-release-mode="${code}"${selected ? ' checked' : ''}${readonly ? ' disabled' : ''}><span class="prr-scope-dot" aria-hidden="true"></span><span class="prr-scope-copy"><strong>${esc(text[code])}</strong><small>${esc(text[`${code}Hint`])}</small></span></label>`;
  }).join('')}</div>`;

  const filtersHTML = (state, text, lang, readonly) => `<div class="prr-filters"><label>${esc(text.keyword)}<input type="search" data-territory-filter="keyword" placeholder="${esc(text.search)}" value="${esc(state.filters.keyword)}"${readonly ? ' disabled' : ''}></label><label>${esc(text.continent)}<select data-territory-filter="continent"${readonly ? ' disabled' : ''}><option value="">${esc(text.allContinents)}</option>${continentCodes.map(code => `<option value="${code}"${state.filters.continent === code ? ' selected' : ''}>${esc(continentLabel(code, lang))}</option>`).join('')}</select></label><button type="button" data-territory-clear-filters${readonly ? ' disabled' : ''}>${esc(text.clear)}</button></div>`;

  const territoryGroupsHTML = (state, text, lang, readonly) => {
    const selected = new Set(state.globalTerritoryCodes);
    return `<div class="prr-territory-groups" data-territory-groups>${continentCodes.map(continent => {
      const territories = globalCatalog.filter(item => item.continent === continent);
      const selectedCount = territories.filter(item => selected.has(item.code)).length;
      return `<section class="prr-continent-group" data-continent-group="${continent}"><header><h5>${esc(continentLabel(continent, lang))}</h5><span data-continent-selected-count>${selectedCount}/${territories.length} ${esc(text.selectedOf)}</span></header><div class="prr-territory-grid">${territories.map(item => `<label class="prr-territory-card${selected.has(item.code) ? ' is-selected' : ''}" data-territory-card="${item.code}" data-territory-row="${item.code}"><input type="checkbox" value="${item.code}" data-release-territory="${item.code}"${selected.has(item.code) ? ' checked' : ''}${readonly ? ' disabled' : ''}><span><strong>${esc(territoryLabel(item.code, lang))}</strong><small>${esc(item.code)}</small></span></label>`).join('')}</div></section>`;
    }).join('')}</div>`;
  };

  const modePanelHTML = (state, text, lang, readonly) => state.mode === 'domestic'
    ? `<section class="prr-domestic-panel" data-domestic-territory><div><span class="prr-mainland-icon" aria-hidden="true">✓</span><span><strong>${esc(text.mainlandChina)}</strong><small>${esc(text.mainlandFixed)}</small></span></div></section>`
    : `<section class="prr-global-panel" data-global-territories><header class="prr-panel-heading"><h4>${esc(text.globalTerritories)}</h4><span data-territory-count>${esc(text.selected)} ${state.globalTerritoryCodes.length}/${globalCatalog.length}</span></header>${filtersHTML(state, text, lang, readonly)}${territoryGroupsHTML(state, text, lang, readonly)}<div class="prr-filter-empty" data-territory-empty hidden><strong>${esc(text.empty)}</strong><p>${esc(text.emptyHint)}</p></div></section>`;

  const innerHTML = (state, language, options = {}) => {
    const lang = languageCode(language);
    const text = copy[lang];
    const readonly = Boolean(options.readonly);
    const inputName = options.inputName || 'publisher-release-mode';
    return `${scopeCardsHTML(state, text, readonly, inputName)}<p class="prr-scope-hint" data-release-scope-hint>${esc(text[state.mode === 'domestic' ? 'domesticScopeHint' : 'globalScopeHint'])}</p>${modePanelHTML(state, text, lang, readonly)}`;
  };

  function render(input, language = 'zh', options = {}) {
    const state = resolveState(input, options);
    const readonly = Boolean(options.readonly);
    return `<div class="publisher-release-regions" data-release-regions data-release-mode-current="${state.mode}" data-release-regions-readonly="${readonly}">${innerHTML(state, language, options)}</div>`;
  }

  function applyFilters(root) {
    const state = root.__releaseRegionsBinding;
    if (!state || state.mode !== 'global') return;
    const keyword = state.filters.keyword.trim().toLocaleLowerCase();
    let visibleCount = 0;
    root.querySelectorAll('[data-continent-group]').forEach(group => {
      let groupVisibleCount = 0;
      group.querySelectorAll('[data-territory-card]').forEach(card => {
        const item = byCode.get(card.dataset.territoryCard);
        const keywordMatch = !keyword || `${item.zh} ${item.en} ${item.code}`.toLocaleLowerCase().includes(keyword);
        const continentMatch = !state.filters.continent || item.continent === state.filters.continent;
        const visible = keywordMatch && continentMatch;
        card.hidden = !visible;
        if (visible) groupVisibleCount += 1;
      });
      group.hidden = groupVisibleCount === 0;
      visibleCount += groupVisibleCount;
    });
    const empty = root.querySelector('[data-territory-empty]');
    if (empty) empty.hidden = visibleCount > 0;
  }

  function updateSelection(root) {
    const state = root.__releaseRegionsBinding;
    if (!state || state.mode !== 'global') return;
    const selected = new Set(state.globalTerritoryCodes);
    root.querySelectorAll('[data-territory-card]').forEach(card => {
      card.classList.toggle('is-selected', selected.has(card.dataset.territoryCard));
    });
    const count = root.querySelector('[data-territory-count]');
    if (count) count.textContent = `${copy[state.language].selected} ${selected.size}/${globalCatalog.length}`;
    root.querySelectorAll('[data-continent-group]').forEach(group => {
      const all = [...group.querySelectorAll('[data-territory-card]')];
      const selectedCount = all.filter(card => selected.has(card.dataset.territoryCard)).length;
      const output = group.querySelector('[data-continent-selected-count]');
      if (output) output.textContent = `${selectedCount}/${all.length} ${copy[state.language].selectedOf}`;
    });
  }

  function repaint(root) {
    const state = root.__releaseRegionsBinding;
    if (!state) return;
    const rootScroll = { left: root.scrollLeft, top: root.scrollTop };
    const pageScroll = { left: window.scrollX, top: window.scrollY };
    root.dataset.releaseModeCurrent = state.mode;
    root.innerHTML = innerHTML(state, state.language, state.renderOptions);
    root.scrollLeft = rootScroll.left;
    root.scrollTop = rootScroll.top;
    window.scrollTo(pageScroll.left, pageScroll.top);
    applyFilters(root);
  }

  function bind(container, options = {}) {
    const root = container.matches?.('[data-release-regions]') ? container : container.querySelector?.('[data-release-regions]');
    if (!root) return null;
    const legacyCallback = !hasOwn(options, 'releaseConfig') && !hasOwn(options, 'mode') && !hasOwn(options, 'releaseMode') && !hasOwn(options, 'globalTerritoryCodes');
    const state = resolveState(options.releaseConfig || options.selectedCodes, options);
    state.language = languageCode(options.language);
    state.filters = filterDefaults(options.filterState ?? options.filters ?? state.filters);
    if (options.releaseConfig && typeof options.releaseConfig === 'object') options.releaseConfig.filters = state.filters;
    state.onChange = typeof options.onChange === 'function' ? options.onChange : () => {};
    state.legacyCallback = legacyCallback;
    state.renderOptions = { readonly: root.dataset.releaseRegionsReadonly === 'true', inputName: options.inputName };
    root.__releaseRegionsBinding = state;
    applyFilters(root);

    const emit = () => {
      const current = root.__releaseRegionsBinding;
      if (!current) return;
      if (current.legacyCallback) {
        current.onChange([current.mode], territoriesFor(current), payloadFor(current));
        return;
      }
      current.onChange(payloadFor(current));
    };

    if (!root.__releaseRegionsBound) {
      root.__releaseRegionsBound = true;
      root.addEventListener('input', event => {
        const current = root.__releaseRegionsBinding;
        if (!event.target.matches('[data-territory-filter="keyword"]') || !current) return;
        current.filters.keyword = event.target.value;
        applyFilters(root);
      });
      root.addEventListener('change', event => {
        const current = root.__releaseRegionsBinding;
        if (!current) return;
        if (event.target.matches('[data-territory-filter="continent"]')) {
          current.filters.continent = event.target.value;
          applyFilters(root);
          return;
        }
        if (event.target.matches('[data-release-mode]')) {
          if (current.renderOptions.readonly) return;
          current.mode = normalizeMode(event.target.value);
          repaint(root);
          emit();
          return;
        }
        if (!event.target.matches('[data-release-territory]')) return;
        if (current.renderOptions.readonly) {
          event.target.checked = current.globalTerritoryCodes.includes(event.target.value);
          return;
        }
        const selected = new Set(current.globalTerritoryCodes);
        if (event.target.checked) selected.add(event.target.value);
        else selected.delete(event.target.value);
        current.globalTerritoryCodes = globalCatalog.filter(item => selected.has(item.code)).map(item => item.code);
        updateSelection(root);
        emit();
      });
      root.addEventListener('click', event => {
        const button = event.target.closest?.('[data-territory-clear-filters]');
        const current = root.__releaseRegionsBinding;
        if (!button || !current) return;
        event.preventDefault();
        current.filters.keyword = '';
        current.filters.continent = '';
        root.querySelectorAll('[data-territory-filter]').forEach(input => { input.value = ''; });
        applyFilters(root);
      });
    }
    return payloadFor(state);
  }

  window.PublisherReleaseRegions = {
    codes,
    statuses,
    catalog,
    globalCatalog,
    continents,
    isChinese,
    label,
    territoryLabel,
    continentLabel,
    statusLabel,
    normalize,
    normalizeMode,
    normalizeTerritoryCodes,
    normalizeTerritories,
    defaultTerritoryCodes,
    defaultTerritories,
    regionsFor,
    territoriesFor,
    resolveState,
    validate,
    render,
    bind,
  };
})();
