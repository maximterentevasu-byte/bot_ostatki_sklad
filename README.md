# Telegram bot: Excel upload + barcode check

Бот на **Node.js + Telegraf** для запуска на **Railway**.

## Что умеет

### 1. Кнопка «Загрузить файл»
- принимает Excel-файл в Telegram;
- удаляет **все старые файлы** из папки `GITHUB_UPLOAD_DIR` в GitHub;
- загружает туда новый Excel;
- в папке всегда остается **только один файл**.

### 2. Кнопка «Проверить ШК»
- просит отправить фото штрихкода;
- дает до **3 попыток**;
- пытается распознать **EAN-13**;
- проверяет, что код состоит из **13 цифр** и проходит checksum-проверку;
- скачивает текущий Excel из GitHub;
- ищет штрихкод в **столбце D**;
- умеет находить точное совпадение даже если в одной ячейке D несколько ШК через запятую;
- возвращает данные из столбцов **C, F, G, H, I, J, K, L**.

## Структура проекта

```bash
src/
  index.js
  bot.js
  config.js
  keyboards.js
  messages.js
  services/
    barcode.js
    excel.js
    github.js
    telegram.js
  utils/
    ean13.js
package.json
railway.toml
.env.example
README.md
```

## Установка локально

```bash
npm install
npm start
```

## Переменные окружения

Создайте `.env` на основе `.env.example`:

```env
BOT_TOKEN=1234567890:AAExampleYourTelegramBotToken
GITHUB_TOKEN=github_pat_xxxxxxxxxxxxxxxxx
GITHUB_OWNER=your-github-login-or-org
GITHUB_REPO=your-repo-name
GITHUB_BRANCH=main
GITHUB_UPLOAD_DIR=uploads
```

## Где смотреть значения

### BOT_TOKEN
В Telegram у **@BotFather**:
- `/mybots`
- выбрать бота
- `API Token` или команда `/token`

### GITHUB_TOKEN
В GitHub:
- `Settings`
- `Developer settings`
- `Personal access tokens`
- создайте **Fine-grained token**
- дайте права **Contents: Read and write**
- доступ только к нужному репозиторию

### GITHUB_OWNER
Логин пользователя или имя организации GitHub.

Если репозиторий:
`https://github.com/ivanpetrov/warehouse-bot`

то:
```env
GITHUB_OWNER=ivanpetrov
```

### GITHUB_REPO
Имя репозитория.

Если репозиторий:
`https://github.com/ivanpetrov/warehouse-bot`

то:
```env
GITHUB_REPO=warehouse-bot
```

### GITHUB_BRANCH
Обычно:
```env
GITHUB_BRANCH=main
```

### GITHUB_UPLOAD_DIR
Папка в репозитории, куда бот будет класть Excel:
```env
GITHUB_UPLOAD_DIR=uploads
```

## Деплой на Railway

1. Загрузите проект в GitHub.
2. В Railway создайте проект из GitHub-репозитория.
3. В Railway → **Variables** добавьте все переменные из `.env.example`.
4. Railway сам установит зависимости и выполнит:
```bash
npm start
```

## Логика Excel

По найденной строке в Excel бот возвращает:
- `Название товара` → столбец **C**
- `Общий остаток товара` → столбец **G**
- `Общий в т.ч. в АКЦИИ` → столбец **F**
- `Остаток склад` → столбец **H**
- `Каменская ост` → столбец **I**
- `Победы ост` → столбец **K**
- `Асбест ост` → столбец **J**
- `Все продажи за 14 дней` → столбец **L**

Штрихкод ищется в столбце **D**.

## Важно

- В репозиторий **не загружайте** реальный `.env`.
- Храните реальные токены только в **Railway Variables**.
- Для распознавания бот ожидает обычное фото штрихкода в Telegram, не документ.
- Чем резче фото и лучше свет, тем выше шанс успешного распознавания.


## Обновления последней версии

- фото штрихкода больше не запрашивается повторно из-за общего обработчика сообщений;
- поиск по столбцу D ищет **точное совпадение 13 цифр**;
- ячейка может содержать несколько кодов, например: `8801073114111, 8801073142510`;
- похожие значения не засчитываются: если код отличается хотя бы на одну цифру, совпадения нет.
