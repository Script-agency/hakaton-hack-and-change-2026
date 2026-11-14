<?php

declare(strict_types=1);

namespace modules\knowledge\infrastructure\storage;

use core\domain\exception\FileStorageException;
use core\domain\exception\ValidationException;
use Exception;
use finfo;
use yii\web\UploadedFile;

final class LocalFileStorage
{
    private string $root;
    private int $maxFileSize;
    private int $maxPartSize;
    private const ALLOWED_EXTENSIONS = ['md', 'txt', 'pdf', 'docx', 'html', 'htm'];

    /**
     * @throws FileStorageException
     */
    public function __construct()
    {
        $defaultPath = dirname(__DIR__, 4) . '/storage/knowledge';
        $this->root = rtrim((string)($_ENV['KNOWLEDGE_STORAGE_PATH'] ?? $defaultPath), DIRECTORY_SEPARATOR);
        $this->maxFileSize = (int)($_ENV['KNOWLEDGE_MAX_FILE_SIZE'] ?? 20971520);
        $this->maxPartSize = (int)($_ENV['KNOWLEDGE_MAX_PART_SIZE'] ?? 1048576);
        if (!is_dir($this->root) && !@mkdir($this->root, 0770, true) && !is_dir($this->root)) {
            throw new FileStorageException('Cannot create knowledge storage directory.');
        }
    }

    /**
     * @return array{storageKey:string, extension:string, mimeType:string, size:int, checksum:string}
     * @throws ValidationException
     * @throws FileStorageException
     * @throws Exception
     */
    public function saveUploadedFile(UploadedFile $file): array
    {
        $extension = strtolower((string)$file->getExtension());
        if (!in_array($extension, self::ALLOWED_EXTENSIONS, true)) {
            throw new ValidationException('Unsupported file extension. Allowed: ' . implode(', ', self::ALLOWED_EXTENSIONS));
        }
        if ($file->error !== UPLOAD_ERR_OK || $file->size <= 0 || $file->size > $this->maxFileSize) {
            throw new ValidationException('Invalid file or file size limit exceeded.');
        }
        $relative = $this->newKey('documents', $extension);
        $target = $this->resolve($relative);
        $directory = dirname($target);
        if (!is_dir($directory) && !@mkdir($directory, 0770, true) && !is_dir($directory)) {
            throw new FileStorageException('Cannot create document directory.');
        }
        if (!$file->saveAs($target)) {
            throw new FileStorageException('Failed to move uploaded file to storage.');
        }
        $mime = 'application/octet-stream';
        if (class_exists(finfo::class)) {
            $mime = (string)((new finfo(FILEINFO_MIME_TYPE))->file($target) ?: $mime);
        }
        return [
            'storageKey' => $relative, 'extension' => $extension, 'mimeType' => $mime,
            'size' => (int)filesize($target), 'checksum' => (string)hash_file('sha256', $target),
        ];
    }

    /**
     * @throws FileStorageException
     * @throws ValidationException
     * @throws Exception
     */
    public function saveText(string $content): string
    {
        if (trim($content) === '' || strlen($content) > $this->maxPartSize) {
            throw new ValidationException('Knowledge part content is empty or exceeds the configured size limit.');
        }
        $relative = $this->newKey('parts', 'txt');
        $target = $this->resolve($relative);
        $directory = dirname($target);
        if (!is_dir($directory) && !@mkdir($directory, 0770, true) && !is_dir($directory)) {
            throw new FileStorageException('Cannot create part directory.');
        }
        if (@file_put_contents($target, $content, LOCK_EX) === false) {
            throw new FileStorageException('Failed to save knowledge part content.');
        }
        @chmod($target, 0660);
        return $relative;
    }

    /**
     * @throws FileStorageException
     */
    public function path(string $storageKey): string
    {
        $path = $this->resolve($storageKey);
        if (!is_file($path)) {
            throw new FileStorageException('Stored file does not exist.');
        }
        return $path;
    }

    /**
     * @throws FileStorageException
     */
    public function read(string $storageKey): string
    {
        $content = @file_get_contents($this->path($storageKey));
        if ($content === false) {
            throw new FileStorageException('Cannot read stored file.');
        }
        return $content;
    }

    /**
     * @throws FileStorageException
     */
    public function delete(?string $storageKey): void
    {
        if ($storageKey === null || $storageKey === '') {
            return;
        }
        $path = $this->resolve($storageKey);
        if (is_file($path) && !@unlink($path)) {
            throw new FileStorageException('Cannot delete stored file.');
        }
    }

    /**
     * @throws Exception
     */
    private function newKey(string $directory, string $extension): string
    {
        $name = bin2hex(random_bytes(16));
        return $directory . '/' . substr($name, 0, 2) . '/' . $name . '.' . $extension;
    }

    /**
     * @throws FileStorageException
     */
    private function resolve(string $key): string
    {
        if ($key === '' || str_contains($key, '..') || str_starts_with($key, '/') || str_contains($key, '\\')) {
            throw new FileStorageException('Invalid storage key.');
        }
        $candidate = $this->root . DIRECTORY_SEPARATOR . str_replace('/', DIRECTORY_SEPARATOR, $key);
        $root = realpath($this->root) ?: $this->root;
        $parent = realpath(dirname($candidate));
        if ($parent !== false && !str_starts_with($parent . DIRECTORY_SEPARATOR, $root . DIRECTORY_SEPARATOR)) {
            throw new FileStorageException('Storage path escapes root directory.');
        }
        return $candidate;
    }
}
