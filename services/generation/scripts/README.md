# Импорт базы знаний в систему

1. создайте каталог `/data` (он не попадёт в гит)
2. распакуйте вашу базу знаний с папками(они станут категориями) и файлами в эту папку
3. запустите скрипт из этой папки
Для запуска из этой папки
```bash
python ./import_knowledge_base.py ./data \
  --base-url http://localhost:8080 \
  --token "YOUR_ADMIN_TOKEN" \
  --publish \
  --skip-existing
```
Для запуска из корня
```bash
python services/generation/scripts/import_knowledge_base.py path/to/your/files \
  --base-url http://localhost:8080 \
  --token "YOUR_ADMIN_TOKEN" \
  --publish \
  --skip-existing
```
Для запуска из контейнера `(Обратите внимание, для этого варианта запуска команду можно скопировать и выполнить без изменений)`
```bash
docker compose exec generation python /app/scripts/import_knowledge_base.py \
 /app/scripts/data \
 --base-url http://nginx-backend \
 --token "YOUR_ADMIN_TOKEN" \
 --publish \
 --skip-existing
```