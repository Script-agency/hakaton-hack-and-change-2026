<?php

declare(strict_types=1);

namespace modules\ai\infrastructure\migrations;

use yii\db\Migration;

class m261113_000007_create_ai_audit_log_table extends Migration
{
    public function safeUp(): void
    {
        $this->createTable('{{%ai_audit_log}}', [
            'id'                => $this->bigPrimaryKey(),
            'call_time'         => $this->timestamp()->notNull()->defaultExpression('CURRENT_TIMESTAMP'),
            'has_error'         => $this->boolean()->notNull()->defaultValue(false),
            'was_sent_to_ai'    => $this->boolean()->notNull()->defaultValue(false),
            'model'             => $this->string(150)->null(),
            'prompt_tokens'     => $this->integer()->null(),
            'completion_tokens' => $this->integer()->null(),
            'total_tokens'      => $this->integer()->null(),
            'error_message'     => $this->text()->null(),
        ]);
        $this->createIndex('idx_ai_audit_log_call_time', '{{%ai_audit_log}}', 'call_time');
    }

    public function safeDown(): void
    {
        $this->dropTable('{{%ai_audit_log}}');
    }
}