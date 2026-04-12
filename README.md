# Telegram бот для загрузки Excel в GitHub

Готовый проект на **Node.js + Telegraf**, адаптированный под **Railway**.

## Что умеет

- показывает кнопки после `/start`
- кнопка **«Загрузить файл»** просит отправить Excel-файл
- принимает `.xlsx` и `.xls`
- после загрузки отправляет файл в ваш GitHub-репозиторий
- кнопка **«Проверить ШК»** пока оставлена как заглушка под следующий этап

---

## Структура

```bash
src/
  index.js
  config.js
  handlers/
    start.js
    upload.js
  services/
    github.js
package.json
.env.example
railway.toml
README.md
```

---

## 1. Установка локально

```bash
npm install
```

Создайте файл `.env` по примеру `.env.example`.

Запуск:

```bash
npm start
```

---

## 2. Переменные окружения

Нужно задать:

- `BOT_TOKEN`
- `GITHUB_TOKEN`
- `GITHUB_OWNER`
- `GITHUB_REPO`
- `GITHUB_BRANCH`
- `GITHUB_UPLOAD_DIR`

Пример:

```env
BOT_TOKEN=1234567890:YOUR_TELEGRAM_BOT_TOKEN
GITHUB_TOKEN=ghp_xxxxxxxxxxxxxxxxxxxx
GITHUB_OWNER=my-github-login
GITHUB_REPO=my-bot-repo
GITHUB_BRANCH=main
GITHUB_UPLOAD_DIR=uploads
```

---

## 3. Где взять значения

### BOT_TOKEN
1. Откройте Telegram.
2. Найдите **@BotFather**.
3. Отправьте `/mybots`.
4. Выберите нужного бота.
5. Нажмите **API Token** или используйте `/token`.
6. Скопируйте токен.

### GITHUB_TOKEN
1. Откройте GitHub.
2. Перейдите в **Settings** → **Developer settings** → **Personal access tokens**.
3. Создайте токен.
4. Для простого варианта подойдет Fine-grained token с доступом к нужному репозиторию и правами **Contents: Read and write**.
5. Скопируйте токен один раз и сохраните его.

### GITHUB_OWNER
Ваш GitHub логин или название организации.

Примеры:
- `myusername`
- `mycompany`

### GITHUB_REPO
Название репозитория, куда бот будет загружать Excel.

Пример:
- `warehouse-bot`

### GITHUB_BRANCH
Ветка, куда загружать файл.

Обычно:
- `main`
- `master`

### GITHUB_UPLOAD_DIR
Папка внутри репозитория, куда складывать Excel-файлы.

Примеры:
- `uploads`
- `excel`
- `data/files`

Если укажете `uploads`, файлы будут загружаться, например, так:

```bash
uploads/2026-04-12T10-20-30-000Z_price.xlsx
```

---

## 4. Деплой на Railway

### Вариант через GitHub
1. Загрузите этот проект в свой GitHub-репозиторий.
2. Зайдите в Railway.
3. Создайте **New Project**.
4. Выберите **Deploy from GitHub repo**.
5. Подключите репозиторий.
6. В разделе **Variables** добавьте все переменные окружения.
7. Railway сам выполнит `npm install` и `npm start`.

### Переменные в Railway
Откройте сервис → **Variables** и вставьте:

- `BOT_TOKEN`
- `GITHUB_TOKEN`
- `GITHUB_OWNER`
- `GITHUB_REPO`
- `GITHUB_BRANCH`
- `GITHUB_UPLOAD_DIR`

---

## 5. Как работает логика загрузки

1. Пользователь нажимает **«Загрузить файл»**.
2. Бот просит отправить Excel-файл.
3. Пользователь отправляет `.xlsx` или `.xls`.
4. Бот скачивает файл из Telegram в память.
5. Бот загружает его в GitHub через API.
6. Бот отправляет ссылку на загруженный файл.

---

## 6. Что делать дальше

Следующий этап — реализовать кнопку **«Проверить ШК»**:
- хранить последний загруженный Excel
- читать таблицу
- искать товар по штрихкоду
- показывать остаток

