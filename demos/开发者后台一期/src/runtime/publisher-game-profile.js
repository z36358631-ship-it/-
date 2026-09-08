/* 02 游戏资料与宣发：Blob 素材、本页校验、草稿保存与待审核版本。 */
(function () {
  'use strict';
  const genres = ['角色扮演', '休闲', '动作', '策略', '模拟', '益智', '街机', '冒险'];
  const genreEn = ['Role-playing', 'Casual', 'Action', 'Strategy', 'Simulation', 'Puzzle', 'Arcade', 'Adventure'];
  const targetInterestOptions = [['role_playing', '角色扮演', 'Role-playing'], ['action', '动作', 'Action'], ['strategy', '策略', 'Strategy'], ['simulation', '模拟经营', 'Simulation'], ['casual', '休闲益智', 'Casual & puzzle'], ['shooter', '射击', 'Shooter'], ['racing', '体育竞速', 'Sports & racing'], ['adventure', '冒险解谜', 'Adventure & puzzle']];
  const platforms = ['Windows', 'macOS', 'Linux'];
  const relationships = { developer: ['开发商', 'Developer'], publisher: ['发行商', 'Publisher'], developer_publisher: ['开发商和发行商', 'Developer and publisher'] };
  const plans = { reservation: ['游戏还没好，先开放预约', 'Start with reservations'], test: ['先开一次测试', 'Run a playtest first'], launch: ['已有游戏，准备上线', 'Prepare the game for launch'] };
  const sections = ['basic', 'classification', 'developer', 'assets', 'builds', 'pricing', 'publication', 'qualification', 'settings'];
  const releaseStates = { coming_soon: ['敬请期待', 'Coming soon'], pre_registration: ['预约', 'Pre-registration'], demo: ['正式上线（试玩版）', 'Released (demo)'], released: ['正式上线', 'Released'] };
  const VERSION_PAGE_SIZE = 20;
  const developerPortalUrl = 'https://developer.xiaoji.com';
  const statusFromPlan = plan => ({ reservation: 'pre_registration', test: 'demo', launch: 'released' }[plan] || 'coming_soon');
  const words = {
    title: ['版本发布', 'Version release'], currentVersion: ['当前版本', 'Current version'], reviewStatus: ['审核状态', 'Review status'], draft: ['待提交', 'Draft'], reviewing: ['审核中', 'In review'], approved: ['审核通过', 'Approved'], rejected: ['需修改', 'Changes requested'],
    approvedNotice: ['上次提交已审核通过并保存为不可变版本。当前工作草稿可继续编辑，再次提审将生成新版本。', 'The last submission was approved and saved as an immutable version. You can keep editing the working draft; the next review creates a new version.'], rejectedNotice: ['本次资料未通过审核，请根据原因修改后重新提交。', 'Changes are needed. Update the details using the feedback, then resubmit for review.'], resubmit: ['重新提交审核', 'Resubmit for review'], reviewer: ['审核人', 'Reviewer'], reviewedAt: ['审核时间', 'Reviewed at'], reviewReason: ['驳回原因', 'Reason for rejection'],
    saved: ['所有更改已保存', 'All changes saved'], unsaved: ['有未保存的更改', 'Unsaved changes'], neverSaved: ['尚未保存', 'Not saved yet'], saving: ['正在保存…', 'Saving…'], submitting: ['正在提交…', 'Submitting…'], save: ['保存草稿', 'Save draft'], submit: ['提交上架审核', 'Submit for release review'],
    reviewPreparation: ['提交上架审核', 'Prepare release review'], confirmSubmit: ['确认提交审核', 'Confirm submission'], releaseTerritories: ['发布地区', 'Release countries / regions'], territoryRequired: ['请选择至少一个发布地区及其发行状态。', 'Choose at least one country or region and its release status.'], territoryInvalid: ['请检查发布地区和发行状态。', 'Check the selected countries and release statuses.'], assetInherited: ['当前语种未上传，以下展示默认语种素材；可上传本语种版本替换。', 'No localized upload yet. Default language assets are shown below; upload a localized version to replace them.'], assetLocaleHint: ['各语种素材独立保存；未配置的素材使用默认语种素材。默认语种的图标、横版宣传图和游戏截图为必填。', 'Assets are saved separately for each language. Missing localized assets use the default language assets. The default icon, landscape image, and screenshots are required.'],
    withdraw: ['撤销审核', 'Withdraw review'], withdrawing: ['正在撤销…', 'Withdrawing…'], withdrawFailed: ['撤销未完成，请查看当前审核状态后重试。已提交内容不会丢失。', 'Withdrawal could not be completed. Check the current review status and try again. Your submitted content is preserved.'],
    completion: ['必填完成', 'Required fields'], remaining: ['还差 {count} 项', '{count} items to complete'], complete: ['已完善', 'Complete'], incomplete: ['待完善', 'Incomplete'], completeAll: ['必填信息已完整', 'Required information is complete'],
    locked: ['资料已提交审核，当前版本已锁定。可撤销审核后继续修改，尚未公开发布。', 'The current version is locked while its details are in review. Withdraw the review to continue editing. It has not been published.'], submissionId: ['提交编号', 'Submission ID'], submittedAt: ['提交时间', 'Submitted at'],
    classification: ['游戏分类与平台', 'Classification and platforms'], classificationHint: ['设置游戏类型和发布平台。', 'Set the game genres and release platforms.'],
    pricing: ['收费设置', 'Pricing settings'], pricingHint: ['选择免费提供，或按发行范围设置单次买断价格。', 'Offer the game for free or set a one-time purchase price for each release scope.'], pricingModel: ['收费方式', 'Pricing model'], free: ['免费', 'Free'], paid: ['收费（单次买断）', 'Paid (one-time purchase)'], freeHint: ['免费向玩家提供完整游戏。', 'Players can access the full game for free.'], paidHint: ['玩家一次购买后即可游玩完整游戏。', 'Players purchase the full game once.'], globalPrice: ['全球服售价（USD）', 'Global price (USD)'], domesticPrice: ['国内服售价（CNY）', 'Domestic price (CNY)'], priceHint: ['请输入大于 0 的金额，最多 2 位小数。', 'Enter an amount greater than 0 with up to 2 decimal places.'], pricingModelRequired: ['请选择免费或收费（单次买断）。', 'Select free or a one-time paid purchase.'], priceRequired: ['请填写大于 0 的售价，最多 2 位小数。', 'Enter a price greater than 0 with up to 2 decimal places.'], discountInvalid: ['折扣价须低于售价，并设置开始早于结束、结束时间尚未到期的折扣期限。', 'Set a discount below the list price with a valid start time and a future end time.'], pricingRegionHint: ['请先在发行设置中选择发布地区，再填写对应售价。', 'Select release regions in Release settings, then enter the relevant prices.'], pricingUnconfigured: ['历史未配置', 'Not recorded'], pricingLegacy: ['历史提交未记录收费设置，按原提交内容保留。', 'Pricing was not recorded in this historical submission. Its original details are preserved.'], pricingLegacyEdit: ['历史提交未记录收费设置，请选择本次提交的收费方式。', 'Pricing was not recorded in this historical submission. Choose a pricing model for this submission.'],
    genres: ['游戏类型', 'Game genres'], relationship: ['当前主体与该游戏的关系', 'Company relationship to this game'], releasePlan: ['当前发布计划', 'Current release plan'], platforms: ['发布平台', 'Release platforms'], choose: ['请选择', 'Please select'],
    releaseRegions: ['发行范围', 'Release regions'], regionRequired: ['请选择全球服或国内服。', 'Select a global or domestic release.'],
    contentLanguage: ['资料填写语言', 'Content language'], contentZh: ['中文', 'Chinese'], contentEn: ['英语', 'English'], contentRequired: ['当前发行范围必填', 'Required for the selected release'], contentOptional: ['选填资料', 'Optional content'],
    contentHint: ['国内服使用中文资料，全球服使用英语资料；切换保留原文，各语种素材可独立管理。', 'Domestic releases use Chinese content and global releases use English content. Switching keeps your entries; localized assets are managed separately.'],
    legacyRegions: ['此历史审核版本未配置发行范围，按原提交资料展示。', 'This historical submission has no release region. Its original submitted details are preserved.'], legacyContent: ['原有单份介绍保留在英语资料中，请核对并补充对应语言内容。', 'The previous single-language text is kept in English content. Review its language and complete the appropriate version.'],
    licenseNumber: ['游戏版号', 'Game publication approval number'], licenseRequired: ['国内服发行必须填写游戏版号。', 'A game publication approval number is required for a domestic release.'], licenseHint: ['国内服发行提审必填。请填写游戏获批的版号；草稿可暂不填写。', 'Required when submitting a domestic release. Enter the game’s approved publication number; it may be left empty in a draft.'],
    basic: ['基础信息', 'Basic information'], basicHint: ['填写展示给玩家的游戏名称与介绍。', 'Add the game names and descriptions shown to players.'], gameNameEn: ['游戏名称（英语）', 'Game name (English)'], gameNameZh: ['游戏名称（中文）', 'Game name (Chinese)'], tagline: ['一句话介绍（英语）', 'Short description (English)'], description: ['完整介绍（英语）', 'Full description (English)'], taglineZh: ['一句话介绍（中文）', 'Short description (Chinese)'], descriptionZh: ['完整介绍（中文）', 'Full description (Chinese)'], developerWordsZh: ['开发者的话（中文）', 'A note from the developer (Chinese)'],
    icon: ['游戏图标', 'Game icon'], iconHint: ['方图，不低于 512 × 512 px · JPG / PNG · 单张不超过 20 MB', 'Square image, at least 512 × 512 px · JPG / PNG · Up to 20 MB'],
    developer: ['开发者信息', 'Developer information'], developerHint: ['认证主体来自厂商资料；发行商需补齐实际开发商。', 'The verified company comes from your company details. Publishers must identify the actual developer.'], company: ['当前认证主体', 'Verified company'], developerName: ['开发商名称', 'Developer name'], developerWords: ['开发者的话', 'A note from the developer'], developerWordsHint: ['分享开发想法与创作故事，避免重复游戏介绍。', 'Share the story and ideas behind your game, without repeating its description.'],
    assets: ['游戏素材', 'Game assets'], assetsHint: ['准备宣传图片、游戏截图与视频，各类素材独立维护。', 'Add promotional images, screenshots, and videos. Each asset category is managed separately.'], images: ['宣传图', 'Promotional images'], screenshots: ['游戏截图', 'Screenshots'], videos: ['视频', 'Videos'], landscape: ['横版宣传图', 'Landscape promotional images'], portrait: ['竖版宣传图', 'Portrait promotional images'], landscapeHint: ['16:9 · 至少 1 张 · JPG / PNG · 单张不超过 20 MB', '16:9 · At least 1 image · JPG / PNG · Up to 20 MB each'], portraitHint: ['3:4 推荐比例 · 选填 · JPG / PNG · 单张不超过 20 MB', 'Recommended ratio: 3:4 · Optional · JPG / PNG · Up to 20 MB each'], screenshotsHint: ['至少 3 张真实游戏截图 · JPG / PNG · 单张不超过 20 MB', 'At least 3 real gameplay screenshots · JPG / PNG · Up to 20 MB each'],
    trailer: ['宣传片', 'Trailer'], trailerHint: ['推荐 16:9、1280 × 720 · MP4 · 不超过 1 GB · 选填', 'Recommended: 16:9, 1280 × 720 · MP4 · Up to 1 GB · Optional'], gameplay: ['游戏实机录屏', 'Gameplay recording'], gameplayHint: ['15 秒–30 分钟 · MP4 · 不超过 1 GB · 选填', '15 seconds–30 minutes · MP4 · Up to 1 GB · Optional'],
    upload: ['上传文件', 'Upload file'], add: ['添加素材', 'Add asset'], replace: ['替换', 'Replace'], remove: ['移除', 'Remove'], uploading: ['正在检查素材…', 'Checking assets…'], batchLandscape: ['批量上传横版宣传图', 'Upload landscape images'], batchPortrait: ['批量上传竖版宣传图', 'Upload portrait images'], batchScreenshots: ['批量上传游戏截图', 'Upload screenshots'], dropHint: ['将图片拖入此区域，或点击按钮选择。文件会加入当前图片类别。', 'Drop images here or use the button. Images will be added to the current category.'], noAssets: ['暂无素材', 'No assets yet'], legacy: ['原文件需重新选择', 'Select the original file again'],
    settings: ['其他设置', 'Other settings'], settingsHint: ['补充游戏官网与玩家交流方式。', 'Add the official website and community details.'], website: ['游戏官网链接', 'Official game website'], playerGroupName: ['玩家交流群名', 'Player group name'], playerGroupNumber: ['玩家交流群号', 'Player group ID'], groupHint: ['群名与群号需同时填写或同时留空。', 'Provide both a group name and ID, or leave both empty.'], languages: ['支持语言', 'Supported languages'], requirements: ['最低运行要求', 'Minimum requirements'], requirementHint: ['填写该 PC 系统的最低运行要求', 'Enter the minimum requirements for this PC system'],
    qualification: ['资质认证', 'Qualifications'], qualificationHint: ['沿用当前主体关系对应的权属或发行授权材料。', 'Provide the ownership or distribution authorization documents for your company relationship.'], rights: ['自研权属证明', 'Proof of game ownership'], authorization: ['游戏发行授权链', 'Distribution authorization'], rightsHint: ['提交自研及完整权利声明或适用的权属证明。软件著作权可作为证明之一，不是海外发行统一必填项。', 'Provide an ownership declaration or applicable proof of rights. A software copyright certificate is one possible proof, not a universal requirement for overseas releases.'], authorizationHint: ['授权材料需覆盖权利方、授权地区、PC 平台、渠道与有效期。', 'Authorization must identify the rights holder, regions, PC platforms, channels, and validity period.'], copyright: ['软件著作权（选填）', 'Software copyright certificate (optional)'], mainland: ['中国大陆发行审批（按实际范围适用）', 'Mainland China approval (where applicable)'], mainlandHint: ['仅在发行范围包含中国大陆时适用；海外发行不会因未填写版号而被阻断。', 'Applies only if the release includes mainland China. A missing mainland approval does not block an overseas release.'], documentHint: ['PDF / JPG / PNG', 'PDF / JPG / PNG'],
    publication: ['发行设置', 'Release settings'], publicationHint: ['统一设置发行状态、发布地区和生效时间。完成资料后，从顶部提交审核。', 'Set a shared release status, target regions, and effective time, then submit from the top of the page.'], releaseStatus: ['发行状态', 'Release status'], releaseStatusHint: ['所有已选地区使用同一发行状态。', 'All selected regions use the same release status.'], releaseStatusRequired: ['请选择发行状态。', 'Select a release status.'], targetUserInterests: ['目标用户游戏兴趣', 'Target player interests'], targetUserInterestsHint: ['用于精准分发，匹配近期体验或下载过相似游戏的用户。', 'Used for precise distribution to users who recently played or downloaded similar games.'], effectiveTime: ['生效时间', 'Effective time'], historicalStatus: ['历史提交保留原地区发行状态。', 'This historical submission retains its original region-specific statuses.'], immediate: ['审核后立即生效', 'Take effect after approval'], scheduled: ['定时生效', 'Schedule after approval'], scheduleTime: ['计划生效时间', 'Scheduled effective time'], scheduleHint: ['请选择未来时间。只有审核通过后才可按计划生效。', 'Choose a future time. The schedule can take effect only after approval.'], timeZone: ['时间按当前浏览器时区：{zone}', 'Times use the current browser time zone: {zone}'], reviewHint: ['本次提交仅进入资料审核，不代表已经通过审核或公开发布。', 'Submitting sends the details for review. It does not approve or publish the game.'],
    builds: ['PC 包体', 'PC builds'], readyFull: ['可发布整包', 'Release-ready full package'], buildRequired: ['请至少上传 1 个已解析通过的游戏整包。', 'Upload at least one parsed full package.'],
    missingTitle: ['请补充以下信息', 'Complete the following information'], missingHint: ['点击条目定位到对应字段，完成后可再次提交。', 'Select an item to go to its field, then submit again when ready.'], hide: ['收起', 'Collapse'], show: ['展开', 'Expand'], optional: ['选填', 'Optional'],
    required: ['请填写此项。', 'Please complete this field.'], selectionRequired: ['请至少选择一项。', 'Please select at least one option.'], relationshipRequired: ['请选择当前主体与游戏的关系。', 'Please select the company relationship.'], planRequired: ['请选择当前发布计划。', 'Please select the current release plan.'], nameTooLong: ['游戏名称最多 100 个字符。', 'Game names must be 100 characters or fewer.'], wordsTooLong: ['开发者的话最多 5000 个字符。', 'The developer note must be 5,000 characters or fewer.'], iconRequired: ['请上传有效的游戏图标。', 'Please upload a valid game icon.'], landscapeRequired: ['请上传至少 1 张有效横版宣传图。', 'Please upload at least 1 valid landscape image.'], screenshotsRequired: ['请上传至少 3 张有效游戏截图。', 'Please upload at least 3 valid screenshots.'], documentRequired: ['请上传对应的有效证明文件。', 'Please upload the required proof document.'], fileUnavailable: ['素材文件不可用，请重新选择或移除。', 'This file is unavailable. Select it again or remove it.'], imageType: ['仅支持 JPG / PNG 图片。', 'Only JPG / PNG images are supported.'], imageSize: ['单张图片不能超过 20 MB。', 'Each image must be 20 MB or smaller.'], imageRead: ['无法读取此图片，请重新选择。', 'The image could not be read. Please select another file.'], iconDimensions: ['图标必须为不低于 512 × 512 px 的方图。', 'The icon must be square and at least 512 × 512 px.'], landscapeRatio: ['横版宣传图需要使用 16:9 比例。', 'Landscape promotional images must have a 16:9 ratio.'], videoType: ['请上传 MP4 视频。', 'Please upload an MP4 video.'], videoSize: ['单个视频不能超过 1 GB。', 'Each video must be 1 GB or smaller.'], videoRead: ['无法读取视频信息，请重新选择。', 'The video metadata could not be read. Please select another file.'], gameplayDuration: ['实机录屏时长须为 15 秒至 30 分钟。', 'Gameplay recordings must be between 15 seconds and 30 minutes.'], documentType: ['证明文件仅支持 PDF / JPG / PNG。', 'Proof documents must be PDF / JPG / PNG files.'], documentRead: ['无法读取有效的证明文件。', 'The proof document could not be read.'], websiteInvalid: ['请输入有效的 http:// 或 https:// 官网地址。', 'Enter a valid http:// or https:// website address.'], groupPair: ['请同时填写玩家交流群名和群号。', 'Please provide both the player group name and ID.'], futureRequired: ['请选择未来的计划生效时间。', 'Please choose a future effective time.'], saveFailed: ['保存失败，已填写内容与素材仍保留，请重试。', 'Saving failed. Your entries and files have been kept. Please try again.'], submitFailed: ['提交失败，已填写内容与素材仍保留，请重试。', 'Submission failed. Your entries and files have been kept. Please try again.'], uploadBusy: ['素材仍在检查中，请稍后保存或提交。', 'Assets are still being checked. Please wait before saving or submitting.'],
  };
  const t = (lang, key, params = {}) => (words[key]?.[lang === 'en' ? 1 : 0] || window.PublisherGameQualifications.text(lang, key) || key).replace(/\{(\w+)\}/g, (_, p) => params[p] ?? '');
  const esc = value => String(value ?? '').replace(/[&<>"']/g, char => ({ '&': '&amp;', '<': '&lt;', '>': '&gt;', '"': '&quot;', "'": '&#39;' }[char]));
  const runtime = new WeakMap();
  const imageLimit = 20 * 1024 * 1024;
  const videoLimit = 1024 * 1024 * 1024;
  const isBlob = value => typeof Blob !== 'undefined' && value instanceof Blob;
  const validFile = file => Boolean(file && isBlob(file.blob) && file.blob.size > 0 && file.size === file.blob.size);
  const validImage = file => validFile(file) && ['image/jpeg', 'image/png'].includes(file.type) && file.width > 0 && file.height > 0 && file.size <= imageLimit;
  const validIcon = file => validImage(file) && file.width === file.height && file.width >= 512;
  const ratio16 = file => Math.abs(file.width / file.height - 16 / 9) < 0.025;
  const fileRecord = file => typeof file === 'string' ? (file ? { name: file, legacy: true } : null) : file && typeof file === 'object' ? file : null;
  const fileArray = value => (Array.isArray(value) ? value : value ? [value] : []).map(fileRecord).filter(Boolean);
  const emptyAssets = () => ({ icon: null, landscape: [], portrait: [], screenshots: [], trailer: null, gameplay: null });
  const assetLocale = (draft, key) => key === 'assets.icon' ? draft.currentNameLanguage : draft.assetLanguageSettings.currentNameLanguage;
  const resolvedKey = (obj, key) => key.startsWith('assets.') && obj.localizedAssets ? `localizedAssets.${assetLocale(obj, key)}.${key.slice(7)}` : key;
  const get = (obj, key) => resolvedKey(obj, key).split('.').reduce((value, part) => value?.[part], obj);
  const set = (obj, key, value) => { const parts = resolvedKey(obj, key).split('.'); const last = parts.pop(); let cursor = obj; parts.forEach(part => { cursor = cursor[part] ||= {}; }); cursor[last] = value; };
  const id = key => `profile-${key.replace(/[^a-zA-Z0-9_-]/g, '-')}`;
  const sectionOf = key => key.startsWith('buildPackages') ? 'builds' : key.startsWith('catalog.') || key.startsWith('pricing.') ? 'pricing' : key.startsWith('releaseConfig.') || key.startsWith('publication.') || ['releaseRegions', 'releaseTerritories', 'releaseStatus', 'targetUserInterests'].includes(key) ? 'publication' : key.startsWith('assets.') || key.startsWith('localizedAssets.') ? (key.endsWith('.icon') ? 'basic' : 'assets') : key.startsWith('qualificationFiles.') || key.startsWith('qualifications.') || key.startsWith('compliance.') || key === 'licenseNumber' ? 'qualification' : key.startsWith('requirements.') || ['website', 'playerGroupName', 'playerGroupNumber'].includes(key) ? 'settings' : ['genres', 'platforms'].includes(key) ? 'classification' : ['relationship', 'developerName', 'developerWords', 'developerWordsZh'].includes(key) || key.endsWith('.developerWords') ? 'developer' : 'basic';
  const moduleOf = key => ({ builds: 'builds', pricing: 'catalog', publication: 'release', qualification: 'qualification' }[sectionOf(key)] || 'profile');
  const labelFor = (lang, key) => key === 'buildPackages.readyFull' ? t(lang, 'readyFull') : key === 'pricing.model' ? t(lang, 'pricingModel') : key === 'qualifications.mainland' ? t(lang, 'mainlandScan') : key.startsWith('gameNames.') ? `${lang === 'en' ? 'Game name' : '游戏名称'} · ${window.PublisherGameNames.label(key.split('.')[1], lang)}` : key.startsWith('requirements.') ? `${key.slice(13)} · ${t(lang, 'requirements')}` : t(lang, key.split('.').pop() === 'scheduledAt' ? 'scheduleTime' : key.split('.').pop());
  const lock = draft => draft.reviewStatus === 'reviewing' || draft.saving || draft.submitting || draft.withdrawing;
  const contentRequired = (draft, language) => draft.legacyReview ? language === 'en' : language === (draft.releaseConfig?.mode === 'domestic' ? 'zh' : 'en');
  const contentKeys = language => language === 'zh' ? ['gameNameZh', 'taglineZh', 'descriptionZh'] : ['gameNameEn', 'tagline', 'description'];
  const displayName = draft => String(draft.gameNames?.[draft.defaultNameLanguage] || draft.gameName || (draft.releaseRegions?.includes('domestic') ? draft.gameNameZh || draft.gameNameEn : draft.gameNameEn || draft.gameNameZh) || '').trim();
  const stateFor = draft => { let state = runtime.get(draft); if (!state) { state = { root: null, urls: new Map(), uploads: new Map(), uploadSequence: 0, focus: null, observer: null, versionRequest: 0, versionPage: 1, versionViewer: { status: 'list', submissionId: '', record: null }, demoReleaseState: { open: false, active: false, status: 'reviewing' } }; runtime.set(draft, state); } return state; };
  function urlFor(draft, file) {
    if (!validFile(file)) return '';
    const state = stateFor(draft);
    if (!state.urls.has(file.blob)) state.urls.set(file.blob, URL.createObjectURL(file.blob));
    return state.urls.get(file.blob);
  }
  function validSchedule(draft) {
    const time = new Date(draft.publication.scheduledAt).getTime();
    const submitted = draft.reviewStatus === 'reviewing' && Boolean(draft.submissionId);
    return Number.isFinite(time) && (submitted || time > Date.now());
  }
  const validPrice = value => /^\d+(?:\.\d{1,2})?$/.test(String(value ?? '').trim()) && Number.isFinite(Number(value)) && Number(value) > 0;
  const pricingIsHistorical = draft => !draft.pricing && draft.legacyPricing && ['reviewing', 'approved'].includes(draft.reviewStatus) && Boolean(draft.submissionId);
  const emptySku = (type = 'dlc', index = 0) => ({ skuId: type === 'base_game' ? 'BASE' : `DLC-${String(index + 1).padStart(3, '0')}`, type, title: type === 'base_game' ? '基础游戏' : `DLC ${index + 1}`, installContentRef: '', pricingModel: 'free', listPrice: '', discountPrice: '', discountStartAt: '', discountEndAt: '' });
  const normalizeSku = (value, type, index = 0) => ({ ...emptySku(type, index), ...(value || {}), type });
  const skuList = draft => [draft.catalog.baseGame, ...(draft.catalog.dlcs || [])];
  const currencyFor = draft => draft.releaseConfig?.mode === 'domestic' ? 'CNY' : 'USD';
  const validDiscount = (sku, allowExpired = false) => {
    if (!sku.discountPrice && !sku.discountStartAt && !sku.discountEndAt) return true;
    const start = new Date(sku.discountStartAt).getTime();
    const end = new Date(sku.discountEndAt).getTime();
    return validPrice(sku.discountPrice)
      && Number(sku.discountPrice) < Number(sku.listPrice)
      && Number.isFinite(start)
      && Number.isFinite(end)
      && start < end
      && (allowExpired || end > Date.now());
  };
  function createDraft(game = {}, stored) {
    const source = stored || game.profileDraft || {};
    const releaseSelectionWasConfigured = Boolean(
      source.releaseConfig && Object.prototype.hasOwnProperty.call(source.releaseConfig, 'globalTerritoryCodes')
    ) || Array.isArray(source.releaseTerritories);
    const normalized = window.PublisherStorageSchema?.normalizeDraft(source, game) || source;
    const profile = normalized.gameProfileDraft || {};
    const old = { ...source,
      gameNames: profile.gameNames || source.gameNames,
      nameLanguages: normalized.storeLocales?.enabled || source.nameLanguages,
      defaultNameLanguage: normalized.storeLocales?.default || source.defaultNameLanguage,
      currentNameLanguage: normalized.storeLocales?.current || source.currentNameLanguage,
      localizedContent: profile.localizedContent || source.localizedContent,
      localizedAssets: profile.localizedAssets || source.localizedAssets,
      genres: profile.genres || source.genres,
      platforms: profile.platforms || source.platforms,
      relationship: profile.relationship || source.relationship,
      developerName: profile.developerName ?? source.developerName,
      website: profile.website ?? source.website,
      playerGroupName: profile.playerGroupName ?? source.playerGroupName,
      playerGroupNumber: profile.playerGroupNumber ?? source.playerGroupNumber,
      listedElsewhere: profile.listedElsewhere ?? source.listedElsewhere,
    };
    const created = game.createData || {};
    const projectOnly = Boolean(game.projectName || created.projectName);
    const selectedPlatforms = (old.platforms || game.platforms || created.platforms || String(game.systems || 'Windows').split(/[／/]/)).filter(platform => platforms.includes(platform));
    const oldAssets = old.assets || {};
    const legacyQualifications = source.qualifications && !('activeVersion' in source.qualifications) ? source.qualifications : {};
    const day = new Date();
    const today = `${day.getFullYear()}${String(day.getMonth() + 1).padStart(2, '0')}${String(day.getDate()).padStart(2, '0')}`;
    const names = window.PublisherGameNames.createData({ ...created, ...old, gameNameEn: old.gameNameEn ?? created.gameNameEn ?? (projectOnly ? '' : game.name ?? ''), gameNameZh: old.gameNameZh ?? created.gameNameZh ?? '' });
    const assetLanguageSettings = window.PublisherGameNames.createData(old.assetLanguageSettings || { nameLanguages: [names.defaultNameLanguage], defaultNameLanguage: names.defaultNameLanguage });
    const immutable = ['reviewing', 'approved'].includes(old.reviewStatus) && Boolean(old.submissionId);
    const releasePlan = old.releasePlan || game.releasePlan || created.releasePlan || 'launch';
    const priorStatuses = [...new Set((old.releaseTerritories || []).map(item => item.status))];
    const releaseStatus = old.releaseStatus || (priorStatuses.length === 1 && releaseStates[priorStatuses[0]] ? priorStatuses[0] : statusFromPlan(releasePlan));
    const originalTerritories = Array.isArray(old.releaseTerritories) ? old.releaseTerritories : immutable ? [] : window.PublisherReleaseRegions.defaultTerritories(releaseStatus);
    const releaseTerritories = originalTerritories.map(item => ({ ...item, ...(immutable && !old.releaseStatus ? {} : { status: releaseStatus }) }));
    const priorPricing = old.pricing ?? created.pricing;
    const legacyPricing = !priorPricing && Boolean(old.legacyPricing || old.submissionId);
    const pricing = legacyPricing ? null : priorPricing ? { model: String(priorPricing.model ?? ''), globalPrice: String(priorPricing.globalPrice ?? ''), domesticPrice: String(priorPricing.domesticPrice ?? '') } : { model: 'free', globalPrice: '', domesticPrice: '' };
    const draft = {
      ...names,
      gameKey: game.gameKey || old.gameKey || '', versionName: old.versionName || created.versionName || `V-${today}`,
      gameNameEn: old.gameNameEn ?? created.gameNameEn ?? (projectOnly ? '' : game.name ?? ''), gameNameZh: old.gameNameZh ?? created.gameNameZh ?? '',
      tagline: old.tagline ?? '', description: old.description ?? '', developerWords: old.developerWords ?? '',
      taglineZh: old.taglineZh ?? '', descriptionZh: old.descriptionZh ?? '', developerWordsZh: old.developerWordsZh ?? '',
      releaseRegions: immutable ? [...(old.releaseRegions || [])] : window.PublisherReleaseRegions.regionsFor(releaseTerritories, { fallbackGlobal: false }),
      releaseTerritories, releaseStatus, legacyReleaseStatus: Boolean(immutable && !old.releaseStatus),
      pricing, legacyPricing,
      legacyTerritories: Boolean(['reviewing', 'approved'].includes(old.reviewStatus) && old.submissionId && !Array.isArray(old.releaseTerritories)),
      licenseNumber: old.licenseNumber ?? '',
      legacyReview: Boolean(['reviewing', 'approved'].includes(old.reviewStatus) && (old.legacyReview || (old.submissionId && !Array.isArray(old.releaseRegions)))),
      legacyContent: Boolean(old.legacyContent ?? (!Array.isArray(old.releaseRegions) && (old.tagline || old.description || old.developerWords))),
      genres: [...(old.genres || game.genres || created.genres || [])], relationship: old.relationship || game.relationship || created.relationship || 'developer_publisher',
      developerName: old.developerName ?? game.developerName ?? created.developerName ?? game.developer ?? '星海互动',
      platforms: [...selectedPlatforms], releasePlan: old.releasePlan || game.releasePlan || created.releasePlan || 'launch',
      languages: [...(old.languages || ['简体中文', 'English'])].map(value => value === '英语' ? 'English' : value),
      requirements: { ...(old.requirements || {}) },
      listedElsewhere: Boolean(old.listedElsewhere ?? created.listedElsewhere), website: old.website || '', playerGroupName: old.playerGroupName || '', playerGroupNumber: old.playerGroupNumber || '',
      targetUserInterests: [...(old.targetUserInterests || old.releaseConfig?.targetUserInterests || (projectOnly ? [] : ['role_playing', 'adventure']))].filter(value => targetInterestOptions.some(([key]) => key === value)),
      assets: { icon: fileRecord(oldAssets.icon), landscape: fileArray(oldAssets.landscape), portrait: fileArray(oldAssets.portrait), screenshots: fileArray(oldAssets.screenshots), trailer: fileRecord(oldAssets.trailer || oldAssets.video), gameplay: fileRecord(oldAssets.gameplay) },
      buildPackages: window.PublisherGameBuilds.createPackages(normalized.buildPackages || old.buildPackages || []),
      qualificationFiles: Object.fromEntries(['rights', 'authorization', 'copyright', 'mainland', 'safety', 'icp'].map(key => [key, fileRecord(legacyQualifications[key])])),
      qualifications: window.PublisherGameQualifications.createQualificationState(normalized.qualifications || { rightsRelationship: 'self_owned', rightsDeclarationAccepted: false, activeVersion: null, pendingApplication: null, history: [], draft: {} }),
      qualificationErrors: {}, qualificationSubmitting: false, qualificationWithdrawing: false,
      compliance: window.PublisherGameQualifications.createData(old),
      publication: { mode: old.publication?.mode === 'scheduled' ? 'scheduled' : 'immediate', scheduledAt: old.publication?.scheduledAt || '' },
      reviewStatus: ['reviewing', 'approved', 'rejected'].includes(old.reviewStatus) && old.submissionId ? old.reviewStatus : 'draft', submissionId: old.submissionId || '', submittedAt: old.submittedAt || (old.submissionId ? old.savedAt : '') || '', reviewResult: old.reviewResult || null, savedAt: old.savedAt || '', saving: false, submitting: false, withdrawing: false, dirty: Boolean(old.dirty), errors: {},
      localizedContent: structuredClone(old.localizedContent || {}), localizedAssets: { ...(old.localizedAssets || {}) }, assetLanguageSettings,
      ui: { assetTab: 'images', imageCategory: 'landscape', territoryFilters: { keyword: '', continent: '' }, showMissing: false, contentLanguage: names.currentNameLanguage, qualificationEditorOpen: false, qualificationStandaloneMode: 'global', releaseAnchor: 'profile' },
    };
    draft.localizedContent.en = { tagline: draft.tagline, description: draft.description, developerWords: draft.developerWords };
    draft.localizedContent.zh = { tagline: draft.taglineZh, description: draft.descriptionZh, developerWords: draft.developerWordsZh };
    if (!draft.localizedAssets[assetLanguageSettings.defaultNameLanguage]) draft.localizedAssets[assetLanguageSettings.defaultNameLanguage] = draft.assets;
    [...names.nameLanguages, ...assetLanguageSettings.nameLanguages].forEach(code => { draft.localizedContent[code] ||= { tagline: '', description: '', developerWords: '' }; draft.localizedAssets[code] ||= emptyAssets(); });
    draft.assets = draft.localizedAssets[assetLanguageSettings.defaultNameLanguage];
    window.PublisherGameNames.sync(draft);
    draft.storeLocales = { enabled: draft.nameLanguages, default: draft.defaultNameLanguage, current: draft.currentNameLanguage };
    draft.assetLanguageSettings.nameLanguages = draft.storeLocales.enabled;
    draft.assetLanguageSettings.defaultNameLanguage = draft.storeLocales.default;
    draft.assetLanguageSettings.currentNameLanguage = draft.storeLocales.current;
    draft.catalog = {
      baseGame: normalizeSku(normalized.catalog?.baseGame || (draft.pricing ? { pricingModel: draft.pricing.model, listPrice: draft.releaseRegions.includes('domestic') && !draft.releaseRegions.includes('global') ? draft.pricing.domesticPrice : draft.pricing.globalPrice } : null), 'base_game'),
      dlcs: (normalized.catalog?.dlcs || []).map((item, index) => normalizeSku(item, 'dlc', index)),
    };
    draft.releaseConfig = structuredClone(normalized.releaseConfig || { mode: draft.releaseRegions.includes('domestic') && !draft.releaseRegions.includes('global') ? 'domestic' : 'global', globalTerritoryCodes: draft.releaseTerritories.filter(item => item.code !== 'CN').map(item => item.code), releaseStatus: draft.releaseStatus, effectiveMode: draft.publication.mode, scheduledAt: draft.publication.scheduledAt });
    draft.releaseConfig.mode = draft.releaseConfig.mode === 'domestic' ? 'domestic' : 'global';
    draft.releaseConfig.targetUserInterests = [...draft.targetUserInterests];
    if (!releaseSelectionWasConfigured && !immutable && draft.releaseConfig.mode === 'global') {
      draft.releaseConfig.globalTerritoryCodes = window.PublisherReleaseRegions.defaultTerritoryCodes();
    }
    draft.releaseRegions = [draft.releaseConfig.mode];
    draft.gameProfileDraft = { gameNames: draft.gameNames, defaultLocale: draft.defaultNameLanguage, currentLocale: draft.currentNameLanguage, localizedContent: draft.localizedContent, localizedAssets: draft.localizedAssets, genres: draft.genres, platforms: draft.platforms, relationship: draft.relationship, developerName: draft.developerName, website: draft.website, playerGroupName: draft.playerGroupName, playerGroupNumber: draft.playerGroupNumber, listedElsewhere: draft.listedElsewhere };
    draft.schemaVersion = 2;
    draft.releaseSubmissions = structuredClone(normalized.releaseSubmissions || []);
    draft.reviewRecords = structuredClone(normalized.reviewRecords || []);
    draft.currentReleaseReview = structuredClone(normalized.currentReleaseReview || null);
    delete draft.languages;
    return draft;
  }
  function requiredFields(draft) {
    const mode = draft.releaseConfig?.mode === 'domestic' ? 'domestic' : 'global';
    const locale = mode === 'domestic' ? 'zh' : 'en';
    const localized = draft.localizedContent?.[locale] || {};
    const result = [
      ['releaseConfig.mode', ['global', 'domestic'].includes(draft.releaseConfig?.mode), 'regionRequired'],
      ...(mode === 'global' ? [['releaseConfig.globalTerritoryCodes', (draft.releaseConfig.globalTerritoryCodes || []).length > 0 && !draft.releaseConfig.globalTerritoryCodes.includes('CN'), 'territoryRequired']] : []),
      [`gameNames.${locale}`, Boolean(String(draft.gameNames?.[locale] || '').trim()), 'required'],
      [`localizedContent.${locale}.tagline`, Boolean(String(localized.tagline || '').trim()), 'required'],
      [`localizedContent.${locale}.description`, Boolean(String(localized.description || '').trim()), 'required'],
      ['genres', draft.genres.length > 0 && draft.genres.every(genre => genres.includes(genre)), 'selectionRequired'],
      ['relationship', Boolean(relationships[draft.relationship]), 'relationshipRequired'],
      ['platforms', draft.platforms.length > 0 && draft.platforms.every(platform => platforms.includes(platform)), 'selectionRequired'],
      ['releaseStatus', Boolean(releaseStates[draft.releaseConfig?.releaseStatus || draft.releaseStatus]), 'releaseStatusRequired'],
      ['targetUserInterests', draft.targetUserInterests.length > 0 && draft.targetUserInterests.every(value => targetInterestOptions.some(([key]) => key === value)), 'selectionRequired'],
      ...(mode === 'domestic' ? [['licenseNumber', Boolean(String(draft.licenseNumber || draft.releaseConfig.licenseNumber || '').trim()), 'licenseRequired']] : []),
      ['assets.icon', validIcon(draft.assets.icon), 'iconRequired'],
      ...(draft.relationship === 'publisher' ? [['developerName', Boolean(String(draft.developerName).trim()), 'required']] : []),
      ['assets.landscape', draft.assets.landscape.some(file => validImage(file) && ratio16(file)), 'landscapeRequired'],
      ['assets.screenshots', draft.assets.screenshots.filter(validImage).length >= 3, 'screenshotsRequired'],
      ['buildPackages.readyFull', window.PublisherGameBuilds.hasParsedFullBuild(draft), 'buildRequired'],
      ['qualifications.activeVersion', Boolean(window.PublisherGameQualifications.approvedVersionFor(draft.qualifications, window.PublisherGameQualifications.contextFor(draft))) || Object.keys(window.PublisherGameQualifications.validateApplication(draft.qualifications?.draft || {}, window.PublisherGameQualifications.contextFor(draft))).length === 0, 'documentRequired'],
      ...(draft.publication.mode === 'scheduled' ? [['publication.scheduledAt', validSchedule(draft), 'futureRequired']] : []),
    ];
    skuList(draft).forEach((sku, index) => {
      const key = index ? `catalog.dlcs.${index - 1}` : 'catalog.baseGame';
      result.push([`${key}.title`, Boolean(String(sku.title || '').trim()), 'required']);
      result.push([`${key}.installContentRef`, window.PublisherGameBuilds.parsedFullBuilds(draft).some(build => build.id === sku.installContentRef), 'required']);
      result.push([`${key}.pricingModel`, ['free', 'paid'].includes(sku.pricingModel), 'pricingModelRequired']);
      if (sku.pricingModel === 'paid') {
        result.push([`${key}.listPrice`, validPrice(sku.listPrice), 'priceRequired']);
        if (sku.discountPrice || sku.discountStartAt || sku.discountEndAt) result.push([`${key}.discount`, validDiscount(sku, draft.reviewStatus === 'reviewing'), 'discountInvalid']);
      }
    });
    return result;
  }
  function validate(draft) {
    const errors = {};
    requiredFields(draft).forEach(([key, valid, code]) => { if (!valid) errors[key] = code; });
    Object.entries(draft.gameNames || {}).forEach(([code, value]) => { if (String(value).length > 100) errors[`gameNames.${code}`] = 'nameTooLong'; });
    ['developerWords', 'developerWordsZh'].forEach(key => { if (String(draft[key] || '').length > 5000) errors[key] = 'wordsTooLong'; });
    if (draft.website.trim()) { try { const link = new URL(draft.website); if (!['https:', 'http:'].includes(link.protocol) || !link.hostname) errors.website = 'websiteInvalid'; } catch (_) { errors.website = 'websiteInvalid'; } }
    ['landscape', 'portrait', 'screenshots'].forEach(category => {
      if (draft.assets[category].some(file => !validImage(file))) errors[`assets.${category}`] = 'fileUnavailable';
      if (category === 'landscape' && draft.assets[category].some(file => validImage(file) && !ratio16(file))) errors['assets.landscape'] = 'landscapeRatio';
    });
    ['trailer', 'gameplay'].forEach(category => {
      const file = draft.assets[category];
      if (file && (!validFile(file) || file.type !== 'video/mp4' || !(file.duration > 0) || file.size > videoLimit)) errors[`assets.${category}`] = 'fileUnavailable';
      else if (category === 'gameplay' && file && (file.duration < 15 || file.duration > 1800)) errors['assets.gameplay'] = 'gameplayDuration';
    });
    Object.entries(draft.qualificationFiles || {}).forEach(([key, file]) => { if (file && !validFile(file)) errors[`qualificationFiles.${key}`] = 'fileUnavailable'; });
    return Object.fromEntries(Object.entries(errors).sort(([a], [b]) => sections.indexOf(sectionOf(a)) - sections.indexOf(sectionOf(b))));
  }
  function completion(draft) {
    const fields = requiredFields(draft);
    const errors = validate(draft);
    return { complete: fields.filter(item => item[1]).length, total: fields.length, missing: Object.entries(errors).map(([key, code]) => ({ key, section: sectionOf(key), code })), sections: Object.fromEntries(sections.map(section => [section, !Object.keys(errors).some(key => sectionOf(key) === section)])) };
  }
  const required = '<span class="pgp-required" aria-hidden="true">*</span>';
  const errorHTML = (draft, lang, key) => `<p class="pgp-error" id="${id(key)}-error" data-profile-error="${esc(key)}"${draft.errors[key] ? ' role="alert"' : ' hidden'}>${draft.errors[key] ? esc(t(lang, draft.errors[key])) : ''}</p>`;
  function field(draft, lang, key, { isRequired = false, readonly = false, textarea = false, max = 0, hint = '', label = '' } = {}) {
    const value = get(draft, key) ?? '';
    const attrs = `id="${id(key)}" data-profile-field="${esc(key)}" aria-label="${esc(label || labelFor(lang, key))}" aria-describedby="${id(key)}-error" aria-invalid="${Boolean(draft.errors[key])}"${/(?:listPrice|discountPrice)$/.test(key) ? ' inputmode="decimal" autocomplete="off"' : ''}${readonly ? ' readonly' : ''}${max ? ` maxlength="${max}"` : ''}`;
    return `<div class="pgp-field${textarea ? ' pgp-wide' : ''}" data-profile-field-wrap="${esc(key)}"><label for="${id(key)}">${esc(label || labelFor(lang, key))} ${isRequired ? required : ''}</label>${textarea ? `<textarea ${attrs} rows="${key === 'description' ? 5 : 4}">${esc(value)}</textarea>` : `<input type="${key.endsWith('At') ? 'datetime-local' : 'text'}" ${attrs} value="${esc(value)}">`}${hint ? `<p class="pgp-hint">${esc(hint)}</p>` : ''}${max ? `<p class="pgp-count"><span data-profile-count="${esc(key)}">${String(value).length}</span> / ${max}</p>` : ''}${errorHTML(draft, lang, key)}</div>`;
  }
  function checkGroup(draft, lang, key, options) {
    return `<fieldset class="pgp-check-group pgp-wide"><legend>${esc(t(lang, key))} ${required}</legend><div class="pgp-checks">${options.map(([value, label]) => `<label><input type="checkbox" value="${esc(value)}" data-profile-array="${key}"${draft[key].includes(value) ? ' checked' : ''}><span>${esc(label)}</span></label>`).join('')}</div>${errorHTML(draft, lang, key)}</fieldset>`;
  }
  function choiceGroup(draft, lang, key, options, { label = '', readonly = false, wide = false } = {}) {
    const entries = Object.entries(options);
    const title = label || labelFor(lang, key);
    return `<fieldset class="pgp-choice-group${wide ? ' pgp-wide' : ''}" data-profile-field-wrap="${esc(key)}"><legend>${esc(title)} ${required}</legend><div class="pgp-choice-tiles" data-choice-count="${entries.length}">${entries.map(([value, labels]) => `<label class="pgp-choice-tile${draft[key] === value ? ' is-selected' : ''}"><input type="radio" name="${id(key)}" value="${esc(value)}" data-profile-field="${esc(key)}"${draft[key] === value ? ' checked' : ''}${readonly ? ' disabled' : ''}><span>${esc(labels[lang === 'en' ? 1 : 0])}</span></label>`).join('')}</div>${errorHTML(draft, lang, key)}</fieldset>`;
  }
  function card(draft, lang, section, body) {
    const complete = completion(draft).sections[section];
    const historical = section === 'pricing' && pricingIsHistorical(draft);
    return `<section class="pgp-card" id="profile-section-${section}" data-profile-section="${section}" tabindex="-1"><header><div><h3>${esc(t(lang, section))}</h3><p>${esc(t(lang, `${section}Hint`))}</p></div><span class="pgp-status${historical ? ' is-historical' : complete ? ' is-complete' : ''}" data-profile-section-status="${section}">${esc(t(lang, historical ? 'pricingUnconfigured' : complete ? 'complete' : 'incomplete'))}</span></header><div class="pgp-card-body">${body}</div></section>`;
  }
  function renderPricing(draft, lang) {
    const isEnglish = lang === 'en';
    const currency = currencyFor(draft);
    const buildOptions = window.PublisherGameBuilds.parsedFullBuilds(draft);
    const buildSelect = (sku, key) => `<div class="pgp-field" data-profile-field-wrap="${key}.installContentRef"><label>${isEnglish ? 'Installation content / build' : '安装内容／包体版本'} ${required}</label><select data-sku-build="${esc(key)}" aria-label="${isEnglish ? 'Installation content / build' : '安装内容／包体版本'}"${buildOptions.length ? '' : ' disabled'}><option value="">${isEnglish ? (buildOptions.length ? 'Choose a parsed full package' : 'Upload a parsed full package first') : (buildOptions.length ? '请选择已解析整包' : '请先上传并解析游戏整包')}</option>${buildOptions.map(build => `<option value="${esc(build.id)}"${sku.installContentRef === build.id ? ' selected' : ''}>${esc(build.platform)} · ${esc(build.version)} · ${esc(build.id)}</option>`).join('')}</select><p class="pgp-hint">${isEnglish ? 'Only parsed full packages can be linked.' : '只能关联已解析通过的游戏整包。'}</p>${errorHTML(draft, lang, `${key}.installContentRef`)}</div>`;
    const renderSku = (sku, index) => {
      const base = index === 0;
      const key = base ? 'catalog.baseGame' : `catalog.dlcs.${index - 1}`;
      const paid = sku.pricingModel === 'paid';
      return `<article class="pgp-sku-card" data-catalog-sku="${esc(sku.skuId)}" data-sku-index="${index}"><header><div><small>${base ? (isEnglish ? 'BASE GAME' : '基础游戏') : 'DLC'}</small><h4>${esc(sku.title || (base ? (isEnglish ? 'Base game' : '基础游戏') : `DLC ${index}`))}</h4><span>${esc(sku.skuId)}</span></div>${base ? '' : `<button type="button" class="pgp-link-danger" data-sku-remove="${index - 1}">${isEnglish ? 'Remove' : '删除'}</button>`}</header><div class="pgp-form-grid">${field(draft, lang, `${key}.title`, { isRequired: true, label: isEnglish ? 'Product name' : '商品名称' })}${buildSelect(sku, key)}<fieldset class="pgp-pricing-model pgp-wide" data-profile-field-wrap="${key}.pricingModel"><legend>${esc(t(lang, 'pricingModel'))} ${required}</legend><div class="pgp-pricing-options">${['free', 'paid'].map(value => `<label class="pgp-pricing-option${sku.pricingModel === value ? ' is-selected' : ''}"><input type="radio" name="sku-pricing-${index}" value="${value}" data-sku-pricing-model="${index}"${sku.pricingModel === value ? ' checked' : ''}><span><strong>${esc(t(lang, value))}</strong><small>${esc(t(lang, `${value}Hint`))}</small></span></label>`).join('')}</div>${errorHTML(draft, lang, `${key}.pricingModel`)}</fieldset>${paid ? `${field(draft, lang, `${key}.listPrice`, { isRequired: true, label: `${isEnglish ? 'List price' : '售价'}（${currency}）`, hint: t(lang, 'priceHint') })}${field(draft, lang, `${key}.discountPrice`, { label: `${isEnglish ? 'Discount price' : '折扣价'}（${currency}）` })}${field(draft, lang, `${key}.discountStartAt`, { label: isEnglish ? 'Discount starts' : '折扣开始时间' })}${field(draft, lang, `${key}.discountEndAt`, { label: isEnglish ? 'Discount ends' : '折扣结束时间' })}${errorHTML(draft, lang, `${key}.discount`)}` : `<p class="pgp-sku-free-note pgp-wide">${isEnglish ? 'This SKU is free. Price and discount values are cleared when saved.' : '此 SKU 免费提供，售价与折扣信息不会生效。'}</p>`}</div></article>`;
    };
    return `<section class="pgp-catalog" data-profile-catalog><header class="pgp-module-intro"><div><h3>${isEnglish ? 'Products & SKU' : '商品与 SKU'}</h3><p>${isEnglish ? `Each product links to a build and is priced independently in ${currency}.` : `基础游戏与每个 DLC 都是独立 SKU，分别关联包体并使用 ${currency} 定价。`}</p></div><button type="button" class="pgp-button" data-sku-add>${isEnglish ? 'Add DLC' : '新增 DLC'}</button></header><div class="pgp-sku-list">${skuList(draft).map(renderSku).join('')}</div></section>`;
  }
  function renderQualifications(draft, lang, options = {}) {
    const helper = window.PublisherGameQualifications;
    const embedded = Boolean(options.embedded);
    const baseContext = helper.contextFor(draft);
    const selectedMode = embedded ? baseContext.mode : draft.ui.qualificationStandaloneMode === 'domestic' ? 'domestic' : 'global';
    const context = { ...baseContext, mode: selectedMode, territoryCodes: selectedMode === 'domestic' ? ['CN'] : baseContext.mode === 'global' ? baseContext.territoryCodes : window.PublisherReleaseRegions.defaultTerritoryCodes() };
    const qualificationState = draft.qualifications = helper.createQualificationState(draft.qualifications || {});
    if (context.mode === 'domestic' && !qualificationState.draft.domestic.licenseNumber) qualificationState.draft.domestic.licenseNumber = draft.licenseNumber || draft.releaseConfig?.licenseNumber || '';
    const pending = qualificationState.pendingApplication;
    const pendingMode = pending?.context?.mode || (pending ? selectedMode : '');
    const selectedPending = pending && pendingMode === selectedMode ? pending : null;
    const viewingPending = selectedPending?.status === 'reviewing';
    const application = viewingPending ? helper.createApplicationDraft(selectedPending.snapshot) : qualificationState.draft;
    const editorOpen = embedded || Boolean(draft.ui.qualificationEditorOpen || pending?.status === 'supplement_required');
    const errors = draft.qualificationErrors || {};
    const copy = (zh, en) => lang === 'en' ? en : zh;
    const qError = key => `<p class="pgp-error" data-qualification-error="${esc(key)}"${errors[key] ? ' role="alert"' : ' hidden'}>${errors[key] ? esc(helper.text(lang, errors[key]) || errors[key]) : ''}</p>`;
    const qField = (key, label, { type = 'text', textarea = false, values = null, hint = '', isRequired = false } = {}) => {
      const value = get(application, key) ?? '';
      const groupedError = ['authorization.grantor', 'authorization.grantee'].includes(key) ? 'authorization.parties' : ['authorization.startsAt', 'authorization.endsAt'].includes(key) ? (errors['authorization.term'] ? 'authorization.term' : 'authorization.coverage') : key;
      const attrs = `data-qualification-field="${esc(key)}" aria-label="${esc(label)}" aria-invalid="${Boolean(errors[key] || errors[groupedError])}"${viewingPending ? ' disabled' : ''}`;
      const control = values ? `<select ${attrs}><option value="">${esc(t(lang, 'choose'))}</option>${values.map(([option, zh, en]) => `<option value="${esc(option)}"${value === option ? ' selected' : ''}>${esc(copy(zh, en))}</option>`).join('')}</select>` : textarea ? `<textarea ${attrs} rows="3">${esc(value)}</textarea>` : `<input type="${type}" ${attrs} value="${esc(value)}">`;
      const groupedErrorOwner = groupedError === 'authorization.parties' ? 'authorization.grantor' : 'authorization.startsAt';
      const visibleError = errors[key] ? key : groupedError === key || key === groupedErrorOwner ? groupedError : key;
      return `<div class="pgp-field${textarea ? ' pgp-wide' : ''}" data-qualification-field-wrap="${esc(key)}"><label>${esc(label)} ${isRequired ? required : ''}</label>${control}${hint ? `<p class="pgp-hint">${esc(hint)}</p>` : ''}${qError(visibleError)}</div>`;
    };
    const qFiles = (key, card, label, hint, isRequired = false) => {
      const values = Array.isArray(get(application, key)) ? get(application, key) : [];
      const input = `<input type="file" hidden multiple accept="image/png,image/jpeg" data-qualification-file="${esc(key)}" data-qualification-card-key="${esc(card)}">`;
      const emptyPicker = viewingPending ? `<p class="pgp-empty-assets">${copy('尚未上传', 'No files uploaded')}</p>` : `<label class="pgp-qualification-upload-trigger"><span aria-hidden="true">⇧</span><strong>${copy('点击上传附件', 'Choose attachments')}</strong><small>${copy('支持 JPG / PNG，可一次选择多张', 'JPG / PNG; multiple files supported')}</small>${input}</label>`;
      return `<section class="pgp-qualification-upload" data-qualification-upload-card="${esc(card)}"><header><div><h5>${esc(label)} ${isRequired ? required : ''}</h5><p>${esc(hint)}</p></div>${viewingPending || !values.length ? '' : `<label class="pgp-button">${copy('继续上传', 'Add files')}${input}</label>`}</header>${values.length ? `<div class="pgp-qualification-files">${values.map((file, index) => `<article><span aria-hidden="true">◇</span><div><strong>${esc(file.name)}</strong><small>${((file.size || file.blob?.size || 0) / 1024 / 1024).toFixed(2)} MB</small></div>${viewingPending ? '' : `<button type="button" data-qualification-file-remove="${esc(key)}" data-qualification-file-index="${index}">${copy('移除', 'Remove')}</button>`}</article>`).join('')}</div>` : emptyPicker}${qError(key)}</section>`;
    };
    const status = pending?.status || (qualificationState.activeVersion ? 'active' : 'notSubmitted');
    const statusNote = pending ? `<div class="pgp-qualification-state pgp-qualification-state--${esc(pending.status)}" data-qualification-pending="${esc(pending.status)}"><strong>${esc(helper.text(lang, pending.status))} · ${esc(pending.id)}</strong>${pending.reason ? `<p>${esc(pending.reason)}</p>` : ''}${qualificationState.activeVersion ? `<small>${copy('旧批准版本继续生效', 'The previous approved version remains active')} · ${esc(qualificationState.activeVersion.id)}</small>` : ''}</div>` : qualificationState.activeVersion ? `<div class="pgp-qualification-state is-active" data-qualification-active="${esc(qualificationState.activeVersion.id)}"><strong>${copy('当前生效版本', 'Current active version')} · ${esc(qualificationState.activeVersion.id)}</strong><small>${copy('修改资质需重新审核，新版本通过前本版继续生效。', 'Changes require review. This version remains active until the new version is approved.')}</small></div>` : '';
    if (!editorOpen && !embedded) {
      const activeMode = qualificationState.activeVersion?.context?.mode || (qualificationState.activeVersion ? selectedMode : '');
      const regions = [
        ['global', '全球（不含中国大陆）发行资质', 'Global release qualification (excluding mainland China)', '适用于中国香港、中国澳门及其他中国大陆以外地区；上传发行权属证明，可一次提交多个附件。', 'Applies outside mainland China, including Hong Kong and Macao. Upload one or more release-rights attachments.'],
        ['domestic', '中国大陆发行资质', 'Mainland China release qualification', '用于中国大陆发行；提交发行权属证明，并按实际发行及联网情况补充版号等材料。', 'For mainland China releases. Provide release-rights evidence and applicable publication approval materials.'],
      ];
      const cards = regions.map(([mode, zhName, enName, zhHint, enHint]) => {
        const regionPending = pending && pendingMode === mode ? pending : null;
        const regionActive = qualificationState.activeVersion && activeMode === mode ? qualificationState.activeVersion : null;
        const regionStatus = regionPending?.status || (regionActive ? 'active' : 'notSubmitted');
        const actionLabel = regionStatus === 'reviewing' ? copy('查看资料', 'View details') : regionStatus === 'supplement_required' ? copy('补充材料', 'Add materials') : regionActive ? copy('修改资料', 'Edit details') : copy('填写并提审', 'Complete and submit');
        const fileCount = mode === 'global'
          ? qualificationState.draft.authorization.files.length
          : qualificationState.draft.authorization.files.length + qualificationState.draft.domestic.publicationApprovalFiles.length + qualificationState.draft.domestic.copyrightFiles.length + qualificationState.draft.domestic.icpFiles.length + qualificationState.draft.domestic.safetyAssessmentFiles.length;
        return `<article class="pgp-qualification-region-card" data-qualification-region-card="${mode}" data-qualification-region-status="${esc(regionStatus)}"><div class="pgp-qualification-region-card__mark" aria-hidden="true">◇</div><div class="pgp-qualification-region-card__body"><div class="pgp-qualification-region-card__heading"><strong>${copy(zhName, enName)}</strong><span data-qualification-region-status-label>${esc(helper.text(lang, regionStatus))}</span></div><p>${copy(zhHint, enHint)}</p><small>${fileCount} ${copy('个附件', 'attachment(s)')}${regionPending?.id ? ` · ${esc(regionPending.id)}` : regionActive?.id ? ` · ${esc(regionActive.id)}` : ''}</small></div><div class="pgp-qualification-region-card__actions"><button type="button" class="pgp-button${regionStatus === 'reviewing' ? '' : ' pgp-button--primary'}" data-qualification-region-open="${mode}">${actionLabel}</button>${regionPending && ['reviewing', 'supplement_required'].includes(regionStatus) ? `<button type="button" class="pgp-button pgp-button--danger" data-qualification-region-withdraw="${mode}">${copy('撤销审核', 'Withdraw')}</button>` : ''}</div></article>`;
      }).join('');
      return `<div data-qualification-profile data-qualification-status="${esc(status)}" data-qualification-context-mode="${selectedMode}"><div class="pgp-qualification-region-grid" data-qualification-region-grid>${cards}</div></div>`;
    }

    const authorization = `<section class="pgp-qualification-form-section" data-qualification-ownership><h4>${copy('发行权属证明', 'Release-rights evidence')}</h4><p>${esc(helper.text(lang, selectedMode === 'global' ? 'globalQualificationHint' : 'domesticQualificationHint'))}</p>${qFiles('authorization.files', 'rights', copy('资质附件', 'Qualification attachments'), copy('JPG / PNG，1–10 张，支持一次选择多个附件。', 'JPG / PNG, 1–10 images; multiple attachments can be selected at once.'), true)}</section>`;
    const domestic = context.mode === 'domestic' ? `<section class="pgp-qualification-form-section" data-qualification-domestic><h4>${copy('国内服 PC 资质', 'Domestic PC qualifications')}</h4><p>${copy('只收集 PC 发行与实际服务形态命中的材料，不包含手游 APK、移动渠道 SDK 或移动应用备案。', 'Only PC release materials applicable to the actual service are collected. Mobile APK, channel SDK, and mobile-app filing are excluded.')}</p><div class="pgp-form-grid">${qField('domestic.licenseNumber', copy('游戏版号', 'Game publication approval number'), { isRequired: true, hint: copy('版号字段必填，扫描件选填。', 'The approval number is required; a scanned document is optional.') })}${qField('domestic.networkMode', copy('游戏联网方式', 'Game connectivity'), { values: [['offline', '离线单机', 'Offline single-player'], ['online', '提供联网游戏服务', 'Online game services']], isRequired: true, hint: helper.text(lang, 'networkHint') })}</div>${qFiles('domestic.publicationApprovalFiles', 'mainland', copy('游戏版号扫描件（选填）', 'Publication approval document (optional)'), helper.text(lang, 'mainlandScanHint'))}<div class="pgp-form-grid">${qField('domestic.copyrightNumber', copy('软件著作权登记号（选填）', 'Software copyright number (optional)'), { hint: helper.text(lang, 'copyrightHint') })}</div>${qFiles('domestic.copyrightFiles', 'copyright', copy('软件著作权证书（选填）', 'Software copyright certificate (optional)'), helper.text(lang, 'copyrightHint'))}<div class="pgp-form-grid">${qField('domestic.icpStatus', copy('ICP 核准情况（按服务形态选填）', 'ICP status (conditional)'), { values: [['approved', '已核准', 'Approved'], ['not_approved', '暂未核准', 'Not approved'], ['not_applicable', '不适用', 'Not applicable']], hint: helper.text(lang, 'icpHint') })}${application.domestic.icpStatus === 'not_applicable' ? qField('domestic.icpExemptionReason', copy('ICP 不适用说明', 'Why ICP does not apply'), { textarea: true, isRequired: true }) : ''}</div>${application.domestic.icpStatus === 'approved' || application.domestic.icpFiles.length ? qFiles('domestic.icpFiles', 'icp', copy('ICP 核准证明', 'ICP approval evidence'), copy('已核准时请上传 JPG / PNG 证明。', 'Upload JPG / PNG evidence when approved.'), application.domestic.icpStatus === 'approved') : ''}${qFiles('domestic.safetyAssessmentFiles', 'safety', copy('安全评估报告（按服务形态选填）', 'Security assessment report (conditional)'), helper.text(lang, 'safetyHint'))}${application.domestic.networkMode === 'online' && ['demo', 'released'].includes(context.releaseStatus) ? `<section class="pgp-qualification-online" data-qualification-online><h5>${copy('实名与防沉迷', 'Real-name and anti-addiction')}</h5><p>${esc(helper.text(lang, 'onlineHint'))}</p><div class="pgp-form-grid"><div class="pgp-field pgp-wide pgp-compliance-ack" data-qualification-field-wrap="domestic.antiAddictionAcknowledged"><label><input type="checkbox" data-qualification-anti-ack${application.domestic.antiAddictionAcknowledged ? ' checked' : ''}${viewingPending ? ' disabled' : ''}><span>${esc(helper.text(lang, 'antiAddictionAcknowledged'))} ${required}</span></label><a href="${esc(helper.referenceUrl)}" target="_blank" rel="noopener noreferrer">${esc(helper.text(lang, 'referenceNotice'))}</a>${qError('domestic.antiAddictionAcknowledged')}</div>${qField('domestic.gameAntiAddiction', helper.text(lang, 'gameAntiAddiction'), { values: [['connected', '已接入', 'Connected'], ['not_connected', '暂未接入', 'Not connected']], isRequired: true })}${qField('domestic.nationalRealName', helper.text(lang, 'nationalRealName'), { values: [['connected', '已接入', 'Connected'], ['not_connected', '暂未接入', 'Not connected']], isRequired: true })}</div></section>` : ''}</section>` : '';
    const submitLabel = selectedPending?.status === 'supplement_required' ? copy('重新提交补件', 'Resubmit supplement') : qualificationState.activeVersion ? copy('提交修改审核', 'Submit changes for review') : copy('提交资质审核', 'Submit qualification review');
    const actions = embedded ? '' : viewingPending ? `<div class="pgp-qualification-actions"><button type="button" class="pgp-button" data-qualification-editor-close>${copy('收起', 'Collapse')}</button><button type="button" class="pgp-button pgp-button--danger" data-qualification-withdraw${draft.qualificationWithdrawing ? ' disabled' : ''}>${draft.qualificationWithdrawing ? copy('正在撤销…', 'Withdrawing…') : copy('撤销资质审核', 'Withdraw qualification review')}</button></div>` : `<div class="pgp-qualification-actions"><button type="button" class="pgp-button" data-qualification-editor-close>${copy('取消', 'Cancel')}</button><button type="button" class="pgp-button pgp-button--primary" data-qualification-submit${draft.qualificationSubmitting ? ' disabled' : ''}>${draft.qualificationSubmitting ? copy('正在提交…', 'Submitting…') : submitLabel}</button></div>`;
    return `<div data-qualification-profile data-qualification-status="${esc(status)}" data-qualification-context-mode="${selectedMode}"${embedded ? ' data-qualification-embedded' : ''}>${embedded ? statusNote : ''}<section class="pgp-qualification-editor" data-qualification-editor data-qualification-readonly="${viewingPending}"><header><div><h4>${copy(selectedMode === 'global' ? '全球（不含中国大陆）发行资质' : '中国大陆发行资质', selectedMode === 'global' ? 'Global release qualification (excluding mainland China)' : 'Mainland China release qualification')}</h4><p>${embedded ? copy('根据当前发行区域随版本提交。', 'Submitted with this version for the current release region.') : copy('可在发布前单独提审；上线后修改会生成新资质版本。', 'Can be reviewed before release; post-launch changes create a new qualification version.')}</p></div>${!embedded && selectedPending ? `<span class="pgp-qualification-editor__status">${esc(helper.text(lang, selectedPending.status))} · ${esc(selectedPending.id)}</span>` : ''}</header>${authorization}${domestic}${Object.keys(errors).length ? `<p class="pgp-error" role="alert" data-qualification-form-error>${copy('请补充标记的资质信息。', 'Complete the marked qualification fields.')}</p>` : ''}${draft.qualificationActionError ? `<p class="pgp-error" role="alert" data-qualification-action-error>${copy('资质操作失败，已保留当前填写内容，请刷新状态后重试。', 'The qualification action failed. Your entries are preserved; refresh the status and try again.')}</p>` : ''}${actions}</section></div>`;
  }
  function asset(draft, lang, key, file, index, inherited = false) {
    const preview = urlFor(draft, file);
    const image = file?.type?.startsWith('image/');
    const video = file?.type?.startsWith('video/');
    const at = index === undefined ? '' : ` data-profile-index="${index}"`;
    return `<article class="pgp-asset${!preview ? ' is-unavailable' : ''}" data-profile-asset="${esc(key)}"${at}${inherited ? ` data-profile-asset-fallback="${esc(key)}"` : ''}>${preview ? image ? `<img src="${esc(preview)}" alt="${esc(labelFor(lang, key))}" loading="lazy">` : video ? `<video controls preload="metadata" src="${esc(preview)}" aria-label="${esc(labelFor(lang, key))}"></video>` : `<a class="pgp-document" href="${esc(preview)}" target="_blank" rel="noopener"><span>PDF</span><strong>${esc(file.name)}</strong></a>` : '<div class="pgp-asset-placeholder">⌁</div>'}<div class="pgp-asset-info"><strong title="${esc(file.name)}">${esc(file.name)}</strong><small>${preview ? `${file.width ? `${file.width} × ${file.height} · ` : ''}${file.duration ? `${Math.round(file.duration)} s · ` : ''}${(Number(file.size || 0) / 1024 / 1024).toFixed(2)} MB` : esc(t(lang, 'legacy'))}</small></div>${inherited ? `<p class="pgp-hint">${esc(t(lang, 'assetInherited'))}</p>` : `<div class="pgp-asset-actions"><label class="pgp-text-action">${esc(t(lang, 'replace'))}<input type="file" data-profile-upload="${esc(key)}"${at} accept="${key.startsWith('qualifications.') ? 'application/pdf,image/png,image/jpeg' : ['assets.trailer', 'assets.gameplay'].includes(key) ? 'video/mp4' : 'image/png,image/jpeg'}" aria-label="${esc(t(lang, 'replace'))} ${esc(labelFor(lang, key))}"></label><button type="button" data-profile-remove="${esc(key)}"${at} aria-label="${esc(t(lang, 'remove'))} ${esc(file.name)}">${esc(t(lang, 'remove'))}</button></div>`}</article>`;
  }
  function uploadSingle(draft, lang, key, hint, isRequired = false) {
    const file = get(draft, key);
    const fallback = !file && key.startsWith('assets.') && assetLocale(draft, key) !== draft.assetLanguageSettings.defaultNameLanguage ? draft.assets[key.slice(7)] : null;
    const accept = key.startsWith('qualifications.') ? 'application/pdf,image/png,image/jpeg' : ['assets.trailer', 'assets.gameplay'].includes(key) ? 'video/mp4' : 'image/png,image/jpeg';
    return `<div class="pgp-single-upload" data-profile-field-wrap="${esc(key)}"><h4>${esc(labelFor(lang, key))} ${isRequired ? required : ''}</h4><p class="pgp-hint">${esc(hint)}</p>${file ? asset(draft, lang, key, file) : `<label class="pgp-upload-empty"><input type="file" data-profile-upload="${esc(key)}" accept="${accept}" aria-label="${esc(t(lang, 'upload'))} ${esc(labelFor(lang, key))}"><span>+</span><strong>${esc(t(lang, 'add'))}</strong></label>`}${fallback ? asset(draft, lang, key, fallback, undefined, true) : ''}${errorHTML(draft, lang, key)}</div>`;
  }
  function renderAssets(draft, lang) {
    const tab = draft.ui.assetTab;
    const category = tab === 'screenshots' ? 'screenshots' : draft.ui.imageCategory;
    const key = `assets.${category}`;
    const localized = draft.localizedAssets[draft.assetLanguageSettings.currentNameLanguage] || emptyAssets();
    const list = localized[category];
    const isDefault = draft.assetLanguageSettings.currentNameLanguage === draft.assetLanguageSettings.defaultNameLanguage;
    const inherited = !isDefault && !list.length && Boolean(draft.assets[category]?.length);
    const displayed = inherited ? draft.assets[category] : list;
    const batch = category === 'screenshots' ? 'batchScreenshots' : category === 'portrait' ? 'batchPortrait' : 'batchLandscape';
    return `<div class="pgp-asset-tabs" role="tablist" aria-label="${esc(t(lang, 'assets'))}">${['images', 'screenshots', 'videos'].map(name => `<button type="button" role="tab" aria-selected="${name === tab}" data-profile-asset-tab="${name}" class="${name === tab ? 'is-active' : ''}">${esc(t(lang, name))}<span>${name === 'images' ? localized.landscape.length + localized.portrait.length : name === 'screenshots' ? localized.screenshots.length : Number(Boolean(localized.trailer)) + Number(Boolean(localized.gameplay))}</span></button>`).join('')}</div>${tab === 'videos' ? `<div class="pgp-video-grid">${uploadSingle(draft, lang, 'assets.trailer', t(lang, 'trailerHint'))}${uploadSingle(draft, lang, 'assets.gameplay', t(lang, 'gameplayHint'))}</div>` : `${tab === 'images' ? `<div class="pgp-image-categories">${['landscape', 'portrait'].map(name => `<button type="button" data-profile-image-category="${name}" class="${category === name ? 'is-active' : ''}" aria-pressed="${category === name}">${esc(t(lang, name))}${name === 'landscape' && isDefault ? required : `<small>${esc(t(lang, 'optional'))}</small>`}</button>`).join('')}</div>` : ''}<div class="pgp-drop-zone" data-profile-drop="${key}"><p>${esc(t(lang, 'dropHint'))}</p><label class="pgp-button">${esc(t(lang, batch))}<input type="file" multiple accept="image/png,image/jpeg" data-profile-upload="${key}" aria-label="${esc(t(lang, batch))}"></label><small>${esc(t(lang, isDefault ? `${category}Hint` : 'assetLocaleHint'))}</small></div><div class="pgp-asset-grid">${displayed.map((file, index) => asset(draft, lang, key, file, index, inherited)).join('') || `<p class="pgp-empty-assets">${esc(t(lang, 'noAssets'))}</p>`}</div>${errorHTML(draft, lang, key)}`}`;
  }
  function missingHTML(draft, lang) {
    if (!draft.ui.showMissing) return '';
    const missing = Object.entries(draft.errors).filter(([key]) => !['save', 'submit', 'withdraw', 'upload'].includes(key));
    if (!missing.length) return '';
    return `<section class="pgp-missing" data-profile-missing aria-labelledby="profile-missing-title"><h3 id="profile-missing-title">${esc(t(lang, 'missingTitle'))}</h3><p>${esc(t(lang, 'missingHint'))}</p><ul>${missing.map(([key, code]) => `<li><button type="button" data-profile-focus="${esc(key)}"><strong>${esc(labelFor(lang, key))}</strong><span>${esc(t(lang, code))}</span><i aria-hidden="true">→</i></button></li>`).join('')}</ul></section>`;
  }
  const versionStatusLabel = (lang, value, detailed = false) => {
    const labels = lang === 'en'
      ? { draft: 'Draft', reviewing: 'In review', approved: 'Approved', rejected: 'Not approved', withdrawn: 'Withdrawn' }
      : { draft: '草稿', reviewing: '审核中', approved: detailed ? '审核通过' : '审核通过', rejected: '审核未通过', withdrawn: '已撤销' };
    return labels[value] || value || (lang === 'en' ? 'Not recorded' : '历史未记录');
  };
  const publicationStatusLabel = (lang, value) => ({
    offline: lang === 'en' ? 'Not live' : '未上线',
    live: lang === 'en' ? 'Live' : '已上线',
    delisted: lang === 'en' ? 'Delisted' : '已下架',
  })[value] || value || (lang === 'en' ? 'Not recorded' : '历史未记录');
  const reviewStatusFor = record => record.reviewStatus || (['live', 'delisted'].includes(record.status) ? 'approved' : record.status) || 'draft';
  const publicationStatusFor = record => record.publicationStatus || (record.status === 'delisted' ? 'delisted' : record.status === 'live' || /上线|Live/i.test(record.displayStatus || '') ? 'live' : 'offline');
  const versionStatusTags = (lang, record) => {
    const reviewStatus = reviewStatusFor(record);
    const publicationStatus = publicationStatusFor(record);
    return `<span class="pgp-version-status-group"><b data-version-review-status="${esc(reviewStatus)}">${esc(versionStatusLabel(lang, reviewStatus, true))}</b><b data-version-publication-status="${esc(publicationStatus)}">${esc(publicationStatusLabel(lang, publicationStatus))}</b></span>`;
  };
  const demoStatusPair = status => ({
    reviewing: { reviewStatus: 'reviewing', publicationStatus: 'offline' },
    approved: { reviewStatus: 'approved', publicationStatus: 'offline' },
    rejected: { reviewStatus: 'rejected', publicationStatus: 'offline' },
    withdrawn: { reviewStatus: 'withdrawn', publicationStatus: 'offline' },
    live: { reviewStatus: 'approved', publicationStatus: 'live' },
    delisted: { reviewStatus: 'approved', publicationStatus: 'delisted' },
  })[status] || { reviewStatus: 'reviewing', publicationStatus: 'offline' };
  function renderVersionNotification(draft, lang, demoStatus, record = {}) {
    const isEnglish = lang === 'en';
    const domestic = draft.releaseConfig?.mode === 'domestic' || draft.releaseRegions?.includes('domestic');
    const channel = domestic ? 'sms' : 'email';
    const gameName = displayName(draft) || (isEnglish ? 'Ocean Expedition' : '星海远征');
    const versionName = record.versionName || draft.versionName || 'V-20260907';
    const portalLink = `<a href="${developerPortalUrl}" target="_blank" rel="noopener noreferrer">${isEnglish ? 'GameHub Developer Center' : '盖世游戏开发者中心'}</a>`;
    const outcome = demoStatus === 'live' ? 'approved' : demoStatus;
    if (!['approved', 'rejected', 'delisted'].includes(outcome)) {
      return `<section class="pgp-demo-notification is-empty" data-demo-notification="none"><strong>${isEnglish ? 'No result notification' : '不发送结果通知'}</strong><p>${isEnglish ? 'This status does not trigger an SMS or email.' : '审核中、已撤销不发送审核结果通知。'}</p></section>`;
    }
    if (channel === 'sms') {
      const content = outcome === 'approved'
        ? `【盖世游戏】您的游戏《${gameName}》版本 ${versionName} 已通过发布审核，请前往盖世游戏开发者中心查看。`
        : outcome === 'rejected'
          ? `【盖世游戏】您的游戏《${gameName}》版本 ${versionName} 未通过发布审核，请前往盖世游戏开发者中心查看详细原因。`
          : `【盖世游戏】您的游戏《${gameName}》版本 ${versionName} 已下架，请前往盖世游戏开发者中心查看详细原因。`;
      return `<section class="pgp-demo-notification" data-demo-notification="sms"><header><strong>${isEnglish ? 'SMS preview' : '短信通知预览'}</strong><span>${isEnglish ? 'Mainland China' : '中国大陆'}</span></header><small>${isEnglish ? 'To' : '接收手机'}：138****2609</small><p>${esc(content)}</p><footer>${portalLink}</footer></section>`;
    }
    const approved = outcome === 'approved';
    const subject = outcome === 'delisted'
      ? `[GameHub] ${gameName} ${versionName} has been delisted`
      : `[GameHub] Release review result for ${gameName} ${versionName}`;
    const body = approved
      ? `Your release submission for ${gameName} ${versionName} has been approved by GameHub. Sign in to the GameHub Developer Center to view the result.`
      : outcome === 'rejected'
        ? `Your release submission for ${gameName} ${versionName} was not approved. Sign in to the GameHub Developer Center to view the detailed reason.`
        : `${gameName} ${versionName} has been delisted. Sign in to the GameHub Developer Center to view the detailed reason.`;
    return `<section class="pgp-demo-notification" data-demo-notification="email"><header><strong>${isEnglish ? 'Email preview' : '邮件通知预览'}</strong><span>${isEnglish ? 'Overseas release' : '海外发行'}</span></header><small>${isEnglish ? 'To' : '接收邮箱'}：dev***@example.com</small><dl><div><dt>${isEnglish ? 'From' : '发件人'}</dt><dd>盖世游戏 GameHub</dd></div><div><dt>${isEnglish ? 'Subject' : '主题'}</dt><dd>${esc(subject)}</dd></div></dl><p>${esc(body)}</p><footer>${portalLink}</footer></section>`;
  }
  function renderDemoStateSwitcher(draft, lang, state, record) {
    const isEnglish = lang === 'en';
    const demo = state.demoReleaseState ||= { open: false, active: false, status: 'reviewing' };
    const options = [
      ['reviewing', '审核中', 'In review'],
      ['approved', '审核通过', 'Approved'],
      ['rejected', '审核未通过', 'Not approved'],
      ['withdrawn', '已撤销', 'Withdrawn'],
      ['live', '已上线', 'Live'],
      ['delisted', '已下架', 'Delisted'],
    ];
    const trigger = `<button type="button" class="pgp-demo-state-fab" data-demo-version-toggle aria-expanded="${demo.open}"><span aria-hidden="true">◇</span>${isEnglish ? 'Demo states' : '演示状态'}</button>`;
    if (!demo.open) return trigger;
    return `${trigger}<aside class="pgp-demo-state-panel" data-demo-version-panel><header><div><strong>${isEnglish ? 'Release-state preview' : '发布状态预览'}</strong><small>${isEnglish ? 'Page only; resets after refresh' : '仅影响当前页面，刷新后恢复'}</small></div><button type="button" data-demo-version-toggle aria-label="${isEnglish ? 'Close' : '关闭'}">×</button></header><div class="pgp-demo-state-options" role="group" aria-label="${isEnglish ? 'Demo release state' : '演示发布状态'}">${options.map(([value, zh, en]) => `<button type="button" data-demo-version-status="${value}" aria-pressed="${demo.active && demo.status === value}" class="${demo.active && demo.status === value ? 'is-active' : ''}">${isEnglish ? en : zh}</button>`).join('')}</div>${demo.active ? renderVersionNotification(draft, lang, demo.status, record) : ''}</aside>`;
  }
  const versionDate = (lang, value) => {
    if (!value) return '—';
    const date = new Date(value);
    return Number.isFinite(date.getTime()) ? date.toLocaleString(lang === 'en' ? 'en-GB' : 'zh-CN', { hour12: false }) : String(value);
  };
  const versionFact = (label, value, wide = false) => `<div class="pgp-version-fact${wide ? ' is-wide' : ''}"><dt>${esc(label)}</dt><dd>${esc(value || '—')}</dd></div>`;
  function renderVersionSnapshot(draft, lang, records, viewer) {
    const isEnglish = lang === 'en';
    const back = `<button type="button" class="pgp-version-back" data-version-back><span aria-hidden="true">←</span>${isEnglish ? 'Back to version records' : '返回版本记录'}</button>`;
    const retry = `<button type="button" class="pgp-button" data-version-retry>${isEnglish ? 'Reload' : '重新加载'}</button>`;
    if (viewer.status !== 'ready') {
      const stateCopy = {
        loading: [isEnglish ? 'Loading snapshot…' : '正在读取版本快照…', isEnglish ? 'The submitted record is being loaded from local storage.' : '正在从本地提交记录读取该版本，请稍候。'],
        error: [isEnglish ? 'Snapshot could not be loaded' : '版本快照加载失败', isEnglish ? 'Your version index is still available. Reload this record or return to the list.' : '版本索引仍然保留，可重新加载该记录或返回列表。'],
        missing: [isEnglish ? 'Snapshot was not found' : '未找到该版本快照', isEnglish ? 'The index remains available. Reload after the submission record is restored, or return to the list.' : '版本索引仍然保留；恢复提交记录后可重新加载，也可先返回列表。'],
      }[viewer.status] || [];
      return `<section class="pgp-version-snapshot pgp-version-snapshot--state" data-version-snapshot-state="${esc(viewer.status)}" data-version-snapshot-id="${esc(viewer.submissionId)}">${back}<div class="pgp-version-load-state" role="${viewer.status === 'loading' ? 'status' : 'alert'}"><span aria-hidden="true">${viewer.status === 'loading' ? '◌' : viewer.status === 'missing' ? '◇' : '!'}</span><strong>${esc(stateCopy[0])}</strong><p>${esc(stateCopy[1])}</p>${viewer.status === 'loading' ? '' : retry}</div></section>`;
    }

    const record = viewer.record || {};
    const summary = records.find(item => item.id === viewer.submissionId) || {};
    const snapshot = record.draft || {};
    const profile = snapshot.gameProfileDraft || {};
    const release = snapshot.releaseConfig || {};
    const releaseRegions = Array.isArray(snapshot.releaseRegions) ? snapshot.releaseRegions : [];
    const legacyTerritories = Array.isArray(snapshot.releaseTerritories) ? snapshot.releaseTerritories : [];
    const mode = release.mode || (releaseRegions.includes('domestic') || legacyTerritories.some(item => item?.code === 'CN') ? 'domestic' : releaseRegions.includes('global') || legacyTerritories.some(item => item?.code && item.code !== 'CN') ? 'global' : '');
    const territoryCodes = mode === 'domestic' ? ['CN'] : mode === 'global'
      ? [...new Set((Array.isArray(release.globalTerritoryCodes) ? release.globalTerritoryCodes : legacyTerritories.map(item => item?.code)).filter(code => code && code !== 'CN'))]
      : [...new Set(legacyTerritories.map(item => item?.code).filter(Boolean))];
    const releaseStatus = release.releaseStatus || snapshot.releaseStatus || [...new Set(legacyTerritories.map(item => item?.status).filter(Boolean))].join(' / ');
    const effectiveMode = release.effectiveMode || snapshot.publication?.mode || '';
    const scheduledAt = release.scheduledAt || snapshot.publication?.scheduledAt || '';
    const scope = mode === 'global' ? (isEnglish ? 'Global (outside mainland China)' : '全球服（中国大陆以外）') : mode === 'domestic' ? (isEnglish ? 'Domestic (mainland China)' : '国内服（中国大陆）') : (isEnglish ? 'Not recorded in this historical version' : '此历史版本未记录');
    const countryCount = isEnglish ? `${territoryCodes.length} countries / regions` : `${territoryCodes.length} 个国家／地区`;
    const targetInterestValues = Array.isArray(snapshot.targetUserInterests) ? snapshot.targetUserInterests : Array.isArray(release.targetUserInterests) ? release.targetUserInterests : [];
    const targetInterestCopy = targetInterestValues.map(value => {
      const option = targetInterestOptions.find(([key]) => key === value);
      return option ? option[isEnglish ? 2 : 1] : value;
    }).join(isEnglish ? ', ' : '、') || (isEnglish ? 'Not recorded' : '历史未记录');
    const statusCopy = releaseStatus.split(' / ').filter(Boolean).map(value => window.PublisherReleaseRegions.statusLabel(value, lang)).join(' / ') || (isEnglish ? 'Not recorded' : '历史未记录');
    const effectiveCopy = effectiveMode === 'scheduled'
      ? `${isEnglish ? 'Scheduled' : '定时生效'} · ${versionDate(lang, scheduledAt)}`
      : effectiveMode === 'immediate' ? (isEnglish ? 'After approval' : '审核后立即生效') : (isEnglish ? 'Not recorded' : '历史未记录');

    const gameNames = profile.gameNames || snapshot.gameNames || {};
    const localizedContent = profile.localizedContent || snapshot.localizedContent || {};
    const configuredLocales = snapshot.storeLocales?.enabled || snapshot.nameLanguages || [];
    const localeCodes = [...new Set([...configuredLocales, ...Object.keys(gameNames), ...Object.keys(localizedContent)])];
    const defaultLocale = snapshot.storeLocales?.default || profile.defaultLocale || snapshot.defaultNameLanguage || localeCodes[0] || '';
    const localeCards = localeCodes.map(code => {
      const content = localizedContent[code] || {};
      const nameComplete = Boolean(String(gameNames[code] || '').trim());
      const introComplete = Boolean(String(content.tagline || '').trim()) && Boolean(String(content.description || '').trim());
      return `<article data-version-locale="${esc(code)}"><header><strong>${esc(window.PublisherGameNames.label(code, lang))}</strong>${code === defaultLocale ? `<span>${isEnglish ? 'Default' : '默认语种'}</span>` : ''}</header><p>${esc(gameNames[code] || (isEnglish ? 'Name not provided' : '名称未填写'))}</p><ul><li class="${nameComplete ? 'is-complete' : 'is-missing'}">${nameComplete ? (isEnglish ? 'Name complete' : '名称已填写') : (isEnglish ? 'Name missing' : '名称待补充')}</li><li class="${introComplete ? 'is-complete' : 'is-missing'}">${introComplete ? (isEnglish ? 'Descriptions complete' : '介绍已完整') : (isEnglish ? 'Descriptions incomplete' : '介绍待补充')}</li></ul></article>`;
    }).join('');

    const catalog = snapshot.catalog || {};
    const skuRecords = catalog.baseGame ? [catalog.baseGame, ...(Array.isArray(catalog.dlcs) ? catalog.dlcs : [])] : [];
    const currency = mode === 'domestic' ? 'CNY' : 'USD';
    const skuCards = skuRecords.map((sku, index) => {
      const paid = sku.pricingModel === 'paid';
      const discountConfigured = Boolean(sku.discountPrice || sku.discountStartAt || sku.discountEndAt);
      const type = index === 0 || sku.type === 'base_game' ? (isEnglish ? 'Base game' : '基础游戏') : 'DLC';
      const pricing = paid ? (isEnglish ? 'One-time purchase' : '单次买断') : sku.pricingModel === 'free' ? (isEnglish ? 'Free' : '免费') : (isEnglish ? 'Not recorded' : '历史未记录');
      const discount = paid && discountConfigured
        ? `${currency} ${sku.discountPrice || '—'} · ${versionDate(lang, sku.discountStartAt)} – ${versionDate(lang, sku.discountEndAt)}`
        : (isEnglish ? 'No discount' : '未设置折扣');
      return `<article data-version-sku="${esc(sku.skuId || `SKU-${index + 1}`)}"><header><div><span>${esc(type)}</span><strong>${esc(sku.title || type)}</strong></div><small>${esc(sku.skuId || '—')}</small></header><dl>${versionFact(isEnglish ? 'Installation content / build' : '安装内容／包体版本', sku.installContentRef || (isEnglish ? 'Not recorded' : '历史未记录'), true)}${versionFact(isEnglish ? 'Pricing model' : '收费方式', pricing)}${versionFact(isEnglish ? 'List price' : '售价', paid ? `${currency} ${sku.listPrice || '—'}` : '—')}${versionFact(isEnglish ? 'Discount price and period' : '折扣价与折扣期限', discount, true)}</dl></article>`;
    }).join('');

    const buildRecords = window.PublisherGameBuilds.createPackages(snapshot.buildPackages || []);
    const buildCards = buildRecords.map(build => {
      const base = build.type === 'incremental' ? buildRecords.find(item => item.id === build.baseBuildId) : null;
      const testStatus = ({
        not_submitted: isEnglish ? 'Not submitted' : '待提审',
        pending: isEnglish ? 'Pending test' : '待测试',
        testing: isEnglish ? 'Testing' : '测试中',
        passed: isEnglish ? 'Test passed' : '测试通过',
        failed: isEnglish ? 'Test failed' : '测试不通过',
      })[build.testStatus] || (isEnglish ? 'Not submitted' : '待提审');
      return `<article data-version-build="${esc(build.id)}"><header><div><span>${esc(build.platform)}</span><strong>${esc(build.version || '—')}</strong></div><small>${esc(build.id)}</small></header><dl>${versionFact(isEnglish ? 'Package type' : '包体类型', build.type === 'incremental' ? (isEnglish ? 'Incremental' : '增量上传') : (isEnglish ? 'Full package' : '游戏整包'))}${versionFact(isEnglish ? 'Base build' : '基础版本', build.type === 'incremental' ? (base ? `${base.version} · ${base.id}` : build.baseBuildId || '—') : '—', true)}${versionFact(isEnglish ? 'Executable / launch item' : '可执行文件／启动项', build.executable || '—')}${versionFact(isEnglish ? 'Parse status' : '解析状态', build.status === 'parsed' ? (isEnglish ? 'Parsed' : '解析通过') : build.status || '—')}${versionFact(isEnglish ? 'Test status' : '测试状态', testStatus)}${build.testReason ? versionFact(isEnglish ? 'Failure reason' : '不通过原因', build.testReason, true) : ''}</dl></article>`;
    }).join('');

    const review = (draft.reviewRecords || []).find(item => item.submissionId === record.id)
      || (draft.reviewResult?.submissionId === record.id ? draft.reviewResult : null)
      || record.reviewResult || null;
    const reviewStatus = record.reviewStatus || summary.reviewStatus || record.status || summary.status || review?.decision || 'reviewing';
    const publicationStatus = record.publicationStatus || summary.publicationStatus || publicationStatusFor(record);
    const reviewer = review?.reviewer || record.reviewer || (reviewStatus === 'reviewing' ? (isEnglish ? 'Pending assignment' : '待分配') : '—');
    const reviewedAt = review?.reviewedAt || record.reviewedAt || summary.reviewedAt || '';
    const qualificationVersionId = record.qualificationVersionId || summary.qualificationVersionId || snapshot.qualificationVersionId || snapshot.qualifications?.activeVersion?.id || snapshot.qualifications?.activeVersion?.versionId || '';
    const versionIndex = records.findIndex(item => item.id === record.id);
    const versionNumber = versionIndex >= 0 ? records.length - versionIndex : records.length || 1;
    return `<section class="pgp-version-snapshot" data-version-snapshot-state="ready" data-version-snapshot="${esc(record.id)}">${back}<header class="pgp-version-snapshot__header"><div><span>V${versionNumber}</span><h3>${esc(record.id)}</h3><p>${isEnglish ? 'Submitted content is read-only and is not changed by later edits.' : '以下为提交时的只读内容，后续修改不会改变本快照。'}</p></div><strong>${isEnglish ? 'Immutable snapshot' : '不可变快照'}</strong></header><dl class="pgp-version-summary">${versionFact(isEnglish ? 'Submitter' : '提交人', record.submitter || summary.submitter || (isEnglish ? 'Current developer' : '当前开发者'))}${versionFact(isEnglish ? 'Submitted at' : '提交时间', versionDate(lang, record.submittedAt || summary.submittedAt))}${versionFact(isEnglish ? 'Review status' : '审核状态', versionStatusLabel(lang, reviewStatus, true))}${versionFact(isEnglish ? 'Publication status' : '发行状态', publicationStatusLabel(lang, publicationStatus))}${versionFact(isEnglish ? 'Qualification version' : '引用资质版本', qualificationVersionId || (isEnglish ? 'Not recorded' : '历史未记录'), true)}</dl><section class="pgp-version-section" data-version-snapshot-release><header><h4>${isEnglish ? 'Release settings' : '发行设置'}</h4><span>${esc(scope)}</span></header><dl>${versionFact(isEnglish ? 'Release scope' : '发行范围', scope)}${versionFact(isEnglish ? 'Countries / regions' : '国家／地区', countryCount)}${versionFact(isEnglish ? 'Target player interests' : '目标用户游戏兴趣', targetInterestCopy, true)}${versionFact(isEnglish ? 'Target store state' : '目标商店状态', statusCopy)}${versionFact(isEnglish ? 'Effective time' : '生效时间', effectiveCopy)}${mode === 'domestic' ? versionFact(isEnglish ? 'Publication approval number' : '游戏版号', snapshot.licenseNumber || release.licenseNumber || '—', true) : ''}</dl><div class="pgp-version-territories">${territoryCodes.map(code => `<span data-version-territory-code="${esc(code)}"><b>${esc(window.PublisherReleaseRegions.territoryLabel(code, lang))}</b><small>${esc(code)}</small></span>`).join('') || `<p>${isEnglish ? 'No country or region list was recorded.' : '该历史版本未记录国家／地区清单。'}</p>`}</div></section><section class="pgp-version-section" data-version-snapshot-builds><header><h4>${isEnglish ? 'PC builds' : 'PC 包体'}</h4><span>${isEnglish ? `${buildRecords.length} builds` : `${buildRecords.length} 个包体`}</span></header><div class="pgp-version-skus">${buildCards || `<div class="pgp-version-empty-inline">${isEnglish ? 'No PC build was recorded in this historical version.' : '该历史版本未记录 PC 包体。'}</div>`}</div></section><section class="pgp-version-section" data-version-snapshot-locales><header><h4>${isEnglish ? 'Store detail languages' : '商店资料语言'}</h4><span>${isEnglish ? `${localeCodes.length} languages` : `${localeCodes.length} 个语种`}</span></header><div class="pgp-version-locales">${localeCards || `<div class="pgp-version-empty-inline">${isEnglish ? 'No language details were recorded.' : '该历史版本未记录商店资料语言。'}</div>`}</div></section><section class="pgp-version-section" data-version-snapshot-catalog><header><h4>${isEnglish ? 'Products & SKU' : '商品与 SKU'}</h4><span>${isEnglish ? `${skuRecords.length} products` : `${skuRecords.length} 个商品`}</span></header><div class="pgp-version-skus">${skuCards || `<div class="pgp-version-empty-inline">${isEnglish ? 'No product pricing was recorded in this historical version.' : '该历史版本未记录商品与价格。'}</div>`}</div></section><section class="pgp-version-section" data-version-snapshot-review><header><h4>${isEnglish ? 'Review result' : '审核结果'}</h4><span>${esc(versionStatusLabel(lang, reviewStatus, true))}</span></header><dl>${versionFact(isEnglish ? 'Result' : '处理结果', versionStatusLabel(lang, reviewStatus, true))}${versionFact(isEnglish ? 'Reviewer / operator' : '审核人／操作人', reviewer)}${versionFact(isEnglish ? 'Processed at' : '处理时间', versionDate(lang, reviewedAt))}${review?.reason ? versionFact(isEnglish ? 'Review note' : '审核意见', review.reason, true) : ''}</dl></section></section>`;
  }
  function renderVersions(draft, lang, game = {}) {
    const isEnglish = lang === 'en';
    const profileState = stateFor(draft);
    const storedRecords = [...(draft.releaseSubmissions || [])].sort((a, b) => String(b.submittedAt || b.createdAt).localeCompare(String(a.submittedAt || a.createdAt)));
    const snapshot = { ...draft, releaseSubmissions: [] };
    const fixtureReviewStatus = game.reviewStatus === '审核中' ? 'reviewing' : game.reviewStatus === '需修改' ? 'rejected' : ['已通过', '已上线', '先锋测试', '预发布'].includes(game.reviewStatus) || ['已上线', '已下架', '先锋测试', '预发布'].includes(game.status) ? 'approved' : 'draft';
    const fixturePublicationStatus = game.status === '已下架' ? 'delisted' : game.status === '已上线' ? 'live' : 'offline';
    const defaultOperations = (reviewStatus, publicationStatus = 'offline') => [
      { at: draft.savedAt || draft.submittedAt || '2026-09-07 19:53', description: isEnglish ? 'Version created' : '创建新版本' },
      ...(['reviewing', 'approved', 'rejected', 'withdrawn'].includes(reviewStatus) ? [{ at: draft.submittedAt || '2026-09-07 20:16', description: isEnglish ? 'Submitted for release review' : '提交发布审核' }] : []),
      ...(reviewStatus === 'approved' ? [{ at: draft.reviewResult?.reviewedAt || '2026-09-07 21:05', description: isEnglish ? 'Release review approved' : '发布审核通过' }] : []),
      ...(reviewStatus === 'rejected' ? [{ at: draft.reviewResult?.reviewedAt || '2026-09-07 21:05', description: isEnglish ? 'Release review not approved' : '发布审核未通过' }] : []),
      ...(reviewStatus === 'withdrawn' ? [{ at: draft.reviewResult?.reviewedAt || '2026-09-07 20:30', description: isEnglish ? 'Review withdrawn' : '撤销审核' }] : []),
      ...(publicationStatus === 'live' ? [{ at: draft.reviewResult?.reviewedAt || '2026-09-07 21:20', description: isEnglish ? 'Version went live' : '版本上线' }] : []),
      ...(publicationStatus === 'delisted' ? [{ at: draft.reviewResult?.reviewedAt || '2026-09-07 21:20', description: isEnglish ? 'Version delisted' : '版本下架' }] : []),
    ];
    const demoRecord = ({ id, versionName, reviewStatus, publicationStatus = 'offline', createdAt, submittedAt = '', reviewedAt = '', packageSummary = '3 个 PC Build', qualificationVersionId = 'QUAL-V1', reviewResult = null, openByDefault = false }) => ({ id, versionName, reviewStatus, publicationStatus, status: reviewStatus, createdAt, submittedAt, reviewedAt, packageSummary, qualificationVersionId, submitter: isEnglish ? 'Current developer' : '当前开发者', isDemo: true, openByDefault, draft: snapshot, reviewResult, operationLogs: defaultOperations(reviewStatus, publicationStatus) });
    const fallbackRecords = game.gameKey === 'existing' ? [
      demoRecord({ id: 'DEMO-REVIEWING', versionName: 'V-20260907-2', reviewStatus: 'reviewing', createdAt: '2026-09-07 19:53', submittedAt: '2026-09-07 20:16', openByDefault: true }),
      demoRecord({ id: 'DEMO-DRAFT', versionName: 'V-20260907-1', reviewStatus: 'draft', createdAt: '2026-09-07 18:32', packageSummary: '—' }),
      demoRecord({ id: 'DEMO-REJECTED', versionName: 'V-20260906-2', reviewStatus: 'rejected', createdAt: '2026-09-06 14:20', submittedAt: '2026-09-06 15:10', reviewedAt: '2026-09-06 17:30', reviewResult: { decision: 'rejected', reviewer: '平台运营', reviewedAt: '2026-09-06 17:30', reason: isEnglish ? 'The store screenshots contain third-party copyrighted material. Replace them and submit again.' : '商店截图含第三方版权素材，请替换后重新提交。' } }),
      demoRecord({ id: 'DEMO-WITHDRAWN', versionName: 'V-20260905', reviewStatus: 'withdrawn', createdAt: '2026-09-05 09:18', submittedAt: '2026-09-05 10:05', reviewedAt: '2026-09-05 10:30' }),
      demoRecord({ id: 'DEMO-APPROVED', versionName: 'V-20260904', reviewStatus: 'approved', createdAt: '2026-09-04 11:26', submittedAt: '2026-09-04 13:40', reviewedAt: '2026-09-04 16:22', reviewResult: { decision: 'approved', reviewer: '平台运营', reviewedAt: '2026-09-04 16:22' } }),
      demoRecord({ id: 'DEMO-LIVE', versionName: 'V-20260903', reviewStatus: 'approved', publicationStatus: 'live', createdAt: '2026-09-03 08:45', submittedAt: '2026-09-03 10:12', reviewedAt: '2026-09-03 14:35', reviewResult: { decision: 'approved', reviewer: '平台运营', reviewedAt: '2026-09-03 14:35' } }),
      demoRecord({ id: 'DEMO-DELISTED', versionName: 'V-20260828', reviewStatus: 'approved', publicationStatus: 'delisted', createdAt: '2026-08-28 10:10', submittedAt: '2026-08-28 11:20', reviewedAt: '2026-09-02 18:40', reviewResult: { decision: 'approved', reviewer: '平台运营', reviewedAt: '2026-09-02 18:40', reason: isEnglish ? 'This version was delisted. View the operation record for details.' : '该版本已下架，可通过操作记录回溯处理过程。' } }),
    ] : [demoRecord({ id: `DEMO-${draft.gameKey || 'GAME'}-CURRENT`, versionName: draft.versionName || game.version || 'V-20260907', reviewStatus: fixtureReviewStatus, publicationStatus: fixturePublicationStatus, createdAt: draft.savedAt || draft.submittedAt || '2026-09-07 19:53', submittedAt: draft.submittedAt || '', reviewedAt: draft.reviewResult?.reviewedAt || '', packageSummary: Number(game.builds || 0) ? `${game.builds} 个 PC Build` : '—', qualificationVersionId: draft.qualifications?.activeVersion?.id || '', reviewResult: draft.reviewResult || null })];
    const baseRecords = storedRecords.length ? storedRecords.map(record => {
      const reviewStatus = reviewStatusFor(record);
      const publicationStatus = publicationStatusFor(record);
      return { ...record, reviewStatus, publicationStatus, status: reviewStatus, versionName: record.versionName || draft.versionName, packageSummary: record.packageSummary || (Number(game.builds || 0) ? `${game.builds} 个 PC Build` : '—'), operationLogs: record.operationLogs || defaultOperations(reviewStatus, publicationStatus) };
    }) : fallbackRecords;
    const demoState = profileState.demoReleaseState ||= { open: false, active: false, status: 'reviewing' };
    const demoPair = demoStatusPair(demoState.status);
    const records = demoState.active ? baseRecords.map((record, index) => index ? record : { ...record, ...demoPair, status: demoPair.reviewStatus, displayStatus: '', isDemoPresentation: true, operationLogs: defaultOperations(demoPair.reviewStatus, demoPair.publicationStatus), reviewResult: demoPair.reviewStatus === 'rejected' ? { decision: 'rejected', reviewer: '平台运营', reviewedAt: '2026-09-07 21:05', reason: isEnglish ? 'The store screenshots contain third-party copyrighted material. Replace them and submit again.' : '商店截图含第三方版权素材，请替换后重新提交。' } : demoState.status === 'delisted' ? { decision: 'approved', reviewer: '平台运营', reviewedAt: '2026-09-07 21:05', reason: isEnglish ? 'The version was delisted after a valid complaint. Review the operation record for details.' : '收到有效投诉后版本已下架，请通过操作记录查看详情。' } : demoPair.reviewStatus === 'approved' ? { decision: 'approved', reviewer: '平台运营', reviewedAt: '2026-09-07 21:05' } : null }) : baseRecords;
    profileState.displayedVersionRecords = records;
    profileState.expandedVersionIds ||= new Set(records.filter(record => record.openByDefault).map(record => record.id));
    const storedViewer = profileState.versionViewer || { status: 'list', submissionId: '', record: null };
    const displayedViewerRecord = records.find(record => record.id === storedViewer.submissionId && record.isDemoPresentation);
    const viewer = displayedViewerRecord && storedViewer.status === 'ready' ? { ...storedViewer, record: displayedViewerRecord } : storedViewer;
    const simulator = renderDemoStateSwitcher(draft, lang, profileState, records[0]);
    if (viewer.status !== 'list') return `${renderVersionSnapshot(draft, lang, records, viewer)}${simulator}`;
    const current = records[0];
    const pageCount = Math.max(1, Math.ceil(records.length / VERSION_PAGE_SIZE));
    profileState.versionPage = Math.min(Math.max(Number(profileState.versionPage) || 1, 1), pageCount);
    const page = profileState.versionPage;
    const pageRows = records.slice((page - 1) * VERSION_PAGE_SIZE, page * VERSION_PAGE_SIZE);
    const refreshed = profileState.versionRefreshedAt ? `<span class="pgp-version-refreshed" role="status">${isEnglish ? 'Updated just now' : '刚刚更新'}</span>` : '';
    const rows = pageRows.map(item => {
      const expanded = profileState.expandedVersionIds.has(item.id);
      const logs = item.operationLogs || defaultOperations(reviewStatusFor(item), publicationStatusFor(item));
      const reminder = item.reviewResult?.reason ? `<aside class="pgp-version-reminder"><strong>${isEnglish ? 'Review note' : '审核提醒'}</strong><p>${esc(item.reviewResult.reason)}</p></aside>` : '';
      return `<article class="pgp-version-record${expanded ? ' is-expanded' : ''}" data-version-record="${esc(item.id)}"><div class="pgp-version-record__row"><div class="pgp-version-record__name"><span aria-hidden="true">◇</span><div><strong>${esc(item.versionName || item.id)}</strong><button type="button" data-version-open="${esc(item.id)}">${isEnglish ? 'Version details' : '版本详情'}</button></div></div><time>${esc(versionDate(lang, item.createdAt || item.submittedAt))}</time>${versionStatusTags(lang, item)}<span>${esc(item.packageSummary || '—')}</span><button type="button" class="pgp-version-record__toggle" data-version-toggle="${esc(item.id)}" aria-expanded="${expanded}">${isEnglish ? `${logs.length} actions` : `${logs.length} 条操作记录`}<i aria-hidden="true">⌄</i></button></div><section class="pgp-version-operations"${expanded ? '' : ' hidden'} data-version-operations="${esc(item.id)}">${reminder}<div class="pgp-version-operation-head"><span>${isEnglish ? 'Time' : '操作时间'}</span><span>${isEnglish ? 'Description' : '描述'}</span><span>${isEnglish ? 'Version name' : '版本名称'}</span><span>${isEnglish ? 'Version number' : '版本号'}</span></div>${logs.map(log => `<div class="pgp-version-operation-row"><time>${esc(versionDate(lang, log.at))}</time><p>${esc(log.description)}</p><span>${esc(log.versionName || item.versionName || '—')}</span><span>${esc(log.versionNumber || item.id || '—')}</span></div>`).join('')}</section></article>`;
    }).join('');
    return `<section class="pgp-versions" data-profile-versions><section class="pgp-current-version"><header><h3>${isEnglish ? 'Current version status' : '当前版本状态'}</h3><p>${isEnglish ? `The latest record is ${current.versionName}. Review and publication are tracked separately.` : `最新记录为 ${current.versionName}，审核与发行状态分别记录。`}</p></header><div><span>${isEnglish ? 'Current version' : '当前版本'} <strong>${esc(current.versionName || current.id)}</strong></span><span>${isEnglish ? 'Status' : '当前状态'} ${versionStatusTags(lang, current)}</span></div></section><header class="pgp-version-list-head"><div><h3>${isEnglish ? 'Version list' : '版本列表'} <small>${isEnglish ? `${records.length} records` : `共 ${records.length} 条记录`}</small></h3><p>${isEnglish ? 'Review each version’s created time, review and publication status, PC build and operation log.' : '按版本查看创建时间、审核与发行状态、PC 包体及操作记录。'}</p></div><div>${refreshed}<button type="button" data-version-refresh aria-label="${isEnglish ? 'Refresh version list' : '刷新版本列表'}">↻</button></div></header><div class="pgp-version-table-scroll" role="region" aria-label="${isEnglish ? 'Version records table' : '版本记录表格'}" tabindex="0"><div class="pgp-version-table-head"><span>${isEnglish ? 'Version' : '版本号'}</span><span>${isEnglish ? 'Created' : '创建时间'}</span><span>${isEnglish ? 'Review / publication status' : '审核／发行状态'}</span><span>${isEnglish ? 'PC build' : 'PC 包体'}</span><span>${isEnglish ? 'Actions' : '操作'}</span></div><div class="pgp-version-list">${rows}</div></div><footer class="pgp-version-pagination"><span>${isEnglish ? `${VERSION_PAGE_SIZE} per page · Total ${records.length}` : `每页 ${VERSION_PAGE_SIZE} 条 · 共 ${records.length} 条`}</span><button type="button" data-version-page="${page - 1}"${page <= 1 ? ' disabled' : ''} aria-label="${isEnglish ? 'Previous page' : '上一页'}">‹</button><b>${page} / ${pageCount}</b><button type="button" data-version-page="${page + 1}"${page >= pageCount ? ' disabled' : ''} aria-label="${isEnglish ? 'Next page' : '下一页'}">›</button></footer></section>${simulator}`;
  }
  function render(draft, language = 'zh', options = {}) {
    const lang = language === 'en' ? 'en' : 'zh';
    const activeModule = ['release-workspace', 'profile', 'catalog', 'release', 'qualifications', 'versions'].includes(options.section) ? options.section : 'release-workspace';
    const releaseWorkspace = activeModule === 'release-workspace';
    const done = completion(draft);
    const busy = stateFor(draft).uploads.size > 0;
    const readonly = lock(draft);
    const contentLanguage = draft.currentNameLanguage || 'en';
    draft.ui.contentLanguage = contentLanguage;
    const languageTabs = (kind = 'content') => `<div class="pgp-language-tabs" role="group" aria-label="${esc(t(lang, 'contentLanguage'))}">${['zh', 'en'].map(value => `<button type="button" data-profile-${kind}-language="${value}" aria-pressed="${contentLanguage === value}" class="${contentLanguage === value ? 'is-active' : ''}">${esc(t(lang, value === 'zh' ? 'contentZh' : 'contentEn'))}<small>${esc(t(lang, contentRequired(draft, value) ? 'contentRequired' : 'contentOptional'))}</small></button>`).join('')}</div>`;
    const regionField = `<div class="pgp-release-field" data-profile-field-wrap="releaseConfig.globalTerritoryCodes"><h4>${esc(t(lang, 'releaseTerritories'))} ${required}</h4>${window.PublisherReleaseRegions.render(draft.releaseConfig, lang, { readonly })}${errorHTML(draft, lang, 'releaseConfig.globalTerritoryCodes')}</div>`;
    const classification = `${checkGroup(draft, lang, 'genres', genres.map((genre, index) => [genre, lang === 'en' ? genreEn[index] : genre]))}${checkGroup(draft, lang, 'platforms', platforms.map(platform => [platform, platform]))}`;
    const localizedKeys = ['zh', 'en'].includes(contentLanguage) ? contentKeys(contentLanguage) : [`gameNames.${contentLanguage}`, `localizedContent.${contentLanguage}.tagline`, `localizedContent.${contentLanguage}.description`];
    const isRequired = contentRequired(draft, contentLanguage);
    const basic = `${window.PublisherGameNames.render(draft, lang, { readonly, idPrefix: 'profile-basic', error: Object.fromEntries(draft.nameLanguages.map(code => [code, t(lang, draft.errors[`gameNames.${code}`] || draft.errors[code === 'zh' ? 'gameNameZh' : code === 'en' ? 'gameNameEn' : ''] || '')])), requiredLanguages: ['zh', 'en'].filter(code => contentRequired(draft, code)) })}<p class="pgp-hint pgp-language-hint">${esc(t(lang, 'contentHint'))}</p><div class="pgp-basic-grid">${uploadSingle(draft, lang, 'assets.icon', t(lang, 'iconHint'), contentLanguage === draft.assetLanguageSettings.defaultNameLanguage)}<div class="pgp-form-grid"><div class="pgp-wide">${field(draft, lang, localizedKeys[1], { isRequired, label: lang === 'en' ? 'Short description' : '一句话介绍' })}</div>${field(draft, lang, localizedKeys[2], { isRequired, textarea: true, label: lang === 'en' ? 'Full description' : '完整介绍' })}</div></div>`;
    const developer = `<div class="pgp-form-grid"><div class="pgp-field"><label>${esc(t(lang, 'company'))}</label><input readonly value="星海互动" aria-label="${esc(t(lang, 'company'))}"></div>${draft.relationship === 'publisher' ? field(draft, lang, 'developerName', { isRequired: true }) : ''}${choiceGroup(draft, lang, 'relationship', relationships, { wide: true, readonly })}</div>`;
    const settings = `<div class="pgp-form-grid"><div class="pgp-wide">${field(draft, lang, 'website')}</div>${field(draft, lang, 'playerGroupName')}${field(draft, lang, 'playerGroupNumber')}</div>`;
    const qualification = renderQualifications(draft, lang);
    const qualificationEmbedded = renderQualifications(draft, lang, { embedded: true });
    const builds = window.PublisherGameBuilds.render(draft, lang, { readonly });
    const targetInterests = `<fieldset class="pgp-check-group pgp-target-interests pgp-wide" data-profile-field-wrap="targetUserInterests"><legend>${esc(t(lang, 'targetUserInterests'))} ${required}</legend><p class="pgp-hint">${esc(t(lang, 'targetUserInterestsHint'))}</p><div class="pgp-checks">${targetInterestOptions.map(([value, zh, en]) => `<label><input type="checkbox" value="${value}" data-profile-array="targetUserInterests"${draft.targetUserInterests.includes(value) ? ' checked' : ''}${readonly ? ' disabled' : ''}><span>${esc(lang === 'en' ? en : zh)}</span></label>`).join('')}</div>${errorHTML(draft, lang, 'targetUserInterests')}</fieldset>`;
    const publication = `${regionField}${targetInterests}${choiceGroup(draft, lang, 'releaseStatus', releaseStates, { readonly })}<p class="pgp-hint">${esc(t(lang, 'releaseStatusHint'))}</p><div class="pgp-release-timing"><h4>${esc(t(lang, 'effectiveTime'))}</h4><div class="pgp-checks">${['immediate', 'scheduled'].map(mode => `<label><input type="radio" name="profile-publication" data-profile-publication value="${mode}"${draft.publication.mode === mode ? ' checked' : ''}>${esc(t(lang, mode))}</label>`).join('')}</div>${draft.publication.mode === 'scheduled' ? `${field(draft, lang, 'publication.scheduledAt', { isRequired: true, hint: t(lang, 'scheduleHint') })}<p class="pgp-hint" data-profile-timezone>${esc(t(lang, 'timeZone', { zone: Intl.DateTimeFormat().resolvedOptions().timeZone }))}</p>` : ''}</div>`;
    const savedText = draft.saving ? t(lang, 'saving') : draft.dirty ? t(lang, 'unsaved') : draft.savedAt ? t(lang, 'saved') : t(lang, 'neverSaved');
    const submissionTime = draft.submittedAt || draft.savedAt;
    const reviewResult = draft.reviewResult;
    const reviewHTML = reviewResult ? `<aside class="pgp-review-result${draft.reviewStatus === 'rejected' ? ' is-rejected' : ''}" data-profile-review-result><strong>${esc(t(lang, draft.reviewStatus === 'rejected' ? 'rejectedNotice' : 'approved'))}</strong>${draft.reviewStatus === 'rejected' ? `<p><b>${esc(t(lang, 'reviewReason'))}：</b><span data-profile-review-reason>${esc(reviewResult.reason)}</span></p>` : ''}<div><span>${esc(t(lang, 'reviewer'))}：${esc(reviewResult.reviewer || '—')}</span><span>${esc(t(lang, 'reviewedAt'))}：${esc(reviewResult.reviewedAt ? new Date(reviewResult.reviewedAt).toLocaleString(lang === 'en' ? 'en-GB' : 'zh-CN', { hour12: false }) : '—')}</span></div></aside>` : '';
    const profileBody = `${card(draft, lang, 'basic', basic)}${card(draft, lang, 'classification', classification)}${card(draft, lang, 'developer', developer)}${card(draft, lang, 'assets', window.PublisherGameNames.render(draft, lang, { readonly, hideInput: true, idPrefix: 'profile-assets', title: lang === 'en' ? 'Store detail languages' : '商店资料语言' }) + `<p class="pgp-hint">${esc(t(lang, 'assetLocaleHint'))}</p>` + renderAssets(draft, lang))}${card(draft, lang, 'settings', settings)}`;
    const releaseAnchor = ['profile', 'builds', 'catalog', 'release', 'qualification'].includes(draft.ui.releaseAnchor) ? draft.ui.releaseAnchor : 'profile';
    let releaseLocator = releaseWorkspace ? `<nav class="pgp-release-locator" aria-label="${lang === 'en' ? 'Version release sections' : '版本发布页内定位'}">${[['profile', '游戏资料', 'Game details'], ['builds', 'PC 包体', 'PC builds'], ['catalog', '商品与 SKU', 'Products & SKU'], ['release', '发行设置', 'Release settings'], ['qualification', '资质认证', 'Qualifications']].map(([id, zh, en]) => `<button type="button" class="${releaseAnchor === id ? 'is-active' : ''}" data-release-locator="${id}" aria-current="${releaseAnchor === id ? 'location' : 'false'}">${esc(lang === 'en' ? en : zh)}</button>`).join('')}</nav>` : '';
    const releaseWorkspaceBody = `<div class="pgp-release-workspace"><section class="pgp-release-block" data-release-anchor="profile">${profileBody}</section><section class="pgp-release-block" data-release-anchor="builds">${builds}</section><section class="pgp-release-block" data-release-anchor="catalog">${renderPricing(draft, lang)}</section><section class="pgp-release-block" data-release-anchor="release">${card(draft, lang, 'publication', publication)}</section><section class="pgp-release-block" data-release-anchor="qualification">${qualificationEmbedded}</section></div>`;
    const moduleBody = releaseWorkspace ? releaseWorkspaceBody : activeModule === 'profile' ? profileBody : activeModule === 'catalog' ? renderPricing(draft, lang) : activeModule === 'release' ? card(draft, lang, 'publication', publication) : activeModule === 'qualifications' ? `<section class="pgp-qualification-workspace">${qualification}</section>` : renderVersions(draft, lang, options.game || {});
    const moduleTitle = lang === 'en' ? ({ 'release-workspace': 'Version release', profile: 'Game details', catalog: 'Products & SKU', release: 'Release settings', qualifications: 'Qualifications', versions: 'Version records' }[activeModule]) : ({ 'release-workspace': '版本发布', profile: '游戏资料', catalog: '商品与 SKU', release: '发行设置', qualifications: '资质认证', versions: '发布记录' }[activeModule]);
    const releaseActions = releaseWorkspace ? draft.reviewStatus === 'reviewing'
      ? `<div class="pgp-release-actions"><button type="button" class="pgp-button" data-profile-withdraw${draft.withdrawing ? ' disabled' : ''}>${esc(t(lang, draft.withdrawing ? 'withdrawing' : 'withdraw'))}</button></div>`
      : `<div class="pgp-release-actions"><span data-profile-save-state>${esc(savedText)}</span><button type="button" class="pgp-button" data-profile-save${readonly || busy ? ' disabled' : ''}>${esc(t(lang, draft.saving ? 'saving' : 'save'))}</button><button type="button" class="pgp-button pgp-button--primary" data-profile-submit${readonly || busy ? ' disabled' : ''}>${esc(t(lang, draft.submitting ? 'submitting' : draft.reviewStatus === 'rejected' ? 'resubmit' : 'submit'))}</button></div>` : '';
    const releaseToolbar = releaseWorkspace ? `<div class="pgp-release-toolbar">${releaseLocator}${releaseActions}</div>` : '';
    if (releaseWorkspace) releaseLocator = '';
    const releaseState = releaseWorkspace ? `${releaseLocator}<div class="pgp-version-bar"><div><span>${esc(t(lang, 'currentVersion'))}</span><strong>${esc(draft.versionName)}</strong></div><div><span>${esc(t(lang, 'reviewStatus'))}</span><strong class="pgp-version-status" data-profile-status>${esc(t(lang, draft.reviewStatus))}</strong></div><div><span>${esc(t(lang, 'completion'))}</span><button type="button" data-profile-show-missing><b data-profile-completion>${done.complete} / ${done.total}</b><small>${esc(t(lang, done.missing.length ? 'remaining' : 'completeAll', { count: done.missing.length }))}</small></button></div><div><span>${esc(t(lang, 'publication'))}</span><button type="button" data-profile-publication-toggle>${esc(t(lang, draft.publication.mode === 'scheduled' ? 'scheduled' : 'immediate'))}<i aria-hidden="true">⌄</i></button></div></div>${['reviewing', 'approved'].includes(draft.reviewStatus) ? `<div class="pgp-locked" role="status"><p>${esc(t(lang, draft.reviewStatus === 'approved' ? 'approvedNotice' : 'locked'))}</p><dl class="pgp-submission"><div><dt>${esc(t(lang, 'submissionId'))}</dt><dd data-profile-submission-id>${esc(draft.submissionId)}</dd></div><div><dt>${esc(t(lang, 'submittedAt'))}</dt><dd><time datetime="${esc(submissionTime)}" data-profile-submitted-at>${esc(submissionTime ? new Date(submissionTime).toLocaleString(lang === 'en' ? 'en-GB' : 'zh-CN', { hour12: false }) : '—')}</time></dd></div></dl></div>` : ''}${reviewHTML}${busy ? `<p class="pgp-upload-status" role="status">${esc(t(lang, 'uploading'))}</p>` : ''}${errorHTML(draft, lang, 'save')}${errorHTML(draft, lang, 'submit')}${errorHTML(draft, lang, 'withdraw')}${errorHTML(draft, lang, 'upload')}${missingHTML(draft, lang)}` : '';
    const backTop = releaseWorkspace ? `<button type="button" class="pgp-back-top" data-profile-back-top aria-label="${lang === 'en' ? 'Back to top' : '返回顶部'}" title="${lang === 'en' ? 'Back to top' : '返回顶部'}" hidden><span aria-hidden="true">↑</span></button>` : '';
    const withdrawKind = draft.ui.withdrawConfirm;
    const withdrawConfirmation = withdrawKind ? `<div class="pgp-confirm" data-profile-withdraw-confirm role="presentation"><button type="button" class="pgp-confirm__backdrop" data-withdraw-confirm-cancel aria-label="${lang === 'en' ? 'Cancel withdrawal' : '取消撤销'}"></button><section class="pgp-confirm__dialog" role="alertdialog" aria-modal="true" aria-labelledby="pgp-withdraw-title" aria-describedby="pgp-withdraw-description"><header><h3 id="pgp-withdraw-title">${lang === 'en' ? 'Withdraw this review?' : withdrawKind === 'release' ? '撤销版本审核？' : '撤销资质审核？'}</h3><button type="button" data-withdraw-confirm-cancel aria-label="${lang === 'en' ? 'Close' : '关闭'}">×</button></header><p id="pgp-withdraw-description">${lang === 'en' ? 'The current review will stop and the submitted content will become editable again.' : withdrawKind === 'release' ? '撤销后，本次版本审核终止，内容恢复可编辑。' : '撤销后，本次资质审核终止，资料恢复可编辑。'}</p><footer><button type="button" class="pgp-button" data-withdraw-confirm-cancel>${lang === 'en' ? 'Cancel' : '取消'}</button><button type="button" class="pgp-button pgp-button--danger" data-withdraw-confirm-submit>${lang === 'en' ? 'Confirm withdrawal' : '确认撤销'}</button></footer></section></div>` : '';
    return `<section class="publisher-game-profile" data-publisher-profile data-profile-game="${esc(draft.gameKey)}" data-profile-language="${lang}" data-profile-module="${activeModule}"><header class="pgp-title"><h2>${esc(moduleTitle)}</h2></header>${releaseToolbar}${releaseState}<fieldset class="pgp-editable"${readonly ? ' data-profile-locked' : ''}>${moduleBody}</fieldset>${backTop}${withdrawConfirmation}</section>`;
  }
  async function readFile(file, key) {
    if (!file || !file.size) throw 'fileUnavailable';
    const record = { name: file.name, type: file.type, size: file.size, blob: file };
    if (key.startsWith('qualifications.') && file.type === 'application/pdf') {
      if (!(await file.slice(0, 5).text()).startsWith('%PDF-')) throw 'documentRead';
      return record;
    }
    const video = ['assets.trailer', 'assets.gameplay'].includes(key);
    if (video) {
      if (file.type !== 'video/mp4') throw 'videoType';
      if (file.size > videoLimit) throw 'videoSize';
    } else {
      if (!['image/png', 'image/jpeg'].includes(file.type)) throw key.startsWith('qualifications.') ? 'documentType' : 'imageType';
      if (file.size > imageLimit) throw 'imageSize';
    }
    const url = URL.createObjectURL(file);
    try {
      const metadata = await new Promise((resolve, reject) => {
        const media = video ? document.createElement('video') : new Image();
        const timeout = setTimeout(() => { media.removeAttribute('src'); reject(video ? 'videoRead' : 'imageRead'); }, 15000);
        const settle = callback => { clearTimeout(timeout); callback(); };
        media.onerror = () => settle(() => reject(video ? 'videoRead' : 'imageRead'));
        if (video) { media.preload = 'metadata'; media.onloadedmetadata = () => settle(() => resolve({ width: media.videoWidth, height: media.videoHeight, duration: media.duration })); }
        else media.onload = () => settle(() => resolve({ width: media.naturalWidth, height: media.naturalHeight }));
        media.src = url;
      });
      Object.assign(record, metadata);
      if (!record.width || !record.height || (video && !Number.isFinite(record.duration))) throw video ? 'videoRead' : 'imageRead';
      if (key === 'assets.icon' && !validIcon(record)) throw 'iconDimensions';
      if (key === 'assets.landscape' && !ratio16(record)) throw 'landscapeRatio';
      if (key === 'assets.gameplay' && (record.duration < 15 || record.duration > 1800)) throw 'gameplayDuration';
      return record;
    } finally { URL.revokeObjectURL(url); }
  }
  function bind(container, { draft, language = 'zh', onChange = () => {}, onInterfaceLanguage = () => {}, onSectionChange = () => {}, onSave = async () => {}, onSubmit = async () => {}, onWithdraw = async () => {}, onQualificationSubmit = async () => {}, onQualificationWithdraw = async () => {}, onVersionOpen = async () => null, onVersionRefresh = async () => null }) {
    const root = container.matches('[data-publisher-profile]') ? container : container.querySelector('[data-publisher-profile]');
    if (!root) return;
    const lang = language === 'en' ? 'en' : 'zh';
    const state = stateFor(draft);
    state.root = root;
    // The parent replaces the entire console, including its scrollable .workspace.
    // Keep DOM-only view state beside the draft; explicit field navigation takes precedence.
    function captureScroll(anchorSelector) {
      const current = state.root;
      if (!current?.isConnected) return null;
      const ancestors = [];
      let depth = 0;
      for (let node = current; node; node = node.parentElement, depth += 1) {
        if (node === document.scrollingElement) continue;
        const style = getComputedStyle(node);
        if (/(auto|scroll|overlay)/.test(style.overflowX + style.overflowY) || node.scrollTop || node.scrollLeft) ancestors.push({ depth, top: node.scrollTop, left: node.scrollLeft });
      }
      const anchor = anchorSelector ? current.querySelector(anchorSelector) : null;
      return { ancestors, windowX: window.scrollX, windowY: window.scrollY, anchorSelector, anchorTop: anchor?.getBoundingClientRect().top };
    }
    function restoreScroll(snapshot) {
      const restored = [];
      snapshot.ancestors.forEach(position => {
        let node = root;
        for (let depth = 0; depth < position.depth && node; depth += 1) node = node.parentElement;
        if (!node) return;
        node.scrollTo({ top: position.top, left: position.left, behavior: 'instant' });
        restored.push(node);
      });
      window.scrollTo({ left: snapshot.windowX, top: snapshot.windowY, behavior: 'instant' });
      const anchor = snapshot.anchorSelector && root.querySelector(snapshot.anchorSelector);
      if (!anchor) return;
      // Keep the clicked tab in place if the new panel changes layout above it.
      const delta = anchor.getBoundingClientRect().top - snapshot.anchorTop;
      if (Math.abs(delta) > 1) {
        const scroller = restored.find(node => node.scrollHeight > node.clientHeight);
        if (scroller) scroller.scrollTop += delta;
        else window.scrollBy({ top: delta, behavior: 'instant' });
      }
      anchor.focus({ preventScroll: true });
    }
    const repaint = (focus, anchorSelector = '') => {
      state.focus = focus || null;
      state.scrollSnapshot = focus ? null : captureScroll(anchorSelector);
      onChange();
    };
    const allRecords = [...Object.values(draft.localizedAssets).flatMap(assets => [assets.icon, ...assets.landscape, ...assets.portrait, ...assets.screenshots, assets.trailer, assets.gameplay]), ...Object.values(draft.qualificationFiles || {})].filter(validFile);
    const used = new Set(allRecords.map(file => file.blob));
    state.urls.forEach((url, blob) => { if (!used.has(blob)) { URL.revokeObjectURL(url); state.urls.delete(blob); } });
    if (!state.observer) {
      state.observer = new MutationObserver(() => {
        if (state.root?.isConnected) return;
        state.urls.forEach(url => URL.revokeObjectURL(url)); state.urls.clear();
        state.observer?.disconnect(); state.observer = null;
      });
      state.observer.observe(document.body, { childList: true, subtree: true });
    }
    if (root.__publisherProfileBound) return;
    root.__publisherProfileBound = true;
    const backTop = root.querySelector('[data-profile-back-top]');
    const scrollContainer = root.closest('.workspace');
    if (backTop && scrollContainer) {
      const syncBackTop = () => { backTop.hidden = scrollContainer.scrollTop < Math.max(480, scrollContainer.clientHeight * .75); };
      scrollContainer.addEventListener('scroll', syncBackTop, { passive: true });
      backTop.addEventListener('click', () => scrollContainer.scrollTo({ top: 0, behavior: 'smooth' }));
      syncBackTop();
    }
    const openVersion = async submissionId => {
      const request = ++state.versionRequest;
      const inlineRecord = state.displayedVersionRecords?.find(record => record.id === submissionId && (record.isDemo || record.isDemoPresentation));
      if (inlineRecord) {
        state.versionViewer = { status: 'ready', submissionId, record: inlineRecord };
        repaint();
        return;
      }
      state.versionViewer = { status: 'loading', submissionId, record: null };
      repaint();
      try {
        const loaded = await onVersionOpen(submissionId);
        if (request !== state.versionRequest) return;
        const record = Array.isArray(loaded) ? loaded.find(item => item?.id === submissionId) : loaded;
        state.versionViewer = record?.id === submissionId
          ? { status: 'ready', submissionId, record }
          : { status: 'missing', submissionId, record: null };
      } catch {
        if (request !== state.versionRequest) return;
        state.versionViewer = { status: 'error', submissionId, record: null };
      }
      if (state.root?.isConnected) repaint();
    };
    root.querySelectorAll('[data-version-open]').forEach(button => button.addEventListener('click', () => openVersion(button.dataset.versionOpen)));
    root.querySelector('[data-version-retry]')?.addEventListener('click', () => openVersion(state.versionViewer.submissionId));
    root.querySelector('[data-version-back]')?.addEventListener('click', () => {
      state.versionRequest += 1;
      state.versionViewer = { status: 'list', submissionId: '', record: null };
      repaint();
    });
    root.querySelectorAll('[data-version-toggle]').forEach(button => button.addEventListener('click', () => {
      const id = button.dataset.versionToggle;
      state.expandedVersionIds ||= new Set();
      if (state.expandedVersionIds.has(id)) state.expandedVersionIds.delete(id);
      else state.expandedVersionIds.add(id);
      repaint(null, `[data-version-toggle="${CSS.escape(id)}"]`);
    }));
    root.querySelectorAll('[data-version-page]').forEach(button => button.addEventListener('click', () => {
      if (button.disabled) return;
      state.versionPage = Math.max(1, Number(button.dataset.versionPage) || 1);
      state.expandedVersionIds = new Set();
      repaint();
    }));
    root.querySelectorAll('[data-demo-version-toggle]').forEach(button => button.addEventListener('click', () => {
      state.demoReleaseState ||= { open: false, active: false, status: 'reviewing' };
      state.demoReleaseState.open = !state.demoReleaseState.open;
      repaint();
    }));
    root.querySelectorAll('[data-demo-version-status]').forEach(button => button.addEventListener('click', () => {
      const status = button.dataset.demoVersionStatus;
      if (!['reviewing', 'approved', 'rejected', 'withdrawn', 'live', 'delisted'].includes(status)) return;
      state.demoReleaseState ||= { open: true, active: false, status: 'reviewing' };
      state.demoReleaseState.open = true;
      state.demoReleaseState.active = true;
      state.demoReleaseState.status = status;
      state.versionPage = 1;
      repaint();
    }));
    root.querySelector('[data-version-refresh]')?.addEventListener('click', async event => {
      if (event.currentTarget.disabled) return;
      event.currentTarget.disabled = true;
      try {
        const refreshed = await onVersionRefresh();
        if (Array.isArray(refreshed)) draft.releaseSubmissions = refreshed;
        state.versionPage = 1;
        state.versionRefreshedAt = Date.now();
      } finally {
        if (state.root?.isConnected) repaint(null, '[data-version-refresh]');
      }
    });
    root.querySelectorAll('[data-release-locator]').forEach(button => button.addEventListener('click', () => {
      const anchor = button.dataset.releaseLocator;
      if (!['profile', 'builds', 'catalog', 'release', 'qualification'].includes(anchor)) return;
      draft.ui.releaseAnchor = anchor;
      root.querySelectorAll('[data-release-locator]').forEach(item => {
        const active = item.dataset.releaseLocator === anchor;
        item.classList.toggle('is-active', active);
        item.setAttribute('aria-current', active ? 'location' : 'false');
      });
      root.querySelector(`[data-release-anchor="${anchor}"]`)?.scrollIntoView({ behavior: 'smooth', block: 'start' });
    }));
    function updateSummary() {
      const done = completion(draft);
      const completionValue = root.querySelector('[data-profile-completion]');
      if (completionValue) completionValue.textContent = `${done.complete} / ${done.total}`;
      const missingValue = root.querySelector('[data-profile-show-missing] small');
      if (missingValue) missingValue.textContent = t(lang, done.missing.length ? 'remaining' : 'completeAll', { count: done.missing.length });
      const saveState = root.querySelector('[data-profile-save-state]');
      if (saveState) saveState.textContent = t(lang, 'unsaved');
      sections.forEach(section => {
        const badge = root.querySelector(`[data-profile-section-status="${section}"]`);
        if (!badge) return;
        badge.textContent = t(lang, done.sections[section] ? 'complete' : 'incomplete');
        badge.classList.toggle('is-complete', done.sections[section]);
        const navDot = root.closest('[data-publisher-game-console]')?.querySelector(`[data-profile-anchor="${section}"] i`);
        if (navDot) { navDot.classList.toggle('is-ready', done.sections[section]); navDot.classList.toggle('is-warning', !done.sections[section]); }
      });
    }
    function changed(key) {
      draft.dirty = true;
      draft.storeLocales = { enabled: draft.nameLanguages, default: draft.defaultNameLanguage, current: draft.currentNameLanguage };
      Object.assign(draft.gameProfileDraft, { gameNames: draft.gameNames, defaultLocale: draft.defaultNameLanguage, currentLocale: draft.currentNameLanguage, localizedContent: draft.localizedContent, localizedAssets: draft.localizedAssets, genres: draft.genres, platforms: draft.platforms, relationship: draft.relationship, developerName: draft.developerName, website: draft.website, playerGroupName: draft.playerGroupName, playerGroupNumber: draft.playerGroupNumber, listedElsewhere: draft.listedElsewhere });
      Object.assign(draft.releaseConfig, { releaseStatus: draft.releaseStatus, effectiveMode: draft.publication.mode, scheduledAt: draft.publication.scheduledAt, targetUserInterests: [...draft.targetUserInterests] });
      delete draft.errors[key]; delete draft.errors.save; delete draft.errors.submit;
      [key, 'save', 'submit'].forEach(errorKey => { const error = root.querySelector(`[data-profile-error="${errorKey}"]`); if (error) { error.hidden = true; error.textContent = ''; } });
      const control = root.querySelector(`[data-profile-field="${key}"]`);
      if (control) control.setAttribute('aria-invalid', 'false');
      updateSummary();
      if (draft.ui.showMissing) {
        draft.errors = { ...validate(draft), ...(draft.errors.upload ? { upload: draft.errors.upload } : {}) };
        const panel = root.querySelector('[data-profile-missing]');
        if (panel) panel.outerHTML = missingHTML(draft, lang);
      }
      if (key === 'compliance.copyrightNumber') {
        const requiredKeys = new Set(window.PublisherGameQualifications.requiredFields(draft).map(([fieldKey]) => fieldKey));
        const requirements = [
          ['qualifications.rights', !window.PublisherGameQualifications.hasCopyrightProof(draft)],
          ['qualifications.copyright', requiredKeys.has('qualifications.copyright')],
          ['compliance.copyrightNumber', requiredKeys.has('compliance.copyrightNumber')],
        ];
        requirements.forEach(([fieldKey, isRequired]) => {
          const wrapper = root.querySelector(`[data-profile-field-wrap="${fieldKey}"]`);
          const label = wrapper?.querySelector(':scope > h4, :scope > label');
          label?.querySelector('.pgp-required')?.remove();
          if (isRequired) label?.insertAdjacentHTML('beforeend', ` ${required}`);
          const error = wrapper?.querySelector(`[data-profile-error="${fieldKey}"]`);
          if (error && !draft.errors[fieldKey]) { error.hidden = true; error.textContent = ''; }
        });
      }
    }
    window.PublisherGameBuilds.bind(root, { draft, readonly: lock(draft), onChanged: changed, repaint: anchor => repaint(null, anchor) });
    function focusField(key) {
      if (['gameNameZh', 'taglineZh', 'descriptionZh', 'developerWordsZh'].includes(key)) draft.currentNameLanguage = draft.ui.contentLanguage = 'zh';
      if (['gameNameEn', 'tagline', 'description', 'developerWords'].includes(key)) draft.currentNameLanguage = draft.ui.contentLanguage = 'en';
      if (key.startsWith('gameNames.')) draft.currentNameLanguage = key.split('.')[1];
      if (!draft.nameLanguages.includes(draft.currentNameLanguage)) draft.nameLanguages.push(draft.currentNameLanguage);
      if (key.startsWith('assets.')) {
        draft.assetLanguageSettings.currentNameLanguage = draft.assetLanguageSettings.defaultNameLanguage;
        if (key === 'assets.icon') { draft.currentNameLanguage = draft.assetLanguageSettings.defaultNameLanguage; if (!draft.nameLanguages.includes(draft.currentNameLanguage)) draft.nameLanguages.push(draft.currentNameLanguage); }
        const category = key.split('.')[1];
        if (['trailer', 'gameplay'].includes(category)) draft.ui.assetTab = 'videos';
        else if (category === 'screenshots') draft.ui.assetTab = 'screenshots';
        else if (['landscape', 'portrait'].includes(category)) { draft.ui.assetTab = 'images'; draft.ui.imageCategory = category; }
      }
      const targetModule = moduleOf(key);
      if (root.dataset.profileModule === 'release-workspace' && ['profile', 'builds', 'catalog', 'release', 'qualification'].includes(targetModule)) {
        draft.ui.releaseAnchor = targetModule;
        state.focus = key;
        repaint();
        return;
      }
      if (root.dataset.profileModule !== targetModule) {
        draft.ui.profileFocus = key;
        onSectionChange(targetModule);
        return;
      }
      repaint(key);
    }
    const syncContent = () => {
      draft.ui.contentLanguage = draft.currentNameLanguage;
      draft.storeLocales = { enabled: draft.nameLanguages, default: draft.defaultNameLanguage, current: draft.currentNameLanguage };
      draft.assetLanguageSettings.nameLanguages = draft.nameLanguages;
      draft.assetLanguageSettings.defaultNameLanguage = draft.defaultNameLanguage;
      draft.assetLanguageSettings.currentNameLanguage = draft.currentNameLanguage;
      draft.nameLanguages.forEach(code => { draft.localizedContent[code] ||= { tagline: '', description: '', developerWords: '' }; draft.localizedAssets[code] ||= emptyAssets(); });
      window.PublisherGameNames.sync(draft);
      draft.assets = draft.localizedAssets[draft.assetLanguageSettings.defaultNameLanguage];
      Object.assign(draft.gameProfileDraft, { gameNames: draft.gameNames, defaultLocale: draft.defaultNameLanguage, currentLocale: draft.currentNameLanguage, localizedContent: draft.localizedContent, localizedAssets: draft.localizedAssets });
    };
    state.nameConfig = JSON.stringify([draft.nameLanguages, draft.defaultNameLanguage]);
    state.assetConfig = JSON.stringify([draft.assetLanguageSettings.nameLanguages, draft.assetLanguageSettings.defaultNameLanguage]);
    const basicSection = root.querySelector('[data-profile-section="basic"]');
    if (basicSection) window.PublisherGameNames.bind(basicSection, { draft, language: lang, readonly: lock(draft), idPrefix: 'profile-basic', requiredLanguages: ['zh', 'en'].filter(code => contentRequired(draft, code)), onInput: code => { changed(code === 'zh' ? 'gameNameZh' : code === 'en' ? 'gameNameEn' : `gameNames.${code}`); }, onChange: () => { const config = JSON.stringify([draft.nameLanguages, draft.defaultNameLanguage]); syncContent(); if (config !== state.nameConfig && !lock(draft)) changed('gameNames'); state.nameConfig = config; repaint(null, `[data-profile-section="basic"] [data-name-language="${draft.currentNameLanguage}"]`); } });
    const assetsSection = root.querySelector('[data-profile-section="assets"]');
    if (assetsSection) window.PublisherGameNames.bind(assetsSection, { draft, language: lang, readonly: lock(draft), hideInput: true, idPrefix: 'profile-assets', title: lang === 'en' ? 'Store detail languages' : '商店资料语言', onChange: () => { const config = JSON.stringify([draft.nameLanguages, draft.defaultNameLanguage]); syncContent(); if (config !== state.assetConfig && !lock(draft)) changed('assets'); state.assetConfig = config; repaint(null, `[data-profile-section="assets"] [data-name-language="${draft.currentNameLanguage}"]`); } });
    window.PublisherReleaseRegions.bind(root, { releaseConfig: draft.releaseConfig, language: lang, onChange: next => {
      if (lock(draft)) return;
      const hadDomestic = draft.releaseConfig.mode === 'domestic';
      draft.releaseConfig = { ...draft.releaseConfig, ...next };
      draft.releaseRegions = [draft.releaseConfig.mode];
      draft.releaseStatus = draft.releaseConfig.releaseStatus;
      draft.releaseTerritories = window.PublisherReleaseRegions.territoriesFor ? window.PublisherReleaseRegions.territoriesFor(draft.releaseConfig) : [];
      const hasDomestic = draft.releaseConfig.mode === 'domestic';
      if (hasDomestic && !hadDomestic) { draft.currentNameLanguage = draft.ui.contentLanguage = 'zh'; if (!draft.nameLanguages.includes('zh')) draft.nameLanguages.push('zh'); onInterfaceLanguage('zh'); }
      else if (!hasDomestic) { draft.currentNameLanguage = draft.ui.contentLanguage = 'en'; if (!draft.nameLanguages.includes('en')) draft.nameLanguages.push('en'); }
      syncContent();
      changed('releaseConfig.mode');
      changed('releaseConfig.globalTerritoryCodes');
      // Region changes alter language and license requirements; remove errors for requirements that no longer apply.
      draft.errors = Object.fromEntries(Object.entries(draft.errors).filter(([key]) => key in validate(draft) || ['save', 'submit', 'upload'].includes(key)));
      repaint();
    } });
    root.querySelectorAll('[data-profile-content-language], [data-profile-developer-language]').forEach(button => button.addEventListener('click', () => {
      draft.ui.contentLanguage = button.dataset.profileContentLanguage || button.dataset.profileDeveloperLanguage;
      draft.currentNameLanguage = draft.ui.contentLanguage;
      if (!draft.nameLanguages.includes(draft.currentNameLanguage)) draft.nameLanguages.push(draft.currentNameLanguage);
      syncContent();
      const attribute = button.hasAttribute('data-profile-content-language') ? 'data-profile-content-language' : 'data-profile-developer-language';
      repaint(null, `[${attribute}="${draft.ui.contentLanguage}"]`);
    }));
    root.querySelectorAll('[data-profile-field]').forEach(control => {
      const key = control.dataset.profileField;
      control.addEventListener(control.tagName === 'SELECT' ? 'change' : 'input', () => {
        if (lock(draft)) return;
        set(draft, key, control.value);
        const aliases = { tagline: ['en', 'tagline'], description: ['en', 'description'], developerWords: ['en', 'developerWords'], taglineZh: ['zh', 'tagline'], descriptionZh: ['zh', 'description'], developerWordsZh: ['zh', 'developerWords'] };
        if (aliases[key]) { const [code, field] = aliases[key]; draft.localizedContent[code][field] = control.value; }
        if (key === 'releaseStatus') draft.releaseTerritories = draft.releaseTerritories.map(item => ({ ...item, status: draft.releaseStatus }));
        changed(key);
        if (key === 'releaseStatus') { changed('releaseTerritories'); draft.errors = Object.fromEntries(Object.entries(draft.errors).filter(([errorKey]) => errorKey in validate(draft) || ['save', 'submit', 'upload'].includes(errorKey))); repaint(null, '[data-profile-field="releaseStatus"]'); }
        const count = root.querySelector(`[data-profile-count="${key}"]`); if (count) count.textContent = control.value.length;
        if (key === 'relationship') repaint(key);
        if (['compliance.networkMode', 'compliance.icpStatus'].includes(key)) {
          draft.errors = Object.fromEntries(Object.entries(draft.errors).filter(([errorKey]) => errorKey in validate(draft) || ['save', 'submit', 'upload'].includes(errorKey)));
          repaint(null, `[data-profile-field="${key}"]`);
        }
      });
    });
    root.querySelector('[data-profile-compliance-ack]')?.addEventListener('change', event => {
      if (lock(draft) || !draft.compliance) return;
      draft.compliance.antiAddictionAcknowledged = event.target.checked;
      changed('compliance.antiAddictionAcknowledged');
      event.target.setAttribute('aria-invalid', 'false');
    });
    const qualificationApplication = () => draft.qualifications.draft;
    const clearQualificationError = key => {
      const related = [key];
      if (['authorization.grantor', 'authorization.grantee'].includes(key)) related.push('authorization.parties');
      if (['authorization.startsAt', 'authorization.endsAt'].includes(key)) related.push('authorization.term', 'authorization.coverage');
      related.forEach(errorKey => {
        delete draft.qualificationErrors[errorKey];
        const error = root.querySelector(`[data-qualification-error="${errorKey}"]`);
        if (error) { error.hidden = true; error.textContent = ''; }
      });
      delete draft.qualificationActionError;
    };
    const qualificationChanged = key => {
      draft.qualificationDirty = true;
      clearQualificationError(key);
      const control = root.querySelector(`[data-qualification-field="${key}"]`);
      control?.setAttribute('aria-invalid', 'false');
    };
    const performQualificationWithdraw = async () => {
      const applicationId = draft.qualifications.pendingApplication?.applicationId;
      if (!applicationId || draft.qualificationWithdrawing) return;
      draft.ui.withdrawConfirm = '';
      draft.qualificationWithdrawing = true;
      draft.qualificationActionError = '';
      repaint();
      try {
        const result = await onQualificationWithdraw({ gameKey: draft.gameKey, applicationId });
        if (!result?.qualifications) throw new Error('qualification-withdraw-unavailable');
        draft.qualifications = window.PublisherGameQualifications.createQualificationState(result.qualifications);
        draft.qualificationErrors = {};
        draft.ui.qualificationEditorOpen = false;
      } catch (error) {
        draft.qualificationActionError = error?.message || 'qualification-withdraw-failed';
        draft.ui.qualificationEditorOpen = true;
      } finally {
        draft.qualificationWithdrawing = false;
        if (state.root?.isConnected) repaint();
      }
    };
    const performReleaseWithdraw = async () => {
      if (draft.reviewStatus !== 'reviewing' || draft.withdrawing) return;
      draft.ui.withdrawConfirm = '';
      draft.withdrawing = true;
      delete draft.errors.withdraw;
      repaint();
      try { await onWithdraw(draft); }
      catch { draft.errors.withdraw = 'withdrawFailed'; }
      finally { draft.withdrawing = false; if (state.root?.isConnected) repaint(); }
    };
    root.querySelectorAll('[data-qualification-scope]').forEach(button => button.addEventListener('click', () => {
      draft.ui.qualificationStandaloneMode = button.dataset.qualificationScope === 'domestic' ? 'domestic' : 'global';
      draft.ui.qualificationEditorOpen = false;
      draft.qualificationErrors = {};
      repaint(null, `[data-qualification-scope="${draft.ui.qualificationStandaloneMode}"]`);
    }));
    root.querySelectorAll('[data-qualification-card-action]').forEach(button => button.addEventListener('click', () => {
      draft.ui.qualificationEditorOpen = true;
      repaint(null, `[data-qualification-card="${button.dataset.qualificationCardAction}"]`);
    }));
    root.querySelectorAll('[data-qualification-region-open]').forEach(button => button.addEventListener('click', () => {
      draft.ui.qualificationStandaloneMode = button.dataset.qualificationRegionOpen === 'domestic' ? 'domestic' : 'global';
      draft.ui.qualificationEditorOpen = true;
      draft.qualificationErrors = {};
      repaint();
    }));
    root.querySelectorAll('[data-qualification-region-withdraw]').forEach(button => button.addEventListener('click', () => {
      draft.ui.qualificationStandaloneMode = button.dataset.qualificationRegionWithdraw === 'domestic' ? 'domestic' : 'global';
      draft.ui.withdrawConfirm = 'qualification';
      repaint();
    }));
    root.querySelector('[data-qualification-editor-close]')?.addEventListener('click', () => {
      draft.ui.qualificationEditorOpen = false;
      draft.qualificationErrors = {};
      draft.qualificationActionError = '';
      repaint(null, '[data-qualification-cards]');
    });
    root.querySelectorAll('[data-qualification-field]').forEach(control => control.addEventListener(control.tagName === 'SELECT' ? 'change' : 'input', () => {
      const key = control.dataset.qualificationField;
      let value = control.value;
      if (['authorization.platforms', 'authorization.territoryCodes'].includes(key)) value = [...new Set(value.split(/[,，]/).map(item => item.trim()).filter(Boolean))];
      set(qualificationApplication(), key, value);
      if (key === 'rightsRelationship') draft.qualifications.rightsRelationship = value;
      if (key === 'domestic.licenseNumber') { draft.licenseNumber = value; draft.releaseConfig.licenseNumber = value; }
      qualificationChanged(key);
      if (['rightsRelationship', 'domestic.networkMode', 'domestic.icpStatus'].includes(key)) repaint(null, `[data-qualification-field="${key}"]`);
    }));
    root.querySelector('[data-qualification-declaration]')?.addEventListener('change', event => {
      qualificationApplication().rightsDeclarationAccepted = event.target.checked;
      draft.qualifications.rightsDeclarationAccepted = event.target.checked;
      qualificationChanged('rightsDeclarationAccepted');
    });
    root.querySelector('[data-qualification-anti-ack]')?.addEventListener('change', event => {
      qualificationApplication().domestic.antiAddictionAcknowledged = event.target.checked;
      qualificationChanged('domestic.antiAddictionAcknowledged');
    });
    root.querySelectorAll('[data-qualification-file]').forEach(input => input.addEventListener('change', async () => {
      const key = input.dataset.qualificationFile;
      const selected = Array.from(input.files || []);
      if (!selected.length) return;
      const current = Array.isArray(get(qualificationApplication(), key)) ? get(qualificationApplication(), key) : [];
      if (current.length + selected.length > 10 || selected.some(file => !window.PublisherGameQualifications.IMAGE_TYPES.includes(file.type))) {
        draft.qualificationErrors[key] = key === 'authorization.files' ? (qualificationApplication().rightsRelationship === 'self_owned' ? 'rightsFilesInvalid' : 'authorizationFilesInvalid') : 'fileInvalid';
        repaint(null, `[data-qualification-upload-card="${input.dataset.qualificationCardKey}"]`);
        return;
      }
      const accepted = [];
      try {
        for (const file of selected) accepted.push(await readFile(file, 'qualifications.application'));
      } catch {
        draft.qualificationErrors[key] = key === 'authorization.files' ? (qualificationApplication().rightsRelationship === 'self_owned' ? 'rightsFilesInvalid' : 'authorizationFilesInvalid') : 'fileInvalid';
        repaint(null, `[data-qualification-upload-card="${input.dataset.qualificationCardKey}"]`);
        return;
      }
      set(qualificationApplication(), key, [...current, ...accepted]);
      qualificationChanged(key);
      repaint(null, `[data-qualification-upload-card="${input.dataset.qualificationCardKey}"]`);
    }));
    root.querySelectorAll('[data-qualification-file-remove]').forEach(button => button.addEventListener('click', () => {
      const key = button.dataset.qualificationFileRemove;
      const files = get(qualificationApplication(), key);
      if (!Array.isArray(files)) return;
      files.splice(Number(button.dataset.qualificationFileIndex), 1);
      qualificationChanged(key);
      repaint(null, `[data-qualification-upload-card="${button.closest('[data-qualification-upload-card]')?.dataset.qualificationUploadCard || ''}"]`);
    }));
    root.querySelector('[data-qualification-submit]')?.addEventListener('click', async () => {
      if (draft.qualificationSubmitting) return;
      const baseContext = window.PublisherGameQualifications.contextFor(draft);
      const selectedMode = root.querySelector('[data-qualification-profile]')?.dataset.qualificationContextMode || baseContext.mode;
      const context = { ...baseContext, mode: selectedMode, territoryCodes: selectedMode === 'domestic' ? ['CN'] : baseContext.mode === 'global' ? baseContext.territoryCodes : window.PublisherReleaseRegions.defaultTerritoryCodes() };
      const snapshot = window.PublisherGameQualifications.createApplicationDraft(qualificationApplication());
      draft.qualificationErrors = window.PublisherGameQualifications.validateApplication(snapshot, context);
      draft.qualificationActionError = '';
      if (Object.keys(draft.qualificationErrors).length) {
        draft.ui.qualificationEditorOpen = true;
        const first = Object.keys(draft.qualificationErrors)[0];
        draft.ui.qualificationFocus = ({ 'authorization.parties': 'authorization.grantor', 'authorization.term': 'authorization.startsAt', 'authorization.coverage': 'authorization.startsAt' })[first] || first;
        repaint();
        return;
      }
      draft.qualificationSubmitting = true;
      repaint();
      try {
        const result = await onQualificationSubmit({ gameKey: draft.gameKey, snapshot, context, applicationId: draft.qualifications.pendingApplication?.status === 'supplement_required' ? draft.qualifications.pendingApplication.applicationId : '' });
        if (!result?.qualifications) throw new Error('qualification-submit-unavailable');
        draft.qualifications = window.PublisherGameQualifications.createQualificationState(result.qualifications);
        draft.qualificationDirty = false;
        draft.qualificationErrors = {};
        draft.ui.qualificationEditorOpen = false;
      } catch (error) {
        if (error?.message === 'qualification-incomplete' && error.details) draft.qualificationErrors = { ...error.details };
        else draft.qualificationActionError = error?.message || 'qualification-submit-failed';
      } finally {
        draft.qualificationSubmitting = false;
        if (state.root?.isConnected) repaint();
      }
    });
    root.querySelector('[data-qualification-withdraw]')?.addEventListener('click', () => {
      if (!draft.qualifications.pendingApplication?.applicationId || draft.qualificationWithdrawing) return;
      draft.ui.withdrawConfirm = 'qualification';
      repaint();
    });
    root.querySelectorAll('[data-profile-array]').forEach(control => control.addEventListener('change', () => {
      if (lock(draft)) return;
      const key = control.dataset.profileArray;
      draft[key] = Array.from(root.querySelectorAll(`[data-profile-array="${key}"]:checked`), input => input.value);
      changed(key);
      if (key === 'platforms') repaint(key);
    }));
    root.querySelectorAll('[data-profile-pricing-model]').forEach(input => input.addEventListener('change', () => {
      if (lock(draft)) return;
      draft.pricing ||= { model: '', globalPrice: '', domesticPrice: '' };
      draft.pricing.model = input.value;
      draft.legacyPricing = false;
      delete draft.errors['pricing.globalPrice']; delete draft.errors['pricing.domesticPrice'];
      changed('pricing.model');
      repaint(null, `[data-profile-pricing-model="${input.value}"]`);
    }));
    root.querySelectorAll('[data-sku-build]').forEach(select => select.addEventListener('change', () => {
      if (lock(draft)) return;
      const key = select.dataset.skuBuild;
      const sku = key === 'catalog.baseGame' ? draft.catalog.baseGame : draft.catalog.dlcs[Number(key.split('.').pop())];
      if (!sku) return;
      sku.installContentRef = select.value;
      changed(`${key}.installContentRef`);
    }));
    root.querySelectorAll('[data-sku-pricing-model]').forEach(input => input.addEventListener('change', () => {
      if (lock(draft)) return;
      const sku = skuList(draft)[Number(input.dataset.skuPricingModel)];
      if (!sku) return;
      sku.pricingModel = input.value;
      if (input.value === 'free') Object.assign(sku, { listPrice: '', discountPrice: '', discountStartAt: '', discountEndAt: '' });
      changed(`${Number(input.dataset.skuPricingModel) ? `catalog.dlcs.${Number(input.dataset.skuPricingModel) - 1}` : 'catalog.baseGame'}.pricingModel`);
      repaint(null, `[data-sku-pricing-model="${input.dataset.skuPricingModel}"][value="${input.value}"]`);
    }));
    root.querySelector('[data-sku-add]')?.addEventListener('click', () => {
      if (lock(draft)) return;
      draft.catalog.dlcs.push(emptySku('dlc', draft.catalog.dlcs.length));
      changed('catalog.dlcs');
      repaint();
    });
    root.querySelectorAll('[data-sku-remove]').forEach(button => button.addEventListener('click', () => {
      if (lock(draft)) return;
      draft.catalog.dlcs.splice(Number(button.dataset.skuRemove), 1);
      changed('catalog.dlcs');
      repaint();
    }));
    root.querySelectorAll('[data-profile-asset-tab]').forEach(button => button.addEventListener('click', () => { draft.ui.assetTab = button.dataset.profileAssetTab; repaint(null, `[data-profile-asset-tab="${button.dataset.profileAssetTab}"]`); }));
    root.querySelectorAll('[data-profile-image-category]').forEach(button => button.addEventListener('click', () => { draft.ui.imageCategory = button.dataset.profileImageCategory; repaint(null, `[data-profile-image-category="${button.dataset.profileImageCategory}"]`); }));
    root.querySelector('[data-profile-publication-toggle]')?.addEventListener('click', () => repaint('releaseStatus'));
    root.querySelectorAll('[data-profile-publication]').forEach(input => input.addEventListener('change', () => { if (!lock(draft)) { draft.publication.mode = input.value; changed('publication.scheduledAt'); repaint(); } }));
    root.querySelector('[data-profile-show-missing]')?.addEventListener('click', () => { draft.errors = { ...draft.errors, ...validate(draft) }; draft.ui.showMissing = !draft.ui.showMissing; repaint(); });
    root.addEventListener('click', event => { const button = event.target.closest('[data-profile-focus]'); if (button && root.contains(button)) focusField(button.dataset.profileFocus); });
    async function upload(files, key, index) {
      if (lock(draft) || !files.length) return;
      const storageKey = resolvedKey(draft, key);
      const currentAtStart = get(draft, storageKey);
      const replacingFile = Array.isArray(currentAtStart) && index !== undefined ? currentAtStart[index] : null;
      const token = {};
      const slot = Array.isArray(currentAtStart) ? (index === undefined ? token : replacingFile) : storageKey;
      state.uploads.set(slot, token);
      repaint();
      const accepted = [];
      let failure = '';
      for (const file of files) {
        try { accepted.push(await readFile(file, key)); } catch (error) { failure = typeof error === 'string' ? error : 'fileUnavailable'; }
      }
      if (state.uploads.get(slot) !== token) return;
      state.uploads.delete(slot);
      if (draft.reviewStatus === 'reviewing') return;
      if (accepted.length) {
        const current = get(draft, storageKey);
        if (Array.isArray(current)) {
          if (index === undefined) current.push(...accepted);
          else { const currentIndex = current.indexOf(replacingFile); if (currentIndex !== -1) current.splice(currentIndex, 1, accepted[0]); }
        } else set(draft, storageKey, accepted[0]);
        draft.dirty = true;
        delete draft.errors[key];
      }
      if (failure) draft.errors[key] = failure;
      if (state.root?.isConnected) repaint();
    }
    root.querySelectorAll('[data-profile-upload]').forEach(input => input.addEventListener('change', () => upload(Array.from(input.files || []), input.dataset.profileUpload, input.hasAttribute('data-profile-index') ? Number(input.dataset.profileIndex) : undefined)));
    root.querySelectorAll('[data-profile-drop]').forEach(zone => {
      zone.addEventListener('dragover', event => { if (!lock(draft)) { event.preventDefault(); zone.classList.add('is-drag-over'); } });
      zone.addEventListener('dragleave', () => zone.classList.remove('is-drag-over'));
      zone.addEventListener('drop', event => { event.preventDefault(); zone.classList.remove('is-drag-over'); upload(Array.from(event.dataTransfer?.files || []), zone.dataset.profileDrop); });
    });
    root.querySelectorAll('[data-profile-remove]').forEach(button => button.addEventListener('click', () => {
      if (lock(draft)) return;
      const key = button.dataset.profileRemove;
      const current = get(draft, key);
      const index = button.hasAttribute('data-profile-index') ? Number(button.dataset.profileIndex) : undefined;
      state.uploads.delete(Array.isArray(current) ? current[index] : resolvedKey(draft, key));
      if (Array.isArray(current)) current.splice(index, 1); else set(draft, key, null);
      changed(key); repaint();
    }));
    async function action(kind) {
      if (lock(draft)) return;
      if (state.uploads.size) { draft.errors.upload = 'uploadBusy'; repaint(); return; }
      delete draft.errors.save; delete draft.errors.submit;
      if (kind === 'submit') {
        draft.errors = validate(draft);
        if (Object.keys(draft.errors).length) { draft.ui.showMissing = true; focusField(Object.keys(draft.errors)[0]); return; }
      }
      const flag = kind === 'save' ? 'saving' : 'submitting';
      draft[flag] = true; repaint();
      try { await (kind === 'save' ? onSave(draft) : onSubmit(draft)); }
      catch (_) { draft.errors[kind] = kind === 'save' ? 'saveFailed' : 'submitFailed'; }
      finally { draft[flag] = false; if (state.root?.isConnected) repaint(); }
    }
    root.querySelector('[data-profile-withdraw]')?.addEventListener('click', () => {
      if (draft.reviewStatus !== 'reviewing' || draft.withdrawing) return;
      draft.ui.withdrawConfirm = 'release';
      repaint();
    });
    root.querySelectorAll('[data-withdraw-confirm-cancel]').forEach(button => button.addEventListener('click', () => {
      draft.ui.withdrawConfirm = '';
      repaint();
    }));
    root.querySelector('[data-withdraw-confirm-submit]')?.addEventListener('click', () => {
      if (draft.ui.withdrawConfirm === 'qualification') performQualificationWithdraw();
      else if (draft.ui.withdrawConfirm === 'release') performReleaseWithdraw();
    });
    root.querySelector('[data-profile-save]')?.addEventListener('click', () => action('save'));
    root.querySelector('[data-profile-submit]')?.addEventListener('click', () => action('submit'));
    if (lock(draft)) root.querySelectorAll('[data-profile-field], [data-profile-array], [data-profile-upload], [data-profile-remove], [data-profile-listed], [data-profile-publication], [data-profile-pricing-model], [data-profile-compliance-ack]').forEach(control => { control.disabled = true; });
    const qualificationFocus = draft.ui.qualificationFocus;
    draft.ui.qualificationFocus = '';
    if (qualificationFocus) {
      const target = qualificationFocus === 'rightsDeclarationAccepted' ? root.querySelector('[data-qualification-declaration]')
        : qualificationFocus === 'domestic.antiAddictionAcknowledged' ? root.querySelector('[data-qualification-anti-ack]')
          : root.querySelector(`[data-qualification-field="${qualificationFocus}"], [data-qualification-file="${qualificationFocus}"]`);
      const wrapper = target?.closest('[data-qualification-field-wrap], [data-qualification-upload-card]');
      if (target) { target.focus({ preventScroll: true }); (wrapper || target).scrollIntoView({ block: 'center' }); }
    }
    if (draft.ui.profileFocus && (moduleOf(draft.ui.profileFocus) === root.dataset.profileModule || (root.dataset.profileModule === 'release-workspace' && ['profile', 'builds', 'catalog', 'release', 'qualification'].includes(moduleOf(draft.ui.profileFocus))))) {
      state.focus = draft.ui.profileFocus;
      draft.ui.profileFocus = '';
    }
    const focus = state.focus; state.focus = null;
    const scrollSnapshot = state.scrollSnapshot; state.scrollSnapshot = null;
    if (focus) {
      const nameCode = focus === 'gameNameEn' ? 'en' : focus === 'gameNameZh' ? 'zh' : focus.startsWith('gameNames.') ? focus.split('.')[1] : '';
      const discountKey = focus.endsWith('.discount') ? focus.replace(/\.discount$/, '.discountPrice') : '';
      const target = (nameCode && root.querySelector(`[data-profile-section="basic"] [data-game-name-input="${nameCode}"]`)) || (focus === 'pricing.model' && root.querySelector('[data-profile-pricing-model]')) || (focus === 'qualifications.activeVersion' && root.querySelector('[data-qualification-editor], [data-qualification-cards]')) || (focus === 'buildPackages.readyFull' && root.querySelector('[data-profile-builds]')) || (focus === 'compliance.antiAddictionAcknowledged' && root.querySelector('[data-profile-compliance-ack]')) || (discountKey && root.querySelector(`[data-profile-field="${discountKey}"]`)) || root.querySelector(`[data-profile-field="${focus}"], [data-profile-upload="${focus}"], [data-profile-array="${focus}"]`) || root.querySelector(`[data-profile-section="${sectionOf(focus)}"]`);
      if (target) { target.focus({ preventScroll: true }); target.closest('[data-profile-field-wrap]')?.scrollIntoView({ block: 'center' }); if (!target.closest('[data-profile-field-wrap]')) target.scrollIntoView({ block: 'center' }); }
    } else if (scrollSnapshot) restoreScroll(scrollSnapshot);
  }
  window.PublisherGameProfile = { createDraft, render, bind, validate, completion, displayName };
})();
