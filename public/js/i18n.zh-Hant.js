/*
 * 繁體中文 — TRADITIONAL CHINESE TRANSLATION
 *
 * This is a side-car dictionary, not a second questionnaire. The English schema
 * in schema.partA.js remains the single source of truth for what questions
 * exist, what their ids are and what values they store; this file only supplies
 * display text. That separation is deliberate:
 *
 *   - Nothing here can change a stored answer. Values are ids and option codes,
 *     which are language-neutral, so a client can start in English and finish in
 *     Chinese without the data noticing.
 *   - The export to Drive stays in English (see format.js), so submissions from
 *     different clients stay comparable no matter which language each of them
 *     read the form in.
 *   - Adding a third language is another file of the same shape.
 *
 * KEYS MUST MATCH schema.partA.js. `fields` is keyed by field id — including
 * the ids of inline reveal follow-ups and of each metrics row, because those
 * are fields too. A missing key falls back to the English text rather than
 * showing a blank, so a partial translation is safe to ship.
 *
 * Terminology follows Hong Kong / Taiwan printing usage: 品質 not 质量,
 * 資訊 not 信息, 專案 not 项目, 軟體 not 软件.
 */

/* Country and region names. Keyed by ISO 3166-1 alpha-2, which is what is
   stored, so translating a name can never orphan an answer. */
export const ZH_COUNTRIES = {
	CN: '中國大陸',
	HK: '香港特別行政區',
	TW: '台灣',
	MO: '澳門特別行政區',
	VN: '越南',
	TH: '泰國',
	MY: '馬來西亞',
	ID: '印尼',
	SG: '新加坡',
	PH: '菲律賓',
	IN: '印度',

	AF: '阿富汗',
	AL: '阿爾巴尼亞',
	DZ: '阿爾及利亞',
	AD: '安道爾',
	AO: '安哥拉',
	AG: '安地卡及巴布達',
	AR: '阿根廷',
	AM: '亞美尼亞',
	AU: '澳洲',
	AT: '奧地利',
	AZ: '亞塞拜然',
	BS: '巴哈馬',
	BH: '巴林',
	BD: '孟加拉',
	BB: '巴貝多',
	BY: '白俄羅斯',
	BE: '比利時',
	BZ: '貝里斯',
	BJ: '貝寧',
	BT: '不丹',
	BO: '玻利維亞',
	BA: '波士尼亞與赫塞哥維納',
	BW: '波札那',
	BR: '巴西',
	BN: '汶萊',
	BG: '保加利亞',
	BF: '布吉納法索',
	BI: '蒲隆地',
	KH: '柬埔寨',
	CM: '喀麥隆',
	CA: '加拿大',
	CV: '維德角',
	CF: '中非共和國',
	TD: '查德',
	CL: '智利',
	CO: '哥倫比亞',
	KM: '葛摩',
	CG: '剛果共和國',
	CD: '剛果民主共和國',
	CR: '哥斯大黎加',
	CI: '象牙海岸',
	HR: '克羅埃西亞',
	CU: '古巴',
	CY: '賽普勒斯',
	CZ: '捷克',
	DK: '丹麥',
	DJ: '吉布地',
	DM: '多米尼克',
	DO: '多明尼加共和國',
	EC: '厄瓜多',
	EG: '埃及',
	SV: '薩爾瓦多',
	GQ: '赤道幾內亞',
	ER: '厄利垂亞',
	EE: '愛沙尼亞',
	SZ: '史瓦帝尼',
	ET: '衣索比亞',
	FJ: '斐濟',
	FI: '芬蘭',
	FR: '法國',
	GA: '加彭',
	GM: '甘比亞',
	GE: '喬治亞',
	DE: '德國',
	GH: '迦納',
	GR: '希臘',
	GD: '格瑞那達',
	GT: '瓜地馬拉',
	GN: '幾內亞',
	GW: '幾內亞比索',
	GY: '蓋亞那',
	HT: '海地',
	HN: '宏都拉斯',
	HU: '匈牙利',
	IS: '冰島',
	IR: '伊朗',
	IQ: '伊拉克',
	IE: '愛爾蘭',
	IL: '以色列',
	IT: '義大利',
	JM: '牙買加',
	JP: '日本',
	JO: '約旦',
	KZ: '哈薩克',
	KE: '肯亞',
	KI: '吉里巴斯',
	KW: '科威特',
	KG: '吉爾吉斯',
	LA: '寮國',
	LV: '拉脫維亞',
	LB: '黎巴嫩',
	LS: '賴索托',
	LR: '賴比瑞亞',
	LY: '利比亞',
	LI: '列支敦斯登',
	LT: '立陶宛',
	LU: '盧森堡',
	MK: '北馬其頓',
	MG: '馬達加斯加',
	MW: '馬拉威',
	MV: '馬爾地夫',
	ML: '馬利',
	MH: '馬紹爾群島',
	MT: '馬爾他',
	MR: '茅利塔尼亞',
	MU: '模里西斯',
	MX: '墨西哥',
	FM: '密克羅尼西亞聯邦',
	MD: '摩爾多瓦',
	MC: '摩納哥',
	MN: '蒙古',
	ME: '蒙特內哥羅',
	MA: '摩洛哥',
	MZ: '莫三比克',
	MM: '緬甸',
	NR: '諾魯',
	NA: '納米比亞',
	NP: '尼泊爾',
	NL: '荷蘭',
	NZ: '紐西蘭',
	NI: '尼加拉瓜',
	NE: '尼日',
	NG: '奈及利亞',
	KP: '北韓',
	NO: '挪威',
	OM: '阿曼',
	PK: '巴基斯坦',
	PW: '帛琉',
	PS: '巴勒斯坦',
	PA: '巴拿馬',
	PG: '巴布亞紐幾內亞',
	PY: '巴拉圭',
	PE: '秘魯',
	PL: '波蘭',
	PT: '葡萄牙',
	QA: '卡達',
	RO: '羅馬尼亞',
	RU: '俄羅斯',
	RW: '盧安達',
	KN: '聖克里斯多福及尼維斯',
	LC: '聖露西亞',
	VC: '聖文森及格瑞那丁',
	WS: '薩摩亞',
	SM: '聖馬利諾',
	ST: '聖多美普林西比',
	SA: '沙烏地阿拉伯',
	SN: '塞內加爾',
	RS: '塞爾維亞',
	SC: '塞席爾',
	SL: '獅子山',
	SK: '斯洛伐克',
	SI: '斯洛維尼亞',
	SB: '索羅門群島',
	SO: '索馬利亞',
	ZA: '南非',
	KR: '南韓',
	SS: '南蘇丹',
	ES: '西班牙',
	LK: '斯里蘭卡',
	SD: '蘇丹',
	SR: '蘇利南',
	SE: '瑞典',
	CH: '瑞士',
	SY: '敘利亞',
	TJ: '塔吉克',
	TZ: '坦尚尼亞',
	TL: '東帝汶',
	TO: '東加',
	TG: '多哥',
	TT: '千里達及托巴哥',
	TN: '突尼西亞',
	TR: '土耳其',
	TM: '土庫曼',
	TV: '吐瓦魯',
	UG: '烏干達',
	UA: '烏克蘭',
	AE: '阿拉伯聯合大公國',
	GB: '英國',
	US: '美國',
	UY: '烏拉圭',
	UZ: '烏茲別克',
	VU: '萬那杜',
	VE: '委內瑞拉',
	YE: '葉門',
	ZM: '尚比亞',
	ZW: '辛巴威',
};

/* Interface chrome — everything that is not a question. */
export const ZH_UI = {
	documentTitle: '建議書編製前問卷 — Ming Fong Paper Limited',
	brandSub: '建議書編製前問卷',
	skipToContent: '跳至內容',
	langLabel: '語言 / Language',
	confidential: '所有資訊均作保密處理，僅用於建議書編製。',
	noscript:
		'本問卷需要 JavaScript 才能在您填寫時儲存答案。若無法啟用，請來信 tommy.chan@mingfongpaper.com，我們會改以文件形式寄送。',

	loginTitle: '建議書編製前問卷',
	loginIntro: '柔性版印刷標準化專案。請輸入邀請函中的存取碼開始填寫，或繼續您先前已開始的問卷。',
	loginCodeLabel: '存取碼',
	loginSubmit: '繼續',
	loginChecking: '檢查中…',
	loginHelpBefore: '沒有存取碼，或無法使用？請來信 ',
	loginHelpAfter: '，我們會重新寄送。',
	loginBadCode: '無法識別此存取碼。',
	sessionExpired: '登入已逾時。請重新輸入存取碼——您的答案並未遺失。',

	saveSaved: '所有答案已儲存',
	saveSaving: '儲存中…',
	savePending: '尚有變更未儲存',
	saveOffline: '離線中——已儲存於此裝置',
	saveError: '已儲存於此裝置，重試中…',

	navTitle: '章節',
	navSections: '問卷章節',
	navReview: '檢視並提交',
	jumpToSection: '跳至章節',
	sectionEyebrow: (id) => `第 ${id} 節`,
	progress: (where, answered, total) => `${where} · 已回答 ${answered}／${total} 題`,
	progressWhere: (index, total) => `第 ${index} 節（共 ${total} 節）`,
	progressReview: '檢視',

	back: '上一步',
	nextSection: '下一節',
	reviewAnswers: '檢視答案',

	required: '必填',
	requiredTitle: '此項為必填',
	notAnswered: '未填寫',
	selectPlaceholder: '請選擇…',
	groupCommon: '最常用',
	groupAll: '全部國家及地區',
	dialCode: '區號',
	phoneCountryCode: (label) => `${label} — 國家代碼`,
	remove: '移除',
	removeRow: (rowLabel, index) => `移除${rowLabel} ${index}`,
	addRow: '新增一列',
	notTracked: '未統計',
	chosenOf: (n, max) => `已選 ${n}／${max} 項`,
	chosenAtCap: (max) => `已選滿 ${max} 項——如需更改，請先取消其中一項`,

	reviewEyebrow: '最後一步',
	reviewTitle: '檢視並提交',
	reviewMissing: (labels) => `提交前需要填寫 ${labels}——我們要靠這些資料回覆您。其餘項目皆為選填。`,
	reviewGoToA: '前往 A 節',
	and: ' 與 ',
	listSeparator: '、',
	reviewBlanks: (n) => `您有 ${n} 題留空。這完全沒有問題——留空能讓我們知道哪些項目目前未有統計，本身就是有用的資訊。準備好即可提交。`,
	submit: '提交問卷',
	submitting: '提交中…',
	submitConfirm: (n) =>
		`您有 ${n} 題留空。\n\n` +
		'這沒有問題——留空的答案同樣有價值，能讓我們知道哪些項目目前未有統計。' +
		'提交後將無法再修改問卷。\n\n確定現在提交嗎？',
	submitAlready: '此問卷已提交。如需修改答案，請與我們聯絡。',
	submitFailed: (message) => `目前無法提交：${message}。您的答案已儲存，請稍後再試。`,

	// Comma rather than a dash: on a phone the dash lands mid-clause at the line
	// break and the heading reads as two fragments.
	receiptTitle: '感謝您，我們已收到您的問卷',
	receiptContactBefore: '我們會審閱您的答案，並透過 ',
	receiptContactAfter: ' 與您聯絡。',
	receiptFallbackEmail: '您所提供的地址',
	receiptSubmittedAt: (when) => `提交時間：${when}。`,
	receiptOptional: (labels) =>
		`您表示以下文件已經存在：<strong>${labels}</strong>。方便時請寄至 <a href="mailto:tommy.chan@mingfongpaper.com">tommy.chan@mingfongpaper.com</a> —— 無需為此另行製作任何文件。`,
	yourAnswers: '您的答案',
	printCopy: '列印或儲存副本',

	// Parentheses, not a dash: the title already contains one.
	partBSummary: (title) => `${title}（現階段無需處理）`,
};

/* Part A — the questionnaire itself. */
export const ZH_PART_A = {
	title: 'A 部分 — 建議書編製前',
	subtitle: '柔性版印刷標準化專案',
	preamble: [
		'這讓我們能依據貴公司的實際營運情況編製與報價建議書，而非套用通用假設。約需 25 分鐘。',
		'請僅填寫您已掌握的部分。留空或填寫概略數字均可接受，且同樣有參考價值——資訊的缺口本身即具診斷意義。請勿為查證不在手邊的數據而額外花費時間。',
		'您的答案會自動儲存。可隨時關閉此頁面，日後以相同連結與存取碼繼續填寫。',
		'所有資訊均作保密處理，僅用於建議書編製。',
	],
	closing: '收到問卷後，我們將進行審閱，並安排 30 分鐘通話，就少量事項作進一步確認，隨後編製建議書。建議書將於該通話後 5 個工作日內出具。',

	sections: {
		A: { title: '公司與聯絡人' },
		B: { title: '產品與客戶' },
		C: { title: '設備' },
		D: { title: '供應鏈' },
		E: { title: '現行製程控制' },
		F: {
			title: '目前績效',
			intro: '填寫概略數字即可。若某項未做統計，請勾選「未統計」——這確實是有用的資訊，無需覺得抱歉。',
		},
		G: { title: '問題與優先事項' },
		H: { title: '組織與就緒程度' },
		I: { title: '專案背景' },
		J: { title: '其他補充' },
		OPT: {
			title: '選填文件',
			intro:
				'僅在文件已經存在且便於提供時勾選，請勿為此專門製作。此處不會上傳任何檔案——提交後我們會與您聯絡，您再以電郵或微信傳送勾選的文件即可。',
		},
	},

	fields: {
		/* ---------------------------------------------------------------- A */
		a_company_name: { label: '公司名稱' },
		a_site_country: { label: '廠區所在國家／地區', placeholder: '請選擇國家或地區', options: ZH_COUNTRIES },
		a_site_address: {
			label: '廠區地址',
			hint: '街道、區、城市及省份。此項影響到廠訪問的差旅安排，資料越完整越好。',
		},
		a_contact_name: { label: '聯絡人姓名及職務' },
		a_contact_email: { label: '電郵', hint: '我們會回覆至此地址，因此這是唯一必須填寫的項目。' },
		a_contact_phone: { label: '電話／微信', hint: '請先選擇國家代碼，再輸入號碼。' },
		a_employees: { label: '本廠區員工人數' },
		a1_multi_site: {
			label: '印刷業務是否分布於多個廠區？',
			options: { one: '否，僅一處', multi: '是' },
		},
		a1_site_count: { label: '廠區數量' },
		a2_prepress_location: {
			label: '印前是否位於同一廠區？',
			options: { yes: '是', no: '否', outsourced: '外包' },
		},
		a2_prepress_where: { label: '位於何處' },
		a3_report_recipients: {
			label: '診斷報告將由哪些人員接收並據以決策？',
			hint: '可多選。',
			options: {
				gm: '總經理／東主',
				production_manager: '生產經理',
				quality_manager: '品質經理',
				technical_manager: '技術經理',
				group_parent: '集團／母公司',
				other: '其他',
			},
		},
		a3_recipients_other: { label: '請說明' },
		a4_nda: {
			label: '專案開始前是否需簽署保密協議？',
			options: {
				yes_ours: '是——我方將提供範本',
				yes_yours: '是——請使用貴公司的範本',
				no: '否',
				not_sure: '不確定',
			},
		},

		/* ---------------------------------------------------------------- B */
		b1_products: {
			label: '主要印刷產品',
			hint: '可多選。',
			options: {
				flexible_packaging: '軟包裝',
				labels: '標籤',
				folding_carton: '摺疊紙盒',
				corrugated: '瓦楞紙',
				paper_tissue: '紙類／生活用紙',
				other: '其他',
			},
		},
		b1_products_other: { label: '請說明' },
		b2_end_markets: {
			label: '主要終端市場',
			options: {
				food: '食品',
				beverage: '飲料',
				pharmaceutical: '醫藥',
				personal_care: '個人護理',
				household: '家居用品',
				industrial: '工業用品',
				other: '其他',
			},
		},
		b2_end_markets_other: { label: '請說明' },
		b3_customer_standards: {
			label: '是否有客戶對貴公司提出其自有的顏色或品質標準（品牌商規格、供應商稽核）？',
			options: { yes: '是', no: '否', not_sure: '不確定' },
		},
		b3_standards_which: { label: '具體是哪些標準或客戶' },
		b4_repeat_share: { label: '重複性／常規訂單約佔業務比例', unit: '%' },
		b5_active_skus: { label: '常規生產的在用訂單或 SKU 數量（概數）' },
		b6_job_structure: {
			label: '典型訂單結構',
			options: {
				mostly_spot: '以專色為主',
				mostly_process: '以四色（CMYK）為主',
				combination: '兩者結合',
				varies: '差異較大',
			},
		},

		/* ---------------------------------------------------------------- C */
		c1_presses: {
			label: '柔版印刷機',
			hint: '每台機器新增一列。填寫概略資料即可——不確定的欄位可以留空。',
			addLabel: '新增一台印刷機',
			rowLabel: '機台',
			columns: {
				make_model: '品牌／型號',
				year: '年份',
				web_width: '幅寬（米）',
				colours: '色組',
				max_speed: '最高車速（米／分）',
				substrates: '所印承印材料',
			},
		},
		c2_other_processes: {
			label: '本廠區是否同時運行凹版或其他印刷工藝？',
			options: { yes: '是', no: '否' },
		},
		c2_line_count: { label: '生產線數量' },
		c2_gravure_scope: {
			label: '凹版是否應納入本專案範圍？',
			options: { include: '納入', flexo_only: '不納入，僅柔版', undecided: '尚未確定——請建議' },
		},
		c3_diagnostic_scope: {
			label: '診斷應涵蓋全部機台，還是指定部分機台？',
			options: { all: '全部機台', subset: '部分機台', advise: '請建議' },
		},
		c3_subset_which: { label: '具體是哪些機台' },
		c4_anilox_count: { label: '網紋輥庫存數量（概數）' },
		c5_shifts: {
			label: '運行班次數',
			options: { 1: '1 班', 2: '2 班', 3: '3 班' },
		},
		c5_shift_times: { label: '各班起止時間', hint: '例如：08:00–16:00、16:00–24:00' },
		c5_operators: { label: '印刷操作人員總數' },
		c6_prepress_software: {
			label: '使用何種印前流程／RIP 軟體？',
			hint: '例如 Esko Automation Engine、Hybrid、柯達或其他——概略即可。',
		},

		/* ---------------------------------------------------------------- D */
		d1_plates: {
			label: '印版',
			options: { in_house: '自行製版', purchased: '向外部供應商採購', both: '兩者兼有' },
		},
		d1_plate_suppliers: { label: '印版供應商數量' },
		d1_written_specs: {
			label: '是否收到供應商提供的書面規格？',
			options: { yes: '是', no: '否', not_sure: '不確定' },
		},
		d1_plate_lead_time: { label: '新版製作的典型交期', unit: '天' },
		d2_ink: {
			label: '油墨',
			options: { in_house: '自行調配／生產', purchased: '採購成品墨', both: '兩者兼有' },
		},
		d2_ink_type: {
			label: '油墨類型',
			options: { water_based: '水性', solvent_based: '溶劑型', uv: 'UV', mixed: '多種' },
		},
		d2_ink_suppliers: { label: '油墨供應商數量' },
		d3_substrate: {
			label: '承印材料',
			options: { in_house: '本廠自產', purchased: '外購', both: '兩者兼有' },
		},
		d3_same_department: {
			label: '承印材料生產與印刷是否由同一部門管理？',
			options: { yes: '是', no: '否' },
		},
		d4_incoming_inspection: {
			label: '對採購的印版、油墨或承印材料是否進行來料檢驗？',
			options: { documented: '有，且有記錄', informal: '有，但非正式', none: '無' },
		},

		/* ---------------------------------------------------------------- E */
		e1_controls: {
			label: '貴公司目前具備以下哪些？',
			hint: '可多選。一項都未勾選同樣是有效且有用的回答。',
			options: {
				written_sops: '印刷機作業的書面 SOP',
				colour_standards: '帶數值公差的顏色標準（如 ΔE 上限）',
				tvi_curves: '印前套用的網點擴大（TVI）曲線',
				anilox_register: '記錄有容積數據的網紋輥台帳',
				first_off: '有記錄的首件確認程序',
				in_process_checks: '有記錄的製程品質檢查',
				preventive_maintenance: '預防性維護計劃',
				none: '以上皆無／不確定',
			},
		},
		e2_instruments: {
			label: '現場可用的量測儀器',
			hint: '可多選。',
			options: {
				spectrophotometer: '分光光度計',
				densitometer: '密度計',
				plate_dot: '印版網點量測儀／放大鏡',
				anilox_inspection: '網紋輥檢測儀',
				viscosity_cup: '黏度杯',
				ph_meter: 'pH 計',
				dyne_pens: '達因筆或測試液',
				viewing_booth: '標準光源看樣台（D50）',
				none: '無／不確定',
			},
		},
		e2_spectro_model: { label: '品牌／型號（如知悉）' },
		e2_viscosity_type: { label: '黏度杯類型' },
		e2_calibrated: {
			label: '如已配備儀器——是否按計劃進行校準？',
			options: { yes: '是', no: '否', not_sure: '不確定' },
		},
		e3_colour_approval: {
			label: '機台顏色如何確認？',
			options: {
				measured: '依數值目標量測確認',
				visual: '與確認樣進行目視比對',
				operator_judgement: '依操作人員判斷',
				varies: '視訂單或操作人員而定',
			},
		},
		e4_impression: {
			label: '壓印如何設定？',
			options: {
				written_procedure: '有明確的書面程序',
				automatic: '自動／設備輔助',
				operator_experience: '依操作人員經驗',
			},
		},

		/* ---------------------------------------------------------------- F */
		f_performance: { label: '目前績效數據' },
		f_makeready_time: { label: '平均每單開機時間', unit: '分鐘' },
		f_makeready_waste: { label: '平均每單開機損耗', unit: '米／公斤' },
		f_running_waste: { label: '運行損耗率', unit: '%' },
		f_reprint_rate: { label: '重印／返工率', unit: '%' },
		f_complaints_month: { label: '每月客戶投訴次數', unit: '次／月' },
		f_oee: { label: '設備綜合效率（OEE），若有統計', unit: '%' },
		f1_data_available: {
			label: '是否可提供過去 12 個月的損耗、返工與投訴數據？',
			options: { systematic: '有，且有系統記錄', partial: '部分有', no: '無' },
		},

		/* ---------------------------------------------------------------- G */
		g1_frequent_issues: {
			label: '以下問題中，哪些最常發生？',
			hint: '最多選四項。',
			options: {
				colour_between_runs: '同一訂單不同批次間顏色不一致',
				colour_between_shifts: '不同班次或操作人員間顏色不一致',
				colour_between_presses: '不同機台間顏色不一致',
				long_makeready: '開機時間過長',
				high_waste: '損耗偏高',
				print_defects: '重複性印刷缺陷（條紋、針孔、重影、霧影等）',
				register: '套準問題',
				substrate: '承印材料相關問題（處理值、附著力、厚度）',
				plate_quality: '印版品質或一致性問題',
				ink_quality: '油墨品質或一致性問題',
				complaints: '客戶投訴或退貨',
				staff_loss: '資深人員流失／技術知識流失',
			},
		},
		g2_biggest_problem: { label: '請簡要說明目前造成最大成本或困擾的單一問題' },
		g3_desired_outcome: { label: '達成何種成效，會讓貴公司認為本專案明確值得投入？' },

		/* ---------------------------------------------------------------- H */
		h1_previous_program: {
			label: '貴公司此前是否嘗試過標準化或品質改善專案？',
			options: { yes: '是', no: '否' },
		},
		h1_outcome: {
			label: '結果如何？',
			hint: '誠實的回答比正面的回答更有用——它讓我們知道這次應該有何不同。',
		},
		h2_certifications: {
			label: '是否持有相關認證？',
			options: {
				iso9001: 'ISO 9001',
				iso12647: 'ISO 12647',
				g7: 'G7',
				brc_fssc: 'BRC／FSSC',
				other: '其他',
				none: '無',
			},
		},
		h2_certifications_other: { label: '請說明' },
		h3_internal_owner: {
			label: '專案結束後，是否有人選可指派為標準的內部責任人？',
			options: {
				yes_identified: '有，已確定人選',
				yes_not_identified: '有此打算，但尚未確定',
				no: '無',
				not_sure: '不確定',
			},
		},
		h3_owner_role: { label: '該人員的職務' },
		h4_training_release: {
			label: '操作人員是否能實際抽離生產參加培訓？',
			options: {
				full: '可以，能安排完整場次',
				short: '僅能安排短時段',
				difficult: '較困難',
				not_sure: '不確定',
			},
		},
		h5_press_time: {
			label: '能否安排機台時間進行受控測試印刷（2–3 小時）？',
			options: { yes: '可以', with_planning: '需提前規劃', difficult: '較困難' },
		},
		h6_working_language: {
			label: '生產主管與操作人員的工作語言',
			options: { mandarin: '普通話', cantonese: '粵語', english: '英語', other: '其他' },
		},
		h6_language_other: { label: '請說明' },
		h6_interpreter: {
			label: '技術討論是否需要翻譯？',
			options: { no: '不需要', yes: '需要', not_sure: '不確定' },
		},

		/* ---------------------------------------------------------------- I */
		i1_drivers: {
			label: '現階段推動此事的原因？',
			hint: '可多選。',
			options: {
				customer_pressure: '客戶或品牌商要求',
				cost_waste: '降低成本／損耗',
				quality_complaints: '品質投訴',
				new_business: '為新業務或投標做準備',
				equipment_investment: '新設備投資決策',
				staff_loss: '關鍵人員流失',
				management_initiative: '管理層主導',
				other: '其他',
			},
		},
		i1_drivers_other: { label: '請說明' },
		i2_approach: {
			label: '傾向的推進方式',
			options: {
				diagnostic_only: '先做診斷，之後再決定',
				full_program: '若診斷結果支持，則推進完整專案',
				undecided: '尚未確定',
			},
		},
		i3_budget: {
			label: '是否已核准相關預算範圍？',
			options: { yes: '是', not_yet: '尚未', prefer_not_say: '不便告知' },
		},
		i4_start_timing: {
			label: '期望啟動時間',
			options: {
				within_1_month: '1 個月內',
				'1_3_months': '1–3 個月',
				'3_6_months': '3–6 個月',
				undecided: '尚未確定',
			},
		},
		i5_avoid_period: { label: '是否有應避開的時段（旺季、稽核期、停產檢修、法定假期）？' },
		i6_approvers: { label: '除您之外，還有哪些人員需審閱或批准本建議書？' },

		/* ---------------------------------------------------------------- J */
		j_anything_else: {
			label: '關於貴公司的營運情況、過往經歷或既有限制，是否還有其他有助於我們編製更準確建議書的資訊？',
		},

		/* -------------------------------------------------------------- OPT */
		opt_documents: {
			label: '已經存在且便於提供的文件',
			options: {
				press_list: '設備清單或機台一覽表',
				anilox_inventory: '網紋輥庫存清單',
				existing_sops: '現有 SOP',
				waste_defect_data: '損耗或缺陷匯總數據',
				customer_specs: '客戶品質規格',
				print_samples: '呈現典型問題的近期印刷樣張',
			},
		},
	},
};

/* Part B — read-only preview. */
export const ZH_PART_B = {
	title: 'B 部分 — 到廠前準備',
	intro:
		'此部分僅供參考，現階段無需填寫。B 部分於合約簽署後填寫，最遲在到廠訪問前三週完成。此處先行呈現，是讓貴公司預先了解後續所需配合的事項，以便及早提出可能存在的障礙。',
	sections: {
		K: {
			title: '廠區進出與保安',
			note: '拍照許可需要及早答覆。診斷報告建立在設備狀況、缺陷與設定作業的照片證據之上。若貴公司生產現場不允許攝影，請儘早告知，以便在訪問前調整報告形式與取證方式。',
			items: [
				'訪問對接人——姓名、職務、手機與微信',
				'訪客登記：提前通知、身分證或護照影本、背景審查',
				'進廠所需的文件',
				'生產現場是否可以拍照，以及有無禁區',
				'量測數據是否可從貴公司系統匯出（損耗記錄、訂單記錄）',
				'是否可攜帶可攜式檢測設備進廠——分光光度計、網紋輥檢測鏡、達因筆、網點測量儀',
				'安全講習與個人防護裝備安排',
				'生產區域的衛生要求——食品與藥品包裝廠常見',
			],
		},
		L: {
			title: '日程安排',
			note: '訪問必須在真實生產狀態下進行。特意準備的示範日無法產生有效的基準數據。',
			items: [
				'建議的訪問日期與確定的班次時間',
				'應觀察哪些班次——班次之間的差異是未書面化製程知識最強的指標之一，因此夜班觀察通常意味著一次深夜或清晨的場次',
				'訪問期間是否全程進行正常商業生產',
				'訪問當週的生產排程——哪些訂單在哪些機台上',
				'有無衝突：客戶稽核、停產檢修、假期',
			],
		},
		M: {
			title: '現場工作安排',
			items: [
				'一張辦公桌或會議室，並有電源',
				'顧問可使用的網絡連線',
				'最近的合適酒店及其與廠區的距離',
				'酒店與廠區之間的交通',
				'食堂或用餐安排',
			],
		},
		N: {
			title: '需配合的人員',
			items: [
				'全程陪同的內部對接人',
				'生產或廠區經理，參與啟動與總結',
				'印前主管、製版房主管、調墨房主管',
				'承印材料生產主管（若為本廠自產）',
				'品質經理與維護主管',
				'各班次的班長',
				'每班二至三位資深操作人員，每位約 20 分鐘',
			],
		},
		O: {
			title: '需準備的文件',
			note: '僅收集已經存在的文件。不完整沒有關係——請勿為此專門製作文件。提前一至兩週寄出，可讓現場時間花在生產現場，而非在辦公室閱讀資料。',
			items: [
				'印刷機規格與設備清單',
				'網紋輥庫存清單，如仍保留則附原始雕刻證書',
				'現行的 TVI／網點擴大曲線檔案',
				'顏色標準與客戶規格',
				'印版與油墨供應商規格、技術資料表、近期交貨記錄',
				'承印材料規格，如為本廠自產則附生產記錄',
				'過去 12 個月的損耗、返工、重印與客戶投訴數據',
				'現有 SOP、作業指導書、維護記錄與校準證書',
				'近期的問題樣張，並註明問題所在',
			],
		},
		P: {
			title: '受控指紋測試印刷',
			note: '測試版有前置時間，也有成本。測試版式須在印刷前製版，而印版通常需外購。亦可改用既有的重複性訂單作為指紋參考——較便宜也較快，但取得的數據較不完整。兩種方式皆可行，但應在確定日期時就決定，而非到當天才決定。',
			items: [
				'指定的印刷機——通常是產量最高或最具代表性的一台',
				'指定的承印材料，以及庫存是否足夠',
				'將使用的油墨組',
				'印前是否能接收並處理我方提供的測試檔案（PDF）',
				'印版供應商的交期，以及印版成本由誰承擔',
				'可供測試印刷的機台時間，以及由誰核准將機台撤出生產',
			],
		},
		Q: {
			title: '最終確認',
			note: '若只告知操作人員將進行稽核而不說明原因，常會出現防衛心態或行為改變，會降低觀察的價值。簡短而坦誠的說明——說明目的是改善製程，而非評核個人——效果明顯較佳。我們可提供建議措辭。',
			items: ['關於廠區條件、進出或文化，有無其他有助於訪問順利進行的資訊', '是否已告知員工將有外部評估進行'],
		},
	},
};

export default { ui: ZH_UI, partA: ZH_PART_A, partB: ZH_PART_B, countries: ZH_COUNTRIES };
