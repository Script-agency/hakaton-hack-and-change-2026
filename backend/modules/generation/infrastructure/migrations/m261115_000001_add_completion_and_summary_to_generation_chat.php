<?php

declare(strict_types=1);

namespace modules\generation\infrastructure\migrations;

use yii\db\Migration;

class m261115_000001_add_completion_and_summary_to_generation_chat extends Migration
{
    public function safeUp(): void
    {
        $this->addColumn('{{%generation_chat}}', 'is_completed', 'BOOLEAN NOT NULL DEFAULT FALSE');
        $this->addColumn('{{%generation_chat}}', 'summary', 'TEXT NULL');

        $this->addColumn('{{%generation_chat_message}}', 'sources', "JSONB NOT NULL DEFAULT '[]'::jsonb");
    }

    public function safeDown(): void
    {
        $this->dropColumn('{{%generation_chat_message}}', 'sources');
        $this->dropColumn('{{%generation_chat}}', 'summary');
        $this->dropColumn('{{%generation_chat}}', 'is_completed');
    }
}
