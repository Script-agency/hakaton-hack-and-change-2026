<?php

declare(strict_types=1);

use modules\admin\presentation\assets\AdminAsset;
use yii\helpers\Html;
use yii\web\View;

/** @var View $this */
/** @var string $content */

AdminAsset::register($this);
?>
<?php $this->beginPage() ?>
    <!DOCTYPE html>
    <html lang="ru">
    <head>
        <meta charset="UTF-8">
        <meta name="viewport" content="width=device-width, initial-scale=1.0">
        <title><?= Html::encode($this->title ?: 'Admin Panel') ?></title>
        <script src="https://cdn.tailwindcss.com"></script>
        <script>
            tailwind.config = {
                theme: {
                    extend: {
                        fontFamily: {
                            sans: ['system-ui', 'sans-serif']
                        },
                        colors: {
                            brand: {
                                DEFAULT: 'var(--color-brand)',
                                hover: 'var(--color-brand-hover)',
                                soft: 'var(--color-brand-soft)'
                            },
                            'on-brand': 'var(--color-on-brand)',
                            canvas: 'var(--color-canvas)',
                            surface: {
                                DEFAULT: 'var(--color-surface)',
                                muted: 'var(--color-surface-muted)'
                            },
                            ink: {
                                DEFAULT: 'var(--color-text)',
                                secondary: 'var(--color-text-secondary)'
                            },
                            icon: 'var(--color-icon)',
                            line: {
                                DEFAULT: 'var(--color-border)',
                                subtle: 'var(--color-border-subtle)',
                                strong: 'var(--color-border-strong)'
                            },
                            success: {
                                DEFAULT: 'var(--color-success)',
                                bg: 'var(--color-success-background)'
                            },
                            danger: {
                                DEFAULT: 'var(--color-error)',
                                bg: 'var(--color-error-background)'
                            }
                        }
                    }
                }
            };
        </script>
        <link href="https://cdnjs.cloudflare.com/ajax/libs/font-awesome/6.4.0/css/all.min.css" rel="stylesheet">
        <?php $this->head() ?>
    </head>
    <body class="bg-canvas text-ink antialiased selection:bg-brand selection:text-on-brand overflow-hidden">
    <?php $this->beginBody() ?>
    <?= $content ?>
    <?php $this->endBody() ?>
    </body>
    </html>
<?php $this->endPage() ?>