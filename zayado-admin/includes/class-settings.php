<?php
defined('ABSPATH') || exit;

class Zayado_Settings {

    public static function init(): void {
        add_action('admin_init', [self::class, 'register']);
    }

    public static function register(): void {
        register_setting('zayado_settings', 'zayado_api_url',     ['sanitize_callback' => 'sanitize_url']);
        register_setting('zayado_settings', 'zayado_admin_token', ['sanitize_callback' => 'sanitize_text_field']);
        register_setting('zayado_settings', 'zayado_wp_url',      ['sanitize_callback' => 'sanitize_url']);
        register_setting('zayado_settings', 'zayado_wp_user',     ['sanitize_callback' => 'sanitize_text_field']);
        register_setting('zayado_settings', 'zayado_wp_password', ['sanitize_callback' => 'sanitize_text_field']);
    }
}
