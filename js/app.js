// js/app.js
import { SCHEDULE } from "../data/schedule.js";

const state = {
  group: "fbs25b",      // fbs25b | fba25b
  subgroup: "subgroup1",// subgroup1 | subgroup2 (лише для fbs25b)
  week: "numerator",    // numerator | denominator (кнопки можна не показувати)
  englishTeacher: "",   // вибраний викладач англійської
  latinTeacher: ""      // вибраний викладач латини
};

// Дані про викладачів
const teachers = {
  "english_gavrylyshyn": { name: "Гаврилишин І.", room: "210 ауд.", subject: "Англійська мова" },
  "english_sarabin": { name: "Сарабін О.", room: "208 ауд.", subject: "Англійська мова" },
  "english_rudeyko": { name: "Рудейко Н.", room: "305 ауд.", subject: "Англійська мова" },
  "latin_vynar": { name: "Винар С.", room: "210 ауд.", subject: "Латинська мова" },
  "latin_lemik": { name: "Лемик І.", room: "103 ауд.", subject: "Латинська мова" }
};

const groupTitle = document.querySelector("#groupTitle");
const groupSwitch = document.querySelector("#groupSwitch");
const subgroupSwitch = document.querySelector("#subgroupSwitch");
const btnRefresh = document.querySelector("#btnRefresh");
const englishTeacherSelect = document.querySelector("#englishTeacherSelect");
const latinTeacherSelect = document.querySelector("#latinTeacherSelect");

// Відновлюємо збережений вибір групи/підгрупи ще до рендеру
const savedGroup = localStorage.getItem("group");
if (savedGroup === "fbs25b" || savedGroup === "fba25b") {
  state.group = savedGroup;
}

const savedSubgroup = localStorage.getItem("subgroup");
if (savedSubgroup === "subgroup1" || savedSubgroup === "subgroup2") {
  state.subgroup = savedSubgroup;
}

// Часові слоти для пар
const timeSlots = {
  1: { start: "8:30", end: "9:50" },
  2: { start: "10:10", end: "11:30" },
  3: { start: "11:50", end: "13:10" },
  "break1": { start: "14:15", end: "15:35" },
  4: { start: "15:45", end: "17:05" }
};

// Назви днів тижня
const dayNames = {
  mon: "Понеділок",
  tue: "Вівторок",
  wed: "Середа",
  thu: "Четвер",
  fri: "П'ятниця"
};

const daysOrder = ["mon", "tue", "wed", "thu", "fri"];

function lessonTypeLabel(type) {
  if (type === "lecture") return "Лекція";
  if (type === "lab") return "Семінар";
  if (type === "practice") return "Практика";
  return "";
}

// =========================================================
//   АВТОМАТИЧНА ЛОГІКА ТИЖНІВ (РОТАЦІЯ ПОНЕДІЛКА ДЛЯ ФБС)
//   ─ тільки для групи fbs25b
//   ─ змінюється ЛИШЕ понеділок, решта днів не чіпаємо
//   ─ weekIndex рахуємо від першого тижня навчання
// =========================================================

// Перший тиждень навчання: 19–25 січня 2026 (weekIndex = 0)
const WEEK1_START = new Date(2026, 0, 19); // локальний час

function startOfDay(d) {
  return new Date(d.getFullYear(), d.getMonth(), d.getDate());
}

function getWeekIndex(now = new Date()) {
  const msPerDay = 24 * 60 * 60 * 1000;
  const diffDays = Math.floor((startOfDay(now) - startOfDay(WEEK1_START)) / msPerDay);
  if (diffDays < 0) return 0;
  return Math.floor(diffDays / 7);
}

const LIT_SPIV = {
  subject: "Літургійний спів",
  teacher: "Юсипів с. Т.",
  // room свідомо не заповнюємо – аудиторію можна вказати в базовому розкладі
  room: "",
  type: "lab",
};

const CERK_SLOV = {
  subject: "Церковнослов'янська мова",
  teacher: "Лазор О.",
  room: "204ЛДС",
  type: "lab",
};

function applyMondayRotation(data) {
  if (state.group !== "fbs25b") return data;
  if (!data?.mon) return data;

  const weekIndex = getWeekIndex(new Date());
  const evenWeek = weekIndex % 2 === 0; // 19–25 січня = evenWeek

  // Працюємо лише з поточною підгрупою (state.subgroup)
  const monPairs = data.mon ?? {};

  // Helper to set/remove lesson
  const set = (key, lessonOrNull) => {
    if (lessonOrNull) monPairs[key] = lessonOrNull;
    else delete monPairs[key];
  };

  if (evenWeek) {
    // Week 0: І підгрупа має 3 пару Літ. спів, break1 Церк.-слов; ІІ підгрупа має break1 Літ. спів і 4 пару Церк.-слов
    if (state.subgroup === "subgroup1") {
      set("3", { ...LIT_SPIV });
      set("break1", { ...CERK_SLOV });
      set("4", null);
    } else {
      set("3", null);
      set("break1", { ...LIT_SPIV });
      set("4", { ...CERK_SLOV });
    }
  } else {
    // Next week: навпаки
    if (state.subgroup === "subgroup1") {
      set("3", null);
      set("break1", { ...LIT_SPIV });
      set("4", { ...CERK_SLOV });
    } else {
      set("3", { ...LIT_SPIV });
      set("break1", { ...CERK_SLOV });
      set("4", null);
    }
  }

  data.mon = monPairs;
  return data;
}

function setActive(container, selector) {
  if (!container) return;
  container.querySelectorAll(".pill").forEach(b => b.classList.remove("active"));
  const el = container.querySelector(selector);
  if (el) el.classList.add("active");
}

function getCurrentData() {
  const g = SCHEDULE[state.group];
  if (!g) {
    console.warn(`Група ${state.group} не знайдена в розкладі`);
    return {};
  }

  let data = {};
  
  // ФБС має підгрупи
  if (state.group === "fbs25b") {
    const subgroupData = g?.[state.subgroup];
    if (!subgroupData) {
      console.warn(`Підгрупа ${state.subgroup} не знайдена для ${state.group}`);
      return {};
    }
    data = JSON.parse(JSON.stringify(subgroupData?.[state.week] ?? {}));
  } else {
    // ФБА без підгруп
    const weekData = g?.[state.week];
    if (!weekData) {
      console.warn(`Тиждень ${state.week} не знайдено для ${state.group}`);
      return {};
    }
    data = JSON.parse(JSON.stringify(weekData ?? {}));
  }

  // Замінюємо викладачів та аудиторії, якщо вибрано
  for (const day of Object.keys(data)) {
    const pairs = data[day];
    if (!pairs) continue;
    
    for (const pair of Object.keys(pairs)) {
      const lesson = pairs[pair];
      if (!lesson) continue;
      
      // Замінюємо для англійської мови
      if (lesson.subject === "Англійська мова" && state.englishTeacher && teachers[state.englishTeacher]) {
        const teacher = teachers[state.englishTeacher];
        lesson.teacher = teacher.name;
        lesson.room = teacher.room;
      }
      
      // Замінюємо для латинської мови
      if (lesson.subject === "Латинська мова" && state.latinTeacher && teachers[state.latinTeacher]) {
        const teacher = teachers[state.latinTeacher];
        lesson.teacher = teacher.name;
        lesson.room = teacher.room;
      }
    }
  }

  // Автоматична ротація понеділка (лише для ФБС)
  return applyMondayRotation(data);
}

function updateUI() {
  // заголовок з анімацією
  if (groupTitle) {
    groupTitle.style.opacity = "0";
    groupTitle.style.transform = "translateY(-5px)";
    
    setTimeout(() => {
      const depName = state.group === "fbs25b" ? "ФБС25/Б" : "ФБА25/Б";
      groupTitle.textContent = depName;

      // Адаптивний текст вкладки браузера – показує поточне відділення
      document.title = `${depName} – розклад`;
      groupTitle.style.transition = "all 0.3s ease";
      groupTitle.style.opacity = "1";
      groupTitle.style.transform = "translateY(0)";
    }, 100);
  }

  // підгрупи показуємо тільки для ФБС з анімацією
  if (subgroupSwitch) {
    if (state.group === "fbs25b") {
      subgroupSwitch.classList.remove("hidden");
    } else {
      subgroupSwitch.classList.add("hidden");
    }
  }

  // активні кнопки
  setActive(groupSwitch, `[data-group="${state.group}"]`);
  if (state.group === "fbs25b") {
    setActive(subgroupSwitch, `[data-subgroup="${state.subgroup === "subgroup1" ? "1" : "2"}"]`);
  }
}

function clearCells() {
  document
    .querySelectorAll('td[data-day][data-pair]')
    .forEach(td => {
      td.innerHTML = "";
    });
}

function renderMobileSchedule() {
  const mobileSchedule = document.querySelector("#mobileSchedule .mobile-days-wrapper");
  if (!mobileSchedule) return;

  const data = getCurrentData();
  if (!data) {
    mobileSchedule.innerHTML = "";
    return;
  }

  mobileSchedule.innerHTML = "";

  // Визначаємо сьогоднішній день
  const today = new Date();
  const dayOfWeek = today.getDay(); // 0 = неділя, 1 = понеділок, ..., 5 = п'ятниця
  const dayMap = { 1: "mon", 2: "tue", 3: "wed", 4: "thu", 5: "fri" };
  const todayDayKey = dayMap[dayOfWeek];
  let todayElement = null;

  // Створюємо картки для кожного дня
  daysOrder.forEach(day => {
    const dayData = data[day];
    if (!dayData || Object.keys(dayData).length === 0) return;

    const dayDiv = document.createElement("div");
    dayDiv.className = "mobile-day";
    
    // Позначаємо сьогоднішній день
    if (day === todayDayKey) {
      dayDiv.classList.add("mobile-day-today");
      todayElement = dayDiv;
    }

    const dayTitle = document.createElement("h2");
    dayTitle.className = "mobile-day-title";
    dayTitle.textContent = dayNames[day];
    dayDiv.appendChild(dayTitle);

    const lessonsDiv = document.createElement("div");
    lessonsDiv.className = "mobile-lessons";

    // Сортуємо пари за номером (з урахуванням break1)
    const sortedPairs = Object.keys(dayData).sort((a, b) => {
      if (a === "break1") return 3.5; // break1 після пари 3
      if (b === "break1") return -3.5;
      const numA = parseInt(a) || 0;
      const numB = parseInt(b) || 0;
      return numA - numB;
    });

    sortedPairs.forEach(pairNum => {
      const lesson = dayData[pairNum];
      if (!lesson) return;

      const timeSlot = timeSlots[pairNum] || { start: "", end: "" };
      const card = document.createElement("div");
      card.className = `mobile-lesson-card ${lesson.type || ""}`;

      // Для рядків без номера пари (break1) не показуємо номер
      const pairDisplay = pairNum === "break1" ? "" : pairNum;

      card.innerHTML = `
        <div class="mobile-lesson-header">
          ${pairDisplay ? `<span class="mobile-lesson-pair">${pairDisplay}</span>` : ""}
          <span class="mobile-lesson-time">${timeSlot.start} - ${timeSlot.end}</span>
        </div>
        <div class="mobile-lesson-title">${lesson.subject ?? ""}</div>
        <div class="mobile-lesson-meta">${lesson.teacher ?? ""}${lesson.room ? ", " + lesson.room : ""}</div>
        <div class="mobile-lesson-type">${lessonTypeLabel(lesson.type)}</div>
      `;

      lessonsDiv.appendChild(card);
    });

    dayDiv.appendChild(lessonsDiv);
    mobileSchedule.appendChild(dayDiv);
  });

  // Прокручуємо до сьогоднішнього дня
  if (todayElement) {
    setTimeout(() => {
      todayElement.scrollIntoView({ behavior: 'smooth', block: 'start' });
    }, 100);
  }
}

function renderSchedule() {
  updateUI();
  clearCells();

  const data = getCurrentData();
  if (!data) return;

  // Рендеримо десктопну версію (таблицю)
  for (const day of Object.keys(data)) {
    const pairs = data[day];
    if (!pairs) continue;

    for (const pair of Object.keys(pairs)) {
      const lesson = pairs[pair];
      if (!lesson) continue;

      const cell = document.querySelector(
        `td[data-day="${day}"][data-pair="${pair}"]`
      );
      if (!cell) continue;

      cell.innerHTML = `
        <div class="lesson ${lesson.type || ""}">
          <div class="lesson-bar"></div>
          <div class="lesson-content">
            <div class="lesson-title">${lesson.subject ?? ""}</div>
            <div class="lesson-meta">${lesson.teacher ?? ""}${lesson.room ? ", " + lesson.room : ""}</div>
            <div class="lesson-type">${lessonTypeLabel(lesson.type)}</div>
          </div>
        </div>
      `;
    }
  }

  // Рендеримо мобільну версію (картки)
  renderMobileSchedule();
}

// ===== Events =====

// група ФБС/ФБА
if (groupSwitch) {
  groupSwitch.addEventListener("click", (e) => {
    const btn = e.target.closest("[data-group]");
    if (!btn) return;

    state.group = btn.dataset.group;
    localStorage.setItem("group", state.group);

    // якщо перемкнули на ФБА — підгрупи неактуальні
    if (state.group !== "fbs25b") {
      state.subgroup = "subgroup1";
      localStorage.setItem("subgroup", state.subgroup);
    }

    renderSchedule();
  });
}

// підгрупа 1/2
if (subgroupSwitch) {
  subgroupSwitch.addEventListener("click", (e) => {
    const btn = e.target.closest("[data-subgroup]");
    if (!btn) return;

    state.subgroup = btn.dataset.subgroup === "2" ? "subgroup2" : "subgroup1";
    localStorage.setItem("subgroup", state.subgroup);
    renderSchedule();
  });
}

// “Оновити”
if (btnRefresh) {
  btnRefresh.addEventListener("click", () => renderSchedule());
}

// Випадаючі списки викладачів
if (englishTeacherSelect) {
  // Завантажуємо збережений вибір
  const savedEnglishTeacher = localStorage.getItem("englishTeacher");
  if (savedEnglishTeacher) {
    englishTeacherSelect.value = savedEnglishTeacher;
    state.englishTeacher = savedEnglishTeacher;
  }
  
  // Обробник зміни викладача англійської
  englishTeacherSelect.addEventListener("change", (e) => {
    state.englishTeacher = e.target.value;
    localStorage.setItem("englishTeacher", e.target.value);
    renderSchedule();
  });
}

if (latinTeacherSelect) {
  // Завантажуємо збережений вибір
  const savedLatinTeacher = localStorage.getItem("latinTeacher");
  if (savedLatinTeacher) {
    latinTeacherSelect.value = savedLatinTeacher;
    state.latinTeacher = savedLatinTeacher;
  }
  
  // Обробник зміни викладача латини
  latinTeacherSelect.addEventListener("change", (e) => {
    state.latinTeacher = e.target.value;
    localStorage.setItem("latinTeacher", e.target.value);
    renderSchedule();
  });
}

// init
renderSchedule();
