/* 开发者与运营共用的不可变结算账本快照。 */
window.PublisherSettlementLedger = (() => {
  'use strict';

  const clone = value => JSON.parse(JSON.stringify(value));
  const deepFreeze = value => {
    if (!value || typeof value !== 'object' || Object.isFrozen(value)) return value;
    Object.values(value).forEach(deepFreeze);
    return Object.freeze(value);
  };
  const pad = value => String(value).padStart(2, '0');
  const decimal = minor => (Number(minor || 0) / 100).toFixed(2);
  const money = (minor, currency = 'USD') => `${currency} ${(Number(minor || 0) / 100).toLocaleString('zh-CN', { minimumFractionDigits:2, maximumFractionDigits:2 })}`;
  const entityKey = row => [row.month, row.entityVersion, row.settlementCurrency, row.accountVersion].join('::');
  const gameKey = row => [entityKey(row), row.gameId].join('::');

  const entities = Object.freeze({
    'FIN-2026-003': Object.freeze({
      developer:'星海互动', entityName:'星海互动科技有限公司', entityVersion:'FIN-2026-003', accountVersion:'ACC-HK-2026-003',
      bankName:'汇丰银行（香港）有限公司', accountMasked:'**** 7826', accountFull:'0848019237826', swift:'HSBCHKHHHKH',
      settlementCurrency:'USD', settlementRuleVersion:'RULE-2026-02', platformShareRuleVersion:'SHARE-2026-02', taxResidence:'中国大陆',
    }),
    'FIN-2026-004': Object.freeze({
      developer:'星海互动', entityName:'星海互动科技有限公司', entityVersion:'FIN-2026-004', accountVersion:'ACC-SG-2026-001',
      bankName:'星展银行新加坡总行', accountMasked:'**** 3188', accountFull:'001920003188', swift:'DBSSSGSG',
      settlementCurrency:'USD', settlementRuleVersion:'RULE-2026-03', platformShareRuleVersion:'SHARE-2026-02', taxResidence:'新加坡',
    }),
    'FIN-2026-006-USD': Object.freeze({
      developer:'远光工作室', entityName:'远光网络科技有限公司', entityVersion:'FIN-2026-006', accountVersion:'ACC-HK-2026-006',
      bankName:'中国银行（香港）有限公司', accountMasked:'**** 9066', accountFull:'012875009066', swift:'BKCHHKHH',
      settlementCurrency:'USD', settlementRuleVersion:'RULE-2026-02', platformShareRuleVersion:'SHARE-2026-03', taxResidence:'中国大陆',
    }),
    'FIN-2026-006-CNY': Object.freeze({
      developer:'远光工作室', entityName:'远光网络科技有限公司', entityVersion:'FIN-2026-006', accountVersion:'ACC-CN-2026-002',
      bankName:'中国银行广州天河支行', accountMasked:'**** 9066', accountFull:'60138200001909066', swift:'BKCHCNBJ400',
      settlementCurrency:'CNY', settlementRuleVersion:'RULE-2026-02', platformShareRuleVersion:'SHARE-2026-03', taxResidence:'中国大陆',
    }),
  });

  const gameNames = Object.freeze([
    '星海远征','暗影重构','风暴边境','机械黎明','荒野余烬','霓虹突围','深空遗迹','迷雾航线',
    '终焉回响','极昼计划','钢铁纪元','边境旅人','时序裂痕','孤岛信标','群星守望','赤潮前线',
    '灵境回廊','零号协议','无尽轨道','晨曦远征','幻海之歌','失落方舟','苍穹之门','像素工坊',
  ]);
  const regions = Object.freeze([
    { buyerRegion:'德国', salesTaxType:'VAT', salesTaxRate:0.19, originalCurrency:'EUR', fxRate:1.0874 },
    { buyerRegion:'英国', salesTaxType:'VAT', salesTaxRate:0.20, originalCurrency:'GBP', fxRate:1.2718 },
    { buyerRegion:'新加坡', salesTaxType:'GST', salesTaxRate:0.09, originalCurrency:'SGD', fxRate:0.7421 },
    { buyerRegion:'美国·加利福尼亚州', salesTaxType:'Sales Tax', salesTaxRate:0.0725, originalCurrency:'USD', fxRate:1 },
    { buyerRegion:'日本', salesTaxType:'Consumption Tax', salesTaxRate:0.10, originalCurrency:'JPY', fxRate:0.0068 },
    { buyerRegion:'澳大利亚', salesTaxType:'GST', salesTaxRate:0.10, originalCurrency:'AUD', fxRate:0.6532 },
  ]);

  const event = (base, values) => deepFreeze({
    eventId:'', eventType:'payment', orderId:'', originalPaymentEventId:'', providerEventId:'', idempotencyKey:'',
    occurredAt:'', bookedAt:'', month:'', gameId:'', gameName:'', developer:'', entityName:'', entityVersion:'', accountVersion:'',
    bankName:'', accountMasked:'', accountFull:'', swift:'', settlementRuleVersion:'', platformShareRuleVersion:'', taxResidence:'',
    provider:'第三方支付商', buyerRegion:'', originalCurrency:'USD', originalAmountMinor:0, settlementCurrency:'USD',
    paidMinor:0, refundMinor:0, chargebackMinor:0, salesTaxType:'—', salesTaxRate:0, salesTaxMinor:0,
    providerFeeMinor:0, fxRate:1, fxVersion:'FX-2026-08-LOCKED', providerNetMinor:0,
    platformShareMinor:0, withholdingTaxRate:0, withholdingTaxMinor:0, payableMinor:0,
    ...base,
    ...values,
  });

  const createGameEvents = ({ month, index, entity }) => {
    const region = regions[index % regions.length];
    const currencyScale = entity.settlementCurrency === 'CNY' ? 7 : 1;
    const paidMinor = (420000 + index * 17300 + Number(month.slice(-2)) * 1900) * currencyScale;
    const salesTaxMinor = Math.round(paidMinor * region.salesTaxRate / (1 + region.salesTaxRate));
    const providerFeeMinor = Math.round(paidMinor * 0.029) + 30 * currencyScale;
    const platformShareMinor = Math.round((paidMinor - salesTaxMinor) * (entity.developer === '星海互动' ? 0.15 : 0.18));
    const withholdingTaxRate = entity.taxResidence === '中国大陆' && entity.settlementCurrency === 'USD' ? 0.10 : 0;
    const withholdingTaxMinor = Math.round((paidMinor - salesTaxMinor - providerFeeMinor - platformShareMinor) * withholdingTaxRate);
    const payableMinor = paidMinor - salesTaxMinor - providerFeeMinor - platformShareMinor - withholdingTaxMinor;
    const gameIndex = index % gameNames.length;
    const gameId = `GAME-${String(48291 + gameIndex).padStart(5, '0')}`;
    const sequence = `${month.replace('-', '')}-${pad(index + 1)}`;
    const common = {
      month, gameId, gameName:gameNames[gameIndex], ...entity, buyerRegion:region.buyerRegion,
      originalCurrency:region.originalCurrency, settlementCurrency:entity.settlementCurrency,
      fxRate:entity.settlementCurrency === 'CNY' && region.originalCurrency !== 'CNY' ? Number((region.fxRate * 7.12).toFixed(4)) : region.fxRate,
      fxVersion:`FX-${month}-LOCKED`, salesTaxType:region.salesTaxType, salesTaxRate:region.salesTaxRate,
    };
    const paymentId = `EVT-PAY-${sequence}`;
    const originalAmountMinor = Math.round(paidMinor / Math.max(common.fxRate, 0.0001));
    const rows = [event(common, {
      eventId:paymentId, eventType:'payment', orderId:`ORD-${sequence}`, providerEventId:`PSP-P-${sequence}`,
      idempotencyKey:`PAY-${sequence}-V1`, occurredAt:`${month}-${pad(5 + index % 20)} 10:${pad(index % 60)}`,
      bookedAt:`${month}-${pad(6 + index % 20)} 09:${pad((index + 7) % 60)}`, originalAmountMinor,
      paidMinor, salesTaxMinor, providerFeeMinor, providerNetMinor:paidMinor - salesTaxMinor - providerFeeMinor,
      platformShareMinor, withholdingTaxRate, withholdingTaxMinor, payableMinor,
    })];
    if (index % 3 === 0) {
      const refundMinor = Math.round(paidMinor * 0.025);
      rows.push(event(common, {
        eventId:`EVT-REF-${sequence}`, eventType:'refund', orderId:`ORD-${sequence}`, originalPaymentEventId:paymentId,
        providerEventId:`PSP-R-${sequence}`, idempotencyKey:`REF-${sequence}-V1`, occurredAt:`${month}-${pad(23 + index % 4)} 12:10`,
        bookedAt:`${month}-${pad(24 + index % 4)} 08:40`, originalAmountMinor:Math.round(refundMinor / Math.max(common.fxRate, 0.0001)),
        refundMinor, salesTaxRate:0, salesTaxMinor:0, providerNetMinor:-refundMinor, payableMinor:-refundMinor,
      }));
    }
    if (index % 7 === 0) {
      const chargebackMinor = Math.round(paidMinor * 0.012);
      rows.push(event(common, {
        eventId:`EVT-CBK-${sequence}`, eventType:'chargeback', orderId:`ORD-${sequence}`, originalPaymentEventId:paymentId,
        providerEventId:`PSP-C-${sequence}`, idempotencyKey:`CBK-${sequence}-V1`, occurredAt:`${month}-${pad(26 + index % 2)} 14:30`,
        bookedAt:`${month}-${pad(27 + index % 2)} 09:20`, originalAmountMinor:Math.round(chargebackMinor / Math.max(common.fxRate, 0.0001)),
        chargebackMinor, salesTaxRate:0, salesTaxMinor:0, providerNetMinor:-chargebackMinor, payableMinor:-chargebackMinor,
      }));
    }
    return rows;
  };

  const groupFor = index => index < 12 ? entities['FIN-2026-003']
    : index < 16 ? entities['FIN-2026-004']
      : index < 20 ? entities['FIN-2026-006-USD'] : entities['FIN-2026-006-CNY'];
  const eventSeeds = deepFreeze(['2026-08','2026-07','2026-06'].flatMap((month, monthIndex) => {
    const count = monthIndex === 0 ? 24 : 12;
    return Array.from({ length:count }, (_, index) => createGameEvents({ month, index:index + monthIndex, entity:groupFor(index) })).flat();
  }));
  const exportSeeds = deepFreeze({
    '2026-08::FIN-2026-003::USD::ACC-HK-2026-003': { exportedAt:'2026-09-12 10:28', exportedBy:'平台运营 李然' },
  });

  const createState = () => ({
    snapshotId:'SETTLEMENT-SNAPSHOT-2026-09-14-V1',
    lockedAt:'2026-09-05 11:20',
    events:deepFreeze(clone(eventSeeds)),
    exportHistory:clone(exportSeeds),
  });

  const matches = (row, filters = {}) => {
    if (filters.month && filters.month !== 'all' && row.month !== filters.month) return false;
    if (filters.settlementCurrency && filters.settlementCurrency !== 'all' && row.settlementCurrency !== filters.settlementCurrency) return false;
    if (filters.currency && filters.currency !== 'all' && row.settlementCurrency !== filters.currency) return false;
    if (filters.entityVersion && filters.entityVersion !== 'all' && row.entityVersion !== filters.entityVersion) return false;
    if (filters.accountVersion && filters.accountVersion !== 'all' && row.accountVersion !== filters.accountVersion) return false;
    if (filters.gameId && filters.gameId !== 'all' && row.gameId !== filters.gameId) return false;
    if (filters.developer && filters.developer !== 'all' && row.developer !== filters.developer) return false;
    if (filters.provider && filters.provider !== 'all' && row.provider !== filters.provider) return false;
    const query = String(filters.keyword || '').trim().toLowerCase();
    if (query && !`${row.gameId || ''} ${row.gameName || ''} ${row.developer || ''} ${row.entityName || ''} ${row.entityVersion || ''}`.toLowerCase().includes(query)) return false;
    return true;
  };

  const transactionsFor = (ledgerState, filters = {}) => ledgerState.events
    .filter(row => matches(row, filters))
    .slice()
    .sort((a, b) => b.bookedAt.localeCompare(a.bookedAt) || a.eventId.localeCompare(b.eventId));

  const sumInto = (target, row) => {
    ['paidMinor','refundMinor','chargebackMinor','salesTaxMinor','providerFeeMinor','platformShareMinor','withholdingTaxMinor','payableMinor']
      .forEach(key => { target[key] = (target[key] || 0) + Number(row[key] || 0); });
  };

  const gameRowsFor = (ledgerState, filters = {}) => {
    const map = new Map();
    transactionsFor(ledgerState, filters).forEach(row => {
      const key = gameKey(row);
      if (!map.has(key)) map.set(key, {
        key, entityKey:entityKey(row), month:row.month, gameId:row.gameId, gameName:row.gameName, developer:row.developer,
        entityName:row.entityName, entityVersion:row.entityVersion, accountVersion:row.accountVersion,
        settlementCurrency:row.settlementCurrency, bankName:row.bankName, accountMasked:row.accountMasked,
        accountFull:row.accountFull, swift:row.swift, provider:row.provider, eventCount:0,
      });
      const target = map.get(key);
      target.eventCount += 1;
      sumInto(target, row);
    });
    return [...map.values()].sort((a, b) => b.month.localeCompare(a.month) || a.entityName.localeCompare(b.entityName) || a.gameId.localeCompare(b.gameId));
  };

  const entityRowsFor = (ledgerState, filters = {}) => {
    const map = new Map();
    gameRowsFor(ledgerState, filters).forEach(row => {
      const key = row.entityKey;
      if (!map.has(key)) map.set(key, {
        key, month:row.month, developer:row.developer, entityName:row.entityName, entityVersion:row.entityVersion,
        accountVersion:row.accountVersion, settlementCurrency:row.settlementCurrency, bankName:row.bankName,
        accountMasked:row.accountMasked, accountFull:row.accountFull, swift:row.swift, gameIds:new Set(),
      });
      const target = map.get(key);
      target.gameIds.add(row.gameId);
      sumInto(target, row);
    });
    return [...map.values()].map(row => {
      const recent = ledgerState.exportHistory[row.key] || {};
      return { ...row, gameCount:row.gameIds.size, gameIds:[...row.gameIds], lastExportedAt:recent.exportedAt || '', lastExportedBy:recent.exportedBy || '' };
    }).sort((a, b) => b.month.localeCompare(a.month) || a.entityName.localeCompare(b.entityName) || a.settlementCurrency.localeCompare(b.settlementCurrency));
  };

  const quote = value => `"${String(value ?? '').replaceAll('"', '""')}"`;
  const safeText = value => quote(/^[=+\-@]/.test(String(value ?? '')) ? `'${value}` : value);
  const identifier = value => quote(`\t${String(value ?? '')}`);
  const csv = (headers, rows) => `\uFEFF${[headers.map(safeText).join(','), ...rows].join('\r\n')}`;
  const amountCells = row => [row.paidMinor,row.refundMinor,row.chargebackMinor,row.salesTaxMinor,row.providerFeeMinor,row.platformShareMinor,row.withholdingTaxMinor,row.payableMinor].map(decimal);

  const exportEntityCsv = rows => csv(
    ['结算月','开发者','财务主体','主体版本','账户版本','银行','银行账号','SWIFT/BIC','币种','游戏数','用户实付','退款','拒付','销售税','支付费','平台分成','预扣税','应结算金额'],
    rows.map(row => [safeText(row.month),safeText(row.developer),safeText(row.entityName),identifier(row.entityVersion),identifier(row.accountVersion),safeText(row.bankName),identifier(row.accountFull),safeText(row.swift),safeText(row.settlementCurrency),row.gameCount,...amountCells(row)].join(',')),
  );
  const exportGameCsv = rows => csv(
    ['结算月','Game ID','游戏','开发者','财务主体','主体版本','账户版本','币种','支付商','用户实付','退款','拒付','销售税','支付费','平台分成','预扣税','应结算金额'],
    rows.map(row => [safeText(row.month),identifier(row.gameId),safeText(row.gameName),safeText(row.developer),safeText(row.entityName),identifier(row.entityVersion),identifier(row.accountVersion),safeText(row.settlementCurrency),safeText(row.provider),...amountCells(row)].join(',')),
  );

  const markEntityExported = (ledgerState, keys, details = {}) => {
    const exportedAt = details.exportedAt || '2026-09-14 18:30';
    const exportedBy = details.exportedBy || '平台运营 李然';
    [...new Set(keys)].forEach(key => { ledgerState.exportHistory[key] = { exportedAt, exportedBy }; });
  };

  return Object.freeze({ createState, transactionsFor, gameRowsFor, entityRowsFor, exportEntityCsv, exportGameCsv, markEntityExported, money, decimal, entityKey });
})();
