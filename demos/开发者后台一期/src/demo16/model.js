window.PublisherFinanceOperationsModel = (() => {
  'use strict';
  const ledger = window.PublisherSettlementLedger;
  const statements = window.PublisherSettlementStatements;
  if (!ledger || !statements) return null;
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
    statementState:statements.createState(),
    scenario:'exhaustive',
    demoOpen:false,
    activeTab:'entity',
    filters:{
      entity:{ keyword:'', month:'2026-08', currency:'all' },
      game:{ keyword:'', billingMonth:'all', settlementMonth:'all', gameId:'all', itemType:'all', status:'all' },
    },
    pages:{ entity:1, game:1 },
    selected:{ entity:[], game:[] },
    detailStatementId:'',
    exportMessage:'',
  });

  const entityRows = state => state.scenario === 'empty' ? [] : ledger.entityRowsFor(state.ledgerState,state.filters.entity);
  const gameRows = state => state.scenario === 'empty' ? [] : statements.statementsFor(state.statementState,state.filters.game);
  const allGameRows = state => statements.statementsFor(state.statementState);
  const transactionRows = (state, statement) => {
    if (!statement) return [];
    const itemType = String(statement.itemType || '');
    const eventTypes = itemType.includes('refund') && itemType.includes('chargeback')
      ? new Set(['refund','chargeback'])
      : new Set([itemType.includes('refund') ? 'refund' : (itemType.includes('chargeback') ? 'chargeback' : 'payment')]);
    return ledger.transactionsFor(state.ledgerState, {
      month:statement.billingMonth,
      gameId:statement.gameId,
    }).filter(row => eventTypes.has(row.eventType));
  };
  const markExported = (state, rows) => ledger.markEntityExported(state.ledgerState, rows.map(row => row.key));
  const exportGameCsv = rows => statements.exportStatementsCsv(rows,{ includeDeveloper:true,includeRatioVersion:false });

  return Object.freeze({ createState, entityRows, gameRows, allGameRows, transactionRows, markExported, exportEntityCsv, exportGameCsv, cnyRate, cnyMinor, ledger, statements, money:ledger.money });
})();
