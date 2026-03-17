<?php

if (!class_exists('LapostaWoocommerceLapostaApi')) {
	class LapostaWoocommerceLapostaApi {

		private static $v2AutoloaderRegistered = false;

		public static function useApiV2() {
			return PHP_VERSION_ID >= 80000;
		}

		public static function getLists($api_key) {
			if (self::useApiV2()) {
				self::loadApiV2();
				$laposta = new \LapostaApi230\Laposta($api_key);

				return $laposta->listApi()->all();
			}

			self::loadApiV1();
			Laposta::setApiKey($api_key);
			$list = new Laposta_List();

			return $list->all();
		}

		public static function createMember($api_key, $list_id, $data) {
			if (self::useApiV2()) {
				self::loadApiV2();
				$laposta = new \LapostaApi230\Laposta($api_key);

				return $laposta->memberApi()->create($list_id, $data);
			}

			self::loadApiV1();
			Laposta::setApiKey($api_key);
			$member = new Laposta_Member($list_id);

			return $member->create($data);
		}

		private static function loadApiV1() {
			require_once dirname(__FILE__) . '/laposta-php-1.2/lib/Laposta.php';
		}

		private static function loadApiV2() {
			if (self::$v2AutoloaderRegistered) {
				return;
			}

			spl_autoload_register(array(__CLASS__, 'autoloadApiV2'));
			self::$v2AutoloaderRegistered = true;
		}

		private static function autoloadApiV2($class) {
			$prefixes = array(
				'LapostaApi230\\Vendor\\Psr\\Http\\Client\\' => array(
					dirname(__FILE__) . '/laposta-api-php-2/vendor/psr/http-client/src/',
				),
				'LapostaApi230\\Vendor\\Psr\\Http\\Message\\' => array(
					dirname(__FILE__) . '/laposta-api-php-2/vendor/psr/http-message/src/',
					dirname(__FILE__) . '/laposta-api-php-2/vendor/psr/http-factory/src/',
				),
				'LapostaApi230\\' => array(
					dirname(__FILE__) . '/laposta-api-php-2/src/',
				),
			);

			foreach ($prefixes as $prefix => $base_dirs) {
				if (strpos($class, $prefix) !== 0) {
					continue;
				}

				$relative_class = substr($class, strlen($prefix));
				$relative_path = str_replace('\\', '/', $relative_class) . '.php';
				foreach ($base_dirs as $base_dir) {
					$file = $base_dir . $relative_path;
					if (file_exists($file)) {
						require_once $file;
						return;
					}
				}
			}
		}
	}
}
