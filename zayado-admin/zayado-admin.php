<?php
/**
 * Plugin Name: Zayado Admin — MyExtension AI
 * Plugin URI:  https://zayado.net
 * Description: Pilotez MyExtension AI (utilisateurs, revenus, emails IA, génération de contenu) directement depuis WordPress.
 * Version:     1.0.0
 * Author:      Zayado
 * Author URI:  https://zayado.net
 * License:     Proprietary
 * Text Domain: zayado-admin
 */

defined('ABSPATH') || exit;

define('ZAYADO_VERSION',    '1.0.0');
define('ZAYADO_PLUGIN_DIR', plugin_dir_path(__FILE__));
define('ZAYADO_PLUGIN_URL', plugin_dir_url(__FILE__));

// ─── Chargement des modules ──────────────────────────────────
require_once ZAYADO_PLUGIN_DIR . 'includes/class-api.php';
require_once ZAYADO_PLUGIN_DIR . 'includes/class-menu.php';
require_once ZAYADO_PLUGIN_DIR . 'includes/class-dashboard.php';
require_once ZAYADO_PLUGIN_DIR . 'includes/class-users.php';
require_once ZAYADO_PLUGIN_DIR . 'includes/class-revenue.php';
require_once ZAYADO_PLUGIN_DIR . 'includes/class-emails.php';
require_once ZAYADO_PLUGIN_DIR . 'includes/class-content-ai.php';
require_once ZAYADO_PLUGIN_DIR . 'includes/class-config.php';
require_once ZAYADO_PLUGIN_DIR . 'includes/class-settings.php';
require_once ZAYADO_PLUGIN_DIR . 'includes/class-crm.php';
require_once ZAYADO_PLUGIN_DIR . 'includes/class-affiliation.php';

// ─── Initialisation ──────────────────────────────────────────
add_action('plugins_loaded', function () {
    if (!is_admin()) return;
    Zayado_Menu::init();
    Zayado_Settings::init();
});

// ─── Assets admin ────────────────────────────────────────────
add_action('admin_enqueue_scripts', function ($hook) {
    if (strpos($hook, 'zayado') === false) return;
    wp_enqueue_style(
        'zayado-admin',
        ZAYADO_PLUGIN_URL . 'assets/admin.css',
        [],
        ZAYADO_VERSION
    );
    wp_enqueue_script(
        'zayado-admin',
        ZAYADO_PLUGIN_URL . 'assets/admin.js',
        ['jquery'],
        ZAYADO_VERSION,
        true
    );
    wp_localize_script('zayado-admin', 'ZayadoAdmin', [
        'ajaxUrl' => admin_url('admin-ajax.php'),
        'nonce'   => wp_create_nonce('zayado_nonce'),
        'apiUrl'  => get_option('zayado_api_url', 'https://app.zayado.net/api'),
    ]);
});

// ─── AJAX handlers ───────────────────────────────────────────
add_action('wp_ajax_zayado_api', function () {
    check_ajax_referer('zayado_nonce', 'nonce');
    if (!current_user_can('manage_options')) wp_die('Accès refusé', 403);
    $endpoint = sanitize_text_field($_POST['endpoint'] ?? '');
    $method   = strtoupper(sanitize_text_field($_POST['method'] ?? 'GET'));
    $body     = $_POST['body'] ?? null;
    $result   = Zayado_API::request($method, $endpoint, $body ? json_decode(stripslashes($body), true) : null);
    wp_send_json($result);
});
