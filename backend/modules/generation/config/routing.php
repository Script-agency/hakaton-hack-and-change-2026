<?php

declare(strict_types=1);

return [
    'POST /generation/chat'      => 'generation/generation/chat',
    'POST /generation/chat/new'  => 'generation/generation/chat-new',
    'GET /generation/chat/list'  => 'generation/generation/chat-list',
    'GET /generation/chat/{id}'  => 'generation/generation/chat-get',
];