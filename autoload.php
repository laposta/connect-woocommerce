<?php

/**
 * Primary runtime autoloader for the plugin helpers plus the bundled Laposta API v2 library.
 *
 * WordPress boots the plugin through laposta.php, which includes this file.
 * In Composer-managed installs, the root project autoloader may also load this file.
 */

require_once __DIR__ . '/includes/LapostaWoocommerceLapostaApi.php';

/**
 * Register the version-scoped Laposta API v2 autoloader.
 */
if (PHP_VERSION_ID >= 80100) {
    spl_autoload_register(function ($class) {
        $prefixes = [
            'LapostaApi230\\Vendor\\Psr\\Http\\Client\\' => [
                __DIR__ . '/includes/laposta-api-php-2/vendor/psr/http-client/src/',
            ],
            'LapostaApi230\\Vendor\\Psr\\Http\\Message\\' => [
                __DIR__ . '/includes/laposta-api-php-2/vendor/psr/http-message/src/',
                __DIR__ . '/includes/laposta-api-php-2/vendor/psr/http-factory/src/',
            ],
            'LapostaApi230\\' => [
                __DIR__ . '/includes/laposta-api-php-2/src/',
            ],
        ];

        foreach ($prefixes as $prefix => $baseDirs) {
            if (strpos($class, $prefix) !== 0) {
                continue;
            }

            $relativeClass = substr($class, strlen($prefix));
            $relativePath = str_replace('\\', '/', $relativeClass) . '.php';

            foreach ($baseDirs as $baseDir) {
                $file = $baseDir . $relativePath;
                if (file_exists($file)) {
                    require_once $file;
                    return;
                }
            }
        }
    });
}
