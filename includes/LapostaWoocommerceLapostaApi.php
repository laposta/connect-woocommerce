<?php

if (!class_exists('LapostaWoocommerceLapostaApi')) {
	class LapostaWoocommerceLapostaApi {

		public static function useApiV2() {
			return PHP_VERSION_ID >= 80000;
		}

		public static function getLists($api_key) {
			if (self::useApiV2()) {
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
	}
}
