/* 02 游戏创建：唯一创建表单，先建立游戏项目，资料与资质在创建后补充。 */
(function () {
  'use strict';

  const relationships = [
    { id: 'developer', label: '开发商' },
    { id: 'publisher', label: '发行商' },
    { id: 'developer_publisher', label: '开发商和发行商' },
  ];
  const genres = ['角色扮演', '休闲', '动作', '策略', '模拟', '益智', '街机', '冒险'];
  const platforms = ['Windows', 'macOS', 'Linux'];
  const releasePlans = [
    {
      id: 'reservation',
      title: '游戏还没好，先开放预约',
      description: '版本还在制作中，先搭建商店页和预约入口',
      icon: '<svg viewBox="0 0 32 32" fill="none" aria-hidden="true"><rect x="7" y="9" width="18" height="16" rx="2.5" stroke="currentColor" stroke-width="2"/><path d="M11 6v6M21 6v6M7 14h18M11 18h4M11 22h7" stroke="currentColor" stroke-width="2" stroke-linecap="round"/></svg>',
    },
    {
      id: 'test',
      title: '先开一次测试',
      description: '先招募玩家试玩，验证玩法和稳定性',
      icon: '<svg viewBox="0 0 32 32" fill="none" aria-hidden="true"><path d="M12 6h8M14 6v7L8.5 23.2A2.5 2.5 0 0 0 10.7 27h10.6a2.5 2.5 0 0 0 2.2-3.8L18 13V6" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round"/><path d="M11 21h10" stroke="currentColor" stroke-width="2" stroke-linecap="round"/></svg>',
    },
    {
      id: 'launch',
      title: '已有游戏，准备上线',
      description: '已有可发布版本，继续准备商店资料和上线流程',
      icon: '<svg viewBox="0 0 32 32" fill="none" aria-hidden="true"><path d="M17 5c4 2.2 7 6.6 7 11.8L19.7 21 16 27l-3.7-6L8 16.8C8 11.6 11 7.2 15 5h2Z" stroke="currentColor" stroke-width="2" stroke-linejoin="round"/><circle cx="16" cy="14" r="2.6" stroke="currentColor" stroke-width="2"/><path d="m11 20-3 2v4l5-2M21 20l3 2v4l-5-2" stroke="currentColor" stroke-width="2" stroke-linejoin="round"/></svg>',
    },
  ];
  const copy = {
    zh: {
      backToGames: '返回游戏管理', createGame: '创建游戏', basicInformation: '基本信息',
      projectName: '后台项目名称', projectNamePlaceholder: '例如：海洋远征',
      gameTypes: '游戏类型', selectGameTypes: '请选择游戏类型',
      relationship: '当前主体与该游戏的关系', select: '请选择', developerName: '开发商名称',
      optional: '选填', developerPlaceholder: '请输入游戏开发商名称', platforms: '发布平台',
      releasePlan: '当前发布计划', back: '返回', creating: '正在创建…',
      relationships: { developer: '开发商', publisher: '发行商', developer_publisher: '开发商和发行商' },
      genres: Object.fromEntries(genres.map(genre => [genre, genre])),
      plans: Object.fromEntries(releasePlans.map(plan => [plan.id, { title: plan.title, description: plan.description }])),
      errors: {
        projectNameRequired: '请填写后台项目名称。', projectNameTooLong: '后台项目名称最多输入 100 个字符。',
        genresRequired: '请至少选择一个游戏类型。', relationshipRequired: '请选择当前主体与该游戏的关系。',
        platformsRequired: '请至少选择一个发布平台。', releasePlanRequired: '请选择当前发布计划。',
        submitFailed: '创建失败，请重试。已填写的内容已保留。',
      },
    },
    en: {
      backToGames: 'Back to game management', createGame: 'Create game', basicInformation: 'Basic information',
      projectName: 'Project name', projectNamePlaceholder: 'For example: Ocean Expedition',
      gameTypes: 'Game types', selectGameTypes: 'Select game types',
      relationship: 'Your relationship to this game', select: 'Select', developerName: 'Developer name',
      optional: 'Optional', developerPlaceholder: 'Enter the game developer name', platforms: 'Release platforms',
      releasePlan: 'Current release plan', back: 'Back', creating: 'Creating…',
      relationships: { developer: 'Developer', publisher: 'Publisher', developer_publisher: 'Developer and publisher' },
      genres: { '角色扮演': 'Role-playing', '休闲': 'Casual', '动作': 'Action', '策略': 'Strategy', '模拟': 'Simulation', '益智': 'Puzzle', '街机': 'Arcade', '冒险': 'Adventure' },
      plans: {
        reservation: { title: 'Open pre-registration first', description: 'The game is in development. Set up its store page and pre-registration.' },
        test: { title: 'Run a playtest first', description: 'Recruit players to try the game and test gameplay and stability.' },
        launch: { title: 'Get ready to launch', description: 'A release build is ready. Prepare the store details and launch.' },
      },
      errors: {
        projectNameRequired: 'Enter the project name.', projectNameTooLong: 'The project name must be 100 characters or fewer.',
        genresRequired: 'Select at least one game type.', relationshipRequired: 'Select your relationship to this game.',
        platformsRequired: 'Select at least one release platform.', releasePlanRequired: 'Select the current release plan.',
        submitFailed: 'Could not create the game. Try again. Your entries have been kept.',
      },
    },
  };
  const legacyErrors = Object.fromEntries(Object.entries(copy.zh.errors).map(([code, message]) => [message, code]));
  legacyErrors['请填写游戏名称。'] = 'projectNameRequired';
  legacyErrors['游戏名称最多输入 100 个字符。'] = 'projectNameTooLong';
  const errorText = (error, text) => text.errors[error] || text.errors[legacyErrors[error]] || error || '';
  const runtime = new WeakMap();
  const escape = value => String(value == null ? '' : value).replace(/[&<>"']/g, char => ({ '&': '&amp;', '<': '&lt;', '>': '&gt;', '"': '&quot;', "'": '&#39;' }[char]));
  const backIcon = '<svg viewBox="0 0 20 20" fill="none" aria-hidden="true"><path d="m11.5 5-5 5 5 5M7 10h9" stroke="currentColor" stroke-width="1.6" stroke-linecap="round" stroke-linejoin="round"/></svg>';
  const chevronIcon = '<svg viewBox="0 0 20 20" fill="none" aria-hidden="true"><path d="m6 8 4 4 4-4" stroke="currentColor" stroke-width="1.6" stroke-linecap="round" stroke-linejoin="round"/></svg>';
  const requiredMark = '<span class="pgc-required" aria-hidden="true">*</span>';
  const fieldError = (draft, key, text) => `<p class="pgc-error" id="create-error-${escape(key)}" data-create-error="${escape(key)}"${draft.errors[key] ? ' role="alert"' : ' hidden'}>${escape(errorText(draft.errors[key], text))}</p>`;
  const invalid = (draft, key) => ` aria-invalid="${Boolean(draft.errors[key])}" aria-describedby="create-error-${escape(key)}"`;

  function createDraft() {
    return {
      projectName: '',
      genres: [],
      relationship: '',
      developerName: '',
      platforms: ['Windows'],
      releasePlan: '',
      genreOpen: false,
      errors: {},
      submitting: false,
    };
  }

  function validate(draft) {
    const errors = {};
    const name = String(draft.projectName || '').trim();
    if (!name) errors.projectName = 'projectNameRequired';
    else if (name.length > 100) errors.projectName = 'projectNameTooLong';
    if (!Array.isArray(draft.genres) || !draft.genres.length || draft.genres.some(genre => !genres.includes(genre))) errors.genres = 'genresRequired';
    if (!relationships.some(item => item.id === draft.relationship)) errors.relationship = 'relationshipRequired';
    if (!Array.isArray(draft.platforms) || !draft.platforms.length || draft.platforms.some(platform => !platforms.includes(platform))) errors.platforms = 'platformsRequired';
    if (!releasePlans.some(plan => plan.id === draft.releasePlan)) errors.releasePlan = 'releasePlanRequired';
    return errors;
  }

  function renderGenres(draft, text) {
    const selected = draft.genres.map(genre => `<span>${escape(text.genres[genre] || genre)}</span>`).join('');
    return `<div class="pgc-field pgc-field--wide"><span class="pgc-field-label" id="create-genres-label">${text.gameTypes} ${requiredMark}</span><div class="pgc-multiselect${draft.genreOpen ? ' is-open' : ''}" data-create-genre-box><button type="button" class="pgc-multiselect__trigger" aria-labelledby="create-genres-label" aria-controls="create-genres-menu" aria-haspopup="true" aria-expanded="${draft.genreOpen}" data-create-genre-toggle${invalid(draft, 'genres')}><span class="pgc-multiselect__value${selected ? '' : ' is-placeholder'}">${selected || text.selectGameTypes}</span>${chevronIcon}</button>${draft.genreOpen ? `<div class="pgc-multiselect__menu" id="create-genres-menu" role="group" aria-labelledby="create-genres-label">${genres.map((genre, index) => `<label><input type="checkbox" value="${escape(genre)}" data-create-genre-option="${index}"${draft.genres.includes(genre) ? ' checked' : ''}><span>${escape(text.genres[genre])}</span></label>`).join('')}</div>` : ''}</div>${fieldError(draft, 'genres', text)}</div>`;
  }

  function render(draft, language = 'zh') {
    const text = copy[language === 'en' ? 'en' : 'zh'];
    return `<section class="publisher-game-create" data-publisher-create>
      <header class="pgc-page-header"><button type="button" class="pgc-back" data-create-close${draft.submitting ? ' disabled' : ''}>${backIcon}<span>${text.backToGames}</span></button><h1>${text.createGame}</h1></header>
      <form class="pgc-form" novalidate data-create-form aria-busy="${draft.submitting}">
        <fieldset class="pgc-form-fields"${draft.submitting ? ' disabled' : ''}>
          <section class="pgc-card"><h2>${text.basicInformation}</h2><div class="pgc-basic-grid">
            <div class="pgc-field pgc-field--wide"><label for="create-project-name">${text.projectName} ${requiredMark}</label><input id="create-project-name" type="text" value="${escape(draft.projectName)}" placeholder="${text.projectNamePlaceholder}" maxlength="100" autocomplete="off" required data-create-project-name${invalid(draft, 'projectName')}>${fieldError(draft, 'projectName', text)}</div>
            ${renderGenres(draft, text)}
            <div class="pgc-field${draft.relationship === 'publisher' ? '' : ' pgc-field--wide'}"><label for="create-relationship">${text.relationship} ${requiredMark}</label><select id="create-relationship" aria-label="${text.relationship}" data-create-relationship required${invalid(draft, 'relationship')}><option value="">${text.select}</option>${relationships.map(item => `<option value="${item.id}"${draft.relationship === item.id ? ' selected' : ''}>${escape(text.relationships[item.id])}</option>`).join('')}</select>${fieldError(draft, 'relationship', text)}</div>
            ${draft.relationship === 'publisher' ? `<div class="pgc-field" data-create-developer-field><label for="create-developer-name">${text.developerName} <span class="pgc-optional">${text.optional}</span></label><input id="create-developer-name" type="text" value="${escape(draft.developerName)}" placeholder="${text.developerPlaceholder}" maxlength="100" autocomplete="off" data-create-developer-name></div>` : ''}
            <fieldset class="pgc-platform-field pgc-field--wide" aria-label="${text.platforms}"${invalid(draft, 'platforms')}><legend>${text.platforms} ${requiredMark}</legend><div class="pgc-choice-row">${platforms.map(platform => `<label><input type="checkbox" name="createPlatforms" value="${platform}" data-create-platform${draft.platforms.includes(platform) ? ' checked' : ''}><span>${platform}</span></label>`).join('')}</div>${fieldError(draft, 'platforms', text)}</fieldset>
          </div></section>
          <section class="pgc-card"><h2>${text.releasePlan} ${requiredMark}</h2><div class="pgc-plan-grid" role="radiogroup" aria-label="${text.releasePlan}">${releasePlans.map((plan, index) => `<label class="pgc-plan-card pgc-plan-card--${plan.id}${draft.releasePlan === plan.id ? ' is-selected' : ''}"><input type="radio" name="releasePlan" value="${plan.id}" data-create-release-plan="${plan.id}"${draft.releasePlan === plan.id ? ' checked' : ''}${index === 0 ? invalid(draft, 'releasePlan') : ''}><span class="pgc-plan-copy"><strong>${escape(text.plans[plan.id].title)}</strong><small>${escape(text.plans[plan.id].description)}</small></span><span class="pgc-plan-icon">${plan.icon}</span></label>`).join('')}</div>${fieldError(draft, 'releasePlan', text)}</section>
          <footer class="pgc-form-footer"><div><button type="button" class="pgc-button" data-create-close>${text.back}</button><button type="submit" class="pgc-button pgc-button--primary" data-create-submit>${draft.submitting ? text.creating : text.createGame}</button></div></footer>
          ${fieldError(draft, 'submit', text)}
        </fieldset>
      </form>
    </section>`;
  }

  function bind(container, { draft, language = 'zh', onChange = () => {}, onSubmit = () => {}, onClose = () => {} }) {
    const root = container.matches('[data-publisher-create]') ? container : container.querySelector('[data-publisher-create]');
    if (!root) return;
    let state = runtime.get(draft);
    if (!state) {
      state = { root, focus: null };
      runtime.set(draft, state);
    }
    state.root = root;
    function capturePosition(selector) {
      const scrollers = [];
      let depth = 0;
      for (let node = state.root; node; node = node.parentElement, depth += 1) {
        if (node === document.scrollingElement) continue;
        const style = getComputedStyle(node);
        if (/(auto|scroll|overlay)/.test(style.overflowX + style.overflowY) || node.scrollTop || node.scrollLeft) scrollers.push({ depth, top: node.scrollTop, left: node.scrollLeft });
      }
      const anchor = selector ? state.root.querySelector(selector) : null;
      return { scrollers, windowX: scrollX, windowY: scrollY, anchorTop: anchor?.getBoundingClientRect().top, menuTop: state.root.querySelector('.pgc-multiselect__menu')?.scrollTop || 0 };
    }
    function restorePosition(snapshot, selector) {
      const restored = [];
      snapshot.scrollers.forEach(position => {
        let node = root;
        for (let depth = 0; depth < position.depth && node; depth += 1) node = node.parentElement;
        if (node) { node.scrollTo({ top: position.top, left: position.left, behavior: 'instant' }); restored.push(node); }
      });
      window.scrollTo({ left: snapshot.windowX, top: snapshot.windowY, behavior: 'instant' });
      const menu = root.querySelector('.pgc-multiselect__menu');
      if (menu) menu.scrollTop = snapshot.menuTop;
      const anchor = selector ? root.querySelector(selector) : null;
      if (anchor) {
        if (Number.isFinite(snapshot.anchorTop)) {
          const delta = anchor.getBoundingClientRect().top - snapshot.anchorTop;
          const scroller = restored.find(node => node.scrollHeight > node.clientHeight);
          if (Math.abs(delta) > 1 && scroller) scroller.scrollTop += delta;
        }
        anchor.focus({ preventScroll: true });
      }
    }
    const rerender = (selector, navigate = false) => {
      const active = document.activeElement;
      state.focus = selector || (root.contains(active) && active.id ? `#${CSS.escape(active.id)}` : null);
      state.navigate = navigate;
      state.position = navigate ? null : capturePosition(state.focus);
      onChange();
    };
    state.rerender = rerender;
    if (!state.documentHandlersBound) {
      state.documentHandlersBound = true;
      document.addEventListener('click', event => {
        const clickedInsideGenre = event.composedPath().some(node => node?.hasAttribute?.('data-create-genre-box'));
        if (!draft.genreOpen || !state.root?.isConnected || clickedInsideGenre) return;
        draft.genreOpen = false;
        // Closing the menu must not replace a label before its native click selects a radio.
        state.root.querySelector('.pgc-multiselect__menu')?.remove();
        state.root.querySelector('[data-create-genre-box]')?.classList.remove('is-open');
        state.root.querySelector('[data-create-genre-toggle]')?.setAttribute('aria-expanded', 'false');
      });
      document.addEventListener('keydown', event => {
        if (event.key !== 'Escape' || !draft.genreOpen || !state.root?.isConnected) return;
        event.preventDefault();
        draft.genreOpen = false;
        state.rerender('[data-create-genre-toggle]');
      });
    }
    if (root.__publisherCreateBound) return;
    root.__publisherCreateBound = true;
    const clearError = key => {
      delete draft.errors[key];
      const error = root.querySelector(`[data-create-error="${key}"]`);
      if (error) { error.hidden = true; error.textContent = ''; error.removeAttribute('role'); }
      root.querySelectorAll(`[aria-describedby="create-error-${key}"]`).forEach(control => control.setAttribute('aria-invalid', 'false'));
    };

    root.querySelectorAll('[data-create-close]').forEach(button => button.addEventListener('click', () => {
      if (!draft.submitting) onClose();
    }));
    root.querySelector('[data-create-project-name]').addEventListener('input', event => {
      draft.projectName = event.target.value;
      clearError('projectName');
    });
    root.querySelector('[data-create-genre-toggle]').addEventListener('click', () => {
      draft.genreOpen = !draft.genreOpen;
      rerender('[data-create-genre-toggle]');
    });
    root.querySelectorAll('[data-create-genre-option]').forEach(input => input.addEventListener('change', event => {
      draft.genres = Array.from(root.querySelectorAll('[data-create-genre-option]:checked'), item => item.value);
      draft.genreOpen = true;
      clearError('genres');
      rerender(`[data-create-genre-option="${event.target.dataset.createGenreOption}"]`);
    }));
    root.querySelector('[data-create-relationship]').addEventListener('change', event => {
      draft.relationship = event.target.value;
      draft.genreOpen = false;
      clearError('relationship');
      rerender('[data-create-relationship]');
    });
    root.querySelector('[data-create-developer-name]')?.addEventListener('input', event => {
      draft.developerName = event.target.value;
    });
    root.querySelectorAll('[data-create-platform]').forEach(input => input.addEventListener('change', () => {
      draft.platforms = Array.from(root.querySelectorAll('[data-create-platform]:checked'), item => item.value);
      clearError('platforms');
    }));
    root.querySelectorAll('[data-create-release-plan]').forEach(input => input.addEventListener('change', event => {
      draft.releasePlan = event.target.value;
      draft.genreOpen = false;
      clearError('releasePlan');
      root.querySelectorAll('.pgc-plan-card').forEach(card => card.classList.toggle('is-selected', card.querySelector('[data-create-release-plan]').value === draft.releasePlan));
    }));

    root.querySelector('[data-create-form]').addEventListener('submit', async event => {
      event.preventDefault();
      if (draft.submitting) return;
      draft.genreOpen = false;
      draft.projectName = String(draft.projectName || '').trim();
      draft.errors = validate(draft);
      const firstError = Object.keys(draft.errors)[0];
      if (firstError) {
        const selectors = {
          projectName: '[data-create-project-name]',
          genres: '[data-create-genre-toggle]',
          relationship: '[data-create-relationship]',
          platforms: '[data-create-platform]',
          releasePlan: '[data-create-release-plan]',
        };
        rerender(selectors[firstError], true);
        return;
      }
      draft.submitting = true;
      rerender();
      try { await onSubmit(draft); }
      catch (_) {
        draft.submitting = false;
        draft.errors.submit = 'submitFailed';
        rerender('[data-create-submit]');
      }
    });

    const focus = state.focus;
    const position = state.position;
    const navigate = state.navigate;
    state.focus = null;
    state.position = null;
    state.navigate = false;
    if (position) restorePosition(position, focus);
    else if (focus) {
      const control = root.querySelector(focus);
      if (control) { control.focus({ preventScroll: true }); if (navigate) (control.closest('.pgc-plan-card') || control).scrollIntoView({ block: 'center', behavior: 'instant' }); }
    }
  }

  window.PublisherGameCreate = { createDraft, render, bind, validate };
})();
