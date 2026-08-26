<?php
/**
 * @package Laposta WooCommerce
 */
/*
Plugin Name: Laposta WooCommerce
Plugin URI: http://laposta.nl/documentatie/wordpress.524.html
Description: Laposta is programma waarmee je gemakkelijk en snel nieuwsbrieven kunt maken en versturen. Met deze plugin plaats je snel een optie in de checkout voor een nieuwsbrief registratie.
Version: 1.12.1
WC tested up to: 11.0
Author: Laposta - Stijn van der Ree
Author URI: http://laposta.nl/contact
License: GPLv2 or later
*/

/*
This program is free software; you can redistribute it and/or
modify it under the terms of the GNU General Public License
as published by the Free Software Foundation; either version 2
of the License, or (at your option) any later version.

This program is distributed in the hope that it will be useful,
but WITHOUT ANY WARRANTY; without even the implied warranty of
MERCHANTABILITY or FITNESS FOR A PARTICULAR PURPOSE.  See the
GNU General Public License for more details.

You should have received a copy of the GNU General Public License
along with this program; if not, write to the Free Software
Foundation, Inc., 51 Franklin Street, Fifth Floor, Boston, MA  02110-1301, USA.
*/

// Make sure we don't expose any info if called directly
if ( !function_exists( 'add_action' ) ) {
	echo 'Hi there!  I\'m just a plugin, not much I can do when called directly.';
	exit;
}

if (!defined('LAPOSTA_WOOCOMMERCE_VERSION')) {
	define('LAPOSTA_WOOCOMMERCE_VERSION', '1.12.1');
}
define('LAPOSTA_WOOCOMMERCE_PLUGIN_URL', plugin_dir_url( __FILE__ ));

// Register the plugin helper bootstrap and bundled API autoloader.
require_once __DIR__ . '/autoload.php';

add_action('before_woocommerce_init', 'laposta_woocommerce_declare_checkout_block_compatibility');

/**
 * Declare support for WooCommerce's Cart and Checkout blocks and HPOS.
 */
function laposta_woocommerce_declare_checkout_block_compatibility() {
	if (class_exists('\Automattic\WooCommerce\Utilities\FeaturesUtil')) {
		\Automattic\WooCommerce\Utilities\FeaturesUtil::declare_compatibility('cart_checkout_blocks', __FILE__, true);
		\Automattic\WooCommerce\Utilities\FeaturesUtil::declare_compatibility('custom_order_tables', __FILE__, true);
	}
}



if (!class_exists('Laposta_Woocommerce_Template')) {
	class Laposta_Woocommerce_Template {

		public function __construct() {
			add_action('admin_init', array($this, 'admin_init'));
			add_action('admin_menu', array($this, 'add_menu'), 100);
		}

		// hook into WP's admin_init action hook
		public function admin_init() { 

			// Set up the settings for this plugin 
			$this->init_settings();
		}

		// Initialize some custom settings
		public function init_settings() {
			// register the settings for this plugin with sanitization
			register_setting('laposta_woocommerce_template-group', 'laposta-checkout-title', array(
				'sanitize_callback' => 'sanitize_text_field',
			));
			register_setting('laposta_woocommerce_template-group', 'laposta-api_key', array(
				'sanitize_callback' => 'sanitize_text_field',
			));
			register_setting('laposta_woocommerce_template-group', 'laposta-checkout-list', array(
				'sanitize_callback' => 'sanitize_text_field',
			));
		}

		// add a menu
		public function add_menu() {
			$actualCapability = apply_filters('laposta_woocommerce_settings_page_capability', 'manage_options');
			$actualCapability = is_string($actualCapability) ? $actualCapability : 'manage_options';

			if (laposta_woocommerce_wc_menu_exists()){
				add_submenu_page('woocommerce', 'Laposta Woocommerce', 'Laposta', $actualCapability, 'laposta_woocommerce_options', array(&$this, 'laposta_woocommerce_settings_page'), 100);
			} else {
				add_options_page('Laposta Woocommerce', 'Laposta', $actualCapability, 'laposta_woocommerce_options', array(&$this, 'laposta_woocommerce_settings_page'), 100);
			}

		}

		// Menu Callback 
		public function laposta_woocommerce_settings_page() {
			include(sprintf("%s/templates/settings.php", dirname(__FILE__)));
		}

	}
}

function laposta_woocommerce_wc_menu_exists()
{
	global $menu;
	foreach ($menu as $item) {
		if ($item[2] === 'woocommerce') {
			return true;
		}
	}

	return false;
}

if (class_exists('Laposta_Woocommerce_Template')) {

	// instantiate the plugin class
	$laposta_template = new Laposta_Woocommerce_Template();

	// Add a link to the settings page onto the plugin page 
	if (isset($laposta_template)) { 

		// Add the settings link to the plugins page
		function laposta_woocommerce_settings_link($links) {
			if (laposta_woocommerce_wc_menu_exists()){
				$settings_link = '<a href="admin.php?page=laposta_woocommerce_options">Settings</a>';
			} else {
				$settings_link = '<a href="options-general.php?page=laposta_woocommerce_options">Settings</a>';
			}

			array_unshift($links, $settings_link); 
			return $links; 
		}

		$plugin = plugin_basename(__FILE__);
		add_filter("plugin_action_links_$plugin", 'laposta_woocommerce_settings_link');
	}
}

// checkbox
if (!class_exists('Laposta_Subscribe')) {
	class Laposta_Subscribe {
		const BLOCK_CHECKOUT_FIELD_ID = 'laposta/newsletter-signup';
		const SUBSCRIPTION_PROCESSED_META_KEY = '_laposta_newsletter_subscription_processed';

		public function __construct() {
			add_filter('woocommerce_checkout_fields', array($this, 'addFieldToCheckout'));
			add_action('woocommerce_checkout_order_processed', array($this, 'actionWooCheckoutOrderProcessed'), 10, 3);
			add_action('after_setup_theme', array($this, 'addCheckoutBlockFieldRegistrationHook'));
			add_action('woocommerce_store_api_checkout_order_processed', array($this, 'actionWooStoreApiCheckoutOrderProcessed'));
			add_filter('woocommerce_email_order_meta_keys', array($this, 'filterWooEmailOrderMetaKeys'));
		}

		/**
		 * Return the configured checkout label with a backwards-compatible default.
		 *
		 * @return string
		 */
		private static function getCheckoutText() {
			$checkoutText = sanitize_text_field(get_option('laposta-checkout-title', 'Schrijf me in voor de nieuwsbrief.'));

			return $checkoutText !== '' ? $checkoutText : 'Schrijf me in voor de nieuwsbrief.';
		}

		public static function addFieldToCheckout($fields) {
			$checkoutText = self::getCheckoutText();

			// add field at end of billing fields section
			$fields['billing']['nieuwsbrief_signup'] = array(
				'type' => 'checkbox',
				'label' => $checkoutText,
				'placeholder' => 'Schrijf me in voor de nieuwsbrief.',
				'required' => false,
				'class' => array(),
				'label_class' => array(),
			);

			return $fields;
		}

		/**
		 * Register the Checkout Block field callback at a filterable priority.
		 */
		public function addCheckoutBlockFieldRegistrationHook() {
			/**
			 * Filter the order used for the Laposta field among other additional checkout fields.
			 *
			 * Lower priorities register earlier. This does not move the Additional information block itself.
			 *
			 * @param int $priority WooCommerce initialization hook priority.
			 */
			$priority = apply_filters('laposta_woocommerce_checkout_block_field_priority', 10);
			$priority = is_numeric($priority) ? (int) $priority : 10;

			add_action('woocommerce_init', array($this, 'registerCheckoutBlockField'), $priority);
		}

		/**
		 * Register the newsletter opt-in for the WooCommerce Checkout Block.
		 */
		public static function registerCheckoutBlockField() {
			if (!function_exists('woocommerce_register_additional_checkout_field')) {
				return;
			}

			$checkoutText = self::getCheckoutText();
			woocommerce_register_additional_checkout_field(array(
				'id' => self::BLOCK_CHECKOUT_FIELD_ID,
				'label' => $checkoutText,
				'optionalLabel' => $checkoutText,
				'location' => 'order',
				'type' => 'checkbox',
				'required' => false,
				'show_in_order_confirmation' => false,
			));
		}

		/**
		 * Process the newsletter opt-in submitted through classic checkout.
		 *
		 * @param int            $order_id
		 * @param array          $posted_data
		 * @param \WC_Order|null $order
		 */
		public static function actionWooCheckoutOrderProcessed($order_id, $posted_data = array(), $order = null) {
			if (!is_array($posted_data)) {
				$posted_data = array();
			}

			$rawSubscribe = '';
			if (isset($posted_data['nieuwsbrief_signup'])) {
				$rawSubscribe = sanitize_text_field(wp_unslash($posted_data['nieuwsbrief_signup']));
			} elseif (isset($_POST['nieuwsbrief_signup'])) {
				$rawSubscribe = sanitize_text_field(wp_unslash($_POST['nieuwsbrief_signup']));
			}

			$subscribe = !in_array($rawSubscribe, array('', '0', 'false', 'no', 'off'), true);
			$order = $order instanceof \WC_Order ? $order : wc_get_order($order_id);
			self::processOrderSubscription($order, $subscribe, 'classic');
		}

		/**
		 * Process the newsletter opt-in submitted through the Checkout Block.
		 *
		 * @param \WC_Order $order
		 */
		public static function actionWooStoreApiCheckoutOrderProcessed($order) {
			if (!$order instanceof \WC_Order || !class_exists('\Automattic\WooCommerce\Blocks\Package')) {
				return;
			}

			try {
				$checkoutFields = \Automattic\WooCommerce\Blocks\Package::container()->get(
					\Automattic\WooCommerce\Blocks\Domain\Services\CheckoutFields::class
				);
				$subscribe = (bool) $checkoutFields->get_field_from_object(
					self::BLOCK_CHECKOUT_FIELD_ID,
					$order,
					'other'
				);
			} catch (\Throwable $e) {
				if (defined('WP_DEBUG') && WP_DEBUG) {
					error_log('Laposta WooCommerce block checkout field error: order=' . $order->get_id() . ' message=' . $e->getMessage());
				}
				return;
			}

			self::processOrderSubscription($order, $subscribe, 'block');
		}

		/**
		 * Persist the opt-in decision and subscribe the order email when requested.
		 *
		 * @param \WC_Order|null $order
		 * @param bool           $subscribe
		 * @param string         $checkoutType
		 */
		private static function processOrderSubscription($order, $subscribe, $checkoutType) {
			if (!$order instanceof \WC_Order) {
				return;
			}

			$list = sanitize_text_field(get_option('laposta-checkout-list'));
			$apiKey = sanitize_text_field(get_option('laposta-api_key'));
			$checkoutText = self::getCheckoutText();
			$order->update_meta_data($checkoutText, $subscribe ? 'ja' : 'nee');
			$order->save();

			if (defined('WP_DEBUG') && WP_DEBUG) {
				error_log('Laposta WooCommerce checkout: order=' . $order->get_id() . ' type=' . $checkoutType . ' subscribe=' . ($subscribe ? 'yes' : 'no') . ' list=' . $list);
			}

			if (!$subscribe || $list === '' || $apiKey === '') {
				return;
			}

			if ($order->get_meta(self::SUBSCRIPTION_PROCESSED_META_KEY, true)) {
				return;
			}

			$email = sanitize_email($order->get_billing_email());
			$firstName = sanitize_text_field($order->get_billing_first_name());
			$lastName = sanitize_text_field($order->get_billing_last_name());
			$ip = $order->get_customer_ip_address();
			$ip = $ip && filter_var($ip, FILTER_VALIDATE_IP) ? $ip : '127.0.0.1';

			if ($email === '') {
				return;
			}

			try {
				$result = LapostaWoocommerceLapostaApi::createMember($apiKey, $list, array(
					'ip' => $ip,
					'email' => $email,
					'custom_fields' => array(
						'voornaam' => $firstName,
						'achternaam' => $lastName,
					),
					'options' => array(
						'upsert' => true,
					),
				));
				$order->update_meta_data(self::SUBSCRIPTION_PROCESSED_META_KEY, 'yes');
				$order->save();

				if (defined('WP_DEBUG') && WP_DEBUG) {
					error_log('Laposta WooCommerce subscribe success: order=' . $order->get_id() . ' email=' . $email . ' member_id=' . (isset($result['member']['member_id']) ? $result['member']['member_id'] : ''));
				}
			} catch (\Throwable $e) {
				if (defined('WP_DEBUG') && WP_DEBUG) {
					error_log('Laposta WooCommerce subscribe error: order=' . $order->get_id() . ' email=' . $email . ' message=' . $e->getMessage());
				}
			}
		}

		/**
		 * Add the newsletter decision to WooCommerce order emails.
		 *
		 * @param array $keys
		 * @return array
		 */
		public static function filterWooEmailOrderMetaKeys($keys) {
			$keys[] = self::getCheckoutText();

			return $keys;
		}
	}
}

if (class_exists('Laposta_Subscribe')) {
    // instantiate the plugin class
    $lapostaSubscribe = new Laposta_Subscribe();
}
