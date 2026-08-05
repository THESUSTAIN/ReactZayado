<?php
/**
 * Plugin Name: Zayado Cache Webhook
 * Description: Notifie le backend Zayado (invalidation de cache) à chaque
 *              publication/mise à jour de page, article ou produit WooCommerce.
 * Version: 1.0.0
 *
 * Installation : copier ce fichier dans wp-content/mu-plugins/
 * (créer le dossier mu-plugins s'il n'existe pas).
 */

if (!defined('ABSPATH')) { exit; }

// ── À CONFIGURER ────────────────────────────────────────────────────────────
define('ZAYADO_API_BASE', 'https://app.zayado.net');           // URL backend Zayado
define('ZAYADO_WEBHOOK_SECRET', 'CHANGEZ_MOI_meme_valeur_que_WP_WEBHOOK_SECRET');
// ────────────────────────────────────────────────────────────────────────────

function zayado_invalidate_cache($post_id, $post = null) {
    if (wp_is_post_revision($post_id) || wp_is_post_autosave($post_id)) { return; }
    $post = $post ?: get_post($post_id);
    if (!$post || $post->post_status !== 'publish') { return; }

    $type  = $post->post_type;
    $scope = $type === 'product' ? 'product' : ($type === 'page' ? 'page' : 'all');
    $slug  = $post->post_name;

    $url = add_query_arg(
        array('secret' => ZAYADO_WEBHOOK_SECRET, 'slug' => $slug, 'scope' => $scope),
        ZAYADO_API_BASE . '/api/wp/webhook/invalidate'
    );

    wp_remote_post($url, array(
        'timeout'  => 5,
        'blocking' => false,
        'body'     => array('slug' => $slug, 'scope' => $scope),
    ));
}

add_action('save_post', 'zayado_invalidate_cache', 20, 2);
add_action('publish_post', 'zayado_invalidate_cache', 20, 2);
add_action('publish_page', 'zayado_invalidate_cache', 20, 2);
