// Интерактивный подбор курса и иллюстрация учебного маршрута.
class SiteExperience {
  constructor(app) {
    this.app = app;
    this.dialog = document.getElementById('courseExplorer');
    this.goal = 'web';
    this.stage = 0;
    this.track = 'web';
    this.selectedCourseId = null;
    this.reduceMotion = window.matchMedia('(prefers-reduced-motion: reduce)');
    this.tracks = {
      web: { title: 'Веб-разработка', symbol: '</>', skills: ['HTML / CSS', 'JavaScript', 'Данные и API', 'Веб-приложение'], stages: [
        ['Первое знакомство', 'Разбираешься, как браузер показывает страницу и из чего состоит сайт.', 'Открыть HTML-файл и найти заголовок, текст и ссылку.'],
        ['Страница своими руками', 'Собираешь структуру страницы, задаёшь цвета, отступы и сетку.', 'Сверстать страницу образовательного центра.'],
        ['Живой интерфейс', 'Добавляешь события, проверку форм и получение данных с сервера.', 'Сделать поиск курсов и форму записи.'],
        ['Свой веб-проект', 'Соединяешь интерфейс и данные, проверяешь основные сценарии.', 'Собрать учебное веб-приложение и показать его работу.']
      ] },
      data: { title: 'Базы данных', symbol: '{ }', skills: ['Таблицы', 'Связи', 'SQL-запросы', 'Проект данных'], stages: [
        ['Знакомство с данными', 'Учишься различать сущности, записи и поля.', 'Выделить студентов, курсы и группы в учебном центре.'],
        ['Связи и структура', 'Разбираешься в ключах и связях между таблицами.', 'Спроектировать связь студента с учебной группой.'],
        ['Запросы на практике', 'Учишься выбирать, добавлять и обновлять данные.', 'Получить список студентов выбранной группы.'],
        ['Свой проект данных', 'Собираешь модель, проверяешь связи и продумываешь типовые запросы.', 'Подготовить базу данных для образовательного центра.']
      ] },
      frontend: { title: 'Frontend', symbol: 'JS', skills: ['Интерфейс', 'События', 'Состояние', 'Интерактивный сайт'], stages: [
        ['Взгляд на интерфейс', 'Разбираешься в элементах страницы и действиях пользователя.', 'Наметить экран каталога и форму записи.'],
        ['Основы JavaScript', 'Работаешь с переменными, функциями и событиями.', 'Показать подробности курса по нажатию кнопки.'],
        ['Состояние и данные', 'Связываешь формы, фильтры и отображение информации.', 'Сделать каталог с поиском и переключением курсов.'],
        ['Интерфейс своего проекта', 'Объединяешь экраны, добавляешь адаптивность и проверяешь взаимодействия.', 'Подготовить удобный интерфейс учебного приложения.']
      ] }
    };
    this.bind();
    this.refresh();
    this.renderLearning();
    this.initCursor();
    this.initMonitorPower();
  }

  initMonitorPower() {
    const monitor = document.querySelector('.monitor-scene');
    const screen = monitor?.querySelector('.monitor-screen');
    if (!monitor || !screen) return;
    let timer = 0;
    let frame = 0;
    let observer = null;
    const finish = () => {
      clearTimeout(timer);
      cancelAnimationFrame(frame);
      observer?.disconnect();
      monitor.classList.add('monitor-on');
      monitor.classList.remove('is-booting');
    };
    const start = () => {
      clearTimeout(timer);
      cancelAnimationFrame(frame);
      if (this.reduceMotion.matches) { finish(); return; }
      monitor.classList.remove('monitor-on', 'is-booting');
      // Сначала кадр с погасшим экраном, затем подсветка и содержимое.
      frame = requestAnimationFrame(() => {
        frame = requestAnimationFrame(() => monitor.classList.add('is-booting'));
      });
      timer = window.setTimeout(finish, 2450);
    };
    document.getElementById('monitorPowerButton')?.addEventListener('click', start);
    screen.addEventListener('focusin', finish);
    this.reduceMotion.addEventListener('change', () => { if (this.reduceMotion.matches) finish(); });
    if (this.reduceMotion.matches || !('IntersectionObserver' in window)) { finish(); return; }
    observer = new IntersectionObserver(entries => {
      if (!entries.some(entry => entry.isIntersecting)) return;
      start();
      observer.disconnect();
    }, { threshold: .25 });
    monitor.classList.add('monitor-armed');
    observer.observe(monitor);
  }

  escape(value) {
    return String(value ?? '').replace(/[&<>"']/g, char => ({'&':'&amp;', '<':'&lt;', '>':'&gt;', '"':'&quot;', "'":'&#39;'}[char]));
  }

  kind(course) {
    const name = (course?.name || '').toLowerCase();
    return /баз|данных|sql/.test(name) ? 'data' : /frontend|typescript|javascript/.test(name) ? 'frontend' : 'web';
  }

  bind() {
    document.getElementById('heroChooseCourse').addEventListener('click', () => this.openCourseExplorer());
    document.getElementById('openCourseExplorer').addEventListener('click', () => this.openCourseExplorer());
    document.getElementById('explorerClose').addEventListener('click', () => this.closeCourseExplorer());
    this.dialog.addEventListener('cancel', event => { event.preventDefault(); this.closeCourseExplorer(); });
    this.dialog.addEventListener('close', () => {
      document.body.classList.remove('explorer-visible');
      this.dialog.classList.remove('is-closing');
      if (this.cursor) document.body.append(this.cursor);
      if (!this.app.genericModal.classList.contains('open')) this.previousFocus?.focus();
    });
    document.getElementById('explorerCatalog').addEventListener('click', () => this.closeCourseExplorer(() => this.app.navigateTo('courses')));
    this.dialog.addEventListener('click', event => {
      const course = event.target.closest('[data-explorer-course]');
      if (course) {
        this.selectedCourseId = Number(course.dataset.explorerCourse);
        this.renderExplorer();
        this.dialog.querySelector(`[data-explorer-course="${this.selectedCourseId}"]`)?.focus({ preventScroll: true });
      }
      const goal = event.target.closest('[data-goal]');
      if (goal) {
        this.goal = goal.dataset.goal;
        const match = this.app.storage.get().courses.find(c => this.kind(c) === this.goal);
        if (match) this.selectedCourseId = match.id;
        this.renderExplorer();
      }
    });
    document.getElementById('explorerEnroll').addEventListener('click', () => {
      const id = this.selectedCourseId;
      if (id == null) return;
      this.closeCourseExplorer(() => this.app.openEnrollModal(id));
    });
    // Небольшое встречное движение содержимого двух страниц за указателем.
    this.dialog.addEventListener('pointermove', event => {
      if (event.pointerType !== 'mouse' || this.reduceMotion.matches || innerWidth <= 900) return;
      const offset = ((event.clientY / innerHeight) - .5) * 10;
      this.dialog.style.setProperty('--pane-drift', `${offset.toFixed(2)}px`);
    });
    this.dialog.addEventListener('pointerleave', () => this.dialog.style.setProperty('--pane-drift', '0px'));
    document.getElementById('learningTracks').addEventListener('click', event => {
      const button = event.target.closest('[data-track]');
      if (!button) return;
      this.track = button.dataset.track;
      this.renderLearning();
    });
    document.getElementById('learningStages').addEventListener('click', event => {
      const button = event.target.closest('[data-stage]');
      if (!button) return;
      this.stage = Number(button.dataset.stage);
      this.renderLearning();
    });
    document.getElementById('learningChoose').addEventListener('click', () => {
      this.goal = this.track;
      const match = this.app.storage.get().courses.find(c => this.kind(c) === this.track);
      if (match) this.selectedCourseId = match.id;
      this.openCourseExplorer();
    });
  }

  refresh() {
    const courses = this.app.storage.get().courses;
    if (!courses.some(c => c.id === this.selectedCourseId)) this.selectedCourseId = courses[0]?.id ?? null;
    this.renderExplorer();
  }

  openCourseExplorer() {
    if (this.dialog.open) return;
    this.previousFocus = document.activeElement;
    this.renderExplorer();
    this.dialog.classList.remove('is-closing');
    this.dialog.style.setProperty('--pane-drift', '0px');
    this.dialog.showModal();
    document.body.classList.add('explorer-visible');
    if (this.cursor) this.dialog.append(this.cursor);
    document.getElementById('explorerClose').focus();
  }

  closeCourseExplorer(afterClose) {
    if (!this.dialog.open || this.dialog.classList.contains('is-closing')) return;
    const finish = () => {
      this.dialog.close();
      if (afterClose) afterClose();
    };
    if (this.reduceMotion.matches) { finish(); return; }
    this.dialog.classList.add('is-closing');
    window.setTimeout(finish, 280);
  }

  renderExplorer() {
    const data = this.app.storage.get();
    const selected = data.courses.find(c => c.id === this.selectedCourseId);
    document.getElementById('explorerCourseList').innerHTML = data.courses.map((course, i) => `
      <button type="button" class="explorer-course ${course.id === this.selectedCourseId ? 'is-selected' : ''}" data-explorer-course="${Number(course.id)}" aria-pressed="${course.id === this.selectedCourseId}">
        <span class="explorer-course-number">${String(i + 1).padStart(2, '0')}</span><span><strong>${this.escape(course.name)}</strong><small>${this.escape(course.duration)} · ${Number(course.price).toLocaleString('ru-RU')} ₽</small></span><span aria-hidden="true">↗</span>
      </button>`).join('') || '<p class="explorer-empty">Курсы пока не добавлены. Загляни позже или свяжись с центром.</p>';
    this.dialog.querySelectorAll('[data-goal]').forEach(button => {
      button.setAttribute('aria-pressed', String(button.dataset.goal === this.goal));
    });
    const detail = document.getElementById('explorerDetail');
    const enroll = document.getElementById('explorerEnroll');
    enroll.disabled = !selected;
    if (!selected) { detail.innerHTML = '<h3>Начнём с вопроса?</h3><p>Уточнить программы можно через форму обратной связи.</p>'; return; }
    const kind = this.kind(selected);
    const teacher = data.teachers.find(t => t.id === selected.teacherId);
    const advice = {
      web: ['Хочешь понимать, как устроен сайт целиком.', 'Интересно соединять страницы, формы и данные.', 'Нравится видеть результат своей работы в браузере.'],
      data: ['Нравится порядок в информации и логика связей.', 'Хочешь разбираться в таблицах и запросах.', 'Интересно, как приложения хранят и находят данные.'],
      frontend: ['Нравится создавать то, с чем взаимодействует пользователь.', 'Хочешь оживлять страницы с помощью JavaScript.', 'Интересуют интерфейсы, события и работа с состоянием.']
    };
    const initials = teacher ? teacher.name.split(/\s+/).map(s => s[0]).slice(0, 2).join('') : '?';
    detail.innerHTML = `
      <span class="eyebrow">ПРОГРАММА И ЛЮДИ</span><h3>${this.escape(selected.name)}</h3>
      <p class="explorer-description">${this.escape(selected.desc)}</p>
      <div class="explorer-meta"><span>${this.escape(selected.duration)}</span><span>${Number(selected.price).toLocaleString('ru-RU')} ₽</span></div>
      <div class="explorer-teacher"><span class="teacher-monogram" aria-hidden="true">${this.escape(initials)}</span><div><small>Твой преподаватель</small><h4>${this.escape(teacher?.name || 'Преподаватель будет назначен')}</h4><p>${this.escape(teacher?.spec || '')}</p>${teacher?.exp ? `<span class="teacher-experience">Опыт: ${this.escape(teacher.exp)}</span>` : ''}</div></div>
      <div class="course-fit"><h4>Тебе подойдёт, если…</h4><ul>${advice[kind].map(text => `<li>${text}</li>`).join('')}</ul><p class="fit-note">${kind === this.goal ? 'Это направление совпадает с выбранным интересом.' : 'Можно выбрать это направление или сравнить его с программой по твоему интересу.'}</p></div>`;
    detail.classList.remove('detail-arrive');
    requestAnimationFrame(() => detail.classList.add('detail-arrive'));
  }

  renderLearning() {
    const track = this.tracks[this.track];
    const stage = track.stages[this.stage];
    document.getElementById('learningTrackTitle').textContent = track.title;
    document.getElementById('learningSymbol').textContent = track.symbol;
    document.getElementById('learningLevel').textContent = `0${this.stage + 1}`;
    document.getElementById('learningStageTitle').textContent = stage[0];
    document.getElementById('learningDescription').textContent = stage[1];
    document.getElementById('learningTask').textContent = stage[2];
    document.querySelectorAll('[data-track]').forEach(button => button.setAttribute('aria-pressed', String(button.dataset.track === this.track)));
    document.querySelectorAll('[data-stage]').forEach(button => {
      button.setAttribute('aria-pressed', String(Number(button.dataset.stage) === this.stage));
      button.classList.toggle('is-complete', Number(button.dataset.stage) < this.stage);
    });
    const path = document.getElementById('learningProgressPath');
    path.style.strokeDashoffset = String(1 - this.stage / 3);
    document.querySelectorAll('[data-knowledge-node]').forEach((node, index) => {
      node.classList.toggle('is-reached', index <= this.stage);
      node.classList.toggle('is-current', index === this.stage);
      node.querySelector('text').textContent = track.skills[index];
    });
    document.querySelectorAll('[data-knowledge-bar]').forEach((bar, index) => bar.classList.toggle('is-reached', index <= this.stage));
    const card = document.getElementById('learningSummary');
    card.classList.remove('detail-arrive');
    requestAnimationFrame(() => card.classList.add('detail-arrive'));
  }

  initCursor() {
    const media = window.matchMedia('(hover: hover) and (pointer: fine)');
    if (!media.matches || this.reduceMotion.matches) return;
    const cursor = document.createElement('div');
    cursor.className = 'cursor-trail';
    cursor.setAttribute('aria-hidden', 'true');
    cursor.innerHTML = '<span class="cursor-ring"></span><span class="cursor-dot"></span>';
    document.body.append(cursor);
    this.cursor = cursor;
    let x = 0, y = 0, targetX = 0, targetY = 0, frame = 0, visible = false;
    const stop = () => { cancelAnimationFrame(frame); frame = 0; cursor.classList.remove('is-visible'); document.documentElement.classList.remove('cursor-enhanced'); visible = false; };
    const draw = () => {
      x += (targetX - x) * .2; y += (targetY - y) * .2;
      cursor.style.transform = `translate3d(${x}px, ${y}px, 0)`;
      cursor.style.setProperty('--dot-x', `${targetX - x}px`);
      cursor.style.setProperty('--dot-y', `${targetY - y}px`);
      if (Math.abs(targetX - x) + Math.abs(targetY - y) > .2) frame = requestAnimationFrame(draw);
      else frame = 0;
    };
    document.addEventListener('pointermove', event => {
      if (event.pointerType !== 'mouse' || !media.matches || this.reduceMotion.matches) { stop(); return; }
      if (event.target.closest('input, textarea, select, [contenteditable="true"]')) { stop(); return; }
      targetX = event.clientX; targetY = event.clientY;
      if (!visible) { x = targetX; y = targetY; visible = true; }
      cursor.classList.add('is-visible');
      document.documentElement.classList.add('cursor-enhanced');
      cursor.classList.toggle('is-interactive', !!event.target.closest('button, a, [role="button"]'));
      if (!frame) frame = requestAnimationFrame(draw);
    }, { passive: true });
    document.documentElement.addEventListener('pointerleave', stop);
    document.addEventListener('visibilitychange', () => { if (document.hidden) stop(); });
    media.addEventListener('change', stop);
    this.reduceMotion.addEventListener('change', stop);
  }
}
