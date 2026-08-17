=== Laposta WooCommerce ===
Contributors: stijnvanderree, roelbousardt
Tags: laposta, nieuwsbrieven, aanmelden
Requires at least: 3.0
Tested up to: 7.1
Requires PHP: 7.1
Stable tag: 1.12.0
License: GPLv2 or later

This plugin can be used to add an optin checkbox to receive newsletters, using
Laposta newsletter software (https://laposta.nl).

== Description ==

Laposta is a Dutch emailmarketing solution. Use this plugin to add an optin checkbox to your checkout,
so your customers can subscribe to your newsletter.
On PHP 8.1 and newer, the plugin uses the Laposta API v2 wrapper for compatibility.
Checkout Block integration is available with WooCommerce 8.9 and newer. Earlier WooCommerce versions continue to use the classic checkout integration.

== Developer filter ==

The Checkout Block renders all fields registered for the `order` location inside its Additional information section. The section itself can be moved in the block editor.

Developers can influence the Laposta field's relative order within that section with the `laposta_woocommerce_checkout_block_field_priority` filter. Lower values register the field earlier; the default is `10`:

`add_filter( 'laposta_woocommerce_checkout_block_field_priority', function() { return 5; } );`

This filter only influences the Laposta field relative to other registered order fields. It does not move the Additional information section or provide an absolute position when another extension uses the same priority.

== Installation ==

Unzip the file in the plugins directory, and activate the plugin in the
Plugins screen. Then go to the Settings to setup the connection to Laposta.

== Upgrade Notice ==

= 1.12.0 =
- Added native support for the WooCommerce Checkout Block while retaining classic checkout support.
- Added a developer filter for influencing the field's relative order within Additional information.

== Changelog ==
= 1.12.0 =
* Added: Support for the WooCommerce Checkout Block while retaining classic checkout support.
* Added: Developer filter for influencing the Laposta field's relative order within the Checkout Block's Additional information section.
* Changed: Checkout subscriptions now use a shared, idempotent order-processing path.
* Compatibility: Checkout Block integration requires WooCommerce 8.9 or newer; earlier versions continue to use the classic checkout integration.
* Compatibility: Tested with WordPress 7.1 and WooCommerce 11.0.1.

= 1.11.3 =
- Tested up to WordPress 7.0

= 1.11.2 =
* Changed: Removed the admin notice about continued support.

= 1.11.1 =
* Fixed: Corrected the Laposta API v2 PHP threshold to PHP 8.1 and newer. PHP 8.0 now correctly continues to use the legacy wrapper.

= 1.11.0 =
* Added: Composer package metadata for Composer-managed installs.
* Changed: Moved the version-scoped Laposta API v2 autoloader into the main plugin bootstrap.

= 1.10.2 =
* Fixed newsletter opt-in edge cases in checkout handling.
* On PHP 8 and newer, switched Laposta API integration to the v2 wrapper.

= 1.10.1 =
* Support for this plugin continues. Updated plugin messaging to clearly communicate continued support.

= 1.10.0 =
* Please note: support for this plugin has been discontinued effective immediately. As an alternative, you can use the third-party plugin "Laposta for WooCommerce": https://docs.laposta.nl/article/1236-plugin-laposta-for-woocommerce

= 1.9.2 =
* Security fixes and improved input sanitization

= 1.9.1 =
* Important Notice: The plugin settings have been relocated again. You can now access them under the WooCommerce main menu.

= 1.9.0 =
* Important Notice: The plugin settings have been relocated. You can now access them directly from the main menu instead of the settings submenu.

= 1.8.0 =
* Tested up to: 6.6

= 1.7.1 =
* Tested for WP 6.5

= 1.6.0 =
* Tested for WP 6.1

= 1.5.1 =
* Bugfix for broken register_activation_hook and register_deactivation_hook

= 1.5 =
* Tested for WP 5.9

= 1.4 =
* Tested for WP 5.6 and 5.7

= 1.3 =
* Tested for WP 5.4 and 5.5

= 1.2 =
* Disabled irrelevant error messages
* Tested for WP 5.3.2

= 1.1 =
* Tested for WP 5.2.1

= 1.0 =
* Plugin initialised
