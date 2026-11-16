<?php

declare(strict_types=1);

namespace modules\ai;

use Yii;
use yii\base\Action;
use yii\base\Module as BaseModule;
use yii\web\Response;

class Module extends BaseModule
{
    /**
     * @param Action $action
     * @return bool
     */
    public function beforeAction($action): bool
    {
        if (!parent::beforeAction($action)) {
            return false;
        }

        if (Yii::$app->has('response')) {
            Yii::$app->response->format = Response::FORMAT_JSON;
        }

        return true;
    }
}
