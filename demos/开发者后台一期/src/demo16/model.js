window.PublisherFinanceOperationsModel = (() => {
  'use strict';
  const statements = window.PublisherSettlementStatements;
  if (!statements) return null;

  const createState = () => ({
    statementState:statements.createState(),
    scenario:'exhaustive',
    demoOpen:false,
    activeTab:'entity',
    filters:{
      entity:{ keyword:'', billingMonth:'2026-08', status:'all' },
      game:{ keyword:'', billingMonth:'all', settlementMonth:'all', gameId:'all', itemType:'all', status:'all' },
    },
    pages:{ entity:1, game:1 },
    selected:{ entity:[], game:[] },
    detailStatementId:'',
    tierEditorOpen:false,
    tierDateOpen:false,
    tierDateDraft:null,
    tierDatePreset:'',
    tierCalendarLeftMonth:'',
    tierDateAnchor:null,
    tierError:'',
    tierMessage:'',
    exportMessage:'',
  });

  const entityRows = state => {
    if (state.scenario === 'empty') return [];
    const filters = state.filters.entity || {};
    return statements.entitySummariesFor(state.statementState, {
      keyword:filters.keyword,
      billingMonth:filters.billingMonth,
    }).filter(row => !filters.status || filters.status === 'all' || row.status === filters.status);
  };
  const gameRows = state => state.scenario === 'empty' ? [] : statements.statementsFor(state.statementState,state.filters.game);
  const allGameRows = state => statements.statementsFor(state.statementState);
  const exportEntityCsv = rows => statements.exportEntitySummariesCsv(rows);
  const exportGameCsv = rows => statements.exportStatementsCsv(rows || [],{ includeDeveloper:true,includeFxVersion:true });

  return Object.freeze({ createState,entityRows,gameRows,allGameRows,exportEntityCsv,exportGameCsv,statements });
})();
