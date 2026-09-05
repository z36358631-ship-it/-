(function exposeNextDemoContext(global) {
  const STORAGE_KEY = 'gamehub.developer.next.v1';
  const seed = {
    schema_version: 1,
    vendor_id: 'VENDOR-202609-001',
    vendor_name: '星海互动科技有限公司',
    game_id: 'GAME-48291',
    app_id: 'APP-7F3A9C',
    game_name_zh: '星海远征',
    game_name_en: 'Ocean Expedition',
    first_build_uploaded: true,
    build_id: 'BUILD-20260904.3',
    qualification_status: 'unsubmitted',
    qualification_version: null,
    profile_status: 'draft',
    profile_version: 'PROFILE-001',
    release_scope_status: 'draft',
    release_scope_version: 'SCOPE-001',
    contract_status: 'effective',
    contract_version: 'CONTRACT-20260901-001',
    contract_valid_to: '2027-08-31',
    credential_status: 'active',
    messages: [],
    announcements: [],
    resources: [],
  };

  const clone = value => JSON.parse(JSON.stringify(value));
  const read = () => {
    try {
      const saved = JSON.parse(localStorage.getItem(STORAGE_KEY) || '{}');
      return { ...clone(seed), ...saved };
    } catch {
      return clone(seed);
    }
  };
  const write = next => {
    const value = { ...read(), ...clone(next) };
    try { localStorage.setItem(STORAGE_KEY, JSON.stringify(value)); } catch {}
    return value;
  };
  const emitEvent = event => {
    const current = read();
    const messages = [{
      event_id: event.event_id || `EVENT-${Date.now()}`,
      event_source: event.event_source,
      entity_id: event.entity_id,
      event_type: event.event_type,
      event_status: event.event_status,
      event_time: event.event_time || new Date().toISOString(),
      deep_link: event.deep_link || '',
      title_zh: event.title_zh,
      title_en: event.title_en,
      body_zh: event.body_zh || '',
      body_en: event.body_en || '',
      reason: event.reason || '',
      read: false,
    }, ...(current.messages || [])];
    return write({ messages });
  };
  const reset = () => {
    try { localStorage.removeItem(STORAGE_KEY); } catch {}
    return read();
  };

  global.GHNextDemoContext = { STORAGE_KEY, seed: clone(seed), read, write, emitEvent, reset };
})(window);
