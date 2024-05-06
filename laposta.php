<?php
/**
 * @package Laposta WooCommerce
 */
/*
Plugin Name: Laposta WooCommerce
Plugin URI: http://laposta.nl/documentatie/wordpress.524.html
Description: Laposta is programma waarmee je gemakkelijk en snel nieuwsbrieven kunt maken en versturen. Met deze plugin plaats je snel een optie in de checkout voor een nieuwsbrief registratie.
Version: 1.7.1
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

define('LAPOSTA_WOOCOMMERCE_VERSION', '1.7.1');
define('LAPOSTA_WOOCOMMERCE_PLUGIN_URL', plugin_dir_url( __FILE__ ));



if (!class_exists('Laposta_Woocommerce_Template')) {
	class Laposta_Woocommerce_Template {

		public function __construct() {
			add_action('admin_init', array($this, 'admin_init'));
			add_action('admin_menu', array($this, 'add_menu'));
		}

		// hook into WP's admin_init action hook
		public function admin_init() { 

			// Set up the settings for this plugin 
			$this->init_settings(); 
		}

		// Initialize some custom settings
		public function init_settings() {
			// register the settings for this plugin
			register_setting('laposta_woocommerce_template-group', 'laposta-checkout-title');
			register_setting('laposta_woocommerce_template-group', 'laposta-api_key');
			register_setting('laposta_woocommerce_template-group', 'laposta-checkout-list');
		}

		// add a menu
		public function add_menu() { 
			add_options_page('Laposta Woocommerce', 'Laposta Woocommerce', 'manage_options', 'laposta_woocommerce_options', array(&$this, 'laposta_woocommerce_settings_page'));
		}

		// Menu Callback 
		public function laposta_woocommerce_settings_page() {

			if (!current_user_can('manage_options')) { 
				wp_die(__('You do not have sufficient permissions to access this page.')); 
			} 

			// Render the settings template 
			include(sprintf("%s/templates/settings.php", dirname(__FILE__))); 
		}
	}
}

if (class_exists('Laposta_Woocommerce_Template')) {

	// instantiate the plugin class
	$laposta_template = new Laposta_Woocommerce_Template();

	// Add a link to the settings page onto the plugin page 
	if (isset($laposta_template)) { 

		// Add the settings link to the plugins page
		function laposta_woocommerce_settings_link($links) {
			$settings_link = '<a href="options-general.php?page=laposta_woocommerce_options">Settings</a>';
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

        public function __construct() {
            add_filter('woocommerce_checkout_fields', array($this, 'addFieldToCheckout'));
            add_action('woocommerce_checkout_update_order_meta', array($this, 'actionWooCheckoutUpdateOrderMeta'));
            add_filter('woocommerce_email_order_meta_keys', array($this, 'filterWooEmailOrderMetaKeys'));
        }

        public static function addFieldToCheckout($fields) {
            $checkoutText = get_option('laposta-checkout-title', 'Schrijf me in voor de nieuwsbrief.');

            if($checkoutText == ''){
                $checkoutText = 'Schrijf me in voor de nieuwsbrief.';
            }

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
         * save custom order fields
         * @param int $order_id
         */
        public static function actionWooCheckoutUpdateOrderMeta($order_id) {
            $checkoutText = get_option('laposta-checkout-title', 'Schrijf me in voor de nieuwsbrief.');
            $list = get_option('laposta-checkout-list');
            $apiKey = get_option('laposta-api_key');

            if($checkoutText == ''){
                $checkoutText = 'Schrijf me in voor de nieuwsbrief.';
            }

            if(isset($list) && $list !== '') {
                $subscribe = isset($_POST['nieuwsbrief_signup']) ? 'ja' : 'nee';
                update_post_meta($order_id, $checkoutText, $subscribe);

                // connect to API
                if(isset($_POST['nieuwsbrief_signup'])) {

                    // sanatize input
                    $ip = $_SERVER['REMOTE_ADDR'];
                    if (!filter_var($ip, FILTER_VALIDATE_IP)) {
                        $ip = '127.0.0.1';
                    }
		    $email = sanitize_email($_POST['billing_email']);
		    $first_name = sanitize_text_field($_POST['billing_first_name']);
		    $last_name = sanitize_text_field($_POST['billing_last_name']); 

                    require_once("includes/laposta-php-1.2/lib/Laposta.php");
                    Laposta::setApiKey($apiKey);
                    $member = new Laposta_Member($list);
                    $data = [
                        'ip' => $ip,
                        'email' => $email,
                        'custom_fields' => array(
                            'voornaam' => $first_name,
                            'achternaam' => $last_name
                        )
                    ];
		    try {
			    $member->create($data);
		    } catch (Exception $e) {
			// ignore
		    }
                }
            }
        }

        /**
         * add our custom fields to WooCommerce order emails
         * @param array $keys
         * @return array
         */
        public static function filterWooEmailOrderMetaKeys($keys) {
            $keys[] = 'Schrijf me in voor de nieuwsbrief.';

            return $keys;
        }
    }
}

if (class_exists('Laposta_Subscribe')) {
    // instantiate the plugin class
    $lapostaSubscribe = new Laposta_Subscribe();
}

