<?php

declare(strict_types=1);

namespace modules\knowledge\infrastructure\migrations;

use yii\db\Migration;

class m261113_000002_create_knowledge_tables extends Migration
{
    public function safeUp(): void
    {
        $this->createTable('{{%knowledge_category}}', [
            'id'            => $this->bigPrimaryKey(),
            'parent_id'     => $this->bigInteger()->null(),
            'name'          => $this->string(150)->notNull(),
            'slug'          => $this->string(180)->notNull(),
            'description'   => $this->text()->null(),
            'sort_order'    => $this->integer()->notNull()->defaultValue(0),
            'is_active'     => $this->boolean()->notNull()->defaultValue(true),
            'created_at'    => $this->timestamp()->notNull()->defaultExpression('CURRENT_TIMESTAMP'),
            'updated_at'    => $this->timestamp()->notNull()->defaultExpression('CURRENT_TIMESTAMP'),
        ]);
        $this->createIndex('uq_knowledge_category_slug', '{{%knowledge_category}}', 'slug', true);
        $this->createIndex('idx_knowledge_category_parent', '{{%knowledge_category}}', 'parent_id');
        $this->addForeignKey('fk_knowledge_category_parent', '{{%knowledge_category}}', 'parent_id', '{{%knowledge_category}}', 'id', 'RESTRICT', 'CASCADE');

        $this->createTable('{{%knowledge_document}}', [
            'id'                => $this->bigPrimaryKey(),
            'title'             => $this->string(255)->notNull(),
            'description'       => $this->text()->null(),
            'original_filename' => $this->string(255)->notNull(),
            'storage_key'       => $this->string(512)->notNull(),
            'mime_type'         => $this->string(150)->notNull(),
            'extension'         => $this->string(20)->notNull(),
            'size_bytes'        => $this->bigInteger()->notNull(),
            'checksum'          => $this->string(64)->notNull(),
            'revision'          => $this->integer()->notNull()->defaultValue(1),
            'status'            => $this->string(20)->notNull()->defaultValue('draft'),
            'created_at'        => $this->timestamp()->notNull()->defaultExpression('CURRENT_TIMESTAMP'),
            'updated_at'        => $this->timestamp()->notNull()->defaultExpression('CURRENT_TIMESTAMP'),
            'deleted_at'        => $this->timestamp()->null(),
        ]);
        $this->createIndex('idx_knowledge_document_status', '{{%knowledge_document}}', 'status');
        $this->createIndex('idx_knowledge_document_checksum', '{{%knowledge_document}}', 'checksum');

        $this->createTable('{{%knowledge_part}}', [
            'id'                    => $this->bigPrimaryKey(),
            'document_id'           => $this->bigInteger()->notNull(),
            'category_id'           => $this->bigInteger()->notNull(),
            'title'                 => $this->string(255)->notNull(),
            'description'           => $this->text()->null(),
            'locator_type'          => $this->string(30)->notNull()->defaultValue('whole_file'),
            'locator'               => $this->json()->notNull()->defaultValue('{}'),
            'content_storage_key'   => $this->string(512)->null(),
            'revision'              => $this->integer()->notNull()->defaultValue(1),
            'sort_order'            => $this->integer()->notNull()->defaultValue(0),
            'is_active'             => $this->boolean()->notNull()->defaultValue(true),
            'created_at'            => $this->timestamp()->notNull()->defaultExpression('CURRENT_TIMESTAMP'),
            'updated_at'            => $this->timestamp()->notNull()->defaultExpression('CURRENT_TIMESTAMP'),
        ]);
        $this->createIndex('idx_knowledge_part_document', '{{%knowledge_part}}', ['document_id', 'sort_order']);
        $this->createIndex('idx_knowledge_part_category', '{{%knowledge_part}}', ['category_id', 'is_active']);
        $this->addForeignKey('fk_knowledge_part_document', '{{%knowledge_part}}', 'document_id', '{{%knowledge_document}}', 'id', 'CASCADE', 'CASCADE');
        $this->addForeignKey('fk_knowledge_part_category', '{{%knowledge_part}}', 'category_id', '{{%knowledge_category}}', 'id', 'RESTRICT', 'CASCADE');
    }

    public function safeDown(): void
    {
        $this->dropForeignKey('fk_knowledge_part_category', '{{%knowledge_part}}');
        $this->dropForeignKey('fk_knowledge_part_document', '{{%knowledge_part}}');
        $this->dropTable('{{%knowledge_part}}');
        $this->dropTable('{{%knowledge_document}}');
        $this->dropForeignKey('fk_knowledge_category_parent', '{{%knowledge_category}}');
        $this->dropTable('{{%knowledge_category}}');
    }
}
