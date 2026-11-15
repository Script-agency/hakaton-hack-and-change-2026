<?php

declare(strict_types=1);

namespace modules\admin\presentation\assets;

use yii\web\AssetBundle;

final class AdminAsset extends AssetBundle
{
    public $sourcePath = '@modules/admin/presentation/assets/dist';

    public $css = [
        'css/admin.css',
    ];

    public $js = [
        'js/admin.js',
    ];
}
