<?php
defined('ABSPATH') || exit;

/**
 * Zayado_API — Communication sécurisée avec le backend FastAPI.
 * Utilise un token secret partagé (WP option → .env backend).
 */
class Zayado_API {

    public static function get_base_url(): string {
        return rtrim(get_option('zayado_api_url', 'https://app.zayado.net/api'), '/');
    }

    public static function get_token(): string {
        return get_option('zayado_admin_token', '');
    }

    /**
     * Effectue une requête vers le backend FastAPI.
     * @param string $method  GET | POST | PUT | DELETE
     * @param string $endpoint  ex: /admin/stats
     * @param array|null $body  données JSON
     * @return array  ['success' => bool, 'data' => mixed, 'error' => string]
     */
    public static function request(string $method, string $endpoint, ?array $body = null): array {
        $url   = self::get_base_url() . $endpoint;
        $token = self::get_token();

        if (empty($token)) {
            return ['success' => false, 'error' => 'Token admin non configuré. Allez dans Zayado → Configuration.'];
        }

        $args = [
            'method'  => $method,
            'timeout' => 30,
            'headers' => [
                'Authorization' => 'Bearer ' . $token,
                'Content-Type'  => 'application/json',
                'Accept'        => 'application/json',
            ],
            'sslverify' => true,
        ];

        if ($body && in_array($method, ['POST', 'PUT', 'PATCH'])) {
            $args['body'] = wp_json_encode($body);
        }

        $response = wp_remote_request($url, $args);

        if (is_wp_error($response)) {
            return ['success' => false, 'error' => $response->get_error_message()];
        }

        $code = wp_remote_retrieve_response_code($response);
        $raw  = wp_remote_retrieve_body($response);
        $data = json_decode($raw, true);

        if ($code >= 400) {
            $msg = $data['detail'] ?? $data['message'] ?? "Erreur HTTP $code";
            return ['success' => false, 'error' => $msg, 'code' => $code];
        }

        return ['success' => true, 'data' => $data];
    }

    public static function get(string $endpoint): array {
        return self::request('GET', $endpoint);
    }

    public static function post(string $endpoint, array $body = []): array {
        return self::request('POST', $endpoint, $body);
    }

    public static function put(string $endpoint, array $body = []): array {
        return self::request('PUT', $endpoint, $body);
    }
}
