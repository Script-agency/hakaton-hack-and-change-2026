<?php

declare(strict_types=1);

return [
    'GET /admin/knowledge/categories'                           => 'knowledge/admin-knowledge/categories',
    'POST /admin/knowledge/categories'                          => 'knowledge/admin-knowledge/create-category',
    'GET /admin/knowledge/categories/<id:\\d+>'                 => 'knowledge/admin-knowledge/category',
    'PATCH /admin/knowledge/categories/<id:\\d+>'               => 'knowledge/admin-knowledge/update-category',
    'DELETE /admin/knowledge/categories/<id:\\d+>'              => 'knowledge/admin-knowledge/delete-category',

    'GET /admin/knowledge/documents'                            => 'knowledge/admin-knowledge/documents',
    'POST /admin/knowledge/documents'                           => 'knowledge/admin-knowledge/create-document',
    'GET /admin/knowledge/documents/<id:\\d+>'                  => 'knowledge/admin-knowledge/document',
    'PATCH /admin/knowledge/documents/<id:\\d+>'                => 'knowledge/admin-knowledge/update-document',
    'PUT /admin/knowledge/documents/<id:\\d+>/file'             => 'knowledge/admin-knowledge/replace-document',
    'GET /admin/knowledge/documents/<id:\\d+>/file'             => 'knowledge/admin-knowledge/download-document',
    'DELETE /admin/knowledge/documents/<id:\\d+>'               => 'knowledge/admin-knowledge/delete-document',

    'GET /admin/knowledge/documents/<documentId:\\d+>/parts'    => 'knowledge/admin-knowledge/parts',
    'POST /admin/knowledge/documents/<documentId:\\d+>/parts'   => 'knowledge/admin-knowledge/create-part',
    'GET /admin/knowledge/parts/<id:\\d+>'                      => 'knowledge/admin-knowledge/part',
    'PATCH /admin/knowledge/parts/<id:\\d+>'                    => 'knowledge/admin-knowledge/update-part',
    'DELETE /admin/knowledge/parts/<id:\\d+>'                   => 'knowledge/admin-knowledge/delete-part',
    'GET /admin/knowledge/parts/<id:\\d+>/content'              => 'knowledge/admin-knowledge/part-content',

    'GET /internal/v1/knowledge/categories'                     => 'knowledge/internal-knowledge/categories',
    'POST /internal/v1/knowledge/retrieve'                      => 'knowledge/internal-knowledge/retrieve',
    'GET /internal/v1/knowledge/documents/<id:\\d+>/file'       => 'knowledge/internal-knowledge/document-file',
    'GET /internal/v1/knowledge/parts/<id:\\d+>/content'        => 'knowledge/internal-knowledge/part-content',
    'POST /internal/v1/knowledge/parts/<id:\\d+>/cache'         => 'knowledge/internal-knowledge/cache-part',
];
