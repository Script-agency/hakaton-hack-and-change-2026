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
    <html lang="ru" class="dark">
    <head>
        <meta charset="UTF-8">
        <meta name="viewport" content="width=device-width, initial-scale=1.0">
        <title><?= Html::encode($this->title ?: 'Admin Panel') ?></title>
        <script src="https://cdn.tailwindcss.com"></script>
        <script>
            tailwind.config = {
                darkMode: 'class',
                theme: {
                    extend: {
                        colors: {
                            dark: {
                                950: '#090a10',
                                900: '#0f111a',
                                800: '#161926',
                                700: '#1f2437',
                                600: '#2b324b'
                            }
                        }
                    }
                }
            };
        </script>
        <link href="https://cdnjs.cloudflare.com/ajax/libs/font-awesome/6.4.0/css/all.min.css" rel="stylesheet">
        <?php $this->head() ?>
    </head>
    <body class="bg-dark-950 text-slate-100 antialiased selection:bg-purple-600 selection:text-white overflow-hidden">
    <?php $this->beginBody() ?>
    <?= $content ?>
    <?php $this->endBody() ?>
    </body>
    </html>
<?php $this->endPage() ?>
