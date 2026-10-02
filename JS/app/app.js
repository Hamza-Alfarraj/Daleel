import { experienceIdeas, goalIdeas, editorialStories } from "./content.js";
import { auth, db } from "../firebase-config.js";
import {
  onAuthStateChanged,
  createUserWithEmailAndPassword,
  signInWithEmailAndPassword,
  signOut,
  updateProfile,
  sendPasswordResetEmail,
  sendEmailVerification,
  browserLocalPersistence,
  setPersistence,
} from "https://www.gstatic.com/firebasejs/12.19.0/firebase-auth.js";
import * as D from "./data.js";
import {
  places,
  moods,
  categories,
  placeById,
  filterPlaces,
  conflicts,
  estimateLeg,
  money,
  ADMIN_EMAIL,
} from "./catalog.js";
const routes = {
  home: "home.html",
  explore: "destination.html",
  place: "place.html",
  experiences: "Local-experiences.html",
  experience: "experience.html",
  host: "profile-host.html",
  trips: "itinerary.html",
  builder: "trip-builder.html",
  booking: "booking.html",
  impact: "impact.html",
  goals: "goals.html",
  profile: "profile.html",
  login: "login.html",
  register: "register.html",
  mood: "mood-selection.html",
  onboarding: "onboarding.html",
  hostDashboard: "host-dashboard.html",
  admin: "admin.html",
  policy: "policy.html",
};
const file = location.pathname.split("/").pop();
let view =
  Object.keys(routes).find((k) => routes[k] === file) ||
  (file === "destination-details.html"
    ? "experiences"
    : file === "trip-planner.html"
      ? "builder"
      : "landing");
const params = new URLSearchParams(location.search);
let user = null,
  profile = null,
  busyRegister = false;
let lang = localStorage.getItem("daleel_language") === "en" ? "en" : "ar";
const $ = (s) => document.querySelector(s),
  all = (s) => [...document.querySelectorAll(s)];
const t = (ar, en) => (lang === "ar" ? ar : en);
const e = (s) =>
  String(s ?? "").replace(
    /[&<>"']/g,
    (c) =>
      ({ "&": "&amp;", "<": "&lt;", ">": "&gt;", '"': "&quot;", "'": "&#39;" })[
        c
      ],
  );
const label = (p) => (lang === "ar" ? p.ar : p.en);
const title = (x) => (lang === "ar" ? x.titleAr : x.titleEn);
const href = (v, p = {}) =>
  "/Pages/" +
  routes[v] +
  (Object.keys(p).length ? "?" + new URLSearchParams(p) : "");
const go = (v, p = {}) => location.assign(href(v, p));
const statusLabel = (s) =>
  ({
    pending: t("بانتظار المراجعة", "Awaiting review"),
    approved: t("معتمد", "Approved"),
    rejected: t("مرفوض / غير منشور", "Rejected / unpublished"),
    confirmed: t("مؤكد", "Confirmed"),
    cancelled: t("ملغى", "Cancelled"),
    planned: t("مخططة", "Planned"),
    current: t("جارية", "Current"),
    completed: t("مكتملة", "Completed"),
  })[s] || s;
const price = (n) => `${money(n)} ${t("د.أ", "JOD")}`;
const formatDate = (d) =>
  new Intl.DateTimeFormat(lang === "ar" ? "ar-JO" : "en-GB", {
    dateStyle: "medium",
    timeStyle: "short",
    timeZone: "Asia/Amman",
  }).format(d?.toDate ? d.toDate() : new Date(d));
const isAdmin = () => user?.email === ADMIN_EMAIL && user.emailVerified;
const toast = (text) => {
  const el = $("#toast");
  el.textContent = text;
  el.hidden = false;
  clearTimeout(toast.timer);
  toast.timer = setTimeout(() => (el.hidden = true), 6000);
};
function explain(err) {
  const known = {
    "invalid-photo": t(
      "اختر صورة JPG أو PNG أو WebP لا تتجاوز 5 ميجابايت.",
      "Choose a JPG, PNG or WebP image no larger than 5 MB.",
    ),
    "slot-exists": t(
      "الموعد منشور مسبقًا؛ لا يمكن إعادة تعيين حجوزاته.",
      "This slot already exists; its reservations cannot be reset.",
    ),
    "past-date": t("اختر موعدًا في المستقبل.", "Choose a future slot."),
    "auth/invalid-credential": t(
      "البريد أو كلمة المرور غير صحيحة.",
      "Incorrect email or password.",
    ),
    "auth/email-already-in-use": t(
      "البريد مسجّل؛ سجّل الدخول.",
      "Email already registered; sign in.",
    ),
    "auth/weak-password": t(
      "استخدم كلمة مرور أقوى.",
      "Choose a stronger password.",
    ),
    "permission-denied": t(
      "صلاحيات قاعدة البيانات تمنع العملية. تأكد من نشر قواعد النسخة الجديدة وصلاحية حسابك.",
      "Database permission denied. Deploy the current rules and check your account permissions.",
    ),
    "slot-full": t(
      "الموعد امتلأ. اختر موعدًا آخر.",
      "This slot is full. Choose another.",
    ),
    "already-booked": t(
      "عندك حجز مسجّل لهذا الموعد؛ افتح رحلاتي.",
      "You already have a booking for this slot. Open My trips.",
    ),
    "cancel-deadline": t(
      "انتهت مهلة الإلغاء الذاتي (48 ساعة قبل الموعد). تواصل مع المضيف.",
      "Self-cancellation closes 48 hours before the slot. Contact your host.",
    ),
    "slot-closed": t(
      "الموعد مغلق أو انتهى.",
      "This slot is closed or in the past.",
    ),
  };
  return (
    known[err.code || err.message] ||
    t(
      "تعذّرت العملية. تحقق من الإنترنت وحاول مجددًا.",
      "The action failed. Check your connection and retry.",
    )
  );
}
function act(name, fn) {
  all(`[data-action="${name}"]`).forEach((el) => {
    if (el.dataset.boundAction === name) return;
    el.dataset.boundAction = name;
    el.addEventListener("click", async (ev) => {
      ev.preventDefault();
      el.disabled = true;
      try {
        await fn(el, ev);
      } catch (err) {
        console.error(err);
        toast(explain(err));
      } finally {
        el.disabled = false;
      }
    });
  });
}
function form(id, fn) {
  $("#" + id)?.addEventListener("submit", async (event) => {
    event.preventDefault();
    const f = event.currentTarget;
    if (!f.reportValidity()) return;
    const button = f.querySelector("[type=submit]");
    button.disabled = true;
    try {
      await fn(new FormData(f), f);
    } catch (err) {
      console.error(err);
      const status = f.querySelector("[role=status]");
      if (status) {
        status.textContent = explain(err);
        status.className = "error inline-status";
      } else toast(explain(err));
    } finally {
      button.disabled = false;
    }
  });
}
const button = (text, action, extra = "", cls = "") =>
  `<button type="button" class="${cls}" data-action="${action}" ${extra}>${text}</button>`;
const anchor = (text, v, p = {}, cls = "") =>
  `<a class="button ${cls}" href="${href(v, p)}">${text}</a>`;
const note = (text) => `<p class="note">${text}</p>`;
const empty = (text) => `<div class="empty">${text}</div>`;
const field = (labelText, name, type = "text", value = "", extra = "") =>
  `<label class="field">${labelText}<input name="${name}" type="${type}" value="${e(value)}" ${extra}></label>`;
const select = (labelText, name, options, value = "") =>
  `<label class="field">${labelText}<select name="${name}">${options.map(([id, name]) => `<option value="${e(id)}" ${id === value ? "selected" : ""}>${e(name)}</option>`).join("")}</select></label>`;
const areaOptions = () => [
  ...new Map(
    places.map((p) => [
      p.region,
      [p.region, lang === "ar" ? p.areaAr : p.areaEn],
    ]),
  ).values(),
];
const moodOptions = () => [
  ["", t("كل المودات", "All moods")],
  ...moods.map((m) => [m[0], t(m[1], m[2])]),
];
const navIcon = (v) => {
  const paths = {
    home: "M3 10 12 3l9 7v11h-6v-7H9v7H3Z",
    mood: "M12 21s-9-5-9-12a5 5 0 0 1 9-3 5 5 0 0 1 9 3c0 7-9 12-9 12Z",
    explore: "m12 3 9 9-9 9-9-9Z M15 9l-2 4-4 2 2-4Z",
    trips: "M4 7h16v14H4Z M8 7V3h8v4 M8 11v6 M16 11v6",
  };
  return `<svg width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="1.8" stroke-linejoin="round" aria-hidden="true"><path d="${paths[v]}"/></svg>`;
};
function shell() {
  document.documentElement.lang = lang;
  document.documentElement.dir = lang === "ar" ? "rtl" : "ltr";
  const nav = [
    ["home", t("الرئيسية", "Home")],
    ["mood", t("مودي", "My mood")],
    ["explore", t("استكشف", "Explore")],
    ["trips", t("رحلاتي", "My trips")],
  ];
  $("#header").innerHTML =
    `<div class="header-inner"><a class="logo" href="/index.html">${t("دليل", "Daleel")}<span>.</span></a><nav class="top-nav" aria-label="${t("التنقل الرئيسي", "Main navigation")}">${nav.map(([v, text]) => `<a href="${href(v)}" class="${view === v ? "active" : ""}">${text}</a>`).join("")}<a href="${href("experiences")}">${t("التجارب", "Experiences")}</a><a href="${href("goals")}">${t("أهداف المناطق", "Community goals")}</a></nav><div class="account-nav">${user ? `<a href="${href("profile")}">${t("حسابي", "Account")}</a><a href="${href("hostDashboard")}">${t("المضيف", "Host")}</a>${isAdmin() ? `<a href="${href("admin")}">${t("الإدارة", "Admin")}</a>` : ""}${button(t("خروج", "Sign out"), "logout")}` : `<a href="${href("login")}">${t("دخول", "Sign in")}</a>`}${button(lang === "ar" ? "English" : "العربية", "language")}</div></div>`;
  $("#bottomNav").innerHTML = nav
    .map(
      ([v, text]) =>
        `<a href="${href(v)}" class="${view === v ? "active" : ""}">${navIcon(v)}<span>${text}</span></a>`,
    )
    .join("");
  $("#footer").innerHTML =
    `${anchor(t("التجارب المحلية", "Local experiences"), "experiences")} ${anchor(t("أهداف المناطق", "Community goals"), "goals")} ${anchor(t("الخصوصية والإلغاء", "Privacy & cancellation"), "policy")}<p>${t("الأوقات والمسافات تقديرية. راجع الجهات الرسمية للرسوم وظروف الزيارة. الدفع عند الوصول؛ لا تُجمع بيانات بطاقات.", "Times and distances are estimates. Check official authorities for fees and visiting conditions. Pay on arrival; no card details are collected.")}</p>`;
  act("logout", async () => {
    await signOut(auth);
    go("login");
  });
  act("language", () => {
    if (
      tripDirty &&
      !window.confirm(
        t(
          "عندك تعديلات غير محفوظة. متابعة تغيير اللغة؟",
          "Unsaved changes. Continue changing language?",
        ),
      )
    )
      return;
    localStorage.setItem("daleel_language", lang === "ar" ? "en" : "ar");
    location.reload();
  });
}
function requireLogin() {
  if (user) return true;
  go("login", {
    next: view,
    ...(params.get("id") ? { id: params.get("id") } : {}),
  });
  return false;
}
function placeCard(p) {
  return `<article class="card"><a href="${href("place", { id: p.id })}"><img loading="lazy" src="/assets/images/${p.image}" alt="${e(label(p))}"></a><div class="card-body"><span class="tag">${lang === "ar" ? p.areaAr : p.areaEn}${p.hidden ? " · " + t("بعيد عن المسار المعتاد", "Off the usual trail") : ""}</span><h3>${e(label(p))}</h3><p>${e((lang === "ar" ? p.arDesc : p.enDesc).slice(0, 150))}</p><div class="actions">${anchor(t("التفاصيل", "Details"), "place", { id: p.id })}${button(t("أضف لرحلتي", "Add to trip"), "addPlace", `data-id="${p.id}"`, "primary")}</div></div></article>`;
}
function experienceCard(x) {
  return `<article class="card"><img loading="lazy" src="${e(x.photoData || "/assets/images/" + (placeById(x.placeId)?.image || "break.jpg"))}" alt="${e(title(x))}"><div class="card-body"><span class="tag">${t("مضيف تمت مراجعة هويته", "Identity-reviewed host")}</span><h3>${e(title(x))}</h3><p>${e((lang === "ar" ? x.descriptionAr : x.descriptionEn).slice(0, 160))}</p><p>${price(x.priceCents)} · ${x.duration} ${t("دقيقة", "min")}</p>${anchor(t("التفاصيل والمواعيد", "Details & availability"), "experience", { id: x.id }, "primary")}</div></article>`;
}
async function getTrips() {
  return user ? D.list("trips", [["uid", user.uid]]) : [];
}
async function addPlace(id) {
  if (!requireLogin()) return;
  const trips = await getTrips();
  const chosen = trips.find((x) => x.status === "planned") || null;
  if (!chosen) {
    const result = await D.create("trips", {
      uid: user.uid,
      name: t("رحلتي الجديدة", "My new trip"),
      startDate: new Date(Date.now() + 86400000).toISOString().slice(0, 10),
      days: 3,
      status: "planned",
      stops: [
        {
          id: crypto.randomUUID(),
          placeId: id,
          day: 0,
          time: "09:00",
          duration: placeById(id).minutes,
        },
      ],
      createdAt: D.serverTimestamp(),
      updatedAt: D.serverTimestamp(),
    });
    toast(
      t(
        "أُنشئت رحلة وأُضيف المكان. افتح رحلاتي.",
        "Trip created and place added. Open My trips.",
      ),
    );
    go("trips", { status: "planned", highlight: result.id });
  } else {
    if (!chosen.stops.some((s) => s.placeId === id)) {
      await D.save("trips", chosen.id, {
        stops: [
          ...chosen.stops,
          {
            id: crypto.randomUUID(),
            placeId: id,
            day: 0,
            time: "09:00",
            duration: placeById(id).minutes,
          },
        ],
        updatedAt: D.serverTimestamp(),
      });
    }
    go("trips", { status: "planned", highlight: chosen.id });
  }
}
function bindPlaces() {
  act("addPlace", (el) => addPlace(el.dataset.id));
}
async function landing() {
  return `<section class="hero"><div><h1>${t("اكتشف الأردن على مزاجك", "Discover Jordan your way")}</h1><p>${t("أماكن مختلفة، تجارب من أهل المكان، ورحلات بتخططها بنفسك.", "Different places, experiences from local people, and trips you plan yourself.")}</p><div class="actions">${anchor(t("ابدأ رحلتك", "Start your journey"), user ? "home" : "register", {}, "primary")}${anchor(t("استكشف الأماكن", "Explore places"), "explore", {}, "dark")}</div></div></section><section class="section"><h2>${t("أماكن أبعد عن الزحمة", "Beyond the usual route")}</h2><div class="grid">${places
    .filter((p) => p.hidden)
    .slice(0, 3)
    .map(placeCard)
    .join("")}</div></section>`;
}
async function home() {
  const approved = await D.list("experiences", [["status", "approved"]]);
  const mood = profile?.travelMood || "";
  const selected = moods.find((m) => m[0] === mood);
  const rec = filterPlaces({ mood }).slice(0, 4);
  return `<div class="page-title"><div><p>${t("أهلًا", "Welcome")} ${e(profile?.fullName || "")}</p><h1>${t("وين بدّك تروح اليوم؟", "Where would you like to go?")}</h1><p>${selected ? t(selected[1], selected[2]) : t("اختار مودك لنقترح أماكن تناسبك.", "Choose a mood for tailored suggestions.")}</p></div>${anchor(t("غيّر المود", "Change mood"), "mood")}</div><div class="grid">${rec.map(placeCard).join("")}</div><section class="section"><h2>${t("أماكن أقل شهرة", "Less-travelled places")}</h2><div class="grid">${filterPlaces({ mood, hidden: true }).slice(0, 3).map(placeCard).join("")}</div></section><section class="section"><div class="page-title"><h2>${t("تجارب محلية", "Local experiences")}</h2>${anchor(t("شوف التجارب والمواعيد", "See experiences & dates"), "experiences")}</div><p>${t("احجز موعدًا ينشره مضيف تمت مراجعة هويته، وادفع عند الوصول.", "Book a slot published by an identity-reviewed host and pay on arrival.")}</p><div class="grid">${
    approved
      .filter(
        (x) =>
          !mood ||
          placeById(x.placeId)?.moods.includes(mood) ||
          (mood === "food" && x.category === "meal"),
      )
      .slice(0, 3)
      .map(experienceCard)
      .join("") ||
    empty(
      t(
        "لا توجد تجارب معتمدة تناسب هذا المود بعد.",
        "No approved experiences for this mood yet.",
      ),
    )
  }</div></section>`;
}
async function explore() {
  return `<h1>${t("اكتشف الأردن", "Explore Jordan")}</h1><form id="filters" class="filters"><label>${t("ابحث عن مكان", "Find a place")}<input name="q" type="search" value="${e(params.get("q") || "")}"></label>${select(t("المود", "Mood"), "mood", moodOptions(), params.get("mood") || "")}<label class="check"><input name="hidden" type="checkbox" ${params.get("hidden") ? "checked" : ""}>${t("أماكن أقل شهرة فقط", "Less-travelled only")}</label><button class="primary" type="submit">${t("ابحث", "Search")}</button></form><div id="placesGrid" class="grid">${
    filterPlaces({
      q: params.get("q") || "",
      mood: params.get("mood") || "",
      hidden: !!params.get("hidden"),
      region: params.get("region") || "",
    })
      .map(placeCard)
      .join("") ||
    empty(t("لا توجد نتائج. غيّر البحث.", "No matches. Adjust your search."))
  }</div>`;
}
function mapEmbed(p) {
  const bbox = [
    p.lng - 0.025,
    p.lat - 0.018,
    p.lng + 0.025,
    p.lat + 0.018,
  ].join(",");
  return `<iframe class="map-frame" loading="lazy" referrerpolicy="no-referrer" title="${e(t("خريطة المكان", "Place map"))}" src="https://www.openstreetmap.org/export/embed.html?${e(new URLSearchParams({ bbox, layer: "mapnik", marker: p.lat + "," + p.lng }))}"></iframe>`;
}
function mapLink(p) {
  return `https://www.google.com/maps/search/?api=1&query=${p.lat},${p.lng}`;
}
async function place() {
  const p = placeById(params.get("id"));
  if (!p) return empty(t("المكان غير موجود.", "Place not found."));
  const experiences = await D.list("experiences", [["status", "approved"]]);
  return `<div class="page-title"><h1>${e(label(p))}</h1>${anchor(t("كل الأماكن", "All places"), "explore")}</div><img class="detail-image" src="/assets/images/${p.image}" alt="${e(label(p))}"><div class="split"><section class="panel"><h2>${t("عن المكان", "About the place")}</h2><p>${e(lang === "ar" ? p.arDesc : p.enDesc)}</p><p class="muted">${t("الصور للتعريف بالمكان؛ بعض الصور توضيحية.", "Images introduce the location; some are illustrations.")}</p><p>${t("مدة زيارة مقترحة", "Suggested visit duration")}: ${p.minutes} ${t("دقيقة؛ عدّلها حسب مسارك", "minutes; adjust for your route")}</p>${note(t("رسوم الدخول وأوقات العمل تتغيّر؛ راجع الموقع الرسمي أو إدارة المكان قبل الزيارة. الإحداثيات نقطة إرشادية وليست مدخلًا مضمونًا.", "Admission fees and hours may change. Check the official authority before visiting. Coordinates are a guide point, not a guaranteed entrance."))}<div class="actions">${button(t("أضف لرحلتي", "Add to trip"), "addPlace", `data-id="${p.id}"`, "primary")}<a class="button" target="_blank" rel="noopener" href="${mapLink(p)}">${t("افتح بالخريطة", "Open map")}</a><a class="button" href="https://international.visitjordan.com" target="_blank" rel="noopener">${t("دليل السياحة الرسمي", "Official tourism guide")}</a></div></section><aside class="panel">${mapEmbed(p)}<h2>${t("قبل ما تطلع", "Before you go")}</h2><p>${t("تأكد من الطقس والمواصلات وإمكانية الوصول، احمل ماءً، واتبع إرشادات الموقع. لا تدخل مسارًا غير مناسب لقدرتك.", "Check weather, transport and accessibility. Bring water and follow site guidance. Avoid trails beyond your ability.")}</p></aside></div><section class="section"><h2>${t("تجارب قرب المكان", "Experiences near this place")}</h2><div class="grid">${
    experiences
      .filter((x) => x.placeId === p.id)
      .map(experienceCard)
      .join("") ||
    empty(
      t(
        "لا توجد تجارب منشورة قرب هذا المكان بعد.",
        "No published experiences here yet.",
      ),
    )
  }</div></section>`;
}
async function mood(onboard = false) {
  return `<section class="panel form-card"><h1>${onboard ? t("خلّينا نتعرّف عليك", "Let’s get to know you") : t("شو مود رحلتك؟", "What’s your travel mood?")}</h1><p>${t("بتقدر تغيّره بأي وقت.", "You can change this at any time.")}</p><form id="moodForm">${select(
    t("المود", "Mood"),
    "mood",
    moods.map((m) => [m[0], t(m[1], m[2])]),
    profile?.travelMood || "adventure",
  )}${onboard ? `${field(t("المدينة (اختياري)", "City (optional)"), "city", "text", profile?.city || "", 'maxlength="80"')}<p>${t("اختار مودك، استكشف، ابني الرحلة، وبعدها احجز من المواعيد المتاحة.", "Choose a mood, explore, build your trip, then book available slots.")}</p>` : ""}<button class="primary" type="submit">${t("احفظ وكمّل", "Save & continue")}</button><p class="inline-status" role="status"></p></form></section>`;
}
function ideaCards(items) {
  return items
    .map(
      (x) =>
        `<article class="panel"><span class="tag">${t("فكرة تجربة — غير متاحة للحجز", "Experience idea — not bookable")}</span><h3>${e(title(x))}</h3><p>${e(lang === "ar" ? x.descriptionAr : x.descriptionEn)}</p><div class="actions">${anchor(t("اكتشف المكان", "Explore the place"), "place", { id: x.placeId })}${button(t("أضف المكان لرحلتي", "Add place to my trip"), "addPlace", `data-id="${x.placeId}"`)}${anchor(t("قدّم تجربة مشابهة كمضيف", "Submit a similar experience as a host"), "hostDashboard")}</div></article>`,
    )
    .join("");
}
function storyCards(items) {
  return items
    .map(
      (x) =>
        `<article class="panel"><span class="tag">${t("قصة توضيحية متخيلة — ليست تقييم مستخدم", "Fictional editorial story — not a user review")}</span><h3>${e(title(x))}</h3><p class="muted">${e(lang === "ar" ? x.authorAr : x.authorEn)}</p><p>${e(lang === "ar" ? x.bodyAr : x.bodyEn)}</p>${anchor(t("استكشف مكان القصة", "Explore this location"), "place", { id: x.placeId })}</article>`,
    )
    .join("");
}
async function experiences() {
  const list = await D.list("experiences", [["status", "approved"]]);
  const category = params.get("category") || "",
    place = params.get("place") || "",
    q = params.get("q") || "";
  const filtered = list.filter(
    (x) =>
      (!params.get("region") || x.regionId === params.get("region")) &&
      (!category || x.category === category) &&
      (!place || x.placeId === place) &&
      (!q ||
        (x.titleAr + x.titleEn + x.descriptionAr + x.descriptionEn)
          .toLowerCase()
          .includes(q.toLowerCase())),
  );
  return `<div class="page-title"><div><h1>${t("تجارب من أهل المكان", "Experiences from local people")}</h1><p>${t("المواعيد والسعر يحددها المضيف. راجع التفاصيل وسياسة الإلغاء قبل الحجز.", "Hosts set prices and dates. Read the details and cancellation policy before booking.")}</p></div>${anchor(t("قدّم كمضيف", "Become a host"), "hostDashboard")}</div><form id="experienceFilters" class="filters">${field(t("بحث", "Search"), "q", "search", q)}${select(t("النوع", "Category"), "category", [["", t("الكل", "All")], ...categories.map((c) => [c[0], t(c[1], c[2])])], category)}${select(t("المكان", "Place"), "place", [["", t("كل الأماكن", "All places")], ...places.map((p) => [p.id, label(p)])], place)}<button class="primary" type="submit">${t("ابحث", "Search")}</button></form><div class="grid">${filtered.map(experienceCard).join("") || empty(t("لا توجد تجارب معتمدة تطابق بحثك حاليًا. المضيفون يستطيعون تقديم تجارب للمراجعة؛ لا نعرض مخزونًا وهميًا.", "No approved experiences match yet. Hosts can submit experiences for review; no fictional availability is shown."))}</div><section class="section"><h2>${t("أفكار لتجاربك القادمة", "Ideas for your next experience")}</h2><p>${t("اقتراحات تحريرية للتخطيط والإلهام. الحجز يكون فقط من التجارب المعتمدة ذات المواعيد الحقيقية أعلاه.", "Editorial suggestions for planning and inspiration. Only approved experiences with actual slots above can be booked.")}</p><div class="grid">${ideaCards(experienceIdeas.filter((x) => (!category || x.category === category) && (!place || x.placeId === place) && (!params.get("region") || placeById(x.placeId)?.region === params.get("region")) && (!q || (x.titleAr + x.titleEn + x.descriptionAr + x.descriptionEn).toLowerCase().includes(q.toLowerCase()))))}</div></section><section class="section"><h2>${t("قصص تلهم الرحلة", "Stories that inspire a journey")}</h2><div class="grid">${storyCards(editorialStories.filter((x) => !place || x.placeId === place))}</div></section>`;
}
async function experience() {
  const x = await D.read("experiences", params.get("id"));
  if (!x || x.status !== "approved")
    return empty(t("التجربة غير متاحة.", "Experience unavailable."));
  const [slots, host, reviews] = await Promise.all([
    D.list("slots", [["experienceId", x.id]]),
    D.read("hosts", x.hostUid),
    D.list("reviews", [["experienceId", x.id]]),
  ]);
  const available = slots
    .filter(
      (s) =>
        s.open && s.startAt.toMillis() > Date.now() && s.booked < s.capacity,
    )
    .sort((a, b) => a.startAt.toMillis() - b.startAt.toMillis());
  const average = reviews.length
    ? (reviews.reduce((n, r) => n + r.rating, 0) / reviews.length).toFixed(1)
    : null;
  return `<h1>${e(title(x))}</h1><img class="detail-image" src="${e(x.photoData || "/assets/images/" + placeById(x.placeId).image)}" alt="${e(title(x))}"><div class="split"><section class="panel"><h2>${t("عن التجربة", "About the experience")}</h2><p>${e(lang === "ar" ? x.descriptionAr : x.descriptionEn)}</p><p>${price(x.priceCents)} ${t("للشخص", "per person")} · ${x.duration} ${t("دقيقة", "minutes")}</p><p>${t("المضيف", "Host")}: ${e(host?.fullName || "")} ${anchor(t("بروفايل المضيف", "Host profile"), "host", { id: x.hostUid })}</p><p>${t("التقييم", "Rating")}: ${average ? average + " / 5 · " + reviews.length : t("لا توجد تقييمات بعد", "No reviews yet")}</p>${note(t("الدفع نقدًا عند الوصول. الإلغاء الذاتي مجاني حتى 48 ساعة قبل البداية. لا توجد دفعة إلكترونية مسبقة. 10% من المبلغ يُخصّص لهدف المنطقة؛ يظهر كدعم مستلم فقط بعد تسجيل تحويله من الإدارة.", "Pay cash on arrival. Free self-cancellation up to 48 hours before the start. No advance online payment. 10% is allocated to the region’s community goal; it is shown as received only after admin records its transfer."))}${anchor(t("سياسة الحجز والإلغاء", "Booking & cancellation policy"), "policy")}</section><aside class="panel"><h2>${t("المواعيد المتاحة", "Available slots")}</h2>${available.map((s) => `<div class="booking"><p>${formatDate(s.startAt)}</p><p>${s.capacity - s.booked} ${t("مقاعد متبقية", "seats left")}</p>${anchor(t("احجز هذا الموعد", "Book this slot"), "booking", { id: s.id }, "primary")}</div>`).join("") || empty(t("لا توجد مواعيد متاحة الآن.", "No slots available now."))}</aside></div><section class="section panel"><h2>${t("تقييمات بعد زيارة فعلية", "Reviews after completed visits")}</h2>${reviews.map((r) => `<article class="review-row"><b>${r.rating}/5</b><p>${e(r.text)}</p></article>`).join("") || empty(t("كن أول من يشارك تجربته بعد الزيارة.", "Share your experience after your visit."))}</section>`;
}
async function host() {
  const h = await D.read("hosts", params.get("id"));
  if (!h)
    return empty(
      t("المضيف غير منشور أو غير معتمد.", "Host not published or approved."),
    );
  const ex = await D.list("experiences", [["status", "approved"]]);
  return `<section class="panel"><img class="avatar" src="${e(h.photoData || "/assets/avatar.svg")}" alt="${e(h.fullName)}"><h1>${e(h.fullName)}</h1><span class="tag">${t("تمت مراجعة الهوية من الإدارة", "Identity reviewed by administration")}</span><p>${e(h.bio)}</p>${h.publicPhone ? `<a class="button" href="tel:${e(h.publicPhone)}">${t("تواصل مع المضيف", "Contact host")}</a>` : ""}</section><section class="section"><h2>${t("تجارب المضيف", "Host experiences")}</h2><div class="grid">${
    ex
      .filter((x) => x.hostUid === h.id)
      .map(experienceCard)
      .join("") ||
    empty(t("لا توجد تجارب منشورة.", "No published experiences."))
  }</div></section>`;
}
async function trips() {
  const [items, bookings] = await Promise.all([
    getTrips(),
    D.list("bookings", [["uid", user.uid]]),
  ]);
  const tab = params.get("status") || "planned";
  return `<div class="page-title"><h1>${t("رحلاتي", "My trips")}</h1>${button(t("رحلة جديدة", "New trip"), "newTrip", "", "primary")}</div><form id="newTrip" class="panel form-card" hidden><h2>${t("أنشئ رحلة", "Create a trip")}</h2>${field(t("اسم الرحلة", "Trip name"), "name", "text", "", 'required minlength="2" maxlength="100"')}${field(t("تاريخ البداية", "Start date"), "date", "date", new Date(Date.now() + 86400000).toISOString().slice(0, 10), "required")}${field(t("عدد الأيام", "Number of days"), "days", "number", 3, 'required min="1" max="14" step="1"')}<button class="primary" type="submit">${t("أنشئ الرحلة", "Create trip")}</button><p role="status"></p></form>${note(t("الرحلة الجديدة تظهر في مخططة. اضغط ابدأ لنقلها إلى جارية، واكتملت بعد إنهائها. يمكنك إرجاعها إلى مخططة أو أرشفتها؛ كل حالة لها تبويب.", "New trips appear under Planned. Start moves them to Current; Complete moves them to Completed. You can return a trip to Planned or archive it. Each state has its own tab."))}<div class="tabs">${[
    ["planned", t("مخططة", "Planned")],
    ["current", t("جارية", "Current")],
    ["completed", t("مكتملة", "Completed")],
    ["archived", t("مؤرشفة", "Archived")],
  ]
    .map(([status, text]) =>
      anchor(text, "trips", { status }, tab === status ? "active" : ""),
    )
    .join("")}</div><section class="panel">${
    items
      .filter((x) => x.status === tab)
      .map(
        (x) =>
          `<article class="trip-row ${params.get("highlight") === x.id ? "highlight-trip" : ""}"><h2>${e(x.name)}</h2><span class="tag">${e(statusLabel(x.status))}</span><p>${e(x.startDate)} · ${x.days} ${t("أيام", "days")} · ${x.stops.length} ${t("محطات", "stops")}</p><div class="actions">${anchor(t("تفاصيل وتعديل", "View & edit"), "builder", { id: x.id })}${button(t("مخططة", "Planned"), "tripState", `data-id="${x.id}" data-status="planned"`)}${button(t("ابدأ", "Start"), "tripState", `data-id="${x.id}" data-status="current"`)}${button(t("اكتملت", "Complete"), "tripState", `data-id="${x.id}" data-status="completed"`)}${button(t("أرشفة", "Archive"), "tripState", `data-id="${x.id}" data-status="archived"`)}</div></article>`,
      )
      .join("") ||
    empty(
      t(
        "ما عندك رحلات بهذه الحالة. أنشئ رحلة جديدة.",
        "No trips in this state. Create a new trip.",
      ),
    )
  }</section><section class="section panel"><h2>${t("حجوزاتي", "My bookings")}</h2>${
    bookings
      .sort((a, b) => b.startAt.toMillis() - a.startAt.toMillis())
      .map((b) => bookingCard(b))
      .join("") || empty(t("لا توجد حجوزات.", "No bookings yet."))
  }</section>${anchor(t("الأثر والدعم", "Spending & community support"), "impact")}`;
}
function bookingCard(b, hostView = false) {
  const past = b.endAt.toMillis() < Date.now();
  return `<article class="booking"><h3>${e(title(b))}</h3><p>${formatDate(b.startAt)} · ${b.guests} ${t("أشخاص", "guests")} · ${price(b.totalCents)}</p><p>${t("الحالة", "Status")}: ${e(statusLabel(b.status))} · ${t("الدفع عند الوصول", "Pay on arrival")}${hostView ? " · " + e(b.travelerName) : ""}</p><p>${t("تأكيد استلام النقد من المضيف", "Host confirmed cash receipt")}: ${b.hostPaid ? t("نعم", "Yes") : t("لا", "No")} · ${t("تأكيد الدفع من الزائر", "Traveler confirmed payment")}: ${b.travelerPaid ? t("نعم", "Yes") : t("لا", "No")}</p><div class="actions">${anchor(t("التجربة", "Experience"), "experience", { id: b.experienceId })}${b.status === "confirmed" && b.startAt.toMillis() > Date.now() && (hostView || b.startAt.toMillis() - Date.now() > 48 * 3600000) ? button(t("إلغاء الحجز", "Cancel booking"), "cancelBooking", `data-id="${b.id}"`) : ""}${past && b.status === "confirmed" && !(hostView ? b.hostPaid : b.travelerPaid) ? button(hostView ? t("تأكيد استلام الدفع", "Confirm cash received") : t("تأكيد إتمام الزيارة والدفع", "Confirm visit & payment"), "confirmCash", `data-id="${b.id}" data-host="${hostView}"`) : ""}${past && b.status === "confirmed" && !hostView ? button(t("اكتب تقييم", "Write review"), "openReview", `data-id="${b.id}"`) : ""}</div>${
    past && b.status === "confirmed" && !hostView
      ? `<form id="review-${b.id}" data-review="${b.id}" hidden class="section">${select(
          t("التقييم", "Rating"),
          "rating",
          [5, 4, 3, 2, 1].map((n) => [String(n), String(n) + " / 5"]),
        )}<label class="field">${t("تجربتك", "Your experience")}<textarea name="text" required minlength="10" maxlength="1000"></textarea></label><button type="submit" class="primary">${t("انشر التقييم", "Publish review")}</button><p role="status"></p></form>`
      : ""
  }</article>`;
}
let currentTrip = null,
  currentDay = 0;
async function builder() {
  if (!params.get("id"))
    return `<h1>${t("مخطط الرحلة", "Trip planner")}</h1>${note(t("اختر رحلة أو أنشئ واحدة من رحلاتي.", "Choose or create a trip from My trips."))}${anchor(t("افتح رحلاتي", "Open My trips"), "trips", {}, "primary")}`;
  currentTrip = await D.read("trips", params.get("id"));
  if (!currentTrip || currentTrip.uid !== user.uid)
    return empty(t("الرحلة غير موجودة.", "Trip not found."));
  currentDay = Math.min(
    currentTrip.days - 1,
    Math.max(0, Number(params.get("day")) || 0),
  );
  return `<div class="page-title"><div><h1>${e(currentTrip.name)}</h1><p>${e(currentTrip.startDate)} · ${currentTrip.days} ${t("أيام", "days")}</p></div>${anchor(t("كل الرحلات", "All trips"), "trips")}</div><div class="tabs">${Array.from({ length: currentTrip.days }, (_, i) => anchor(t("اليوم", "Day") + " " + (i + 1), "builder", { id: currentTrip.id, day: i }, i === currentDay ? "active" : "")).join("")}</div><details class="panel"><summary>${t("تعديل اسم وتاريخ وأيام الرحلة", "Edit trip name, date and days")}</summary><form id="tripSettings">${field(t("اسم الرحلة", "Trip name"), "name", "text", currentTrip.name, 'required minlength="2" maxlength="100"')}${field(t("تاريخ البداية", "Start date"), "date", "date", currentTrip.startDate, "required")}${field(t("عدد الأيام", "Days"), "days", "number", currentTrip.days, 'required min="1" max="14" step="1"')}<button type="submit" class="primary">${t("حفظ إعدادات الرحلة", "Save trip settings")}</button><p role="status"></p></form></details><div class="split section"><section class="panel"><h2>${t("محطات اليوم", "Today’s stops")}</h2><div id="stops"></div><form id="addStop" class="section">${select(
    t("أضف مكانًا", "Add a place"),
    "place",
    places.map((p) => [p.id, label(p)]),
  )}<button type="submit">${t("أضف محطة", "Add stop")}</button><p role="status"></p></form></section><aside class="panel"><h2>${t("الوقت والمسافة", "Time & distance")}</h2><div id="tripSummary"></div><div id="tripMap"></div>${note(t("الوقت والمسافة تقديرات بين الإحداثيات، وليست بيانات طرق مباشرة. اترك هامشًا للتوقف والازدحام.", "Travel time and distance are estimates between coordinates, not live road data. Allow for stops and traffic."))}${button(t("حفظ التغييرات", "Save changes"), "saveTrip", "", "primary")}<p id="tripSaveStatus" role="status"></p><div class="actions">${button(t("افتح مسار اليوم بالخريطة", "Open day route in Maps"), "route")}${button(t("تنزيل الرحلة", "Download trip"), "exportTrip")}</div></aside></div>`;
}
function renderStops() {
  if (!currentTrip || !$("#stops")) return;
  const stops = currentTrip.stops.filter((s) => s.day === currentDay);
  $("#stops").innerHTML =
    stops
      .map(
        (s, i) =>
          `<article class="stop" draggable="true" data-stop="${s.id}"><div><b>${e(label(placeById(s.placeId)))}</b><p class="muted">${t("اسحب أو استخدم أزرار الترتيب", "Drag or use reorder buttons")}</p></div><label>${t("الوقت", "Time")}<input type="time" value="${s.time}" data-time="${s.id}" aria-label="${t("وقت المحطة", "Stop time")}"></label><label>${t("مدة الزيارة", "Visit minutes")}<input type="number" min="15" max="720" step="15" value="${s.duration}" data-duration="${s.id}"></label><div class="actions">${button(t("فوق", "Up"), "moveStop", `data-id="${s.id}" data-dir="-1" ${i === 0 ? "disabled" : ""}`)}${button(t("تحت", "Down"), "moveStop", `data-id="${s.id}" data-dir="1" ${i === stops.length - 1 ? "disabled" : ""}`)}${button(t("حذف", "Remove"), "removeStop", `data-id="${s.id}"`)}</div></article>`,
      )
      .join("") ||
    empty(t("أضف أول محطة لهاليوم.", "Add the first stop for this day."));
  updateSummary();
  act("removeStop", (el) => {
    currentTrip.stops = currentTrip.stops.filter((s) => s.id !== el.dataset.id);
    dirtyTrip();
    renderStops();
  });
  act("moveStop", (el) => moveStop(el.dataset.id, +el.dataset.dir));
  all("[data-time],[data-duration]").forEach((el) =>
    el.addEventListener("change", () => {
      const s = currentTrip.stops.find(
        (s) => s.id === (el.dataset.time || el.dataset.duration),
      );
      if (el.dataset.time) {
        if (!/^([01]\d|2[0-3]):[0-5]\d$/.test(el.value)) return;
        s.time = el.value;
      } else
        s.duration = Math.max(
          15,
          Math.min(720, Math.round((Number(el.value) || 15) / 15) * 15),
        );
      dirtyTrip();
      updateSummary();
    }),
  );
  let dragged = "";
  all("[data-stop]").forEach((el) => {
    el.addEventListener("dragstart", () => {
      dragged = el.dataset.stop;
      el.classList.add("dragging");
    });
    el.addEventListener("dragend", () => el.classList.remove("dragging"));
    el.addEventListener("dragover", (ev) => ev.preventDefault());
    el.addEventListener("drop", (ev) => {
      ev.preventDefault();
      const a = currentTrip.stops.findIndex((s) => s.id === dragged),
        b = currentTrip.stops.findIndex((s) => s.id === el.dataset.stop);
      if (a < 0 || b < 0) return;
      const [s] = currentTrip.stops.splice(a, 1);
      currentTrip.stops.splice(b, 0, s);
      dirtyTrip();
      renderStops();
    });
  });
}
let tripDirty = false;
function dirtyTrip() {
  tripDirty = true;
  $("#tripSaveStatus").textContent = t("تغييرات غير محفوظة", "Unsaved changes");
}
function moveStop(id, dir) {
  const stops = currentTrip.stops.filter((s) => s.day === currentDay),
    i = stops.findIndex((s) => s.id === id),
    target = stops[i + dir];
  if (!target) return;
  const a = currentTrip.stops.findIndex((s) => s.id === id),
    b = currentTrip.stops.findIndex((s) => s.id === target.id);
  [currentTrip.stops[a], currentTrip.stops[b]] = [
    currentTrip.stops[b],
    currentTrip.stops[a],
  ];
  dirtyTrip();
  renderStops();
}
function updateSummary() {
  const stops = currentTrip.stops.filter((s) => s.day === currentDay),
    issues = conflicts(stops);
  if ($("#tripMap"))
    $("#tripMap").innerHTML = stops.length
      ? mapEmbed(placeById(stops[0].placeId))
      : "";
  let minutes = 0,
    km = 0;
  for (let i = 1; i < stops.length; i++) {
    const leg = estimateLeg(
      placeById(stops[i - 1].placeId),
      placeById(stops[i].placeId),
    );
    minutes += leg?.minutes || 0;
    km += leg?.km || 0;
  }
  $("#tripSummary").innerHTML =
    `<p>${t("القيادة التقديرية", "Estimated driving")}: ${km} km · ${minutes} ${t("دقيقة", "min")}</p>${issues.length ? issues.map((x) => note(t("تعارض محتمل قبل", "Potential conflict before") + " " + e(label(placeById(stops[x.index].placeId))) + " — " + t("وقت الزيارة السابقة والتنقل لا يكفيان.", "Previous visit and travel time do not fit."))).join("") : `<p class="success">${t("لا يوجد تعارض بالوقت حسب التقديرات.", "No time conflict based on estimates.")}</p>`}`;
}
async function booking() {
  const s = await D.read("slots", params.get("id"));
  if (
    !s ||
    !s.open ||
    s.startAt.toMillis() < Date.now() ||
    s.capacity <= s.booked
  )
    return empty(t("الموعد غير متاح.", "Slot unavailable."));
  if (s.hostUid === user.uid)
    return note(
      t(
        "لا يمكنك حجز تجربتك من حساب المضيف.",
        "You cannot book your own experience from your host account.",
      ),
    );
  return `<section class="panel form-card"><h1>${t("تأكيد الحجز", "Confirm booking")}</h1><h2>${e(title(s))}</h2><p>${formatDate(s.startAt)} ${t("(بتوقيت عمّان)", "(Amman time)")}</p><p>${s.capacity - s.booked} ${t("مقاعد متبقية", "seats left")}</p><p>${price(s.priceCents)} ${t("للشخص", "per guest")}</p><form id="bookingForm">${field(t("اسم الزائر", "Traveler name"), "name", "text", profile?.fullName || "", 'required minlength="2" maxlength="100"')}${field(t("عدد الأشخاص", "Guests"), "guests", "number", 1, `required min="1" max="${Math.min(10, s.capacity - s.booked)}" step="1"`)}<p id="bookingTotal">${t("الإجمالي", "Total")}: ${price(s.priceCents)}</p>${note(t("الدفع نقدًا للمضيف عند الوصول. لا تُخصم أموال إلكترونيًا. يمكن الإلغاء الذاتي حتى 48 ساعة قبل الموعد.", "Pay the host cash on arrival. No online charge is made. Self-cancellation is available up to 48 hours before the slot."))}<label class="check"><input type="checkbox" name="agree" required>${t("راجعت تفاصيل الموعد وسياسة الإلغاء والدفع عند الوصول.", "I reviewed the slot details, cancellation policy and pay-on-arrival terms.")}</label><button class="primary" type="submit">${t("احجز المقاعد", "Reserve seats")}</button><p role="status"></p></form></section>`;
}
async function goals() {
  const goals = await D.list("goals", [["published", true]]),
    receipts = await D.list("contributions", [["status", "received"]]);
  return `<div class="page-title"><h1>${t("أهداف المناطق", "Community goals")}</h1>${anchor(t("أثر حجوزاتي", "My booking impact"), "impact")}</div><p>${t("التقدّم يحسب من مساهمات سجّلت الإدارة استلامها، وليس من عدد مشاهدات الصفحة أو حجوزات غير مدفوعة.", "Progress uses contributions recorded as received by administration, not page views or unpaid bookings.")}</p><div class="grid">${
    goals
      .map((g) => {
        const sum = receipts
            .filter((r) => r.goalId === g.id)
            .reduce((n, r) => n + r.amountCents, 0),
          pct = Math.min(100, Math.floor((sum / g.targetCents) * 100));
        return `<article class="panel"><h2>${e(title(g))}</h2><p>${e(lang === "ar" ? g.descriptionAr : g.descriptionEn)}</p><div class="progress" role="progressbar" aria-label="${e(title(g))}" aria-valuenow="${pct}" aria-valuemin="0" aria-valuemax="100"><span style="width:${pct}%"></span></div><p>${price(sum)} / ${price(g.targetCents)} · ${pct}%</p><p>${t("عدد إيصالات الاستلام", "Received contribution records")}: ${receipts.filter((r) => r.goalId === g.id).length}</p>${anchor(t("تجارب المنطقة", "Region experiences"), "experiences", { region: g.regionId })}</article>`;
      })
      .join("") ||
    empty(
      t(
        "لا توجد أهداف مجتمعية منشورة بعد. الإدارة تنشئها بعد الاتفاق مع الجهة المستفيدة.",
        "No community goals published yet. Administration publishes them after agreement with the beneficiary.",
      ),
    )
  }</div><section class="section"><h2>${t("أفكار لأهداف المناطق", "Proposed community goals")}</h2>${note(t("هذه أفكار مقترحة من دليل، وليست حملات تمويل قائمة أو شراكات مؤكدة. لا تُحسب لها تبرعات أو نسب إنجاز. تتحول لهدف فعلي بعد اعتماد الإدارة واتفاق الجهة المستفيدة.", "These are Daleel proposals, not active funding campaigns or confirmed partnerships. No donations or progress are assigned. A proposal becomes an active goal after administration approval and beneficiary agreement."))}<div class="grid">${goalIdeas.map((g) => `<article class="panel"><span class="tag">${t("هدف مقترح — بانتظار التبني", "Proposed goal — awaiting adoption")}</span><h3>${e(title(g))}</h3><p>${e(lang === "ar" ? g.descriptionAr : g.descriptionEn)}</p><h4>${t("خطوات التنفيذ المقترحة", "Suggested implementation steps")}</h4><ul>${(lang === "ar" ? g.stepsAr : g.stepsEn).map((step) => `<li>${e(step)}</li>`).join("")}</ul>${anchor(t("استكشف المنطقة", "Explore the region"), "explore", { region: g.regionId })}</article>`).join("")}</div></section>`;
}
async function impact() {
  const bookings = await D.list("bookings", [["uid", user.uid]]);
  const paid = bookings.filter(
    (b) => b.status === "confirmed" && b.hostPaid && b.travelerPaid,
  );
  const receipts = await D.list("contributions", [["status", "received"]]);
  const ownReceipts = receipts.filter((r) =>
    paid.some((b) => b.id === r.bookingId),
  );
  const total = paid.reduce((n, b) => n + b.totalCents, 0),
    allocation = paid.reduce((n, b) => n + b.communityCents, 0),
    received = ownReceipts.reduce((n, r) => n + r.amountCents, 0);
  return `<div class="page-title"><h1>${t("أثر رحلتي", "My trip impact")}</h1>${anchor(t("أهداف المناطق", "Community goals"), "goals")}</div>${note(t("المبلغ المدفوع يعتمد على تأكيد الزائر والمضيف معًا للدفع النقدي. المخصص للمجتمع ليس تحويلًا مكتملًا؛ الدعم المستلم يحتاج سجل استلام إداري.", "Paid amounts require both traveler and host confirmation of cash payment. Community allocation is not a completed transfer; received support requires an administration receipt record."))}<div class="stats"><div class="stat"><b>${price(total)}</b>${t("إنفاق مؤكد من الطرفين", "Spending confirmed by both parties")}</div><div class="stat"><b>${price(total - allocation)}</b>${t("حصة المضيف بعد المخصص", "Host share after allocation")}</div><div class="stat"><b>${price(allocation)}</b>${t("مخصص للمجتمع", "Allocated to community")}</div><div class="stat"><b>${price(received)}</b>${t("سجّل استلامه للمجتمع", "Recorded received by community")}</div></div><section class="panel">${paid.map((b) => `<article class="booking"><h3>${e(title(b))}</h3><p>${price(b.totalCents)} · ${t("مخصص المجتمع", "Community allocation")}: ${price(b.communityCents)}</p></article>`).join("") || empty(t("بعد زيارة تجربة وتأكيد الدفع من الطرفين، يظهر أثرها هنا.", "Impact appears after a visit and payment confirmation by both parties."))}</section><div class="actions section">${button(t("شارك رابط دليل", "Share Daleel"), "share")}${anchor(t("شوف رحلاتي", "See my trips"), "trips")}</div>`;
}
async function account() {
  return `<div class="page-title"><h1>${t("ملفي الشخصي", "My profile")}</h1>${anchor(t("رحلاتي", "My trips"), "trips")}</div><form id="profileForm" class="panel form-card"><img id="photoPreview" class="avatar" src="${e(profile?.photoData || "/assets/avatar.svg")}" alt="${t("صورة الحساب", "Profile photo")}">${field(t("تغيير الصورة", "Change photo"), "photo", "file", "", 'accept="image/jpeg,image/png,image/webp"')}${field(t("الاسم الكامل", "Full name"), "fullName", "text", profile?.fullName || user.displayName || "", 'required minlength="2" maxlength="100"')}${field(t("البريد الإلكتروني", "Email"), "email", "email", user.email, "disabled")}${field(t("اسم المستخدم", "Username"), "username", "text", profile?.username || "", 'maxlength="40" pattern="[A-Za-z0-9_.-]*"')}<label class="field">${t("نبذة قصيرة", "Bio")}<textarea name="bio" maxlength="500">${e(profile?.bio || "")}</textarea></label>${field(t("المدينة", "City"), "city", "text", profile?.city || "", 'maxlength="100"')}${select(t("المود المفضل", "Preferred mood"), "travelMood", moodOptions(), profile?.travelMood || "")}<button class="primary" type="submit">${t("حفظ التغييرات", "Save changes")}</button><p role="status"></p></form><section class="panel section"><h2>${t("أمان الحساب", "Account security")}</h2><p>${user.emailVerified ? t("البريد مؤكد", "Email verified") : t("البريد غير مؤكد؛ يلزم تأكيده للمضيف والإدارة.", "Email unverified; verification is required for hosts and administration.")}</p><div class="actions">${!user.emailVerified ? button(t("إرسال رابط التأكيد", "Send verification link"), "verify") : ""}${button(t("تحديث حالة التأكيد", "Refresh verification status"), "refreshAuth")}${button(t("إعادة تعيين كلمة المرور", "Reset password"), "resetPassword")}${button(t("تسجيل الخروج", "Sign out"), "logout")}</div></section>`;
}
async function authentication(register = false) {
  return `<section class="panel form-card"><h1>${register ? t("إنشاء حساب", "Create account") : t("تسجيل الدخول", "Sign in")}</h1>${params.get("registered") ? note(t("تم إنشاء حسابك. سجل الدخول بالبريد وكلمة المرور.", "Account created. Sign in with your email and password.")) : ""}<form id="authForm">${register ? field(t("الاسم الكامل", "Full name"), "name", "text", "", 'required minlength="2" maxlength="100" autocomplete="name"') : ""}${field(t("البريد الإلكتروني", "Email"), "email", "email", "", 'required maxlength="254" autocomplete="email"')}${field(t("كلمة المرور", "Password"), "password", "password", "", `required minlength="${register ? 8 : 6}" maxlength="128" autocomplete="${register ? "new-password" : "current-password"}"`)}${register ? `<label class="check"><input name="agree" type="checkbox" required>${t("أوافق على سياسة الخصوصية والإلغاء", "I agree to the privacy and cancellation policy")} <a href="${href("policy")}" target="_blank" rel="noopener">${t("اقرأها", "Read policy")}</a></label>` : ""}<button class="primary" type="submit">${register ? t("إنشاء الحساب", "Create account") : t("دخول", "Sign in")}</button><p role="status"></p></form><div class="actions section">${anchor(register ? t("عندي حساب", "I have an account") : t("حساب جديد", "New account"), register ? "login" : "register")}${!register ? button(t("نسيت كلمة المرور", "Forgot password"), "resetPassword") : ""}</div></section>`;
}
async function hostDashboard() {
  const application = await D.read("hostApplications", user.uid),
    h = await D.read("hosts", user.uid);
  if (!h) {
    return `<h1>${t("انضم كمضيف محلي", "Become a local host")}</h1>${note(t("لن يظهر ملفك أو تجاربك للعامة قبل مراجعة الإدارة للهوية والمعلومات. صورة الهوية خاصة بصاحب الحساب والإدارة فقط.", "Your profile and experiences remain private until administration reviews your identity and details. Identity images are accessible only to you and administration."))}${application ? `<section class="panel"><h2>${t("حالة الطلب", "Application status")}: ${e(statusLabel(application.status))}</h2><p>${e(application.reviewNote || "")}</p></section>` : ""}${!user.emailVerified ? `<section class="panel"><p>${t("أكد بريدك أولًا قبل تقديم طلب استضافة.", "Verify your email before applying.")}</p>${button(t("إرسال رابط التأكيد", "Send verification"), "verify")}${button(t("تحديث الحالة", "Refresh status"), "refreshAuth")}</section>` : application?.status === "pending" ? note(t("طلبك قيد المراجعة.", "Your application is under review.")) : `<form id="hostApply" class="panel form-card">${field(t("الاسم القانوني", "Legal full name"), "fullName", "text", profile?.fullName || "", 'required minlength="2" maxlength="100"')}<label class="field">${t("نبذة وخبراتك", "Bio and experience")}<textarea name="bio" required minlength="30" maxlength="1000"></textarea></label>${field(t("رقم للتواصل", "Contact phone"), "phone", "tel", "", 'required minlength="7" maxlength="30"')}${select(t("منطقتك", "Region"), "regionId", areaOptions())}${field(t("صورة شخصية", "Profile photo"), "photo", "file", "", 'accept="image/jpeg,image/png,image/webp"')}${field(t("صورة هوية واضحة للمراجعة الخاصة", "Clear identity image for private review"), "identity", "file", "", 'required accept="image/jpeg,image/png,image/webp"')}<label class="check"><input type="checkbox" name="publicPhone">${t("أوافق على نشر رقم التواصل للزوار", "I consent to publishing my contact number")}</label><label class="check"><input type="checkbox" required>${t("أوافق على مراجعة الهوية وشروط المضيف والتزام السلامة والإلغاء", "I consent to identity review and agree to host safety and cancellation responsibilities")}</label><button type="submit" class="primary">${t("أرسل للمراجعة", "Submit for review")}</button><p role="status"></p></form>`}`;
  }
  const [ex, bookings, slots] = await Promise.all([
    D.list("experiences", [["hostUid", user.uid]]),
    D.list("bookings", [["hostUid", user.uid]]),
    D.list("slots", [["hostUid", user.uid]]),
  ]);
  return `<h1>${t("لوحة المضيف", "Host dashboard")}</h1>${note(t("راجع سلامة المكان، التعليمات الخاصة، والمواعيد قبل نشرها. الحجز مؤكد للمقاعد، والدفع نقدًا عند الوصول.", "Review location safety, special instructions and availability before publication. Bookings reserve seats; payment is cash on arrival."))}<section class="panel"><h2>${t("قدم تجربة للمراجعة", "Submit an experience for review")}</h2><form id="experienceForm" class="form-card">${field(t("العنوان بالعربية", "Arabic title"), "titleAr", "text", "", 'required minlength="5" maxlength="120"')}${field(t("العنوان بالإنجليزية", "English title"), "titleEn", "text", "", 'required minlength="5" maxlength="120"')}<label class="field">${t("التفاصيل وتعليمات السلامة بالعربية", "Arabic details and safety instructions")}<textarea name="descriptionAr" required minlength="50" maxlength="3000"></textarea></label><label class="field">${t("التفاصيل وتعليمات السلامة بالإنجليزية", "English details and safety instructions")}<textarea name="descriptionEn" required minlength="50" maxlength="3000"></textarea></label>${select(
    t("نوع التجربة", "Category"),
    "category",
    categories.map((c) => [c[0], t(c[1], c[2])]),
  )}${select(
    t("المكان", "Place"),
    "placeId",
    places.map((p) => [p.id, label(p)]),
  )}${field(t("السعر للشخص بالدينار", "Price per guest in JOD"), "price", "number", "", 'required min="1" max="1000" step="0.01"')}${field(t("المدة بالدقائق", "Duration in minutes"), "duration", "number", 90, 'required min="15" max="720" step="1"')}${field(t("صورة فعلية للتجربة", "Actual experience photo"), "photo", "file", "", 'accept="image/jpeg,image/png,image/webp"')}${note(t("مخصص المجتمع 10% من السعر. يلتزم المضيف بتحويله للجهة المتفق عليها؛ يظهر الاستلام بعد تسجيل الإدارة للإيصال.", "10% of the price is allocated to community support. The host must transfer it to the agreed beneficiary; receipt appears after administration records evidence."))}<button class="primary" type="submit">${t("قدم التجربة", "Submit experience")}</button><p role="status"></p></form></section><section class="panel section"><h2>${t("تجاربي ومواعيدها", "My experiences and availability")}</h2>${
    ex
      .map(
        (x) =>
          `<article class="booking"><h3>${e(title(x))}</h3><p>${e(statusLabel(x.status))} · ${price(x.priceCents)}</p>${
            x.status === "approved"
              ? `<form id="slots-${x.id}" data-slots="${x.id}" class="grid two">${field(t("التاريخ", "Date"), "date", "date", "", "required")}${field(t("التوقيت بتوقيت الأردن", "Time in Jordan"), "time", "time", "10:00", "required")}${field(t("السعة", "Capacity"), "capacity", "number", 6, 'required min="1" max="50" step="1"')}<button class="primary" type="submit">${t("أضف موعدًا", "Publish slot")}</button><p role="status"></p></form>${anchor(t("صفحة التجربة", "Experience page"), "experience", { id: x.id })}${slots
                  .filter(
                    (s) =>
                      s.experienceId === x.id &&
                      s.startAt.toMillis() > Date.now(),
                  )
                  .map(
                    (s) =>
                      `<div class="booking"><p>${formatDate(s.startAt)} · ${s.booked}/${s.capacity} ${t("محجوز", "reserved")}</p>${button(s.open ? t("أوقف استقبال حجوزات جديدة", "Close to new bookings") : t("افتح الحجز", "Open booking"), "toggleSlot", `data-id="${s.id}" data-open="${!s.open}"`)}<small>${t("إغلاق الموعد لا يلغي الحجوزات الحالية.", "Closing a slot does not cancel existing bookings.")}</small></div>`,
                  )
                  .join("")}`
              : ""
          }</article>`,
      )
      .join("") || empty(t("قدّم أول تجربة.", "Submit your first experience."))
  }</section><section class="panel section"><h2>${t("حجوزات الزوار", "Guest bookings")}</h2>${bookings.map((b) => bookingCard(b, true)).join("") || empty(t("لا توجد حجوزات.", "No bookings yet."))}</section>`;
}
async function administration() {
  if (!isAdmin())
    return empty(
      t(
        "هذه الصفحة للإدارة ببريد مؤكد فقط.",
        "Administration requires the verified administrator account.",
      ),
    );
  const [applications, experiences, bookings, goals, contributions] =
    await Promise.all([
      D.list("hostApplications"),
      D.list("experiences"),
      D.list("bookings"),
      D.list("goals"),
      D.list("contributions"),
    ]);
  return `<h1>${t("إدارة دليل", "Daleel administration")}</h1><section class="panel"><h2>${t("مراجعة طلبات المضيفين", "Host identity review")}</h2>${
    applications
      .filter((a) => a.status === "pending")
      .map(
        (a) =>
          `<article class="booking"><h3>${e(a.fullName)}</h3><p>${e(a.bio)}</p><p>${e(a.phone)} · ${e(a.regionId)}</p><details><summary>${t("عرض الهوية الخاصة", "View private identity")}</summary><img class="identity" src="${e(a.identityData)}" alt="${t("هوية خاصة", "Private identity")}"></details><label class="field">${t("سبب القرار / تعليمات", "Decision reason / instructions")}<input id="reason-${a.id}" maxlength="500"></label><div class="actions">${button(t("اعتماد بعد التحقق", "Approve after verification"), "approveHost", `data-id="${a.id}"`, "primary")}${button(t("رفض الطلب", "Reject application"), "rejectHost", `data-id="${a.id}"`)}</div></article>`,
      )
      .join("") || empty(t("لا توجد طلبات معلقة.", "No pending applications."))
  }</section><section class="panel section"><h2>${t("مراجعة التجارب", "Experience review")}</h2>${
    experiences
      .filter((x) => x.status === "pending")
      .map(
        (x) =>
          `<article class="booking"><h3>${e(x.titleAr)} / ${e(x.titleEn)}</h3><p>${e(x.descriptionAr)}</p><p>${e(x.descriptionEn)}</p><p>${price(x.priceCents)} · ${x.duration} min · ${e(x.hostUid)}</p>${button(t("اعتماد ونشر", "Approve & publish"), "approveExperience", `data-id="${x.id}"`, "primary")}${button(t("رفض", "Reject"), "rejectExperience", `data-id="${x.id}"`)}</article>`,
      )
      .join("") || empty(t("لا توجد تجارب معلقة.", "No pending experiences."))
  }</section><section class="panel section"><h2>${t("هدف مجتمعي متفق عليه", "Agreed community project")}</h2><form id="goalForm" class="form-card">${field(t("العنوان بالعربية", "Arabic title"), "titleAr", "text", "", 'required minlength="5" maxlength="120"')}${field(t("العنوان بالإنجليزية", "English title"), "titleEn", "text", "", 'required minlength="5" maxlength="120"')}<label class="field">${t("التفاصيل بالعربية والجهة المستفيدة", "Arabic description and beneficiary")}<textarea name="descriptionAr" required minlength="30" maxlength="2000"></textarea></label><label class="field">${t("التفاصيل بالإنجليزية والجهة المستفيدة", "English description and beneficiary")}<textarea name="descriptionEn" required minlength="30" maxlength="2000"></textarea></label>${select(t("المنطقة", "Region"), "regionId", areaOptions())}${field(t("هدف التمويل بالدينار", "Funding target in JOD"), "target", "number", "", 'required min="1" max="1000000" step="0.01"')}<label class="check"><input type="checkbox" required>${t("تم الاتفاق الفعلي مع المستفيد ومراجعة بيانات الهدف", "An actual beneficiary agreement exists and project details were reviewed")}</label><button class="primary" type="submit">${t("نشر الهدف", "Publish goal")}</button><p role="status"></p></form></section><section class="panel section"><h2>${t("تسجيل مساهمات مستلمة", "Record received contributions")}</h2>${note(t("سجّل فقط بعد مراجعة إيصال التحويل للجهة المستفيدة. لا يعني تأكيد النقد من الزائر وصول حصة المجتمع.", "Record only after reviewing transfer evidence to the beneficiary. Traveler cash confirmation does not prove community funds were received."))}${
    bookings
      .filter(
        (b) =>
          b.status === "confirmed" &&
          b.hostPaid &&
          b.travelerPaid &&
          !contributions.some((c) => c.id === b.id),
      )
      .map(
        (b) =>
          `<form id="receipt-${b.id}" data-receipt="${b.id}" class="booking"><h3>${e(title(b))}</h3><p>${e(b.id)} · ${price(b.communityCents)}</p>${select(
            t("الهدف في نفس المنطقة", "Goal in same region"),
            "goalId",
            goals
              .filter((g) => g.regionId === b.regionId && g.published)
              .map((g) => [g.id, title(g)]),
          )}${field(t("مرجع إيصال التحويل للمراجعة الداخلية", "Private transfer receipt reference"), "reference", "text", "", 'required minlength="5" maxlength="200"')}<button type="submit" class="primary">${t("أكد الاستلام بعد التحقق", "Record verified receipt")}</button><p role="status"></p></form>`,
      )
      .join("") ||
    empty(
      t(
        "لا توجد مساهمات تنتظر تسجيل إيصال.",
        "No contributions awaiting a receipt.",
      ),
    )
  }</section>`;
}
async function policy() {
  return `<h1>${t("الخصوصية وشروط الخدمة", "Privacy and service terms")}</h1><section class="panel"><h2>${t("البيانات والحساب", "Account and data")}</h2><p>${t("تُحفظ بيانات الحساب والرحلات والحجوزات في Firebase. بيانات المستخدم الخاصة له؛ بيانات الحجز متاحة لصاحبه والمضيف والإدارة لتقديم الخدمة. هوية المضيف متاحة للمضيف والإدارة فقط، ولا تُنشر للعامة. الصور تُضغط قبل حفظها. لا نجمع بيانات بطاقات أو كلمات مرور في Firestore.", "Account, trips and bookings are stored in Firebase. Private user data belongs to that user; booking details are available to the traveler, host and administration to deliver the service. Host identity images are private to the applicant and administration. Images are compressed before storage. Card details and passwords are never stored in Firestore.")}</p><h2>${t("الحجز والإلغاء", "Booking and cancellation")}</h2><p>${t("الحجز يحجز مقاعد الموعد المحدد. الدفع نقدًا عند الوصول؛ لا يوجد دفع إلكتروني. يمكنك الإلغاء حتى 48 ساعة قبل الموعد. بعد ذلك تواصل مع المضيف، الذي يستطيع إلغاء الحجز عند تعذر تقديم التجربة. لا تذهب إلى موعد أُلغي. تأكيد استلام النقد وإتمام الزيارة يتم بعد انتهاء الموعد من الطرفين.", "Bookings reserve seats for the stated slot. Pay cash on arrival; online payments are unavailable. You may cancel up to 48 hours before the slot. Later, contact your host, who can cancel when delivery is impossible. Do not attend a cancelled slot. Both parties confirm the visit and cash payment after the slot ends.")}</p><h2>${t("السلامة والمعلومات", "Safety and information")}</h2><p>${t("المسافات وأوقات القيادة تقديرية وليست حركة مرور مباشرة. راجع الطقس والجهات الرسمية ومواعيد الدخول وتعليمات المضيف قبل السفر. لا تعني مراجعة الهوية ضمان سلامة كل نشاط. يُمنع نشر تجربة لا يملك المضيف القدرة والتصاريح اللازمة لتقديمها.", "Travel distances and driving times are estimates, not live traffic. Check weather, official entry conditions and host instructions before travel. Identity review does not guarantee the safety of every activity. Hosts must have the skills and permissions needed to deliver their experience.")}</p><h2>${t("الدعم المجتمعي", "Community support")}</h2><p>${t("يُخصص 10% من السعر للدعم المجتمعي. المخصص ليس تحويلًا؛ يظهر التمويل المستلم بعد تحقق الإدارة من إيصال للهدف المعتمد. الأرقام المعروضة تعتمد على الحجوزات المؤكدة والسجلات، ولا تتضمن تبرعات وهمية.", "10% of the price is allocated to community support. Allocation is not a transfer; received funding appears only after administration verifies a receipt for an approved goal. Displayed figures use confirmed bookings and records, without fictional donations.")}</p><h2>${t("الدعم", "Support")}</h2><a href="mailto:${ADMIN_EMAIL}">${e(ADMIN_EMAIL)}</a></section>`;
}
async function compress(file, max = 720) {
  if (!file || !file.size) return "";
  if (
    file.size > 5 * 1024 * 1024 ||
    !["image/jpeg", "image/png", "image/webp"].includes(file.type)
  )
    throw new Error("invalid-photo");
  const bitmap = await createImageBitmap(file);
  const scale = Math.min(1, max / Math.max(bitmap.width, bitmap.height));
  const canvas = document.createElement("canvas");
  canvas.width = Math.max(1, Math.round(bitmap.width * scale));
  canvas.height = Math.max(1, Math.round(bitmap.height * scale));
  canvas.getContext("2d").drawImage(bitmap, 0, 0, canvas.width, canvas.height);
  bitmap.close();
  let quality = 0.8,
    out = canvas.toDataURL("image/jpeg", quality);
  while (out.length > 180000 && quality > 0.25) {
    quality -= 0.1;
    out = canvas.toDataURL("image/jpeg", quality);
  }
  if (out.length > 180000) throw new Error("invalid-photo");
  return out;
}
function nextPage() {
  const next = params.get("next");
  return next && routes[next] && !["login", "register", "admin"].includes(next)
    ? next
    : "home";
}
async function bind() {
  bindPlaces();
  form("filters", (data) =>
    go("explore", {
      q: data.get("q"),
      mood: data.get("mood"),
      ...(data.get("hidden") ? { hidden: "1" } : {}),
    }),
  );
  form("experienceFilters", (data) =>
    go("experiences", {
      q: data.get("q"),
      category: data.get("category"),
      place: data.get("place"),
    }),
  );
  form("moodForm", async (data) => {
    await D.save("users", user.uid, {
      travelMood: data.get("mood"),
      ...(view === "onboarding"
        ? { city: data.get("city"), onboardingCompleted: true }
        : {}),
      updatedAt: D.serverTimestamp(),
    });
    go(nextPage(), params.get("id") ? { id: params.get("id") } : {});
  });
  form("authForm", async (data) => {
    if (view === "register") {
      busyRegister = true;
      try {
        const credential = await createUserWithEmailAndPassword(
          auth,
          String(data.get("email")).trim(),
          String(data.get("password")),
        );
        await updateProfile(credential.user, {
          displayName: String(data.get("name")).trim(),
        });
        await D.save("users", credential.user.uid, {
          uid: credential.user.uid,
          email: credential.user.email,
          fullName: credential.user.displayName,
          username: "",
          bio: "",
          city: "",
          photoData: "",
          travelMood: "",
          onboardingCompleted: false,
          createdAt: D.serverTimestamp(),
          updatedAt: D.serverTimestamp(),
        });
        await signOut(auth);
        go("login", { registered: "1" });
      } catch (err) {
        await signOut(auth);
        throw err;
      } finally {
        busyRegister = false;
      }
    } else {
      await setPersistence(auth, browserLocalPersistence);
      await signInWithEmailAndPassword(
        auth,
        String(data.get("email")).trim(),
        String(data.get("password")),
      );
    }
  });
  if ($("#profileForm [name=photo]"))
    $("#profileForm [name=photo]").addEventListener("change", async (ev) => {
      try {
        const src = await compress(ev.target.files[0]);
        if (src) $("#photoPreview").src = src;
      } catch (err) {
        toast(explain(err));
      }
    });
  if (view === "profile")
    act("logout", async () => {
      await signOut(auth);
      go("login");
    });
  form("profileForm", async (data) => {
    const photo = await compress(data.get("photo"));
    await D.save("users", user.uid, {
      uid: user.uid,
      email: user.email,
      fullName: String(data.get("fullName")).trim(),
      username: String(data.get("username")).trim(),
      bio: String(data.get("bio")).trim(),
      city: String(data.get("city")).trim(),
      travelMood: data.get("travelMood"),
      ...(photo ? { photoData: photo } : {}),
      updatedAt: D.serverTimestamp(),
    });
    await updateProfile(user, {
      displayName: String(data.get("fullName")).trim(),
    });
    profile = await D.read("users", user.uid);
    await render();
    toast(t("تم حفظ ملفك.", "Profile saved."));
  });
  act("verify", async () => {
    await sendEmailVerification(user);
    toast(t("تم إرسال رابط تأكيد البريد.", "Verification email sent."));
  });
  act("refreshAuth", async () => {
    await user.reload();
    await user.getIdToken(true);
    user = auth.currentUser;
    await render();
  });
  act("resetPassword", async () => {
    const email = user?.email || $("#authForm [name=email]")?.value;
    if (!email) {
      toast(t("اكتب بريدك في الحقل أولًا.", "Enter your email first."));
      return;
    }
    await sendPasswordResetEmail(auth, email);
    toast(
      t(
        "إذا كان البريد مسجلًا، ستصلك رسالة إعادة تعيين.",
        "If the email is registered, you will receive a reset email.",
      ),
    );
  });
  act("newTrip", () => {
    $("#newTrip").hidden = !$("#newTrip").hidden;
  });
  form("newTrip", async (data) => {
    const r = await D.create("trips", {
      uid: user.uid,
      name: String(data.get("name")).trim(),
      startDate: data.get("date"),
      days: Number(data.get("days")),
      stops: [],
      status: "planned",
      createdAt: D.serverTimestamp(),
      updatedAt: D.serverTimestamp(),
    });
    go("trips", { status: "planned", highlight: r.id });
  });
  act("tripState", async (el) => {
    await D.save("trips", el.dataset.id, {
      status: el.dataset.status,
      updatedAt: D.serverTimestamp(),
    });
    go("trips", { status: el.dataset.status, highlight: el.dataset.id });
  });
  form("tripSettings", async (data) => {
    const days = Number(data.get("days"));
    if (currentTrip.stops.some((s) => s.day >= days)) {
      toast(
        t(
          "احذف أو انقل محطات الأيام الزائدة قبل تقليل أيام الرحلة.",
          "Remove or move stops in extra days before reducing the trip length.",
        ),
      );
      return;
    }
    await D.save("trips", currentTrip.id, {
      name: String(data.get("name")).trim(),
      startDate: data.get("date"),
      days,
      stops: currentTrip.stops,
      updatedAt: D.serverTimestamp(),
    });
    tripDirty = false;
    go("builder", { id: currentTrip.id });
  });
  form("addStop", (data) => {
    if (currentTrip.stops.length >= 200) throw new Error("trip-limit");
    const p = placeById(data.get("place"));
    currentTrip.stops.push({
      id: crypto.randomUUID(),
      placeId: p.id,
      day: currentDay,
      time: "09:00",
      duration: p.minutes,
    });
    dirtyTrip();
    renderStops();
  });
  act("saveTrip", async () => {
    await D.save("trips", currentTrip.id, {
      stops: currentTrip.stops,
      updatedAt: D.serverTimestamp(),
    });
    tripDirty = false;
    $("#tripSaveStatus").textContent = t("تم الحفظ.", "Saved.");
  });
  act("route", () => {
    const stops = currentTrip.stops
      .filter((s) => s.day === currentDay)
      .map((s) => placeById(s.placeId));
    if (!stops.length) {
      toast(t("أضف محطة أولًا.", "Add a stop first."));
      return;
    }
    const coord = (p) => p.lat + "," + p.lng;
    const url =
      stops.length === 1
        ? mapLink(stops[0])
        : "https://www.google.com/maps/dir/?" +
          new URLSearchParams({
            api: "1",
            origin: coord(stops[0]),
            destination: coord(stops.at(-1)),
            travelmode: "driving",
            ...(stops.length > 2
              ? { waypoints: stops.slice(1, -1).map(coord).join("|") }
              : {}),
          });
    window.open(url, "_blank", "noopener,noreferrer");
  });
  act("exportTrip", () => {
    const blob = new Blob(
      [
        JSON.stringify(
          {
            name: currentTrip.name,
            startDate: currentTrip.startDate,
            days: currentTrip.days,
            stops: currentTrip.stops,
          },
          null,
          2,
        ),
      ],
      { type: "application/json" },
    );
    const url = URL.createObjectURL(blob),
      a = document.createElement("a");
    a.href = url;
    a.download = "daleel-trip.json";
    a.click();
    setTimeout(() => URL.revokeObjectURL(url), 1000);
  });
  if (view === "booking" && $("#bookingForm")) {
    const slot = await D.read("slots", params.get("id"));
    $("#bookingForm [name=guests]").addEventListener("input", (ev) => {
      $("#bookingTotal").textContent =
        t("الإجمالي", "Total") +
        ": " +
        price(slot.priceCents * (Number(ev.target.value) || 0));
    });
    form("bookingForm", async (data) => {
      await D.reserve({
        uid: user.uid,
        slotId: slot.id,
        guests: Number(data.get("guests")),
        travelerName: String(data.get("name")).trim(),
      });
      go("trips");
    });
  }
  act("toggleSlot", async (el) => {
    await D.save("slots", el.dataset.id, { open: el.dataset.open === "true" });
    await render();
  });
  act("cancelBooking", async (el) => {
    if (
      !window.confirm(
        t(
          "هل تريد إلغاء الحجز وإعادة المقاعد؟",
          "Cancel this booking and release its seats?",
        ),
      )
    )
      return;
    await D.cancelBooking(el.dataset.id, user.uid);
    await render();
  });
  act("confirmCash", async (el) => {
    if (
      !window.confirm(
        t(
          "أكد فقط إذا تمت الزيارة وتم دفع النقد فعلًا. هل تؤكد؟",
          "Confirm only if the visit occurred and cash was actually paid. Confirm?",
        ),
      )
    )
      return;
    await D.confirmCash(el.dataset.id, el.dataset.host === "true");
    await render();
  });
  act("openReview", (el) => {
    $("#review-" + el.dataset.id).hidden = false;
  });
  all("[data-review]").forEach((f) =>
    form(f.id, async (data) => {
      const b = await D.read("bookings", f.dataset.review);
      await D.reviewBooking(b.id, b, {
        rating: Number(data.get("rating")),
        text: String(data.get("text")).trim(),
      });
      toast(t("تم نشر التقييم.", "Review published."));
      f.hidden = true;
    }),
  );
  act("share", async () => {
    const url = location.origin;
    if (navigator.share) await navigator.share({ title: "Daleel", url });
    else if (navigator.clipboard) {
      await navigator.clipboard.writeText(url);
      toast(t("تم نسخ رابط الموقع.", "Website link copied."));
    } else window.prompt(t("انسخ الرابط", "Copy link"), url);
  });
  form("hostApply", async (data) => {
    await D.save("hostApplications", user.uid, {
      uid: user.uid,
      fullName: String(data.get("fullName")).trim(),
      bio: String(data.get("bio")).trim(),
      phone: String(data.get("phone")).trim(),
      regionId: data.get("regionId"),
      photoData: await compress(data.get("photo")),
      identityData: await compress(data.get("identity"), 1000),
      publishPhone: !!data.get("publicPhone"),
      status: "pending",
      reviewNote: "",
      createdAt: D.serverTimestamp(),
      updatedAt: D.serverTimestamp(),
    });
    await render();
  });
  form("experienceForm", async (data) => {
    const p = placeById(data.get("placeId"));
    await D.create("experiences", {
      hostUid: user.uid,
      titleAr: String(data.get("titleAr")).trim(),
      titleEn: String(data.get("titleEn")).trim(),
      descriptionAr: String(data.get("descriptionAr")).trim(),
      descriptionEn: String(data.get("descriptionEn")).trim(),
      category: data.get("category"),
      placeId: p.id,
      regionId: p.region,
      priceCents: Math.round(Number(data.get("price")) * 100),
      duration: Number(data.get("duration")),
      photoData: await compress(data.get("photo")),
      communityBps: 1000,
      status: "pending",
      createdAt: D.serverTimestamp(),
      updatedAt: D.serverTimestamp(),
    });
    await render();
  });
  all("[data-slots]").forEach((f) =>
    form(f.id, async (data) => {
      const x = await D.read("experiences", f.dataset.slots);
      await D.publishSlots(
        x,
        [data.get("date")],
        data.get("time"),
        Number(data.get("capacity")),
      );
      toast(t("تم نشر الموعد.", "Slot published."));
    }),
  );
  act("approveHost", async (el) => {
    if (
      !window.confirm(
        t(
          "هل تحققت فعليًا من الهوية وموافقة المضيف؟",
          "Have you actually verified the identity and host consent?",
        ),
      )
    )
      return;
    const a = await D.read("hostApplications", el.dataset.id);
    await D.save("hosts", a.id, {
      uid: a.uid,
      fullName: a.fullName,
      bio: a.bio,
      regionId: a.regionId,
      photoData: a.photoData,
      publicPhone: a.publishPhone ? a.phone : "",
      verified: true,
      verifiedAt: D.serverTimestamp(),
    });
    await D.save("hostApplications", a.id, {
      status: "approved",
      reviewNote: $("#reason-" + a.id).value,
      updatedAt: D.serverTimestamp(),
    });
    await render();
  });
  act("rejectHost", async (el) => {
    const reason = $("#reason-" + el.dataset.id).value.trim();
    if (!reason) {
      toast(t("اكتب سبب الرفض.", "Enter the rejection reason."));
      return;
    }
    await D.save("hostApplications", el.dataset.id, {
      status: "rejected",
      reviewNote: reason,
      updatedAt: D.serverTimestamp(),
    });
    await render();
  });
  for (const [action, status] of [
    ["approveExperience", "approved"],
    ["rejectExperience", "rejected"],
  ])
    act(action, async (el) => {
      await D.save("experiences", el.dataset.id, {
        status,
        updatedAt: D.serverTimestamp(),
      });
      await render();
    });
  form("goalForm", async (data) => {
    await D.create("goals", {
      titleAr: String(data.get("titleAr")).trim(),
      titleEn: String(data.get("titleEn")).trim(),
      descriptionAr: String(data.get("descriptionAr")).trim(),
      descriptionEn: String(data.get("descriptionEn")).trim(),
      regionId: data.get("regionId"),
      targetCents: Math.round(Number(data.get("target")) * 100),
      published: true,
      createdAt: D.serverTimestamp(),
    });
    await render();
  });
  all("[data-receipt]").forEach((f) =>
    form(f.id, async (data) => {
      const b = await D.read("bookings", f.dataset.receipt);
      const goalId = data.get("goalId");
      if (!goalId) throw new Error("goal-required");
      await D.save("receiptEvidence", b.id, {
        reference: String(data.get("reference")).trim(),
        recordedBy: user.uid,
        createdAt: D.serverTimestamp(),
      });
      await D.save("contributions", b.id, {
        bookingId: b.id,
        goalId,
        amountCents: b.communityCents,
        status: "received",
        createdAt: D.serverTimestamp(),
      });
      await render();
    }),
  );
  if (view === "builder") renderStops();
}
const protectedViews = [
  "trips",
  "builder",
  "booking",
  "impact",
  "profile",
  "mood",
  "onboarding",
  "hostDashboard",
  "admin",
];
const renderers = {
  landing,
  home,
  explore,
  place,
  experiences,
  experience,
  host,
  trips,
  builder,
  booking,
  impact,
  goals,
  profile: account,
  login: () => authentication(false),
  register: () => authentication(true),
  mood: () => mood(false),
  onboarding: () => mood(true),
  hostDashboard,
  admin: administration,
  policy,
};
let renderSequence = 0;
async function render() {
  const seq = ++renderSequence;
  shell();
  if (protectedViews.includes(view) && !requireLogin()) return;
  $("#main").setAttribute("aria-busy", "true");
  try {
    const html = await renderers[view]();
    if (seq !== renderSequence) return;
    $("#main").innerHTML = html;
    document.title = t(
      "دليل | رحلة من أهل المكان",
      "Daleel | Travel with local people",
    );
    await bind();
  } catch (err) {
    console.error(err);
    $("#main").innerHTML =
      `<section class="panel"><h1>${t("تعذّر تحميل الصفحة", "Could not load this page")}</h1><p role="alert">${e(explain(err))}</p>${button(t("حاول مرة أخرى", "Retry"), "retry")}${anchor(t("العودة للاستكشاف", "Back to explore"), "explore")}</section>`;
    act("retry", render);
  } finally {
    $("#main").removeAttribute("aria-busy");
  }
}
window.addEventListener("beforeunload", (event) => {
  if (tripDirty) {
    event.preventDefault();
    event.returnValue = "";
  }
});
window.addEventListener("offline", () =>
  toast(
    t(
      "انقطع الإنترنت. آخر تعديل غير محفوظ يحتاج إعادة المحاولة عند الاتصال.",
      "Offline. Retry unsaved changes after reconnecting.",
    ),
  ),
);
let initialized = false;
onAuthStateChanged(auth, async (current) => {
  if (busyRegister) return;
  user = current;
  try {
    profile = current ? await D.read("users", current.uid) : null;
    if (current && !profile) {
      await D.save("users", current.uid, {
        uid: current.uid,
        email: current.email,
        fullName: current.displayName || "Daleel traveler",
        username: "",
        bio: "",
        city: "",
        photoData: "",
        travelMood: "",
        onboardingCompleted: false,
        createdAt: D.serverTimestamp(),
        updatedAt: D.serverTimestamp(),
      });
      profile = await D.read("users", current.uid);
    }
    if (profile) {
      const legacy = {
        مغامرة: "adventure",
        "هدوء وتأمل": "calm",
        "طعام وثقافة": "food",
        تصوير: "photo",
      };
      if (legacy[profile.travelMood])
        profile.travelMood = legacy[profile.travelMood];
    }
    if (current && view === "login") {
      if (profile?.onboardingCompleted === false)
        go("onboarding", {
          next: nextPage(),
          ...(params.get("id") ? { id: params.get("id") } : {}),
        });
      else go(nextPage(), params.get("id") ? { id: params.get("id") } : {});
      return;
    }
    if (current && view === "register") {
      go("home");
      return;
    }
    initialized = true;
    await render();
  } catch (err) {
    console.error(err);
    initialized = true;
    shell();
    $("#main").innerHTML =
      `<section class="panel"><h1>${t("تعذر الوصول لبيانات الحساب", "Cannot load account data")}</h1><p>${e(explain(err))}</p>${button(t("تسجيل الخروج", "Sign out"), "logout")}${button(t("إعادة المحاولة", "Retry"), "retry")}</section>`;
    act("logout", async () => {
      await signOut(auth);
      go("login");
    });
    act("retry", () => location.reload());
  }
});
setTimeout(() => {
  if (!initialized) {
    $("#main").innerHTML =
      `<section class="panel"><p>${t("تأخر الاتصال. تحقق من الإنترنت ثم أعد التحميل.", "Connection is taking longer. Check your internet and reload.")}</p>${button(t("إعادة التحميل", "Reload"), "reload")}</section>`;
    act("reload", () => location.reload());
  }
}, 15000);
