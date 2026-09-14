window.PublisherFinanceOperationsModel = (() => {
  'use strict';
  const ledger = window.PublisherSettlementLedger;
  if (!ledger) return null;
  const lockedUsdCnyRates = Object.freeze({ '2026-08':7.12,'2026-07':7.18,'2026-06':7.16 });
  const cnyRate = row => row.settlementCurrency === 'CNY' ? 1 : (row.settlementCurrency === 'USD' ? lockedUsdCnyRates[row.month] ?? null : null);
  const cnyMinor = row => {
    const rate = cnyRate(row);
    return rate === null ? null : Math.round(Number(row.payableMinor || 0) * rate);
  };
  const exportEntityCsv = rows => ledger.exportEntityCsv(rows).split('\r\n').map((line,index) => {
    if (index === 0) return `${line},"CNY金额","锁定汇率"`;
    const row = rows[index - 1];
    const rate = cnyRate(row);
    const converted = cnyMinor(row);
    return `${line},${converted === null ? '' : ledger.decimal(converted)},${rate === null ? '' : rate.toFixed(4)}`;
  }).join('\r\n');

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

  return Object.freeze({ createState, entityRows, gameRows, transactionRows, markExported, exportEntityCsv, cnyRate, cnyMinor, ledger, money:ledger.money });
})();
