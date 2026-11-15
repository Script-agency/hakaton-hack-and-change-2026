<?php

declare(strict_types=1);

namespace modules\lead\infrastructure\migrations;

use yii\db\Migration;

class m261115_000002_add_conversation_reference_to_lead extends Migration
{
    public function safeUp(): void
    {
        $this->addColumn('{{%lead}}', 'fingerprint', 'VARCHAR(255) NULL');
        $this->addColumn('{{%lead}}', 'conversation_id', 'INTEGER NULL');

        $this->createIndex('idx_lead_fingerprint', '{{%lead}}', 'fingerprint');
        $this->createIndex('idx_lead_conversation_id', '{{%lead}}', 'conversation_id');

        $this->db->createCommand(
            "COMMENT ON COLUMN {{%lead}}.messages IS 'DEPRECATED: use generation_chat_message through conversation_id'",
        )->execute();
    }

    public function safeDown(): void
    {
        $this->db->createCommand(
            "COMMENT ON COLUMN {{%lead}}.messages IS 'История сообщений с AI-агентом (массив)'",
        )->execute();

        $this->dropIndex('idx_lead_conversation_id', '{{%lead}}');
        $this->dropIndex('idx_lead_fingerprint', '{{%lead}}');
        $this->dropColumn('{{%lead}}', 'conversation_id');
        $this->dropColumn('{{%lead}}', 'fingerprint');
    }
}
