window.PublisherFinanceOperationsModel = (() => {
  'use strict';
  const ledger = window.PublisherSettlementLedger;
  if (!ledger) return null;

  const createState = () => ({
    ledgerState:ledger.createState(),
    scenario:'exhaustive',
    demoOpen:false,
    activeTab:'entity',
    filters:{
      entity:{ keyword:'', month:'2026-08', currency:'all' },
      game:{ keyword:'', month:'2026-08', currency:'all', provider:'all', entityVersion:'all', accountVersion:'all', linked:false },
    },
    pages:{ entity:1, game:1 },
    selected:{ entity:[], game:[] },
    detailGameKey:'',
    exportMessage:'',
  });

  const entityRows = state => state.scenario === 'empty' ? [] : ledger.entityRowsFor(state.ledgerState,state.filters.entity);
  const gameRows = state => state.scenario === 'empty' ? [] : ledger.gameRowsFor(state.ledgerState,state.filters.game);
  const transactionRows = (state, game) => game ? ledger.transactionsFor(state.ledgerState, {
    month:game.month, entityVersion:game.entityVersion, accountVersion:game.accountVersion,
    currency:game.settlementCurrency, gameId:game.gameId,
  }) : [];
  const markExported = (state, rows) => ledger.markEntityExported(state.ledgerState, rows.map(row => row.key));

  return Object.freeze({ createState, entityRows, gameRows, transactionRows, markExported, ledger, money:ledger.money });
})();
