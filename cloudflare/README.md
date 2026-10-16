# DevSphere — Cloudflare Pages + D1

Публичный учебный сайт: https://devsphere-chm.pages.dev

Админка открыта через выбор роли «Администратор», без пароля. Данные общие для всех посетителей. Используйте только вымышленные сведения.

Сборка из корня репозитория: `node cloudflare/build.mjs`, после установки зависимостей `npm ci` в папке `hosted`.

Проверка: `node cloudflare/tests/api.test.mjs` на Node.js 24+.

Публикация из этой папки: `node ../hosted/node_modules/wrangler/bin/wrangler.js pages deploy dist --project-name devsphere --branch main` после `wrangler login` в аккаунте владельца.

База привязана как `DB` в `wrangler.jsonc`. Таблицы создаются однократно SQL-файлом `db/schema.sql`, начальные обезличенные записи добавляются при первом запросе. Не применяйте создание таблиц повторно к действующей базе.

Локальный запуск: `wrangler pages dev dist` с локальной D1 и отдельно применённой схемой. Локальная база независима от опубликованной.

Секреты, OAuth-сеанс и действующие данные базы в репозиторий не включаются.
