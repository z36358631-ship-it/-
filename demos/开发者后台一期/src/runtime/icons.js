window.GameHubDeveloperPortal = window.GameHubDeveloperPortal || {};

(function registerIcons(namespace) {
  const paths = {
    logo: '<path d="M5 7.5 12 3l7 4.5v9L12 21l-7-4.5z"/><path d="m8.2 10 3.8-2.2 3.8 2.2v4L12 16.2 8.2 14z"/>',
    home: '<path d="m3 11 9-8 9 8"/><path d="M5.5 9.5V21h13V9.5M9 21v-7h6v7"/>',
    build: '<path d="M4 4h16v5H4zM4 15h16v5H4z"/><path d="M8 9v6m8-6v6"/>',
    key: '<circle cx="8" cy="15" r="4"/><path d="m11 12 8-8m-3 3 3 3m-6 0 2 2"/>',
    target: '<circle cx="12" cy="12" r="8"/><circle cx="12" cy="12" r="3"/><path d="M12 2v3m0 14v3M2 12h3m14 0h3"/>',
    chart: '<path d="M4 20V10m6 10V4m6 16v-7m4 7H2"/>',
    game: '<path d="M7 8h10a5 5 0 0 1 4.6 7l-1 2.4a2.5 2.5 0 0 1-4.1.8L15 16h-6l-1.5 2.2a2.5 2.5 0 0 1-4.1-.8L2.4 15A5 5 0 0 1 7 8Z"/><path d="M7 11v4m-2-2h4m7-1h.01m2 3h.01"/>',
    vendor: '<path d="M4 21V7l8-4 8 4v14M8 10h2m4 0h2M8 14h2m4 0h2M9 21v-3h6v3"/>',
    review: '<path d="M5 3h14v18H5z"/><path d="M8 8h8m-8 4h5m-5 4h4"/>',
    test: '<path d="M9 3h6m-5 0v5l-5.5 9a2.5 2.5 0 0 0 2.1 4h10.8a2.5 2.5 0 0 0 2.1-4L14 8V3"/><path d="M7.5 16h9"/>',
    publish: '<path d="M12 16V3m0 0 5 5m-5-5L7 8"/><path d="M5 13v8h14v-8"/>',
    warning: '<path d="M12 3 2.8 20h18.4z"/><path d="M12 9v5m0 3h.01"/>',
    chevron: '<path d="m9 18 6-6-6-6"/>',
    search: '<circle cx="11" cy="11" r="7"/><path d="m20 20-4-4"/>',
    refresh: '<path d="M20 7v5h-5M4 17v-5h5"/><path d="M6.1 8A7 7 0 0 1 19 12m-1.1 4A7 7 0 0 1 5 12"/>',
    user: '<circle cx="12" cy="8" r="4"/><path d="M4 21a8 8 0 0 1 16 0"/>',
    upload: '<path d="M12 16V4m0 0 5 5m-5-5L7 9"/><path d="M4 15v5h16v-5"/>',
    check: '<path d="m5 12 4 4L19 6"/>',
    lock: '<rect x="5" y="10" width="14" height="11" rx="2"/><path d="M8 10V7a4 4 0 0 1 8 0v3"/>',
    file: '<path d="M6 3h8l4 4v14H6z"/><path d="M14 3v5h5M9 13h6m-6 4h6"/>',
    clock: '<circle cx="12" cy="12" r="9"/><path d="M12 7v5l3 2"/>',
    info: '<circle cx="12" cy="12" r="9"/><path d="M12 11v6m0-10h.01"/>',
  };

  namespace.icons = {
    has(name) { return Object.prototype.hasOwnProperty.call(paths, name); },
    render(name, className = 'gh-icon') {
      const body = paths[name] || paths.info;
      return `<svg class="${className}" aria-hidden="true" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="1.7" stroke-linecap="round" stroke-linejoin="round">${body}</svg>`;
    },
  };
})(window.GameHubDeveloperPortal);
