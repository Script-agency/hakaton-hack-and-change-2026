<?php

declare(strict_types=1);

namespace modules\generation\infrastructure\migrations;

use yii\db\Migration;

class m261113_000013_create_generation_chat_tables extends Migration
{
    public function safeUp(): void
    {
        $this->createTable('{{%generation_chat}}', [
            'id'            => $this->bigPrimaryKey(),
            'fingerprint'   => $this->string(64)->notNull(),
            'created_at'    => $this->timestamp()->notNull()->defaultExpression('CURRENT_TIMESTAMP'),
        ]);
        $this->createIndex('idx_generation_chat_fingerprint', '{{%generation_chat}}', 'fingerprint');

        $this->createTable('{{%generation_chat_message}}', [
            'id'            => $this->bigPrimaryKey(),
            'chat_id'       => $this->bigInteger()->notNull(),
            'role'          => $this->string(20)->notNull()->comment('user или assistant'),
            'content'       => $this->text()->notNull(),
            'created_at'    => $this->timestamp()->notNull()->defaultExpression('CURRENT_TIMESTAMP'),
        ]);
        $this->createIndex('idx_generation_chat_message_chat', '{{%generation_chat_message}}', 'chat_id');
        $this->addForeignKey(
            'fk_generation_chat_message_chat',
            '{{%generation_chat_message}}',
            'chat_id',
            '{{%generation_chat}}',
            'id',
            'CASCADE',
            'CASCADE',
        );
    }

    public function safeDown(): void
    {
        $this->dropForeignKey('fk_generation_chat_message_chat', '{{%generation_chat_message}}');
        $this->dropTable('{{%generation_chat_message}}');
        $this->dropTable('{{%generation_chat}}');
    }
}
