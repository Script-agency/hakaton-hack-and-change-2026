<?php

declare(strict_types=1);

namespace modules\lead\infrastructure\migrations;

use yii\db\Migration;

class m261113_000001_create_lead_table extends Migration
{
    /**
     * {@inheritdoc}
     */
    public function safeUp(): void
    {
        $this->createTable('lead', [
            'id'            => $this->bigPrimaryKey(),
            'company'       => $this->string(255)->notNull(),
            'full_name'     => $this->string(255)->notNull()->comment("ФИО контактного лица"),
            'phone'         => $this->string(20)->notNull(),
            'summary'       => $this->text()->notNull()->comment("Резюме диалога с AI-ассистентом"),
            'messages'      => $this->json()->defaultValue(null)->comment("История сообщений с AI-агентом (массив)"),
            'status'        => $this->string(20)->notNull()->defaultValue("new")->comment("Статус заявки: new, in_progress, closed, cancelled"),
            'manager_note'  => $this->text()->defaultValue(null)->comment("Заметка менеджера (опционально, для будущего расширения)"),
            'created_at'    => $this->timestamp()->defaultExpression('CURRENT_TIMESTAMP'),
            'updated_at'    => $this->timestamp()->defaultExpression('CURRENT_TIMESTAMP ON UPDATE CURRENT_TIMESTAMP'),
        ]);

        $this->createIndex('idx_lead_status', 'lead', 'status');
    }

    /**
     * {@inheritdoc}
     */
    public function safeDown(): void
    {
        $this->dropIndex('idx_lead_status', 'lead');
        $this->dropTable('lead');
    }
}
