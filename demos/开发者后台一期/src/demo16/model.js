window.PublisherFinanceOperationsModel = (() => {
  const clone = value => JSON.parse(JSON.stringify(value));
  const pad = value => String(value).padStart(2, '0');
  const now = () => '2026-09-14 17:20';
  const money = (minor, currency) => `${currency} ${(Number(minor || 0) / 100).toLocaleString('zh-CN', { minimumFractionDigits:2, maximumFractionDigits:2 })}`;
  const decimal = minor => (Number(minor || 0) / 100).toFixed(2);

  const games = [
    '星海远征','暗影重构','风暴边境','机械黎明','荒野余烬','霓虹突围','深空遗迹','迷雾航线',
    '终焉回响','极昼计划','钢铁纪元','边境旅人','时序裂痕','孤岛信标','群星守望','赤潮前线',
    '灵境回廊','零号协议','无尽轨道','晨曦远征','幻海之歌','失落方舟','苍穹之门','像素工坊',
    '深渊行者','远古纪元','熔岩之心','赛博猎手','云端旅者','月影传说','地下城纪事','星球拓荒者',
  ];

  const accountFor = (entityVersion, currency) => {
    if (entityVersion === 'FIN-2026-006') return currency === 'CNY' ? {
      entityName:'远光网络科技有限公司', bankName:'中国银行广州天河支行', accountMasked:'**** 9066', accountFull:'60138200001909066', swift:'BKCHCNBJ400',
    } : {
      entityName:'远光网络科技有限公司', bankName:'中国银行（香港）有限公司', accountMasked:'**** 9066', accountFull:'012875009066', swift:'BKCHHKHH',
    };
    return currency === 'CNY' ? {
      entityName:'星海互动科技有限公司', bankName:'招商银行深圳科技园支行', accountMasked:'**** 3188', accountFull:'7559000012383188', swift:'CMBCCNBS',
    } : {
      entityName:'星海互动科技有限公司', bankName:'汇丰银行（香港）有限公司', accountMasked:'**** 7826', accountFull:'848019237826', swift:'HSBCHKHHHKH',
    };
  };

  const makeRecord = (index, month) => {
    const entityVersion = index % 4 === 1 ? 'FIN-2026-006' : 'FIN-2026-003';
    const developer = entityVersion === 'FIN-2026-006' ? '远光工作室' : '星海互动';
    const currency = index % 6 === 4 ? 'CNY' : 'USD';
    const grossMinor = (currency === 'CNY' ? 3600000 : 480000) + index * (currency === 'CNY' ? 173000 : 26400);
    const refundMinor = Math.round(grossMinor * (0.018 + (index % 4) * 0.004));
    const platformShareMinor = Math.round((grossMinor - refundMinor) * 0.15);
    const adjustmentMinor = index % 7 === 0 ? (currency === 'CNY' ? 120000 : 18000) : index % 9 === 0 ? -(currency === 'CNY' ? 60000 : 9000) : 0;
    const account = accountFor(entityVersion, currency);
    const gameIndex = index % games.length;
    const exported = index % 5 === 2;
    return {
      id:`SET-${month.replace('-', '')}-${pad(index + 1)}`,
      month,
      gameId:`GAME-${String(48291 + gameIndex).padStart(5, '0')}`,
      gameName:games[gameIndex],
      developer,
      entityVersion,
      currency,
      grossMinor,
      refundMinor,
      platformShareMinor,
      adjustmentMinor,
      payableMinor:grossMinor - refundMinor - platformShareMinor + adjustmentMinor,
      lastExportedAt:exported ? `2026-09-${pad(8 + (index % 5))} 10:${pad(12 + index)}` : '',
      lastExportedBy:exported ? '平台运营 李然' : '',
      ...account,
    };
  };

  const records = [
    ...Array.from({ length:24 }, (_, index) => makeRecord(index, '2026-08')),
    ...Array.from({ length:9 }, (_, index) => makeRecord(index + 3, '2026-07')),
    ...Array.from({ length:7 }, (_, index) => makeRecord(index + 7, '2026-06')),
  ];

  const createState = () => ({
    scenario:'exhaustive',
    demoOpen:false,
    page:1,
    filters:{ keyword:'', month:'2026-08', currency:'all' },
    selectedIds:[],
    records:clone(records),
  });

  const quoteCell = value => `"${String(value ?? '').replaceAll('"', '""')}"`;
  const textCell = value => {
    const text = String(value ?? '');
    const protectedText = /^[=+\-@]/.test(text) ? `'${text}` : text;
    return quoteCell(protectedText);
  };
  const identifierCell = value => quoteCell(`\t${String(value ?? '')}`);

  const exportCsv = selectedRecords => {
    const headers = ['结算月','结算记录号','Game ID','游戏','开发者','财务主体','主体版本','银行','银行账号','SWIFT/BIC','币种','销售额','退款金额','平台分成','调整额','应付金额'];
    const rows = selectedRecords.map(record => [
      textCell(record.month), identifierCell(record.id), identifierCell(record.gameId), textCell(record.gameName), textCell(record.developer),
      textCell(record.entityName), identifierCell(record.entityVersion), textCell(record.bankName), identifierCell(record.accountFull),
      textCell(record.swift), textCell(record.currency), decimal(record.grossMinor), decimal(record.refundMinor),
      decimal(record.platformShareMinor), decimal(record.adjustmentMinor), decimal(record.payableMinor),
    ].join(','));
    return `\uFEFF${[headers.map(textCell).join(','), ...rows].join('\r\n')}`;
  };

  const markExported = (state, recordIds) => {
    const ids = new Set(recordIds);
    state.records.forEach(record => {
      if (!ids.has(record.id)) return;
      record.lastExportedAt = now();
      record.lastExportedBy = '平台运营 李然';
    });
  };

  return { createState, exportCsv, markExported, money, now };
})();
