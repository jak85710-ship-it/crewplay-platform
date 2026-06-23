// ==UserScript==
// @name         CrewPlay 揪團抓取器
// @namespace    crewplay
// @version      1.12.0
// @description  抓取 FB 開團貼文；photo 一律輸出簡潔 GCS JPG 網址（FB 原圖僅存 archive）
// @author       CrewPlay
// @match        https://www.facebook.com/*
// @match        https://facebook.com/*
// @match        https://m.facebook.com/*
// @match        https://web.facebook.com/*
// @match        https://*.facebook.com/*
// @run-at       document-end
// @grant        GM_xmlhttpRequest
// @grant        GM_getValue
// @grant        GM_setValue
// @connect      script.google.com
// @connect      maps.googleapis.com
// @connect      nominatim.openstreetmap.org
// @connect      *.fbcdn.net
// @connect      *.facebook.com
// @noframes
// ==/UserScript==

(function () {
  'use strict';

  const LOG = '[CrewPlay]';
  const log = (...args) => console.log(LOG, ...args);

  // 你的 Google 試算表 ID（Crewplay 球館名單）
  const SHEET_ID = '1wBIDO4zPqB-4z4C1yPy-8CgOH-MInB36j7Tw46BR9VE';
  const WEBHOOK_KEY = 'crewplay_webhook_url';
  const MAPS_API_KEY = 'crewplay_maps_api_key';
  const GEO_CACHE_KEY = 'crewplay_geo_cache';
  const DEFAULT_PHOTO = 'https://storage.googleapis.com/crewplay-arena-storage/photo/a1.jpg';
  const PHOTO_SKIP = /emoji|static\.|rsrc\.php|safe_image|profile|avatar|sticker|reaction|icon|sprite|\.gif(\?|$)/i;
  const PHOTO_CDN = /scontent[^/]*\.xx\.fbcdn\.net\/v\//i;
  const geoCache = new Map();

  // ===== 試算表欄位（順序需與「Crewplay 球館名單」一致）=====
  const COLUMNS = [
    'sport',       // 運動類型
    'arena_name',  // 球館 / 團名
    'introduce',   // 介紹（地點/時間/費用/程度/用球…整段）
    'photo',       // 固定簡潔 GCS JPG 網址（預設 a1.jpg，上傳後由轉檔工具改 r列號.jpg）
    'assign_url',  // FB 貼文連結
    'region',      // 縣市
    'location',    // 詳細地址
  ];

  // 累積抓到的結果（跨多次抓取、滾動去重）
  const collected = [];
  const seenKeys = new Set();

  // ===== 解析用關鍵字 =====
  const SPORT_KEYWORDS = [
    '羽球', '羽毛球', '籃球', '排球', '足球', '桌球', '乒乓', '網球', '棒球', '壘球',
    '飛盤', '躲避盤', '游泳', '路跑', '慢跑', '跑步', '自行車', '單車', '攀岩', '抱石',
    '瑜伽', '瑜珈', '重訓', '健身', '撞球', '保齡球', '高爾夫', '滑板', '直排輪',
    '拳擊', '搏擊', '空手道', '跆拳道', '柔道', '劍道', '射箭', '衝浪', '潛水',
    '獨木舟', 'SUP', '滑雪', '溜冰', '冰球', '手球', '橄欖球', '板球', '壁球',
    '飛鏢', '槌球', '健行', '登山', '爬山', '越野', '匹克球', 'Pickleball',
  ];

  const LOCATION_HINTS = [
    '體育館', '球場', '運動中心', '國民運動中心', '羽球館', '羽球場', '籃球場',
    '排球場', '網球場', '足球場', '棒球場', '游泳池', '泳池', '健身房', '健身中心',
    '國小', '國中', '高中', '大學', '學校', '活動中心', '公園', '社區中心', '拍拍館',
  ];

  const SPORT_PRIORITY = [
    ['匹克球', ['匹克球', 'Pickleball', 'pickleball']],
    ['羽球', ['羽球', '羽毛球']],
    ['排球', ['排球']],
    ['籃球', ['籃球']],
    ['桌球', ['桌球', '乒乓']],
    ['網球', ['網球']],
    ['足球', ['足球']],
    ['游泳', ['游泳']],
  ];

  const DISTRICT_TO_REGION = {
    永康: '臺南市', 安平: '臺南市', 東區: '臺南市', 北區: '臺南市', 南區: '臺南市',
    苓雅: '高雄市', 左營: '高雄市', 三民: '高雄市', 鳳山: '高雄市', 鼓山: '高雄市',
    泰山: '新北市', 板橋: '新北市', 中和: '新北市', 新店: '新北市',
    大安: '臺北市', 信義: '臺北市', 中山: '臺北市',
    西屯: '臺中市', 北屯: '臺中市', 南屯: '臺中市',
  };

  const NOISE_LINE = /^(讚|大心|留言|分享|查看更多|顯示更多|顯示較少|See more|Like|Comment|Share|追蹤|所有心情|·|Follow|#\S+)$/i;
  const BAD_ARENA = /顯示較少|週六、週日|川字|採用|台北時間|別宅|歡迎平日|想運動|私訊報名|開放報名|保持發言/i;
  const BAD_TIME = /保持發言|查看更多|歡迎來球場流個汗/i;

  // 台灣縣市（含「臺/台」兩種寫法）
  const REGIONS = [
    '台北市', '臺北市', '新北市', '桃園市', '台中市', '臺中市', '台南市', '臺南市',
    '高雄市', '基隆市', '新竹市', '新竹縣', '苗栗縣', '彰化縣', '南投縣', '雲林縣',
    '嘉義市', '嘉義縣', '屏東縣', '宜蘭縣', '花蓮縣', '台東縣', '臺東縣',
    '澎湖縣', '金門縣', '連江縣',
  ];

  // ===== 小工具 =====
  const clean = (s) => (s || '').replace(/\u00a0/g, ' ').replace(/[ \t]+/g, ' ').trim();
  const lines = (text) => text.split(/\n+/).map(clean).filter(Boolean);

  function matchLineContaining(text, hints) {
    for (const ln of lines(text)) {
      if (hints.some((h) => ln.includes(h))) return ln;
    }
    return '';
  }

  function pickAfterLabel(text, labels) {
    // 找「標籤：值」或「標籤 值」格式
    for (const ln of lines(text)) {
      for (const lb of labels) {
        const re = new RegExp(lb + '\\s*[:：]?\\s*(.+)$');
        const m = ln.match(re);
        if (m && clean(m[1])) return clean(m[1]);
      }
    }
    return '';
  }

  function normalizeRegion(region) {
    if (!region) return '';
    return region.replace(/^台(?=[北南中東])/, '臺');
  }

  function stripFbNoise(text) {
    return tidy(
      (text || '')
        .replace(/顯示較少/g, '')
        .replace(/￼/g, '')
        .split('\n')
        .map(clean)
        .filter((ln) => ln && !NOISE_LINE.test(ln))
        .filter((ln) => !/^\d+\s*(則留言|次分享|comments?|shares?)$/i.test(ln))
        .join('\n')
    );
  }

  function parseSport(text) {
    for (const [name, keys] of SPORT_PRIORITY) {
      for (const k of keys) {
        if (text.includes(k)) return name;
      }
    }
    for (const k of SPORT_KEYWORDS) {
      if (text.includes(k)) return k;
    }
    return '';
  }

  function formatTimeValue(raw) {
    let t = clean(raw).replace(/：/g, ':');
    if (!t) return '';
    if (!/時$/.test(t) && /\d:\d{2}/.test(t)) t += '時';
    return t;
  }

  function parseScheduleTime(text) {
    const labelled = pickAfterLabel(text, ['時間', '時段', '打球時間', '開打時間']);
    if (labelled) return formatTimeValue(labelled);

    const src = text.replace(/：/g, ':');
    const patterns = [
      /(\(每週[一二三四五六日天]\)\s*\d{1,2}:\d{2}\s*[-~～至到]\s*\d{1,2}:\d{2}時?)/,
      /(每週[一二三四五六日天、]+[^\n]{0,24}\d{1,2}:\d{2}\s*[-~～至到]\s*\d{1,2}:\d{2}時?)/,
      /(\d{1,2}\/\d{1,2}[（(][^）)]*[）)][^\n]{0,24}\d{1,2}:\d{2}\s*[-~～至到]\s*\d{1,2}:\d{2})/,
      /(\d{1,2}:\d{2}\s*[-~～至到]\s*\d{1,2}:\d{2})/,
    ];
    for (const re of patterns) {
      const m = src.match(re);
      if (m) return formatTimeValue(m[1]);
    }

    const date = parseDate(text);
    const time = parseTime(text);
    if (date && time) return formatTimeValue(`(${date})${time}`);
    if (time) return formatTimeValue(time);
    return '';
  }

  function parseBallType(text) {
    const labelled = pickAfterLabel(text, ['用球', '球種']);
    if (labelled) return labelled;
    const m = text.match(/(美津濃|勝利|Yonex|YY|RSL|亞獅龾?)\s*\d+/i);
    if (m) return clean(m[0]);
    return '團主決定';
  }

  function parseFeeFormatted(text) {
    const labelled = pickAfterLabel(text, ['臨打費', '費用', '場地費', '球費', '價格', '收費']);
    if (labelled) {
      let v = labelled.replace(/NT\$?|＄|\$/g, '').replace(/元/g, '').trim();
      if (/現場均攤/.test(v) && !/\/人/.test(v)) return '現場均攤/人';
      if (/\d/.test(v) && !/\/人/.test(v)) {
        v = v.replace(/\s*\/\s*/, '/');
        if (!/\/人$/.test(v)) v += '/人';
      }
      return v;
    }
    let m = text.match(/(\d{2,4})\s*元?\s*\/\s*人/);
    if (m) return `${m[1]}/人`;
    m = text.match(/(NT\$?|＄|\$)\s*(\d{2,4})/);
    if (m) return `${m[2]}/人`;
    m = text.match(/(\d{2,4})\s*元/);
    if (m) return `${m[1]}/人`;
    if (/免費|free/i.test(text)) return '免費';
    if (/現場均攤/.test(text)) return '現場均攤/人';
    return '';
  }

  function parseNetHeight(text) {
    return pickAfterLabel(text, ['網高']) || (text.match(/女網混排|男網|混合排|混排/) || [''])[0];
  }

  function isValidTime(time) {
    if (!time || !/\d/.test(time)) return false;
    if (BAD_TIME.test(time)) return false;
    if (/^[｜|】\]\s]+$/.test(time.replace(/[\d:：\-~～至到時星期週]/g, ''))) return false;
    return true;
  }

  function isValidFee(fee) {
    if (!fee) return true;
    if (/唷|^\(|^｜|^[）)]/.test(fee)) return false;
    return /\d|免費|均攤/.test(fee);
  }

  function extractUrls(text, fbUrl) {
    const found = [];
    const re = /https?:\/\/[^\s<>"')]+/gi;
    let m;
    while ((m = re.exec(text)) !== null) {
      const u = m[0].replace(/[.,;:!?，。；：！？]+$/, '');
      if (!found.includes(u)) found.push(u);
    }
    const official = found.find((u) => !/facebook\.com|fb\.com|instagram\.com|line\.me\/ti\//i.test(u)) || '';
    const others = found.filter((u) => u !== official && u !== fbUrl).join('\n');
    return { official, others };
  }

  function looksLikeVenue(name) {
    const base = clean(String(name || '').split('-')[0]);
    const v = base || clean(name);
    if (!v || v.length < 2 || v.length > 32) return false;
    if (BAD_ARENA.test(v)) return false;
    if (/^[｜|]/.test(v)) return false;
    if (/^\d{1,2}\/\d{1,2}/.test(v)) return false;
    if (/歡迎|流個汗|運動流汗|來打球/.test(v) && !/館|球場|中心/.test(v)) return false;
    return LOCATION_HINTS.some((h) => v.includes(h)) || /館|中心|球場|國小|國中|學校/.test(v);
  }

  function cleanTeamName(name) {
    return clean(name)
      .replace(/^[【\[#]+/, '')
      .replace(/[】\]]+$/, '')
      .replace(/固定團$/, '團')
      .trim();
  }

  function parseTeamName(text, venue) {
    const blob = clean(text);
    if (!blob) return '';

    const bracket = blob.match(/【([^】]{2,22})】/);
    if (bracket) {
      const t = cleanTeamName(bracket[1]);
      if (t && t !== venue && !looksLikeVenue(t)) return t;
    }

    const hash = blob.match(/#([^\s#【】]{2,18})/);
    if (hash) {
      const t = cleanTeamName(hash[1]);
      if (t && t !== venue && !looksLikeVenue(t)) return t;
    }

    for (const ln of lines(blob).slice(0, 10)) {
      const pipe = ln.match(/^([^｜|]{2,22})[｜|]/);
      if (pipe) {
        const t = cleanTeamName(pipe[1]);
        if (t && t !== venue && !looksLikeVenue(t) && !/^\d/.test(t)) return t;
      }

      const team = ln.match(/([^\d\s]{2,20}(?:羽球團|排球團|匹克球團|桌球團|球團|聯隊|戰隊|隊))/);
      if (team) {
        const t = cleanTeamName(team[1]);
        if (t && t !== venue && !looksLikeVenue(t)) return t;
      }

      const recruit = ln.match(/^(.{2,18})(?:徵|招|開團|臨打|固定)/);
      if (recruit) {
        const t = cleanTeamName(recruit[1]);
        if (t && t !== venue && !looksLikeVenue(t) && /團|隊|羽球|排球|匹克/.test(t)) return t;
      }
    }
    return '';
  }

  function buildArenaName(venue, team) {
    if (team && !looksLikeVenue(team)) return team;
    if (venue) return venue;
    return team || '';
  }

  function parseVenueName(text) {
    for (const lb of ['地點', '場地', '球館', '場館', '館別']) {
      const val = pickAfterLabel(text, [lb]);
      if (val) {
        const name = val.split(/[，,（(]/)[0].trim();
        if (looksLikeVenue(name)) return name;
      }
    }
    for (const ln of lines(text)) {
      if (looksLikeVenue(ln)) {
        return ln.split(/[，,（(]/)[0].trim();
      }
    }
    const m = text.match(/([\u4e00-\u9fffA-Za-z0-9]{2,24}(?:運動中心|體育館|羽球館|排球館|球館|球場|休閒館|拍拍館))/);
    if (m && looksLikeVenue(m[1])) return m[1];
    return '';
  }

  function inferRegion(text, venue, address) {
    const direct = normalizeRegion(parseRegion(text));
    if (direct) return direct;
    const blob = `${venue} ${address} ${text}`;
    for (const r of REGIONS) {
      if (blob.includes(r)) return normalizeRegion(r);
    }
    for (const [district, city] of Object.entries(DISTRICT_TO_REGION)) {
      if (venue.includes(district) || address.includes(district) || blob.includes(district + '區')) {
        return city;
      }
    }
    return '';
  }

  function parseExtraIntro(text, structuredLines) {
    const used = new Set(structuredLines.map(clean));
    const extras = [];
    for (const ln of lines(text)) {
      if (used.has(ln)) continue;
      if (/^(時間|地點|用球|程度|臨打費|網高|費用|人數|名額|缺額|地址|場地|球館)[:：]/.test(ln)) continue;
      if (/^https?:\/\//.test(ln)) continue;
      if (ln.length < 6) continue;
      if (/報名|私訊|\+1|Line|電話|DUPR|條件[:：]|備註[:：]|人數[:：]|滿團/.test(ln)) continue;
      if (/^\d{1,2}\/\d{1,2}/.test(ln)) continue;
      extras.push(ln);
    }
    return extras.join('\n');
  }

  function buildIntroduce(raw, sport) {
    const time = parseScheduleTime(raw);
    const venue = parseVenueName(raw);
    const balls = parseBallType(raw);
    const level = parseLevel(raw);
    const fee = parseFeeFormatted(raw);
    const netHeight = sport === '排球' ? parseNetHeight(raw) : '';

    const structured = [];
    if (venue) structured.push(`地點：${venue}`);
    if (time) structured.push(`時間：${time}`);
    if (level) structured.push(`程度：${level}`);
    if (balls) structured.push(`用球：${balls}`);
    if (fee) structured.push(`費用：${fee}`);
    if (netHeight) structured.push(`網高：${netHeight}`);

    return {
      introduce: structured.join('\n'),
      extra_notes: parseExtraIntro(raw, structured),
      time,
      venue,
      fee,
      level,
      balls,
    };
  }

  function isQualityRow(data) {
    const { sport, arena_name, introduce, time, fee, venue } = data;
    const venueBase = venue || arena_name.split('-')[0];
    if (!sport || !arena_name || !introduce) return false;
    if (BAD_ARENA.test(venueBase)) return false;
    if (!looksLikeVenue(venueBase)) return false;
    if (!isValidTime(time)) return false;
    if (!isValidFee(fee)) return false;
    if (!/時間：/.test(introduce) || !/地點：/.test(introduce) || !/費用：/.test(introduce)) return false;
    if (/保持發言/.test(introduce)) return false;
    return true;
  }

  function parseDate(text) {
    const t = text.replace(/\s/g, '');
    // 6/13、06-13、6月13日、6.13
    let m = t.match(/(\d{1,2})[\/\-月.](\d{1,2})[日號]?/);
    let datePart = m ? `${m[1]}/${m[2]}` : '';
    // 星期 / 週
    const wk = text.match(/(週[一二三四五六日天]|星期[一二三四五六日天]|禮拜[一二三四五六日天])/);
    const today = text.match(/今天|今晚|明天|明晚|後天/);
    const extras = [wk ? wk[1] : '', today ? today[0] : ''].filter(Boolean).join(' ');
    return clean([datePart, extras].filter(Boolean).join(' '));
  }

  function parseTime(text) {
    const t = text.replace(/：/g, ':');
    // 19:00-21:00 / 19:00~21:00 / 7-9點 / 晚上7點 / 早上9:00
    const range = t.match(/(\d{1,2}:\d{2})\s*[-~～至到]\s*(\d{1,2}:\d{2})/);
    if (range) return `${range[1]}-${range[2]}`;
    const single = t.match(/(\d{1,2}:\d{2})/);
    if (single) return single[1];
    const cn = t.match(/((早上|上午|中午|下午|晚上|傍晚)?\s*\d{1,2}\s*點(\d{1,2}分?)?\s*[-~～至到]?\s*(\d{1,2}\s*點(\d{1,2}分?)?)?)/);
    if (cn) return clean(cn[1]);
    return '';
  }

  function parseLocation(text) {
    const labelled = pickAfterLabel(text, ['地點', '場地', '地址', '球館', '場館', '位置']);
    if (labelled) return stripPostalCode(labelled);
    const hint = matchLineContaining(text, LOCATION_HINTS);
    return hint ? stripPostalCode(hint) : '';
  }

  function parseSlots(text) {
    const labelled = pickAfterLabel(text, ['人數', '名額', '缺額', '需求人數']);
    if (labelled) return labelled;
    // 缺3 / 還缺2人 / 徵2 / 尚缺1名 / 招募4人
    let m = text.match(/(還?缺|尚缺|徵|招募|招|找|湊)\s*(\d{1,2})\s*[位名人]?/);
    if (m) return clean(m[0]);
    m = text.match(/(\d{1,2})\s*[位名人]/);
    if (m) return clean(m[0]);
    return '';
  }

  function parseFee(text) {
    const labelled = pickAfterLabel(text, ['費用', '場地費', '球費', '價格', '收費']);
    if (labelled) return labelled;
    let m = text.match(/(NT\$?|＄|\$)\s*\d+/);
    if (m) return clean(m[0]);
    m = text.match(/\d+\s*元/);
    if (m) return clean(m[0]);
    if (/免費|free/i.test(text)) return '免費';
    return '';
  }

  function parseLevel(text) {
    const labelled = pickAfterLabel(text, ['程度', '等級', '球齡', '門檻', '條件']);
    if (labelled) return labelled.replace(/DUPR.*/i, '').trim();
    const found = [];
    [
      '新手友善', '初階以下', '不限程度', '程度不限', '歡迎新手',
      '新手', '初學', '初階', '入門', '中階', '中等', '進階', '高階', '高手', '老手',
    ].forEach((k) => {
      if (text.includes(k) && !found.includes(k)) found.push(k);
    });
    return found[0] || '';
  }

  function parseGender(text) {
    const found = [];
    if (/限女|僅女|只收女|女生限定|女性限定/.test(text)) found.push('限女');
    if (/限男|僅男|只收男|男生限定|男性限定/.test(text)) found.push('限男');
    if (/男女不限|不限性別|男女皆可/.test(text)) found.push('男女不限');
    const m = text.match(/(\d+)\s*男\s*(\d+)\s*女|(\d+)\s*女\s*(\d+)\s*男/);
    if (m) found.push(clean(m[0]));
    return found.join('、');
  }

  function parseContact(text) {
    const found = [];
    const line = text.match(/(line|賴|加賴|Line\s*ID)\s*[:：]?\s*([A-Za-z0-9._\-@]{2,})/i);
    if (line) found.push('Line: ' + line[2]);
    const phone = text.match(/09\d{2}[-\s]?\d{3}[-\s]?\d{3}/);
    if (phone) found.push('電話: ' + clean(phone[0]));
    if (/私訊|私我|私訊我|私下|inbox|dm/i.test(text)) found.push('私訊');
    if (/留言|\+1|報名請留言/.test(text)) found.push('留言報名');
    return found.join('；');
  }

  function parseRegion(text) {
    for (const r of REGIONS) {
      if (text.includes(r)) return normalizeRegion(r);
    }
    return '';
  }

  function parseAddress(text) {
    for (const lb of ['地址', '完整地址', '地點', '場地']) {
      const labelled = pickAfterLabel(text, [lb]);
      if (labelled && isStreetAddress(labelled)) return normalizeTaiwanAddress(labelled);
    }

    for (const ln of lines(text)) {
      if (isStreetAddress(ln)) return normalizeTaiwanAddress(ln);
    }

    const inline = text.match(/((?:台|臺)?[^，,\n]{0,8}[縣市])[^，,\n]{0,10}[區鄉鎮市][^，,\n]{0,24}[路街道][^，,\n]{0,24}\d+[^，,\n]{0,8}號?/);
    if (inline) return normalizeTaiwanAddress(inline[1]);

    return '';
  }

  function isStreetAddress(s) {
    const v = clean(s);
    if (!v || v.length < 8) return false;
    if (!/\d/.test(v)) return false;
    return /[路街道巷弄號]/.test(v) || /[縣市].*[區鄉鎮市].*[路街道]/.test(v);
  }

  function stripPostalCode(s) {
    if (!s) return '';
    return clean(s)
      .replace(/^[（(]?\d{3,5}[）)]?\s*/, '')
      .replace(/^(\d{3,5})(?=(?:臺|台)?[^0-9]{2,}[市縣])/, '');
  }

  function normalizeTaiwanAddress(s) {
    let v = clean(s)
      .replace(/^台(?=[北南中東])/, '臺')
      .replace(/[（(]試營運[）)]/g, '');
    v = stripPostalCode(v);
    return v.replace(/\s+/g, '');
  }

  function parseRegionFromAddress(address) {
    if (!address) return '';
    for (const r of REGIONS) {
      if (address.includes(r) || address.includes(r.replace('臺', '台'))) {
        return normalizeRegion(r);
      }
    }
    return '';
  }

  function sleep(ms) {
    return new Promise((resolve) => setTimeout(resolve, ms));
  }

  function loadGeoCache() {
    try {
      const raw = GM_getValue(GEO_CACHE_KEY, '{}');
      Object.entries(JSON.parse(raw)).forEach(([k, v]) => geoCache.set(k, v));
    } catch (e) {
      log('geo cache load failed', e);
    }
  }

  function saveGeoCache() {
    const obj = {};
    geoCache.forEach((v, k) => { obj[k] = v; });
    GM_setValue(GEO_CACHE_KEY, JSON.stringify(obj));
  }

  function getMapsApiKey() {
    return (GM_getValue(MAPS_API_KEY, '') || '').trim();
  }

  function saveMapsApiKey(key) {
    GM_setValue(MAPS_API_KEY, (key || '').trim());
  }

  function buildGeoQuery(row) {
    return [row.arena_name, row.region, '台灣'].filter(Boolean).join(' ').trim();
  }

  function gmGetJson(url) {
    return new Promise((resolve, reject) => {
      GM_xmlhttpRequest({
        method: 'GET',
        url,
        onload(res) {
          try {
            if (res.status < 200 || res.status >= 300) {
              reject(new Error('HTTP ' + res.status));
              return;
            }
            resolve(JSON.parse(res.responseText || '{}'));
          } catch (e) {
            reject(e);
          }
        },
        onerror() {
          reject(new Error('network error'));
        },
      });
    });
  }

  async function searchGoogleMaps(query, apiKey) {
    const url = 'https://maps.googleapis.com/maps/api/place/textsearch/json?'
      + 'query=' + encodeURIComponent(query)
      + '&key=' + encodeURIComponent(apiKey)
      + '&language=zh-TW&region=tw';
    const data = await gmGetJson(url);
    if (data.status !== 'OK') {
      if (data.status === 'ZERO_RESULTS') return null;
      throw new Error(data.error_message || data.status || 'Google Maps error');
    }
    if (!data.results || !data.results.length) return null;
    const best = data.results[0];
    const location = normalizeTaiwanAddress(best.formatted_address || '');
    return {
      location,
      region: parseRegionFromAddress(location),
      source: 'google',
    };
  }

  async function searchNominatim(query) {
    const url = 'https://nominatim.openstreetmap.org/search?'
      + 'q=' + encodeURIComponent(query + ' 台灣')
      + '&format=json&addressdetails=1&limit=1&accept-language=zh-TW';
    const data = await gmGetJson(url);
    if (!Array.isArray(data) || !data.length) return null;
    const best = data[0];
    const addr = best.address || {};
    const city = normalizeRegion(addr.city || addr.county || addr.state || '');
    const district = addr.suburb || addr.city_district || addr.town || addr.village || '';
    const road = addr.road || addr.pedestrian || addr.footway || '';
    const num = addr.house_number || '';
    let location = '';
    if (city && road) {
      location = normalizeTaiwanAddress(`${city}${district}${road}${num ? num + '號' : ''}`);
    } else {
      location = normalizeTaiwanAddress((best.display_name || '').split(',')[0]);
    }
    return {
      location,
      region: city || parseRegionFromAddress(location),
      source: 'osm',
    };
  }

  async function resolveLocation(row) {
    if (row.location && isStreetAddress(row.location)) return row;
    const query = buildGeoQuery(row);
    if (!query || query.length < 4 || !row.arena_name) return row;

    const cacheKey = query.toLowerCase();
    if (geoCache.has(cacheKey)) {
      const hit = geoCache.get(cacheKey);
      if (hit && hit.location) {
        row.location = hit.location;
        if (!row.region && hit.region) row.region = hit.region;
      }
      return row;
    }

    let result = null;
    const apiKey = getMapsApiKey();
    if (apiKey) {
      try {
        result = await searchGoogleMaps(query, apiKey);
      } catch (e) {
        log('Google Maps lookup failed', query, e.message);
      }
    }
    if (!result || !result.location) {
      try {
        result = await searchNominatim(query);
      } catch (e) {
        log('Nominatim lookup failed', query, e.message);
      }
    }

    geoCache.set(cacheKey, result || { location: '', region: '' });
    saveGeoCache();

    if (result && result.location) {
      row.location = result.location;
      if (!row.region && result.region) row.region = result.region;
    }
    return row;
  }

  async function enrichLocations(rows) {
    let filled = 0;
    for (const row of rows) {
      if (row.location && isStreetAddress(row.location)) continue;
      const before = row.location || '';
      await resolveLocation(row);
      if ((row.location || '') && row.location !== before) filled++;
      await sleep(getMapsApiKey() ? 200 : 1100);
    }
    return filled;
  }

  function parseArenaName(text) {
    return parseVenueName(text);
  }

  // ===== 從單篇貼文 DOM 取出資料 =====
  function imageDisplayScore(img) {
    const w = img.naturalWidth || parseInt(img.getAttribute('width'), 10) || 0;
    const h = img.naturalHeight || parseInt(img.getAttribute('height'), 10) || 0;
    if (w > 0 && h > 0) return w * h;
    const src = img.currentSrc || img.src || '';
    if (/p2048x2048|p960x960/i.test(src)) return 900000;
    if (/p526x296|p180x540/i.test(src)) return 500000;
    if (/p320x320|p480x480/i.test(src)) return 150000;
    return 12000;
  }

  function isGcsJpg(url) {
    return /^https:\/\/storage\.googleapis\.com\/crewplay-arena-storage\/photo\/[^/?]+\.jpg$/i.test(clean(url || ''));
  }

  /** 試算表 photo 欄：永遠是簡潔 GCS .jpg，絕不輸出 FB 長網址 */
  function sheetPhoto(row) {
    if (row && isGcsJpg(row.photo)) return row.photo;
    return DEFAULT_PHOTO;
  }

  function rowForSheet(row) {
    return { ...row, photo: sheetPhoto(row) };
  }

  function isRealFbPhoto(url) {
    if (!url || url === DEFAULT_PHOTO) return '';
    const u = clean(url.replace(/&amp;/g, '&'));
    if (/static\.|rsrc\.php/i.test(u)) return '';
    if (/\.webp(\?|$)/i.test(u) && !PHOTO_CDN.test(u)) return '';
    if (PHOTO_CDN.test(u)) return u;
    return '';
  }

  function extractPostPhoto(article) {
    if (!article) return '';
    const scored = [];

    article.querySelectorAll('img[src]').forEach((img) => {
      let src = clean((img.currentSrc || img.src || '').replace(/&amp;/g, '&'));
      if (!src || src.startsWith('data:')) return;
      if (PHOTO_SKIP.test(src)) return;
      if (/\.webp(\?|$)/i.test(src) && !PHOTO_CDN.test(src)) return;

      const area = imageDisplayScore(img);
      const inPhotoLink = !!img.closest('a[href*="/photo"], a[href*="fbid="], a[href*="/photos/"]');
      if (!PHOTO_CDN.test(src) && area < 6400 && !inPhotoLink) return;

      let score = area;
      if (inPhotoLink) score += 600000;
      if (PHOTO_CDN.test(src)) score += 120000;
      if (/p2048x2048|p960x960|p526x296|p180x540/i.test(src)) score += 250000;
      scored.push({ src, score });
    });

    article.querySelectorAll('[style*="background-image"]').forEach((el) => {
      const m = (el.getAttribute('style') || '').match(/url\(["']?(https?:[^"')]+)/i);
      if (m && PHOTO_CDN.test(m[1])) {
        scored.push({ src: m[1].replace(/&amp;/g, '&'), score: 350000 });
      }
    });

    if (!scored.length) return '';
    scored.sort((a, b) => b.score - a.score);
    return isRealFbPhoto(scored[0].src);
  }

  function extractOrganizer(article) {
    const sel = ['h2 a[role="link"]', 'h3 a[role="link"]', 'h4 a[role="link"]', 'strong a[role="link"]', 'h2 strong', 'h3 strong'];
    for (const s of sel) {
      const el = article.querySelector(s);
      const txt = clean(el && el.innerText);
      if (txt && txt.length <= 40 && !/查看更多|See more/i.test(txt)) return txt;
    }
    return '';
  }

  function extractPostUrl(article) {
    const a = article.querySelector(
      'a[href*="/posts/"], a[href*="permalink"], a[href*="story_fbid"], a[href*="/groups/"][href*="/permalink/"]'
    );
    if (a && a.href) return a.href.split('?')[0];
    return location.href.split('?')[0];
  }

  function tidy(t) {
    return clean((t || '').replace(/\n[ \t]*\n+/g, '\n'));
  }

  const MESSAGE_SELECTORS = [
    'div[data-ad-comet-preview="message"]',
    'div[data-ad-preview="message"]',
    'div[data-ad-rendering-role="story_message"]',
  ];

  function isTopLevelArticle(el) {
    let p = el.parentElement;
    while (p) {
      if (p.getAttribute && p.getAttribute('role') === 'article') return false;
      p = p.parentElement;
    }
    return true;
  }

  function isSinglePostPage() {
    return /\/(posts|permalink|story_fbid|multi_permalinks)/i.test(location.pathname);
  }

  // 多種方式找出貼文容器（解決 FB 抓不到 0 篇）
  function findPostRoots() {
    const roots = new Set();

    MESSAGE_SELECTORS.forEach((sel) => {
      document.querySelectorAll(sel).forEach((msg) => {
        const art = msg.closest('[role="article"]');
        if (art && isTopLevelArticle(art)) {
          roots.add(art);
          return;
        }
        const feed = msg.closest('[data-pagelet*="FeedUnit"]')
          || msg.closest('div[aria-posinset]')
          || msg.closest('[role="feed"] > div');
        if (feed) roots.add(feed);
      });
    });

    document.querySelectorAll('[role="article"]').forEach((art) => {
      if (isTopLevelArticle(art)) roots.add(art);
    });

    if (roots.size === 0 && isSinglePostPage()) {
      const main = document.querySelector('[role="main"]');
      if (main) roots.add(main);
    }

    return Array.from(roots);
  }

  function extractAllMessages(root) {
    const found = [];
    MESSAGE_SELECTORS.forEach((sel) => {
      root.querySelectorAll(sel).forEach((el) => {
        const txt = tidy(el.innerText);
        if (txt.length >= 8) found.push(txt);
      });
    });
    if (found.length) return found.sort((a, b) => b.length - a.length)[0];
    return '';
  }

  function extractRawText(article) {
    const msg = extractAllMessages(article);
    if (msg) return msg;
    let t = tidy(article.innerText);
    t = t
      .split('\n')
      .filter((ln) => !/^(讚|大心|留言|分享|查看更多|顯示更多|See more|Like|Comment|Share|追蹤|所有心情|·|Follow)$/i.test(ln.trim()))
      .filter((ln) => !/^\d+\s*(則留言|次分享|人|comments?|shares?|hours?|mins?|hrs?)$/i.test(ln.trim()))
      .filter((ln) => !/^\d+[週星期分鐘小時天月年]/.test(ln.trim()))
      .join('\n');
    return tidy(t);
  }

  function parseArticle(article) {
    const raw = stripFbNoise(extractRawText(article));
    if (!raw || raw.length < 8) return null;
    const sport = parseSport(raw);
    const built = buildIntroduce(raw, sport);
    const venue = built.venue || parseVenueName(raw);
    const team_name = parseTeamName(raw, venue);
    const arena_name = buildArenaName(venue, team_name);
    const location = parseAddress(raw);
    const region = inferRegion(raw, venue, location);
    const fbUrl = extractPostUrl(article);
    const fbPhoto = extractPostPhoto(article);
    const urls = extractUrls(raw, fbUrl);
    const contact = parseContact(raw);

    const candidate = {
      sport,
      arena_name,
      venue,
      team_name,
      introduce: built.introduce,
      time: built.time,
      fee: built.fee,
    };
    if (!isQualityRow(candidate)) return null;

    const extraNotes = [
      team_name ? `團名：${team_name}` : '',
      built.extra_notes,
    ].filter(Boolean).join('\n');

    return {
      sport,
      arena_name,
      venue,
      team_name,
      introduce: built.introduce,
      photo: DEFAULT_PHOTO,
      assign_url: fbUrl,
      region,
      location,
      archive: {
        assign_url: fbUrl,
        official_url: urls.official,
        other_urls: urls.others,
        extra_notes: extraNotes,
        fb_photo_url: fbPhoto,
        contact,
        raw_text: raw,
        region,
        team_name,
        venue,
      },
    };
  }

  // ===== 抓取目前畫面的貼文 =====
  async function scrapeVisible() {
    const roots = findPostRoots();
    let added = 0;
    let skipped = 0;
    const newRows = [];
    log('找到貼文容器', roots.length, '篇');
    for (const art of roots) {
      const row = parseArticle(art);
      if (!row) {
        skipped++;
        continue;
      }
      const key = (row.archive && row.archive.assign_url) || row.arena_name + '|' + row.introduce.slice(0, 80);
      if (seenKeys.has(key)) continue;
      seenKeys.add(key);
      collected.push(row);
      newRows.push(row);
      added++;
    }

    let geoFilled = 0;
    if (newRows.length) {
      geoFilled = await enrichLocations(newRows);
    }
    return { added, found: roots.length, skipped, geoFilled };
  }

  // ===== 展開所有「查看更多 / See more」=====
  function expandAll() {
    let clicked = 0;
    document.querySelectorAll('div[role="button"], span[role="button"]').forEach((el) => {
      const t = clean(el.innerText);
      if (/^查看更多$|^顯示更多$|^See more$|^…更多$|^更多$/i.test(t)) {
        try {
          el.click();
          clicked++;
        } catch (e) {}
      }
    });
    return clicked;
  }

  // ===== 輸出 =====
  function tsvCell(v) {
    const s = String(v || '');
    // 含換行/Tab/引號時用雙引號包起來，貼進 Google 試算表可保留同一格多行
    if (/[\t\n\r"]/.test(s)) return '"' + s.replace(/"/g, '""') + '"';
    return s;
  }

  function toTSV(rows) {
    const head = COLUMNS.join('\t');
    const body = rows.map((r) => COLUMNS.map((c) => tsvCell(rowForSheet(r)[c])).join('\t')).join('\n');
    return head + '\n' + body;
  }

  function toCSV(rows) {
    const esc = (v) => '"' + String(v || '').replace(/"/g, '""') + '"';
    const head = COLUMNS.map(esc).join(',');
    const body = rows.map((r) => COLUMNS.map((c) => esc(rowForSheet(r)[c])).join(',')).join('\n');
    return '\ufeff' + head + '\n' + body;
  }

  async function copyToClipboard(text) {
    try {
      await navigator.clipboard.writeText(text);
      return true;
    } catch (e) {
      const ta = document.createElement('textarea');
      ta.value = text;
      ta.style.position = 'fixed';
      ta.style.opacity = '0';
      document.body.appendChild(ta);
      ta.select();
      let ok = false;
      try {
        ok = document.execCommand('copy');
      } catch (err) {}
      document.body.removeChild(ta);
      return ok;
    }
  }

  function downloadCSV(text) {
    const blob = new Blob([text], { type: 'text/csv;charset=utf-8' });
    const url = URL.createObjectURL(blob);
    const a = document.createElement('a');
    a.href = url;
    a.download = 'crewplay-' + Date.now() + '.csv';
    document.body.appendChild(a);
    a.click();
    document.body.removeChild(a);
    URL.revokeObjectURL(url);
  }

  function downloadJSON(rows) {
    const stamp = new Date().toISOString().replace(/[-:]/g, '').replace(/\..+/, '').replace('T', '-');
    const payload = {
      exportedAt: new Date().toISOString(),
      columns: COLUMNS,
      rows: rows.map((r) => rowForSheet(r)),
    };
    const blob = new Blob([JSON.stringify(payload, null, 2)], { type: 'application/json' });
    const url = URL.createObjectURL(blob);
    const a = document.createElement('a');
    a.href = url;
    a.download = 'crewplay-batch-' + stamp + '.json';
    document.body.appendChild(a);
    a.click();
    document.body.removeChild(a);
    URL.revokeObjectURL(url);
  }

  function getWebhookUrl() {
    return GM_getValue(WEBHOOK_KEY, '') || '';
  }

  function saveWebhookUrl(url) {
    GM_setValue(WEBHOOK_KEY, (url || '').trim());
  }

  function syncToSheet(rows, webhookUrl) {
    return new Promise((resolve, reject) => {
      GM_xmlhttpRequest({
        method: 'POST',
        url: webhookUrl,
        headers: { 'Content-Type': 'application/json' },
        data: JSON.stringify({ rows, sheetId: SHEET_ID }),
        onload(res) {
          try {
            const data = JSON.parse(res.responseText || '{}');
            if (data.ok) resolve(data);
            else reject(new Error(data.error || '寫入失敗'));
          } catch (e) {
            reject(new Error('回應格式錯誤：' + res.responseText.slice(0, 120)));
          }
        },
        onerror() {
          reject(new Error('無法連線，請確認 API 網址是否正確'));
        },
      });
    });
  }

  // ===== UI 面板（恢復最初版本：右下角彈出）=====
  function buildLauncher() {
    if (document.getElementById('crewplay-launcher')) return;
    const btn = document.createElement('button');
    btn.id = 'crewplay-launcher';
    btn.type = 'button';
    btn.title = 'CrewPlay 揪團抓取器';
    btn.textContent = 'CP';
    btn.style.cssText = [
      'position:fixed', 'right:16px', 'bottom:16px', 'z-index:2147483647',
      'width:52px', 'height:52px', 'border:none', 'border-radius:50%',
      'background:linear-gradient(135deg,#1877f2,#0a5dc2)', 'color:#fff',
      'font:bold 16px/1 "Microsoft JhengHei",system-ui,sans-serif',
      'box-shadow:0 6px 20px rgba(24,119,242,.45)', 'cursor:pointer',
    ].join(';');
    btn.addEventListener('click', () => {
      buildPanel();
      const panel = document.getElementById('crewplay-panel');
      if (panel) panel.style.display = 'block';
    });
    document.body.appendChild(btn);
    log('浮動按鈕已建立');
  }

  function buildPanel() {
    if (document.getElementById('crewplay-panel')) return;

    const panel = document.createElement('div');
    panel.id = 'crewplay-panel';
    panel.innerHTML = `
      <style>
        #crewplay-panel{position:fixed;right:16px;bottom:76px;width:340px;z-index:2147483647;
          font-family:"Microsoft JhengHei","PingFang TC",system-ui,sans-serif;
          background:#fff;border:1px solid #d0d7de;border-radius:12px;
          box-shadow:0 8px 28px rgba(0,0,0,.18);overflow:hidden;}
        #crewplay-panel *{box-sizing:border-box;}
        #cp-head{background:linear-gradient(135deg,#1877f2,#0a5dc2);color:#fff;
          padding:10px 12px;display:flex;align-items:center;justify-content:space-between;cursor:move;}
        #cp-head b{font-size:14px;}
        #cp-min{cursor:pointer;background:rgba(255,255,255,.2);border:none;color:#fff;
          width:24px;height:24px;border-radius:6px;font-size:14px;line-height:1;}
        #cp-body{padding:12px;}
        #crewplay-panel button.act{display:block;width:100%;margin:6px 0;padding:9px;
          border:none;border-radius:8px;font-size:13px;font-weight:600;cursor:pointer;}
        #cp-expand{background:#eef3fb;color:#1a4480;}
        #cp-scrape{background:#1877f2;color:#fff;}
        #cp-copy{background:#1f9d55;color:#fff;}
        #cp-json{background:#6f42c1;color:#fff;}
        .cp-row{display:flex;gap:6px;}
        .cp-row button{flex:1;margin:6px 0;padding:8px;border:1px solid #d0d7de;
          background:#f6f8fa;border-radius:8px;font-size:12px;cursor:pointer;}
        #cp-count{font-size:12px;color:#444;margin:4px 0 8px;text-align:center;}
        #cp-count b{color:#1877f2;font-size:16px;}
        #cp-status{font-size:12px;color:#1f9d55;min-height:16px;text-align:center;margin-top:4px;}
        #cp-preview{max-height:180px;overflow:auto;border:1px solid #eee;border-radius:8px;
          margin-top:8px;font-size:11px;}
        #cp-preview table{border-collapse:collapse;width:100%;}
        #cp-preview td{border-bottom:1px solid #f0f0f0;padding:4px 6px;
          white-space:nowrap;max-width:90px;overflow:hidden;text-overflow:ellipsis;}
        #cp-preview tr:first-child td{font-weight:700;background:#fafbfc;position:sticky;top:0;}
        #cp-hint{font-size:11px;color:#666;margin:0 0 6px;line-height:1.4;text-align:center;}
        #cp-maps{margin-top:8px;padding-top:8px;border-top:1px solid #eee;}
        #cp-maps label{display:block;font-size:11px;color:#555;margin-bottom:4px;}
        #cp-maps input{width:100%;padding:6px 8px;border:1px solid #d0d7de;border-radius:6px;font-size:11px;}
        #cp-maps small{display:block;color:#888;font-size:10px;margin-top:4px;line-height:1.35;}
      </style>
      <div id="cp-head"><b>CrewPlay 揪團抓取器 v1.12</b><button id="cp-min" title="收合">—</button></div>
      <div id="cp-body">
        <p id="cp-hint">photo 固定簡潔 GCS 網址（a1.jpg）；專屬圖請用「轉圖片上傳JPG.bat」</p>
        <div id="cp-count">已收集 <b id="cp-n">0</b> 篇開團貼文</div>
        <button class="act" id="cp-expand">① 展開全部貼文（查看更多）</button>
        <button class="act" id="cp-scrape">② 抓取目前畫面的貼文</button>
        <button class="act" id="cp-copy">③ 複製成表格（手動貼上）</button>
        <button class="act" id="cp-json">⑤ 存批次檔（丟進 inbox 資料夾）</button>
        <div class="cp-row">
          <button id="cp-csv">下載 CSV（給管理員匯入）</button>
          <button id="cp-clear">清空重來</button>
        </div>
        <div id="cp-maps">
          <label for="cp-maps-key">Google Maps API 金鑰（選填，查地址更準）</label>
          <input id="cp-maps-key" type="password" placeholder="AIza...">
          <small>到 Google Cloud 啟用「Places API」後建立 API 金鑰。未填則改用 OpenStreetMap 備援。</small>
        </div>
        <div id="cp-status">就緒</div>
        <div id="cp-preview"></div>
      </div>`;
    document.body.appendChild(panel);

    const $ = (id) => panel.querySelector(id);
    const status = (msg, color) => {
      const s = $('#cp-status');
      s.textContent = msg;
      s.style.color = color || '#1f9d55';
    };
    const refresh = () => {
      $('#cp-n').textContent = String(collected.length);
      renderPreview();
    };

    function renderPreview() {
      const wrap = $('#cp-preview');
      if (!collected.length) { wrap.innerHTML = ''; return; }
      const showCols = ['sport', 'arena_name', 'photo', 'region', 'location'];
      let html = '<table><tr>' + showCols.map((c) => `<td>${c}</td>`).join('') + '</tr>';
      collected.slice(-20).forEach((r) => {
        html += '<tr>' + showCols.map((c) => {
          let v = c === 'photo' ? sheetPhoto(r) : (r[c] || '');
          if (c === 'photo') v = v.replace(/^https:\/\/storage\.googleapis\.com\/crewplay-arena-storage\/photo\//, '');
          return `<td title="${String(v).replace(/"/g, '')}">${v}</td>`;
        }).join('') + '</tr>';
      });
      html += '</table>';
      wrap.innerHTML = html;
    }

    $('#cp-expand').addEventListener('click', () => {
      const n = expandAll();
      status(`已點開 ${n} 個「查看更多」，等 2 秒後再按 ② 抓取`);
    });

    const mapsInput = $('#cp-maps-key');
    mapsInput.value = getMapsApiKey();
    mapsInput.addEventListener('change', () => {
      saveMapsApiKey(mapsInput.value);
      status(getMapsApiKey() ? '已儲存 Google Maps API 金鑰' : '已清除 Google Maps API 金鑰');
    });

    $('#cp-scrape').addEventListener('click', async () => {
      status('抓取中，並查詢缺少的地址...', '#1a4480');
      $('#cp-scrape').disabled = true;
      try {
        const result = await scrapeVisible();
        refresh();
        if (result.added > 0) {
          status(`新增 ${result.added} 篇，Google Maps 補地址 ${result.geoFilled || 0} 筆`);
        } else if (result.found === 0) {
          status('找不到貼文。請確認在社團動態頁，或先按 ① 展開', '#d1242f');
        } else {
          status(`找到 ${result.found} 篇但無法整理成標準格式。請先按 ① 展開內文再試`, '#d1242f');
        }
      } catch (e) {
        status('抓取失敗：' + e.message, '#d1242f');
      } finally {
        $('#cp-scrape').disabled = false;
      }
    });

    $('#cp-copy').addEventListener('click', async () => {
      if (!collected.length) {
        status('還沒有資料，請先按「② 抓取」', '#d1242f');
        return;
      }
      status('補齊缺少的地址...', '#1a4480');
      await enrichLocations(collected.filter((r) => !r.location || !isStreetAddress(r.location)));
      refresh();
      const ok = await copyToClipboard(toTSV(collected));
      status(ok ? '已複製！到 Google 試算表點一格按 Ctrl+V 貼上' : '複製失敗，請改用「下載 CSV」', ok ? '#1f9d55' : '#d1242f');
    });

    $('#cp-json').addEventListener('click', async () => {
      if (!collected.length) {
        status('還沒有資料，請先按「② 抓取」', '#d1242f');
        return;
      }
      status('補齊缺少的地址...', '#1a4480');
      await enrichLocations(collected.filter((r) => !r.location || !isStreetAddress(r.location)));
      refresh();
      downloadJSON(collected.slice());
      status('已下載 JSON，請移到 crewplay-fb-collector/inbox/ 後執行 sync-to-sheet.ps1');
      collected.length = 0;
      seenKeys.clear();
      refresh();
    });

    $('#cp-csv').addEventListener('click', () => {
      if (!collected.length) { status('還沒有資料', '#d1242f'); return; }
      downloadCSV(toCSV(collected));
      status('已下載 CSV');
    });

    $('#cp-clear').addEventListener('click', () => {
      collected.length = 0;
      seenKeys.clear();
      refresh();
      status('已清空');
    });

    $('#cp-min').addEventListener('click', () => {
      const body = $('#cp-body');
      body.style.display = body.style.display === 'none' ? 'block' : 'none';
    });

    (function makeDraggable() {
      const head = $('#cp-head');
      let dragging = false, sx = 0, sy = 0, ox = 0, oy = 0;
      head.addEventListener('mousedown', (e) => {
        if (e.target.id === 'cp-min') return;
        dragging = true;
        const rect = panel.getBoundingClientRect();
        sx = e.clientX; sy = e.clientY; ox = rect.left; oy = rect.top;
        panel.style.right = 'auto'; panel.style.bottom = 'auto';
        panel.style.left = ox + 'px'; panel.style.top = oy + 'px';
        e.preventDefault();
      });
      document.addEventListener('mousemove', (e) => {
        if (!dragging) return;
        panel.style.left = ox + (e.clientX - sx) + 'px';
        panel.style.top = oy + (e.clientY - sy) + 'px';
      });
      document.addEventListener('mouseup', () => { dragging = false; });
    })();

    refresh();
    log('面板已建立');
  }

  function ensureUI() {
    try {
      buildLauncher();
    } catch (err) {
      console.error(LOG, 'UI 建立失敗', err);
    }
  }

  function boot() {
    log('腳本啟動', location.href);
    loadGeoCache();
    ensureUI();
  }

  if (document.readyState === 'loading') {
    document.addEventListener('DOMContentLoaded', boot);
  } else {
    boot();
  }
  setTimeout(ensureUI, 1500);

  let lastUrl = location.href;
  setInterval(() => {
    if (location.href !== lastUrl) {
      lastUrl = location.href;
      setTimeout(ensureUI, 600);
    }
    if (!document.getElementById('crewplay-launcher')) ensureUI();
  }, 2000);
})();
