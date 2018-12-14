<?php
class Laposta_Util {

	public static function connect($url, $headers, $api_key, $post = null, $method = null, $timeout = 15) {

		$error = false;

		$ch = curl_init();
		curl_setopt($ch, CURLOPT_URL, $url);
		curl_setopt($ch, CURLOPT_HEADER, false);
		curl_setopt($ch, CURLOPT_ENCODING, 'UTF-8');
		curl_setopt($ch, CURLOPT_FOLLOWLOCATION, false);
		curl_setopt($ch, CURLOPT_RETURNTRANSFER, true);
		curl_setopt($ch, CURLOPT_CONNECTTIMEOUT, $timeout);
		curl_setopt($ch, CURLOPT_TIMEOUT, $timeout);
		curl_setopt($ch, CURLOPT_FORBID_REUSE, true);
		curl_setopt($ch, CURLOPT_FRESH_CONNECT, true); 
		curl_setopt($ch, CURLOPT_USERPWD, $api_key . ':');
		curl_setopt($ch, CURLOPT_HTTPHEADER, $headers);
		curl_setopt($ch, CURLOPT_SSL_VERIFYPEER, false);

		if ($post) {
			curl_setopt($ch, CURLOPT_POST, true);
			curl_setopt($ch, CURLOPT_POSTFIELDS, $post);
		}

		if ($method == 'DELETE') {
			curl_setopt($ch, CURLOPT_CUSTOMREQUEST, 'DELETE');  
		}

		$body = curl_exec($ch);
		$info = curl_getinfo($ch);

		// controleer op fouten
		$error = false;
		if (curl_errno($ch)) {
			$error = true;
			$error_msg = curl_error($ch);
		}
		curl_close($ch);

		return array('error' => $error, 'error_msg' => $error_msg, 'status' => $info['http_code'], 'body' => $body, 'info' => $info);
	}

	public static function utf8($value) {

		if (is_string($value)) return utf8_encode($value);
		else if (is_array($value)) {
			function encode_items(&$item, $key) {
				$item = utf8_encode($item);
			}
			array_walk_recursive($value, 'encode_items');
		}

		return $value;
	}
}
?>
