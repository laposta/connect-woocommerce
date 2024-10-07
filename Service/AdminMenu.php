<?php

namespace Laposta\Woocommerce\Service;

class AdminMenu
{
	/**
	 * @var callable
	 */
    protected $settingsCallable;

	/**
	 * @var string
	 */
	protected $pluginUrl;

	/**
	 * @var string
	 */
	protected $pageTitle;

	/**
	 * @var string
	 */
	protected $menuTitle;

	public function __construct($settingsCallable, $pluginUrl, $pageTitle, $menuTitle)
	{
        $this->settingsCallable = $settingsCallable;
		$this->pluginUrl = $pluginUrl;
		$this->pageTitle = $pageTitle;
		$this->menuTitle = $menuTitle;
		$this->init();
	}

	protected function init(): void
	{
		add_action('admin_menu', [$this, 'renderMenu']);
		add_action('admin_head', [$this, 'addCustomSvgIcon']);
	}

	public function renderMenu(): void
	{
		$actualCapability = apply_filters('laposta_woocommerce_settings_page_capability', 'manage_options');
		$actualCapability = is_string($actualCapability) ? $actualCapability : 'manage_options';
		$position = apply_filters('laposta_woocommerce_menu_position', 79.903);
		$position = is_numeric($position) ? $position : 79.903;
		add_menu_page(
			$this->pageTitle,
			$this->menuTitle,
			$actualCapability,
			'laposta_woocommerce_options',
			$this->settingsCallable,
			'',
			$position
		);
	}

	public function addCustomSvgIcon(): void
	{
		?>
        <style>
            #toplevel_page_<?php echo 'laposta_woocommerce_options' ?> div.wp-menu-image:before {
                content: '';
                display: inline-block;
                width: 20px;
                height: 20px;
                background-color: currentColor;
                mask: url('<?php echo $this->pluginUrl.'assets/images/icon.svg' ?>') no-repeat center;
                background-size: contain;
            }
        </style>
		<?php
	}
}