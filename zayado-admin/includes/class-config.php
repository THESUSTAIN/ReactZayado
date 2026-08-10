<?php
defined('ABSPATH') || exit;

class Zayado_Config {

    public static function render(): void {
        $message = '';

        if ($_SERVER['REQUEST_METHOD'] === 'POST' && check_admin_referer('zayado_config')) {
            $action = sanitize_text_field($_POST['zayado_action'] ?? '');

            if ($action === 'save_connection') {
                update_option('zayado_api_url',      sanitize_url($_POST['api_url'] ?? ''));
                update_option('zayado_admin_token',  sanitize_text_field($_POST['admin_token'] ?? ''));
                update_option('zayado_wp_url',       sanitize_url($_POST['wp_url'] ?? ''));
                update_option('zayado_wp_user',      sanitize_text_field($_POST['wp_user'] ?? ''));
                update_option('zayado_wp_password',  sanitize_text_field($_POST['wp_password'] ?? ''));
                $message = '✅ Configuration enregistrée !';
            }

            if ($action === 'test_connection') {
                $res     = Zayado_API::get('/admin/me');
                $message = $res['success']
                    ? '✅ Connexion FastAPI OK — ' . ($res['data']['email'] ?? 'Admin connecté')
                    : '❌ Connexion échouée : ' . $res['error'];
            }

            if ($action === 'test_wp') {
                $res     = Zayado_API::get('/wp/posts?per_page=1');
                $message = $res['success']
                    ? '✅ WordPress connecté — API REST OK'
                    : '❌ WordPress : ' . $res['error'];
            }

            if ($action === 'save_platform') {
                $res = Zayado_API::post('/admin/config', [
                    'maintenance_mode' => isset($_POST['maintenance_mode']),
                    'max_credits'      => intval($_POST['max_credits'] ?? 1000),
                    'default_plan'     => sanitize_text_field($_POST['default_plan'] ?? 'free'),
                ]);
                $message = $res['success'] ? '✅ Configuration plateforme enregistrée !' : '❌ ' . $res['error'];
            }
        }

        // Charger la config plateforme
        $config_res = Zayado_API::get('/admin/config');
        $config     = $config_res['success'] ? ($config_res['data'] ?? []) : [];
        ?>
        <div class="wrap zayado-wrap">
            <div class="zayado-header">
                <h1>⚙️ Configuration</h1>
                <p class="zayado-subtitle">Connexion au backend, WordPress et réglages de la plateforme.</p>
            </div>

            <?php if ($message): ?>
            <div class="zayado-alert <?php echo strpos($message, '✅') !== false ? 'zayado-alert-success' : 'zayado-alert-error'; ?>">
                <?php echo esc_html($message); ?>
            </div>
            <?php endif; ?>

            <!-- Connexion API FastAPI -->
            <div class="zayado-card-full">
                <h2>🔗 Connexion au backend FastAPI</h2>
                <form method="post">
                    <?php wp_nonce_field('zayado_config'); ?>
                    <input type="hidden" name="zayado_action" value="save_connection" />
                    <div class="zayado-form-row">
                        <label>URL de l'API (sans slash final)</label>
                        <input type="url" name="api_url" required class="zayado-input"
                            value="<?php echo esc_attr(get_option('zayado_api_url', 'https://app.zayado.net/api')); ?>"
                            placeholder="https://app.zayado.net/api" />
                    </div>
                    <div class="zayado-form-row">
                        <label>Token admin secret (Bearer)</label>
                        <input type="password" name="admin_token" required class="zayado-input"
                            value="<?php echo esc_attr(get_option('zayado_admin_token', '')); ?>"
                            placeholder="Votre token admin généré dans le backend (.env ADMIN_TOKEN)" />
                        <small style="color:#666;display:block;margin-top:4px">
                            Ce token doit correspondre à <code>ADMIN_SECRET_TOKEN</code> dans le .env du backend FastAPI.
                        </small>
                    </div>
                    <div style="display:flex;gap:10px;flex-wrap:wrap">
                        <button type="submit" class="zayado-btn zayado-btn-gold">💾 Enregistrer</button>
                        <button type="submit" name="zayado_action" value="test_connection" class="zayado-btn">🧪 Tester la connexion</button>
                    </div>
                </form>
            </div>

            <!-- Connexion WordPress -->
            <div class="zayado-card-full">
                <h2>🌐 Connexion WordPress REST API</h2>
                <form method="post">
                    <?php wp_nonce_field('zayado_config'); ?>
                    <input type="hidden" name="zayado_action" value="save_connection" />
                    <div class="zayado-form-row">
                        <label>URL du site WordPress</label>
                        <input type="url" name="wp_url" class="zayado-input"
                            value="<?php echo esc_attr(get_option('zayado_wp_url', 'https://zayado.net')); ?>"
                            placeholder="https://zayado.net" />
                    </div>
                    <div class="zayado-form-row">
                        <label>Nom d'utilisateur WordPress</label>
                        <input type="text" name="wp_user" class="zayado-input"
                            value="<?php echo esc_attr(get_option('zayado_wp_user', '')); ?>"
                            placeholder="admin" />
                    </div>
                    <div class="zayado-form-row">
                        <label>Mot de passe d'application WordPress</label>
                        <input type="password" name="wp_password" class="zayado-input"
                            value="<?php echo esc_attr(get_option('zayado_wp_password', '')); ?>"
                            placeholder="xxxx xxxx xxxx xxxx" />
                        <small style="color:#666;display:block;margin-top:4px">
                            Créez un mot de passe d'application dans : WP Admin → Utilisateurs → Votre profil → Mots de passe d'application.
                        </small>
                    </div>
                    <div style="display:flex;gap:10px;flex-wrap:wrap">
                        <button type="submit" class="zayado-btn zayado-btn-gold">💾 Enregistrer</button>
                        <button type="submit" name="zayado_action" value="test_wp" class="zayado-btn">🧪 Tester WordPress</button>
                    </div>
                </form>
            </div>

            <!-- Configuration plateforme -->
            <div class="zayado-card-full">
                <h2>🛠️ Configuration plateforme</h2>
                <form method="post">
                    <?php wp_nonce_field('zayado_config'); ?>
                    <input type="hidden" name="zayado_action" value="save_platform" />
                    <div class="zayado-form-row">
                        <label>
                            <input type="checkbox" name="maintenance_mode" <?php checked(!empty($config['maintenance_mode'])); ?> />
                            Mode maintenance (bloque l'accès à l'app)
                        </label>
                    </div>
                    <div class="zayado-form-row">
                        <label>Crédits max par utilisateur (par mois)</label>
                        <input type="number" name="max_credits" min="0" max="100000" class="zayado-input"
                            value="<?php echo esc_attr($config['max_credits'] ?? 1000); ?>" />
                    </div>
                    <div class="zayado-form-row">
                        <label>Plan par défaut à l'inscription</label>
                        <select name="default_plan" class="zayado-select">
                            <?php foreach (['free','start','grow','serenity'] as $p): ?>
                            <option value="<?php echo $p; ?>" <?php selected($config['default_plan'] ?? 'free', $p); ?>>
                                <?php echo strtoupper($p); ?>
                            </option>
                            <?php endforeach; ?>
                        </select>
                    </div>
                    <button type="submit" class="zayado-btn zayado-btn-gold">💾 Enregistrer</button>
                </form>
            </div>

            <!-- Infos de sécurité -->
            <div class="zayado-card-full">
                <h2>🔒 Sécurité du plugin</h2>
                <ul style="color:#444;line-height:2">
                    <li>✅ Toutes les requêtes utilisent un token Bearer HTTPS</li>
                    <li>✅ Chaque formulaire est protégé par un nonce WordPress</li>
                    <li>✅ Accès réservé aux utilisateurs avec le rôle <code>manage_options</code> (Administrateur)</li>
                    <li>✅ Aucune clé API sensible n'est exposée côté frontend</li>
                    <li>✅ Communication serveur-à-serveur uniquement (WP → FastAPI)</li>
                </ul>
            </div>
        </div>
        <?php
    }
}
