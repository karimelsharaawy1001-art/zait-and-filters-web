/**
 * Smart Search Expander
 *
 * Converts a free-text Arabic/English query into structured DB filters.
 * Example: "تيل فرامل بوما"
 *   → { make: "MITSUBISHI", model: "LANCER PUMA",
 *        category: "الفرامل", subcategories: ["تيل امامي","تيل خلفي","تيل فرامل"] }
 */

export interface SearchIntent {
  make?: string;           // e.g. "MITSUBISHI"
  model?: string;          // e.g. "LANCER PUMA"
  category?: string;       // e.g. "الفرامل"
  subcategories?: string[];// e.g. ["تيل امامي","تيل خلفي"]
  brand?: string;          // e.g. "NGK"
  textSearch?: string;     // remaining free-text for product name search
}

// ── Car model nicknames → {make, model} ──────────────────────────────────────
// Order matters: longer/more-specific phrases must come first
const MODEL_ALIASES: Array<{ aliases: string[]; make: string; model: string }> = [
  // Mitsubishi — many Egyptian typo variants for Lancer
  { aliases: ['لانسر بوما', 'لانسير بوما', 'لنسر بوما', 'boma puma', 'lancer puma'], make: 'MITSUBISHI', model: 'LANCER PUMA' },
  { aliases: ['بوما', 'بومه', 'boma'], make: 'MITSUBISHI', model: 'LANCER PUMA' },
  { aliases: ['لانسر شارك', 'لانسير شارك', 'شارك', 'shark', 'lancer shark'], make: 'MITSUBISHI', model: 'LANCER SHARK' },
  // "لانسر" without variant → default Puma (most common in Egypt)
  { aliases: ['لانسر', 'لانسير', 'لنسر', 'لنسير', 'lancer', 'lanser'], make: 'MITSUBISHI', model: 'LANCER PUMA' },
  { aliases: ['باجيرو', 'بجيرو', 'باجيره', 'pajero'], make: 'MITSUBISHI', model: 'PAJERO' },
  { aliases: ['اكليبس', 'ايكليبس', 'اكلبس', 'eclipse'], make: 'MITSUBISHI', model: 'ECLIPSE' },

  // Chevrolet
  { aliases: ['جراند اوبترا', 'grand optra', 'اوبترا جراند'], make: 'CHEVROLET', model: 'OPTRA' },
  { aliases: ['اوبترا', 'اوبتيرا', 'اوبرتا', 'اوبطرا', 'اوبترة', 'optra'], make: 'CHEVROLET', model: 'OPTRA' },
  { aliases: ['كروز', 'كروزي', 'كروس', 'كروزه', 'cruze', 'cruz'], make: 'CHEVROLET', model: 'CRUZE' },
  { aliases: ['كابتيفا', 'كابتفا', 'كابتيفه', 'captiva'], make: 'CHEVROLET', model: 'CAPTIVA' },
  { aliases: ['افيو', 'أفيو', 'افيوه', 'اڤيو', 'aveo'], make: 'CHEVROLET', model: 'AVEO' },
  { aliases: ['لانوس', 'لانس', 'لانوز', 'لانوسه', 'lanos'], make: 'CHEVROLET', model: 'LANOS' },
  { aliases: ['اونيكس', 'أونيكس', 'اونكس', 'اونيكسي', 'onix'], make: 'CHEVROLET', model: 'ONIX' },
  { aliases: ['ترافيرس', 'traverse'], make: 'CHEVROLET', model: 'TRAVERSE' },
  { aliases: ['ماليبو', 'malibu'], make: 'CHEVROLET', model: 'MALIBU' },
  { aliases: ['سبارك', 'spark', 'شيفروليه سبارك'], make: 'CHEVROLET', model: 'SPARK' },

  // Hyundai
  { aliases: ['النترا', 'انترا', 'الانترا', 'إلانترا', 'النتره', 'الانتره', 'النترة', 'elantra'], make: 'HYUNDAI', model: 'ELANTRA' },
  { aliases: ['توسان', 'توسن', 'طوسان', 'توسانة', 'tucson'], make: 'HYUNDAI', model: 'TUCSON' },
  { aliases: ['سوناتا', 'سونته', 'سوناته', 'sonata'], make: 'HYUNDAI', model: 'SONATA' },
  { aliases: ['اكسنت', 'أكسنت', 'اكسنت', 'اكسنته', 'accent'], make: 'HYUNDAI', model: 'ACCENT' },
  { aliases: ['جراند i10', 'grand i10', 'جراند اي 10', 'جراند ١٠'], make: 'HYUNDAI', model: 'GRAND I10' },
  { aliases: ['i10', 'اي 10', 'آي 10', 'هيونداي i10', 'اى عشرة'], make: 'HYUNDAI', model: 'I10' },
  { aliases: ['ماتريكس', 'ماتركس', 'ماتريكسي', 'matrix'], make: 'HYUNDAI', model: 'MATRIX' },
  { aliases: ['فيرنا', 'فرنا', 'فيرنه', 'فيرنة', 'verna'], make: 'HYUNDAI', model: 'VERNA' },
  { aliases: ['كريتا', 'creta'], make: 'HYUNDAI', model: 'CRETA' },
  { aliases: ['هيونداي ستنتا', 'staria', 'ستاريا'], make: 'HYUNDAI', model: 'STARIA' },

  // Kia
  { aliases: ['سيراتو k3', 'سيراتو k 3', 'cerato k3', 'k3'], make: 'KIA', model: 'CERATO K3' },
  { aliases: ['سيراتو ld', 'cerato ld', 'سيراتو ال دي'], make: 'KIA', model: 'CERATO LD' },
  { aliases: ['سيراتو td', 'cerato td', 'سيراتو تي دي'], make: 'KIA', model: 'CERATO TD' },
  { aliases: ['جراند سيراتو', 'grand cerato', 'grand k3'], make: 'KIA', model: 'GRAND CERATO' },
  { aliases: ['سيراتو', 'سيراتوه', 'سراتو', 'cerato'], make: 'KIA', model: 'CERATO K3' },
  { aliases: ['سبورتاج', 'سبورتج', 'سبرتاج', 'sportage'], make: 'KIA', model: 'SPORTAGE' },
  { aliases: ['سورينتو', 'سورنتو', 'sorento', 'sorento'], make: 'KIA', model: 'SORENTO' },
  { aliases: ['بيكانتو', 'بيكنتو', 'بيكانته', 'picanto'], make: 'KIA', model: 'PICANTO' },
  { aliases: ['ريو', 'كيا ريو', 'rio'], make: 'KIA', model: 'RIO' },
  { aliases: ['كارينز', 'كارنز', 'carens'], make: 'KIA', model: 'CARENS' },
  { aliases: ['سول', 'سول كيا', 'soul'], make: 'KIA', model: 'SOUL' },

  // Nissan
  { aliases: ['صني n16', 'سني n16', 'sunny n16', 'n16'], make: 'NISSAN', model: 'SUNNY N16' },
  { aliases: ['صني n17', 'سني n17', 'sunny n17', 'n17'], make: 'NISSAN', model: 'SUNNY N17' },
  { aliases: ['صني', 'سني', 'شمس', 'صنى', 'صنيه', 'sunny'], make: 'NISSAN', model: 'SUNNY N17' },
  { aliases: ['سنترا', 'سنتيرا', 'سنتره', 'سنتره نيسان', 'sentra'], make: 'NISSAN', model: 'SENTRA' },
  { aliases: ['قاشقاي', 'قشقاي', 'قاشقاى', 'قاشقائي', 'qashqai'], make: 'NISSAN', model: 'QASHQAI' },
  { aliases: ['اكس تريل', 'x-trail', 'xtrail', 'x trail', 'اكستريل', 'اكس تريل نيسان'], make: 'NISSAN', model: 'X-TRAIL' },
  { aliases: ['تيدا', 'تيده', 'تيدة', 'tiida'], make: 'NISSAN', model: 'TIIDA' },
  { aliases: ['باترول', 'patrol', 'باترول نيسان'], make: 'NISSAN', model: 'PATROL' },
  { aliases: ['نافارا', 'navara'], make: 'NISSAN', model: 'NAVARA' },

  // Toyota
  { aliases: ['كورولا', 'corolla', 'كورلا', 'كوروله'], make: 'TOYOTA', model: 'COROLLA' },
  { aliases: ['كامري', 'camry', 'كامريه'], make: 'TOYOTA', model: 'CAMRY' },
  { aliases: ['يارس', 'yaris', 'ياريس', 'يارسي'], make: 'TOYOTA', model: 'YARIS' },
  { aliases: ['راف فور', 'rav4', 'rav 4', 'راف 4'], make: 'TOYOTA', model: 'RAV4' },
  { aliases: ['هايلوكس', 'هايلكس', 'hilux', 'هايلوكسي'], make: 'TOYOTA', model: 'HILUX' },
  { aliases: ['لاند كروزر', 'land cruiser', 'لاندكروزر', 'لاند كروزير'], make: 'TOYOTA', model: 'LAND CRUISER' },
  { aliases: ['فورتشنر', 'fortuner', 'فورتشنير'], make: 'TOYOTA', model: 'FORTUNER' },
  { aliases: ['اوريس', 'auris'], make: 'TOYOTA', model: 'AURIS' },

  // Peugeot
  { aliases: ['بيجو 301', 'peugeot 301', '301'], make: 'PEUGEOT', model: '301' },
  { aliases: ['بيجو 206', 'peugeot 206', '206'], make: 'PEUGEOT', model: '206' },
  { aliases: ['بيجو 307', 'peugeot 307', '307'], make: 'PEUGEOT', model: '307' },
  { aliases: ['بيجو 308', 'peugeot 308', '308'], make: 'PEUGEOT', model: '308' },
  { aliases: ['بيجو 508', 'peugeot 508', '508'], make: 'PEUGEOT', model: '508' },
  { aliases: ['بيجو 3008', 'peugeot 3008', '3008'], make: 'PEUGEOT', model: '3008' },
  { aliases: ['بيجو 5008', 'peugeot 5008', '5008'], make: 'PEUGEOT', model: '5008' },
  { aliases: ['بيجو 2008', 'peugeot 2008', '2008'], make: 'PEUGEOT', model: '2008' },

  // Renault
  { aliases: ['داستر', 'duster', 'دستر'], make: 'RENAULT', model: 'DUSTER' },
  { aliases: ['ميجان', 'megane', 'ميجين'], make: 'RENAULT', model: 'MEGANE' },
  { aliases: ['لوجان', 'logan'], make: 'RENAULT', model: 'LOGAN' },
  { aliases: ['كليو', 'clio'], make: 'RENAULT', model: 'CLIO' },
  { aliases: ['سانديرو', 'sandero', 'ستيبواي', 'stepway'], make: 'RENAULT', model: 'SANDERO' },
  { aliases: ['كادجار', 'kadjar'], make: 'RENAULT', model: 'KADJAR' },
  { aliases: ['فلوانس', 'fluence'], make: 'RENAULT', model: 'FLUENCE' },
  { aliases: ['كابتشر', 'captur', 'كابتشير'], make: 'RENAULT', model: 'CAPTUR' },

  // Volkswagen
  { aliases: ['جولف', 'golf'], make: 'VOLKSWAGEN', model: 'GOLF' },
  { aliases: ['باسات', 'passat'], make: 'VOLKSWAGEN', model: 'PASSAT' },
  { aliases: ['جيتا', 'jetta'], make: 'VOLKSWAGEN', model: 'JETTA' },
  { aliases: ['بولو', 'polo'], make: 'VOLKSWAGEN', model: 'POLO' },

  // Skoda
  { aliases: ['اوكتافيا a7', 'octavia a7'], make: 'SKODA', model: 'OCTAVIA A7' },
  { aliases: ['اوكتافيا a8', 'octavia a8'], make: 'SKODA', model: 'OCTAVIA A8' },
  { aliases: ['اوكتافيا a5', 'octavia a5'], make: 'SKODA', model: 'OCTAVIA A5' },
  { aliases: ['اوكتافيا a4', 'octavia a4'], make: 'SKODA', model: 'OCTAVIA A4' },
  { aliases: ['اوكتافيا', 'octavia'], make: 'SKODA', model: 'OCTAVIA A7' }, // default → newest
  { aliases: ['فابيا', 'fabia'], make: 'SKODA', model: 'FABIA' },

  // Seat
  { aliases: ['ليون', 'leon'], make: 'SEAT', model: 'LEON' },
  { aliases: ['ايبيزا', 'ibiza', 'ابيزا'], make: 'SEAT', model: 'IBIZA' },
  { aliases: ['توليدو', 'toledo'], make: 'SEAT', model: 'TOLEDO' },

  // MG
  { aliases: ['mg6', 'ام جي 6', 'ام جى 6'], make: 'MG', model: '6' },
  { aliases: ['mg5', 'ام جي 5', 'ام جى 5'], make: 'MG', model: '5' },
  { aliases: ['mg3', 'ام جي 3', 'ام جى 3'], make: 'MG', model: '3' },
  { aliases: ['mg hs', 'ام جي hs', 'hs'], make: 'MG', model: 'HS' },
  { aliases: ['mg zs', 'ام جي zs', 'zs'], make: 'MG', model: 'ZS' },
  { aliases: ['mg rx5', 'ام جي rx5', 'rx5'], make: 'MG', model: 'RX5' },

  // Opel
  { aliases: ['استرا', 'استره', 'اسرا', 'astra'], make: 'OPEL', model: 'ASTRA' },
  { aliases: ['انسيجنيا', 'insignia'], make: 'OPEL', model: 'INSIGNIA' },
  { aliases: ['موكا', 'mokka', 'موكه'], make: 'OPEL', model: 'MOKKA' },

  // Mazda
  { aliases: ['مازدا 6', 'mazda 6', 'مازدا ستة'], make: 'MAZDA', model: '6' },
  { aliases: ['مازدا 3', 'mazda 3', 'مازدا تلاتة', 'مازدا تلاته'], make: 'MAZDA', model: '3' },
  { aliases: ['مازدا cx5', 'mazda cx-5', 'cx5'], make: 'MAZDA', model: 'CX-5' },

  // Honda
  { aliases: ['سيفيك', 'civic', 'سيفك', 'سيفيكي'], make: 'HONDA', model: 'CIVIC' },
  { aliases: ['هوندا سيتي', 'city', 'سيتي', 'هوندا سيتى'], make: 'HONDA', model: 'CITY' },
  { aliases: ['اكورد', 'accord', 'اكورده'], make: 'HONDA', model: 'ACCORD' },
  { aliases: ['hr-v', 'hrv', 'هوندا hr-v', 'hrv هوندا'], make: 'HONDA', model: 'HR-V' },
  { aliases: ['cr-v', 'crv', 'هوندا cr-v'], make: 'HONDA', model: 'CR-V' },

  // Suzuki
  { aliases: ['سويفت', 'swift', 'سويفتي', 'سويفته'], make: 'SUZUKI', model: 'SWIFT' },
  { aliases: ['بالينو', 'baleno', 'بالينوه'], make: 'SUZUKI', model: 'BALENO' },
  { aliases: ['فيتارا', 'vitara', 'جراند فيتارا', 'grand vitara'], make: 'SUZUKI', model: 'VITARA' },
  { aliases: ['سياز', 'ciaz'], make: 'SUZUKI', model: 'CIAZ' },

  // Ford
  { aliases: ['فيستا', 'fiesta', 'فيستة'], make: 'FORD', model: 'FIESTA' },
  { aliases: ['فوكس', 'focus', 'فوكاس', 'focus ford'], make: 'FORD', model: 'FOCUS' },
  { aliases: ['اسكيب', 'escape', 'فورد اسكيب'], make: 'FORD', model: 'ESCAPE' },
  { aliases: ['رانجر', 'ranger', 'فورد رانجر'], make: 'FORD', model: 'RANGER' },

  // BMW
  { aliases: ['bmw 316', 'بي ام 316', 'بي إم 316'], make: 'BMW', model: '316' },
  { aliases: ['bmw 318', 'بي ام 318', 'بي إم 318'], make: 'BMW', model: '318' },
  { aliases: ['bmw 320', 'بي ام 320', 'بي إم 320'], make: 'BMW', model: '320' },
  { aliases: ['bmw 520', 'بي ام 520'], make: 'BMW', model: '520' },
  { aliases: ['bmw x1', 'x1 bmw'], make: 'BMW', model: 'X1' },
  { aliases: ['bmw x3', 'x3 bmw'], make: 'BMW', model: 'X3' },
  { aliases: ['bmw x5', 'x5 bmw'], make: 'BMW', model: 'X5' },

  // Mercedes
  { aliases: ['مرسيدس c200', 'c200', 'c 200'], make: 'MERCEDES', model: 'C200' },
  { aliases: ['مرسيدس e200', 'e200', 'e 200'], make: 'MERCEDES', model: 'E200' },
  { aliases: ['مرسيدس e250', 'e250'], make: 'MERCEDES', model: 'E250' },
  { aliases: ['مرسيدس cla', 'cla'], make: 'MERCEDES', model: 'CLA' },
  { aliases: ['glc', 'مرسيدس glc'], make: 'MERCEDES', model: 'GLC' },

  // Jeep
  { aliases: ['جراند شيروكي', 'grand cherokee', 'شيروكي'], make: 'JEEP', model: 'GRAND CHEROKEE' },
  { aliases: ['رينيجيد', 'renegade', 'رينيجيده'], make: 'JEEP', model: 'RENEGADE' },
  { aliases: ['كومباس', 'compass', 'جيب كومباس'], make: 'JEEP', model: 'COMPASS' },
];

// ── Car make aliases → DB make ────────────────────────────────────────────────
const MAKE_ALIASES: Array<{ aliases: string[]; make: string }> = [
  { aliases: ['شيفروليه', 'شيفروله', 'شيفرولية', 'chevrolet', 'gm'], make: 'CHEVROLET' },
  { aliases: ['هيونداي', 'هيونده', 'hyundai'], make: 'HYUNDAI' },
  { aliases: ['كيا', 'kia'], make: 'KIA' },
  { aliases: ['نيسان', 'nissan'], make: 'NISSAN' },
  { aliases: ['تويوتا', 'toyota'], make: 'TOYOTA' },
  { aliases: ['ميتسوبيشي', 'mitsubishi', 'ميتسوبيش'], make: 'MITSUBISHI' },
  { aliases: ['فولكس فاجن', 'فولكس', 'volkswagen', 'vw'], make: 'VOLKSWAGEN' },
  { aliases: ['سكودا', 'skoda', 'سكوده'], make: 'SKODA' },
  { aliases: ['بيجو', 'peugeot', 'بيجيو'], make: 'PEUGEOT' },
  { aliases: ['رينو', 'renault', 'رينول'], make: 'RENAULT' },
  { aliases: ['اوبل', 'opel', 'أوبل'], make: 'OPEL' },
  { aliases: ['ام جي', 'mg'], make: 'MG' },
  { aliases: ['مازدا', 'mazda'], make: 'MAZDA' },
  { aliases: ['هوندا', 'honda'], make: 'HONDA' },
  { aliases: ['سوزوكي', 'suzuki'], make: 'SUZUKI' },
  { aliases: ['بي ام دبليو', 'بي إم دبليو', 'bmw'], make: 'BMW' },
  { aliases: ['مرسيدس', 'mercedes', 'مرسيدس بنز'], make: 'MERCEDES' },
  { aliases: ['فورد', 'ford'], make: 'FORD' },
  { aliases: ['جيب', 'jeep'], make: 'JEEP' },
  { aliases: ['سيات', 'seat'], make: 'SEAT' },
];

// ── Part/category synonyms → {category, subcategories?} ──────────────────────
// Longer phrases must come before shorter ones
const PART_ALIASES: Array<{
  aliases: string[];
  category: string;
  subcategories?: string[];
}> = [
  // Brakes
  { aliases: ['تيل فرامل امامي', 'تيل امامي'], category: 'الفرامل', subcategories: ['تيل امامي'] },
  { aliases: ['تيل فرامل خلفي', 'تيل خلفي'], category: 'الفرامل', subcategories: ['تيل خلفي'] },
  { aliases: ['طنابير فرامل', 'طنابير', 'طنبور'], category: 'الفرامل', subcategories: ['طنابير'] },
  { aliases: ['ماستر فرامل', 'ماستر'], category: 'الفرامل', subcategories: ['ماستر فرامل'] },
  { aliases: ['ماستر عجل'], category: 'الفرامل', subcategories: ['ماستر عجل'] },
  { aliases: ['تيل فرامل', 'تيل فرامل', 'تيل فرامل', 'فرامل', 'تيل', 'تيال فرامل', 'brake pads', 'brake pad', 'تيل برامل', 'برامل'], category: 'الفرامل', subcategories: ['تيل امامي', 'تيل خلفي', 'تيل فرامل'] },

  // Engine oils
  { aliases: ['زيت موتور', 'engine oil', 'motor oil', 'زيت الموتور', 'زيوت موتور'], category: 'زيوت موتور' },
  // Gear/transmission oils
  { aliases: ['زيت فتيس', 'زيت الفتيس', 'زيت دبرياج', 'زيت باور', 'gear oil', 'atf', 'زيوت فتيس'], category: 'زيوت فتيس و دبرياج و باور' },

  // Filters (specific first)
  { aliases: ['فلتر زيت', 'فلاتر زيت', 'فلتر الزيت', 'oil filter'], category: 'فلاتر', subcategories: ['فلتر زيت', 'فلتر الزيت'] },
  { aliases: ['فلتر هواء', 'فلاتر هواء', 'air filter'], category: 'فلاتر', subcategories: ['فلتر هواء'] },
  { aliases: ['فلتر تكييف', 'فلتر كابينة', 'cabin filter', 'فلاتر تكييف'], category: 'فلاتر', subcategories: ['فلتر تكييف', 'فلتر كابينة'] },
  { aliases: ['فلتر بنزين', 'فلاتر بنزين', 'fuel filter'], category: 'فلاتر', subcategories: ['فلتر بنزين'] },
  { aliases: ['فلاتر', 'فلتر', 'filters'], category: 'فلاتر' },

  // Suspension
  { aliases: ['مساعدين', 'مساعد', 'امورتيزور', 'امورتيزر', 'شاكن', 'shock absorber'], category: 'عفشة', subcategories: ['مساعدين و صدادات'] },
  { aliases: ['بلية عجل', 'بلية العجل', 'wheel bearing', 'جمل', 'بلية'], category: 'عفشة', subcategories: ['بلية عجل'] },
  { aliases: ['مقصات', 'مقص عفشة', 'مقص', 'control arm'], category: 'عفشة', subcategories: ['مقصات كاملة', 'جلب و بيض مقصات'] },
  { aliases: ['بارات', 'بار عفشة', 'sway bar', 'stabilizer link'], category: 'عفشة', subcategories: ['بارات'] },
  { aliases: ['كبالن', 'كوبلن', 'cv axle', 'cv joint'], category: 'عفشة', subcategories: ['كبالن و كاوتش كوبلن'] },
  { aliases: ['بطاحة', 'بطاحات', 'bushing'], category: 'عفشة', subcategories: ['بطاحات و بلي بطاحات'] },
  { aliases: ['تيش ميزان', 'مسمار ميزان', 'tie rod'], category: 'عفشة', subcategories: ['تيش ميزان و مسامير ميزان'] },
  { aliases: ['قاعدة موتور', 'شداد موتور', 'engine mount', 'motor mount'], category: 'عفشة', subcategories: ['قواعد و شدادات'] },
  { aliases: ['عفشة', 'تعليق', 'suspension'], category: 'عفشة' },

  // Spark plugs & ignition
  { aliases: ['بوجيهات', 'بواجي', 'شمعة', 'شمعات', 'spark plugs', 'spark plug', 'بوجيه'], category: 'بوجيهات و سلوك بوجيهات و موبينة', subcategories: ['بوجيهات'] },
  { aliases: ['موبينة', 'كويل', 'ignition coil', 'coil pack', 'كويلات'], category: 'بوجيهات و سلوك بوجيهات و موبينة', subcategories: ['موبينة'] },
  { aliases: ['سلوك بوجيهات', 'سلوك'], category: 'بوجيهات و سلوك بوجيهات و موبينة', subcategories: ['سلوك بوجيهات'] },

  // Belts & pulleys — more specific phrases FIRST
  { aliases: ['سير توقيت', 'سير التوقيت', 'timing belt', 'timing chain', 'حزام توقيت'], category: 'سيور و بلي', subcategories: ['سيور'] },
  { aliases: ['سير مجموعة', 'حزام مجموعة', 'serpentine belt', 'v-belt'], category: 'سيور و بلي', subcategories: ['سير مجموعة'] },
  { aliases: ['سير دينامو', 'حزام دينامو', 'alternator belt'], category: 'سيور و بلي', subcategories: ['سير دينامو'] },
  { aliases: ['كاتينة', 'كاتنة', 'كاتيني', 'كاتنه', 'كاتينه', 'كاتينيه', 'طقم كاتينة', 'طقم كاتينه', 'timing kit', 'timing chain kit', 'بلي كاتينة', 'بلية كاتينة', 'بلي كاتنة'], category: 'سيور و بلي', subcategories: ['سير كاتينة', 'طقم كاتينة كامل', 'بلي كاتينة'] },
  { aliases: ['بلي سيور', 'تنشين سير', 'idler pulley', 'tensioner pulley', 'تنشين', 'تنشن سير'], category: 'سيور و بلي', subcategories: ['بلي'] },
  { aliases: ['سيور', 'سير', 'حزام', 'belts', 'belt'], category: 'سيور و بلي' },

  // Cooling
  { aliases: ['ردياتير', 'رادياتير', 'radiator'], category: 'دورة تبريد و تكييف', subcategories: ['ردياتير'] },
  { aliases: ['طلمبة مياه', 'water pump'], category: 'دورة تبريد و تكييف', subcategories: ['طلمبات مياه'] },
  { aliases: ['ثرموستات', 'ترموستات', 'thermostat'], category: 'دورة تبريد و تكييف', subcategories: ['كوعة و ثرموستات'] },
  { aliases: ['كولانت', 'ماء جهاز', 'coolant', 'antifreeze', 'مياه جهاز'], category: 'دورة تبريد و تكييف', subcategories: ['كولانت', 'تيل تبريد', 'زيت تبريد'] },
  { aliases: ['سربنتينة تكييف', 'سربنتينة', 'ac compressor'], category: 'دورة تبريد و تكييف', subcategories: ['سربنتينة تكييف'] },
  { aliases: ['تبريد', 'دورة تبريد', 'cooling'], category: 'دورة تبريد و تكييف' },

  // Fuel system
  { aliases: ['طلمبة بنزين', 'طلمبة وقود', 'fuel pump'], category: 'دورة البنزين', subcategories: ['طلمبة بنزين'] },
  { aliases: ['عوامة بنزين', 'فلوتر', 'fuel sender'], category: 'دورة البنزين', subcategories: ['عوامة بنزين'] },
  { aliases: ['انجكتور', 'injector', 'انجيكتور'], category: 'دورة البنزين', subcategories: ['انجكتور'] },
  { aliases: ['دورة البنزين', 'fuel system'], category: 'دورة البنزين' },

  // Sensors & electrical
  { aliases: ['حساس شكمان', 'شكمان', 'oxygen sensor', 'o2 sensor', 'lambda'], category: 'حساسات و قطع كهربائية', subcategories: ['حساسات'] },
  { aliases: ['حساس دعسة', 'throttle sensor', 'tps'], category: 'حساسات و قطع كهربائية', subcategories: ['حساسات'] },
  { aliases: ['حساس حرارة', 'temperature sensor', 'coolant sensor'], category: 'حساسات و قطع كهربائية', subcategories: ['حساسات'] },
  { aliases: ['حساس كامة', 'camshaft sensor', 'cam sensor'], category: 'حساسات و قطع كهربائية', subcategories: ['حساسات'] },
  { aliases: ['حساس كرنك', 'crankshaft sensor', 'crank sensor'], category: 'حساسات و قطع كهربائية', subcategories: ['حساسات'] },
  { aliases: ['حساس abs', 'abs sensor', 'حساس سرعة', 'speed sensor'], category: 'حساسات و قطع كهربائية', subcategories: ['حساسات'] },
  { aliases: ['حساس', 'سنسور', 'sensor', 'check engine'], category: 'حساسات و قطع كهربائية', subcategories: ['حساسات'] },

  // Gaskets & seals
  { aliases: ['جوانات', 'جوان', 'اويل سيل', 'oil seal', 'gasket'], category: 'جوانات و أويل سيل' },

  // Engine overhaul
  { aliases: ['طقم بستم', 'بستم', 'عمرة موتور', 'piston kit', 'engine rebuild'], category: 'مستلزمات عمرة موتور' },

  // Engine parts
  { aliases: ['قطع موتور', 'engine parts'], category: 'قطع الموتور و ملحقاته' },

  // Clutch/Transmission
  { aliases: ['طقم دبرياج', 'دبرياج', 'كلتش', 'clutch kit', 'clutch'], category: 'دبرياج و قطع فتيس' },

  // Tires
  { aliases: ['اطارات', 'إطارات', 'كاوتش', 'كاوتشات', 'كوتش', 'tires', 'tyres', 'rubber tires'], category: 'إطارات' },

  // Wipers
  { aliases: ['مساحة زجاج', 'مساحات', 'مساحة', 'مساحه', 'wiper', 'wipers'], category: 'مساحات' },

  // Engine parts
  { aliases: ['تيمنج', 'تيمينج', 'طقم تيمنج', 'timing'], category: 'سيور و بلي', subcategories: ['سير كاتينة', 'طقم كاتينة كامل'] },
  { aliases: ['جلب مقصات', 'جلب', 'ball joint', 'ball joints'], category: 'عفشة', subcategories: ['جلب و بيض مقصات'] },
  { aliases: ['بوش مقصات', 'بوش', 'bushing kit'], category: 'عفشة', subcategories: ['بطاحات و بلي بطاحات'] },
  { aliases: ['دوره بنزين', 'مضخة وقود', 'pump fuel'], category: 'دورة البنزين', subcategories: ['طلمبة بنزين'] },
  { aliases: ['دلتا', 'اسبرنج', 'spring coil', 'زمبرك'], category: 'عفشة', subcategories: ['سبرينج و حاملات سبرينج'] },
  { aliases: ['تيل زيت', 'تيل الزيت', 'dipstick'], category: 'زيوت موتور' },
  { aliases: ['بلية امامي', 'بلية عجل امامي', 'front bearing'], category: 'عفشة', subcategories: ['بلية عجل'] },
  { aliases: ['بلية خلفي', 'بلية عجل خلفي', 'rear bearing'], category: 'عفشة', subcategories: ['بلية عجل'] },
  { aliases: ['اشرطه', 'اشرطة', 'حزام امان', 'seat belt'], category: 'قطع الهيكل و الكرسي' },
  { aliases: ['اضاءه', 'اضاءة', 'لمبة', 'ليمب', 'مصباح', 'light bulb', 'headlight'], category: 'حساسات و قطع كهربائية' },
];

// ── Normalise helper ─────────────────────────────────────────────────────────
// Rules (Egyptian Arabic typing habits):
//   أ/إ/آ → ا       (very common on mobile - alef with hamza typed as bare alef)
//   ة     → ه       (ta-marbuta at end of words often typed as ha)
//   ى     → ي       (alef-maqsura vs ya - often confused)
//   NOT: ت → ه      (ta ≠ ha — completely different letter, caused false matches)
function normalize(text: string): string {
  return text
    .toLowerCase()
    .replace(/[أإآ]/g, 'ا')          // alef variants → bare alef
    .replace(/ة/g, 'ه')              // ta-marbuta → ha (end-of-word confusion)
    .replace(/ى/g, 'ي')              // alef-maqsura → ya
    .replace(/\s+/g, ' ')
    .trim();
}

// ── Remove a matched alias from the remaining text ────────────────────────────
// Works on NORMALIZED remaining so ة/ه mismatches are handled correctly.
function removeAlias(remaining: string, alias: string): string {
  const normAlias = normalize(alias);
  const normRemaining = normalize(remaining);
  const idx = normRemaining.indexOf(normAlias);
  if (idx === -1) return remaining;
  // Map the normalized index back to the original string
  // (character positions are the same since we only replace single chars)
  return (remaining.slice(0, idx) + remaining.slice(idx + normAlias.length))
    .replace(/\s+/g, ' ')
    .trim();
}

// ── Main expander ─────────────────────────────────────────────────────────────
export function expandSearchQuery(rawQuery: string): SearchIntent {
  let remaining = rawQuery.trim();
  const intent: SearchIntent = {};

  // ── 1. Match car model aliases (includes make) ─────────────────────────────
  for (const entry of MODEL_ALIASES) {
    for (const alias of entry.aliases) {
      const normalAlias = normalize(alias);
      if (normalize(remaining).includes(normalAlias)) {
        if (!intent.make) intent.make = entry.make;
        if (!intent.model) intent.model = entry.model;
        remaining = removeAlias(remaining, alias);
        break;
      }
    }
    if (intent.make) break;
  }

  // ── 2. Match car make (if no make from model alias) ──────────────────────
  if (!intent.make) {
    for (const entry of MAKE_ALIASES) {
      for (const alias of entry.aliases) {
        if (normalize(remaining).includes(normalize(alias))) {
          intent.make = entry.make;
          remaining = removeAlias(remaining, alias);
          break;
        }
      }
      if (intent.make) break;
    }
  }

  // ── 3. Match part/category aliases ───────────────────────────────────────
  for (const entry of PART_ALIASES) {
    for (const alias of entry.aliases) {
      if (normalize(remaining).includes(normalize(alias))) {
        if (!intent.category) {
          intent.category = entry.category;
          if (entry.subcategories?.length) intent.subcategories = entry.subcategories;
        }
        remaining = removeAlias(remaining, alias);
        break;
      }
    }
    if (intent.category) break;
  }

  // ── 4. Remaining text → free-text product name search ────────────────────
  const leftover = remaining.replace(/\s+/g, ' ').trim();
  if (leftover) intent.textSearch = leftover;

  return intent;
}

// ── Suggestion label builders ─────────────────────────────────────────────────
export function buildSuggestionLabel(intent: SearchIntent): string {
  const parts: string[] = [];
  if (intent.category) parts.push(intent.category);
  if (intent.subcategories?.length) parts.push(intent.subcategories.join(' / '));
  if (intent.make) parts.push(intent.make);
  if (intent.model) parts.push(intent.model);
  return parts.join(' ← ');
}
