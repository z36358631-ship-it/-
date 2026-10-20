(function () {
  'use strict';
  const GH = window.GH;
  // Generated from the existing survey at implementation time; no runtime fetch.
  const taxonomy = [{"id":"b-0","title":"社区答疑","status":"ready","tabs":[{"id":"b-0-t0","label":"默认","sampleTitle":"社区交流群"}]},{"id":"b-1","title":"轮换内容","status":"ready","tabs":[{"id":"b-1-t0","label":"默认","sampleTitle":"其他轮换内容"}]},{"id":"b-2","title":"欢迎来到洛圣都","status":"ready","tabs":[{"id":"b-2-t0","label":"入坑指南","sampleTitle":"注册游戏"},{"id":"b-2-t1","label":"简介","sampleTitle":"游戏世界介绍"},{"id":"b-2-t2","label":"官方指南","sampleTitle":"自由模式基础"},{"id":"b-2-t3","label":"基本信息","sampleTitle":"配置需求"}]},{"id":"b-3","title":"常用检索","status":"ready","tabs":[{"id":"b-3-t0","label":"默认","sampleTitle":"载具大全"}]},{"id":"b-4","title":"资产与生意","status":"ready","tabs":[{"id":"b-4-t0","label":"总览","sampleTitle":"资产推荐"},{"id":"b-4-t1","label":"公寓","sampleTitle":"购买入口"},{"id":"b-4-t2","label":"办公室","sampleTitle":"购买入口"},{"id":"b-4-t3","label":"摩托帮会所","sampleTitle":"购买入口"},{"id":"b-4-t4","label":"夜总会","sampleTitle":"夜总会"},{"id":"b-4-t5","label":"名钻假日赌场","sampleTitle":"名钻假日赌场"},{"id":"b-4-t6","label":"虎鲸","sampleTitle":"解锁购买"},{"id":"b-4-t7","label":"车友会","sampleTitle":"场地解锁"},{"id":"b-4-t8","label":"改装铺","sampleTitle":"改装铺简介"},{"id":"b-4-t9","label":"事务所","sampleTitle":"购买入口"},{"id":"b-4-t10","label":"回收站","sampleTitle":"购买指引"}]},{"id":"b-5","title":"抢劫任务","status":"ready","tabs":[{"id":"b-5-t0","label":"原版抢劫","sampleTitle":"原版抢劫任务"},{"id":"b-5-t1","label":"末日豪劫","sampleTitle":"末日豪劫"},{"id":"b-5-t2","label":"赌场豪劫","sampleTitle":"侦察点一览"},{"id":"b-5-t3","label":"佩里科岛","sampleTitle":"固定侦察点一览"},{"id":"b-5-t4","label":"改装铺合约","sampleTitle":"任务简介"}]},{"id":"b-6","title":"联系人任务","status":"ready","tabs":[{"id":"b-6-t0","label":"默认","sampleTitle":"奥斯卡·古兹曼再度起航（奥斯卡）"}]},{"id":"b-7","title":"载具","status":"ready","tabs":[{"id":"b-7-t0","label":"总览","sampleTitle":"载具一览"},{"id":"b-7-t1","label":"类型","sampleTitle":"开轮式"},{"id":"b-7-t2","label":"厂商","sampleTitle":"HVY"},{"id":"b-7-t3","label":"玩家测评","sampleTitle":"GTA5武装载具"}]},{"id":"b-8","title":"收集内容","status":"ready","tabs":[{"id":"b-8-t0","label":"一次性收藏品","sampleTitle":"有机坊产品(上)"},{"id":"b-8-t1","label":"每日收藏品","sampleTitle":"喷云吐雾馆产品"},{"id":"b-8-t2","label":"随机事件","sampleTitle":"[绝版] 解救囚犯"},{"id":"b-8-t3","label":"限时内容","sampleTitle":"[启用] 幽灵曝光（2026）"},{"id":"b-8-t4","label":"故事模式","sampleTitle":"导演模式人物"}]},{"id":"b-9","title":"武器大全","status":"ready","tabs":[{"id":"b-9-t0","label":"总览","sampleTitle":"武器一览"},{"id":"b-9-t1","label":"手枪","sampleTitle":"手枪"},{"id":"b-9-t2","label":"步枪","sampleTitle":"突击步枪"},{"id":"b-9-t3","label":"冲锋枪","sampleTitle":"微型冲锋枪"},{"id":"b-9-t4","label":"机枪","sampleTitle":"机枪"},{"id":"b-9-t5","label":"狙击枪","sampleTitle":"狙击步枪"},{"id":"b-9-t6","label":"霰弹枪","sampleTitle":"泵动式霰弹"},{"id":"b-9-t7","label":"重型武器","sampleTitle":"榴弹发射器"},{"id":"b-9-t8","label":"投掷式武器","sampleTitle":"手榴弹"},{"id":"b-9-t9","label":"近战武器","sampleTitle":"徒手"}]},{"id":"b-10","title":"全成就指南","status":"ready","tabs":[{"id":"b-10-t0","label":"默认","sampleTitle":"故事模式1"}]},{"id":"b-11","title":"新手指南","status":"ready","tabs":[{"id":"b-11-t0","label":"默认","sampleTitle":"前期载具推荐"}]},{"id":"b-12","title":"故事模式","status":"ready","tabs":[{"id":"b-12-t0","label":"重出江湖","sampleTitle":"序幕"},{"id":"b-12-t1","label":"面朋口友","sampleTitle":"菲利普先生"},{"id":"b-12-t2","label":"骑虎难下","sampleTitle":"闪电突击"},{"id":"b-12-t3","label":"人为刀俎","sampleTitle":"脱轨而出"},{"id":"b-12-t4","label":"血战洛城","sampleTitle":"十面埋伏"}]},{"id":"b-13","title":"登场角色","status":"building","tabs":[{"id":"b-13-t0","label":"主要角色","sampleTitle":"富兰克林"},{"id":"b-13-t1","label":"次要角色","sampleTitle":"史蒂夫"},{"id":"b-13-t2","label":"在线模式","sampleTitle":"14 号探员"}]},{"id":"b-14","title":"帮派简介","status":"building","tabs":[{"id":"b-14-t0","label":"默认","sampleTitle":"家族帮"}]},{"id":"b-15","title":"冷知识","status":"ready","tabs":[{"id":"b-15-t0","label":"冷知识","sampleTitle":"第一弹"},{"id":"b-15-t1","label":"大杂烩","sampleTitle":"载具武器伤害"},{"id":"b-15-t2","label":"特色网站","sampleTitle":"Lifeinvader"}]}];
  const assets = ['wiki-horus-photo','wiki-ignus-photo','wiki-tongva-photo','wiki-richman-photo','wiki-vinewood-photo','wiki-community','wiki-feedback','wiki-editor','wiki-rotation','wiki-plus','wiki-updates','wiki-weekly','wiki-register','wiki-purchase','wiki-account','wiki-launch','wiki-online','wiki-solo','wiki-vehicle','wiki-property','wiki-weapon','wiki-map','wiki-career','wiki-clothes','guideHero','gtaIcon'];
  const clone = value => value === undefined ? undefined : JSON.parse(JSON.stringify(value));
  const eq = (a,b) => JSON.stringify(a) === JSON.stringify(b);
  const templates = ['article','table','gallery','album','entity','version'];
  const fields = (rows) => rows.map(([id,label,type,options]) => ({id,label,type,required:['name','category','version'].includes(id),...(options ? {options} : {})}));
  const schemaSeeds = [
    {id:'vehicle',label:'载具',fields:fields([
      ['name','名称','text'],['category','类型','select',['超级跑车','跑车','摩托车']],['manufacturer','制造商','select',['佩嘉西','菲斯特','长崎']],['price','价格（游戏币）','number'],['version','版本','select',['增强版','传承版','增强版 / 传承版']],['acquisition','获取方式','text']
    ])},
    {id:'weapon',label:'武器',fields:fields([
      ['name','名称','text'],['category','类型','select',['机枪','手枪','步枪']],['ammo','弹药类型','select',['普通弹药','特殊弹药']],['capacity','标准弹容','number'],['price','价格（游戏币）','number'],['level','解锁等级','number'],['version','版本','select',['增强版','传承版','增强版 / 传承版']],['acquisition','获取方式','text']
    ])},
    {id:'asset',label:'资产',fields:fields([
      ['name','名称','text'],['category','类型','select',['豪宅','公寓','办公室']],['location','区域','select',['通瓦山','里奇曼','好麦坞']],['price','价格（游戏币）','number'],['version','版本','select',['增强版','传承版','增强版 / 传承版']],['acquisition','获取方式','text']
    ])}
  ];
  const sourceNote = '交互结构与资料示例；字段数值为演示数据，不作为当前游戏事实或购买依据。图片取自本地研究登记素材，仅供本地评审；未建立再分发许可。';
  const p = (id,text) => ({id,type:'paragraph',text});
  const h = (id,text) => ({id,type:'heading',text});
  const pic = (id,asset,caption) => ({id,type:'image',asset,caption});
  const base = (id,title,template,extra={}) => ({id,title,template,summary:'',revision:1,scope:'增强版 / Online',status:'ready',blocks:[],sourceNote,...extra});
  const entity = (id,title,schemaId,values,asset) => base(id,title,'entity',{schemaId,values,blocks:[...(asset?[pic(id+'-image',asset,'资料配图')]:[]),p(id+'-note','请核对适用版本，获取条件以游戏内说明为准。')]});
  const recordSeeds = [
    base('article-beginner','GTA5 增强版小白入坑指南','article',{summary:'先核对版本与模式，再按步骤查找适用资料。',blocks:[h('intro-version','先确认版本与模式'),p('intro-text','增强版、传承版与故事模式不能直接套用同一套操作说明。请在游玩前核对当前版本，记录所处任务和报错。'),pic('intro-image','wiki-launch','游戏内容配图，帮助识别阅读场景'),h('intro-online','进入线上模式'),p('intro-online-text','先完成游戏内新手引导，再按照当前任务提示继续。遇到无法进入游戏的问题，说明平台、版本和完整报错。'),{id:'intro-table',type:'table',headers:['查找问题','建议提供的信息'],rows:[['任务卡住','任务名、模式、当前步骤'],['运行异常','设备、版本、错误提示']]},{id:'intro-related',type:'related',text:'继续查找',ids:['table-vehicles','table-weapons','gallery-assets']}]}),
    base('table-vehicles','载具一览','table',{schemaId:'vehicle',entityIds:['entity-horus','entity-ignus','entity-comet'],blocks:[p('vehicle-note','按类型、制造商和版本筛选载具，点击名称查看详细参数。')]}),
    base('table-weapons','武器一览','table',{schemaId:'weapon',entityIds:['entity-combat-mg','entity-pistol','entity-carbine'],blocks:[p('weapon-note','按类型与版本筛选武器，对比弹容、解锁条件和获取方式。')]}),
    base('gallery-vehicles','载具图片资料库','gallery',{schemaId:'vehicle',entityIds:['entity-horus','entity-ignus','entity-comet'],blocks:[p('vehicle-gallery-note','浏览载具图片，点击名称查看参数与获取方式。')]}),
    base('gallery-assets','在线模式资产','gallery',{schemaId:'asset',entityIds:['entity-apartment','entity-office','entity-nightclub'],blocks:[p('asset-gallery-note','按资产类型和区域查找房产，查看位置与获取方式。')]}),
    base('album-pegassi','佩嘉西载具图册','album',{summary:'浏览佩嘉西载具图片，点击名称查看详细资料。',items:[{id:'pegassi-horus',entityId:'entity-horus',asset:'wiki-horus-photo',caption:'荷鲁斯'},{id:'pegassi-ignus',entityId:'entity-ignus',asset:'wiki-ignus-photo',caption:'伊格纳斯追逐'}],relatedIds:['album-assets','table-vehicles'],blocks:[p('pegassi-note','查看载具外观，点击名称了解适用版本与获取方式。')]}),
    base('album-assets','房产图册','album',{items:[{id:'asset-tongva',entityId:'entity-apartment',asset:'wiki-tongva-photo',caption:'通瓦房产'},{id:'asset-richman',entityId:'entity-office',asset:'wiki-richman-photo',caption:'里奇曼别墅'}],relatedIds:['album-pegassi','gallery-assets']}),
    base('version-index','版本资料','version',{children:[{id:'article-update-current',label:'当期版本资料',date:'2026-10-20',current:true},{id:'article-update-old',label:'历史版本资料',date:'2026-10-15',current:false}],blocks:[p('versions-note','按版本查找资料，阅读前请确认所用版本。')]}),
    base('article-update-current','当期版本资料','article',{blocks:[pic('update-img','wiki-updates','版本资料'),h('update-title','阅读前先核对适用范围'),p('update-body','查看适用平台、版本和游玩模式，再选择对应攻略。不同版本的内容与操作可能存在差异。')]}),
    base('article-update-old','历史版本资料','article',{blocks:[pic('old-update-img','wiki-weekly','历史版本资料'),p('old-update-body','历史内容用于对照，不表示奖励仍可领取或活动仍可参加。')]}),
    base('article-paused-map','点位地图 · 暂停维护说明','article',{status:'paused',blocks:[{id:'paused-notice',type:'callout',text:'当前为暂停维护说明，页面不提供交互地图或位置保存。'},p('paused-body','请按当前游戏与版本自行核实可用资料，不将历史地图说明当成正在运行的地图工具。')]}),
    base('article-building','角色资料','article',{status:'building',blocks:[{id:'building-notice',type:'callout',text:'资料仍在整理，现有内容可以阅读。'},p('building-body','角色资料正在整理，请按适用模式查找已有内容。')]}),
    entity('entity-horus','荷鲁斯','vehicle',{name:'荷鲁斯',category:'超级跑车',manufacturer:'佩嘉西',price:1900000,version:'增强版 / 传承版',acquisition:'游戏内载具网站；以当前游戏为准'},'wiki-horus-photo'),
    entity('entity-ignus','伊格纳斯追逐','vehicle',{name:'伊格纳斯追逐',category:'超级跑车',manufacturer:'佩嘉西',price:2765000,version:'增强版 / 传承版',acquisition:'请在游戏内查看获取条件'},'wiki-ignus-photo'),
    entity('entity-comet','彗星','vehicle',{name:'彗星',category:'跑车',manufacturer:'菲斯特',price:100000,version:'传承版',acquisition:'请在游戏内查看当前在售情况'}),
    entity('entity-combat-mg','战斗机枪','weapon',{name:'战斗机枪',category:'机枪',ammo:'普通弹药',capacity:100,price:14800,level:80,version:'增强版 / 传承版',acquisition:'游戏内获取方式，具体条件以当前版本为准'},'wiki-weapon'),
    entity('entity-pistol','手枪','weapon',{name:'手枪',category:'手枪',ammo:'普通弹药',capacity:12,price:2500,level:1,version:'增强版 / 传承版',acquisition:'请在游戏内查看获取条件'},'wiki-weapon'),
    entity('entity-carbine','卡宾步枪','weapon',{name:'卡宾步枪',category:'步枪',ammo:'普通弹药',capacity:30,price:13000,level:42,version:'增强版',acquisition:'请在游戏内查看获取条件'},'wiki-weapon'),
    entity('entity-apartment','通瓦房产','asset',{name:'通瓦房产',category:'豪宅',location:'通瓦山',price:200000,version:'增强版 / 传承版',acquisition:'游戏内网站，当前价格以游戏内显示为准'},'wiki-tongva-photo'),
    entity('entity-office','里奇曼别墅','asset',{name:'里奇曼别墅',category:'豪宅',location:'里奇曼',price:1000000,version:'增强版 / 传承版',acquisition:'游戏内网站，当前价格以游戏内显示为准'},'wiki-richman-photo'),
    entity('entity-nightclub','好麦坞宅邸','asset',{name:'好麦坞宅邸',category:'豪宅',location:'好麦坞',price:1700000,version:'增强版',acquisition:'游戏内网站，当前价格以游戏内显示为准'},'wiki-vinewood-photo')
  ];
  const article = (id,title,parts,extra={}) => base(id,title,'article',{blocks:parts.flatMap((part,i)=>[h(id+'-h'+i,part[0]),p(id+'-p'+i,part[1])]),...extra});
  recordSeeds.push(
    article('article-help','怎样更正一条攻略',[
      ['先看适用范围','先查看词条顶部的版本、模式和来源。若只是自己的版本不同，保留原有有效段落，在对应章节补充适用条件；不要直接用另一版本的说明替换全文。'],
      ['只改有依据的内容','例如载具价格有误，打开载具详情更正价格字段，填写“更正载具价格”。不需要同时改宽表和图片库，它们读取同一实体；图册图片说明是另一项独立内容。'],
      ['保存后的结果','预览只检查排版，不写入公开内容。保存成功后阅读页显示新版本，历史留下这次修改说明；失败时保留输入，发生冲突先对照最新内容再提交。']
    ]),
    article('article-sources','资料来源与使用说明',[
      ['资料与平台能力分开','攻略正文记录资料和经验，不能据此判断盖世已支持某个游戏模式。遇到“地图”“职业进度”“车牌制作器”等名称，先看正文是教程说明还是可操作工具。'],
      ['查阅资料来源','阅读攻略时核对适用平台、游戏版本和资料日期。存在差异时，优先查看游戏内说明及原始来源。'],
      ['资料如何维护','正文注明适用平台、游戏版本、来源与核对日期。引述资料时保留署名和使用条件；来源失效时更新说明，不能继续把旧资料当作当前可用服务。']
    ]),
    article('article-heist','抢劫任务清单',[
      ['准备阶段先看三件事','以小队任务为例，先在游戏任务面板确认参与人数、当前准备任务和目标。把已完成的准备与尚未解锁的阶段分开；队友的准备进度不等于自己已完成。'],
      ['把流程写成可执行步骤','任务攻略按“当前目标—需要准备—执行步骤—失败后从哪里继续”组织。例：侦察环节先记录游戏要求的目标，返回准备阶段核对，再进入下一步；不要在同一段落混写多个路线。'],
      ['组队说明保留边界','标明故事模式还是Online、使用版本和平台。分工、路线与奖励条件按当前游戏确认；本页不创建房间、不发起邀请，也不承诺读完便自动完成任务。']
    ]),
    article('article-story','故事模式 · 序幕',[
      ['从当前目标开始','剧情任务的操作提示随进度变化。先看画面上的当前目标，再执行移动、掩体、瞄准或驾驶提示；未触发下一段时，回到目标位置和同伴状态检查。'],
      ['失败后回看哪一步','把失败原因与流程分开记录：角色状态、任务目标、路线和当前检查点。重试时先修正失败那一步，不必每次从头重读整篇攻略。'],
      ['避免混入线上攻略','故事角色、任务进度与Online角色分开。角色切换和任务重玩等功能应以当前游戏提示为准，不能拿线上资产和组队条件解释剧情卡点。']
    ],{scope:'故事模式'}),
    article('article-character','主要角色',[
      ['三位主角的资料怎样查','富兰克林、麦克和崔佛是GTA V故事模式的主要角色。查角色资料时先区分剧情人物介绍与当前任务攻略，再进入需要的章节，避免被无关剧情展开打断。'],
      ['人物介绍与任务进度分开','人物关系是资料描述，不表示玩家已经推进到相应剧情。正式角色条目应把基础信息、涉及任务与剧透段落分开，让玩家只查看当下需要的部分。'],
      ['共建时怎样修改','只更正有依据的名字、关系或章节说明，保留仍有效的内容。新版本的补充写明适用范围，修改说明写清更正了什么，方便下一位维护者判断。']
    ],{status:'building',scope:'故事模式 / 角色资料'}),
    article('article-career','职业进度',[
      ['这是说明，不是个人仪表盘','本页说明如何阅读职业进度资料，不连接Rockstar账号，也不读取个人完成度。看到攻略中的进度截图，不代表站内已经同步自己的角色。'],
      ['按条件而不是按截图判断','查看职业条目时，逐项核对平台、版本、任务条件与领取条件。已看到条目、已完成任务、已经领取奖励是不同状态，应在游戏内分别确认。'],
      ['维护这类说明时','把适用版本写在正文开头，按条件与操作顺序分段。官方调整条件后，更正相关段落并说明变化，不通过改标题把旧文章变成另一个版本。']
    ]),
    article('article-collection','收集内容',[
      ['先确定收集对象','区分固定位置物品、随机出现内容与限时内容，再按对应名称查询。截图应注明对象与附近参照，不能只放一张无法识别位置的大图。'],
      ['把路线和点位信息分开','路线说明负责告诉玩家先后顺序；单个点位说明负责描述到达方式和容易漏看的位置。若资料暂停维护，保留状态提示，不伪装成仍可交互的地图。'],
      ['结果需要玩家在游戏内确认','本页不保存个人收集进度。找到物品后在游戏内核对是否计入进度；遇到不出现的情况先确认版本与条件，再判断资料是否错误。']
    ]),
    article('article-achievement','全成就指南',[
      ['先分清成就的适用模式','故事模式、Online和编辑器相关内容的前置条件不同。正式指南按模式归类，每项写清目标与触发条件，避免把名称相似的条目混在一起。'],
      ['先做条件检查，再执行步骤','阅读一项成就时依次确认前置、执行和结果。进度未增加时记录当前步骤和实际表现，再返回相应章节检查遗漏，而不是重复整条流程。'],
      ['本页不会解锁或同步成就','页面提供资料，不操作游戏或平台账号。平台显示和游戏内结果可能有同步时间差；完成情况以对应平台和游戏的实际记录为准。']
    ]),
    article('article-clothes','限时服饰',[
      ['历史资料仍可阅读','本资料已暂停维护。历史内容仍可查阅，服饰是否可领取或购买请以当前游戏为准。'],
      ['翻译名称可能不同','同一物品在不同语言或版本中名称可能不同。正式条目应同时保留原名、译名和来源，不用不确定的翻译直接覆盖已有名称。'],
      ['更正与恢复维护不同','贡献者可以更正允许编辑的内容，但更正一项名称并不意味着整份资料已恢复更新。维护状态和时间由明确的维护责任人处理。']
    ],{status:'paused'}),
    article('article-gang','帮派简介',[
      ['人物关系资料','帮派简介用于理解故事中的组织关系，与Online玩家自行建立的小队或帮会不同。阅读时先看资料讨论的是剧情设定还是玩家社交。'],
      ['按事实与情节分段','正式条目把名称、活动范围与涉及情节分开整理。涉及故事细节的段落应说明内容性质，让读者根据当前进度选择阅读。'],
      ['建设中仍可查看已有内容','建设中表示资料未完整，现有段落和关联词条仍可阅读。补充时先检查现有词条，避免以相近名称建立重复对象。']
    ],{status:'building',scope:'故事模式 / 组织资料'})
  );
  // Preserve original taxonomy while using a small, honestly labelled curated set.
  const curated = {'b-0':['article-help','article-sources'],'b-1':['version-index','article-update-current'],'b-2':['article-beginner','article-career'],'b-3':['table-vehicles','gallery-assets','table-weapons','article-paused-map','article-career','article-clothes'],'b-4':['gallery-assets','album-assets'],'b-5':['article-heist'],'b-6':['article-heist'],'b-7':['table-vehicles','gallery-vehicles','album-pegassi'],'b-8':['article-collection'],'b-9':['table-weapons','entity-combat-mg'],'b-10':['article-achievement'],'b-11':['article-beginner','article-help'],'b-12':['article-story'],'b-13':['article-character'],'b-14':['article-gang'],'b-15':['article-sources','article-collection']};
  const sectionSeeds = taxonomy.map((section) => ({id:section.id,title:section.title,status:section.status,tabs:section.tabs.map((tab,index) => {
    const ids=curated[section.id];
    const ordered=[ids[index%ids.length],...ids.filter(id=>id!==ids[index%ids.length])];
    const entries=ordered.map(recordId=>({recordId,label:recordSeeds.find(r=>r.id===recordId).title}));
    return {id:tab.id,label:tab.label,entries};
  })}));
  const configSeed = {revision:1,table:{vehicle:{columns:['name','category','manufacturer','price','version','acquisition'],filters:['category','manufacturer','version']},weapon:{columns:['name','category','capacity','ammo','price','level','version','acquisition'],filters:['category','version']},asset:{columns:['name','category','location','price','version'],filters:['category','location','version']}},portal:sectionSeeds.map(s=>({sectionId:s.id,title:s.title,visible:true,layout:['b-5','b-6','b-14'].includes(s.id)?'list':'cards'}))};
  // Personal posts are portal references, outside public records and their templates.
  for(const [sectionId,tabId,postId] of [['b-2','b-2-t0','post-first-trip'],['b-11','b-11-t0','post-vehicle-choice']]) {
    const entry=configSeed.portal.find(p=>p.sectionId===sectionId),tab=sectionSeeds.find(s=>s.id===sectionId).tabs.find(t=>t.id===tabId);
    entry.tabEntries={[tabId]:[postId,...tab.entries.map(e=>e.recordId)]};
  }
  configSeed.portal.find(p=>p.sectionId==='b-7').tabEntries={'b-7-t3':['post-vehicle-choice']};
  const portalOrder=['b-11','b-5','b-7','b-9','b-4','b-1','b-3','b-8','b-2','b-6','b-10','b-12','b-13','b-14','b-15','b-0'];
  const portalTitles={'b-11':'新手入门','b-5':'在线任务','b-7':'载具大全','b-9':'武器大全','b-4':'资产生意','b-1':'每周活动'};
  configSeed.portal.sort((a,b)=>portalOrder.indexOf(a.sectionId)-portalOrder.indexOf(b.sectionId));
  configSeed.portal.forEach(entry=>{entry.title=portalTitles[entry.sectionId]||entry.title;});
  configSeed.schemas=clone(schemaSeeds);
  const layoutNames=['text','image-top','image-left','banner','cards','list'];
  const normalizedLayout=layout=>layout==='list'?'text':layout==='cards'?'image-top':layout;
  const coverSeeds={'b-11':'wiki-launch','b-5':'guideHero','b-7':'wiki-horus-photo','b-9':'wiki-weapon','b-4':'wiki-tongva-photo','b-1':'wiki-weekly','b-3':'wiki-vehicle','b-8':'wiki-map','b-2':'wiki-register','b-6':'wiki-online','b-10':'wiki-career','b-12':'guideHero','b-13':'gtaIcon','b-14':'wiki-online','b-15':'wiki-plus','b-0':'wiki-community'};
  configSeed.portal.forEach(entry=>{
    entry.layout=normalizedLayout(entry.layout);
    if(entry.sectionId==='b-7')entry.layout='image-left';
    if(entry.sectionId==='b-1')entry.layout='banner';
    entry.cover=coverSeeds[entry.sectionId];
    entry.columns=entry.layout==='banner'?{portrait:1,landscape:1}:{portrait:2,landscape:4};
    entry.tabs=sectionSeeds.find(s=>s.id===entry.sectionId).tabs.map(tab=>({id:tab.id,label:tab.label,visible:true}));
  });
  configSeed.portal.find(p=>p.sectionId==='b-11').tabEntries['b-11-t0']=['post-first-trip','article-beginner','article-help'];
  // D015: all 13 supported layout/count combinations are actual configurable homepage examples.
  const homepageExamples=[
    ['b-5','text',1,['article-heist']],
    ['b-6','text',2,['article-heist','article-career']],
    ['b-10','text',3,['article-achievement','article-story','article-collection']],
    ['b-15','text',4,['article-sources','article-collection','article-career','article-clothes']],
    ['b-11','image-top',1,['post-first-trip','article-beginner']],
    ['b-2','image-top',2,['post-first-trip','article-beginner']],
    ['b-9','image-top',3,['table-weapons','entity-combat-mg','article-career']],
    ['b-4','image-top',4,['gallery-assets','album-assets','article-career','article-update-current']],
    ['b-7','image-left',1,['table-vehicles']],
    ['b-3','image-left',2,['table-vehicles','table-weapons']],
    ['b-8','image-left',3,['article-collection','article-clothes','article-achievement']],
    ['b-12','image-left',4,['article-story','article-character','article-gang','article-achievement']],
    ['b-1','banner',1,['article-update-current']]
  ];
  homepageExamples.forEach(([id,layout,count,ids])=>{const entry=configSeed.portal.find(p=>p.sectionId===id);entry.layout=layout;entry.columns={portrait:count,landscape:count};entry.tabEntries={...entry.tabEntries,[entry.tabs[0].id]:ids};});
  // D017 supersedes the narrow three/four-column horizontal card examples.
  for(const entry of configSeed.portal)if(entry.layout==='image-left')entry.columns={portrait:Math.min(2,entry.columns.portrait),landscape:Math.min(2,entry.columns.landscape)};
  const assetPortal=configSeed.portal.find(p=>p.sectionId==='b-4');
  assetPortal.layout='banner';assetPortal.columns={portrait:1,landscape:1};
  assetPortal.tabEntries[assetPortal.tabs[0].id]=['gallery-assets','album-assets'];
  const heistPortal=configSeed.portal.find(p=>p.sectionId==='b-5');
  heistPortal.title='抢劫任务';heistPortal.layout='image-top';heistPortal.columns={portrait:3,landscape:3};
  heistPortal.tabEntries[heistPortal.tabs[0].id]=['article-heist','post-first-trip','article-career'];
  // D022: each existing heading fixes one component; its tabs compare row counts only.
  const countSections=[
    ['b-3','text',4,[...curated['b-3'],'article-beginner','article-heist']],
    ['b-5','image-top',4,['article-heist','post-first-trip','article-career','article-beginner']],
    ['b-6','text',4,['article-heist','article-career','article-beginner','article-help']],
    ['b-10','text',4,['article-achievement','article-collection','article-story','article-career']],
    ['b-15','text',4,['article-sources','article-collection','article-career','article-clothes']],
    ['b-11','image-top',4,['post-first-trip','article-beginner','article-help','article-career']],
    ['b-2','image-top',4,['post-first-trip','article-beginner','article-career','article-help']],
    ['b-9','image-top',4,['table-weapons','entity-combat-mg','article-career','article-sources']],
    ['b-4','banner',1,['gallery-assets','album-assets']],
    ['b-7','image-left',2,['table-vehicles','gallery-vehicles','album-pegassi','post-vehicle-choice']],
    ['b-8','image-left',2,['article-collection','article-clothes','article-achievement']],
    ['b-12','image-left',2,['article-story','article-character','article-gang','article-achievement']],
    ['b-1','banner',1,['version-index','article-update-current']]
  ];
  countSections.forEach(([id,layout,max,ids])=>{
    const entry=configSeed.portal.find(p=>p.sectionId===id),original=sectionSeeds.find(s=>s.id===id).tabs;
    entry.layout=layout;entry.columns={portrait:1,landscape:1};
    entry.tabs=Array.from({length:max},(_,i)=>({id:original[i]?.id||`custom-${id}-count-${i+1}`,label:`${i+1}列`,visible:true,layout,columns:{portrait:i+1,landscape:i+1}}));
    entry.tabEntries=Object.fromEntries(entry.tabs.map(tab=>[tab.id,[...ids]]));
  });
  const shortcutSeeds=configuration=>configuration.portal.map(entry=>({id:'shortcut-'+entry.sectionId,title:'',cover:'',visible:true,targetType:'section',targetId:entry.sectionId}));
  configSeed.shortcuts=shortcutSeeds(configSeed);
  recordSeeds.find(r=>r.id==='article-beginner').relatedPostIds=['post-first-trip'];
  recordSeeds.find(r=>r.id==='table-vehicles').relatedPostIds=['post-vehicle-choice'];
  let records, config, histories, tombstones;
  const permissions={
    'entry.create':['editor','manager'],'entry.edit':['contributor','editor','manager'],'entry.delete':['editor','manager'],
    'data.create':['contributor','editor','manager'],'data.edit':['contributor','editor','manager'],'data.batch':['editor','manager'],'data.delete':['manager'],
    'home.create':['editor','manager'],'home.edit':['editor','manager'],'home.delete':['manager'],'home.reorder':['manager'],'schema.configure':['manager']
  };
  function can(action,role) {
    if(permissions[action])return !GH.guideGovernance?.isBlocked('demo-self')&&permissions[action].includes(role);
    return ['html.manage','roles.manage','blacklist.manage','review.data','review.editor'].includes(action)&&!!GH.guideGovernance?.can?.(action,role);
  }
  const result = (ok,code,message,record) => ({ok,code,message,...(record ? {record:clone(record)} : {})});
  const unique = a => Array.isArray(a) && new Set(a).size===a.length;
  const text = (v,max=20000) => typeof v==='string' && v.length<=max;
  const ref = id => typeof id==='string' && records.has(id);
  const portalRef = id => ref(id)||(typeof id==='string'&&id.startsWith('post-')&&!!GH.guidePosts?.get(id));
  const postRef = id => typeof id==='string'&&id.startsWith('post-')&&!!GH.guidePosts?.get(id);
  const schemas = override => (override||config).schemas||schemaSeeds;
  const schema = (id,override) => schemas(override).find(s=>s.id===id)||null;
  function shortcuts(override) {
    const configuration=override||config;
    return (configuration.shortcuts||shortcutSeeds(configuration)).map(item=>{
      const section=configuration.portal.find(entry=>entry.sectionId===item.targetId);
      return {...clone(item),title:item.title||(item.targetType==='section'?section?.title:''),cover:item.cover||(item.targetType==='section'?section?.cover:''),visible:item.visible&&(item.targetType==='section'?!!section&&section.visible:!!records.get(item.targetId))};
    });
  }
  function sections(override) {
    return (override||config).portal.map(entry=>{
      const seed=sectionSeeds.find(s=>s.id===entry.sectionId);
      const layout=normalizedLayout(entry.layout||'image-top');
      const limitColumns=(value,type)=>({portrait:Math.min(type==='banner'?1:type==='image-left'?2:4,value.portrait),landscape:Math.min(type==='banner'?1:type==='image-left'?2:4,value.landscape)});
      const columns=limitColumns(entry.columns||{portrait:2,landscape:4},layout);
      const tabs=(entry.tabs||config.portal.find(item=>item.sectionId===entry.sectionId)?.tabs||seed?.tabs||[]).map(tab=>{
        const seedTab=seed?.tabs.find(t=>t.id===tab.id),tabLayout=normalizedLayout(tab.layout||layout);
        const ids=entry.tabEntries?.[tab.id];
        return {...clone(tab),visible:tab.visible!==false,layout:tabLayout,columns:limitColumns(tab.columns||entry.columns||{portrait:2,landscape:4},tabLayout),entries:ids===undefined?clone(seedTab?.entries||[]):ids.map(recordId=>({recordId,label:records.get(recordId)?.title||GH.guidePosts?.get(recordId)?.title||recordId}))};
      });
      return {id:entry.sectionId,title:entry.title,status:seed?.status||'ready',visible:entry.visible,cover:entry.cover,layout,columns,tabs};
    });
  }
  function validate(r,configuration=config) {
    if(!r || typeof r!=='object' || Array.isArray(r)) return '内容格式无效';
    const keys=['id','title','template','summary','revision','scope','status','schemaId','values','blocks','entityIds','items','relatedIds','relatedPostIds','children','sourceNote'];
    if(Object.keys(r).some(k=>!keys.includes(k))) return '包含未定义的内容字段';
    if(!text(r.id,100)||!r.id||r.id.startsWith('post-')||!text(r.title,160)||!r.title.trim()) return '标题必填且不能超过160字；个人原帖不能作为公共词条';
    if(!templates.includes(r.template)||!['ready','building','paused'].includes(r.status)) return '内容模板或状态无效';
    if(!text(r.summary,1000)||!text(r.scope,160)||!text(r.sourceNote,2000)) return '摘要、适用范围或来源字段无效';
    const schema=schemas(configuration).find(s=>s.id===r.schemaId);
    if(r.schemaId && !schema) return '资料字段方案不存在';
    if(['entity','table','gallery'].includes(r.template)&&!schema) return '此模板需要字段方案';
    if(r.template==='entity') {
      if(!r.values||typeof r.values!=='object'||Array.isArray(r.values)) return '实体字段无效';
      if(Object.keys(r.values).some(k=>!schema.fields.some(f=>f.id===k))) return '存在未定义的实体字段';
      for(const f of schema.fields) {
        const v=r.values[f.id];
        if(f.required && (v===undefined||v===null||v===''||(typeof v==='string'&&!v.trim()))) return f.label+'为必填项';
        if(v===undefined||v===null||v==='') continue;
        if(f.type==='number'&&(typeof v!=='number'||!Number.isFinite(v)||v<0)) return f.label+'应为非负数字';
        if(f.type!=='number'&&!text(v,2000)) return f.label+'格式无效';
        if(f.type==='select'&&!f.options.includes(v)) return f.label+'不是有效选项';
      }
    } else if(r.values!==undefined) return '只有实体可保存字段值';
    if(!Array.isArray(r.blocks)||r.blocks.length>100||!unique(r.blocks.map(b=>b&&b.id))) return '正文块数量或标识无效';
    for(const b of r.blocks) {
      if(!b||!text(b.id,120)||!b.id||!['heading','paragraph','image','callout','table','related','list','quote','link'].includes(b.type)) return '正文块类型或标识无效';
      if(b.text!==undefined&&!text(b.text)) return '正文文字无效';
      if(b.caption!==undefined&&!text(b.caption,2000)) return '图片说明过长';
      if(b.crop!==undefined&&(b.type!=='image'||!['cover','contain'].includes(b.crop))) return '图片显示方式无效';
      if(b.type==='image'&&!assets.includes(b.asset)) return '请选择已登记图片';
      if(b.type==='table'&&(!Array.isArray(b.headers)||!b.headers.length||b.headers.some(v=>!text(v,200))||!Array.isArray(b.rows)||b.rows.some(row=>!Array.isArray(row)||row.length!==b.headers.length||row.some(v=>!text(v,2000))))) return '正文表格的列与单元格不一致';
      if(b.type==='related'&&(!unique(b.ids)||b.ids.some(id=>!ref(id)||id===r.id))) return '正文关联目标无效';
      if(b.type==='list'&&(!Array.isArray(b.items)||!b.items.length||b.items.length>100||b.items.some(item=>!text(item,2000)||!item.trim())||(b.ordered!==undefined&&typeof b.ordered!=='boolean'))) return '列表至少填写一项有效文字';
      if(b.type==='quote'&&(!text(b.text)||!b.text.trim()||(b.cite!==undefined&&!text(b.cite,1000)))) return '引用正文或出处无效';
      if(b.type==='link'&&(!text(b.text,2000)||!b.text.trim()||!text(b.href,2000)||!/^https?:\/\/[^\s/?#]+(?:[/?#][^\s]*)?$/i.test(b.href))) return '链接需填写文字与有效的 http(s) 地址';
    }
    if(['table','gallery'].includes(r.template)&&(!unique(r.entityIds)||r.entityIds.some(id=>!ref(id)||records.get(id).template!=='entity'||records.get(id).schemaId!==r.schemaId))) return '资料列表包含无效或不匹配的实体';
    if(r.items!==undefined && (!Array.isArray(r.items)||!unique(r.items.map(i=>i&&i.id))||r.items.some(i=>!i||!text(i.id,120)||!i.id||!assets.includes(i.asset)||!text(i.caption,2000)||(i.crop!==undefined&&!['cover','contain'].includes(i.crop))||(i.entityId&&(!ref(i.entityId)||records.get(i.entityId).template!=='entity'))))) return '图册图片或实体引用无效';
    if(r.template==='album'&&(!r.items||!r.items.length)) return '图册至少保留一项图片';
    if(r.relatedIds!==undefined&&(!unique(r.relatedIds)||r.relatedIds.some(id=>!ref(id)||id===r.id))) return '关联内容无效';
    if(r.relatedPostIds!==undefined&&(!unique(r.relatedPostIds)||r.relatedPostIds.length>24||r.relatedPostIds.some(id=>!postRef(id)))) return '关联玩家攻略必须引用独立的有效原帖';
    if(r.children!==undefined&&(!Array.isArray(r.children)||!unique(r.children.map(c=>c&&c.id))||r.children.some(c=>!c||!ref(c.id)||records.get(c.id).template!=='article'||!text(c.label,160)||!/^\d{4}-\d{2}-\d{2}$/.test(c.date)||typeof c.current!=='boolean')||r.children.filter(c=>c.current).length>1)) return '版本索引的目标、日期或当期标记无效';
    if(r.template==='version'&&(!r.children||!r.children.length)) return '版本索引至少保留一篇资料';
    return '';
  }
  function snapshot(r,note,role) {
    const d=new Date();
    return {...clone(r),record:clone(r),note,changeSummary:note,author:role==='manager'?'高级编辑员':role==='editor'?'初级编辑员':role==='contributor'?'普通贡献者':'攻略编辑组',time:d.toISOString(),timestamp:d.getTime()};
  }
  function reset() {
    records=new Map(recordSeeds.map(r=>[r.id,clone(r)])); config=clone(configSeed); histories=new Map();tombstones=new Map();
    records.forEach(r=>histories.set(r.id,[snapshot(r,'创建词条','seed')]));
    for(const r of records.values()) {const error=validate(r);if(error) throw new Error(r.id+': '+error);}
  }
  function save(input,baseRevision,options={}) {
    if(!can('entry.edit',options.role)) return result(false,'forbidden','当前账号没有编辑权限或已被限制');
    let r;try{r=clone(input);}catch(_){return result(false,'validation','内容无法读取');}
    const old=r&&records.get(r.id);
    if(!old) return result(false,'unavailable','词条不存在；本轮编辑既有内容');
    if(baseRevision!==old.revision) return result(false,'conflict','公开版本已变化，请核对最新内容后再保存',old);
    if(r.template!==old.template||r.schemaId!==old.schemaId) return result(false,'forbidden','既有内容的模板与资料身份固定；请使用对应模板新建词条');
    // Entity name is shared across every view. Keep its record title in sync.
    if(r.template==='entity'&&r.values&&old.template==='entity'&&r.title!==r.values.name) {
      const renamed=r.values.name!==old.values.name,retitled=r.title!==old.title;
      if(renamed&&retitled) return result(false,'validation','实体名称与标题需保持一致');
      if(renamed) r.title=r.values.name;
      else if(retitled) r.values.name=r.title;
    }
    if(options.role==='contributor'||options.role==='editor') {
      const allowed=['title','summary','blocks','values','items','relatedIds','relatedPostIds','children'];
      for(const key of new Set([...Object.keys(old),...Object.keys(r)])) if(!allowed.includes(key)&&!eq(old[key],r[key])) return result(false,'forbidden','贡献者只能编辑内容，不能更改模板、身份或结构');
      const identity=items=>Array.isArray(items)?items.map(i=>({id:i&&i.id,entityId:i&&i.entityId})).sort((a,b)=>String(a.id).localeCompare(String(b.id))):items===undefined?[]:null;
      if(!eq(identity(old.items),identity(r.items))) return result(false,'forbidden','贡献者不能更改图册项身份或关联实体');
      const childIdentity=children=>Array.isArray(children)?children.map(c=>({id:c&&c.id,current:c&&c.current})).sort((a,b)=>String(a.id).localeCompare(String(b.id))):children===undefined?[]:null;
      if(!eq(childIdentity(old.children),childIdentity(r.children))) return result(false,'forbidden','贡献者不能更换版本索引目标或当期身份');
    }
    const error=validate(r);if(error) return result(false,'validation',error);
    if(!text(options.summary,120)||!options.summary.trim()) return result(false,'validation','请填写修改说明（最多120字）');
    const before={...old,revision:0},after={...r,revision:0};
    if(eq(before,after)) return result(false,'unchanged','内容没有变化，未生成新版本',old);
    if(options.fail) return result(false,'failed','保存失败，输入保留，公开内容未变');
    r.revision=old.revision+1;
    // Changing a manager-owned entity schema must not invalidate existing views.
    const previous=records.get(r.id); records.set(r.id,r);
    for(const candidate of records.values()) {const e=validate(candidate);if(e){records.set(r.id,previous);return result(false,'validation','变更会使现有引用失效：'+e);}}
    histories.get(r.id).unshift(snapshot(r,options.summary.trim(),options.role));
    return result(true,'success','已保存，公开内容与历史已同步',r);
  }
  function configure(input,baseRevision,options={}) {
    if(!can('home.edit',options.role)) return result(false,'forbidden','当前角色不能调整首页导航配置');
    if(baseRevision!==config.revision) return result(false,'conflict','配置已变化，请重新载入',config);
    let c;try{c=clone(input);}catch(_){return result(false,'validation','配置无法读取');}
    if(!c||Object.keys(c).some(k=>!['revision','table','portal','schemas','shortcuts'].includes(k))||!c.table||typeof c.table!=='object'||Array.isArray(c.table)||!Array.isArray(c.portal)) return result(false,'validation','配置结构无效');
    if(c.schemas===undefined)c.schemas=clone(schemas());
    if(!can('schema.configure',options.role)&&(!eq(c.schemas,schemas())||!eq(c.table,config.table)))return result(false,'forbidden','仅高级编辑员可以修改字段方案、展示列与筛选参数');
    const stableId=id=>text(id,100)&&/^[a-z][a-z0-9_-]*$/i.test(id);
    if(!Array.isArray(c.schemas)||!c.schemas.length||c.schemas.length>24||!unique(c.schemas.map(s=>s&&s.id)))return result(false,'validation','字段方案数量或标识无效');
    for(const s of c.schemas) {
      if(!s||Object.keys(s).some(k=>!['id','label','fields'].includes(k))||!stableId(s.id)||!text(s.label,80)||!s.label.trim()||!Array.isArray(s.fields)||!s.fields.length||s.fields.length>40||!unique(s.fields.map(f=>f&&f.id)))return result(false,'validation','字段方案名称、字段数量或标识无效');
      for(const f of s.fields) {
        if(!f||Object.keys(f).some(k=>!['id','label','type','required','options'].includes(k))||!stableId(f.id)||!text(f.label,100)||!f.label.trim()||!['text','number','select'].includes(f.type)||(f.required!==undefined&&typeof f.required!=='boolean'))return result(false,'validation','字段名称、类型或必填配置无效');
        if(f.type==='select'&&(!unique(f.options)||!f.options.length||f.options.length>100||f.options.some(v=>!text(v,2000)||!v.trim())))return result(false,'validation','枚举字段需要1至100个不同的有效选项');
        if(f.type!=='select'&&f.options!==undefined)return result(false,'validation','仅枚举字段可以配置选项');
      }
      const name=s.fields.find(f=>f.id==='name');
      if(!name||name.type!=='text'||name.required!==true)return result(false,'validation','字段方案需保留必填的名称文本字段');
      const prior=schema(s.id);
      if(prior) {
        for(const f of prior.fields) {
          const next=s.fields.find(n=>n.id===f.id);
          if(!next||next.type!==f.type||!!next.required!==!!f.required)return result(false,'validation','已有字段不能删除、改标识、改类型或改必填规则');
        }
        if(s.fields.some(f=>!prior.fields.some(p=>p.id===f.id)&&f.required))return result(false,'validation','新增字段应为可选字段，避免使已有实体失效');
      }
    }
    if(schemas().some(s=>!c.schemas.some(n=>n.id===s.id)))return result(false,'validation','请保留已有字段方案');
    if(Object.keys(c.table).some(id=>!c.schemas.some(s=>s.id===id))) return result(false,'validation','未知字段方案');
    for(const schema of c.schemas) {
      const item=c.table[schema.id];
      if(!item||Object.keys(item).some(k=>!['columns','filters'].includes(k))||!unique(item.columns)||!item.columns.includes('name')||!unique(item.filters)) return result(false,'validation','每个资料方案需保留名称列与有效筛选配置');
      if(item.columns.some(id=>!schema.fields.some(f=>f.id===id))||item.filters.some(id=>!schema.fields.some(f=>f.id===id&&f.type==='select'))) return result(false,'validation','展示列或筛选字段不存在');
    }
    if(!c.portal.length||c.portal.length>40||!unique(c.portal.map(p=>p&&p.sectionId))) return result(false,'validation','需保留1至40个不同栏目');
    const preserves=(before,after,key)=>before.every(item=>after.some(next=>next[key]===item[key]));
    const sameOrder=(before,after,key)=>eq(before.filter(item=>after.some(next=>next[key]===item[key])).map(item=>item[key]),after.filter(item=>before.some(old=>old[key]===item[key])).map(item=>item[key]));
    if(!can('home.delete',options.role)&&!preserves(config.portal,c.portal,'sectionId'))return result(false,'forbidden','仅高级编辑员可以删除首页栏目');
    if(!can('home.reorder',options.role)&&!sameOrder(config.portal,c.portal,'sectionId'))return result(false,'forbidden','仅高级编辑员可以排序首页栏目');
    const allTabIds=new Set();
    const validColumns=columns=>columns&&typeof columns==='object'&&!Array.isArray(columns)&&Object.keys(columns).every(k=>['portrait','landscape'].includes(k))&&['portrait','landscape'].every(k=>Number.isInteger(columns[k])&&columns[k]>=1&&columns[k]<=4);
    for(const entry of c.portal) {
      const seed=sectionSeeds.find(s=>s.id===entry?.sectionId),prior=config.portal.find(p=>p.sectionId===entry?.sectionId);
      if(!entry||Object.keys(entry).some(k=>!['sectionId','title','visible','layout','tabEntries','cover','columns','tabs'].includes(k))||(!seed&&(!stableId(entry.sectionId)||!entry.sectionId.startsWith('custom-')))||!text(entry.title,80)||!entry.title.trim()||typeof entry.visible!=='boolean'||!layoutNames.includes(entry.layout)) return result(false,'validation','栏目名称、标识、布局或可见性无效');
      if(entry.cover!==undefined&&!assets.includes(entry.cover))return result(false,'validation','栏目封面需使用已登记的 GTA5 素材');
      if(entry.columns===undefined)entry.columns=clone(prior?.columns||{portrait:2,landscape:4});
      if(!validColumns(entry.columns))return result(false,'validation','横竖屏每行数量需为1至4的整数');
      if(entry.layout==='banner')entry.columns={portrait:1,landscape:1};
      if(entry.layout==='image-left')entry.columns={portrait:Math.min(2,entry.columns.portrait),landscape:Math.min(2,entry.columns.landscape)};
      if(entry.tabs===undefined)entry.tabs=clone(prior?.tabs||seed?.tabs.map(t=>({id:t.id,label:t.label,visible:true}))||[]);
      if(!Array.isArray(entry.tabs)||!entry.tabs.length||entry.tabs.length>40||!unique(entry.tabs.map(t=>t&&t.id)))return result(false,'validation','每个栏目需保留1至40个不同Tab');
      const previousTabs=prior?.tabs||seed?.tabs||[];
      if(!can('home.delete',options.role)&&!preserves(previousTabs,entry.tabs,'id'))return result(false,'forbidden','仅高级编辑员可以删除Tab');
      if(!can('home.reorder',options.role)&&!sameOrder(previousTabs,entry.tabs,'id'))return result(false,'forbidden','仅高级编辑员可以排序Tab');
      for(const tab of entry.tabs) {
        if(!tab||Object.keys(tab).some(k=>!['id','label','visible','layout','columns'].includes(k))||(!seed?.tabs.some(t=>t.id===tab.id)&&(!stableId(tab.id)||!tab.id.startsWith('custom-')))||allTabIds.has(tab.id)||!text(tab.label,80)||!tab.label.trim()||typeof tab.visible!=='boolean'||(tab.layout!==undefined&&!layoutNames.includes(tab.layout)))return result(false,'validation','Tab标识、名称、可见性或排版无效');
        allTabIds.add(tab.id);
        if(tab.columns!==undefined&&!validColumns(tab.columns))return result(false,'validation','Tab横竖屏每行数量需为1至4的整数');
        if((tab.layout||entry.layout)==='banner')tab.columns={portrait:1,landscape:1};
        if((tab.layout||entry.layout)==='image-left'&&tab.columns)tab.columns={portrait:Math.min(2,tab.columns.portrait),landscape:Math.min(2,tab.columns.landscape)};
      }
      if(entry.visible&&!entry.tabs.some(t=>t.visible))return result(false,'validation','可见栏目至少保留一个可见Tab');
      if(entry.tabEntries!==undefined) {
        if(!entry.tabEntries||typeof entry.tabEntries!=='object'||Array.isArray(entry.tabEntries)) return result(false,'validation','栏目入口配置格式无效');
        for(const [tabId,ids] of Object.entries(entry.tabEntries)) {
          if(!entry.tabs.some(t=>t.id===tabId)||!unique(ids)||ids.length>24||ids.some(id=>!portalRef(id))) return result(false,'validation','Tab入口需引用有效且不同的内容，最多24个；新Tab可留空');
        }
      }
    }
    if(!c.portal.some(p=>p.visible))return result(false,'validation','至少保留一个可见栏目');
    if(c.shortcuts===undefined)c.shortcuts=shortcutSeeds(c);
    if(!Array.isArray(c.shortcuts)||!c.shortcuts.length||c.shortcuts.length>64||!unique(c.shortcuts.map(item=>item&&item.id)))return result(false,'validation','金刚位需保留1至64个不同入口');
    if(!can('home.delete',options.role)&&!preserves(config.shortcuts||shortcutSeeds(config),c.shortcuts,'id'))return result(false,'forbidden','仅高级编辑员可以删除金刚位');
    if(!can('home.reorder',options.role)&&!sameOrder(config.shortcuts||shortcutSeeds(config),c.shortcuts,'id'))return result(false,'forbidden','仅高级编辑员可以排序金刚位');
    for(const item of c.shortcuts) {
      if(!item||Object.keys(item).some(k=>!['id','title','cover','visible','targetType','targetId'].includes(k))||!stableId(item.id)||!text(item.title,80)||!text(item.cover,100)||typeof item.visible!=='boolean'||!['section','record'].includes(item.targetType)||!text(item.targetId,100))return result(false,'validation','金刚位名称、封面、标识或跳转类型无效');
      if(item.cover&&!assets.includes(item.cover))return result(false,'validation','金刚位封面需使用已登记的 GTA5 素材');
      if(item.targetType==='section'&&!c.portal.some(entry=>entry.sectionId===item.targetId))return result(false,'validation','金刚位跳转栏目不存在');
      if(item.targetType==='record'&&(!ref(item.targetId)||!item.title.trim()||!assets.includes(item.cover)))return result(false,'validation','词条金刚位需填写标题、登记封面与有效公共词条');
    }
    if(!shortcuts(c).some(item=>item.visible))return result(false,'validation','至少保留一个可见且可打开的金刚位');
    for(const r of records.values()) {const error=validate(r,c);if(error)return result(false,'validation','配置会使已有资料失效：'+error);}
    if(!text(options.summary,120)||!options.summary.trim()) return result(false,'validation','请填写配置修改说明（最多120字）');
    if(eq({...config,revision:0},{...c,revision:0})) return result(false,'unchanged','配置没有变化',config);
    if(options.fail) return result(false,'failed','配置保存失败，原配置未改变');
    c.revision=config.revision+1;config=c;
    return {...result(true,'success','配置已生效；隐藏字段的数据仍保留',config),config:clone(config)};
  }
  function create(input,options={}) {
    if(!can(input?.template==='entity'?'data.create':'entry.create',options.role)) return result(false,'forbidden','当前角色没有此类内容的新建权限');
    let r;try{r=clone(input);}catch(_){return result(false,'validation','内容无法读取');}
    if(!r||typeof r.id!=='string'||!/^[a-z][a-z0-9_-]{0,99}$/i.test(r.id)) return result(false,'validation','词条标识应以字母开头，仅包含字母、数字、下划线或短横线，最多100字符');
    if(records.has(r.id)||tombstones.has(r.id)) return result(false,'duplicate','词条标识已使用，请使用新的标识');
    r.revision=1;
    const error=validate(r);if(error) return result(false,'validation',error);
    if(r.template==='entity'&&r.title!==r.values.name) return result(false,'validation','实体名称与标题需保持一致');
    if(!text(options.summary,120)||!options.summary.trim()) return result(false,'validation','请填写创建说明（最多120字）');
    if(options.fail) return result(false,'failed','创建失败，未写入新内容');
    records.set(r.id,r);histories.set(r.id,[snapshot(r,options.summary.trim(),options.role)]);
    return result(true,'success','新词条已创建；可继续编辑并配置门户入口',r);
  }
  function remove(id,baseRevision,options={}) {
    const old=records.get(id);
    if(!old)return result(false,'unavailable','内容不存在或已删除');
    if(!can(old.template==='entity'?'data.delete':'entry.delete',options.role))return result(false,'forbidden','当前角色没有此类内容的删除权限');
    if(baseRevision!==old.revision)return result(false,'conflict','公开版本已变化，请重新载入后删除',old);
    if(!text(options.summary,120)||!options.summary.trim())return result(false,'validation','请填写删除说明（最多120字）');
    const references=[];
    for(const r of records.values()) {
      if(r.id===id)continue;
      if((r.entityIds||[]).includes(id)||(r.relatedIds||[]).includes(id)||(r.items||[]).some(item=>item.entityId===id)||(r.children||[]).some(item=>item.id===id)||r.blocks.some(block=>block.type==='related'&&(block.ids||[]).includes(id)))references.push({type:'record',id:r.id,title:r.title});
    }
    for(const section of sections())for(const tab of section.tabs)if(tab.entries.some(e=>e.recordId===id))references.push({type:'tab',id:tab.id,title:section.title+' / '+tab.label});
    for(const item of config.shortcuts||[])if(item.targetType==='record'&&item.targetId===id)references.push({type:'shortcut',id:item.id,title:item.title});
    if(references.length)return {...result(false,'referenced','仍被引用，先移除关联：'+references.slice(0,4).map(r=>r.title).join('、')+(references.length>4?'等'+references.length+'处':'')),references:clone(references)};
    if(options.fail)return result(false,'failed','删除失败，公开内容与历史未改变');
    const deleted={...clone(old),revision:old.revision+1};
    const history={...snapshot(deleted,options.summary.trim(),options.role),deleted:true};
    histories.get(id).unshift(history);tombstones.set(id,history);records.delete(id);
    return result(true,'success','已删除；删除记录保留在历史中，原标识不可复用',deleted);
  }
  function batchSave(input,options={}) {
    if(!can('data.batch',options.role))return result(false,'forbidden','仅初级或高级编辑员可以批量编辑模板数据');
    let rows;try{rows=clone(input);}catch(_){return result(false,'validation','批量数据无法读取');}
    if(!Array.isArray(rows)||!rows.length||rows.length>100||!unique(rows.map(row=>row?.record?.id)))return result(false,'validation','批量编辑需包含1至100条不同实体');
    const staged=[];let schemaId;
    for(const row of rows) {
      const r=row?.record,old=r&&records.get(r.id);
      if(!old||old.template!=='entity'||r.template!=='entity')return result(false,'validation','批量编辑仅支持既有实体模板数据');
      if(row.baseRevision!==old.revision)return result(false,'conflict','批量数据中“'+old.title+'”已变化，请核对最新内容',old);
      if(r.schemaId!==old.schemaId||(schemaId&&r.schemaId!==schemaId))return result(false,'validation','一次批量编辑需使用同一字段方案，实体身份不能改变');
      schemaId=r.schemaId;
      if(r.values&&r.title!==r.values.name) {
        const renamed=r.values.name!==old.values.name,retitled=r.title!==old.title;
        if(renamed&&retitled)return result(false,'validation','实体名称与标题需保持一致');
        if(renamed)r.title=r.values.name;else if(retitled)r.values.name=r.title;
      }
      if(options.role==='editor') {
        const allowed=['title','summary','blocks','values','items','relatedIds','relatedPostIds','children'];
        if([...new Set([...Object.keys(old),...Object.keys(r)])].some(key=>!allowed.includes(key)&&!eq(old[key],r[key])))return result(false,'forbidden','初级编辑员只能批量更改数据内容，不能更改身份或结构');
        const identity=(items,keys)=>Array.isArray(items)?items.map(item=>Object.fromEntries(keys.map(key=>[key,item?.[key]]))).sort((a,b)=>String(a.id).localeCompare(String(b.id))):items===undefined?[]:null;
        if(!eq(identity(old.items,['id','entityId']),identity(r.items,['id','entityId']))||!eq(identity(old.children,['id','current']),identity(r.children,['id','current'])))return result(false,'forbidden','初级编辑员不能批量更改关联对象身份');
      }
      const error=validate(r);if(error)return result(false,'validation',old.title+'：'+error);
      if(eq({...old,revision:0},{...r,revision:0}))continue;
      r.revision=old.revision+1;staged.push(r);
    }
    if(!text(options.summary,120)||!options.summary.trim())return result(false,'validation','请填写批量修改说明（最多120字）');
    if(!staged.length)return result(false,'unchanged','批量数据没有变化');
    if(options.fail)return result(false,'failed','批量保存失败，全部输入保留，公开内容未变');
    const prior=records;records=new Map(prior);staged.forEach(r=>records.set(r.id,r));
    for(const r of records.values()) {const error=validate(r);if(error){records=prior;return result(false,'validation','批量变更会使现有引用失效：'+error);}}
    staged.forEach(r=>histories.get(r.id).unshift(snapshot(r,options.summary.trim(),options.role)));
    return {...result(true,'success','批量数据已一次保存，公开内容与历史已同步'),records:clone(staged)};
  }
  reset();
  GH.guideStore=Object.freeze({list:()=>clone([...records.values()]),get:id=>clone(records.get(id)||null),sections:override=>clone(sections(override)),shortcuts:override=>clone(shortcuts(override)),schema:(id,override)=>clone(schema(id,override)),schemas:override=>clone(schemas(override)),config:()=>clone(config),reset,history:id=>clone(histories.get(id)||[]),save,configure,create,can,delete:remove,remove,batchSave});
})();
