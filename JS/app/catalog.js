export const moods = [
  ["adventure", "مغامرة", "Adventure"],
  ["calm", "هدوء وتأمل", "Calm"],
  ["food", "طعام وثقافة", "Food & culture"],
  ["photo", "تصوير", "Photography"],
];
export const places = [
  {
    id: "petra",
    ar: "البتراء",
    en: "Petra",
    region: "maan",
    areaAr: "معان",
    areaEn: "Ma’an",
    image: "pet.jpg",
    lat: 30.3285,
    lng: 35.4444,
    moods: ["adventure", "photo"],
    minutes: 180,
    hidden: false,
    arDesc:
      "استكشف السيق والخزنة والواجهات النبطية. اختر مسارًا يناسب قدرتك البدنية، وتحقق من التذاكر وأوقات الزيارة لدى الجهة الرسمية.",
    enDesc:
      "Explore the Siq, Treasury and Nabataean facades. Choose a suitable walking route and check official tickets and visiting hours.",
  },
  {
    id: "rum",
    ar: "وادي رم",
    en: "Wadi Rum",
    region: "aqaba",
    areaAr: "العقبة",
    areaEn: "Aqaba",
    image: "wad.jpg",
    lat: 29.576,
    lng: 35.421,
    moods: ["adventure", "photo"],
    minutes: 180,
    hidden: false,
    arDesc:
      "مناظر صحراوية وجبال رملية. رتّب الأنشطة مع مزود محلي مرخّص وتحقق من الطقس ووسيلة النقل قبل الرحلة.",
    enDesc:
      "Desert landscapes and sandstone mountains. Arrange activities with a licensed local provider and check weather and transport.",
  },
  {
    id: "jerash",
    ar: "جرش",
    en: "Jerash",
    region: "jerash",
    areaAr: "جرش",
    areaEn: "Jerash",
    image: "jara.jpg",
    lat: 32.281,
    lng: 35.891,
    moods: ["food", "photo"],
    minutes: 120,
    hidden: false,
    arDesc:
      "آثار رومانية وأعمدة وساحات تاريخية. خصّص وقتًا للمشي وخذ ماءً وحماية من الشمس.",
    enDesc:
      "Roman ruins, colonnades and historic squares. Allow time to walk and bring water and sun protection.",
  },
  {
    id: "madaba",
    ar: "مادبا",
    en: "Madaba",
    region: "madaba",
    areaAr: "مادبا",
    areaEn: "Madaba",
    image: "mada.jpg",
    lat: 31.716,
    lng: 35.793,
    moods: ["food", "photo", "calm"],
    minutes: 90,
    hidden: false,
    arDesc:
      "مدينة الفسيفساء والحرف والتراث. استكشف وسط المدينة وتحقق من أوقات دخول المواقع التي ترغب بزيارتها.",
    enDesc:
      "A city of mosaics, crafts and heritage. Explore the centre and check opening hours for individual sites.",
  },
  {
    id: "ajloun",
    ar: "عجلون",
    en: "Ajloun",
    region: "ajloun",
    areaAr: "عجلون",
    areaEn: "Ajloun",
    image: "ajl.jpg",
    lat: 32.325,
    lng: 35.728,
    moods: ["calm", "adventure", "food"],
    minutes: 120,
    hidden: false,
    arDesc:
      "قلعة تاريخية وغابات ومرتفعات. بعض المسارات تحتاج حجزًا أو مرشدًا؛ تحقق من إدارة المحمية قبل الزيارة.",
    enDesc:
      "A historic castle, forests and hills. Some trails require a booking or guide; check with reserve management.",
  },
  {
    id: "umm-qais",
    ar: "أم قيس",
    en: "Umm Qais",
    region: "irbid",
    areaAr: "إربد",
    areaEn: "Irbid",
    image: "omq.jpg",
    lat: 32.655,
    lng: 35.684,
    moods: ["calm", "photo", "food"],
    minutes: 120,
    hidden: true,
    arDesc:
      "موقع جدارا الأثري وإطلالات واسعة. احترم المناطق الأثرية وسكان القرية المحيطة.",
    enDesc:
      "The archaeological site of Gadara and wide views. Respect the ruins and the neighbouring community.",
  },
  {
    id: "dead-sea",
    ar: "البحر الميت",
    en: "Dead Sea",
    region: "balqa",
    areaAr: "البلقاء",
    areaEn: "Balqa",
    image: "sea.jpg",
    lat: 31.725,
    lng: 35.587,
    moods: ["calm", "photo"],
    minutes: 120,
    hidden: false,
    arDesc:
      "خطّط لزيارة شاطئ يسمح بالدخول. تجنب إدخال الماء إلى العينين أو ابتلاعه واتبع تعليمات السلامة في الموقع.",
    enDesc:
      "Plan for a beach with permitted access. Avoid swallowing water or getting it in your eyes and follow local safety instructions.",
  },
  {
    id: "dana",
    ar: "ضانا",
    en: "Dana",
    region: "tafilah",
    areaAr: "الطفيلة",
    areaEn: "Tafilah",
    image: "map.svg",
    lat: 30.677,
    lng: 35.609,
    moods: ["calm", "adventure", "photo"],
    minutes: 180,
    hidden: true,
    arDesc:
      "قرية ومحمية طبيعية ومسارات متنوعة. استفسر عن تصريح المسار والحاجة إلى مرشد، ولا تدخل مسارًا مغلقًا.",
    enDesc:
      "A village, nature reserve and diverse trails. Check trail permits and guide requirements; do not enter closed routes.",
  },
  {
    id: "little-petra",
    ar: "البترا الصغيرة",
    en: "Little Petra",
    region: "maan",
    areaAr: "معان",
    areaEn: "Ma’an",
    image: "pewhite.jpg",
    lat: 30.375,
    lng: 35.451,
    moods: ["photo", "calm", "adventure"],
    minutes: 90,
    hidden: true,
    arDesc:
      "سيق البارد موقع نبطي شمال البتراء. قرية البيضا من العصر الحجري الحديث موقع قريب ومختلف عنه.",
    enDesc:
      "Siq al-Barid is a Nabataean site north of Petra. Nearby Neolithic Beidha is a separate archaeological site.",
  },
  {
    id: "karak",
    ar: "الكرك",
    en: "Karak",
    region: "karak",
    areaAr: "الكرك",
    areaEn: "Karak",
    image: "map.svg",
    lat: 31.181,
    lng: 35.701,
    moods: ["food", "photo"],
    minutes: 120,
    hidden: true,
    arDesc:
      "قلعة ومدينة ذات تراث محلي. استكشف الأحياء والمأكولات مع احترام السكان وأوقات عمل المواقع.",
    enDesc:
      "A castle town with local heritage. Explore neighbourhoods and food while respecting residents and opening hours.",
  },
  {
    id: "aqaba",
    ar: "العقبة",
    en: "Aqaba",
    region: "aqaba",
    areaAr: "العقبة",
    areaEn: "Aqaba",
    image: "map.svg",
    lat: 29.531,
    lng: 35.006,
    moods: ["adventure", "calm", "food"],
    minutes: 120,
    hidden: false,
    arDesc:
      "مدينة ساحلية على البحر الأحمر. اختر مزودًا مرخّصًا للأنشطة البحرية واتبع إرشادات السلامة.",
    enDesc:
      "A Red Sea coastal city. Choose licensed marine activity providers and follow safety guidance.",
  },
];
places.push(
  ...[
    {
      id: "umm-jimal",
      ar: "أم الجمال",
      en: "Umm al Jimal",
      region: "mafraq",
      areaAr: "المفرق",
      areaEn: "Mafraq",
      image: "map.svg",
      lat: 32.328,
      lng: 36.369,
      moods: ["photo", "calm"],
      minutes: 90,
      hidden: true,
      arDesc:
        "مدينة أثرية بمبانٍ بازلتية. استكشف المسارات المحددة واحترم الآثار.",
      enDesc:
        "An archaeological settlement with basalt buildings. Follow designated paths and respect the ruins.",
    },
    {
      id: "pella",
      ar: "طبقة فحل",
      en: "Pella",
      region: "irbid",
      areaAr: "إربد",
      areaEn: "Irbid",
      image: "map.svg",
      lat: 32.45,
      lng: 35.614,
      moods: ["photo", "calm"],
      minutes: 90,
      hidden: true,
      arDesc:
        "موقع أثري في شمال وادي الأردن. خطط للمشي وراجع إمكانية الدخول قبل الزيارة.",
      enDesc:
        "An archaeological site in the northern Jordan Valley. Plan for walking and check access before visiting.",
    },
    {
      id: "salt",
      ar: "السلط القديمة",
      en: "Historic As-Salt",
      region: "balqa",
      areaAr: "البلقاء",
      areaEn: "Balqa",
      image: "map.svg",
      lat: 32.039,
      lng: 35.727,
      moods: ["food", "photo"],
      minutes: 90,
      hidden: true,
      arDesc:
        "أحياء تراثية وبيوت حجرية وأسواق. احترم خصوصية السكان عند التصوير.",
      enDesc:
        "Historic neighbourhoods, stone houses and markets. Respect residents’ privacy when taking photos.",
    },
    {
      id: "dibeen",
      ar: "غابات دبين",
      en: "Dibeen Forest",
      region: "jerash",
      areaAr: "جرش",
      areaEn: "Jerash",
      image: "map.svg",
      lat: 32.249,
      lng: 35.824,
      moods: ["calm", "adventure"],
      minutes: 90,
      hidden: true,
      arDesc:
        "غابات ومحمية طبيعية. راجع إدارة المحمية للمسارات المتاحة ولا تشعل النار.",
      enDesc:
        "Forest and nature reserve. Ask reserve management about open trails and do not light fires.",
    },
    {
      id: "azraq",
      ar: "محمية الأزرق المائية",
      en: "Azraq Wetland Reserve",
      region: "zarqa",
      areaAr: "الزرقاء",
      areaEn: "Zarqa",
      image: "map.svg",
      lat: 31.833,
      lng: 36.827,
      moods: ["photo", "calm"],
      minutes: 90,
      hidden: true,
      arDesc:
        "موائل مائية لمراقبة الطبيعة والطيور. تحقق من مواعيد الزيارة والمسارات المسموحة.",
      enDesc:
        "Wetland habitats for nature and bird observation. Check visiting hours and permitted trails.",
    },
    {
      id: "shaumari",
      ar: "محمية الشومري",
      en: "Shaumari Wildlife Reserve",
      region: "zarqa",
      areaAr: "الزرقاء",
      areaEn: "Zarqa",
      image: "map.svg",
      lat: 31.751,
      lng: 36.783,
      moods: ["photo", "adventure"],
      minutes: 90,
      hidden: true,
      arDesc:
        "محمية للحياة البرية. رتّب الزيارة مع الإدارة ولا تقترب من الحيوانات أو تطعمها.",
      enDesc:
        "A wildlife reserve. Arrange access with management; do not approach or feed animals.",
    },
    {
      id: "yarmouk",
      ar: "محمية اليرموك",
      en: "Yarmouk Forest Reserve",
      region: "irbid",
      areaAr: "إربد",
      areaEn: "Irbid",
      image: "map.svg",
      lat: 32.671,
      lng: 35.754,
      moods: ["calm", "adventure"],
      minutes: 90,
      hidden: true,
      arDesc:
        "طبيعة شمالية وتنوع حيوي. استفسر من إدارة المحمية عن المرشد والمسار المناسب.",
      enDesc:
        "Northern landscapes and biodiversity. Ask reserve management about guides and suitable trails.",
    },
  ],
);
export const ADMIN_EMAIL = "hamzaalfarraj16@gmail.com";
export const categories = [
  ["meal", "وجبة بيتية", "Home meal"],
  ["workshop", "ورشة حرفية", "Craft workshop"],
  ["tour", "جولة محلية", "Local tour"],
];
export const placeById = (id) => places.find((p) => p.id === id);
export function filterPlaces({
  q = "",
  mood = "",
  hidden = false,
  region = "",
} = {}) {
  return places.filter(
    (p) =>
      (!region || p.region === region) &&
      (!mood || p.moods.includes(mood)) &&
      (!hidden || p.hidden) &&
      (!q ||
        (p.ar + p.en + p.areaAr + p.areaEn)
          .toLowerCase()
          .includes(q.toLowerCase())),
  );
}
export function estimateLeg(a, b) {
  if (!a || !b || !Number.isFinite(a.lat) || !Number.isFinite(b.lat))
    return null;
  const r = Math.PI / 180,
    h =
      Math.sin(((b.lat - a.lat) * r) / 2) ** 2 +
      Math.cos(a.lat * r) *
        Math.cos(b.lat * r) *
        Math.sin(((b.lng - a.lng) * r) / 2) ** 2;
  const km = Math.round(6371 * 2 * Math.asin(Math.sqrt(h)) * 1.35);
  return { km, minutes: Math.ceil((km / 55) * 60), estimated: true };
}
export function conflicts(stops) {
  let issues = [];
  for (let i = 1; i < stops.length; i++) {
    const a = stops[i - 1],
      b = stops[i],
      leg = estimateLeg(placeById(a.placeId), placeById(b.placeId));
    const toMin = (t) => +t.slice(0, 2) * 60 + +t.slice(3);
    if (toMin(a.time) + a.duration + (leg?.minutes || 0) > toMin(b.time))
      issues.push({ index: i, overlap: true, leg });
  }
  return issues;
}
export const money = (cents) => (cents / 100).toFixed(2);
