<?php

declare(strict_types=1);

return [
    'storagePath' => $_ENV['KNOWLEDGE_STORAGE_PATH'] ?? dirname(__DIR__, 3) . '/storage/knowledge',
    'maxFileSize' => (int)($_ENV['KNOWLEDGE_MAX_FILE_SIZE'] ?? 20971520),
];
