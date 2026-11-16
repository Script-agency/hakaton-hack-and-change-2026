<?php

declare(strict_types=1);

return [
    'POST /leads'                           => 'lead/lead/create',
    'GET /admin/leads'                      => 'lead/admin-lead/index',
    'GET /admin/leads/<id:\d+>'             => 'lead/admin-lead/view',
    'PATCH /admin/leads/<id:\d+>/status'    => 'lead/admin-lead/update-status',
];
