# Открытая ИИ-модель для проверки ответов

Сайт проверяет эссе, устные ответы, предложения со словами из словаря и объясняет ошибки в упражнениях
с помощью одной ИИ-модели. Её можно сменить настройками Vercel, не меняя код.

## 1. Подключение (Hugging Face, бесплатный лимит)

1. Создайте аккаунт на huggingface.co.
2. **Settings → Access Tokens → Create new token**, тип **Fine-grained**, включите
   **Make calls to Inference Providers**. Скопируйте токен. Никому его не отправляйте.
3. Vercel → проект → **Settings → Environment Variables** — добавьте:

| Имя | Значение |
|---|---|
| `AI_PROVIDER` | `huggingface` |
| `HF_TOKEN` | ваш токен (Sensitive) |
| `AI_OPEN_MODEL` | `openai/gpt-oss-120b:cheapest` (или другая модель с huggingface.co/models?inference_provider=all) |

4. **Deployments → … → Redeploy.**
5. Проверка: откройте `https://<ваш сайт>/api/ai/status?check=1`. При `"check":{"ok":true,...}` модель
   действительно ответила и нашла ошибку в тестовом предложении.

**Лимиты.** Бесплатный аккаунт Hugging Face получает около $0,10 кредитов в месяц. Этого хватает на несколько десятков
проверок. Когда кредиты заканчиваются, сайт пишет: «The free monthly AI allowance for this site is used up» (бесплатный лимит на месяц исчерпан). Аккаунт PRO
($9 в месяц) даёт $2 кредитов и оплату сверх них. `AI_DAILY_LIMIT` ограничивает число проверок на ученика в день.

Оценки модели — **ориентировочные**, это не официальные баллы IELTS или Cambridge.

## 2. Дообучение своей модели

1. Соберите примеры, проверенные преподавателем, в `examples.jsonl`. Каждая строка выглядит так:
   `{"task": "...", "answer": "текст ученика", "feedback": { ...JSON с оценкой и комментариями... }}`.
   Используйте ответы учеников только с их согласия и уберите личные данные.
   Хорошая отправная точка — 300–1000 примеров.
2. `python training/build_dataset.py examples.jsonl` — создаст `train.jsonl` и `valid.jsonl`.
3. В Google Colab (бесплатная видеокарта T4) выполните:
   `python training/train_lora.py --base Qwen/Qwen2.5-3B-Instruct --repo ВАШЕ_ИМЯ/qevrant-checker`.
   Готовая модель загрузится в ваш аккаунт Hugging Face.
4. Чтобы сайт использовал **свою** модель, её нужно где-то запустить:
   - **Hugging Face Inference Endpoints** (платно, почасовая оплата, можно ставить на паузу): создайте endpoint
     для `ВАШЕ_ИМЯ/qevrant-checker`, затем в Vercel задайте `AI_BASE_URL=<адрес endpoint>/v1` и
     `AI_OPEN_MODEL=ВАШЕ_ИМЯ/qevrant-checker`;
   - или любой свой сервер с vLLM или TGI: они совместимы с тем же API.

   Бесплатного способа постоянно держать свою дообученную модель в интернете, к сожалению, нет.
5. Снова проверьте `/api/ai/status?check=1`.

## 3. Вернуться на Claude

Удалите `AI_PROVIDER`, задайте `ANTHROPIC_API_KEY` и сделайте Redeploy.
