<?php

declare(strict_types=1);

namespace modules\admin\presentation\controller;

use Yii;
use yii\helpers\Url;
use yii\web\Controller;
use yii\web\Response;

final class WidgetController extends Controller
{
    public $enableCsrfValidation = false;

    public function beforeAction($action): bool
    {
        if (!parent::beforeAction($action)) {
            return false;
        }

        if (Yii::$app->hasModule('debug')) {
            $debugModule = Yii::$app->getModule('debug');
            if ($debugModule !== null) {
                Yii::$app->response->off(Response::EVENT_AFTER_PREPARE, [$debugModule, 'renderToolbar']);
            }
        }

        // Разрешаем кросс-доменное встраивание и загрузку скрипта на любых внешних сайтах
        $headers = Yii::$app->response->headers;
        $headers->set('Access-Control-Allow-Origin', '*');
        $headers->set('Access-Control-Allow-Methods', 'GET, POST, PUT, PATCH, DELETE, OPTIONS');
        $headers->set('Access-Control-Allow-Headers', 'Content-Type, Authorization, X-Requested-With');
        $headers->remove('X-Frame-Options');

        return true;
    }

    /**
     * Прямой вход по http://path/to/backend/admin
     */
    public function actionIndex(): string
    {
        Yii::$app->response->format = Response::FORMAT_HTML;
        $apiBaseUrl = rtrim(Url::base(true), '/');

        return $this->render('index', [
            'apiBaseUrl' => $apiBaseUrl,
        ]);
    }

    /**
     * Подключение через <script src="path/to/backend/admin/widget"></script>
     */
    public function actionScript(): Response
    {
        $response = Yii::$app->response;
        $response->format = Response::FORMAT_RAW;
        $response->headers->set('Content-Type', 'application/javascript; charset=UTF-8');
        $response->headers->set('Cache-Control', 'no-cache, no-store, must-revalidate');

        $adminUrl = Url::to(['/admin/widget/index'], true);

        $js = <<<JS
(function() {
    if (window.__SCRIPT_ADMIN_WIDGET_LOADED__) return;
    window.__SCRIPT_ADMIN_WIDGET_LOADED__ = true;

    const ADMIN_URL = "{$adminUrl}";

    function initAdminWidget() {
        // Стили для плавающего кружка и широкого модального окна
        const style = document.createElement('style');
        style.textContent = `
            #sa-widget-launcher {
                position: fixed;
                bottom: 16px;
                right: 88px;
                width: 56px;
                height: 56px;
                border-radius: 9999px;
                background: linear-gradient(135deg, rgb(59, 7, 100) 0%, rgb(126, 34, 206) 55%, rgb(168, 85, 247) 100%);
                box-shadow: 0 10px 25px -5px rgba(126, 34, 206, 0.55), 0 8px 10px -6px rgba(59, 7, 100, 0.4);
                cursor: pointer;
                z-index: 2147483646;
                display: flex;
                align-items: center;
                justify-content: center;
                transition: transform 0.25s cubic-bezier(0.4, 0, 0.2, 1), box-shadow 0.25s ease;
                border: 1px solid rgba(255, 255, 255, 0.18);
                user-select: none;
            }
            #sa-widget-launcher:hover {
                transform: scale(1.08) translateY(-2px);
                box-shadow: 0 18px 32px -5px rgba(168, 85, 247, 0.65), 0 10px 15px -6px rgba(59, 7, 100, 0.5);
            }
            #sa-widget-launcher:active {
                transform: scale(0.96);
            }
            #sa-widget-launcher svg {
                width: 28px;
                height: 28px;
                color: #ffffff;
                transition: transform 0.3s ease;
            }
            #sa-widget-launcher.sa-active svg {
                transform: rotate(90deg);
            }
            #sa-widget-backdrop {
                position: fixed;
                inset: 0;
                background: rgba(9, 9, 15, 0.72);
                backdrop-filter: blur(6px);
                -webkit-backdrop-filter: blur(6px);
                z-index: 2147483647;
                display: flex;
                align-items: center;
                justify-content: center;
                opacity: 0;
                pointer-events: none;
                transition: opacity 0.25s ease;
                padding: 20px;
                box-sizing: border-box;
            }
            #sa-widget-backdrop.sa-open {
                opacity: 1;
                pointer-events: auto;
            }
            #sa-widget-modal {
                width: 94vw;
                max-width: 1480px;
                height: 90vh;
                background: #0f111a;
                border-radius: 16px;
                border: 1px solid rgba(168, 85, 247, 0.28);
                box-shadow: 0 25px 60px -15px rgba(0, 0, 0, 0.75), 0 0 40px -10px rgba(126, 34, 206, 0.3);
                overflow: hidden;
                display: flex;
                flex-direction: column;
                transform: scale(0.96) translateY(12px);
                transition: transform 0.28s cubic-bezier(0.16, 1, 0.3, 1);
                position: relative;
            }
            #sa-widget-backdrop.sa-open #sa-widget-modal {
                transform: scale(1) translateY(0);
            }
            #sa-widget-iframe {
                width: 100%;
                height: 100%;
                border: none;
                background: #0f111a;
            }
        `;
        document.head.appendChild(style);

        // Кнопка-кружок в правом нижнем углу
        const launcher = document.createElement('div');
        launcher.id = 'sa-widget-launcher';
        launcher.title = 'Открыть панель управления';
        launcher.innerHTML = `
            <svg width="61" height="56" viewBox="0 0 61 56" fill="none" xmlns="http://www.w3.org/2000/svg">
                <path d="M47.344 39.4508L42.465 32.7966L35.4023 23.1654L48.7893 23.1492L55.7934 32.7815L60.8197 39.6914L48.7449 55.815L35.8982 55.8301V55.7622L43.8214 44.472L47.344 39.4508Z" fill="#E6E9EE"/>
                <path d="M14.116 16.4873L18.8686 23.0278L25.8713 32.6659L11.9217 32.681L4.97479 23.0451L0 16.143L11.97 0.0172691L25.4633 0V0.169448L17.444 11.7006L14.116 16.4873Z" fill="#E6E9EE"/>
            </svg>
        `;

        // Модальное окно
        const backdrop = document.createElement('div');
        backdrop.id = 'sa-widget-backdrop';
        backdrop.innerHTML = `
            <div id="sa-widget-modal">
                <iframe id="sa-widget-iframe" allow="clipboard-write"></iframe>
            </div>
        `;

        document.body.appendChild(launcher);
        document.body.appendChild(backdrop);

        const iframe = backdrop.querySelector('#sa-widget-iframe');
        let isLoaded = false;

        function toggleModal(forceState) {
            const isOpen = typeof forceState === 'boolean'
                ? forceState
                : !backdrop.classList.contains('sa-open');

            if (isOpen) {
                if (!isLoaded) {
                    iframe.src = ADMIN_URL + (ADMIN_URL.includes('?') ? '&' : '?') + 'embedded=1';
                    isLoaded = true;
                }
                backdrop.classList.add('sa-open');
                launcher.classList.add('sa-active');
                document.body.style.overflow = 'hidden';
            } else {
                backdrop.classList.remove('sa-open');
                launcher.classList.remove('sa-active');
                document.body.style.overflow = '';
            }
        }

        launcher.addEventListener('click', function() {
            toggleModal();
        });

        backdrop.addEventListener('click', function(e) {
            if (e.target === backdrop) {
                toggleModal(false);
            }
        });

        document.addEventListener('keydown', function(e) {
            if (e.key === 'Escape' && backdrop.classList.contains('sa-open')) {
                toggleModal(false);
            }
        });

        window.addEventListener('message', function(e) {
            if (e.data && e.data.type === 'SA_ADMIN_CLOSE') {
                toggleModal(false);
            }
        });
    }

    if (document.readyState === 'loading') {
        document.addEventListener('DOMContentLoaded', initAdminWidget);
    } else {
        initAdminWidget();
    }
})();
JS;

        $response->content = $js;
        return $response;
    }
}
