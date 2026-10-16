/**
 * ИС Образовательного Центра "DevSphere"
 * Разработка: Коровин Д.Ю., группа ВТ-1-24
 */

// Базовые данные по умолчанию согласно практической работе №1
const DEFAULT_DATA = {
  "students": [
    {
      "id": 1,
      "name": "Студент 1",
      "birthDate": "",
      "phone": "",
      "email": "",
      "regDate": "2026-09-01"
    },
    {
      "id": 2,
      "name": "Студент 2",
      "birthDate": "",
      "phone": "",
      "email": "",
      "regDate": "2026-09-02"
    },
    {
      "id": 3,
      "name": "Студент 3",
      "birthDate": "",
      "phone": "",
      "email": "",
      "regDate": "2026-09-03"
    }
  ],
  "teachers": [
    {
      "id": 1,
      "name": "Ченцов А.М.",
      "spec": "Веб-разработка, архитектура информационных систем",
      "phone": "",
      "email": "",
      "exp": "12 лет"
    },
    {
      "id": 2,
      "name": "Михайлов С.В.",
      "spec": "Базы данных (SQL, NoSQL), серверное ПО",
      "phone": "",
      "email": "",
      "exp": "8 лет"
    }
  ],
  "courses": [
    {
      "id": 1,
      "name": "Разработка информационных ресурсов",
      "desc": "Проектирование и создание масштабируемых веб-приложений с использованием программных платформ.",
      "duration": "72 ак. часа",
      "price": 34000,
      "teacherId": 1
    },
    {
      "id": 2,
      "name": "Проектирование и администрирование баз данных",
      "desc": "Реляционные модели, проектирование таблиц, написание сложных запросов и индексов.",
      "duration": "54 ак. часа",
      "price": 28000,
      "teacherId": 2
    },
    {
      "id": 3,
      "name": "Frontend: JavaScript & TypeScript",
      "desc": "Современные скриптовые языки, реактивные паттерны, архитектура веб-интерфейсов.",
      "duration": "80 ак. часов",
      "price": 39000,
      "teacherId": 1
    }
  ],
  "groups": [
    {
      "id": 1,
      "name": "ВТ-1-24",
      "courseId": 1,
      "teacherId": 1,
      "startDate": "2026-09-01",
      "endDate": "2026-12-25"
    },
    {
      "id": 2,
      "name": "БД-2-24",
      "courseId": 2,
      "teacherId": 2,
      "startDate": "2026-10-01",
      "endDate": "2026-12-30"
    }
  ],
  "enrollments": [
    {
      "id": 1,
      "studentId": 1,
      "groupId": 1,
      "enrollDate": "2026-09-01"
    },
    {
      "id": 2,
      "studentId": 2,
      "groupId": 1,
      "enrollDate": "2026-09-02"
    },
    {
      "id": 3,
      "studentId": 3,
      "groupId": 2,
      "enrollDate": "2026-09-03"
    }
  ],
  "schedules": [
    {
      "id": 1,
      "date": "2026-10-06",
      "startTime": "09:00",
      "endTime": "10:30",
      "groupId": 1,
      "teacherId": 1,
      "room": "Ауд. 302 (Лаборатория веб-разработки)"
    },
    {
      "id": 2,
      "date": "2026-10-06",
      "startTime": "10:40",
      "endTime": "12:10",
      "groupId": 1,
      "teacherId": 1,
      "room": "Ауд. 302 (Лаборатория веб-разработки)"
    },
    {
      "id": 3,
      "date": "2026-10-07",
      "startTime": "13:00",
      "endTime": "14:30",
      "groupId": 2,
      "teacherId": 2,
      "room": "Ауд. 214 (Серверный класс)"
    }
  ],
  "feedback": []
};

// Класс взаимодействия с серверным API
class ApiStorage {
  constructor() {
    this.data = JSON.parse(JSON.stringify(DEFAULT_DATA));
  }

  async request(url, options = {}) {
    const response = await fetch(url, {
      headers: { "Content-Type": "application/json", ...(options.headers || {}) },
      ...options
    });

    if (!response.ok) {
      const answer = await response.json().catch(() => ({}));
      throw new Error(answer.error || `Ошибка API: ${response.status}`);
    }

    if (response.status === 204) return null;
    const result = await response.json();
    if (url === "/api/data") this.version = result._version;
    return result;
  }

  async load() {
    this.data = await this.request("/api/data");
    return this.data;
  }

  get() {
    return this.data;
  }

  async save(data) {
    this.data = JSON.parse(JSON.stringify(data));
    this.data = await this.request("/api/data", {
      method: "PUT",
      body: JSON.stringify({...this.data, _version: this.version})
    });
    return this.data;
  }

  async reset() {
    this.data = await this.request("/api/reset", { method: "POST" });
    return this.data;
  }
}

// Главный контроллер приложения
class App {
  constructor() {
    this.storage = new ApiStorage();
    this.currentRole = "guest";
    this.currentAdminTab = "students";
    this.initElements();
    this.initialize();
  }

  async initialize() {
    try {
      await this.storage.load();
    } catch (error) {
      alert(`Не удалось загрузить данные с сервера: ${error.message}`);
    }
    this.attachEvents();
    this.renderAll();
    this.labelFormFields(document);
    this.observeSections();
    this.experience = new SiteExperience(this);
  }

  initElements() {
    this.roleSelect = document.getElementById("roleSelect");
    this.cabinetNavItem = document.getElementById("cabinetNavItem");
    this.adminNavItem = document.getElementById("adminNavItem");
    this.navLinks = document.querySelectorAll("[data-nav]");
    this.pageViews = document.querySelectorAll(".page-view");
    this.menuToggle = document.getElementById("menuToggle");
    this.navLinksContainer = document.getElementById("navLinks");
    this.genericModal = document.getElementById("genericModal");
    this.modalForm = document.getElementById("modalForm");
  }

  attachEvents() {
    this.navLinks.forEach(link => {
      link.addEventListener("click", (e) => {
        e.preventDefault();
        const target = link.dataset.nav;
        this.navigateTo(target);
      });
    });

    this.menuToggle.addEventListener("click", () => {
      const open = this.navLinksContainer.classList.toggle("open");
      this.menuToggle.setAttribute("aria-expanded", String(open));
    });

    document.getElementById("heroMotionToggle").addEventListener("click", (e) => {
      const paused = document.querySelector(".hero").classList.toggle("motion-paused");
      e.currentTarget.setAttribute("aria-pressed", String(paused));
      e.currentTarget.setAttribute("aria-label", paused ? "Продолжить анимацию" : "Остановить анимацию");
      e.currentTarget.textContent = paused ? "Продолжить" : "Пауза";
    });

    this.roleSelect.addEventListener("change", (e) => {
      this.currentRole = e.target.value;
      this.updateRoleView();
    });

    document.getElementById("navEnrollBtn").addEventListener("click", () => this.openEnrollModal());

    document.getElementById("scheduleDateFilter").addEventListener("change", () => this.renderSchedule());
    document.getElementById("scheduleGroupFilter").addEventListener("change", () => this.renderSchedule());
    document.getElementById("resetScheduleFilters").addEventListener("click", () => {
      document.getElementById("scheduleDateFilter").value = "";
      document.getElementById("scheduleGroupFilter").value = "";
      this.renderSchedule();
    });

    document.getElementById("courseSearch").addEventListener("input", (e) => {
      this.renderCourses(e.target.value.trim().toLowerCase());
    });

    document.querySelectorAll(".tab-btn").forEach(btn => {
      btn.addEventListener("click", (e) => {
        document.querySelectorAll(".tab-btn").forEach(b => b.classList.remove("active"));
        btn.classList.add("active");
        this.currentAdminTab = btn.dataset.tab;
        this.renderAdminTable();
      });
    });

    document.getElementById("adminRefreshBtn").addEventListener("click", async () => {
      try { await this.storage.load(); this.renderAll(); this.renderAdminTable(); }
      catch (error) { alert(error.message); }
    });
    document.getElementById("adminAddRecordBtn").addEventListener("click", () => this.openAdminAddModal());
    document.getElementById("adminResetBtn").addEventListener("click", async () => {
      if (confirm("Сбросить все данные к исходным демонстрационным?")) {
        try {
          await this.storage.reset();
          this.renderAdminTable();
          this.renderAll();
          alert("База данных возвращена в исходное состояние.");
        } catch (error) {
          alert(`Ошибка сброса данных: ${error.message}`);
        }
      }
    });
    document.getElementById("adminExportBtn").addEventListener("click", () => {
      const dataStr = "data:text/json;charset=utf-8," + encodeURIComponent(JSON.stringify(this.storage.get(), null, 2));
      const downloadAnchor = document.createElement("a");
      downloadAnchor.setAttribute("href", dataStr);
      downloadAnchor.setAttribute("download", "educational_center_db.json");
      document.body.appendChild(downloadAnchor);
      downloadAnchor.click();
      downloadAnchor.remove();
    });

    this.genericModal.addEventListener("click", e => {
      if (e.target === this.genericModal) this.closeModal();
    });
    document.addEventListener("keydown", e => {
      if (!this.genericModal.classList.contains("open")) return;
      if (e.key === "Escape") this.closeModal();
      if (e.key === "Tab") {
        const items = [...this.genericModal.querySelectorAll('button, input, select, textarea')].filter(el => !el.disabled && el.offsetParent !== null);
        const first = items[0], last = items.at(-1);
        if (e.shiftKey && document.activeElement === first) { e.preventDefault(); last.focus(); }
        else if (!e.shiftKey && document.activeElement === last) { e.preventDefault(); first.focus(); }
      }
    });
    document.getElementById("modalCloseBtn").addEventListener("click", () => this.closeModal());
    document.getElementById("modalCancelBtn").addEventListener("click", () => this.closeModal());
    
    document.getElementById("feedbackForm").addEventListener("submit", async (e) => {
      e.preventDefault();
      const form = new FormData(e.target);
      try {
        await this.storage.request("/api/feedback", {
          method: "POST",
          body: JSON.stringify({
            name: form.get("name"),
            email: form.get("email"),
            message: form.get("message"),
            createdAt: new Date().toISOString()
          })
        });
        await this.storage.load();
        alert("Благодарим за обращение! Сообщение сохранено на сервере.");
        e.target.reset();
      } catch (error) {
        alert(`Не удалось отправить обращение: ${error.message}`);
      }
    });
  }

  navigateTo(pageId) {
    this.pageViews.forEach(page => {
      page.classList.remove("active");
      if (page.id === `page-${pageId}`) {
        page.classList.add("active");
      }
    });

    this.navLinks.forEach(link => {
      link.classList.remove("active");
      link.removeAttribute("aria-current");
      if (link.dataset.nav === pageId) {
        link.setAttribute("aria-current", "page");
        link.classList.add("active");
      }
    });

    this.navLinksContainer.classList.remove("open");
    this.menuToggle.setAttribute("aria-expanded", "false");
    window.scrollTo({ top: 0, behavior: window.matchMedia("(prefers-reduced-motion: reduce)").matches ? "auto" : "smooth" });
  }

  updateRoleView() {
    this.cabinetNavItem.classList.add("hidden");
    this.adminNavItem.classList.add("hidden");

    if (this.currentRole === "student" || this.currentRole === "teacher") {
      this.cabinetNavItem.classList.remove("hidden");
      this.renderCabinet();
      this.navigateTo("cabinet");
    } else if (this.currentRole === "admin") {
      this.adminNavItem.classList.remove("hidden");
      this.renderAdminTable();
      this.navigateTo("admin");
    } else {
      this.navigateTo("home");
    }
  }

  scrollToSection(id) {
    document.getElementById(id)?.scrollIntoView({ behavior: window.matchMedia('(prefers-reduced-motion: reduce)').matches ? 'auto' : 'smooth' });
  }

  labelFormFields(scope) {
    scope.querySelectorAll('.form-group').forEach((group, index) => {
      const field = group.querySelector('input, select, textarea');
      const label = group.querySelector('label');
      if (!field || !label) return;
      if (!field.id) field.id = `${scope === document ? 'page' : 'modal'}-field-${index}`;
      label.htmlFor = field.id;
    });
  }

  observeSections() {
    if (!('IntersectionObserver' in window) || window.matchMedia('(prefers-reduced-motion: reduce)').matches) return;
    const hero = document.querySelector('.hero');
    const heroObserver = new IntersectionObserver(entries => {
      hero.classList.toggle('motion-outside', !entries[0].isIntersecting);
    }, { threshold: 0 });
    heroObserver.observe(hero);
    const observer = new IntersectionObserver(entries => entries.forEach(entry => {
      if (!entry.isIntersecting) return;
      entry.target.classList.add('reveal-in');
      observer.unobserve(entry.target);
    }), { threshold: 0.1 });
    document.querySelectorAll('.learning-intro, .programs-section, .tools-section, .cta-section').forEach(el => observer.observe(el));
  }

  renderAll() {
    const data = this.storage.get();
    document.getElementById('courseCount').textContent = String(data.courses.length).padStart(2, '0');
    document.getElementById('teacherCount').textContent = String(data.teachers.length).padStart(2, '0');
    document.getElementById('groupCount').textContent = String(data.groups.length).padStart(2, '0');
    this.renderCourses();
    this.renderTeachers();
    this.populateScheduleFilters();
    this.renderSchedule();
    this.experience?.refresh();
  }

  renderCourses(searchQuery = "") {
    const data = this.storage.get();
    const filtered = data.courses.filter(c => 
      c.name.toLowerCase().includes(searchQuery) || c.desc.toLowerCase().includes(searchQuery)
    );

    const teachers = new Map(data.teachers.map(t => [t.id, t]));
    const template = (c, index) => {
      const teacher = teachers.get(c.teacherId);
      const themes = ['web', 'data', 'frontend'];
      const symbols = ['&lt;/&gt;', '{ }', 'JS'];
      const theme = index % 3;
      return `
        <div class="course-card">
          <div class="course-cover cover-${themes[theme]}" aria-hidden="true"><span>ПРОГРАММА / ${String(index + 1).padStart(2, "0")}</span><strong>${symbols[theme]}</strong><span class="cover-orbit"></span><small>DEVSPHERE</small></div>
          <div class="course-description">
            <h3>${c.name}</h3>
            <p style="color: var(--text-muted); font-size: 1rem; margin-top: 0.5rem;">${c.desc}</p>
            <div style="margin-top: 1rem; font-size: 0.95rem;">
              <div><i class="fa-regular fa-clock"></i> ${c.duration}</div>
              <div style="margin-top: 0.25rem;"><i class="fa-solid fa-chalkboard-user"></i> ${teacher ? teacher.name : "Не назначен"}</div>
            </div>
          </div>
          <div>
            <div class="course-price">${c.price.toLocaleString("ru-RU")} ₽</div>
            <button class="btn btn-outline" style="width: 100%;" onclick="app.openEnrollModal(${c.id})">Записаться</button>
          </div>
        </div>
      `;
    };

    if (searchQuery === "") document.getElementById("homeCoursesList").innerHTML = data.courses.slice(0, 3).map(template).join("");
    document.getElementById("allCoursesList").innerHTML = filtered.map(c => template(c, data.courses.indexOf(c))).join("") || `<div class="empty-state"><h3>Курс не найден</h3><p>Попробуй другое название или очисти строку поиска.</p></div>`;
  }

  renderTeachers() {
    const data = this.storage.get();
    const list = document.getElementById("teachersList");
    list.innerHTML = data.teachers.map(t => {
      const teacherCourses = data.courses.filter(c => c.teacherId === t.id).map(c => c.name);
      return `
        <div class="teacher-card">
          <div class="teacher-avatar-placeholder">
            <i class="fa-solid fa-chalkboard-user"></i>
          </div>
          <h3>${t.name}</h3>
          <p style="color: var(--primary); font-size: 0.95rem; font-weight: 600;">${t.spec}</p>
          <p style="margin: 0.5rem 0; font-size: 0.95rem; color: var(--text-muted);">Стаж работы: ${t.exp}</p>
          <div style="font-size: 0.95rem;">
            <strong>Дисциплины:</strong>
            <ul style="padding-left: 1.2rem; margin-top: 0.25rem;">
              ${teacherCourses.map(c => `<li>${c}</li>`).join("")}
            </ul>
          </div>
        </div>
      `;
    }).join("");
  }

  populateScheduleFilters() {
    const data = this.storage.get();
    const select = document.getElementById("scheduleGroupFilter");
    select.innerHTML = `<option value="">Все учебные группы</option>` + 
      data.groups.map(g => `<option value="${g.id}">${g.name}</option>`).join("");
  }

  renderSchedule() {
    const data = this.storage.get();
    const dateVal = document.getElementById("scheduleDateFilter").value;
    const groupVal = document.getElementById("scheduleGroupFilter").value;

    const filtered = data.schedules.filter(s => {
      const matchDate = !dateVal || s.date === dateVal;
      const matchGroup = !groupVal || s.groupId.toString() === groupVal;
      return matchDate && matchGroup;
    });

    const tbody = document.getElementById("scheduleTableBody");
    if (filtered.length === 0) {
      tbody.innerHTML = `<tr><td colspan="6" style="text-align: center; color: var(--text-muted);">Занятия по выбранным параметрам не найдены</td></tr>`;
      return;
    }

    tbody.innerHTML = filtered.map(s => {
      const group = data.groups.find(g => g.id === s.groupId);
      const course = group ? data.courses.find(c => c.id === group.courseId) : null;
      const teacher = data.teachers.find(t => t.id === s.teacherId);

      return `
        <tr>
          <td><strong>${s.date}</strong></td>
          <td>${s.startTime} - ${s.endTime}</td>
          <td>${course ? course.name : "—"}</td>
          <td><span class="pill-badge" style="margin:0;">${group ? group.name : "—"}</span></td>
          <td>${teacher ? teacher.name : "—"}</td>
          <td>${s.room}</td>
        </tr>
      `;
    }).join("");
  }

  renderCabinet() {
    const data = this.storage.get();
    const card = document.getElementById("cabinetProfileCard");
    const content = document.getElementById("cabinetCustomContent");

    if (this.currentRole === "student") {
      const student = data.students[0];
      if (!student) {
        card.innerHTML = "<h2>Личный кабинет</h2><p>Запишитесь на курс. Данные заявки доступны администратору центра.</p>";
        content.innerHTML = "";
        return;
      }
      const enrolls = data.enrollments.filter(e => e.studentId === student.id);
      const groupIds = enrolls.map(e => e.groupId);
      const studentGroups = data.groups.filter(g => groupIds.includes(g.id));
      const studentSchedule = data.schedules.filter(s => groupIds.includes(s.groupId));

      card.innerHTML = `
        <div style="display: flex; gap: 1.25rem; align-items: center;">
          <div class="profile-avatar-placeholder">
            <i class="fa-solid fa-user-graduate"></i>
          </div>
          <div>
            <h2>${student.name}</h2>
            <p style="color: var(--text-muted);">Студент специальности 09.02.09 Веб-разработка | Дата рег.: ${student.regDate}</p>
            <p style="font-size: 0.95rem;"><i class="fa-solid fa-envelope"></i> ${student.email} | <i class="fa-solid fa-phone"></i> ${student.phone}</p>
          </div>
        </div>
      `;

      content.innerHTML = `
        <h3 style="margin: 2rem 0 1rem;">Мои учебные группы и курсы</h3>
        <div class="grid grid-2">
          ${studentGroups.map(g => {
            const course = data.courses.find(c => c.id === g.courseId);
            const teacher = data.teachers.find(t => t.id === g.teacherId);
            return `
              <div class="feature-card">
                <h4>Группа: ${g.name}</h4>
                <p><strong>Курс:</strong> ${course ? course.name : "—"}</p>
                <p><strong>Преподаватель:</strong> ${teacher ? teacher.name : "—"}</p>
                <p style="font-size: 0.95rem; color: var(--text-muted); margin-top: 0.5rem;">Период: ${g.startDate} —${g.endDate}</p>
              </div>
            `;
          }).join("")}
        </div>

        <h3 style="margin: 2rem 0 1rem;">Персональное расписание</h3>
        <div class="table-responsive">
          <table class="data-table">
            <thead>
              <tr><th>Дата</th><th>Время</th><th>Группа</th><th>Аудитория</th></tr>
            </thead>
            <tbody>
              ${studentSchedule.map(s => {
                const group = data.groups.find(g => g.id === s.groupId);
                return `<tr><td>${s.date}</td><td>${s.startTime}-${s.endTime}</td><td>${group ? group.name : ""}</td><td>${s.room}</td></tr>`;
              }).join("")}
            </tbody>
          </table>
        </div>
      `;
    } else if (this.currentRole === "teacher") {
      const teacher = data.teachers[0]; // Ченцов А.М.
      const teacherGroups = data.groups.filter(g => g.teacherId === teacher.id);
      const teacherSchedule = data.schedules.filter(s => s.teacherId === teacher.id);

      card.innerHTML = `
        <div style="display: flex; gap: 1.25rem; align-items: center;">
          <div class="profile-avatar-placeholder">
            <i class="fa-solid fa-chalkboard-user"></i>
          </div>
          <div>
            <h2>${teacher.name}</h2>
            <p style="color: var(--primary); font-weight: 500;">${teacher.spec}</p>
            <p style="font-size: 0.95rem; color: var(--text-muted);"><i class="fa-solid fa-envelope"></i> ${teacher.email} | Опыт: ${teacher.exp}</p>
          </div>
        </div>
      `;

      content.innerHTML = `
        <h3 style="margin: 2rem 0 1rem;">Ведомость учебных групп преподавателя</h3>
        <div class="grid grid-2">
          ${teacherGroups.map(g => {
            const course = data.courses.find(c => c.id === g.courseId);
            const groupStudents = data.enrollments
              .filter(e => e.groupId === g.id)
              .map(e => data.students.find(st => st.id === e.studentId)?.name)
              .filter(Boolean);

            return `
              <div class="feature-card">
                <h4>Группа: ${g.name} (${course?.name})</h4>
                <p style="margin-top: 0.5rem; font-weight: 600; font-size: 0.95rem;">Обучающиеся:</p>
                <ol style="padding-left: 1.2rem; font-size: 0.95rem;">
                  ${groupStudents.map(st => `<li>${st}</li>`).join("")}
                </ol>
              </div>
            `;
          }).join("")}
        </div>

        <h3 style="margin: 2rem 0 1rem;">График проведения пар</h3>
        <div class="table-responsive">
          <table class="data-table">
            <thead>
              <tr><th>Дата</th><th>Время</th><th>Группа</th><th>Аудитория</th></tr>
            </thead>
            <tbody>
              ${teacherSchedule.map(s => {
                const group = data.groups.find(g => g.id === s.groupId);
                return `<tr><td>${s.date}</td><td>${s.startTime}-${s.endTime}</td><td>${group ? group.name : ""}</td><td>${s.room}</td></tr>`;
              }).join("")}
            </tbody>
          </table>
        </div>
      `;
    }
  }

  renderAdminTable() {
    const data = this.storage.get();
    const head = document.getElementById("adminTableHead");
    const body = document.getElementById("adminTableBody");
    const tab = this.currentAdminTab;

    const columns = {
      students: ["ID", "ФИО Студента", "Дата рожд.", "Телефон", "Email", "Дата рег."],
      teachers: ["ID", "ФИО Преподавателя", "Специализация", "Телефон", "Email", "Стаж"],
      courses: ["ID", "Название курса", "Длительность", "Стоимость", "ID Преподавателя"],
      groups: ["ID", "Название группы", "ID Курса", "ID Преподавателя", "Начало", "Окончание"],
      enrollments: ["ID", "ID Студента", "ID Группы", "Дата записи"],
      schedules: ["ID", "Дата", "Время", "ID Группы", "ID Преподавателя", "Аудитория"],
      feedback: ["ID", "Имя", "Email", "Сообщение", "Дата"]
    };

    head.innerHTML = `<tr>${columns[tab].map(c => `<th>${c}</th>`).join("")}<th>Действия</th></tr>`;

    const records = data[tab] || [];
    body.innerHTML = records.map(item => {
      let fieldsHtml = "";
      if (tab === "students") {
        fieldsHtml = `<td>${item.id}</td><td>${item.name}</td><td>${item.birthDate}</td><td>${item.phone}</td><td>${item.email}</td><td>${item.regDate}</td>`;
      } else if (tab === "teachers") {
        fieldsHtml = `<td>${item.id}</td><td>${item.name}</td><td>${item.spec}</td><td>${item.phone}</td><td>${item.email}</td><td>${item.exp}</td>`;
      } else if (tab === "courses") {
        fieldsHtml = `<td>${item.id}</td><td>${item.name}</td><td>${item.duration}</td><td>${item.price} ₽</td><td>${item.teacherId}</td>`;
      } else if (tab === "groups") {
        fieldsHtml = `<td>${item.id}</td><td>${item.name}</td><td>${item.courseId}</td><td>${item.teacherId}</td><td>${item.startDate}</td><td>${item.endDate}</td>`;
      } else if (tab === "enrollments") {
        fieldsHtml = `<td>${item.id}</td><td>${item.studentId}</td><td>${item.groupId}</td><td>${item.enrollDate}</td>`;
      } else if (tab === "feedback") {
        fieldsHtml = `<td>${item.id}</td><td>${item.name}</td><td>${item.email}</td><td>${item.message}</td><td>${item.createdAt}</td>`;
      } else if (tab === "schedules") {
        fieldsHtml = `<td>${item.id}</td><td>${item.date}</td><td>${item.startTime}-${item.endTime}</td><td>${item.groupId}</td><td>${item.teacherId}</td><td>${item.room}</td>`;
      }

      return `
        <tr>
          ${fieldsHtml}
          <td>
            <button class="btn btn-outline btn-sm" onclick="app.deleteRecord('${tab}', ${item.id})"><i class="fa-solid fa-trash" style="color: var(--danger);"></i></button>
          </td>
        </tr>
      `;
    }).join("");
  }

  async deleteRecord(entity, id) {
    if (confirm(`Удалить запись с ID #${id}?`)) {
      const data = this.storage.get();
      data[entity] = data[entity].filter(item => item.id !== id);
      try {
        await this.storage.save(data);
        this.renderAdminTable();
        this.renderAll();
      } catch (error) {
        alert(`Ошибка удаления: ${error.message}`);
        await this.storage.load();
        this.renderAdminTable();
      }
    }
  }

  openEnrollModal(selectedCourseId = null) {
    const data = this.storage.get();
    const modalTitle = document.getElementById("modalTitle");
    const modalBody = document.getElementById("modalBody");
    modalTitle.textContent = "Запись на курс";

    modalBody.innerHTML = `
      <div class="form-group">
        <label>ФИО абитуриента:</label>
        <input type="text" name="name" class="form-input" required placeholder="Иванов Иван Иванович">
      </div>
      <div class="form-group">
        <label>Телефон для связи:</label>
        <input type="tel" name="phone" class="form-input" required placeholder="+7 (___) ___-__-__">
      </div>
      <div class="form-group">
        <label>Электронная почта:</label>
        <input type="email" name="email" class="form-input" required placeholder="example@mail.ru">
      </div>
      <div class="form-group">
        <label>Желаемый курс:</label>
        <select name="courseId" class="form-input" required>
          ${data.courses.map(c => `<option value="${c.id}" ${c.id === selectedCourseId ? "selected" : ""}>${c.name} (${c.price} ₽)</option>`).join("")}
        </select>
      </div>
    `;

    this.modalForm.onsubmit = async (e) => {
      e.preventDefault();
      const form = new FormData(e.target);
      const studentName = form.get("name");
      const phone = form.get("phone");
      const email = form.get("email");
      const courseId = Number(form.get("courseId"));

      try {
        await this.storage.request("/api/apply", {
          method: "POST", body: JSON.stringify({name: studentName, phone, email, courseId})
        });
        await this.storage.load();
        this.closeModal();
        alert("Заявка успешно зарегистрирована в базе данных ИС!");
        this.renderAll();
      } catch (error) {
        alert(`Не удалось сохранить заявку: ${error.message}`);
        await this.storage.load();
      }
    };

    this.openModal();
  }

  openAdminAddModal() {
    const tab = this.currentAdminTab;
    const data = this.storage.get();
    const modalTitle = document.getElementById("modalTitle");
    const modalBody = document.getElementById("modalBody");
    modalTitle.textContent = tab === "students" ? "Новый студент" : tab === "courses" ? "Новый курс" : "Добавление записи";

    if (tab === "students") {
      modalBody.innerHTML = `
        <div class="form-group"><label>ФИО:</label><input name="name" class="form-input" required></div>
        <div class="form-group"><label>Дата рождения:</label><input type="date" name="birthDate" class="form-input" required></div>
        <div class="form-group"><label>Телефон:</label><input name="phone" class="form-input" required></div>
        <div class="form-group"><label>Email:</label><input type="email" name="email" class="form-input" required></div>
      `;
    } else if (tab === "courses") {
      modalBody.innerHTML = `
        <div class="form-group"><label>Название курса:</label><input name="name" class="form-input" required></div>
        <div class="form-group"><label>Описание:</label><textarea name="desc" class="form-input" required></textarea></div>
        <div class="form-group"><label>Длительность:</label><input name="duration" class="form-input" placeholder="72 ак. часа" required></div>
        <div class="form-group"><label>Стоимость (руб):</label><input type="number" name="price" class="form-input" required></div>
        <div class="form-group"><label>Преподаватель:</label>
          <select name="teacherId" class="form-input">${data.teachers.map(t => `<option value="${t.id}">${t.name}</option>`).join("")}</select>
        </div>
      `;
    } else {
      modalBody.innerHTML = `<p>Для демонстрации быстрое добавление настроено на сущности <strong>Студенты</strong> и <strong>Курсы</strong>. Переключитесь на них для ввода новых записей.</p>`;
    }

    this.modalForm.onsubmit = async (e) => {
      e.preventDefault();
      const form = new FormData(e.target);
      const currentData = this.storage.get();

      if (tab === "students") {
        const newId = (currentData.students[currentData.students.length - 1]?.id || 0) + 1;
        currentData.students.push({
          id: newId,
          name: form.get("name"),
          birthDate: form.get("birthDate"),
          phone: form.get("phone"),
          email: form.get("email"),
          regDate: new Date().toISOString().split("T")[0]
        });
      } else if (tab === "courses") {
        const newId = (currentData.courses[currentData.courses.length - 1]?.id || 0) + 1;
        currentData.courses.push({
          id: newId,
          name: form.get("name"),
          desc: form.get("desc"),
          duration: form.get("duration"),
          price: Number(form.get("price")),
          teacherId: Number(form.get("teacherId"))
        });
      }

      try {
        await this.storage.save(currentData);
        this.closeModal();
        this.renderAdminTable();
        this.renderAll();
      } catch (error) {
        alert(`Не удалось сохранить запись: ${error.message}`);
        await this.storage.load();
      }
    };

    this.openModal();
  }

  openModal() {
    this.labelFormFields(this.genericModal);
    this.modalPreviousFocus = document.activeElement;
    this.genericModal.classList.add("open");
    document.body.classList.add("modal-visible");
    this.genericModal.querySelector("input, select, textarea, button")?.focus();
  }

  closeModal() {
    this.genericModal.classList.remove("open");
    document.body.classList.remove("modal-visible");
    this.modalPreviousFocus?.focus();
  }
}

// Запуск приложения
const app = new App();
